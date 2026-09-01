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
  const [soundOn, setSoundOn] = useState(settings.soundEffects !== false);
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

  const handleSelectOption = (optId: string) => {
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
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/30">
            🃏
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Opened: {answers.length} / {boxes.length} Boxes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-purple-600/20 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-300 font-mono">
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

      {/* Grid Mode: Display All Mystery Boxes */}
      {activeBoxIndex === null ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-purple-400" />
              Select any closed box to reveal its question:
            </span>
            <span className="font-mono">
              {boxes.filter((b) => b.status === 'closed').length} Remaining
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {boxes.map((box) => {
              const isClosed = box.status === 'closed';
              const isCorrect = box.status === 'completed_correct';
              const isWrong = box.status === 'completed_wrong';

              let boxStyle =
                'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 hover:border-purple-500 hover:shadow-purple-500/20 hover:-translate-y-1 cursor-pointer';

              if (isCorrect) {
                boxStyle =
                  'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 opacity-70 pointer-events-none';
              } else if (isWrong) {
                boxStyle =
                  'bg-rose-950/40 border-rose-500/50 text-rose-300 opacity-70 pointer-events-none';
              }

              return (
                <button
                  key={box.index}
                  type="button"
                  onClick={() => handleOpenBox(box.index)}
                  disabled={!isClosed}
                  className={`h-28 sm:h-32 rounded-3xl border-2 p-4 flex flex-col items-center justify-center relative shadow-lg transition-all duration-200 ${boxStyle}`}
                >
                  {isClosed ? (
                    <>
                      <Package className="w-6 h-6 text-purple-400 mb-1" />
                      <span className="text-xl sm:text-2xl font-black text-white font-mono">
                        {box.index}
                      </span>
                      <span className="text-[10px] text-purple-300/80 uppercase font-bold tracking-wider mt-0.5">
                        Mystery Box
                      </span>
                    </>
                  ) : isCorrect ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
                      <span className="text-xs font-bold text-emerald-300">Box #{box.index}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">+10 pts</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-8 h-8 text-rose-400 mb-1" />
                      <span className="text-xs font-bold text-rose-300">Box #{box.index}</span>
                      <span className="text-[10px] text-rose-400 font-mono">Completed</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Revealed Box Question View */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 bg-purple-950/80 border border-purple-500/30 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Box #{activeBoxIndex} Revealed
            </span>
            <button
              type="button"
              onClick={() => setActiveBoxIndex(null)}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
            >
              <Grid className="w-3.5 h-3.5" /> Back to Grid
            </button>
          </div>

          {currentQ?.passage && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 italic">
              <span className="font-semibold text-purple-400 not-italic">Passage: </span>
              {currentQ.passage}
            </div>
          )}

          <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {currentQ?.question}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {currentQ?.options.map((opt) => {
              const isSelected = selectedOptId === opt.id;
              const isCorrect =
                opt.id === currentQ.correctAnswerId ||
                (currentQ.correctAnswer && opt.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase());

              let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-purple-500/50';

              if (isAnswered) {
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
                  disabled={isAnswered}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-slate-800 text-slate-300">
                      {opt.label || '•'}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">{opt.text}</span>
                  </div>
                  {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {/* Feedback & Navigation */}
          {isAnswered && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              {currentQ?.explanation && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{currentQ.explanation}</span>
                </p>
              )}
              <button
                type="button"
                onClick={handleNextOrReturn}
                className="ml-auto px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/30"
              >
                <span>Return to Grid</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
