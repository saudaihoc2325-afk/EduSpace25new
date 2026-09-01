import React, { useState, useEffect, useRef } from 'react';
import {
  Disc,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
import { resolveOption3DStyle } from '../../utils/optionColorPalette';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface RandomWheelGameProps {
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

const SEGMENT_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#3b82f6', // Blue
];

export const RandomWheelGame: React.FC<RandomWheelGameProps> = ({
  title,
  questions: rawQuestions,
  settings: initialSettings,
  onFinish,
  onExit,
  isPreview = false,
}) => {
  const settings: GameSettings = initialSettings || {};
  const [soundOn, setSoundOn] = useState(!soundEffects.getMuted());
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Active items currently on wheel
  const [activeItems, setActiveItems] = useState<QuestionItem[]>(() => [...rawQuestions]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0); // in degrees

  // Selected question modal state
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(false);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Draw 3D Neon Wheel on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    ctx.clearRect(0, 0, width, height);

    const itemCount = activeItems.length;
    if (itemCount === 0) {
      // Empty wheel
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.stroke();
      return;
    }

    const anglePerSlice = (2 * Math.PI) / itemCount;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((currentRotation * Math.PI) / 180);

    for (let i = 0; i < itemCount; i++) {
      const startAngle = i * anglePerSlice;
      const endAngle = startAngle + anglePerSlice;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text label inside slice
      ctx.save();
      ctx.rotate(startAngle + anglePerSlice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;

      const q = activeItems[i];
      const sliceLabel = `Câu ${i + 1}: ${q.question.substring(0, 16)}${q.question.length > 16 ? '...' : ''}`;
      ctx.fillText(sliceLabel, radius - 18, 4);
      ctx.restore();
    }

    // Outer Bezel
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center pin circle
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }, [activeItems, currentRotation]);

  const handleSpin = () => {
    if (isSpinning || activeItems.length === 0 || selectedQuestion) return;

    setIsSpinning(true);
    soundEffects.playSpinTick();

    const spinTurns = 5 + Math.floor(Math.random() * 4); // 5 - 8 full rotations
    const randomOffset = Math.random() * 360;
    const totalAddedDegrees = spinTurns * 360 + randomOffset;
    const targetRotation = currentRotation + totalAddedDegrees;

    const durationMs = (settings.spinDurationSeconds || 4) * 1000;
    const startTime = performance.now();
    const startRotation = currentRotation;

    let tickCount = 0;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const newRot = startRotation + ease * (targetRotation - startRotation);
      setCurrentRotation(newRot);

      if (Math.floor(newRot / 30) > tickCount) {
        soundEffects.playSpinTick();
        tickCount = Math.floor(newRot / 30);
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setIsSpinning(false);
        // Calculate winning slice: Top needle is at 270 degrees in standard polar coordinates
        const normalized = (360 - (targetRotation % 360) + 270) % 360;
        const sliceAngle = 360 / activeItems.length;
        const selectedIndex = Math.floor(normalized / sliceAngle) % activeItems.length;
        const winner = activeItems[selectedIndex];

        soundEffects.playBoxOpen();
        setSelectedQuestion(winner);
        setSelectedOptId(null);
        setIsQuestionAnswered(false);
      }
    };

    requestAnimationFrame(animateSpin);
  };

  const handleSelectOption = (optId: string, e?: React.MouseEvent) => {
    if (isQuestionAnswered || !selectedQuestion) return;
    setSelectedOptId(optId);
    setIsQuestionAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(
      selectedQuestion,
      optId,
      selectedQuestion.points || 10
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
      questionId: selectedQuestion.id,
      questionText: selectedQuestion.question,
      selectedAnswer: evalResult.selectedAnswerText || optId,
      selectedAnswerId: optId,
      correctAnswer: evalResult.correctAnswerText || selectedQuestion.correctAnswer || '',
      correctAnswerId: evalResult.correctAnswerId,
      isCorrect: evalResult.isCorrect,
      timeSpentSeconds: 0,
    };
    setAnswers((prev) => [...prev, rec]);
  };

  const handleNextAfterQuestion = () => {
    if (!selectedQuestion) return;

    // If remove item after selection is enabled, remove from active session wheel
    let nextList = activeItems;
    if (settings.removeAfterSelection !== false) {
      nextList = activeItems.filter((q) => q.id !== selectedQuestion.id);
      setActiveItems(nextList);
    }

    setSelectedQuestion(null);
    setSelectedOptId(null);
    setIsQuestionAnswered(false);

    if (nextList.length === 0 || answers.length + 1 >= rawQuestions.length) {
      soundEffects.playVictory();
      fireworks.grandFinale();
      setIsFinished(true);
      if (onFinish) {
        onFinish({
          score,
          totalQuestions: rawQuestions.length,
          correctCount: correctCount + (isQuestionAnswered && selectedOptId === selectedQuestion.correctAnswerId ? 1 : 0),
          timeSpentSeconds,
          answers,
        });
      }
    }
  };

  const handleRestart = () => {
    setActiveItems([...rawQuestions]);
    setSelectedQuestion(null);
    setSelectedOptId(null);
    setIsQuestionAnswered(false);
    setScore(0);
    setCorrectCount(0);
    setStreakCount(0);
    setTimeSpentSeconds(0);
    setAnswers([]);
    setCurrentRotation(0);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <>
        <GameCompletionScreen
          title={title}
          gameTypeLabel="Random Wheel"
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
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* 3D Neon Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/95 border border-amber-500/30 rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-300/40">
            🎡
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs font-display">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-300 font-mono font-bold">
                Trên vòng quay: {activeItems.length} • Đã hoàn thành: {answers.length} / {rawQuestions.length}
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
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-orange-950 border border-amber-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-amber-300 font-mono shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            {score} pts
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 transition-all cursor-pointer"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Main Area: 3D Neon Wheel or Active Question Modal */}
      {!selectedQuestion ? (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/25 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
          {/* Wheel Pointer Needle at Top */}
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)] z-20 -mb-4" />

          {/* Canvas Wheel with 3D Ring */}
          <div className="relative p-2.5 bg-slate-950 rounded-full border-4 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="rounded-full max-w-[280px] sm:max-w-[340px] max-h-[280px] sm:max-h-[340px]"
            />
          </div>

          {/* 3D Spin Button */}
          <button
            type="button"
            onClick={handleSpin}
            disabled={isSpinning || activeItems.length === 0}
            className={`mt-6 px-10 py-3.5 rounded-2xl font-black text-sm text-white flex items-center gap-3 shadow-[0_4px_0_rgba(180,83,9,0.8),0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer ${
              isSpinning || activeItems.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:translate-y-1 active:shadow-[0_1px_0_rgba(180,83,9,0.8)]'
            }`}
          >
            <Disc className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Đang quay...' : 'QUAY VÒNG MAY MẮN'}</span>
          </button>
        </div>
      ) : (
        /* Question Answering Pop-up Modal - 3D Neon Stage */
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] space-y-6 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 opacity-80" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider bg-amber-950/80 border border-amber-500/40 px-3.5 py-1.5 rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              🎯 Kết quả từ vòng quay
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
              +{selectedQuestion.points || 10} pts
            </span>
          </div>

          {selectedQuestion.passage && (
            <div className="p-4 bg-slate-950/90 border border-slate-800/80 rounded-2xl text-xs text-slate-300 italic shadow-inner">
              <span className="font-bold text-amber-400 not-italic block mb-1">Đoạn văn đọc hiểu (Passage): </span>
              {selectedQuestion.passage}
            </div>
          )}

          <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-relaxed font-display">
            {selectedQuestion.question}
          </h2>

          {/* Dynamic 3D Neon Multiple Choice Options (A, B, C, D, E, F...) */}
          <div className="grid grid-cols-1 gap-3.5">
            {selectedQuestion.options.map((opt, optIdx) => {
              const isSelected = selectedOptId === opt.id;
              const isCorrect =
                opt.id === selectedQuestion.correctAnswerId ||
                (selectedQuestion.correctAnswer && opt.label?.toUpperCase() === selectedQuestion.correctAnswer.toUpperCase());

              const { cardClasses, badgeClasses } = resolveOption3DStyle({
                index: optIdx,
                label: opt.label,
                isAnswered: isQuestionAnswered,
                isSelected,
                isCorrect: Boolean(isCorrect),
              });

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={(e) => handleSelectOption(opt.id, e)}
                  disabled={isQuestionAnswered}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${cardClasses}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`w-8 h-8 rounded-xl text-xs flex items-center justify-center shrink-0 border ${badgeClasses}`}>
                      {opt.label || String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-100 break-words">{opt.text}</span>
                  </div>
                  {isQuestionAnswered && isCorrect && (
                    <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-300" />
                    </div>
                  )}
                  {isQuestionAnswered && isSelected && !isCorrect && (
                    <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                      <XCircle className="w-4.5 h-4.5 text-rose-300" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {isQuestionAnswered && (
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              {selectedQuestion.explanation && (
                <p className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 max-w-md">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{selectedQuestion.explanation}</span>
                </p>
              )}
              <button
                type="button"
                onClick={handleNextAfterQuestion}
                className="ml-auto px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl flex items-center gap-2 shadow-[0_4px_0_rgba(180,83,9,0.8),0_0_20px_rgba(245,158,11,0.4)] active:translate-y-1 active:shadow-[0_1px_0_rgba(180,83,9,0.8)] cursor-pointer transition-all"
              >
                <span>Tiếp tục quay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
