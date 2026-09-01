import React, { useState, useEffect, useMemo } from 'react';
import {
  Shuffle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Link2,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { gameScoringService } from '../../services/gameScoringService';
import { GameCompletionScreen } from './GameCompletionScreen';
import { GameReviewModal } from './GameReviewModal';

interface MatchUpGameProps {
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

interface MatchPair {
  id: string; // questionId
  promptText: string;
  answerText: string;
  correctAnswerId: string;
  explanation?: string | null;
}

export const MatchUpGame: React.FC<MatchUpGameProps> = ({
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

  // Interaction selection state
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<{ promptId: string; answerId: string } | null>(null);

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);

  // Sound sync
  useEffect(() => {
    soundEffects.setMuted(!soundOn);
  }, [soundOn]);

  // Session pairs derived from Question Set
  const pairs: MatchPair[] = useMemo(() => {
    return rawQuestions.map((q) => {
      const correctOpt = q.options.find(
        (o) =>
          o.id === q.correctAnswerId ||
          (q.correctAnswer && o.label?.toUpperCase() === q.correctAnswer.toUpperCase())
      );
      const answerText = q.correctAnswerText || correctOpt?.text || 'Correct Answer';
      return {
        id: q.id,
        promptText: q.question,
        answerText,
        correctAnswerId: correctOpt?.id || q.correctAnswerId || 'ans',
        explanation: q.explanation || null,
      };
    });
  }, [rawQuestions]);

  // Left prompts (shuffled independently)
  const leftPrompts = useMemo(() => {
    let list = [...pairs];
    if (settings.shuffleQuestions !== false) {
      list = [...list].sort(() => Math.random() - 0.5);
    }
    return list;
  }, [pairs, settings.shuffleQuestions]);

  // Right answers (shuffled independently)
  const rightAnswers = useMemo(() => {
    let list = [...pairs];
    // Always shuffle answers independently
    list = [...list].sort(() => Math.random() - 0.5);
    return list;
  }, [pairs]);

  // Session timer
  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => setTimeSpentSeconds((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  // Check match when both sides are selected
  useEffect(() => {
    if (selectedPromptId && selectedAnswerId) {
      setAttempts((a) => a + 1);

      if (selectedPromptId === selectedAnswerId) {
        // MATCH SUCCESS
        soundEffects.playCorrect();
        const newMatched = [...matchedIds, selectedPromptId];
        setMatchedIds(newMatched);
        setScore((s) => s + 10);

        const targetQ = rawQuestions.find((q) => q.id === selectedPromptId);
        if (targetQ) {
          const rec: StudentAnswerRecord = {
            questionId: targetQ.id,
            questionText: targetQ.question,
            selectedAnswer: 'Matched correctly',
            selectedAnswerId: targetQ.correctAnswerId || '',
            correctAnswer: targetQ.correctAnswerText || '',
            correctAnswerId: targetQ.correctAnswerId || '',
            isCorrect: true,
            timeSpentSeconds: 0,
          };
          setAnswers((prev) => [...prev, rec]);
        }

        setSelectedPromptId(null);
        setSelectedAnswerId(null);

        // Check if all matched
        if (newMatched.length === pairs.length) {
          setTimeout(() => {
            soundEffects.playVictory();
            setIsFinished(true);
            if (onFinish) {
              onFinish({
                score: score + 10,
                totalQuestions: pairs.length,
                correctCount: newMatched.length,
                timeSpentSeconds,
                answers,
              });
            }
          }, 400);
        }
      } else {
        // MATCH WRONG
        soundEffects.playIncorrect();
        setWrongPair({ promptId: selectedPromptId, answerId: selectedAnswerId });
        const timer = setTimeout(() => {
          setSelectedPromptId(null);
          setSelectedAnswerId(null);
          setWrongPair(null);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedPromptId, selectedAnswerId, matchedIds, pairs.length, rawQuestions, score, timeSpentSeconds, answers, onFinish]);

  const handleRestart = () => {
    setMatchedIds([]);
    setSelectedPromptId(null);
    setSelectedAnswerId(null);
    setWrongPair(null);
    setScore(0);
    setAttempts(0);
    setTimeSpentSeconds(0);
    setAnswers([]);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <>
        <GameCompletionScreen
          title={title}
          gameTypeLabel="Match Up"
          score={score}
          totalQuestions={pairs.length}
          correctCount={matchedIds.length}
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
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
            🔗
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Matched: {matchedIds.length} / {pairs.length} Pairs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 font-mono">
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

      {/* Matching instructions banner */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-400" />
          <span>Tap a question on the left, then tap its matching answer on the right.</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Attempts: {attempts}</span>
      </div>

      {/* 2-Column Matching Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Questions / Prompts */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
            Questions & Prompts ({leftPrompts.length})
          </span>
          {leftPrompts.map((p) => {
            const isMatched = matchedIds.includes(p.id);
            const isSelected = selectedPromptId === p.id;
            const isWrong = wrongPair?.promptId === p.id;

            let cardStyle = 'bg-slate-900 border-slate-800 text-white hover:border-emerald-500/50';

            if (isMatched) {
              cardStyle = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 opacity-60 pointer-events-none';
            } else if (isWrong) {
              cardStyle = 'bg-rose-950/70 border-rose-500 text-rose-200 animate-shake';
            } else if (isSelected) {
              cardStyle = 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400/30';
            }

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (isMatched) return;
                  soundEffects.playClick();
                  setSelectedPromptId(p.id);
                }}
                disabled={isMatched}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all duration-150 ${cardStyle}`}
              >
                <span className="text-xs sm:text-sm font-medium leading-relaxed">
                  {p.promptText}
                </span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Right Column: Answers / Definitions */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
            Answers & Definitions ({rightAnswers.length})
          </span>
          {rightAnswers.map((a) => {
            const isMatched = matchedIds.includes(a.id);
            const isSelected = selectedAnswerId === a.id;
            const isWrong = wrongPair?.answerId === a.id;

            let cardStyle = 'bg-slate-900 border-slate-800 text-white hover:border-indigo-500/50';

            if (isMatched) {
              cardStyle = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 opacity-60 pointer-events-none';
            } else if (isWrong) {
              cardStyle = 'bg-rose-950/70 border-rose-500 text-rose-200 animate-shake';
            } else if (isSelected) {
              cardStyle = 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/30';
            }

            return (
              <button
                key={`ans_${a.id}`}
                type="button"
                onClick={() => {
                  if (isMatched) return;
                  soundEffects.playClick();
                  setSelectedAnswerId(a.id);
                }}
                disabled={isMatched}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all duration-150 ${cardStyle}`}
              >
                <span className="text-xs sm:text-sm font-semibold leading-relaxed">
                  {a.answerText}
                </span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
