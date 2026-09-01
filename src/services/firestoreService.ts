import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Activity,
  Assignment,
  ClassItem,
  Folder,
  GradeLevel,
  QuestionItem,
  QuestionSet,
  StudentProfile,
  StudentResult,
  TeacherProfile,
} from '../types';

// Helper to convert Firestore timestamp to ISO string
export const toISO = (val: unknown): string => {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
};

/**
 * Recursively sanitizes data before writing to Firestore.
 * Replaces any `undefined` value with `null` so Firestore setDoc / updateDoc / addDoc never crashes.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      result[key] = null;
    } else {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}

// Generate a cryptographically random unique 6-digit assignment code string e.g. "335970"
export function generateUniqueAssignmentCode(existingCodes: string[] = []): string {
  let code = '';
  let attempts = 0;
  do {
    const num = Math.floor(100000 + Math.random() * 900000);
    code = num.toString();
    attempts++;
  } while (existingCodes.includes(code) && attempts < 100);
  return code;
}

// ----------------------------------------------------
// 1. FOLDERS SERVICE
// ----------------------------------------------------
export const folderService = {
  // Listen or get real folders for an authenticated teacher
  subscribeFolders(ownerId: string, onUpdate: (folders: Folder[]) => void, onError?: (err: Error) => void) {
    if (!ownerId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'folders'),
      where('ownerId', '==', ownerId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Folder[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId,
            name: data.name,
            color: data.color || '#4f46e5',
            description: data.description || '',
            parentId: data.parentId || null,
            createdAt: toISO(data.createdAt),
            updatedAt: toISO(data.updatedAt),
          });
        });
        // sort by createdAt desc
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore folder listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  async getFolders(ownerId: string): Promise<Folder[]> {
    if (!ownerId) return [];
    const q = query(collection(db, 'folders'), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    const list: Folder[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        ownerId: data.ownerId,
        name: data.name,
        color: data.color || '#4f46e5',
        description: data.description || '',
        parentId: data.parentId || null,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createFolder(ownerId: string, data: { name: string; color?: string; description?: string }): Promise<Folder> {
    if (!ownerId) throw new Error('Teacher must be authenticated to create a folder');
    const folderRef = doc(collection(db, 'folders'));
    const now = new Date().toISOString();
    const folderData = {
      name: data.name.trim(),
      ownerId,
      color: data.color || '#4f46e5',
      description: data.description?.trim() || '',
      parentId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(folderRef, folderData);
    return {
      id: folderRef.id,
      ownerId,
      name: data.name.trim(),
      color: data.color || '#4f46e5',
      description: data.description?.trim() || '',
      parentId: null,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateFolder(folderId: string, ownerId: string, data: { name: string; color?: string; description?: string }): Promise<void> {
    const folderRef = doc(db, 'folders', folderId);
    await updateDoc(folderRef, {
      name: data.name.trim(),
      color: data.color || '#4f46e5',
      description: data.description?.trim() || '',
      updatedAt: serverTimestamp(),
    });
  },

  async deleteFolder(folderId: string, ownerId: string): Promise<void> {
    // Delete folder document
    const folderRef = doc(db, 'folders', folderId);
    await deleteDoc(folderRef);

    // Detach activities inside this folder to "No Folder" safely
    const q = query(
      collection(db, 'activities'),
      where('ownerId', '==', ownerId),
      where('folderId', '==', folderId)
    );
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) =>
      updateDoc(doc(db, 'activities', d.id), {
        folderId: null,
        updatedAt: serverTimestamp(),
      })
    );
    await Promise.all(updates);
  },
};

// ----------------------------------------------------
// 2. QUESTION SETS SERVICE (QUESTION BANK)
// ----------------------------------------------------
export const questionSetService = {
  subscribeQuestionSets(ownerId: string, onUpdate: (questionSets: QuestionSet[]) => void, onError?: (err: Error) => void) {
    if (!ownerId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'questionSets'),
      where('ownerId', '==', ownerId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: QuestionSet[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId,
            title: data.title,
            description: data.description || '',
            gradeLevel: data.gradeLevel || '10',
            tags: data.tags || [],
            questions: data.questions || [],
            itemCount: (data.questions || []).length,
            sourceFileName: data.sourceFileName,
            sourceFileType: data.sourceFileType,
            importedAt: data.importedAt ? toISO(data.importedAt) : undefined,
            createdAt: toISO(data.createdAt),
            updatedAt: toISO(data.updatedAt),
          });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore questionSets listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  async getQuestionSets(ownerId: string): Promise<QuestionSet[]> {
    if (!ownerId) return [];
    const q = query(collection(db, 'questionSets'), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    const list: QuestionSet[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        ownerId: data.ownerId,
        title: data.title,
        description: data.description || '',
        gradeLevel: data.gradeLevel || '10',
        tags: data.tags || [],
        questions: data.questions || [],
        itemCount: (data.questions || []).length,
        sourceFileName: data.sourceFileName,
        sourceFileType: data.sourceFileType,
        importedAt: data.importedAt ? toISO(data.importedAt) : undefined,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getQuestionSet(id: string): Promise<QuestionSet | null> {
    const snap = await getDoc(doc(db, 'questionSets', id));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ownerId: data.ownerId,
      title: data.title,
      description: data.description || '',
      gradeLevel: data.gradeLevel || '10',
      tags: data.tags || [],
      questions: data.questions || [],
      itemCount: (data.questions || []).length,
      sourceFileName: data.sourceFileName,
      sourceFileType: data.sourceFileType,
      importedAt: data.importedAt ? toISO(data.importedAt) : undefined,
      createdAt: toISO(data.createdAt),
      updatedAt: toISO(data.updatedAt),
    };
  },

  async createOrUpdateQuestionSet(
    ownerId: string,
    data: {
      id?: string;
      title: string;
      description?: string;
      questions: QuestionItem[];
      gradeLevel?: QuestionSet['gradeLevel'];
      sourceFileName?: string;
      sourceFileType?: string;
      importedAt?: string;
    }
  ): Promise<QuestionSet> {
    const now = new Date().toISOString();
    const cleanQuestions: QuestionItem[] = data.questions.map((q, idx) => ({
      id: q.id || `q_${idx + 1}_${Math.random().toString(36).substring(2, 7)}`,
      question: q.question || '',
      options: (q.options || []).map((o, oIdx) => ({
        id: o.id || `opt_${oIdx}`,
        label: o.label || String.fromCharCode(65 + oIdx),
        text: o.text || '',
        isCorrect: Boolean(o.isCorrect),
      })),
      correctAnswerId: q.correctAnswerId || '',
      correctAnswerText: q.correctAnswerText || '',
      correctAnswer: q.correctAnswer || (q.options?.find((o) => o.id === q.correctAnswerId)?.label || ''),
      explanation: q.explanation || null,
      passage: q.passage || null,
      unit: q.unit || '',
      lesson: q.lesson || '',
      level: q.level || 'Medium',
      questionType: (q.questionType as any) || 'multiple_choice',
      sourceFileName: q.sourceFileName || data.sourceFileName || '',
      sourceFileType: (q.sourceFileType || data.sourceFileType || 'manual') as any,
      importedAt: q.importedAt || data.importedAt || now,
      order: idx + 1,
      points: q.points || 10,
      timeLimitSeconds: q.timeLimitSeconds || 30,
    }));

    if (data.id) {
      const qRef = doc(db, 'questionSets', data.id);
      const payload = sanitizeForFirestore({
        ownerId,
        title: data.title.trim(),
        description: data.description || '',
        gradeLevel: data.gradeLevel || '10',
        questions: cleanQuestions,
        sourceFileName: data.sourceFileName || '',
        sourceFileType: data.sourceFileType || '',
        importedAt: data.importedAt || now,
        updatedAt: serverTimestamp(),
      });
      await setDoc(qRef, payload, { merge: true });
      return {
        id: data.id,
        ownerId,
        title: data.title.trim(),
        description: data.description || '',
        gradeLevel: data.gradeLevel || '10',
        questions: cleanQuestions,
        itemCount: cleanQuestions.length,
        sourceFileName: data.sourceFileName,
        sourceFileType: data.sourceFileType,
        importedAt: data.importedAt || now,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      const qRef = doc(collection(db, 'questionSets'));
      const payload = sanitizeForFirestore({
        ownerId,
        title: data.title.trim(),
        description: data.description || '',
        gradeLevel: data.gradeLevel || '10',
        questions: cleanQuestions,
        sourceFileName: data.sourceFileName || '',
        sourceFileType: data.sourceFileType || '',
        importedAt: data.importedAt || now,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(qRef, payload);
      return {
        id: qRef.id,
        ownerId,
        title: data.title.trim(),
        description: data.description || '',
        gradeLevel: data.gradeLevel || '10',
        questions: cleanQuestions,
        itemCount: cleanQuestions.length,
        sourceFileName: data.sourceFileName,
        sourceFileType: data.sourceFileType,
        importedAt: data.importedAt || now,
        createdAt: now,
        updatedAt: now,
      };
    }
  },

  async deleteQuestionSet(id: string): Promise<void> {
    await deleteDoc(doc(db, 'questionSets', id));
  },

  async getLinkedActivitiesCount(questionSetId: string, ownerId: string): Promise<number> {
    if (!questionSetId) return 0;
    try {
      const q = query(
        collection(db, 'activities'),
        where('ownerId', '==', ownerId),
        where('questionSetId', '==', questionSetId)
      );
      const snap = await getDocs(q);
      return snap.size;
    } catch (err) {
      console.error('Error checking linked activities:', err);
      return 0;
    }
  },

  async deleteQuestionFromSet(questionSetId: string, questionId: string): Promise<QuestionSet | null> {
    const qSet = await this.getQuestionSet(questionSetId);
    if (!qSet) return null;

    const remainingQuestions = qSet.questions
      .filter((q) => q.id !== questionId)
      .map((q, idx) => ({ ...q, order: idx + 1 }));

    return this.createOrUpdateQuestionSet(qSet.ownerId, {
      id: questionSetId,
      title: qSet.title,
      description: qSet.description,
      gradeLevel: qSet.gradeLevel,
      questions: remainingQuestions,
      sourceFileName: qSet.sourceFileName,
      sourceFileType: qSet.sourceFileType,
      importedAt: qSet.importedAt,
    });
  },

  async updateQuestionInSet(questionSetId: string, updatedQuestion: QuestionItem): Promise<QuestionSet | null> {
    const qSet = await this.getQuestionSet(questionSetId);
    if (!qSet) return null;

    const idx = qSet.questions.findIndex((q) => q.id === updatedQuestion.id);
    const questions = [...qSet.questions];
    if (idx >= 0) {
      questions[idx] = updatedQuestion;
    } else {
      questions.push(updatedQuestion);
    }

    return this.createOrUpdateQuestionSet(qSet.ownerId, {
      id: questionSetId,
      title: qSet.title,
      description: qSet.description,
      gradeLevel: qSet.gradeLevel,
      questions,
      sourceFileName: qSet.sourceFileName,
      sourceFileType: qSet.sourceFileType,
      importedAt: qSet.importedAt,
    });
  },
};

// ----------------------------------------------------
// 2.5 IMPORT HISTORY SERVICE
// ----------------------------------------------------
export const importHistoryService = {
  subscribeImportHistory(teacherId: string, onUpdate: (history: any[]) => void, onError?: (err: Error) => void) {
    if (!teacherId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'importHistory'),
      where('teacherId', '==', teacherId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            teacherId: data.teacherId,
            fileName: data.fileName,
            fileType: data.fileType,
            questionSetId: data.questionSetId,
            questionSetName: data.questionSetName,
            numberDetected: data.numberDetected || 0,
            numberImported: data.numberImported || 0,
            numberRejected: data.numberRejected || 0,
            numberReviewRequired: data.numberReviewRequired || 0,
            importedAt: toISO(data.importedAt),
          });
        });
        list.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore importHistory listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  async recordImport(teacherId: string, data: {
    fileName: string;
    fileType: 'docx' | 'pdf' | 'xlsx' | 'csv' | 'manual';
    questionSetId: string;
    questionSetName: string;
    numberDetected: number;
    numberImported: number;
    numberRejected: number;
    numberReviewRequired: number;
  }): Promise<void> {
    const histRef = doc(collection(db, 'importHistory'));
    await setDoc(histRef, sanitizeForFirestore({
      teacherId,
      fileName: data.fileName || '',
      fileType: data.fileType || 'manual',
      questionSetId: data.questionSetId || '',
      questionSetName: data.questionSetName || '',
      numberDetected: data.numberDetected || 0,
      numberImported: data.numberImported || 0,
      numberRejected: data.numberRejected || 0,
      numberReviewRequired: data.numberReviewRequired || 0,
      importedAt: serverTimestamp(),
    }));
  },
};


// ----------------------------------------------------
// 3. ACTIVITIES SERVICE
// ----------------------------------------------------
export const activityService = {
  subscribeActivities(ownerId: string, onUpdate: (activities: Activity[]) => void, onError?: (err: Error) => void) {
    if (!ownerId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'activities'),
      where('ownerId', '==', ownerId)
    );
    return onSnapshot(
      q,
      async (snapshot) => {
        const list: Activity[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId,
            title: data.title,
            description: data.description || '',
            gameType: data.gameType || 'quiz',
            folderId: data.folderId || null,
            questionSetId: data.questionSetId,
            questionSet: data.questionSet, // embedded cache or fetched
            status: data.status || 'published',
            itemCount: data.itemCount || 0,
            createdAt: toISO(data.createdAt),
            updatedAt: toISO(data.updatedAt),
          });
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore activity listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  async getActivities(ownerId: string): Promise<Activity[]> {
    if (!ownerId) return [];
    const q = query(collection(db, 'activities'), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    const list: Activity[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        ownerId: data.ownerId,
        title: data.title,
        description: data.description || '',
        gameType: data.gameType || 'quiz',
        folderId: data.folderId || null,
        questionSetId: data.questionSetId,
        questionSet: data.questionSet,
        status: data.status || 'published',
        itemCount: data.itemCount || 0,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getActivityById(activityId: string): Promise<Activity | null> {
    const snap = await getDoc(doc(db, 'activities', activityId));
    if (!snap.exists()) return null;
    const data = snap.data();
    let questionSet = data.questionSet;
    if (!questionSet && data.questionSetId) {
      questionSet = await questionSetService.getQuestionSet(data.questionSetId);
    }
    return {
      id: snap.id,
      ownerId: data.ownerId,
      title: data.title,
      description: data.description || '',
      gameType: data.gameType || 'quiz',
      folderId: data.folderId || null,
      questionSetId: data.questionSetId,
      questionSet,
      status: data.status || 'published',
      itemCount: data.itemCount || 0,
      createdAt: toISO(data.createdAt),
      updatedAt: toISO(data.updatedAt),
    };
  },

  async createActivity(
    ownerId: string,
    data: {
      title: string;
      description?: string;
      gameType: Activity['gameType'];
      folderId?: string | null;
      status?: Activity['status'];
      questions: QuestionItem[];
    }
  ): Promise<Activity> {
    if (!ownerId) throw new Error('Authentication required to save activity');
    const now = new Date().toISOString();

    // 1. Create QuestionSet in Firestore
    const qSet = await questionSetService.createOrUpdateQuestionSet(ownerId, {
      title: data.title,
      description: data.description,
      questions: data.questions,
    });

    // 2. Create Activity Document in Firestore
    const actRef = doc(collection(db, 'activities'));
    const actDocData = sanitizeForFirestore({
      ownerId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      gameType: data.gameType,
      folderId: data.folderId || null,
      questionSetId: qSet.id,
      questionSet: qSet, // Store embedded copy for fast single-read queries
      status: data.status || 'published',
      itemCount: data.questions.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(actRef, actDocData);

    return {
      id: actRef.id,
      ownerId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      gameType: data.gameType,
      folderId: data.folderId || null,
      questionSetId: qSet.id,
      questionSet: qSet,
      status: data.status || 'published',
      itemCount: data.questions.length,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateActivity(
    activityId: string,
    ownerId: string,
    data: {
      title: string;
      description?: string;
      gameType: Activity['gameType'];
      folderId?: string | null;
      status?: Activity['status'];
      questions: QuestionItem[];
      questionSetId?: string;
    }
  ): Promise<Activity> {
    const actRef = doc(db, 'activities', activityId);
    const existingSnap = await getDoc(actRef);
    if (!existingSnap.exists()) throw new Error('Activity not found');

    const existingData = existingSnap.data();
    const qSetId = data.questionSetId || existingData.questionSetId || `qs_${activityId}`;

    const updatedQSet = await questionSetService.createOrUpdateQuestionSet(ownerId, {
      id: qSetId,
      title: data.title,
      description: data.description,
      questions: data.questions,
    });

    const now = new Date().toISOString();
    await updateDoc(actRef, sanitizeForFirestore({
      title: data.title.trim(),
      description: data.description?.trim() || '',
      gameType: data.gameType,
      folderId: data.folderId !== undefined ? data.folderId : (existingData.folderId || null),
      status: data.status || existingData.status || 'published',
      itemCount: data.questions.length,
      questionSetId: updatedQSet.id,
      questionSet: updatedQSet,
      updatedAt: serverTimestamp(),
    }));

    return {
      id: activityId,
      ownerId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      gameType: data.gameType,
      folderId: data.folderId !== undefined ? data.folderId : existingData.folderId,
      questionSetId: updatedQSet.id,
      questionSet: updatedQSet,
      status: data.status || 'published',
      itemCount: data.questions.length,
      createdAt: toISO(existingData.createdAt),
      updatedAt: now,
    };
  },

  async duplicateActivity(activityId: string, ownerId: string): Promise<Activity> {
    const original = await this.getActivityById(activityId);
    if (!original) throw new Error('Original activity not found for duplication');

    return this.createActivity(ownerId, {
      title: `${original.title} (Copy)`,
      description: original.description,
      gameType: original.gameType,
      folderId: original.folderId,
      status: 'draft',
      questions: original.questionSet?.questions || [],
    });
  },

  async deleteActivity(activityId: string): Promise<void> {
    await deleteDoc(doc(db, 'activities', activityId));
  },

  async moveActivityToFolder(activityId: string, folderId: string | null): Promise<void> {
    await updateDoc(doc(db, 'activities', activityId), {
      folderId,
      updatedAt: serverTimestamp(),
    });
  },
};

// ----------------------------------------------------
// 4. ASSIGNMENTS SERVICE
// ----------------------------------------------------
export const assignmentService = {
  subscribeAssignments(ownerId: string, onUpdate: (assignments: Assignment[]) => void, onError?: (err: Error) => void) {
    if (!ownerId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'assignments'),
      where('ownerId', '==', ownerId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Assignment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId,
            activityId: data.activityId,
            activityTitle: data.activityTitle,
            gameType: data.gameType,
            assignmentCode: String(data.assignmentCode),
            studentLink: data.studentLink,
            qrCodeUrl: data.qrCodeUrl,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status,
            targetClass: data.targetClass || 'All Classes',
            maxAttempts: data.maxAttempts || 1,
            allowRetry: data.allowRetry ?? true,
            showAnswersAfter: data.showAnswersAfter ?? true,
            timeLimitMinutes: data.timeLimitMinutes || 0,
            totalSubmissions: data.totalSubmissions || 0,
            createdAt: toISO(data.createdAt),
            updatedAt: toISO(data.updatedAt),
          });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore assignment listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  async getAssignmentByCode(code: string): Promise<Assignment | null> {
    const cleanCode = String(code).trim();
    if (!cleanCode) return null;
    const q = query(collection(db, 'assignments'), where('assignmentCode', '==', cleanCode));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    let computedStatus = data.status || 'active';
    const now = new Date();
    if (data.startDate && new Date(data.startDate) > now && computedStatus === 'active') {
      computedStatus = 'scheduled';
    }
    if (data.endDate && new Date(data.endDate) < now && computedStatus === 'active') {
      computedStatus = 'expired';
    }

    return {
      id: docSnap.id,
      ownerId: data.ownerId,
      activityId: data.activityId,
      questionSetId: data.questionSetId,
      activityTitle: data.activityTitle,
      title: data.title || data.activityTitle,
      instructions: data.instructions || '',
      gameType: data.gameType,
      assignmentCode: String(data.assignmentCode),
      studentLink: data.studentLink,
      qrCodeUrl: data.qrCodeUrl,
      targetType: data.targetType || 'class',
      targetClass: data.targetClass || 'All Classes',
      classIds: data.classIds || (data.targetClass ? [data.targetClass] : ['All Classes']),
      startDate: data.startDate,
      endDate: data.endDate,
      startAt: data.startAt || data.startDate,
      endAt: data.endAt || data.endDate,
      status: computedStatus,
      maxAttempts: data.maxAttempts || (data.settings?.maxAttempts ?? 1),
      allowRetry: data.allowRetry ?? (data.settings?.allowMultipleAttempts ?? false),
      showAnswersAfter: data.showAnswersAfter ?? (data.settings?.showCorrectAnswers ?? false),
      timeLimitMinutes: data.timeLimitMinutes || (data.settings?.timeLimitMinutes ?? 0),
      settings: data.settings || {
        requireStudentName: true,
        requireClass: true,
        requireStudentId: false,
        allowMultipleAttempts: false,
        maxAttempts: 1,
        showScore: true,
        showExplanation: true,
        showCorrectAnswers: false,
        shuffleQuestions: true,
        shuffleAnswers: true,
      },
      totalSubmissions: data.totalSubmissions || 0,
      createdAt: toISO(data.createdAt),
      updatedAt: toISO(data.updatedAt),
    };
  },

  async getAssignmentById(id: string): Promise<Assignment | null> {
    const cleanId = String(id).trim();
    if (!cleanId) return null;
    try {
      const docSnap = await getDoc(doc(db, 'assignments', cleanId));
      if (!docSnap.exists()) return null;
      const data = docSnap.data();

      let computedStatus = data.status || 'active';
      const now = new Date();
      if (data.startDate && new Date(data.startDate) > now && computedStatus === 'active') {
        computedStatus = 'scheduled';
      }
      if (data.endDate && new Date(data.endDate) < now && computedStatus === 'active') {
        computedStatus = 'expired';
      }

      return {
        id: docSnap.id,
        ownerId: data.ownerId,
        activityId: data.activityId,
        questionSetId: data.questionSetId,
        activityTitle: data.activityTitle,
        title: data.title || data.activityTitle,
        instructions: data.instructions || '',
        gameType: data.gameType,
        assignmentCode: String(data.assignmentCode),
        studentLink: data.studentLink,
        qrCodeUrl: data.qrCodeUrl,
        targetType: data.targetType || 'class',
        targetClass: data.targetClass || 'All Classes',
        classIds: data.classIds || (data.targetClass ? [data.targetClass] : ['All Classes']),
        startDate: data.startDate,
        endDate: data.endDate,
        startAt: data.startAt || data.startDate,
        endAt: data.endAt || data.endDate,
        status: computedStatus,
        maxAttempts: data.maxAttempts || (data.settings?.maxAttempts ?? 1),
        allowRetry: data.allowRetry ?? (data.settings?.allowMultipleAttempts ?? false),
        showAnswersAfter: data.showAnswersAfter ?? (data.settings?.showCorrectAnswers ?? false),
        timeLimitMinutes: data.timeLimitMinutes || (data.settings?.timeLimitMinutes ?? 0),
        settings: data.settings || {
          requireStudentName: true,
          requireClass: true,
          requireStudentId: false,
          allowMultipleAttempts: false,
          maxAttempts: 1,
          showScore: true,
          showExplanation: true,
          showCorrectAnswers: false,
          shuffleQuestions: true,
          shuffleAnswers: true,
        },
        totalSubmissions: data.totalSubmissions || 0,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
      };
    } catch {
      return null;
    }
  },

  async getAssignmentByCodeOrId(identifier: string): Promise<Assignment | null> {
    const clean = String(identifier).trim();
    if (!clean) return null;
    // 1. Try by 6-digit code
    const byCode = await this.getAssignmentByCode(clean);
    if (byCode) return byCode;
    // 2. Try by Document ID
    const byId = await this.getAssignmentById(clean);
    if (byId) return byId;
    return null;
  },

  async getActiveAssignments(): Promise<Assignment[]> {
    try {
      const q = query(collection(db, 'assignments'), where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      const list: Assignment[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ownerId: data.ownerId,
          activityId: data.activityId,
          questionSetId: data.questionSetId,
          activityTitle: data.activityTitle,
          title: data.title || data.activityTitle,
          instructions: data.instructions || '',
          gameType: data.gameType,
          assignmentCode: String(data.assignmentCode),
          studentLink: data.studentLink,
          qrCodeUrl: data.qrCodeUrl,
          targetType: data.targetType || 'class',
          targetClass: data.targetClass || 'All Classes',
          classIds: data.classIds || (data.targetClass ? [data.targetClass] : ['All Classes']),
          startDate: data.startDate,
          endDate: data.endDate,
          startAt: data.startAt || data.startDate,
          endAt: data.endAt || data.endDate,
          status: data.status,
          maxAttempts: data.maxAttempts || 1,
          allowRetry: data.allowRetry ?? true,
          showAnswersAfter: data.showAnswersAfter ?? true,
          timeLimitMinutes: data.timeLimitMinutes || 0,
          settings: data.settings,
          totalSubmissions: data.totalSubmissions || 0,
          createdAt: toISO(data.createdAt),
          updatedAt: toISO(data.updatedAt),
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.error('Error fetching active assignments:', err);
      return [];
    }
  },

  async createAssignment(
    ownerId: string,
    data: {
      activityId: string;
      questionSetId?: string;
      activityTitle: string;
      title?: string;
      instructions?: string;
      gameType: Activity['gameType'];
      targetType?: 'all' | 'class' | 'students' | 'custom';
      targetClass?: string;
      classIds?: string[];
      startDate?: string;
      endDate?: string;
      maxAttempts?: number;
      allowRetry?: boolean;
      showAnswersAfter?: boolean;
      timeLimitMinutes?: number;
      settings?: {
        requireStudentName?: boolean;
        requireClass?: boolean;
        requireStudentId?: boolean;
        allowMultipleAttempts?: boolean;
        maxAttempts?: number;
        showScore?: boolean;
        showExplanation?: boolean;
        showCorrectAnswers?: boolean;
        shuffleQuestions?: boolean;
        shuffleAnswers?: boolean;
        timeLimitMinutes?: number;
      };
    }
  ): Promise<Assignment> {
    if (!ownerId) throw new Error('Teacher must be authenticated to create an assignment');

    // Query active assignments to ensure unique 6-digit access code
    const existingSnap = await getDocs(
      query(collection(db, 'assignments'), where('status', '==', 'active'))
    );
    const existingCodes: string[] = [];
    existingSnap.forEach((d) => {
      const code = d.data().assignmentCode;
      if (code) existingCodes.push(String(code));
    });

    const assignmentCode = generateUniqueAssignmentCode(existingCodes);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const studentLink = `${origin}${pathname}?code=${assignmentCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(studentLink)}`;
    const now = new Date().toISOString();

    const asgnRef = doc(collection(db, 'assignments'));

    const resolvedSettings = {
      requireStudentName: data.settings?.requireStudentName ?? true,
      requireClass: data.settings?.requireClass ?? true,
      requireStudentId: data.settings?.requireStudentId ?? false,
      allowMultipleAttempts: data.settings?.allowMultipleAttempts ?? (data.allowRetry ?? false),
      maxAttempts: data.settings?.maxAttempts ?? (data.maxAttempts || 1),
      showScore: data.settings?.showScore ?? true,
      showExplanation: data.settings?.showExplanation ?? true,
      showCorrectAnswers: data.settings?.showCorrectAnswers ?? (data.showAnswersAfter ?? false),
      shuffleQuestions: data.settings?.shuffleQuestions ?? true,
      shuffleAnswers: data.settings?.shuffleAnswers ?? true,
      timeLimitMinutes: data.settings?.timeLimitMinutes ?? (data.timeLimitMinutes || 0),
    };

    let initialStatus: Assignment['status'] = 'active';
    if (data.startDate && new Date(data.startDate) > new Date()) {
      initialStatus = 'scheduled';
    }

    const asgnData = sanitizeForFirestore({
      ownerId,
      activityId: data.activityId,
      questionSetId: data.questionSetId || null,
      activityTitle: data.activityTitle,
      title: data.title || data.activityTitle,
      instructions: data.instructions || '',
      gameType: data.gameType,
      assignmentCode, // Dynamic 6-digit numeric access code
      studentLink,
      qrCodeUrl,
      targetType: data.targetClass && data.targetClass !== 'All Classes' ? 'class' : 'all',
      targetClass: data.targetClass || 'All Classes',
      classIds: data.classIds || (data.targetClass ? [data.targetClass] : ['All Classes']),
      startDate: data.startDate || now,
      endDate: data.endDate || '',
      startAt: data.startDate || now,
      endAt: data.endDate || '',
      status: initialStatus,
      maxAttempts: resolvedSettings.maxAttempts,
      allowRetry: resolvedSettings.allowMultipleAttempts,
      showAnswersAfter: resolvedSettings.showCorrectAnswers,
      timeLimitMinutes: resolvedSettings.timeLimitMinutes,
      settings: resolvedSettings,
      totalSubmissions: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(asgnRef, asgnData);

    return {
      id: asgnRef.id,
      ownerId,
      activityId: data.activityId,
      questionSetId: data.questionSetId,
      activityTitle: data.activityTitle,
      title: data.title || data.activityTitle,
      instructions: data.instructions || '',
      gameType: data.gameType,
      assignmentCode,
      studentLink,
      qrCodeUrl,
      targetType: data.targetClass && data.targetClass !== 'All Classes' ? 'class' : 'all',
      targetClass: data.targetClass || 'All Classes',
      classIds: data.classIds || (data.targetClass ? [data.targetClass] : ['All Classes']),
      startDate: data.startDate || now,
      endDate: data.endDate,
      startAt: data.startDate || now,
      endAt: data.endDate,
      status: initialStatus,
      maxAttempts: resolvedSettings.maxAttempts,
      allowRetry: resolvedSettings.allowMultipleAttempts,
      showAnswersAfter: resolvedSettings.showCorrectAnswers,
      timeLimitMinutes: resolvedSettings.timeLimitMinutes,
      settings: resolvedSettings,
      totalSubmissions: 0,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateAssignment(id: string, data: Partial<Assignment>): Promise<void> {
    const updatePayload: any = {
      updatedAt: serverTimestamp(),
    };
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.instructions !== undefined) updatePayload.instructions = data.instructions;
    if (data.targetClass !== undefined) updatePayload.targetClass = data.targetClass;
    if (data.classIds !== undefined) updatePayload.classIds = data.classIds;
    if (data.startDate !== undefined) updatePayload.startDate = data.startDate;
    if (data.endDate !== undefined) updatePayload.endDate = data.endDate;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.settings !== undefined) updatePayload.settings = data.settings;
    if (data.maxAttempts !== undefined) updatePayload.maxAttempts = data.maxAttempts;
    if (data.timeLimitMinutes !== undefined) updatePayload.timeLimitMinutes = data.timeLimitMinutes;

    await updateDoc(doc(db, 'assignments', id), sanitizeForFirestore(updatePayload));
  },

  async regenerateAssignmentCode(id: string): Promise<Assignment | null> {
    const existing = await this.getAssignmentById(id);
    if (!existing) throw new Error('Assignment not found');

    const existingSnap = await getDocs(
      query(collection(db, 'assignments'), where('status', '==', 'active'))
    );
    const existingCodes: string[] = [];
    existingSnap.forEach((d) => {
      const code = d.data().assignmentCode;
      if (code) existingCodes.push(String(code));
    });

    const newCode = generateUniqueAssignmentCode(existingCodes);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const newStudentLink = `${origin}${pathname}?code=${newCode}`;
    const newQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(newStudentLink)}`;

    await updateDoc(doc(db, 'assignments', id), {
      assignmentCode: newCode,
      studentLink: newStudentLink,
      qrCodeUrl: newQrUrl,
      updatedAt: serverTimestamp(),
    });

    return {
      ...existing,
      assignmentCode: newCode,
      studentLink: newStudentLink,
      qrCodeUrl: newQrUrl,
      updatedAt: new Date().toISOString(),
    };
  },

  async closeAssignment(id: string): Promise<void> {
    await updateDoc(doc(db, 'assignments', id), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
  },

  async deleteAssignment(id: string): Promise<void> {
    await deleteDoc(doc(db, 'assignments', id));
  },

  async checkStudentAttempts(assignmentId: string, studentName: string, studentClass: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'results'),
        where('assignmentId', '==', assignmentId),
        where('studentName', '==', studentName.trim()),
        where('studentClass', '==', studentClass.trim())
      );
      const snap = await getDocs(q);
      return snap.size;
    } catch {
      return 0;
    }
  },
};

// ----------------------------------------------------
// 5. RESULTS & STUDENTS SERVICE
// ----------------------------------------------------
export const resultService = {
  subscribeResults(ownerId: string, onUpdate: (results: StudentResult[]) => void, onError?: (err: Error) => void) {
    if (!ownerId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'results'),
      where('teacherOwnerId', '==', ownerId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: StudentResult[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            attemptId: data.attemptId || docSnap.id,
            attemptNumber: data.attemptNumber || 1,
            assignmentId: data.assignmentId,
            activityId: data.activityId,
            questionSetId: data.questionSetId || '',
            assignmentCode: String(data.assignmentCode || ''),
            activityTitle: data.activityTitle || 'Interactive Activity',
            teacherOwnerId: data.teacherOwnerId || '',
            studentName: data.studentName || '',
            studentClass: data.studentClass || '',
            studentId: data.studentId || undefined,
            score: typeof data.score === 'number' ? data.score : 0,
            totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : 0,
            correctCount: typeof data.correctCount === 'number' ? data.correctCount : (typeof data.score === 'number' ? data.score : 0),
            percentage: typeof data.percentage === 'number' ? data.percentage : 0,
            answers: Array.isArray(data.answers) ? data.answers : [],
            startTime: toISO(data.startTime),
            timeSpentSeconds: typeof data.timeSpentSeconds === 'number' ? data.timeSpentSeconds : 0,
            completedAt: toISO(data.completedAt) || new Date().toISOString(),
            createdAt: toISO(data.createdAt) || new Date().toISOString(),
          });
        });
        list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore results listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  async getStudentPastAttempts(assignmentId: string, studentName: string, studentClass: string): Promise<StudentResult[]> {
    if (!assignmentId || !studentName.trim()) return [];
    try {
      const q = query(
        collection(db, 'results'),
        where('assignmentId', '==', assignmentId),
        where('studentName', '==', studentName.trim())
      );
      const snap = await getDocs(q);
      const results: StudentResult[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!studentClass || data.studentClass?.trim().toLowerCase() === studentClass.trim().toLowerCase()) {
          results.push({
            id: docSnap.id,
            attemptId: data.attemptId || docSnap.id,
            attemptNumber: data.attemptNumber || 1,
            assignmentId: data.assignmentId,
            activityId: data.activityId,
            questionSetId: data.questionSetId || '',
            assignmentCode: String(data.assignmentCode || ''),
            activityTitle: data.activityTitle,
            teacherOwnerId: data.teacherOwnerId,
            studentName: data.studentName,
            studentClass: data.studentClass,
            studentId: data.studentId,
            score: data.score,
            totalQuestions: data.totalQuestions,
            correctCount: data.correctCount,
            percentage: data.percentage,
            answers: data.answers || [],
            startTime: toISO(data.startTime),
            timeSpentSeconds: data.timeSpentSeconds || 0,
            completedAt: toISO(data.completedAt),
            createdAt: toISO(data.createdAt),
          });
        }
      });
      return results.sort((a, b) => (b.attemptNumber || 0) - (a.attemptNumber || 0));
    } catch (e) {
      console.warn('Error fetching past attempts:', e);
      return [];
    }
  },

  async submitStudentResult(data: {
    attemptId?: string;
    attemptNumber?: number;
    studentName: string;
    studentClass: string;
    studentId?: string;
    assignmentId: string;
    activityId: string;
    questionSetId?: string;
    assignmentCode: string;
    activityTitle?: string;
    teacherOwnerId?: string;
    score: number;
    totalQuestions: number;
    correctCount?: number;
    answers: StudentResult['answers'];
    startTime?: string;
    timeSpentSeconds: number;
  }): Promise<StudentResult> {
    const rawCorrect = typeof data.correctCount === 'number' ? data.correctCount : data.score;
    const percentage = data.totalQuestions > 0 ? Math.round((rawCorrect / data.totalQuestions) * 100) : 0;
    
    // Use attemptId as deterministic Firestore document ID if provided to guarantee idempotency
    const attemptId = data.attemptId || `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const resRef = doc(db, 'results', attemptId);
    const now = new Date().toISOString();

    // Check if this attempt was already submitted to prevent duplicate processing
    const existingSnap = await getDoc(resRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      return {
        id: resRef.id,
        attemptId,
        attemptNumber: existingData.attemptNumber || data.attemptNumber || 1,
        assignmentId: data.assignmentId,
        activityId: data.activityId,
        questionSetId: data.questionSetId || '',
        assignmentCode: String(data.assignmentCode),
        activityTitle: data.activityTitle || 'Interactive Assignment',
        teacherOwnerId: data.teacherOwnerId,
        studentName: data.studentName.trim(),
        studentClass: data.studentClass.trim(),
        studentId: data.studentId?.trim() || undefined,
        score: existingData.score || data.score,
        totalQuestions: existingData.totalQuestions || data.totalQuestions,
        correctCount: existingData.correctCount || rawCorrect,
        percentage: existingData.percentage || percentage,
        answers: existingData.answers || data.answers,
        startTime: toISO(existingData.startTime) || data.startTime || now,
        completedAt: toISO(existingData.completedAt) || now,
        timeSpentSeconds: existingData.timeSpentSeconds || data.timeSpentSeconds,
        createdAt: toISO(existingData.createdAt) || now,
      };
    }

    const resultPayload = sanitizeForFirestore({
      attemptId,
      attemptNumber: data.attemptNumber || 1,
      assignmentId: data.assignmentId,
      activityId: data.activityId,
      questionSetId: data.questionSetId || '',
      assignmentCode: String(data.assignmentCode),
      activityTitle: data.activityTitle || 'Interactive Assignment',
      teacherOwnerId: data.teacherOwnerId || '',
      studentName: data.studentName.trim(),
      studentClass: data.studentClass.trim(),
      studentId: data.studentId?.trim() || null,
      score: data.score,
      totalQuestions: data.totalQuestions,
      correctCount: rawCorrect,
      percentage,
      answers: data.answers || [],
      startTime: data.startTime ? new Date(data.startTime) : serverTimestamp(),
      timeSpentSeconds: data.timeSpentSeconds || 0,
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    await setDoc(resRef, resultPayload);

    // Increment submission counter on assignment if assignment doc exists
    if (data.assignmentId) {
      try {
        const asgnRef = doc(db, 'assignments', data.assignmentId);
        const asgnSnap = await getDoc(asgnRef);
        if (asgnSnap.exists()) {
          const cur = asgnSnap.data().totalSubmissions || 0;
          await updateDoc(asgnRef, { totalSubmissions: cur + 1, updatedAt: serverTimestamp() });
        }
      } catch (e) {
        console.warn('Could not update totalSubmissions count on assignment:', e);
      }
    }

    // Update or create student roster item in Firestore
    if (data.teacherOwnerId) {
      try {
        const studentDocId = `${data.teacherOwnerId}_${data.studentName.trim().toLowerCase()}_${data.studentClass.trim().toLowerCase()}`.replace(/[^a-zA-Z0-9_]/g, '_');
        const studentRef = doc(db, 'students', studentDocId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const sData = studentSnap.data();
          const prevTotal = sData.assignmentsCompleted || 1;
          const prevAvg = sData.averageScore || percentage;
          const newAvg = Math.round((prevAvg * prevTotal + percentage) / (prevTotal + 1));
          await updateDoc(studentRef, {
            assignmentsCompleted: prevTotal + 1,
            averageScore: newAvg,
            lastActivityAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(studentRef, {
            ownerId: data.teacherOwnerId,
            name: data.studentName.trim(),
            className: data.studentClass.trim(),
            assignmentsCompleted: 1,
            averageScore: percentage,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastActivityAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.warn('Student roster auto-sync notice:', e);
      }
    }

    return {
      id: resRef.id,
      attemptId,
      attemptNumber: data.attemptNumber || 1,
      assignmentId: data.assignmentId,
      activityId: data.activityId,
      questionSetId: data.questionSetId || '',
      assignmentCode: String(data.assignmentCode),
      activityTitle: data.activityTitle || 'Interactive Assignment',
      teacherOwnerId: data.teacherOwnerId,
      studentName: data.studentName.trim(),
      studentClass: data.studentClass.trim(),
      studentId: data.studentId?.trim() || undefined,
      score: data.score,
      totalQuestions: data.totalQuestions,
      correctCount: rawCorrect,
      percentage,
      answers: data.answers,
      startTime: data.startTime || now,
      completedAt: now,
      timeSpentSeconds: data.timeSpentSeconds,
      createdAt: now,
    };
  },

  subscribeStudents(ownerId: string, onUpdate: (students: StudentProfile[]) => void, onError?: (err: Error) => void) {
    if (!ownerId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'students'),
      where('ownerId', '==', ownerId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: StudentProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId,
            name: data.name,
            className: data.className,
            assignmentsCompleted: data.assignmentsCompleted || 0,
            averageScore: data.averageScore || 0,
            createdAt: toISO(data.createdAt),
            updatedAt: toISO(data.updatedAt),
            lastActivityAt: toISO(data.lastActivityAt),
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore students listener error:', err);
        if (onError) onError(err);
      }
    );
  },
};

// ----------------------------------------------------
// 6. CLASSES SERVICE (Dynamic Teacher Class Management)
// ----------------------------------------------------
export const classService = {
  subscribeClasses(ownerId: string, onUpdate: (classes: ClassItem[]) => void, onError?: (err: Error) => void) {
    if (!ownerId) {
      onUpdate([]);
      return () => {};
    }
    const q = query(
      collection(db, 'classes'),
      where('ownerId', '==', ownerId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: ClassItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId,
            name: data.name,
            gradeLevel: data.gradeLevel || undefined,
            description: data.description || '',
            createdAt: toISO(data.createdAt),
            updatedAt: toISO(data.updatedAt),
          });
        });
        // Sort alphabetically / natural number sorting by class name
        list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        onUpdate(list);
      },
      (err) => {
        console.error('Firestore classes listener error:', err);
        if (onError) onError(err);
      }
    );
  },

  async getClasses(ownerId: string): Promise<ClassItem[]> {
    if (!ownerId) return [];
    try {
      const q = query(collection(db, 'classes'), where('ownerId', '==', ownerId));
      const snapshot = await getDocs(q);
      const list: ClassItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ownerId: data.ownerId,
          name: data.name,
          gradeLevel: data.gradeLevel || undefined,
          description: data.description || '',
          createdAt: toISO(data.createdAt),
          updatedAt: toISO(data.updatedAt),
        });
      });
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    } catch (e) {
      console.warn('Error fetching classes:', e);
      return [];
    }
  },

  async addClass(ownerId: string, name: string, gradeLevel?: GradeLevel, description?: string): Promise<ClassItem> {
    if (!ownerId) throw new Error('Teacher must be authenticated to add a class');
    const cleanName = name.trim().toUpperCase();
    if (!cleanName) throw new Error('Class name cannot be empty');

    const classRef = doc(collection(db, 'classes'));
    const now = new Date().toISOString();
    const payload = sanitizeForFirestore({
      ownerId,
      name: cleanName,
      gradeLevel: gradeLevel || null,
      description: description?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(classRef, payload);

    return {
      id: classRef.id,
      ownerId,
      name: cleanName,
      gradeLevel,
      description: description?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
  },

  async deleteClass(classId: string): Promise<void> {
    if (!classId) return;
    await deleteDoc(doc(db, 'classes', classId));
  },

  async deleteAllClasses(ownerId: string): Promise<void> {
    if (!ownerId) return;
    const existing = await this.getClasses(ownerId);
    for (const item of existing) {
      await deleteDoc(doc(db, 'classes', item.id));
    }
  },
};
