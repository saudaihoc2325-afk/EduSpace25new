import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Grid,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
import { resolveOption3DStyle } from '../../utils/optionColorPalette';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface OpenTheBoxGameProps {
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

interface BoxState {
  index: number;
  question: QuestionItem;
  status: 'closed' | 'open_active' | 'completed_correct' | 'completed_wrong';
}

export const OpenTheBoxGame: React.FC<OpenTheBoxGameProps> = ({
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

  // Boxes session state
  const [boxes, setBoxes] = useState<BoxState[]>(() => {
    let qList = [...rawQuestions];
    if (settings.shuffleQuestions) {
      qList = [...qList].sort(() => Math.random() - 0.5);
    }
    return qList.map((q, idx) => ({
      index: idx + 1,
      question: q,
      status: 'closed',
    }));
  });

  const [activeBoxIndex, setActiveBoxIndex] = useState<number | null>(null);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);

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

  const activeBox = activeBoxIndex !== null ? boxes.find((b) => b.index === activeBoxIndex) : null;
  const currentQ = activeBox ? activeBox.question : null;

  const handleOpenBox = (boxIndex: number) => {
    const box = boxes.find((b) => b.index === boxIndex);
    if (!box || box.status === 'completed_correct' || box.status === 'completed_wrong') return;

    soundEffects.playBoxOpen();
    setActiveBoxIndex(boxIndex);
    setSelectedOptId(null);
    setIsAnswered(false);
  };

  const handleSelectOption = (optId: string, e?: React.MouseEvent) => {
    if (isAnswered || !currentQ || activeBoxIndex === null) return;
    setSelectedOptId(optId);
    setIsAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(
      currentQ,
      optId,
      currentQ.points || 10
    );

    const isCorrect = evalResult.isCorrect;
    if (isCorrect) {
      soundEffects.playCorrect();
      const clickX = e?.clientX || window.innerWidth / 2;
      const clickY = e?.clientY || window.innerHeight * 0.45;
      fireworks.burst({ x: clickX, y: clickY, count: 60 });

      setScore((s) => s + evalResult.scoreGained);
      setCorrectCount((c) => c + 1);
    } else {
      soundEffects.playIncorrect();
    }

    // Update box status in session
    setBoxes((prev) =>
      prev.map((b) =>
        b.index === activeBoxIndex
          ? { ...b, status: isCorrect ? 'completed_correct' : 'completed_wrong' }
          : b
      )
    );

    const rec: StudentAnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedAnswer: evalResult.selectedAnswerText || optId,
      selectedAnswerId: optId,
      correctAnswer: evalResult.correctAnswerText || currentQ.correctAnswer || '',
      correctAnswerId: evalResult.correctAnswerId,
      isCorrect,
      timeSpentSeconds: 0,
    };
    setAnswers((prev) => [...prev, rec]);
  };

  const handleNextOrReturn = () => {
    // Check if all boxes are completed
    const remainingClosed = boxes.filter(
      (b) => b.index !== activeBoxIndex && b.status === 'closed'
    );

    if (remainingClosed.length === 0) {
      soundEffects.playVictory();
      fireworks.grandFinale();
      setIsFinished(true);
      if (onFinish) {
        onFinish({
          score,
          totalQuestions: boxes.length,
          correctCount,
          timeSpentSeconds,
          answers,
        });
      }
    } else {
      setActiveBoxIndex(null);
      setSelectedOptId(null);
      setIsAnswered(false);
    }
  };

  const handleRestart = () => {
    setBoxes(
      rawQuestions.map((q, idx) => ({
        index: idx + 1,
        question: q,
        status: 'closed',
      }))
    );
    setActiveBoxIndex(null);
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
          gameTypeLabel="Open the Box"
          score={score}
          totalQuestions={boxes.length}
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
      <div className="flex items-center justify-between bg-slate-900/95 border border-purple-500/30 rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-300/40">
            🎁
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs font-display">
              {title}
            </h3>
            <span className="text-[11px] text-purple-300 font-mono font-bold">
              Đã mở: {answers.length} / {boxes.length} Hộp
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-purple-300 font-mono shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            {score} pts
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-850 transition-all cursor-pointer"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Grid Mode: Display 3D Mystery Boxes */}
      {activeBoxIndex === null ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-semibold">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-purple-400" />
              Chọn một hộp bí ẩn bất kỳ để khám phá câu hỏi:
            </span>
            <span className="font-mono text-purple-400 font-bold bg-purple-950/60 px-2.5 py-0.5 rounded-lg border border-purple-500/30">
              Còn lại: {boxes.filter((b) => b.status === 'closed').length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {boxes.map((box) => {
              const isClosed = box.status === 'closed';
              const isCorrect = box.status === 'completed_correct';
              const isWrong = box.status === 'completed_wrong';

              let boxStyle =
                'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-purple-500/40 shadow-[0_6px_0_rgba(88,28,135,0.7),0_10px_24px_rgba(0,0,0,0.5)] hover:border-purple-400 hover:shadow-[0_6px_0_rgba(88,28,135,0.9),0_0_25px_rgba(168,85,247,0.4)] hover:-translate-y-1 active:translate-y-1 active:shadow-[0_2px_0_rgba(88,28,135,0.7)] cursor-pointer';

              if (isCorrect) {
                boxStyle =
                  'bg-gradient-to-b from-emerald-950/70 to-slate-950 border-emerald-500/60 text-emerald-300 shadow-[0_4px_0_rgba(6,95,70,0.6),0_0_15px_rgba(16,185,129,0.3)] opacity-80 pointer-events-none';
              } else if (isWrong) {
                boxStyle =
                  'bg-gradient-to-b from-rose-950/70 to-slate-950 border-rose-500/60 text-rose-300 shadow-[0_4px_0_rgba(159,18,57,0.6),0_0_15px_rgba(244,63,94,0.3)] opacity-80 pointer-events-none';
              }

              return (
                <button
                  key={box.index}
                  type="button"
                  onClick={() => handleOpenBox(box.index)}
                  disabled={!isClosed}
                  className={`h-32 sm:h-36 rounded-3xl border-2 p-4 flex flex-col items-center justify-center relative transition-all duration-200 ${boxStyle}`}
                >
                  {isClosed ? (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        #{box.index}
                      </span>
                      <span className="text-[10px] text-purple-300 font-extrabold uppercase tracking-wider mt-1">
                        Hộp Bí Ẩn
                      </span>
                    </>
                  ) : isCorrect ? (
                    <>
                      <CheckCircle2 className="w-9 h-9 text-emerald-400 mb-1.5 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                      <span className="text-xs font-bold text-emerald-300">Hộp #{box.index}</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">+10 điểm</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-9 h-9 text-rose-400 mb-1.5 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
                      <span className="text-xs font-bold text-rose-300">Hộp #{box.index}</span>
                      <span className="text-[10px] text-rose-400 font-mono font-bold">Đã mở</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Revealed Box Question View - 3D Neon Stage */
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] space-y-6 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-80" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-purple-300 bg-purple-950/80 border border-purple-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Package className="w-4 h-4 text-purple-400" /> Hộp #{activeBoxIndex} Đã Mở
            </span>
            <button
              type="button"
              onClick={() => setActiveBoxIndex(null)}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5" /> Quay lại danh sách hộp
            </button>
          </div>

          {currentQ?.passage && (
            <div className="p-4 bg-slate-950/90 border border-slate-800/80 rounded-2xl text-xs text-slate-300 italic shadow-inner">
              <span className="font-bold text-purple-400 not-italic block mb-1">Đoạn văn đọc hiểu (Passage): </span>
              {currentQ.passage}
            </div>
          )}

          <h2 className="font-fluid-question font-extrabold text-white leading-snug font-display tracking-tight">
            {currentQ?.question}
          </h2>

          {/* Dynamic 3D Neon Multiple Choice Options (A, B, C, D, E, F...) */}
          <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
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
                  className={`w-full min-h-[3.75rem] sm:min-h-[4.25rem] p-3.5 sm:p-4.5 rounded-2xl border text-left flex items-center justify-between gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.99] ${cardClasses}`}
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

          {/* Feedback & Navigation */}
          {isAnswered && (
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
              {currentQ?.explanation && (
                <p className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 max-w-md">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>{currentQ.explanation}</span>
                </p>
              )}
              <button
                type="button"
                onClick={handleNextOrReturn}
                className="ml-auto px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl flex items-center gap-2 shadow-[0_4px_0_rgba(107,33,168,0.8),0_0_20px_rgba(168,85,247,0.4)] active:translate-y-1 active:shadow-[0_1px_0_rgba(107,33,168,0.8)] cursor-pointer transition-all"
              >
                <span>{boxes.filter((b) => b.index !== activeBoxIndex && b.status === 'closed').length === 0 ? 'Xem kết quả' : 'Tiếp tục mở hộp khác'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
