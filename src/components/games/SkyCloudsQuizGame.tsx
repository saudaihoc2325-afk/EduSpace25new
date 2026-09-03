import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  Flame,
  Wind,
  Sun,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface SkyCloudsQuizGameProps {
  title: string;
  questions: QuestionItem[];
  settings?: GameSettings;
  onFinish?: (data: {
    score: number;
    totalQuestions: number;
    correctCount: number;
    timeSpentSeconds: number;
    answers: StudentAnswerRecord[];
  }) => void;
  onExit?: () => void;
  isPreview?: boolean;
}

export const SkyCloudsQuizGame: React.FC<SkyCloudsQuizGameProps> = ({
  title,
  questions: rawQuestions,
  settings: initialSettings,
  onFinish,
  onExit,
  isPreview = false,
}) => {
  const settings: GameSettings = initialSettings || {};
  const [soundOn, setSoundOn] = useState(!soundEffects.getMuted());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [shakeOptId, setShakeOptId] = useState<string | null>(null);

  // Sound sync
  useEffect(() => {
    soundEffects.setMuted(!soundOn);
  }, [soundOn]);

  // Session-specific question set with randomized questions & answers if configured
  const sessionQuestions = useMemo(() => {
    let qList = [...rawQuestions];
    if (settings.shuffleQuestions) {
      qList = [...qList].sort(() => Math.random() - 0.5);
    }
    return qList.map((q) => {
      let opts = [...(q.options || [])];
      if (settings.shuffleAnswers) {
        opts = [...opts].sort(() => Math.random() - 0.5);
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        opts = opts.map((o, idx) => ({
          ...o,
          label: letters[idx] || `${idx + 1}`,
        }));
      }
      return {
        ...q,
        options: opts,
      };
    });
  }, [rawQuestions, settings.shuffleQuestions, settings.shuffleAnswers]);

  // Session stopwatch timer
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  const currentQ = sessionQuestions[currentIdx] || sessionQuestions[0];
  const totalQ = sessionQuestions.length;

  if (!currentQ || totalQ === 0) {
    return (
      <div className="p-8 text-center text-sky-200 bg-sky-950/80 border border-sky-800 rounded-3xl max-w-md mx-auto my-12">
        <Cloud className="w-12 h-12 text-sky-400 mx-auto mb-3 animate-bounce" />
        <p className="font-bold text-base">Không có câu hỏi hợp lệ cho Sky Clouds Quiz.</p>
        {onExit && (
          <button
            onClick={onExit}
            className="mt-4 px-5 py-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all"
          >
            Quay lại
          </button>
        )}
      </div>
    );
  }

  // Handle student tapping on an interactive cloud option
  const handleSelectOption = (optId: string, e?: React.MouseEvent) => {
    if (isAnswered) return;
    setSelectedOptId(optId);
    setIsAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(currentQ, optId);

    if (evalResult.isCorrect) {
      const nextStreak = streakCount + 1;
      setStreakCount(nextStreak);
      if (nextStreak >= 2) {
        soundEffects.playStreak(nextStreak);
      } else {
        soundEffects.playCorrect();
      }

      // Trigger 3D cloud fireworks burst
      const clickX = e?.clientX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 300);
      const clickY = e?.clientY || (typeof window !== 'undefined' ? window.innerHeight * 0.45 : 300);
      fireworks.burst({
        x: clickX,
        y: clickY,
        count: nextStreak >= 3 ? 75 : 50,
      });

      setScore((prev) => prev + evalResult.scoreGained);
      setCorrectCount((prev) => prev + 1);
    } else {
      setStreakCount(0);
      soundEffects.playIncorrect();
      setShakeOptId(optId);
    }

    const answerRecord: StudentAnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedAnswer: evalResult.selectedAnswerText || optId,
      selectedAnswerId: optId,
      correctAnswer: evalResult.correctAnswerText || currentQ.correctAnswer || '',
      correctAnswerId: evalResult.correctAnswerId,
      isCorrect: evalResult.isCorrect,
      timeSpentSeconds,
      explanation: currentQ.explanation || undefined,
    };

    setAnswers((prev) => [...prev, answerRecord]);
  };

  const handleNextQuestion = () => {
    setShakeOptId(null);
    if (currentIdx + 1 < totalQ) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptId(null);
      setIsAnswered(false);
      soundEffects.playClick();
    } else {
      handleFinishGame();
    }
  };

  const handleFinishGame = () => {
    setIsFinished(true);
    soundEffects.playVictory();
    fireworks.grandFinale();

    if (onFinish) {
      const finalScore = score;
      const finalCorrect = correctCount;
      onFinish({
        score: finalScore,
        totalQuestions: totalQ,
        correctCount: finalCorrect,
        timeSpentSeconds,
        answers,
      });
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOptId(null);
    setIsAnswered(false);
    setScore(0);
    setCorrectCount(0);
    setStreakCount(0);
    setIsFinished(false);
    setTimeSpentSeconds(0);
    setAnswers([]);
    setShakeOptId(null);
    soundEffects.playClick();
  };

  // Completion Screen View
  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-950 via-sky-900 to-indigo-950 p-4 sm:p-6 flex items-center justify-center relative overflow-hidden">
        {/* Floating background clouds */}
        <div className="absolute top-10 -left-16 opacity-20 pointer-events-none animate-cloud-drift-1">
          <Cloud className="w-64 h-64 text-sky-200" />
        </div>
        <div className="absolute bottom-20 -right-20 opacity-20 pointer-events-none animate-cloud-drift-2">
          <Cloud className="w-80 h-80 text-sky-200" />
        </div>

        <GameCompletionScreen
          title={title}
          gameTypeLabel="Sky Clouds Quiz"
          score={score}
          correctCount={correctCount}
          totalQuestions={totalQ}
          timeSpentSeconds={timeSpentSeconds}
          answers={answers}
          onPlayAgain={handleRestart}
          onReviewAnswers={() => setIsReviewOpen(true)}
          onExit={onExit}
          isPreview={isPreview}
        />

        <GameReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          answers={answers}
          title={title}
          gameTypeLabel="Sky Clouds Quiz"
        />
      </div>
    );
  }

  // Cloud styling palette for option cards
  const cloudThemes = [
    {
      bg: 'bg-gradient-to-b from-sky-800/90 via-sky-900/95 to-slate-950',
      border: 'border-sky-400/50 hover:border-sky-300',
      badge: 'bg-sky-500 text-white border-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.6)]',
      glow: 'shadow-[0_8px_20px_-4px_rgba(14,165,233,0.35)]',
    },
    {
      bg: 'bg-gradient-to-b from-indigo-800/90 via-indigo-900/95 to-slate-950',
      border: 'border-indigo-400/50 hover:border-indigo-300',
      badge: 'bg-indigo-500 text-white border-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.6)]',
      glow: 'shadow-[0_8px_20px_-4px_rgba(99,102,241,0.35)]',
    },
    {
      bg: 'bg-gradient-to-b from-teal-800/90 via-teal-900/95 to-slate-950',
      border: 'border-teal-400/50 hover:border-teal-300',
      badge: 'bg-teal-500 text-white border-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.6)]',
      glow: 'shadow-[0_8px_20px_-4px_rgba(20,184,166,0.35)]',
    },
    {
      bg: 'bg-gradient-to-b from-cyan-800/90 via-cyan-900/95 to-slate-950',
      border: 'border-cyan-400/50 hover:border-cyan-300',
      badge: 'bg-cyan-500 text-white border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]',
      glow: 'shadow-[0_8px_20px_-4px_rgba(6,182,212,0.35)]',
    },
    {
      bg: 'bg-gradient-to-b from-blue-800/90 via-blue-900/95 to-slate-950',
      border: 'border-blue-400/50 hover:border-blue-300',
      badge: 'bg-blue-500 text-white border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.6)]',
      glow: 'shadow-[0_8px_20px_-4px_rgba(59,130,246,0.35)]',
    },
    {
      bg: 'bg-gradient-to-b from-violet-800/90 via-violet-900/95 to-slate-950',
      border: 'border-violet-400/50 hover:border-violet-300',
      badge: 'bg-violet-500 text-white border-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.6)]',
      glow: 'shadow-[0_8px_20px_-4px_rgba(139,92,246,0.35)]',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-950 via-sky-900 to-indigo-950 text-white p-3 sm:p-5 md:p-8 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Dynamic Animated Sky Clouds in Background */}
      <div className="absolute -top-12 left-10 opacity-25 pointer-events-none animate-cloud-drift-1">
        <Cloud className="w-56 h-56 text-sky-300" />
      </div>
      <div className="absolute top-1/4 right-5 opacity-20 pointer-events-none animate-cloud-drift-2">
        <Cloud className="w-72 h-72 text-sky-200" />
      </div>
      <div className="absolute bottom-10 left-1/3 opacity-15 pointer-events-none animate-cloud-drift-3">
        <Cloud className="w-80 h-80 text-sky-100" />
      </div>

      {/* Subtle Sun Radiance at top corner */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Header & Stats */}
      <div className="max-w-4xl w-full mx-auto relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-3 bg-sky-950/80 backdrop-blur-md px-4 sm:px-5 py-3 rounded-2xl border border-sky-700/60 shadow-lg">
          {/* Game Title & Question Counter */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(14,165,233,0.5)]">
              <Cloud className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-300 font-display">
                  Sky Clouds Quiz
                </h1>
                {isPreview && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Preview
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-bold truncate max-w-[160px] sm:max-w-xs">
                {title}
              </p>
            </div>
          </div>

          {/* Stats Badges: Score, Streak, Timer, Audio */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak Counter */}
            {streakCount > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-bounce">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-300">{streakCount}x Combo</span>
              </div>
            )}

            {/* Score */}
            <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-900/80 border border-sky-600/60 shadow-inner">
              <Sparkles className="w-4 h-4 text-sky-300" />
              <span className="text-xs font-black text-sky-200 font-mono">{score} pts</span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-900/80 border border-sky-600/60 font-mono text-xs font-bold text-sky-200 shadow-inner">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="w-9 h-9 rounded-xl bg-sky-900/80 hover:bg-sky-800 border border-sky-600/60 flex items-center justify-center text-sky-300 transition-all cursor-pointer"
              title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Exit Button */}
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:border-rose-500/60 border border-slate-700 text-xs font-bold text-slate-300 hover:text-rose-300 transition-all cursor-pointer"
              >
                Thoát
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-sky-950/80 rounded-full h-2.5 p-0.5 border border-sky-700/50 shadow-inner">
          <div
            className="bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(56,189,248,0.7)]"
            style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
          />
        </div>
      </div>

      {/* MAIN GAMEPLAY AREA */}
      <div className="max-w-4xl w-full mx-auto relative z-10 my-auto py-3 sm:py-6 space-y-5 sm:space-y-7">
        {/* BIG QUESTION CLOUD CONTAINER (Bảng mây lớn nổi bật) */}
        <div className="relative bg-gradient-to-b from-sky-900/90 via-sky-950/95 to-slate-950/95 p-5 sm:p-7 md:p-8 rounded-[2rem] border-2 border-sky-400/40 shadow-[0_16px_36px_-8px_rgba(14,165,233,0.3),inset_0_2px_4px_rgba(255,255,255,0.2)] animate-cloud-bob backdrop-blur-md">
          {/* Cloud Decor Accents on the Question Board */}
          <div className="absolute -top-5 left-8 px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-[0_4px_12px_rgba(14,165,233,0.5)] border border-sky-200/50 flex items-center gap-1.5">
            <Cloud className="w-4 h-4 fill-white" />
            <span>Đám Mây Câu Hỏi #{currentIdx + 1} / {totalQ}</span>
          </div>

          {/* Reading passage if exists */}
          {currentQ.passage && (
            <div className="mb-4 mt-2 p-4 bg-sky-950/80 border border-sky-700/50 rounded-2xl font-fluid-passage text-slate-200 italic shadow-inner">
              {currentQ.passage}
            </div>
          )}

          {/* Question Text with Wordwall Fluid Scaling (minimum 20px-24px on mobile) */}
          <div className="mt-2 text-center">
            <h2 className="font-fluid-question font-extrabold text-white leading-snug font-display tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              {currentQ.question}
            </h2>
          </div>
        </div>

        {/* INTERACTIVE FLOATING ANSWER CLOUDS (A, B, C, D) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs sm:text-sm font-extrabold text-sky-200 flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-sky-400 animate-pulse" />
              Chạm vào đám mây đáp án đúng:
            </span>
            <span className="text-xs font-bold text-sky-300 font-mono">
              Điểm hiện tại: {score}
            </span>
          </div>

          {/* Answer Clouds Grid - 1 Col on Mobile for Huge Touch Targets, 2 Col on Tablet+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = selectedOptId === opt.id;
              const isCorrect =
                opt.id === currentQ.correctAnswerId ||
                opt.isCorrect ||
                false;
              const isShaking = shakeOptId === opt.id;

              const theme = cloudThemes[optIdx % cloudThemes.length];

              let cloudStyle = `${theme.bg} ${theme.border} ${theme.glow}`;
              let badgeStyle = theme.badge;

              if (isAnswered) {
                if (isCorrect) {
                  // Glowing Radiant Emerald Cloud on Correct
                  cloudStyle = 'bg-gradient-to-b from-emerald-700/95 via-emerald-800/95 to-slate-950 border-emerald-300 cloud-card-correct';
                  badgeStyle = 'bg-emerald-400 text-slate-950 border-white font-black shadow-[0_0_16px_rgba(52,211,153,0.8)]';
                } else if (isSelected && !isCorrect) {
                  // Glowing Rose Cloud with Shake on Wrong
                  cloudStyle = 'bg-gradient-to-b from-rose-800/90 via-rose-900/95 to-slate-950 border-rose-400 cloud-card-wrong opacity-90';
                  badgeStyle = 'bg-rose-500 text-white border-rose-300 font-black shadow-[0_0_16px_rgba(244,63,94,0.8)]';
                } else {
                  // Muted cloud
                  cloudStyle = 'bg-slate-950/40 border-slate-800/60 opacity-40';
                  badgeStyle = 'bg-slate-800 text-slate-500 border-slate-700';
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={(e) => handleSelectOption(opt.id, e)}
                  disabled={isAnswered}
                  className={`relative w-full min-h-[4rem] sm:min-h-[4.75rem] p-4 sm:p-5 rounded-[2rem] border-2 text-left flex items-center justify-between gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${cloudStyle} ${
                    isShaking ? 'animate-shake' : ''
                  } ${!isAnswered ? (optIdx % 2 === 0 ? 'animate-cloud-bob' : 'animate-cloud-bob-delayed') : ''}`}
                >
                  {/* Cloud Bubble Touch Target */}
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                    {/* Letter Badge (A, B, C, D) with Cloud Style */}
                    <span
                      className={`touch-target-badge rounded-2xl flex items-center justify-center shrink-0 border-2 font-black transition-transform duration-200 ${badgeStyle}`}
                    >
                      {opt.label || String.fromCharCode(65 + optIdx)}
                    </span>

                    {/* Option Text */}
                    <span className="font-fluid-option font-bold text-white leading-snug break-words flex-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                      {opt.text}
                    </span>
                  </div>

                  {/* Feedback Status Icons */}
                  {isAnswered && isCorrect && (
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border-2 border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.8)]">
                      <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                    </div>
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/20 border-2 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.8)]">
                      <XCircle className="w-6 h-6 text-rose-300" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* EXPLANATION ACCORDION (If Answered) */}
        {isAnswered && currentQ.explanation && (
          <div className="p-4 sm:p-5 rounded-2xl bg-sky-950/90 border border-sky-500/40 text-xs sm:text-sm text-sky-100 shadow-lg animate-fadeIn">
            <span className="font-bold text-sky-300 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-400" />
              Giải thích chi tiết (Explanation):
            </span>
            <p className="leading-relaxed">{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {/* FOOTER: Next Cloud Navigation Button */}
      <div className="max-w-4xl w-full mx-auto relative z-10 pt-2 flex items-center justify-between gap-3">
        <div className="text-xs text-sky-300/80 font-semibold flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span>EduSpace25 Sky Engine</span>
        </div>

        {isAnswered && (
          <button
            type="button"
            onClick={handleNextQuestion}
            autoFocus
            className="px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 shadow-[0_6px_0_rgba(14,116,144,0.8),0_0_25px_rgba(56,189,248,0.5)] active:translate-y-1 active:shadow-[0_2px_0_rgba(14,116,144,0.8)] flex items-center gap-2.5 transition-all cursor-pointer animate-neon-pulse"
          >
            <span>{currentIdx + 1 < totalQ ? 'Bay Đến Câu Tiếp Theo' : 'Hoàn Thành Bài Thi'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
