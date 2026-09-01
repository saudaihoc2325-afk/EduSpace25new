import React from 'react';
import {
  Trophy,
  Award,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Percent,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StudentAnswerRecord } from '../../types';
import { gameScoringService } from '../../services/gameScoringService';

interface GameCompletionScreenProps {
  title: string;
  gameTypeLabel: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeSpentSeconds: number;
  answers: StudentAnswerRecord[];
  onPlayAgain: () => void;
  onReviewAnswers?: () => void;
  onExit?: () => void;
  isPreview?: boolean;
}

export const GameCompletionScreen: React.FC<GameCompletionScreenProps> = ({
  title,
  gameTypeLabel,
  score,
  totalQuestions,
  correctCount,
  timeSpentSeconds,
  answers,
  onPlayAgain,
  onReviewAnswers,
  onExit,
  isPreview = false,
}) => {
  const percentage = gameScoringService.calculatePercentage(correctCount, totalQuestions);

  // Performance tier
  let badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  let ratingText = 'Good Effort!';
  let iconComponent = <Award className="w-12 h-12 text-indigo-400" />;

  if (percentage >= 90) {
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    ratingText = 'Outstanding Performance! 🌟';
    iconComponent = <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />;
  } else if (percentage >= 70) {
    badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    ratingText = 'Great Job! 🚀';
    iconComponent = <Sparkles className="w-12 h-12 text-sky-400" />;
  } else if (percentage < 50) {
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    ratingText = 'Keep Practicing! 💪';
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Trophy Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-indigo-600/20 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-6">
          {/* Header Icon */}
          <div className="w-24 h-24 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto shadow-inner">
            {iconComponent}
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                {ratingText}
              </span>
              {isPreview && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Teacher Preview
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {title}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Format: {gameTypeLabel} • Completed in {gameScoringService.formatTime(timeSpentSeconds)}
            </p>
          </div>

          {/* Metric Stats Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-center text-indigo-400 mb-1">
                <Trophy className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium text-slate-400">Total Score</span>
              </div>
              <p className="text-2xl font-black text-white font-mono">{score}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-center text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium text-slate-400">Correct</span>
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {correctCount} / {totalQuestions}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-center text-sky-400 mb-1">
                <Percent className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium text-slate-400">Accuracy</span>
              </div>
              <p className="text-2xl font-black text-sky-400 font-mono">{percentage}%</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-center text-amber-400 mb-1">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium text-slate-400">Time</span>
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {gameScoringService.formatTime(timeSpentSeconds)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-800/80">
            {onReviewAnswers && (
              <button
                type="button"
                onClick={onReviewAnswers}
                className="px-5 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-750 hover:text-white rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Review Answers ({answers.length})
              </button>
            )}

            <button
              type="button"
              onClick={onPlayAgain}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
