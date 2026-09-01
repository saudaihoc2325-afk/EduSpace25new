import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
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
  Zap,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
import { resolveOption3DStyle, getOptionTheme } from '../../utils/optionColorPalette';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface QuizGameProps {
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

export const QuizGame: React.FC<QuizGameProps> = ({
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

  // Sound effect sync
  useEffect(() => {
    soundEffects.setMuted(!soundOn);
  }, [soundOn]);

  // Prepare session-specific questions and shuffled options without modifying the original Question Set!
  const sessionQuestions = useMemo(() => {
    let qList = [...rawQuestions];
    if (settings.shuffleQuestions) {
      qList = [...qList].sort(() => Math.random() - 0.5);
    }
    return qList.map((q) => {
      let opts = [...(q.options || [])];
      if (settings.shuffleAnswers) {
        opts = [...opts].sort(() => Math.random() - 0.5);
        // Re-assign display labels A, B, C, D while keeping opt.id and isCorrect stable!
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

  // Session timer
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
      <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl">
        <p>No questions available for this Quiz.</p>
        {onExit && (
          <button
            onClick={onExit}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Exit
          </button>
        )}
      </div>
    );
  }

  const handleSelectOption = (optId: string, e?: React.MouseEvent) => {
    if (isAnswered) return;
    setSelectedOptId(optId);
    setIsAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(
      currentQ,
      optId,
      currentQ.points || 10
    );

    if (evalResult.isCorrect) {
      const nextStreak = streakCount + 1;
      setStreakCount(nextStreak);
      if (nextStreak >= 2) {
        soundEffects.playStreak(nextStreak);
      } else {
        soundEffects.playCorrect();
      }

      // Trigger 3D fireworks burst from click position or screen center!
      const clickX = e?.clientX || window.innerWidth / 2;
      const clickY = e?.clientY || window.innerHeight * 0.45;
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
    }

    const answerRec: StudentAnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedAnswer: evalResult.selectedAnswerText || optId,
      selectedAnswerId: optId,
      correctAnswer: evalResult.correctAnswerText || currentQ.correctAnswer || '',
      correctAnswerId: evalResult.correctAnswerId,
      isCorrect: evalResult.isCorrect,
      timeSpentSeconds: 0,
    };

    setAnswers((prev) => [...prev, answerRec]);
  };

  const handleNext = () => {
    soundEffects.playClick();
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptId(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      fireworks.grandFinale();
      if (onFinish) {
        onFinish({
          score,
          totalQuestions: totalQ,
          correctCount,
          timeSpentSeconds,
          answers,
        });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOptId(null);
    setIsAnswered(false);
    setScore(0);
    setCorrectCount(0);
    setStreakCount(0);
    setTimeSpentSeconds(0);
    setAnswers([]);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <>
        <GameCompletionScreen
          title={title}
          gameTypeLabel="Quiz"
          score={score}
          totalQuestions={totalQ}
          correctCount={correctCount}
          timeSpentSeconds={timeSpentSeconds}
          answers={answers}
          onPlayAgain={handleRestart}
          onReviewAnswers={() => setIsReviewOpen(false)}
          onExit={onExit}
          isPreview={isPreview}
        />
        <GameReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          questions={sessionQuestions}
          answers={answers}
        />
      </>
    );
  }

  // Check correct option
  const correctOpt = currentQ.options.find(
    (o) =>
      o.id === currentQ.correctAnswerId ||
      (currentQ.correctAnswer && o.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header Bar - 3D Neon Glass */}
      <div className="flex items-center justify-between bg-slate-900/95 border border-indigo-500/30 rounded-2xl px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-300/40">
            🎯
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs font-display tracking-wide">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-indigo-300 font-mono font-semibold">
                Question {currentIdx + 1} / {totalQ}
              </span>
              {streakCount >= 2 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-bounce">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {streakCount} Streak!
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          {/* Score Badge */}
          {settings.showScore !== false && (
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-indigo-300 font-mono shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              {score} pts
            </div>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950/90 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800 transition-all active:scale-95"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Progress Bar with 3D Neon Glow */}
      {settings.showProgress !== false && (
        <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
            style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
          />
        </div>
      )}

      {/* Main Question Card - 3D Modern Box */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-indigo-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] relative overflow-hidden space-y-6 backdrop-blur-xl">
        {/* Top subtle neon highlight line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

        {/* Unit / Level tag */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentQ.unit && (
            <span className="text-[10px] font-bold px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 shadow-inner">
              {currentQ.unit}
            </span>
          )}
          {currentQ.level && (
            <span className="text-[10px] font-bold px-3 py-1 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              Level: {currentQ.level}
            </span>
          )}
          {currentQ.points && (
            <span className="text-[10px] font-extrabold px-3 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 ml-auto font-mono shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              +{currentQ.points} pts
            </span>
          )}
        </div>

        {/* Reading Passage if present */}
        {currentQ.passage && (
          <div className="p-4 bg-slate-950/90 border border-slate-800/80 rounded-2xl text-xs text-slate-300 leading-relaxed italic shadow-inner">
            <span className="font-bold text-indigo-400 not-italic block mb-1">
              📖 Reading Passage:
            </span>
            {currentQ.passage}
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-relaxed font-display">
          {currentQ.question}
        </h2>

        {/* Dynamic 3D Neon Multiple Choice Options (A, B, C, D, E, F...) */}
        <div className="grid grid-cols-1 gap-3.5">
          {currentQ.options.map((opt, optIdx) => {
            const isSelected = selectedOptId === opt.id;
            const isCorrect =
              opt.id === currentQ.correctAnswerId ||
              (currentQ.correctAnswer && opt.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase());

            const { cardClasses, badgeClasses } = resolveOption3DStyle({
              index: optIdx,
              label: opt.label,
              isAnswered,
              isSelected,
              isCorrect: Boolean(isCorrect),
            });

            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => handleSelectOption(opt.id, e)}
                disabled={isAnswered}
                className={`w-full p-4 sm:p-4.5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all duration-200 cursor-pointer ${cardClasses}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-xl text-xs flex items-center justify-center shrink-0 transition-transform duration-200 border ${badgeClasses}`}
                  >
                    {opt.label || String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="text-sm font-semibold text-slate-100 break-words">
                    {opt.text}
                  </span>
                </div>

                {isAnswered && isCorrect && (
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.6)]">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  </div>
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                    <XCircle className="w-5 h-5 text-rose-300" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Explanation Box */}
        {isAnswered && (
          <div className="pt-4 border-t border-slate-800/80 animate-in fade-in slide-in-from-bottom-3 duration-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedOptId === correctOpt?.id ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300 bg-emerald-950/80 px-3.5 py-1.5 rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Chính xác!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-300 bg-rose-950/80 px-3.5 py-1.5 rounded-xl border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                    <XCircle className="w-4 h-4 text-rose-400" /> Chưa chính xác!
                  </span>
                )}

                {settings.showCorrectAnswer !== false && (
                  <span className="text-xs text-slate-300 ml-1">
                    Đáp án đúng: <strong className="text-emerald-400 font-bold">{correctOpt?.label}. {correctOpt?.text}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-[0_4px_0_rgba(67,56,202,0.8),0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_0_rgba(67,56,202,0.8),0_0_30px_rgba(99,102,241,0.6)] active:translate-y-1 active:shadow-[0_1px_0_rgba(67,56,202,0.8)] flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{currentIdx < totalQ - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation */}
            {settings.showExplanation !== false && (
              <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl text-xs text-slate-300 flex items-start gap-3 shadow-inner">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-300 font-bold">Giải thích: </strong>
                  <span>{currentQ.explanation ? currentQ.explanation : 'Không có giải thích chi tiết.'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
