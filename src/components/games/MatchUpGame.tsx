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
  Flame,
} from 'lucide-react';
import { QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { fireworks } from '../../utils/fireworks';
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
  const [soundOn, setSoundOn] = useState(!soundEffects.getMuted());
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
  const [streak, setStreak] = useState(0);
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
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        if (nextStreak >= 2) {
          soundEffects.playStreak(nextStreak);
        } else {
          soundEffects.playCorrect();
        }

        // Fireworks burst
        fireworks.burst({
          x: window.innerWidth / 2,
          y: window.innerHeight * 0.5,
          count: 50,
        });

        const newMatched = [...matchedIds, selectedPromptId];
        setMatchedIds(newMatched);
        setScore((s) => s + 10);

        const targetQ = rawQuestions.find((q) => q.id === selectedPromptId);
        if (targetQ) {
          const rec: StudentAnswerRecord = {
            questionId: targetQ.id,
            questionText: targetQ.question,
            selectedAnswer: 'Ghép cặp chính xác',
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
            fireworks.grandFinale();
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
        setStreak(0);
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
  }, [selectedPromptId, selectedAnswerId, matchedIds, pairs.length, rawQuestions, score, timeSpentSeconds, answers, onFinish, streak]);

  const handleRestart = () => {
    setMatchedIds([]);
    setSelectedPromptId(null);
    setSelectedAnswerId(null);
    setWrongPair(null);
    setScore(0);
    setAttempts(0);
    setStreak(0);
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
      {/* 3D Neon Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/95 border border-emerald-500/30 rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-300/40">
            🔗
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[180px] sm:max-w-xs font-display">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-300 font-mono font-bold">
                Đã ghép: {matchedIds.length} / {pairs.length} Cặp
              </span>
              {streak >= 2 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-bounce">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {streak} Combo!
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{gameScoringService.formatTime(timeSpentSeconds)}</span>
          </div>

          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl text-xs font-black text-emerald-300 font-mono shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            {score} pts
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all cursor-pointer"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Matching instructions banner */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-300 shadow-inner">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Chạm vào một câu hỏi ở cột trái, sau đó chạm vào câu trả lời tương ứng ở cột phải.</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
          Số lần thử: {attempts}
        </span>
      </div>

      {/* 2-Column 3D Neon Matching Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Questions / Prompts */}
        <div className="space-y-3">
          <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block px-1">
            Cột Câu hỏi & Đề mục ({leftPrompts.length})
          </span>
          {leftPrompts.map((p) => {
            const isMatched = matchedIds.includes(p.id);
            const isSelected = selectedPromptId === p.id;
            const isWrong = wrongPair?.promptId === p.id;

            let cardStyle =
              'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 text-slate-200 shadow-[0_4px_0_rgba(15,23,42,0.8)] hover:border-emerald-500/60 hover:shadow-[0_4px_0_rgba(15,23,42,0.8),0_0_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 cursor-pointer';

            if (isMatched) {
              cardStyle =
                'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_2px_0_rgba(6,95,70,0.5),0_0_12px_rgba(16,185,129,0.3)] opacity-70 pointer-events-none';
            } else if (isWrong) {
              cardStyle =
                'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-shake';
            } else if (isSelected) {
              cardStyle =
                'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-[0_4px_0_rgba(4,120,87,0.8),0_0_25px_rgba(16,185,129,0.6)] translate-y-0.5';
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
                <span className="text-xs sm:text-sm font-semibold leading-relaxed">
                  {p.promptText}
                </span>
                {isMatched && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Right Column: Answers / Definitions */}
        <div className="space-y-3">
          <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block px-1">
            Cột Câu trả lời & Định nghĩa ({rightAnswers.length})
          </span>
          {rightAnswers.map((a) => {
            const isMatched = matchedIds.includes(a.id);
            const isSelected = selectedAnswerId === a.id;
            const isWrong = wrongPair?.answerId === a.id;

            let cardStyle =
              'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 text-slate-200 shadow-[0_4px_0_rgba(15,23,42,0.8)] hover:border-indigo-500/60 hover:shadow-[0_4px_0_rgba(15,23,42,0.8),0_0_15px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 cursor-pointer';

            if (isMatched) {
              cardStyle =
                'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_2px_0_rgba(6,95,70,0.5),0_0_12px_rgba(16,185,129,0.3)] opacity-70 pointer-events-none';
            } else if (isWrong) {
              cardStyle =
                'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-shake';
            } else if (isSelected) {
              cardStyle =
                'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-[0_4px_0_rgba(67,56,202,0.8),0_0_25px_rgba(99,102,241,0.6)] translate-y-0.5';
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
                {isMatched && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
