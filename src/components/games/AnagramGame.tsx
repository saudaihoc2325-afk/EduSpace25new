import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Lightbulb,
  Trash2,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
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
  id: string;
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
  const [soundOn, setSoundOn] = useState(!soundEffects.getMuted());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const currentQ = rawQuestions[currentIdx] || rawQuestions[0];

  // Target word extracted from question
  const targetWord = useMemo(() => {
    if (!currentQ) return '';
    const correctOpt = currentQ.options.find(
      (o) =>
        o.id === currentQ.correctAnswerId ||
        (currentQ.correctAnswer && o.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase())
    );
    const raw =
      currentQ.correctAnswerText ||
      correctOpt?.text ||
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
      const nextStreak = streakCount + 1;
      setStreakCount(nextStreak);
      if (nextStreak >= 2) {
        soundEffects.playStreak(nextStreak);
      } else {
        soundEffects.playCorrect();
      }

      fireworks.burst({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.45,
        count: 65,
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
      fireworks.grandFinale();
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
      {/* 3D Neon Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/95 border border-pink-500/30 rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-black shadow-[0_0_15px_rgba(236,72,153,0.4)] border border-pink-300/40">
            🧩
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs font-display">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-pink-300 font-mono font-bold">
                Từ {currentIdx + 1} / {rawQuestions.length}
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-pink-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-gradient-to-r from-pink-950 via-slate-900 to-rose-950 border border-pink-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-pink-300 font-mono shadow-[0_0_12px_rgba(236,72,153,0.3)]">
            {score} pts
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-pink-500/40 hover:bg-slate-850 transition-all cursor-pointer"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Main 3D Neon Anagram Card */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-pink-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] space-y-6 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 opacity-80" />

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-pink-300 uppercase tracking-wider bg-pink-950/80 border border-pink-500/40 px-3.5 py-1.5 rounded-xl shadow-[0_0_12px_rgba(236,72,153,0.3)]">
            🔤 Sắp xếp các chữ cái thành từ đúng
          </span>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
            +{currentQ.points || 10} pts
          </span>
        </div>

        {/* Prompt / Clue */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border border-slate-800/80 rounded-2xl shadow-inner">
          <span className="text-[11px] sm:text-xs font-bold uppercase text-pink-400 block mb-1">Gợi ý / Định nghĩa (Clue):</span>
          <h2 className="font-fluid-question font-extrabold text-white leading-snug font-display tracking-tight">
            {currentQ.question}
          </h2>
        </div>

        {/* Target Word Placed Slots with 3D Depth */}
        <div className="space-y-2">
          <span className="text-xs sm:text-sm font-extrabold text-slate-300">Từ bạn ghép được:</span>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 bg-slate-950/95 border border-slate-800/90 rounded-2xl min-h-[85px] shadow-inner">
            {targetWord.split('').map((_, i) => {
              const placedTile = placedTiles[i];
              let tileStyle =
                'border-dashed border-slate-700 bg-slate-900/40 text-slate-600 shadow-inner';

              if (placedTile) {
                tileStyle =
                  'border-pink-500/80 bg-gradient-to-b from-pink-900/80 to-rose-950 text-pink-100 font-black shadow-[0_4px_0_rgba(159,18,57,0.8),0_0_15px_rgba(236,72,153,0.4)]';
                if (isAnswerChecked) {
                  tileStyle = isWordCorrect
                    ? 'border-emerald-500 bg-gradient-to-b from-emerald-900/80 to-teal-950 text-emerald-100 font-black shadow-[0_4px_0_rgba(6,95,70,0.8),0_0_15px_rgba(16,185,129,0.5)]'
                    : 'border-rose-500 bg-gradient-to-b from-rose-900/80 to-pink-950 text-rose-100 font-black shadow-[0_4px_0_rgba(159,18,57,0.8),0_0_15px_rgba(244,63,94,0.5)]';
                }
              }

              return (
                <button
                  key={`slot_${i}`}
                  type="button"
                  onClick={() => placedTile && handleTileClickInPlaced(placedTile, i)}
                  disabled={isAnswerChecked || !placedTile}
                  className={`w-11 h-13 sm:w-14 sm:h-16 md:w-16 md:h-18 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-black transition-all duration-150 cursor-pointer active:scale-95 ${tileStyle}`}
                >
                  {placedTile ? placedTile.char : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Pushable Letter Pool Tiles */}
        <div className="space-y-2">
          <span className="text-xs sm:text-sm font-extrabold text-slate-300">Các chữ cái có sẵn (Chạm để ghép):</span>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 p-4 sm:p-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            {poolTiles.map((tile) => {
              if (tile.isUsed) {
                return (
                  <div
                    key={tile.id}
                    className="w-11 h-13 sm:w-14 sm:h-16 md:w-16 md:h-18 rounded-2xl border-2 border-slate-800/60 bg-slate-950/30 opacity-15 pointer-events-none"
                  />
                );
              }

              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileClickInPool(tile)}
                  disabled={isAnswerChecked}
                  className="w-11 h-13 sm:w-14 sm:h-16 md:w-16 md:h-18 rounded-2xl border-2 border-pink-500/50 bg-gradient-to-b from-slate-800 to-slate-900 hover:from-pink-950 hover:to-slate-900 hover:border-pink-400 text-white font-black text-xl sm:text-2xl md:text-3xl shadow-[0_4px_0_rgba(15,23,42,0.9),0_0_12px_rgba(236,72,153,0.3)] active:translate-y-1 active:shadow-[0_1px_0_rgba(15,23,42,0.9)] transition-all cursor-pointer"
                >
                  {tile.char}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Action Controls Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isAnswerChecked || placedTiles.length === 0}
              className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-xl border border-slate-700 shadow-[0_2px_0_rgba(15,23,42,0.8)] active:translate-y-0.5 flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa hết</span>
            </button>

            <button
              type="button"
              onClick={handleHint}
              disabled={isAnswerChecked || placedTiles.length >= targetWord.length}
              className="px-3.5 py-2 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-950/80 rounded-xl border border-amber-500/40 shadow-[0_2px_0_rgba(180,83,9,0.8)] active:translate-y-0.5 flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Gợi ý 1 chữ cái</span>
            </button>
          </div>

          {!isAnswerChecked ? (
            <button
              type="button"
              onClick={handleCheckAnswer}
              disabled={placedTiles.length < targetWord.length}
              className="px-7 py-2.5 text-xs font-black text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-[0_4px_0_rgba(159,18,57,0.8),0_0_20px_rgba(236,72,153,0.4)] active:translate-y-1 active:shadow-[0_1px_0_rgba(159,18,57,0.8)] flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Kiểm tra kết quả</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-7 py-2.5 text-xs font-black text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl shadow-[0_4px_0_rgba(159,18,57,0.8),0_0_20px_rgba(236,72,153,0.4)] active:translate-y-1 active:shadow-[0_1px_0_rgba(159,18,57,0.8)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>{currentIdx < rawQuestions.length - 1 ? 'Từ tiếp theo' : 'Xem kết quả'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Feedback Display */}
        {isAnswerChecked && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2 animate-in fade-in duration-200 shadow-inner">
            <div className="flex items-center gap-2">
              {isWordCorrect ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 px-3.5 py-1.5 rounded-xl border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Chính xác! Tuyệt vời.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 bg-rose-950/80 px-3.5 py-1.5 rounded-xl border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                  <XCircle className="w-4 h-4 text-rose-400" /> Chưa chính xác. Từ đúng là: <strong className="text-emerald-400 font-black">{targetWord}</strong>
                </span>
              )}
            </div>

            {currentQ.explanation && (
              <p className="text-xs text-slate-300 flex items-start gap-2 pt-1">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{currentQ.explanation}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
