import {
  Activity,
  Assignment,
  Folder,
  QuestionItem,
  QuestionSet,
  StudentProfile,
  StudentResult,
  TeacherProfile,
} from '../types';
import { generateUniqueAssignmentCode } from './firestoreService';

const STORAGE_KEYS = {
  ACTIVITIES: 'eduspace25_activities',
  FOLDERS: 'eduspace25_folders',
  ASSIGNMENTS: 'eduspace25_assignments',
  RESULTS: 'eduspace25_results',
  TEACHER: 'eduspace25_teacher_profile',
  QUESTION_SETS: 'eduspace25_question_sets',
};

class EduSpaceDatabase {
  private listeners: Array<() => void> = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private broadcastChange() {
    this.listeners.forEach((l) => l());
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.broadcastChange();
    } catch (err) {
      console.error(`Error writing ${key} to storage:`, err);
    }
  }

  // --- TEACHER PROFILE ---
  public getTeacherProfile(): TeacherProfile {
    return this.getItem<TeacherProfile>(STORAGE_KEYS.TEACHER, {
      uid: 'teacher_default',
      displayName: 'Ms. Sarah Nguyen',
      organization: 'ENGLISH GROUP',
      email: 'teacher@englishgroup.edu.vn',
      schoolYear: '2025 - 2026',
      defaultGrade: '10',
      role: 'teacher',
    });
  }

  public saveTeacherProfile(profile: Partial<TeacherProfile>): TeacherProfile {
    const current = this.getTeacherProfile();
    const updated = { ...current, ...profile };
    this.setItem(STORAGE_KEYS.TEACHER, updated);
    return updated;
  }

  // --- FOLDERS ---
  public getFolders(): Folder[] {
    return this.getItem<Folder[]>(STORAGE_KEYS.FOLDERS, []);
  }

  public saveFolder(folderData: { id?: string; name: string; color?: string; description?: string }): Folder {
    const folders = this.getFolders();
    const now = new Date().toISOString();

    if (folderData.id) {
      const idx = folders.findIndex((f) => f.id === folderData.id);
      if (idx >= 0) {
        folders[idx] = {
          ...folders[idx],
          name: folderData.name.trim(),
          color: folderData.color || folders[idx].color,
          description: folderData.description ?? folders[idx].description,
          updatedAt: now,
        };
        this.setItem(STORAGE_KEYS.FOLDERS, folders);
        return folders[idx];
      }
    }

    const newFolder: Folder = {
      id: 'fld_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ownerId: 'teacher_default',
      name: folderData.name.trim(),
      color: folderData.color || '#4f46e5',
      description: folderData.description || '',
      parentId: null,
      createdAt: now,
      updatedAt: now,
    };

    folders.unshift(newFolder);
    this.setItem(STORAGE_KEYS.FOLDERS, folders);
    return newFolder;
  }

  public deleteFolder(id: string): void {
    const folders = this.getItem<Folder[]>(STORAGE_KEYS.FOLDERS, []).filter((f) => f.id !== id);
    this.setItem(STORAGE_KEYS.FOLDERS, folders);

    // Detach activities from this deleted folder
    const activities = this.getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const updatedActivities = activities.map((a) => (a.folderId === id ? { ...a, folderId: null } : a));
    this.setItem(STORAGE_KEYS.ACTIVITIES, updatedActivities);
  }

  // --- ACTIVITIES ---
  public getActivities(): Activity[] {
    return this.getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
  }

  public getActivityById(id: string): Activity | null {
    const activities = this.getActivities();
    return activities.find((a) => a.id === id) || null;
  }

  // --- QUESTION SETS ---
  public getQuestionSets(): QuestionSet[] {
    return this.getItem<QuestionSet[]>(STORAGE_KEYS.QUESTION_SETS, []);
  }

  public saveActivity(data: {
    id?: string;
    title: string;
    description?: string;
    gameType: Activity['gameType'];
    folderId?: string | null;
    status?: Activity['status'];
    questions: QuestionItem[];
  }): Activity {
    const activities = this.getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const now = new Date().toISOString();

    const questionSetId = 'qs_' + (data.id || Date.now());
    const questionSet: QuestionSet = {
      id: questionSetId,
      ownerId: 'teacher_default',
      title: data.title,
      description: data.description,
      questions: data.questions.map((q, i) => ({ ...q, order: i + 1 })),
      createdAt: now,
      updatedAt: now,
    };

    if (data.id) {
      const idx = activities.findIndex((a) => a.id === data.id);
      if (idx >= 0) {
        const existing = activities[idx];
        const updated: Activity = {
          ...existing,
          title: data.title.trim(),
          description: data.description,
          gameType: data.gameType,
          folderId: data.folderId !== undefined ? data.folderId : existing.folderId,
          status: data.status || existing.status,
          itemCount: data.questions.length,
          questionSet,
          updatedAt: now,
        };
        activities[idx] = updated;
        this.setItem(STORAGE_KEYS.ACTIVITIES, activities);
        return updated;
      }
    }

    const newActivity: Activity = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ownerId: 'teacher_default',
      title: data.title.trim(),
      description: data.description || '',
      gameType: data.gameType,
      folderId: data.folderId || null,
      questionSetId,
      questionSet,
      status: data.status || 'published',
      itemCount: data.questions.length,
      createdAt: now,
      updatedAt: now,
    };

    activities.unshift(newActivity);
    this.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    return newActivity;
  }

  public duplicateActivity(id: string): Activity | null {
    const original = this.getActivityById(id);
    if (!original) return null;

    const questions = original.questionSet?.questions || [];
    return this.saveActivity({
      title: `${original.title} (Copy)`,
      description: original.description,
      gameType: original.gameType,
      folderId: original.folderId,
      status: 'draft',
      questions,
    });
  }

  public deleteActivity(id: string): void {
    const activities = this.getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []).filter((a) => a.id !== id);
    this.setItem(STORAGE_KEYS.ACTIVITIES, activities);
  }

  public moveActivityToFolder(activityId: string, folderId: string | null): void {
    const activities = this.getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const idx = activities.findIndex((a) => a.id === activityId);
    if (idx >= 0) {
      activities[idx].folderId = folderId;
      activities[idx].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.ACTIVITIES, activities);
    }
  }

  // --- ASSIGNMENTS ---
  public getAssignments(): Assignment[] {
    const assignments = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    const results = this.getResults();
    // Compute exact submission count
    return assignments.map((asgn) => ({
      ...asgn,
      totalSubmissions: results.filter((r) => r.assignmentId === asgn.id || r.assignmentCode === asgn.assignmentCode).length,
    }));
  }

  public getAssignmentByCode(code: string): Assignment | null {
    const cleanCode = code.trim();
    const assignments = this.getAssignments();
    return assignments.find((a) => a.assignmentCode === cleanCode) || null;
  }

  public getAssignmentById(id: string): Assignment | null {
    const assignments = this.getAssignments();
    return assignments.find((a) => a.id === id) || null;
  }

  public createAssignment(data: {
    activityId: string;
    targetClass?: string;
    startDate?: string;
    endDate?: string;
    maxAttempts?: number;
    allowRetry?: boolean;
    showAnswersAfter?: boolean;
    timeLimitMinutes?: number;
  }): Assignment {
    const activity = this.getActivityById(data.activityId);
    if (!activity) {
      throw new Error('Activity not found to create assignment');
    }

    const assignments = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    const existingCodes = assignments.map((a) => a.assignmentCode);
    const assignmentCode = generateUniqueAssignmentCode(existingCodes);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const studentLink = `${baseUrl}?code=${assignmentCode}`;

    const newAssignment: Assignment = {
      id: 'asg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ownerId: 'teacher_default',
      activityId: activity.id,
      activityTitle: activity.title,
      gameType: activity.gameType,
      assignmentCode,
      studentLink,
      targetClass: data.targetClass || 'All Classes',
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate,
      status: 'active',
      maxAttempts: data.maxAttempts || 1,
      allowRetry: data.allowRetry ?? true,
      showAnswersAfter: data.showAnswersAfter ?? true,
      timeLimitMinutes: data.timeLimitMinutes || 0,
      totalSubmissions: 0,
      createdAt: new Date().toISOString(),
    };

    assignments.unshift(newAssignment);
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    return newAssignment;
  }

  public closeAssignment(id: string): void {
    const assignments = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    const idx = assignments.findIndex((a) => a.id === id);
    if (idx >= 0) {
      assignments[idx].status = 'closed';
      this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    }
  }

  public deleteAssignment(id: string): void {
    const assignments = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []).filter((a) => a.id !== id);
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
  }

  // --- RESULTS ---
  public getResults(): StudentResult[] {
    return this.getItem<StudentResult[]>(STORAGE_KEYS.RESULTS, []);
  }

  public getResultsByAssignment(assignmentIdOrCode: string): StudentResult[] {
    const results = this.getResults();
    return results.filter(
      (r) => r.assignmentId === assignmentIdOrCode || r.assignmentCode === assignmentIdOrCode
    );
  }

  public saveStudentResult(data: {
    studentName: string;
    studentClass: string;
    assignmentId: string;
    activityId: string;
    assignmentCode: string;
    activityTitle?: string;
    score: number;
    totalQuestions: number;
    answers: StudentResult['answers'];
    timeSpentSeconds: number;
  }): StudentResult {
    const results = this.getItem<StudentResult[]>(STORAGE_KEYS.RESULTS, []);
    const percentage = data.totalQuestions > 0 ? Math.round((data.score / data.totalQuestions) * 100) : 0;

    const newResult: StudentResult = {
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      studentName: data.studentName.trim(),
      studentClass: data.studentClass.trim(),
      assignmentId: data.assignmentId,
      activityId: data.activityId,
      assignmentCode: data.assignmentCode,
      activityTitle: data.activityTitle || 'Interactive Assignment',
      score: data.score,
      totalQuestions: data.totalQuestions,
      percentage,
      answers: data.answers,
      completedAt: new Date().toISOString(),
      timeSpentSeconds: data.timeSpentSeconds,
    };

    results.unshift(newResult);
    this.setItem(STORAGE_KEYS.RESULTS, results);
    return newResult;
  }

  public deleteResult(id: string): void {
    const results = this.getItem<StudentResult[]>(STORAGE_KEYS.RESULTS, []);
    const filtered = results.filter((r) => r.id !== id && r.attemptId !== id);
    this.setItem(STORAGE_KEYS.RESULTS, filtered);
  }

  // --- STUDENTS ROSTER ---
  public getStudents(): StudentProfile[] {
    const results = this.getResults();
    const map = new Map<string, {
      name: string;
      className: string;
      scores: number[];
      lastActivityAt: string;
    }>();

    results.forEach((r) => {
      const key = `${r.studentName.toLowerCase()}_${r.studentClass.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.scores.push(r.percentage);
        if (new Date(r.completedAt) > new Date(existing.lastActivityAt)) {
          existing.lastActivityAt = r.completedAt;
        }
      } else {
        map.set(key, {
          name: r.studentName,
          className: r.studentClass,
          scores: [r.percentage],
          lastActivityAt: r.completedAt,
        });
      }
    });

    const list: StudentProfile[] = [];
    map.forEach((val, key) => {
      const avg = Math.round(val.scores.reduce((a, b) => a + b, 0) / val.scores.length);
      list.push({
        id: 'std_' + key,
        ownerId: 'teacher_default',
        name: val.name,
        className: val.className,
        assignmentsCompleted: val.scores.length,
        averageScore: avg,
        lastActivityAt: val.lastActivityAt,
      });
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  // --- DATABASE RESET / SEED FOR TESTING ---
  public resetDatabase(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
    localStorage.removeItem(STORAGE_KEYS.FOLDERS);
    localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    this.broadcastChange();
  }
}

export const db = new EduSpaceDatabase();
export const dbService = db;
