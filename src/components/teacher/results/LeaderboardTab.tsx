import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Clock,
  Calendar,
  Users,
  Award,
  Filter,
  RotateCcw,
  Search,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Assignment, StudentResult, Activity } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import {
  computeLeaderboard,
  RankingMethod,
  LeaderboardEntry,
  LeaderboardStats,
} from '../../../utils/leaderboardUtils';

interface LeaderboardTabProps {
  results: StudentResult[];
  assignments: Assignment[];
  activities?: Activity[];
  availableClasses: string[];
  initialAssignmentFilter?: string;
  initialClassFilter?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  onSelectStudent?: (studentName: string, studentClass: string) => void;
  onDeleteResult?: (resultId: string) => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  results,
  assignments,
  activities = [],
  availableClasses,
  initialAssignmentFilter = 'all',
  initialClassFilter = 'all',
  initialStartDate = '',
  initialEndDate = '',
  onSelectStudent,
  onDeleteResult,
}) => {
  // Filters state (Prompt 16 Sections 6, 7, 8, 9, 10, 13)
  const [activityFilter, setActivityFilter] = useState<string>(initialAssignmentFilter);
  const [classFilter, setClassFilter] = useState<string>(initialClassFilter);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [rankingMethod, setRankingMethod] = useState<RankingMethod>('best');

  // Clear filters
  const handleClearFilters = () => {
    setActivityFilter('all');
    setClassFilter('all');
    setStudentSearch('');
    setStartDate('');
    setEndDate('');
    setRankingMethod('best');
  };

  const hasActiveFilters =
    activityFilter !== 'all' ||
    classFilter !== 'all' ||
    studentSearch.trim() !== '' ||
    startDate !== '' ||
    endDate !== '' ||
    rankingMethod !== 'best';

  // Compute Leaderboard and Statistics (Prompt 16 Sections 4, 10, 19)
  const { entries, stats } = useMemo(() => {
    return computeLeaderboard({
      results,
      activityFilter,
      classFilter,
      studentSearch,
      startDate,
      endDate,
      rankingMethod,
    });
  }, [results, activityFilter, classFilter, studentSearch, startDate, endDate, rankingMethod]);

  // Top 3 Podium Students (Section 12)
  const topThree = useMemo(() => {
    return entries.slice(0, 3);
  }, [entries]);

  // Remaining Students (Rank 4+)
  const remainingEntries = useMemo(() => {
    return entries.slice(3);
  }, [entries]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="section-leaderboard">
      {/* 1. Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 shadow-sm inline-flex">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <span>BẢNG XẾP HẠNG (LEADERBOARD)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Xếp hạng học sinh theo điểm số thực tế, tối ưu thời gian hoàn thành và lượt làm bài.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={rankingMethod === 'best' ? 'primary' : 'neutral'}
            size="md"
            className="font-mono text-xs"
          >
            Chế độ: {rankingMethod === 'best' ? 'Điểm cao nhất (Best Score)' : 'Lượt làm gần nhất (Latest Attempt)'}
          </Badge>
        </div>
      </div>

      {/* 2. Leaderboard Filter Suite (Prompt 16 Section 13) */}
      <Card variant="default" padding="md" className="bg-slate-50/80 border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bộ lọc Bảng Xếp Hạng</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              id="btn-clear-leaderboard-filters"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa bộ lọc (Clear)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Filter 1: Activity / Assignment */}
          <div className="space-y-1">
            <label
              htmlFor="filter-leaderboard-activity"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Hoạt động / Bài tập
            </label>
            <select
              id="filter-leaderboard-activity"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">TẤT CẢ HOẠT ĐỘNG ({assignments.length})</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.assignmentCode})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Class */}
          <div className="space-y-1">
            <label
              htmlFor="filter-leaderboard-class"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Lớp học
            </label>
            <select
              id="filter-leaderboard-class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">TẤT CẢ CÁC LỚP</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Student Search */}
          <div className="space-y-1">
            <label
              htmlFor="filter-leaderboard-student"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Tìm học sinh
            </label>
            <div className="relative">
              <input
                id="filter-leaderboard-student"
                type="text"
                placeholder="Tên học sinh..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-2.5 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Filter 4: From Date */}
          <div className="space-y-1">
            <label
              htmlFor="filter-leaderboard-from-date"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Từ ngày (From)
            </label>
            <input
              id="filter-leaderboard-from-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Filter 5: To Date (Whole Day Inclusive) */}
          <div className="space-y-1">
            <label
              htmlFor="filter-leaderboard-to-date"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Đến ngày (To)
            </label>
            <input
              id="filter-leaderboard-to-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Filter 6: Ranking Method */}
          <div className="space-y-1">
            <label
              htmlFor="filter-leaderboard-method"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Cách tính điểm
            </label>
            <select
              id="filter-leaderboard-method"
              value={rankingMethod}
              onChange={(e) => setRankingMethod(e.target.value as RankingMethod)}
              className="w-full bg-white border border-indigo-300 rounded-xl px-2.5 py-2 text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="best">Điểm cao nhất (Best Score)</option>
              <option value="latest">Lượt nộp gần nhất (Latest)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 3. Filtered Summary Statistics (Prompt 16 Section 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="default" padding="sm" className="bg-white border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">
                Học sinh xếp hạng
              </span>
              <span className="text-xl font-black font-mono text-slate-900">
                {stats.studentsRanked}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="bg-white border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">
                Điểm trung bình
              </span>
              <span className="text-xl font-black font-mono text-emerald-700">
                {stats.averageScore.toFixed(1)} / 10
              </span>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="bg-white border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">
                Điểm cao nhất
              </span>
              <span className="text-xl font-black font-mono text-amber-700">
                {stats.highestScore.toFixed(1)} / 10
              </span>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="bg-white border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">
                Thời gian TB
              </span>
              <span className="text-xl font-black font-mono text-sky-700">
                {stats.averageTimeFormatted}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. No Data State (Prompt 16 Section 20) */}
      {entries.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center py-12 bg-white border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 opacity-50" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No results available for the selected filters.
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Không có kết quả nào phù hợp với bộ lọc đã chọn. Hãy thử chọn lại bài tập, lớp học hoặc mở rộng khoảng thời gian.
          </p>
          {hasActiveFilters && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="rounded-xl text-xs"
              >
                Đặt lại toàn bộ bộ lọc
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* 5. TOP 3 PODIUM DISPLAY (Prompt 16 Section 12) - Sleek, Grade 10-12 Appropriate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Vinh danh Top 3 Dẫn Đầu</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Quy tắc xếp hạng: Điểm cao hơn &rarr; Thời gian ngắn hơn &rarr; Nộp sớm hơn
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* RANK 1 - GOLD */}
              {topThree[0] && (
                <div
                  id={`leaderboard-podium-rank-1`}
                  className="order-1 md:order-2 relative bg-gradient-to-b from-amber-50/90 to-amber-100/40 border-2 border-amber-300 rounded-3xl p-5 shadow-lg shadow-amber-500/10 flex flex-col justify-between transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">🥇</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full font-mono">
                          1st Place
                        </span>
                        <div className="text-xs text-amber-900 font-bold mt-0.5">QUÁN QUÂN</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-amber-950">
                        {topThree[0].score.toFixed(1)}
                      </div>
                      <div className="text-[10px] font-bold text-amber-700">
                        {topThree[0].percentage}% ({topThree[0].rawCorrect}/{topThree[0].totalQuestions})
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 truncate">
                        {topThree[0].studentName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                        <span className="font-bold px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-950">
                          Lớp {topThree[0].studentClass}
                        </span>
                        {topThree[0].totalAttempts > 1 && (
                          <span className="text-[11px] text-slate-500">
                            (Lần #{topThree[0].attemptNumber}/{topThree[0].totalAttempts})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-200/70 flex items-center justify-between text-xs font-mono text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <strong>{topThree[0].timeFormatted}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{topThree[0].dateFormatted}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* RANK 2 - SILVER */}
              {topThree[1] && (
                <div
                  id={`leaderboard-podium-rank-2`}
                  className="order-2 md:order-1 relative bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-300 rounded-3xl p-5 shadow-md shadow-slate-200/50 flex flex-col justify-between transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">🥈</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full font-mono">
                          2nd Place
                        </span>
                        <div className="text-xs text-slate-700 font-bold mt-0.5">Á QUÂN 1</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-slate-900">
                        {topThree[1].score.toFixed(1)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {topThree[1].percentage}% ({topThree[1].rawCorrect}/{topThree[1].totalQuestions})
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 truncate">
                        {topThree[1].studentName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                        <span className="font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-900">
                          Lớp {topThree[1].studentClass}
                        </span>
                        {topThree[1].totalAttempts > 1 && (
                          <span className="text-[11px] text-slate-500">
                            (Lần #{topThree[1].attemptNumber}/{topThree[1].totalAttempts})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-700" />
                        <strong>{topThree[1].timeFormatted}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{topThree[1].dateFormatted}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* RANK 3 - BRONZE */}
              {topThree[2] && (
                <div
                  id={`leaderboard-podium-rank-3`}
                  className="order-3 relative bg-gradient-to-b from-orange-50/70 to-amber-100/30 border border-orange-200 rounded-3xl p-5 shadow-md shadow-orange-900/5 flex flex-col justify-between transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">🥉</span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-200/80 px-2 py-0.5 rounded-full font-mono">
                          3rd Place
                        </span>
                        <div className="text-xs text-orange-900 font-bold mt-0.5">Á QUÂN 2</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-orange-950">
                        {topThree[2].score.toFixed(1)}
                      </div>
                      <div className="text-[10px] font-bold text-orange-700">
                        {topThree[2].percentage}% ({topThree[2].rawCorrect}/{topThree[2].totalQuestions})
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 truncate">
                        {topThree[2].studentName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                        <span className="font-bold px-2 py-0.5 rounded-md bg-orange-200/60 text-orange-950">
                          Lớp {topThree[2].studentClass}
                        </span>
                        {topThree[2].totalAttempts > 1 && (
                          <span className="text-[11px] text-slate-500">
                            (Lần #{topThree[2].attemptNumber}/{topThree[2].totalAttempts})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-orange-200/70 flex items-center justify-between text-xs font-mono text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-orange-800" />
                        <strong>{topThree[2].timeFormatted}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{topThree[2].dateFormatted}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. COMPLETE LEADERBOARD TABLE (Prompt 16 Sections 5, 12, 13) */}
          <Card variant="default" padding="none" className="bg-white border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Bảng Tổng Sắp Xếp Hạng Đầy Đủ ({entries.length} học sinh)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Định dạng: Điểm (Scale 10) • Thời gian (mm:ss) • Ngày nộp (dd/mm/yyyy)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs" id="table-leaderboard-full">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider font-mono">
                    <th className="p-3.5 text-center w-16">Hạng (Rank)</th>
                    <th className="p-3.5">Học Sinh (Student)</th>
                    <th className="p-3.5">Lớp (Class)</th>
                    {activityFilter === 'all' && <th className="p-3.5">Bài Tập (Activity)</th>}
                    <th className="p-3.5 text-center">Điểm Số (Score)</th>
                    <th className="p-3.5 text-center">Thời Gian (Time)</th>
                    <th className="p-3.5 text-right">Ngày Nộp (Date)</th>
                    {onSelectStudent && <th className="p-3.5 text-center w-16">Chi Tiết</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {entries.map((entry) => {
                    // Top 3 medals or rank numbers
                    const isRank1 = entry.rank === 1;
                    const isRank2 = entry.rank === 2;
                    const isRank3 = entry.rank === 3;
                    const isTopThree = isRank1 || isRank2 || isRank3;

                    return (
                      <tr
                        key={`${entry.studentName}_${entry.studentClass}_${entry.rank}`}
                        id={`leaderboard-row-rank-${entry.rank}`}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isRank1
                            ? 'bg-amber-50/40 font-semibold'
                            : isRank2
                            ? 'bg-slate-50/40'
                            : isRank3
                            ? 'bg-orange-50/20'
                            : ''
                        }`}
                      >
                        {/* Rank Column with Medals for Top 3 */}
                        <td className="p-3.5 text-center font-mono font-bold">
                          {isRank1 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-extrabold text-sm">
                              🥇 1
                            </span>
                          ) : isRank2 ? (
                            <span className="inline-flex items-center gap-1 text-slate-700 font-extrabold text-sm">
                              🥈 2
                            </span>
                          ) : isRank3 ? (
                            <span className="inline-flex items-center gap-1 text-orange-700 font-extrabold text-sm">
                              🥉 3
                            </span>
                          ) : (
                            <span className="inline-block w-6 text-center text-slate-600 font-bold">
                              {entry.rank}
                            </span>
                          )}
                        </td>

                        {/* Student Name */}
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{entry.studentName}</span>
                            {isTopThree && (
                              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          {entry.studentId && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              SBD: {entry.studentId}
                            </span>
                          )}
                        </td>

                        {/* Class */}
                        <td className="p-3.5">
                          <Badge variant="neutral" size="sm" className="font-bold">
                            {entry.studentClass}
                          </Badge>
                        </td>

                        {/* Activity Title if showing all */}
                        {activityFilter === 'all' && (
                          <td className="p-3.5 max-w-[200px]">
                            <div className="text-slate-800 font-medium truncate">
                              {entry.activityTitle}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              Mã: {entry.assignmentCode}
                            </span>
                          </td>
                        )}

                        {/* Score (10-point scale + badge) */}
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-base font-black font-mono text-slate-900">
                              {entry.score.toFixed(1)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                entry.percentage >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : entry.percentage >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {entry.percentage}%
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {entry.rawCorrect}/{entry.totalQuestions} câu
                          </div>
                        </td>

                        {/* Time (Formatted MM:SS) */}
                        <td className="p-3.5 text-center font-mono text-slate-700 font-bold">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{entry.timeFormatted}</span>
                          </div>
                        </td>

                        {/* Date (DD/MM/YYYY) */}
                        <td className="p-3.5 text-right font-mono text-slate-600 text-[11px]">
                          <div title={entry.dateTimeFormatted}>
                            {entry.dateFormatted}
                          </div>
                        </td>

                        {/* Optional Student Detail Drilldown */}
                        {onSelectStudent && (
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => onSelectStudent(entry.studentName, entry.studentClass)}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Xem chi tiết học sinh"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
