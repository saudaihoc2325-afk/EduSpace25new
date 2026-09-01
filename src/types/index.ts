export type UserRole = 'teacher' | 'student';

export type GradeLevel = '10' | '11' | '12' | 'All Grades';

export type GameType =
  | 'quiz'
  | 'match_up'
  | 'random_wheel'
  | 'open_box'
  | 'anagram'
  | 'gameshow_quiz'
  | 'complete_sentence';

export interface GameTypeMeta {
  type: GameType;
  label: string;
  description: string;
  iconName: string;
  badgeColor: string;
  isReady: boolean;
}

export interface QuestionOption {
  id: string; // Stable unique option ID e.g. "opt_a_..."
  label?: string; // "A", "B", "C", "D"
  text: string;
  isCorrect?: boolean;
}

export type ValidationStatus = 'VALID' | 'REVIEW_REQUIRED' | 'ERROR';

export interface QuestionItem {
  id: string;
  questionSetId?: string;
  ownerId?: string;
  question: string;
  options: QuestionOption[];
  correctAnswerId?: string;
  correctAnswerText?: string;
  correctAnswer?: string; // Backward compatibility alias
  explanation?: string | null;
  passage?: string | null;
  unit?: string;
  lesson?: string;
  level?: string;
  questionType?: string;
  sourceFileName?: string;
  sourceFileType?: 'docx' | 'pdf' | 'xlsx' | 'csv' | 'manual';
  importedAt?: string;
  order: number;
  points?: number;
  timeLimitSeconds?: number;
}

export interface ImportedQuestionItem extends QuestionItem {
  validationStatus: ValidationStatus;
  validationIssues: string[];
  isDuplicate?: boolean;
  selectedForImport: boolean;
  originalRawNumber?: string | number;
}

export interface ImportHistoryItem {
  id: string;
  teacherId: string;
  fileName: string;
  fileType: 'docx' | 'pdf' | 'xlsx' | 'csv' | 'manual';
  fileSizeBytes?: number;
  questionSetId?: string;
  questionSetName?: string;
  numberDetected: number;
  numberImported: number;
  numberRejected: number;
  numberReviewRequired: number;
  importedAt: string;
}

export interface ExcelColumnMapping {
  questionCol: string;
  optionACol: string;
  optionBCol: string;
  optionCCol: string;
  optionDCol: string;
  answerCol: string;
  explanationCol: string;
  passageCol?: string;
  unitCol?: string;
  lessonCol?: string;
  levelCol?: string;
}

export interface QuestionSet {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  gradeLevel?: GradeLevel;
  tags?: string[];
  questions: QuestionItem[];
  itemCount?: number;
  sourceFileName?: string;
  sourceFileType?: string;
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameSettings {
  questionCount?: number | 'ALL';
  selectedQuestionIds?: string[];
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  showExplanation?: boolean;
  timeLimitSeconds?: number;
  attempts?: number;
  soundEffects?: boolean;
  showScore?: boolean;
  showProgress?: boolean;
  showCorrectAnswer?: boolean;
  allowReplay?: boolean;
  // Specific Game Controls:
  removeAfterSelection?: boolean; // Random Wheel: remove item in active session
  spinDurationSeconds?: number; // Random Wheel
  matchingMode?: 'question_to_answer' | 'term_to_def'; // Match Up
  bonusTimePoints?: boolean; // Gameshow Quiz
  gridColumns?: number; // Open the Box
}

export interface Activity {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  gameType: GameType;
  folderId?: string | null;
  questionSetId: string;
  questionSet?: QuestionSet;
  selectedQuestionIds?: string[];
  settings?: GameSettings;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  color?: string;
  icon?: string;
  description?: string;
  parentId?: string | null;
  activityCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSettings {
  requireStudentName: boolean;
  requireClass: boolean;
  requireStudentId?: boolean;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
  showScore: boolean;
  showExplanation: boolean;
  showCorrectAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  timeLimitMinutes?: number;
}

export type AssignmentStatus = 'active' | 'scheduled' | 'expired' | 'closed' | 'draft';

export interface Assignment {
  id: string;
  ownerId: string;
  activityId: string;
  questionSetId?: string;
  activityTitle: string;
  title?: string;
  instructions?: string;
  gameType: GameType;
  assignmentCode: string; // Dynamic unique 6-digit code string e.g. "335970"
  studentLink: string;
  qrCodeUrl?: string;
  targetType?: 'all' | 'class' | 'students' | 'custom';
  targetClass?: string;
  classIds?: string[];
  startDate?: string;
  endDate?: string;
  startAt?: string;
  endAt?: string;
  status: AssignmentStatus;
  maxAttempts?: number;
  allowRetry?: boolean;
  showAnswersAfter?: boolean;
  timeLimitMinutes?: number;
  settings?: AssignmentSettings;
  totalSubmissions: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentAnswerRecord {
  questionId: string;
  questionText?: string;
  selectedAnswer: string;
  selectedAnswerId?: string;
  correctAnswer: string;
  correctAnswerId?: string;
  isCorrect: boolean;
  pointsEarned?: number;
  timeSpentSeconds?: number;
  explanation?: string;
}

export interface StudentResult {
  id: string;
  attemptId?: string;
  attemptNumber?: number;
  assignmentId: string;
  activityId: string;
  questionSetId?: string;
  assignmentCode: string;
  activityTitle?: string;
  teacherOwnerId?: string;
  studentName: string;
  studentClass: string;
  studentId?: string;
  score: number;
  totalQuestions: number;
  correctCount?: number;
  percentage: number;
  answers: StudentAnswerRecord[];
  startTime?: string;
  completedAt: string;
  timeSpentSeconds: number;
  createdAt?: string;
}

export interface StudentProfile {
  id: string;
  ownerId: string;
  name: string;
  className: string;
  assignmentsCompleted: number;
  averageScore: number;
  createdAt?: string;
  updatedAt?: string;
  lastActivityAt?: string;
}

export interface TeacherProfile {
  uid: string;
  displayName: string;
  organization: string;
  email: string;
  schoolYear: string;
  defaultGrade: GradeLevel;
  role: 'teacher';
  createdAt?: string;
  updatedAt?: string;
}

export type TeacherNavTab =
  | 'home'
  | 'question-bank'
  | 'import-questions'
  | 'create-activity'
  | 'my-activities'
  | 'folders'
  | 'assignments'
  | 'results'
  | 'students'
  | 'settings';

