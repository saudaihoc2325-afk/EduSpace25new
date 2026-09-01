import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Award,
  BookOpen,
  User,
  GraduationCap,
  RotateCcw,
  Check,
  X,
  Loader2,
  Gamepad2,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  AlertTriangle,
  KeyRound,
  FileText,
  HelpCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Assignment, Activity, StudentAnswerRecord, StudentResult, QuestionItem } from '../../types';
import { APP_NAME, ORG_NAME, GAME_TYPES } from '../../constants/gameTypes';
import { assignmentService, activityService, resultService } from '../../services/firestoreService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import { GameSessionRunner } from '../games/GameSessionRunner';
import { CertificateModal } from './CertificateModal';
import { EncouragementCard } from './EncouragementCard';

interface StudentPortalProps {
  initialCode?: string | null;
  onBackToTeacher: () => void;
}

type StudentStep = 'enter-code' | 'login' | 'playing' | 'completed';

export const StudentPortal: React.FC<StudentPortalProps> = ({
  initialCode,
  onBackToTeacher,
}) => {
  const { showError, showSuccess, showInfo } = useToast();

  const [step, setStep] = useState<StudentStep>('login');
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [isRetryingSave, setIsRetryingSave] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Manual 6-digit Code input
  const [enteredCode, setEnteredCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Assignment & Activity State
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  // Student Info - Only 2 required fields: Full Name & Class (plus optional Student ID if required)
  const [studentName, setStudentName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('eduspace25_student_name') || '';
    }
    return '';
  });

  const [studentClass, setStudentClass] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('eduspace25_student_class') || '';
    }
    return '';
  });

  const [studentId, setStudentId] = useState('');

  // Active Session & Attempt Tracking
  const [currentAttemptId, setCurrentAttemptId] = useState<string>('');
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState<number>(1);
  const [attemptStartTime, setAttemptStartTime] = useState<string>('');

  // Active Game Session Summary
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPercentage, setFinalPercentage] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [answersSummary, setAnswersSummary] = useState<StudentAnswerRecord[]>([]);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  // Pending submission payload for retry support
  const [pendingPayload, setPendingPayload] = useState<Parameters<typeof resultService.submitStudentResult>[0] | null>(null);

  // Function to validate and load an assignment by 6-digit code or direct ID
  const loadAssignmentByCode = async (codeToLookup: string): Promise<boolean> => {
    const cleanCode = codeToLookup.trim().toUpperCase();
    if (!cleanCode) return false;

    setAssignmentError(null);
    try {
      const foundAsgn = await assignmentService.getAssignmentByCode(cleanCode);

      if (!foundAsgn) {
        // Fallback: check if it's an assignment ID
        const byId = await assignmentService.getAssignmentById(cleanCode);
        if (byId) {
          return setupAssignment(byId);
        }
        setAssignmentError(`Không tìm thấy bài tập với mã "${cleanCode}". Vui lòng kiểm tra lại mã 6 chữ số.`);
        return false;
      }

      return setupAssignment(foundAsgn);
    } catch (err) {
      console.error('Error fetching assignment:', err);
      setAssignmentError('Lỗi khi tải bài tập. Vui lòng thử lại.');
      return false;
    }
  };

  const setupAssignment = async (asgn: Assignment): Promise<boolean> => {
    // Check status
    if (asgn.status === 'scheduled') {
      const startStr = asgn.startDate ? new Date(asgn.startDate).toLocaleString('vi-VN') : 'thời gian tới';
      setAssignmentError(`Bài tập này được lên lịch mở vào: ${startStr}. Vui lòng quay lại sau.`);
      setActiveAssignment(asgn);
      return false;
    }

    if (asgn.status === 'expired') {
      const endStr = asgn.endDate ? new Date(asgn.endDate).toLocaleString('vi-VN') : '';
      setAssignmentError(`Bài tập này đã hết hạn${endStr ? ` vào ${endStr}` : ''}.`);
      setActiveAssignment(asgn);
      return false;
    }

    if (asgn.status === 'closed') {
      setAssignmentError('Bài tập này hiện đã được giáo viên đóng lại.');
      setActiveAssignment(asgn);
      return false;
    }

    setActiveAssignment(asgn);

    // If targetClass is specific (e.g. 10A1), prefill studentClass if not set
    if (asgn.targetClass && asgn.targetClass !== 'All Classes' && asgn.targetClass !== 'General') {
      setStudentClass((prev) => prev || asgn.targetClass || '');
    }

    // Load corresponding activity
    const act = await activityService.getActivityById(asgn.activityId);
    if (act) {
      setActiveActivity(act);
      setStep('login');
      return true;
    } else {
      setAssignmentError('Không tìm thấy nội dung trò chơi của bài tập này.');
      return false;
    }
  };

  // Automatically load code from URL on initial mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoadingAssignment(true);
      try {
        let targetIdentifier = initialCode?.trim() || null;
        if (!targetIdentifier && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          targetIdentifier =
            params.get('code') ||
            params.get('asgn') ||
            params.get('assignment') ||
            params.get('assignmentId') ||
            params.get('activity') ||
            params.get('activityId');
        }

        if (targetIdentifier) {
          const ok = await loadAssignmentByCode(targetIdentifier);
          if (ok && isMounted) {
            setStep('login');
            setIsLoadingAssignment(false);
            return;
          }
        }

        // If no code in URL, check if active assignments exist
        const activeList = await assignmentService.getActiveAssignments();
        if (isMounted) {
          if (activeList.length > 0) {
            const first = activeList[0];
            await setupAssignment(first);
            setStep('login');
          } else {
            setStep('enter-code');
          }
        }
      } catch (err) {
        console.error('Error during student initialization:', err);
      } finally {
        if (isMounted) {
          setIsLoadingAssignment(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [initialCode]);

  // Handler when student manually submits 6-digit code
  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredCode.trim()) return;

    setIsValidatingCode(true);
    try {
      const ok = await loadAssignmentByCode(enteredCode.trim());
      if (ok) {
        showSuccess('Tìm thấy bài tập! Vui lòng nhập Họ tên & Lớp.');
      }
    } finally {
      setIsValidatingCode(false);
    }
  };

  // 1. Submit Student Name and Class to start the game directly (NO PIN REQUIRED)
  const handleStartActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = studentName.trim();
    const cleanClass = studentClass.trim();

    if (!cleanName) {
      showError('Vui lòng nhập Họ và tên của bạn.');
      return;
    }
    if (!cleanClass) {
      showError('Vui lòng nhập Lớp của bạn (Ví dụ: 10A1, 11B2, 12D1).');
      return;
    }

    // Check student ID if required
    if (activeAssignment?.settings?.requireStudentId && !studentId.trim()) {
      showError('Vui lòng nhập Mã số học sinh / Số báo danh.');
      return;
    }

    if (!activeActivity || !activeActivity.questionSet?.questions?.length) {
      showError('Chưa có câu hỏi trong bài tập này. Vui lòng liên hệ giáo viên.');
      return;
    }

    // Check past attempts in Firestore
    let nextAttemptNum = 1;
    if (activeAssignment) {
      try {
        const pastAttempts = await resultService.getStudentPastAttempts(
          activeAssignment.id,
          cleanName,
          cleanClass
        );

        nextAttemptNum = pastAttempts.length + 1;
        const isMultipleAllowed = activeAssignment.settings?.allowMultipleAttempts ?? activeAssignment.allowRetry ?? true;
        const maxAllowed = activeAssignment.settings?.maxAttempts || activeAssignment.maxAttempts || 1;

        if (!isMultipleAllowed && pastAttempts.length >= 1) {
          showError(`Bạn (${cleanName} - ${cleanClass}) đã hoàn thành bài tập này trước đó.`);
          return;
        }

        if (isMultipleAllowed && maxAllowed > 0 && pastAttempts.length >= maxAllowed) {
          showError(`Bạn đã hoàn thành đủ số lần tối đa cho phép (${pastAttempts.length}/${maxAllowed} lần).`);
          return;
        }
      } catch (err) {
        console.warn('Attempt check bypassed:', err);
      }
    }

    // Generate unique attempt ID and initialize tracking
    const newAttemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setCurrentAttemptId(newAttemptId);
    setCurrentAttemptNumber(nextAttemptNum);
    setAttemptStartTime(new Date().toISOString());

    // Store in browser session for seamless future access
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('eduspace25_student_name', cleanName);
      sessionStorage.setItem('eduspace25_student_class', cleanClass);
    }

    setTimeSpentSeconds(0);
    setSaveError(null);
    setStep('playing');
  };

  // 2. Handle Game Completion, Auto-Grade against authoritative questions, and save to Firestore
  const handleGameFinished = async (data: {
    score: number;
    totalQuestions: number;
    correctCount: number;
    timeSpentSeconds: number;
    answers: StudentAnswerRecord[];
  }) => {
    if (!activeActivity) return;

    const masterQuestions: QuestionItem[] = activeActivity.questionSet?.questions || [];
    const totalQ = data.totalQuestions > 0 ? data.totalQuestions : masterQuestions.length;
    
    // Authoritative answer validation to ensure data completeness
    const reconciledAnswers: StudentAnswerRecord[] = masterQuestions.map((masterQ, idx) => {
      const existingAns = data.answers.find((a) => a.questionId === masterQ.id);
      if (existingAns) {
        return {
          ...existingAns,
          questionText: existingAns.questionText || masterQ.question,
          explanation: existingAns.explanation || masterQ.explanation || undefined,
          pointsEarned: existingAns.pointsEarned ?? (existingAns.isCorrect ? (masterQ.points || 10) : 0),
        };
      }
      // If not explicitly reported, find corresponding answer or mark skipped
      return {
        questionId: masterQ.id,
        questionText: masterQ.question,
        selectedAnswer: 'Chưa trả lời',
        selectedAnswerId: 'UNANSWERED',
        correctAnswer: masterQ.correctAnswerText || masterQ.correctAnswer || '',
        correctAnswerId: masterQ.correctAnswerId || '',
        isCorrect: false,
        pointsEarned: 0,
        timeSpentSeconds: 0,
        explanation: masterQ.explanation || undefined,
      };
    });

    const calculatedCorrectCount = reconciledAnswers.filter((a) => a.isCorrect).length;
    const finalCalculatedScore = reconciledAnswers.reduce((acc, a) => acc + (a.pointsEarned || 0), 0);
    const effectiveScore = data.score > 0 ? data.score : finalCalculatedScore;
    const effectiveCorrectCount = data.correctCount > 0 ? data.correctCount : calculatedCorrectCount;
    const percentage = totalQ > 0 ? Math.round((effectiveCorrectCount / totalQ) * 100) : 0;

    setFinalScore(effectiveScore);
    setFinalPercentage(percentage);
    setCorrectCount(effectiveCorrectCount);
    setTotalQuestionsCount(totalQ);
    setTimeSpentSeconds(data.timeSpentSeconds);
    setAnswersSummary(reconciledAnswers);

    const payload = {
      attemptId: currentAttemptId || `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      attemptNumber: currentAttemptNumber,
      studentName: studentName.trim(),
      studentClass: studentClass.trim(),
      studentId: studentId.trim() || undefined,
      assignmentId: activeAssignment?.id || `direct_${activeActivity.id}`,
      activityId: activeActivity.id,
      questionSetId: activeActivity.questionSetId || '',
      assignmentCode: activeAssignment?.assignmentCode || 'DIRECT',
      activityTitle: activeAssignment?.title || activeActivity.title,
      teacherOwnerId: activeAssignment?.ownerId || activeActivity.ownerId,
      score: effectiveScore,
      totalQuestions: totalQ,
      correctCount: effectiveCorrectCount,
      answers: reconciledAnswers,
      startTime: attemptStartTime || new Date().toISOString(),
      timeSpentSeconds: data.timeSpentSeconds,
    };

    setPendingPayload(payload);
    setIsSubmittingResult(true);
    setSaveError(null);

    try {
      // Save directly to Firestore database
      await resultService.submitStudentResult(payload);
      setStep('completed');
      showSuccess('Kết quả bài làm đã được lưu thành công vào sổ điểm của giáo viên!');
    } catch (err) {
      console.error('Error saving student result to Firestore:', err);
      setSaveError('Không thể kết nối đến máy chủ lưu điểm. Bạn có thể nhấn "Thử lưu lại" bên dưới.');
      setStep('completed');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  // 3. Retry saving result in case of network issue
  const handleRetrySave = async () => {
    if (!pendingPayload) return;
    setIsRetryingSave(true);
    try {
      await resultService.submitStudentResult(pendingPayload);
      setSaveError(null);
      showSuccess('Lưu kết quả thành công vào hệ thống!');
    } catch (err) {
      console.error('Retry save failed:', err);
      showError('Vẫn chưa lưu được kết quả. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setIsRetryingSave(false);
    }
  };

  // 4. Handle Play Again (if allowed by assignment)
  const handlePlayAgain = () => {
    if (!activeAssignment || !activeActivity) {
      setStep('login');
      return;
    }

    const isMultipleAllowed = activeAssignment.settings?.allowMultipleAttempts ?? activeAssignment.allowRetry ?? true;
    const maxAllowed = activeAssignment.settings?.maxAttempts || activeAssignment.maxAttempts || 1;

    if (!isMultipleAllowed) {
      showInfo('Bài tập này chỉ cho phép làm 1 lần.');
      return;
    }

    if (maxAllowed > 0 && currentAttemptNumber >= maxAllowed) {
      showInfo(`Bạn đã đạt số lần làm tối đa (${currentAttemptNumber}/${maxAllowed}).`);
      return;
    }

    // Prepare fresh attempt
    const newAttemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setCurrentAttemptId(newAttemptId);
    setCurrentAttemptNumber((prev) => prev + 1);
    setAttemptStartTime(new Date().toISOString());
    setTimeSpentSeconds(0);
    setSaveError(null);
    setAnswersSummary([]);
    setStep('playing');
  };

  // Performance badge evaluator
  const getPerformanceBadge = (pct: number) => {
    if (pct === 100) return { label: 'Xuất Sắc (Perfect Score) 🌟', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (pct >= 80) return { label: 'Giỏi (Excellent) 🏆', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (pct >= 65) return { label: 'Khá (Good Job) 👍', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
    if (pct >= 50) return { label: 'Đạt (Passed) 🎯', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
    return { label: 'Cần Cố Gắng Thêm (Keep Trying) 💪', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
  };

  // RENDER STEP 0: MANUAL 6-DIGIT CODE ENTRY (If no assignment selected/found)
  if (step === 'enter-code' || (!activeActivity && !isLoadingAssignment)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none">
        <header className="flex items-center justify-between max-w-md w-full mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-extrabold text-white font-display text-sm shadow-lg shadow-indigo-500/30">
              E25
            </div>
            <div>
              <span className="font-extrabold font-display tracking-tight text-white block text-sm">
                {APP_NAME}
              </span>
              <span className="text-[10px] text-indigo-300 font-semibold tracking-wider uppercase block">
                {ORG_NAME}
              </span>
            </div>
          </div>

          <Button
            id="btn-switch-to-teacher-portal"
            variant="outline"
            size="sm"
            onClick={onBackToTeacher}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl"
          >
            Teacher Portal
          </Button>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-6">
          <Card variant="elevated" padding="lg" className="bg-slate-900/95 border-slate-800 backdrop-blur-xl shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white font-display">
                Nhập Mã Bài Tập 6 Chữ Số
              </h2>
              <p className="text-xs text-slate-400">
                Nhập mã 6 chữ số do giáo viên cung cấp để tham gia làm bài
              </p>
            </div>

            {assignmentError && (
              <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded-2xl p-3 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{assignmentError}</span>
              </div>
            )}

            <form onSubmit={handleManualCodeSubmit} className="space-y-4">
              <div>
                <input
                  id="student-code-input"
                  type="text"
                  maxLength={6}
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())}
                  placeholder="Ví dụ: 583214"
                  className="w-full text-center font-mono text-3xl font-extrabold tracking-widest h-14 rounded-2xl border-2 border-indigo-500/50 bg-slate-950 text-amber-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none uppercase"
                  autoFocus
                />
              </div>

              <Button
                id="btn-submit-student-code"
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={enteredCode.length < 4 || isValidatingCode}
                icon={isValidatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                className="h-12 text-sm font-bold shadow-xl shadow-indigo-600/30 rounded-xl"
              >
                {isValidatingCode ? 'Đang kiểm tra...' : 'Tiếp Tục'}
              </Button>
            </form>
          </Card>
        </main>

        <footer className="text-center text-xs text-slate-500 py-3">
          <p>© {ORG_NAME} • {APP_NAME} Interactive English Platform</p>
        </footer>
      </div>
    );
  }

  // RENDER STEP 1: STUDENT LOGIN / ENTRY SCREEN (Họ và tên + Lớp ONLY)
  if (step === 'login') {
    const gameMeta = activeActivity
      ? GAME_TYPES.find((g) => g.type === activeActivity.gameType) || GAME_TYPES[0]
      : GAME_TYPES[0];

    const questionCount = activeActivity?.questionSet?.questions?.length || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none">
        {/* Top Header */}
        <header className="flex items-center justify-between max-w-lg w-full mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-extrabold text-white font-display text-sm shadow-lg shadow-indigo-500/30">
              E25
            </div>
            <div>
              <span className="font-extrabold font-display tracking-tight text-white block text-sm">
                {APP_NAME}
              </span>
              <span className="text-[10px] text-indigo-300 font-semibold tracking-wider uppercase block">
                {ORG_NAME}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('enter-code')}
              className="text-xs text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Đổi mã bài tập
            </button>
            <Button
              id="btn-student-back-to-teacher"
              variant="outline"
              size="sm"
              onClick={onBackToTeacher}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl"
            >
              Teacher Portal
            </Button>
          </div>
        </header>

        {/* Center Container: Student Registration & Login */}
        <main className="max-w-lg w-full mx-auto my-auto py-6">
          {isLoadingAssignment ? (
            <Card variant="elevated" padding="lg" className="bg-slate-900/90 border-slate-800 backdrop-blur-xl text-center py-12">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">Đang tải bài tập...</p>
              <p className="text-xs text-slate-400 mt-1">Đang kết nối cơ sở dữ liệu EduSpace25</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Activity Info Banner */}
              {activeActivity && (
                <div className="bg-slate-900/95 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-indigo-950/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Trò chơi ôn tập: {gameMeta.label}</span>
                      </div>
                      <h1 className="text-lg sm:text-xl font-extrabold font-display text-white tracking-tight leading-snug">
                        {activeAssignment?.title || activeActivity.title}
                      </h1>
                      {activeAssignment?.instructions && (
                        <div className="bg-indigo-950/60 border border-indigo-500/20 rounded-xl p-2.5 text-xs text-indigo-200 flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <p>{activeAssignment.instructions}</p>
                        </div>
                      )}
                    </div>
                    {activeAssignment?.assignmentCode && (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mã bài</span>
                        <span className="font-mono text-sm font-extrabold text-amber-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          {activeAssignment.assignmentCode}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-800 text-slate-300 font-medium">
                      📝 {questionCount} câu hỏi
                    </span>
                    {activeAssignment?.targetClass && activeAssignment.targetClass !== 'All Classes' && (
                      <span className="bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-800 text-indigo-300 font-semibold">
                        🏫 {activeAssignment.targetClass}
                      </span>
                    )}
                    <span className="bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/30 text-emerald-300 font-semibold">
                      ⚡ Trực tiếp (Chỉ cần Họ tên & Lớp)
                    </span>
                  </div>
                </div>
              )}

              {/* Student Entry Form (ONLY Name & Class) */}
              <Card variant="elevated" padding="lg" className="bg-slate-900/95 border-slate-800 backdrop-blur-xl shadow-2xl">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    Thông tin học sinh tham gia
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Nhập họ tên và lớp của bạn để bắt đầu làm bài ngay
                  </p>
                </div>

                <form onSubmit={handleStartActivity} className="space-y-4">
                  {/* Field 1: Full Name */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Họ và tên học sinh <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="student-name-input"
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn An"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-slate-700 bg-slate-950 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Field 2: Class */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Lớp <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="student-class-input"
                        type="text"
                        placeholder="Ví dụ: 10A1, 11B2, 12D1"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-slate-700 bg-slate-950 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all uppercase"
                        required
                      />
                    </div>
                    {/* Quick suggestions if target class is set */}
                    {activeAssignment?.targetClass && activeAssignment.targetClass !== 'All Classes' && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>Lớp được chỉ định:</span>
                        <button
                          type="button"
                          onClick={() => setStudentClass(activeAssignment.targetClass || '')}
                          className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-semibold"
                        >
                          {activeAssignment.targetClass}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Optional Student ID if required by settings */}
                  {activeAssignment?.settings?.requireStudentId && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                        Mã số học sinh / SBD <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="student-id-input"
                        type="text"
                        placeholder="Ví dụ: HS1001"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-slate-700 bg-slate-950 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none"
                        required
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      id="btn-student-start-game"
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={!studentName.trim() || !studentClass.trim() || !activeActivity}
                      icon={<ArrowRight className="w-5 h-5" />}
                      className="shadow-xl shadow-indigo-600/40 text-sm font-bold h-12 rounded-xl cursor-pointer"
                    >
                      Vào Làm Bài Ngay
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-3">
          <p>© {ORG_NAME} • {APP_NAME} Interactive English Platform</p>
        </footer>
      </div>
    );
  }

  // RENDER STEP 2: PLAYING ACTIVE GAME ENGINE
  if (step === 'playing' && activeActivity?.questionSet?.questions) {
    const rawQuestions = activeActivity.questionSet.questions;

    // Apply shuffling if configured in assignment settings
    const shouldShuffleQuestions = activeAssignment?.settings?.shuffleQuestions ?? true;
    const shouldShuffleAnswers = activeAssignment?.settings?.shuffleAnswers ?? true;

    let processedQuestions = [...rawQuestions];
    if (shouldShuffleQuestions) {
      processedQuestions = [...processedQuestions].sort(() => Math.random() - 0.5);
    }
    if (shouldShuffleAnswers) {
      processedQuestions = processedQuestions.map((q) => {
        if (q.options && q.options.length > 0) {
          return {
            ...q,
            options: [...q.options].sort(() => Math.random() - 0.5),
          };
        }
        return q;
      });
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-6 select-none">
        <div className="max-w-4xl w-full mx-auto my-auto py-2">
          <GameSessionRunner
            gameType={activeActivity.gameType}
            title={activeAssignment?.title || activeActivity.title}
            questions={processedQuestions}
            settings={{
              ...(activeActivity.settings || {}),
              timeLimitSeconds: (activeAssignment?.timeLimitMinutes || 0) * 60,
              showExplanation: activeAssignment?.settings?.showExplanation ?? true,
            }}
            selectedQuestionIds={activeActivity.selectedQuestionIds}
            onFinish={handleGameFinished}
            onExit={() => setStep('login')}
            isPreview={false}
          />
        </div>
      </div>
    );
  }

  // RENDER STEP 3: COMPLETED RESULTS & DETAILED FEEDBACK
  const performance = getPerformanceBadge(finalPercentage);
  const isMultipleAllowed = activeAssignment?.settings?.allowMultipleAttempts ?? activeAssignment?.allowRetry ?? true;
  const maxAllowed = activeAssignment?.settings?.maxAttempts || activeAssignment?.maxAttempts || 1;
  const canPlayAgain = isMultipleAllowed && (maxAllowed === 0 || currentAttemptNumber < maxAllowed);

  const showScoreConfig = activeAssignment?.settings?.showScore ?? true;
  const showExplanationConfig = activeAssignment?.settings?.showExplanation ?? true;
  const showCorrectAnswersConfig = activeAssignment?.settings?.showCorrectAnswers ?? true;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none">
      <main className="max-w-lg w-full mx-auto my-auto py-6 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Top Trophy Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-950/50">
          <Award className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Title & Metadata */}
        <div>
          <Badge variant="success" size="lg" className="mb-2">
            Đã hoàn thành bài tập
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
            Chúc mừng {studentName}!
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Lớp <strong className="text-slate-200">{studentClass}</strong> • {activeAssignment?.title || activeActivity?.title}
          </p>
          {maxAllowed > 1 && (
            <span className="inline-block mt-1 text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20">
              Lần làm bài: {currentAttemptNumber}/{maxAllowed}
            </span>
          )}
        </div>

        {/* Performance Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${performance.color}`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{performance.label}</span>
        </div>

        {/* Certificate of Achievement for High Achievers (>= 75%) */}
        {finalPercentage >= 75 && (
          <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 text-center shadow-[0_0_25px_rgba(245,158,11,0.25)] space-y-3 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-center gap-2">
              <Award className="w-6 h-6 text-amber-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-extrabold text-amber-300 uppercase tracking-wider font-display">
                Vinh Danh Thành Tích Xuất Sắc
              </span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed">
              Bạn đã hoàn thành xuất sắc bài tập với độ chính xác <strong className="text-amber-300 font-mono text-sm">{finalPercentage}%</strong>! Giấy chứng nhận vinh danh của bạn đã sẵn sàng.
            </p>
            <Button
              id="btn-open-certificate"
              variant="primary"
              size="md"
              icon={<Award className="w-4 h-4 text-slate-950" />}
              onClick={() => setShowCertificate(true)}
              className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 text-xs sm:text-sm px-6 py-2.5 rounded-2xl cursor-pointer"
            >
              🏆 Xem & In Giấy Khen Vinh Danh
            </Button>
          </div>
        )}

        {/* Encouragement Card for Students Needing Improvement (< 70%) */}
        {finalPercentage < 70 && (
          <EncouragementCard
            studentName={studentName}
            percentage={finalPercentage}
            correctCount={correctCount}
            totalQuestions={totalQuestionsCount}
            onReviewAnswers={() => setIsReviewExpanded(true)}
            onPlayAgain={canPlayAgain ? handlePlayAgain : undefined}
            canPlayAgain={canPlayAgain}
          />
        )}

        {/* Metrics Grid */}
        {showScoreConfig && (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4">
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Điểm số
              </span>
              <span className="text-xl sm:text-2xl font-black text-indigo-400 font-mono">
                {finalScore}
              </span>
            </div>
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Chính xác
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {finalPercentage}%
              </span>
            </div>
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Thời gian
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {Math.floor(timeSpentSeconds / 60)}m {timeSpentSeconds % 60}s
              </span>
            </div>
          </div>
        )}

        {/* Network Save Error & Retry Notification */}
        {saveError ? (
          <div className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-4 text-xs text-rose-200 text-left space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Chưa lưu được kết quả lên Firebase</span>
            </div>
            <p className="text-[11px] text-rose-300/90">{saveError}</p>
            <div className="pt-1">
              <Button
                id="btn-retry-save-result"
                variant="primary"
                size="sm"
                onClick={handleRetrySave}
                disabled={isRetryingSave}
                icon={isRetryingSave ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                {isRetryingSave ? 'Đang thử lưu lại...' : 'Thử Lưu Lại Kết Quả'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-300 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Kết quả đã được lưu tự động vào sổ điểm của giáo viên</span>
          </div>
        )}

        {/* Detailed Question Review Accordion (if enabled in settings) */}
        {(showCorrectAnswersConfig || showExplanationConfig) && answersSummary.length > 0 && (
          <div className="text-left bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Chi tiết câu trả lời ({correctCount}/{totalQuestionsCount} đúng)
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewExpanded(!isReviewExpanded)}
                className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-semibold"
              >
                {isReviewExpanded ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Xem chi tiết</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {isReviewExpanded && (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 pt-1">
                {answersSummary.map((ans, idx) => (
                  <div
                    key={ans.questionId || idx}
                    className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                      ans.isCorrect
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[11px] text-slate-300">Câu {idx + 1}</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        {ans.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Đúng (+{ans.pointsEarned || 10}đ)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-rose-400">Chưa chính xác</span>
                          </>
                        )}
                      </span>
                    </div>

                    {ans.questionText && (
                      <p className="text-xs text-slate-200 font-medium">{ans.questionText}</p>
                    )}

                    <div className="text-[11px] space-y-0.5 pt-1 border-t border-white/5">
                      <div>
                        <span className="text-slate-400">Lựa chọn của bạn: </span>
                        <strong className="text-white font-mono">{ans.selectedAnswer || 'Chưa trả lời'}</strong>
                      </div>
                      {!ans.isCorrect && showCorrectAnswersConfig && ans.correctAnswer && (
                        <div>
                          <span className="text-emerald-400 font-semibold">Đáp án đúng: </span>
                          <strong className="text-emerald-300 font-mono">{ans.correctAnswer}</strong>
                        </div>
                      )}
                    </div>

                    {showExplanationConfig && ans.explanation && (
                      <div className="bg-slate-950/60 rounded-xl p-2 text-[11px] text-indigo-200 mt-1 border border-indigo-500/10">
                        <span className="font-bold text-indigo-300">Giải thích: </span>
                        <span>{ans.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex flex-col gap-2.5">
          {canPlayAgain && (
            <Button
              id="btn-student-play-again"
              variant="primary"
              size="lg"
              fullWidth
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={handlePlayAgain}
              className="h-12 shadow-xl shadow-indigo-600/30 text-sm font-bold rounded-xl"
            >
              Làm Lại Bài Tập (Lần {currentAttemptNumber + 1}/{maxAllowed || '∞'})
            </Button>
          )}

          <Button
            id="btn-student-change-activity"
            variant="outline"
            size="md"
            fullWidth
            onClick={() => setStep('enter-code')}
            className="bg-white/5 hover:bg-white/10 text-white border-white/10 text-xs rounded-xl"
          >
            Đổi mã bài tập khác
          </Button>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500">
        EduSpace25 • ENGLISH GROUP
      </footer>

      {showCertificate && (
        <CertificateModal
          data={{
            studentName,
            studentClass,
            activityTitle: activeAssignment?.title || activeActivity?.title || 'Interactive English Activity',
            score: finalScore,
            totalQuestions: totalQuestionsCount,
            percentage: finalPercentage,
            completedAt: new Date().toISOString(),
            assignmentCode: activeAssignment?.code || enteredCode,
          }}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};
