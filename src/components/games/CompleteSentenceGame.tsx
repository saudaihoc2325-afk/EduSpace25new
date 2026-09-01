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
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
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
  const [soundOn, setSoundOn] = useState(settings.soundEffects !== false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
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
        <div className="text-base sm:text-lg font-bold text-white leading-relaxed flex flex-wrap items-center gap-2">
          <span>{text}</span>
          <span
            className={`inline-block px-3 py-1 rounded-xl text-sm font-bold border ${
              selectedOpt
                ? isAnswered
                  ? selectedOpt.id === correctOpt?.id
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950 border-rose-500 text-rose-300'
                  : 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-slate-950 border-dashed border-slate-700 text-slate-500'
            }`}
          >
            {selectedOpt ? selectedOpt.text : '[ ? ]'}
          </span>
        </div>
      );
    }

    const parts = text.split(blankRegex);
    return (
      <div className="text-base sm:text-lg font-bold text-white leading-relaxed flex flex-wrap items-baseline gap-1.5">
        {parts.map((part, i) => {
          if (part.match(blankRegex)) {
            return (
              <span
                key={i}
                className={`inline-block px-3.5 py-0.5 rounded-xl text-sm font-black border transition-all duration-200 ${
                  selectedOpt
                    ? isAnswered
                      ? selectedOpt.id === correctOpt?.id
                        ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                        : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/20'
                      : 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-950 border-dashed border-cyan-500/50 text-cyan-400 px-4'
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

  const handleSelectOption = (optId: string) => {
    if (isAnswered || !currentQ) return;
    setSelectedOptId(optId);
    setIsAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(
      currentQ,
      optId,
      currentQ.points || 10
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
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
            📝
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Sentence {currentIdx + 1} of {totalQ}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-cyan-600/20 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 font-mono">
            {score} pts
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Main Sentence Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-xl">
            ✍️ Sentence Completion
          </span>
          <span className="text-xs font-mono text-slate-400">+{currentQ?.points || 10} pts</span>
        </div>

        {/* Sentence Container with Live Target Blank Preview */}
        <div className="p-6 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-inner">
          {renderSentenceWithBlank}
        </div>

        {/* Options to complete */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-400">Choose the best word/phrase:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ?.options.map((opt) => {
              const isSelected = selectedOptId === opt.id;
              const isCorrect =
                opt.id === currentQ.correctAnswerId ||
                (currentQ.correctAnswer && opt.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase());

              let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-850';

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
                    <span className="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center bg-slate-800 text-cyan-300 shrink-0">
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
        </div>

        {/* Feedback & Next */}
        {isAnswered && (
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between animate-in fade-in duration-200">
            {currentQ?.explanation && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 max-w-md">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{currentQ.explanation}</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="ml-auto px-6 py-2.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all"
            >
              <span>{currentIdx < totalQ - 1 ? 'Next Sentence' : 'View Results'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
