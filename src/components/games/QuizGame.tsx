import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface QuizGameProps {
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

export const QuizGame: React.FC<QuizGameProps> = ({
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

  // Sound effect sync
  useEffect(() => {
    soundEffects.setMuted(!soundOn);
  }, [soundOn]);

  // Prepare session-specific questions and shuffled options without modifying the original Question Set!
  const sessionQuestions = useMemo(() => {
    let qList = [...rawQuestions];
    if (settings.shuffleQuestions) {
      qList = [...qList].sort(() => Math.random() - 0.5);
    }
    return qList.map((q) => {
      let opts = [...(q.options || [])];
      if (settings.shuffleAnswers) {
        opts = [...opts].sort(() => Math.random() - 0.5);
        // Re-assign display labels A, B, C, D while keeping opt.id and isCorrect stable!
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        opts = opts.map((o, idx) => ({
          ...o,
          label: letters[idx] || `${idx + 1}`,
        }));
      }
      return {
        ...q,
        options: opts,
      };
    });
  }, [rawQuestions, settings.shuffleQuestions, settings.shuffleAnswers]);

  // Session timer
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  const currentQ = sessionQuestions[currentIdx] || sessionQuestions[0];
  const totalQ = sessionQuestions.length;

  if (!currentQ || totalQ === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl">
        <p>No questions available for this Quiz.</p>
        {onExit && (
          <button
            onClick={onExit}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Exit
          </button>
        )}
      </div>
    );
  }

  const handleSelectOption = (optId: string) => {
    if (isAnswered) return;
    setSelectedOptId(optId);
    setIsAnswered(true);

    const evalResult = gameScoringService.evaluateMultipleChoice(
      currentQ,
      optId,
      currentQ.points || 10
    );

    if (evalResult.isCorrect) {
      soundEffects.playCorrect();
      setScore((prev) => prev + evalResult.scoreGained);
      setCorrectCount((prev) => prev + 1);
    } else {
      soundEffects.playIncorrect();
    }

    const answerRec: StudentAnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedAnswer: evalResult.selectedAnswerText || optId,
      selectedAnswerId: optId,
      correctAnswer: evalResult.correctAnswerText || currentQ.correctAnswer || '',
      correctAnswerId: evalResult.correctAnswerId,
      isCorrect: evalResult.isCorrect,
      timeSpentSeconds: 0,
    };

    setAnswers((prev) => [...prev, answerRec]);
  };

  const handleNext = () => {
    soundEffects.playClick();
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOptId(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      soundEffects.playVictory();
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
          gameTypeLabel="Quiz"
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
          questions={sessionQuestions}
          answers={answers}
        />
      </>
    );
  }

  // Check correct option
  const correctOpt = currentQ.options.find(
    (o) =>
      o.id === currentQ.correctAnswerId ||
      (currentQ.correctAnswer && o.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
            🎯
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Question {currentIdx + 1} of {totalQ}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          {/* Score Badge */}
          {settings.showScore !== false && (
            <div className="bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300 font-mono">
              {score} pts
            </div>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:bg-slate-800 transition-colors"
            title={soundOn ? 'Mute sound' : 'Unmute sound'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {settings.showProgress !== false && (
        <div className="w-full bg-slate-800/60 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-indigo-500/50"
            style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
          />
        </div>
      )}

      {/* Main Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
        {/* Unit / Level tag */}
        <div className="flex items-center gap-2">
          {currentQ.unit && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
              {currentQ.unit}
            </span>
          )}
          {currentQ.level && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              Level: {currentQ.level}
            </span>
          )}
          {currentQ.points && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 ml-auto font-mono">
              +{currentQ.points} pts
            </span>
          )}
        </div>

        {/* Reading Passage if present */}
        {currentQ.passage && (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed italic">
            <span className="font-semibold text-indigo-400 not-italic block mb-1">
              📖 Reading Passage:
            </span>
            {currentQ.passage}
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
          {currentQ.question}
        </h2>

        {/* Multiple Choice Options */}
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((opt) => {
            const isSelected = selectedOptId === opt.id;
            const isCorrect =
              opt.id === currentQ.correctAnswerId ||
              (currentQ.correctAnswer && opt.label?.toUpperCase() === currentQ.correctAnswer.toUpperCase());

            let btnStyle =
              'bg-slate-950/80 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800';

            if (isAnswered) {
              if (isCorrect) {
                btnStyle =
                  'bg-emerald-950/70 border-emerald-500/80 text-white font-semibold ring-1 ring-emerald-500/50';
              } else if (isSelected && !isCorrect) {
                btnStyle =
                  'bg-rose-950/70 border-rose-500/80 text-rose-200 font-semibold ring-1 ring-rose-500/50';
              } else {
                btnStyle = 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60';
              }
            } else if (isSelected) {
              btnStyle = 'bg-indigo-600 border-indigo-500 text-white';
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all duration-150 ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                      isAnswered && isCorrect
                        ? 'bg-emerald-600 text-white'
                        : isAnswered && isSelected && !isCorrect
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {opt.label || '•'}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                </div>

                {isAnswered && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Explanation Box */}
        {isAnswered && (
          <div className="pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedOptId === correctOpt?.id ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4" /> Correct!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-950/80 px-3 py-1 rounded-xl border border-rose-500/40">
                    <XCircle className="w-4 h-4" /> Incorrect.
                  </span>
                )}

                {settings.showCorrectAnswer !== false && (
                  <span className="text-xs text-slate-400 ml-2">
                    Correct key: <strong className="text-emerald-400">{correctOpt?.label}. {correctOpt?.text}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
              >
                <span>{currentIdx < totalQ - 1 ? 'Next Question' : 'View Results'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation */}
            {settings.showExplanation !== false && (
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-300 font-semibold">Why? </strong>
                  <span>{currentQ.explanation ? currentQ.explanation : 'No explanation provided.'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
