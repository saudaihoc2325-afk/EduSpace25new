import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Play,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
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
  '#4f46e5', // Indigo
  '#059669', // Emerald
  '#d97706', // Amber
  '#9333ea', // Purple
  '#e11d48', // Rose
  '#0284c7', // Sky
  '#ea580c', // Orange
  '#10b981', // Teal
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
  const [soundOn, setSoundOn] = useState(settings.soundEffects !== false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Active items on the wheel (temporary in session)
  const [activeItems, setActiveItems] = useState<QuestionItem[]>(() => [...rawQuestions]);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(false);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);

  // Wheel animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
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

  // Draw Canvas Wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 16;

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
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text label inside slice
      ctx.save();
      ctx.rotate(startAngle + anglePerSlice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';

      const q = activeItems[i];
      const sliceLabel = `Q${i + 1}: ${q.question.substring(0, 18)}${q.question.length > 18 ? '...' : ''}`;
      ctx.fillText(sliceLabel, radius - 20, 4);
      ctx.restore();
    }

    // Center pin circle
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
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

  const handleSelectOption = (optId: string) => {
    if (isQuestionAnswered || !selectedQuestion) return;
    setSelectedOptId(optId);
    setIsQuestionAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(
      selectedQuestion,
      optId,
      selectedQuestion.points || 10
    );

    if (evalResult.isCorrect) {
      soundEffects.playCorrect();
      setScore((s) => s + evalResult.scoreGained);
      setCorrectCount((c) => c + 1);
    } else {
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
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
            🎡
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              On Wheel: {activeItems.length} • Completed: {answers.length} / {rawQuestions.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-amber-600/20 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 font-mono">
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

      {/* Main Area: Wheel or Active Question Modal */}
      {!selectedQuestion ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-xl">
          {/* Wheel Pointer Needle at Top */}
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 drop-shadow-md z-20 -mb-3" />

          {/* Canvas Wheel */}
          <div className="relative p-2 bg-slate-950 rounded-full border-4 border-slate-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="rounded-full max-w-[280px] sm:max-w-[340px] max-h-[280px] sm:max-h-[340px]"
            />
          </div>

          {/* Spin Button */}
          <button
            type="button"
            onClick={handleSpin}
            disabled={isSpinning || activeItems.length === 0}
            className={`mt-6 px-8 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center gap-2.5 shadow-xl transition-all ${
              isSpinning || activeItems.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30 active:scale-95'
            }`}
          >
            <Disc className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Spinning...' : 'SPIN WHEEL'}</span>
          </button>
        </div>
      ) : (
        /* Question Answering Pop-up Modal */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-xl">
              🎯 Selected from Wheel
            </span>
            <span className="text-xs font-mono text-slate-400">+{selectedQuestion.points || 10} pts</span>
          </div>

          {selectedQuestion.passage && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 italic">
              <span className="font-semibold text-amber-400 not-italic">Passage: </span>
              {selectedQuestion.passage}
            </div>
          )}

          <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {selectedQuestion.question}
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            {selectedQuestion.options.map((opt) => {
              const isSelected = selectedOptId === opt.id;
              const isCorrect =
                opt.id === selectedQuestion.correctAnswerId ||
                (selectedQuestion.correctAnswer && opt.label?.toUpperCase() === selectedQuestion.correctAnswer.toUpperCase());

              let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-500/50';

              if (isQuestionAnswered) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-950/70 border-emerald-500 text-white font-semibold';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-950/70 border-rose-500 text-rose-200';
                } else {
                  btnStyle = 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60';
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={isQuestionAnswered}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-slate-800 text-slate-300">
                      {opt.label || '•'}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">{opt.text}</span>
                  </div>
                  {isQuestionAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isQuestionAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {isQuestionAnswered && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              {selectedQuestion.explanation && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{selectedQuestion.explanation}</span>
                </p>
              )}
              <button
                type="button"
                onClick={handleNextAfterQuestion}
                className="ml-auto px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/30"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
