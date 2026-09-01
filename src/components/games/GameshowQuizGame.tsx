import React, { useState, useEffect, useMemo } from 'react';
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
  HelpCircle,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
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
  const [soundOn, setSoundOn] = useState(settings.soundEffects !== false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
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
    soundEffects.playIncorrect();

    const rec: StudentAnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedAnswer: 'Time Expired',
      selectedAnswerId: 'TIMEOUT',
      correctAnswer: currentQ.correctAnswerText || currentQ.correctAnswer || '',
      correctAnswerId: currentQ.correctAnswerId || '',
      isCorrect: false,
      timeSpentSeconds: QUESTION_TIMER_SECONDS,
    };
    setAnswers((prev) => [...prev, rec]);
  };

  const handleSelectOption = (optId: string) => {
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
      soundEffects.playCorrect();
      setScore((s) => s + evalResult.scoreGained);
      setCorrectCount((c) => c + 1);
    } else {
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
    // Shuffle and pick 2 incorrect options to hide
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
  let timerBarColor = 'bg-emerald-500';
  if (secondsRemaining <= 5) timerBarColor = 'bg-rose-500 animate-pulse';
  else if (secondsRemaining <= 10) timerBarColor = 'bg-amber-500';

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Gameshow Stage Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold border border-rose-500/30">
            <Trophy className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white">{title}</h3>
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
              Question {currentIdx + 1} of {totalQ}
            </span>
          </div>
        </div>

        {/* Dynamic Studio Score Ticker */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Stage Score</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight">
              {score} <span className="text-xs text-rose-300">PTS</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Lifelines Bar */}
      <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-2 text-xs">
        <span className="font-bold text-slate-400 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-indigo-400" /> Lifelines:
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUse5050}
            disabled={has5050Used || isAnswered}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
              has5050Used
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/80 shadow-sm'
            }`}
          >
            50:50 {has5050Used ? '(Used)' : ''}
          </button>

          <button
            type="button"
            onClick={handleUseTimeBoost}
            disabled={hasTimeBoostUsed || isAnswered}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
              hasTimeBoostUsed
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/80 shadow-sm'
            }`}
          >
            +15s Boost {hasTimeBoostUsed ? '(Used)' : ''}
          </button>
        </div>
      </div>

      {/* Per-Question Intensity Timer Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-mono px-1">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-rose-400" /> Time Remaining:
          </span>
          <span className={`font-bold ${secondsRemaining <= 5 ? 'text-rose-400' : 'text-slate-200'}`}>
            {secondsRemaining}s
          </span>
        </div>
        <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-300 ${timerBarColor}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Stage Card */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {currentQ?.passage && (
          <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl text-xs text-slate-300 italic">
            <span className="font-semibold text-rose-400 not-italic">Passage: </span>
            {currentQ.passage}
          </div>
        )}

        <h2 className="text-lg sm:text-xl font-black text-white text-center leading-relaxed py-2">
          {currentQ?.question}
        </h2>

        {/* 2x2 or Vertical Grid for Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {currentQ?.options.map((opt) => {
            const isHidden = hiddenOptionIds.includes(opt.id);
            if (isHidden) {
              return (
                <div
                  key={opt.id}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-950/20 opacity-10 pointer-events-none"
                />
              );
            }

            const isSelected = selectedOptId === opt.id;
            const isCorrect =
              opt.id === currentQ.correctAnswerId ||
              (currentQ.correctAnswer && opt.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase());

            let btnStyle =
              'bg-slate-950 border-slate-800 text-slate-200 hover:border-rose-500/60 hover:bg-slate-850 hover:shadow-lg';

            if (isAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/80 border-emerald-500 text-white font-bold ring-2 ring-emerald-500/40';
              } else if (isSelected && !isCorrect) {
                btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold ring-2 ring-rose-500/40';
              } else {
                btnStyle = 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-50';
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                disabled={isAnswered}
                className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all duration-150 ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center bg-slate-800 text-rose-300 shrink-0">
                    {opt.label || '•'}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold">{opt.text}</span>
                </div>
                {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Feedback & Stage Next */}
        {isAnswered && (
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between animate-in fade-in duration-200">
            {currentQ?.explanation && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 max-w-md">
                <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{currentQ.explanation}</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="ml-auto px-6 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-2xl shadow-lg shadow-rose-600/40 flex items-center gap-2 transition-all"
            >
              <span>{currentIdx < totalQ - 1 ? 'Next Question' : 'Final Results'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
