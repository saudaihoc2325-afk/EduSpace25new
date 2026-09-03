import React, { useEffect } from 'react';
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
import { StudentAnswerRecord } from '../../types';
import { gameScoringService } from '../../services/gameScoringService';
import { fireworks } from '../../utils/fireworks';
import { soundEffects } from '../../utils/soundEffects';

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

  // Trigger fireworks & victory fanfare on completion mount
  useEffect(() => {
    soundEffects.playVictory();
    fireworks.grandFinale();
  }, []);

  // Performance tier
  let badgeStyle = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]';
  let ratingText = 'Hoàn thành xuất sắc! 👏';
  let iconComponent = <Award className="w-12 h-12 text-indigo-400" />;

  if (percentage >= 90) {
    badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
    ratingText = 'Đỉnh cao xuất sắc! 🌟';
    iconComponent = <Trophy className="w-12 h-12 text-amber-400 animate-bounce drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />;
  } else if (percentage >= 70) {
    badgeStyle = 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_20px_rgba(14,165,233,0.4)]';
    ratingText = 'Làm rất tốt! 🚀';
    iconComponent = <Sparkles className="w-12 h-12 text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" />;
  } else if (percentage < 50) {
    badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
    ratingText = 'Cố gắng thêm nhé! 💪';
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* 3D Neon Trophy Card */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-10 shadow-[0_16px_48px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-xl relative overflow-hidden">
        {/* Glow backdrop aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-b from-indigo-500/20 via-purple-500/15 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90" />

        <div className="relative z-10 space-y-6">
          {/* Header Trophy Box */}
          <div className="w-24 h-24 rounded-3xl bg-slate-950/90 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]">
            {iconComponent}
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
              <span className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black border ${badgeStyle}`}>
                {ratingText}
              </span>
              {isPreview && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  Chế độ xem trước (Teacher Preview)
                </span>
              )}
            </div>
            <h2 className="font-fluid-question font-extrabold text-white font-display tracking-tight leading-snug">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
              Định dạng: <span className="text-indigo-400 font-bold">{gameTypeLabel}</span> • Thời gian: <span className="font-mono text-slate-200">{gameScoringService.formatTime(timeSpentSeconds)}</span>
            </p>
          </div>

          {/* 3D Metric Stats Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-[0_4px_0_rgba(15,23,42,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-center text-indigo-400 mb-1">
                <Trophy className="w-4 h-4 mr-1" />
                <span className="text-xs font-bold text-slate-400">Tổng điểm</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">{score}</p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-[0_4px_0_rgba(15,23,42,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-center text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span className="text-xs font-bold text-slate-400">Số câu đúng</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {correctCount} / {totalQuestions}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-[0_4px_0_rgba(15,23,42,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-center text-sky-400 mb-1">
                <Percent className="w-4 h-4 mr-1" />
                <span className="text-xs font-bold text-slate-400">Độ chính xác</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-sky-400 font-mono">{percentage}%</p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-[0_4px_0_rgba(15,23,42,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-center text-amber-400 mb-1">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-xs font-bold text-slate-400">Thời gian</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">
                {gameScoringService.formatTime(timeSpentSeconds)}
              </p>
            </div>
          </div>

          {/* 3D Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-800/80">
            {onReviewAnswers && (
              <button
                type="button"
                onClick={onReviewAnswers}
                className="px-5 py-3 text-xs sm:text-sm font-bold text-slate-200 bg-slate-850 hover:bg-slate-800 hover:text-white rounded-xl border border-slate-700 shadow-[0_3px_0_rgba(15,23,42,0.8)] active:translate-y-0.5 flex items-center gap-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Xem lại bài làm ({answers.length})
              </button>
            )}

            <button
              type="button"
              onClick={onPlayAgain}
              className="px-6 py-3 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-[0_4px_0_rgba(67,56,202,0.8),0_0_20px_rgba(99,102,241,0.4)] active:translate-y-1 active:shadow-[0_1px_0_rgba(67,56,202,0.8)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Chơi lại lần nữa
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-5 py-3 text-xs sm:text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Thoát
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
