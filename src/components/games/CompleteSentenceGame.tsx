import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
import { resolveOption3DStyle } from '../../utils/optionColorPalette';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface CompleteSentenceGameProps {
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

export const CompleteSentenceGame: React.FC<CompleteSentenceGameProps> = ({
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

  // Sound sync
  useEffect(() => {
    soundEffects.setMuted(!soundOn);
  }, [soundOn]);

  // Session timer
  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => setTimeSpentSeconds((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const currentQ = rawQuestions[currentIdx];
  const totalQ = rawQuestions.length;

  // Selected Option Text
  const selectedOpt = currentQ?.options.find((o) => o.id === selectedOptId);
  const correctOpt = currentQ?.options.find(
    (o) =>
      o.id === currentQ.correctAnswerId ||
      (currentQ.correctAnswer && o.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase())
  );

  // Format Sentence with highlighted or replaced blank
  const renderSentenceWithBlank = useMemo(() => {
    if (!currentQ) return null;
    const text = currentQ.question;
    const blankRegex = /(_+|\.{3,}|\[\s*\])/g;

    const hasBlankInText = blankRegex.test(text);

    if (!hasBlankInText) {
      // If no explicit underscore in text, render standard sentence with slot at the end or before punctuation
      return (
        <div className="font-fluid-sentence font-extrabold text-white leading-relaxed flex flex-wrap items-center gap-2.5 font-display">
          <span>{text}</span>
          <span
            className={`inline-block px-4 sm:px-5 py-1.5 sm:py-2 rounded-2xl text-base sm:text-lg font-black border transition-all ${
              selectedOpt
                ? isAnswered
                  ? selectedOpt.id === correctOpt?.id
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-950 border-dashed border-cyan-500/50 text-cyan-400'
            }`}
          >
            {selectedOpt ? selectedOpt.text : '[ ? ]'}
          </span>
        </div>
      );
    }

    const parts = text.split(blankRegex);
    return (
      <div className="font-fluid-sentence font-extrabold text-white leading-relaxed flex flex-wrap items-baseline gap-2.5 font-display">
        {parts.map((part, i) => {
          if (part.match(blankRegex)) {
            return (
              <span
                key={i}
                className={`inline-block px-4 sm:px-5 py-1 sm:py-1.5 rounded-2xl text-base sm:text-lg font-black border transition-all duration-200 ${
                  selectedOpt
                    ? isAnswered
                      ? selectedOpt.id === correctOpt?.id
                        ? 'bg-emerald-950/95 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-rose-950/95 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                      : 'bg-cyan-950/95 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-950 border-dashed border-cyan-500/50 text-cyan-400 px-5'
                }`}
              >
                {selectedOpt ? selectedOpt.text : '_______'}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  }, [currentQ, selectedOpt, isAnswered, correctOpt]);

  const handleSelectOption = (optId: string, e?: React.MouseEvent) => {
    if (isAnswered || !currentQ) return;
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

      const clickX = e?.clientX || window.innerWidth / 2;
      const clickY = e?.clientY || window.innerHeight * 0.45;
      fireworks.burst({ x: clickX, y: clickY, count: 60 });

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
      timeSpentSeconds: 0,
    };
    setAnswers((prev) => [...prev, rec]);
  };

  const handleNext = () => {
    soundEffects.playClick();
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptId(null);
      setIsAnswered(false);
    } else {
      soundEffects.playVictory();
      fireworks.grandFinale();
      setIsFinished(true);
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
          gameTypeLabel="Complete the Sentence"
          score={score}
          totalQuestions={totalQ}
          correctCount={correctCount}
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
          questions={rawQuestions}
          answers={answers}
        />
      </>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* 3D Neon Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/95 border border-cyan-500/30 rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/40">
            📝
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs font-display">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-cyan-300 font-mono font-bold">
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border border-cyan-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-cyan-300 font-mono shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            {score} pts
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850 transition-all cursor-pointer"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Main Sentence Card - 3D Neon Stage */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] space-y-6 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 opacity-80" />

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider bg-cyan-950/80 border border-cyan-500/40 px-3.5 py-1.5 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            ✍️ Điền từ vào chỗ trống
          </span>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
            +{currentQ?.points || 10} pts
          </span>
        </div>

        {/* Sentence Container with Live Target Blank Preview */}
        <div className="p-6 bg-slate-950/90 border border-slate-800/80 rounded-2xl shadow-inner">
          {renderSentenceWithBlank}
        </div>

        {/* Options to complete with 3D Neon styling */}
        <div className="space-y-3">
          <span className="text-xs sm:text-sm font-extrabold text-slate-300">Chọn phương án thích hợp nhất:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {currentQ?.options.map((opt, optIdx) => {
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
                  className={`min-h-[3.75rem] sm:min-h-[4.25rem] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.99] ${cardClasses}`}
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                    <span className={`touch-target-badge rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border font-black ${badgeClasses}`}>
                      {opt.label || String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="font-fluid-option font-bold text-slate-100 break-words flex-1 leading-snug">{opt.text}</span>
                  </div>
                  {isAnswered && isCorrect && (
                    <div className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                      <CheckCircle2 className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-emerald-300" />
                    </div>
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <div className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/20 border border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                      <XCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-rose-300" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback & Next */}
        {isAnswered && (
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {currentQ?.explanation && (
              <p className="text-xs text-slate-300 flex items-start gap-2 max-w-md bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{currentQ.explanation}</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="ml-auto px-7 py-2.5 text-xs font-black text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl shadow-[0_4px_0_rgba(8,145,178,0.8),0_0_20px_rgba(6,182,212,0.4)] active:translate-y-1 active:shadow-[0_1px_0_rgba(8,145,178,0.8)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>{currentIdx < totalQ - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
