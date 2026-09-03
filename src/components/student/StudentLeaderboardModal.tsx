import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  X,
  Medal,
  Clock,
  Calendar,
  Users,
  Award,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  User,
} from 'lucide-react';
import { StudentResult } from '../../types';
import { resultService } from '../../services/firestoreService';
import {
  computeLeaderboard,
  LeaderboardEntry,
  RankingMethod,
} from '../../utils/leaderboardUtils';

interface StudentLeaderboardModalProps {
  assignmentId: string;
  assignmentCode: string;
  activityTitle: string;
  currentStudentName: string;
  currentStudentClass: string;
  onClose: () => void;
}

export const StudentLeaderboardModal: React.FC<StudentLeaderboardModalProps> = ({
  assignmentId,
  assignmentCode,
  activityTitle,
  currentStudentName,
  currentStudentClass,
  onClose,
}) => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rankingMethod, setRankingMethod] = useState<RankingMethod>('best');

  useEffect(() => {
    let isMounted = true;
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const data = await resultService.getResultsByAssignment(assignmentId);
        if (isMounted) {
          setResults(data);
        }
      } catch (err) {
        console.warn('Could not load assignment results for student leaderboard:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadResults();
    return () => {
      isMounted = false;
    };
  }, [assignmentId]);

  // Compute Leaderboard strictly scoped to this assignment (Prompt 16 Section 14)
  const { entries, stats } = useMemo(() => {
    return computeLeaderboard({
      results,
      activityFilter: assignmentId,
      rankingMethod,
    });
  }, [results, assignmentId, rankingMethod]);

  // Current student ranking position
  const myEntry = useMemo(() => {
    if (!currentStudentName) return null;
    const cleanName = currentStudentName.trim().toLowerCase();
    const cleanClass = currentStudentClass ? currentStudentClass.trim().toLowerCase() : '';
    return entries.find(
      (e) =>
        e.studentName.trim().toLowerCase() === cleanName &&
        (!cleanClass || e.studentClass.trim().toLowerCase() === cleanClass)
    );
  }, [entries, currentStudentName, currentStudentClass]);

  return (
    <div
      id="modal-student-leaderboard"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Bảng Xếp Hạng</span>
                <span className="text-xs font-mono font-normal text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Mã: {assignmentCode}
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                {activityTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-student-leaderboard"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Student Highlight Banner if ranked */}
        {myEntry && (
          <div className="bg-indigo-950/60 border-b border-indigo-500/30 p-3 sm:px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <User className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="text-indigo-300 font-semibold">Vị trí của bạn: </span>
                <strong className="text-white font-bold">{myEntry.studentName}</strong>
                <span className="text-slate-400 ml-1">({myEntry.studentClass})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-full bg-indigo-500 text-white font-black text-xs">
                Hạng #{myEntry.rank}
              </span>
              <span className="text-emerald-400 font-bold">
                {myEntry.score.toFixed(1)} đ ({myEntry.percentage}%)
              </span>
            </div>
          </div>
        )}

        {/* Mini Stats Bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-800 bg-slate-950/50 border-b border-slate-800 text-center py-2.5 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng học sinh</span>
            <strong className="text-sm font-mono text-white">{stats.studentsRanked}</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Điểm cao nhất</span>
            <strong className="text-sm font-mono text-amber-400">{stats.highestScore.toFixed(1)} / 10</strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Điểm trung bình</span>
            <strong className="text-sm font-mono text-emerald-400">{stats.averageScore.toFixed(1)} / 10</strong>
          </div>
        </div>

        {/* Content Body / Leaderboard List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
              <span>Đang tải bảng xếp hạng...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Trophy className="w-8 h-8 opacity-40 mx-auto mb-2 text-amber-400" />
              <p>Chưa có học sinh nào hoàn thành bài tập này.</p>
              <p className="text-slate-500 mt-0.5">Hãy là người đầu tiên ghi danh trên bảng vàng!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map((entry) => {
                const isMe =
                  myEntry &&
                  entry.studentName.trim().toLowerCase() === myEntry.studentName.trim().toLowerCase() &&
                  entry.studentClass.trim().toLowerCase() === myEntry.studentClass.trim().toLowerCase();

                const isRank1 = entry.rank === 1;
                const isRank2 = entry.rank === 2;
                const isRank3 = entry.rank === 3;

                return (
                  <div
                    key={`${entry.studentName}_${entry.rank}`}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-colors text-xs ${
                      isMe
                        ? 'bg-indigo-900/40 border-indigo-500/60 shadow-md shadow-indigo-950/50'
                        : isRank1
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : isRank2
                        ? 'bg-slate-800/60 border-slate-600/40'
                        : isRank3
                        ? 'bg-orange-950/20 border-orange-500/30'
                        : 'bg-slate-800/30 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Left: Rank & Student Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 text-center shrink-0 font-bold font-mono">
                        {isRank1 ? (
                          <span className="text-base">🥇 1</span>
                        ) : isRank2 ? (
                          <span className="text-base">🥈 2</span>
                        ) : isRank3 ? (
                          <span className="text-base">🥉 3</span>
                        ) : (
                          <span className="text-slate-400">#{entry.rank}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-white truncate flex items-center gap-1.5">
                          <span>{entry.studentName}</span>
                          {isMe && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white px-1.5 py-0.2 rounded font-sans">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>Lớp {entry.studentClass}</span>
                          <span className="text-slate-600">•</span>
                          <span className="font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {entry.timeFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Score and Date */}
                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-sm text-amber-300">
                        {entry.score.toFixed(1)} đ
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {entry.dateFormatted}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">
            {rankingMethod === 'best' ? 'Tính theo điểm cao nhất (Best Score)' : 'Tính theo lượt làm mới nhất'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
