import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  Trash2,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface AnagramGameProps {
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

interface TileItem {
  id: string; // unique tile id
  char: string;
  isUsed: boolean;
}

export const AnagramGame: React.FC<AnagramGameProps> = ({
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
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);

  // Current anagram question state
  const currentQ = rawQuestions[currentIdx];
  const targetWord = useMemo(() => {
    if (!currentQ) return '';
    const raw =
      currentQ.correctAnswerText ||
      currentQ.options.find((o) => o.id === currentQ.correctAnswerId)?.text ||
      currentQ.correctAnswer ||
      'ENGLISH';
    return raw.trim().toUpperCase();
  }, [currentQ]);

  // Letter tiles pool and placed slots
  const [poolTiles, setPoolTiles] = useState<TileItem[]>([]);
  const [placedTiles, setPlacedTiles] = useState<TileItem[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isWordCorrect, setIsWordCorrect] = useState(false);

  // Sound sync
  useEffect(() => {
    soundEffects.setMuted(!soundOn);
  }, [soundOn]);

  // Initialize letter tiles when question changes
  useEffect(() => {
    if (!targetWord) return;

    const chars = targetWord.split('');
    // Scramble letters
    const scrambledChars = [...chars].sort(() => Math.random() - 0.5);

    const initialTiles: TileItem[] = scrambledChars.map((char, i) => ({
      id: `tile_${char}_${i}_${Math.random()}`,
      char,
      isUsed: false,
    }));

    setPoolTiles(initialTiles);
    setPlacedTiles([]);
    setIsAnswerChecked(false);
    setIsWordCorrect(false);
  }, [targetWord, currentIdx]);

  // Timer
  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => setTimeSpentSeconds((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const handleTileClickInPool = (tile: TileItem) => {
    if (isAnswerChecked) return;
    soundEffects.playClick();

    // Mark as used in pool
    setPoolTiles((prev) =>
      prev.map((t) => (t.id === tile.id ? { ...t, isUsed: true } : t))
    );
    // Add to placed
    setPlacedTiles((prev) => [...prev, tile]);
  };

  const handleTileClickInPlaced = (tile: TileItem, index: number) => {
    if (isAnswerChecked) return;
    soundEffects.playClick();

    // Remove from placed
    setPlacedTiles((prev) => prev.filter((_, idx) => idx !== index));
    // Restore in pool
    setPoolTiles((prev) =>
      prev.map((t) => (t.id === tile.id ? { ...t, isUsed: false } : t))
    );
  };

  const handleReset = () => {
    soundEffects.playClick();
    setPoolTiles((prev) => prev.map((t) => ({ ...t, isUsed: false })));
    setPlacedTiles([]);
    setIsAnswerChecked(false);
  };

  const handleHint = () => {
    if (isAnswerChecked || !targetWord) return;
    soundEffects.playClick();

    // Find the first index where placed does not match targetWord
    const targetChars = targetWord.split('');
    const nextTargetChar = targetChars[placedTiles.length];

    if (!nextTargetChar) return;

    // Find an unused tile with this char
    const unusedTile = poolTiles.find((t) => !t.isUsed && t.char === nextTargetChar);
    if (unusedTile) {
      handleTileClickInPool(unusedTile);
    }
  };

  const handleCheckAnswer = () => {
    if (isAnswerChecked || !currentQ) return;

    const userWord = placedTiles.map((t) => t.char).join('');
    const evalResult = gameScoringService.evaluateAnagram(
      currentQ,
      userWord,
      currentQ.points || 10
    );

    setIsAnswerChecked(true);
    setIsWordCorrect(evalResult.isCorrect);

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
      selectedAnswer: userWord,
      selectedAnswerId: userWord,
      correctAnswer: targetWord,
      correctAnswerId: currentQ.correctAnswerId || '',
      isCorrect: evalResult.isCorrect,
      timeSpentSeconds: 0,
    };
    setAnswers((prev) => [...prev, rec]);
  };

  const handleNext = () => {
    soundEffects.playClick();
    if (currentIdx < rawQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      soundEffects.playVictory();
      setIsFinished(true);
      if (onFinish) {
        onFinish({
          score,
          totalQuestions: rawQuestions.length,
          correctCount,
          timeSpentSeconds,
          answers,
        });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
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
          gameTypeLabel="Anagram"
          score={score}
          totalQuestions={rawQuestions.length}
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
          <div className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold text-xs border border-pink-500/30">
            🧩
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Word {currentIdx + 1} of {rawQuestions.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-pink-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-pink-600/20 border border-pink-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-pink-300 font-mono">
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

      {/* Main Anagram Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider bg-pink-950/60 border border-pink-500/30 px-3 py-1 rounded-xl">
            🔤 Unscramble the Keyword
          </span>
          <span className="text-xs font-mono text-slate-400">+{currentQ.points || 10} pts</span>
        </div>

        {/* Prompt / Clue */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Clue / Definition:</span>
          <h2 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
            {currentQ.question}
          </h2>
        </div>

        {/* Target Word Placed Slots */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-400">Your Answer:</span>
          <div className="flex flex-wrap items-center justify-center gap-2 p-4 bg-slate-950/90 border border-slate-800 rounded-2xl min-h-[72px]">
            {targetWord.split('').map((_, i) => {
              const placedTile = placedTiles[i];
              let tileStyle = 'border-dashed border-slate-700 bg-slate-900/40 text-slate-600';

              if (placedTile) {
                tileStyle = 'border-pink-500/80 bg-pink-950/60 text-pink-200 font-black shadow-md';
                if (isAnswerChecked) {
                  tileStyle = isWordCorrect
                    ? 'border-emerald-500 bg-emerald-950/70 text-emerald-200 font-black'
                    : 'border-rose-500 bg-rose-950/70 text-rose-200 font-black';
                }
              }

              return (
                <button
                  key={`slot_${i}`}
                  type="button"
                  onClick={() => placedTile && handleTileClickInPlaced(placedTile, i)}
                  disabled={isAnswerChecked || !placedTile}
                  className={`w-11 h-12 sm:w-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center text-lg sm:text-xl transition-all duration-150 ${tileStyle}`}
                >
                  {placedTile ? placedTile.char : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Letter Pool Tiles */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-400">Available Letters:</span>
          <div className="flex flex-wrap items-center justify-center gap-2.5 p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl">
            {poolTiles.map((tile) => {
              if (tile.isUsed) {
                return (
                  <div
                    key={tile.id}
                    className="w-11 h-12 sm:w-12 sm:h-14 rounded-2xl border-2 border-slate-800 bg-slate-950/30 opacity-20 pointer-events-none"
                  />
                );
              }

              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileClickInPool(tile)}
                  disabled={isAnswerChecked}
                  className="w-11 h-12 sm:w-12 sm:h-14 rounded-2xl border-2 border-slate-700 bg-slate-800 hover:border-pink-400 hover:bg-slate-750 text-white font-black text-lg sm:text-xl shadow-lg active:scale-95 transition-all"
                >
                  {tile.char}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isAnswerChecked || placedTiles.length === 0}
              className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              type="button"
              onClick={handleHint}
              disabled={isAnswerChecked || placedTiles.length >= targetWord.length}
              className="px-3 py-2 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-950/70 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Hint</span>
            </button>
          </div>

          {!isAnswerChecked ? (
            <button
              type="button"
              onClick={handleCheckAnswer}
              disabled={placedTiles.length < targetWord.length}
              className="px-6 py-2.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 rounded-xl shadow-lg shadow-pink-600/30 flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Check Answer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 rounded-xl shadow-lg shadow-pink-600/30 flex items-center gap-1.5 transition-all"
            >
              <span>{currentIdx < rawQuestions.length - 1 ? 'Next Word' : 'View Results'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Feedback Display */}
        {isAnswerChecked && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              {isWordCorrect ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4" /> Excellent! Correct Word.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-950/80 px-3 py-1 rounded-xl border border-rose-500/40">
                  <XCircle className="w-4 h-4" /> Incorrect. Target Word: <strong className="text-emerald-400">{targetWord}</strong>
                </span>
              )}
            </div>

            {currentQ.explanation && (
              <p className="text-xs text-slate-400 flex items-start gap-1.5 pt-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{currentQ.explanation}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
