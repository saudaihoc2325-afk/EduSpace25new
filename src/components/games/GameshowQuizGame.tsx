import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  Flame,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
import { resolveOption3DStyle } from '../../utils/optionColorPalette';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface GameshowQuizGameProps {
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

const QUESTION_TIMER_SECONDS = 20;

export const GameshowQuizGame: React.FC<GameshowQuizGameProps> = ({
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
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Gameshow specific lifelines
  const [has5050Used, setHas5050Used] = useState(false);
  const [hasTimeBoostUsed, setHasTimeBoostUsed] = useState(false);
  const [hiddenOptionIds, setHiddenOptionIds] = useState<string[]>([]);

  // Per-question countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState(QUESTION_TIMER_SECONDS);

  // Sound sync
  useEffect(() => {
    soundEffects.setMuted(!soundOn);
  }, [soundOn]);

  const currentQ = rawQuestions[currentIdx];
  const totalQ = rawQuestions.length;

  // Question countdown tick
  useEffect(() => {
    if (isAnswered || isFinished || !currentQ) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
      setTotalTimeSeconds((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered, isFinished, currentIdx, currentQ]);

  const handleTimeOut = () => {
    if (isAnswered || !currentQ) return;
    setIsAnswered(true);
    setStreakCount(0);
    soundEffects.playIncorrect();

    const rec: StudentAnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedAnswer: 'Hết giờ (Time Expired)',
      selectedAnswerId: 'TIMEOUT',
      correctAnswer: currentQ.correctAnswerText || currentQ.correctAnswer || '',
      correctAnswerId: currentQ.correctAnswerId || '',
      isCorrect: false,
      timeSpentSeconds: QUESTION_TIMER_SECONDS,
    };
    setAnswers((prev) => [...prev, rec]);
  };

  const handleSelectOption = (optId: string, e?: React.MouseEvent) => {
    if (isAnswered || !currentQ) return;
    setSelectedOptId(optId);
    setIsAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(
      currentQ,
      optId,
      100, // Base 100 pts for Gameshow
      secondsRemaining,
      QUESTION_TIMER_SECONDS,
      true // Time bonus enabled
    );

    if (evalResult.isCorrect) {
      const nextStreak = streakCount + 1;
      setStreakCount(nextStreak);
      if (nextStreak >= 2) {
        soundEffects.playStreak(nextStreak);
      } else {
        soundEffects.playCorrect();
      }

      // 3D Fireworks burst on correct gameshow answer!
      const clickX = e?.clientX || window.innerWidth / 2;
      const clickY = e?.clientY || window.innerHeight * 0.45;
      fireworks.burst({
        x: clickX,
        y: clickY,
        count: nextStreak >= 3 ? 80 : 55,
      });

      setScore((s) => s + evalResult.scoreGained);
      setCorrectCount((c) => c + 1);
    } else {
      setStreakCount(0);
      soundEffects.playIncorrect();
    }

    const rec: StudentAnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedAnswer: evalResult.selectedAnswerText || optId,
      selectedAnswerId: optId,
      correctAnswer: evalResult.correctAnswerText || currentQ.correctAnswer || '',
      correctAnswerId: evalResult.correctAnswerId,
      isCorrect: evalResult.isCorrect,
      timeSpentSeconds: QUESTION_TIMER_SECONDS - secondsRemaining,
    };
    setAnswers((prev) => [...prev, rec]);
  };

  const handleUse5050 = () => {
    if (has5050Used || isAnswered || !currentQ) return;
    soundEffects.playClick();
    setHas5050Used(true);

    const correctId = currentQ.correctAnswerId;
    const incorrectOpts = currentQ.options.filter((o) => o.id !== correctId);
    // Hide 2 incorrect options
    const toHide = incorrectOpts.slice(0, 2).map((o) => o.id);
    setHiddenOptionIds(toHide);
  };

  const handleUseTimeBoost = () => {
    if (hasTimeBoostUsed || isAnswered) return;
    soundEffects.playClick();
    setHasTimeBoostUsed(true);
    setSecondsRemaining((prev) => prev + 15);
  };

  const handleNext = () => {
    soundEffects.playClick();
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptId(null);
      setIsAnswered(false);
      setHiddenOptionIds([]);
      setSecondsRemaining(QUESTION_TIMER_SECONDS);
    } else {
      soundEffects.playVictory();
      fireworks.grandFinale();
      setIsFinished(true);
      if (onFinish) {
        onFinish({
          score,
          totalQuestions: totalQ,
          correctCount,
          timeSpentSeconds: totalTimeSeconds,
          answers,
        });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOptId(null);
    setIsAnswered(false);
    setHiddenOptionIds([]);
    setSecondsRemaining(QUESTION_TIMER_SECONDS);
    setHas5050Used(false);
    setHasTimeBoostUsed(false);
    setScore(0);
    setCorrectCount(0);
    setStreakCount(0);
    setTotalTimeSeconds(0);
    setAnswers([]);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <>
        <GameCompletionScreen
          title={title}
          gameTypeLabel="Gameshow Quiz"
          score={score}
          totalQuestions={totalQ}
          correctCount={correctCount}
          timeSpentSeconds={totalTimeSeconds}
          answers={answers}
          onPlayAgain={handleRestart}
          onReviewAnswers={() => setIsReviewOpen(true)}
          onExit={onExit}
          isPreview={isPreview}
        />
        <GameReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          questions={rawQuestions}
          answers={answers}
        />
      </>
    );
  }

  // Timer bar percentage
  const timerPercent = (secondsRemaining / QUESTION_TIMER_SECONDS) * 100;
  let timerBarColor = 'from-emerald-500 to-teal-400';
  if (secondsRemaining <= 5) timerBarColor = 'from-rose-600 to-pink-500 animate-pulse';
  else if (secondsRemaining <= 10) timerBarColor = 'from-amber-500 to-orange-400';

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Gameshow Stage Header - 3D Neon Gold/Crimson Studio */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-rose-500/30 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center font-black shadow-[0_0_20px_rgba(244,63,94,0.5)] border border-rose-300/40">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white font-display tracking-wide">{title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-rose-300 font-bold uppercase tracking-wider">
                Câu {currentIdx + 1} / {totalQ}
              </span>
              {streakCount >= 2 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-bounce">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {streakCount} Combo!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Studio Score Ticker */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Điểm Gameshow</span>
            <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-pink-300 font-mono tracking-tight drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]">
              {score} <span className="text-xs text-rose-400">PTS</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-rose-500/40 hover:bg-slate-850 transition-all cursor-pointer"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* 3D Lifelines Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs shadow-inner">
        <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-indigo-400" /> Quyền trợ giúp (Lifelines):
        </span>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleUse5050}
            disabled={has5050Used || isAnswered}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              has5050Used
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-indigo-950 to-blue-950 border-indigo-500/50 text-indigo-300 hover:text-white hover:border-indigo-400 shadow-[0_2px_0_rgba(67,56,202,0.8),0_0_12px_rgba(99,102,241,0.3)] active:translate-y-0.5'
            }`}
          >
            50:50 {has5050Used ? '(Đã dùng)' : ''}
          </button>

          <button
            type="button"
            onClick={handleUseTimeBoost}
            disabled={hasTimeBoostUsed || isAnswered}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              hasTimeBoostUsed
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-amber-950 to-orange-950 border-amber-500/50 text-amber-300 hover:text-white hover:border-amber-400 shadow-[0_2px_0_rgba(180,83,9,0.8),0_0_12px_rgba(245,158,11,0.3)] active:translate-y-0.5'
            }`}
          >
            +15s Boost {hasTimeBoostUsed ? '(Đã dùng)' : ''}
          </button>
        </div>
      </div>

      {/* Per-Question Intensity Timer Bar with 3D Depth */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono px-1">
          <span className="text-slate-300 flex items-center gap-1 font-semibold">
            <Clock className="w-3.5 h-3.5 text-rose-400" /> Thời gian còn lại:
          </span>
          <span className={`font-black text-sm ${secondsRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
            {secondsRemaining}s
          </span>
        </div>
        <div className="w-full bg-slate-950/80 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${timerBarColor} shadow-[0_0_15px_rgba(244,63,94,0.6)]`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Stage Card - 3D Gameshow Box */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] space-y-6 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500 opacity-80" />

        {currentQ?.passage && (
          <div className="p-4 bg-slate-950/90 border border-slate-800/80 rounded-2xl text-xs text-slate-300 italic shadow-inner">
            <span className="font-bold text-rose-400 not-italic block mb-1">Đoạn văn đọc hiểu (Passage): </span>
            {currentQ.passage}
          </div>
        )}

        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white text-center leading-relaxed py-2 font-display">
          {currentQ?.question}
        </h2>

        {/* Dynamic 3D Neon Options Grid (A, B, C, D, E, F...) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {currentQ?.options.map((opt, optIdx) => {
            const isHidden = hiddenOptionIds.includes(opt.id);
            if (isHidden) {
              return (
                <div
                  key={opt.id}
                  className="p-4 rounded-2xl border border-slate-850 bg-slate-950/20 opacity-10 pointer-events-none"
                />
              );
            }

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
                className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${cardClasses}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl text-xs flex items-center justify-center shrink-0 border ${badgeClasses}`}>
                    {opt.label || String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-100 break-words">{opt.text}</span>
                </div>
                {isAnswered && isCorrect && (
                  <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-300" />
                  </div>
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                    <XCircle className="w-4.5 h-4.5 text-rose-300" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Stage Next */}
        {isAnswered && (
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {currentQ?.explanation && (
              <p className="text-xs text-slate-300 flex items-start gap-2 max-w-md bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{currentQ.explanation}</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="ml-auto px-7 py-2.5 text-xs font-black text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 rounded-2xl shadow-[0_4px_0_rgba(159,18,57,0.8),0_0_20px_rgba(244,63,94,0.4)] hover:shadow-[0_4px_0_rgba(159,18,57,0.8),0_0_30px_rgba(244,63,94,0.6)] active:translate-y-1 active:shadow-[0_1px_0_rgba(159,18,57,0.8)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>{currentIdx < totalQ - 1 ? 'Câu tiếp theo' : 'Xem kết quả chung cuộc'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
