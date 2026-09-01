import React from 'react';
import {
  TrendingUp,
  Users,
  Award,
  Clock,
  CheckCircle2,
  BarChart3,
  Flame,
  Medal,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { StudentResult, Assignment } from '../../../types';
import {
  StudentPerformanceSummary,
  computeScoreDistribution,
  computePerformanceTiers,
  ScoreDistributionBracket,
  PerformanceTier,
} from '../../../utils/analyticsUtils';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';

interface ClassStatisticsTabProps {
  results: StudentResult[];
  studentSummaries: StudentPerformanceSummary[];
  assignments: Assignment[];
  selectedClass: string;
  onSelectStudent: (student: StudentPerformanceSummary) => void;
}

export const ClassStatisticsTab: React.FC<ClassStatisticsTabProps> = ({
  results,
  studentSummaries,
  assignments,
  selectedClass,
  onSelectStudent,
}) => {
  const totalSubmissions = results.length;
  const uniqueStudentsCount = studentSummaries.length;

  const averageScorePct =
    totalSubmissions > 0
      ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions)
      : 0;

  const highestScore =
    totalSubmissions > 0 ? Math.max(...results.map((r) => r.percentage)) : 0;
  const lowestScore =
    totalSubmissions > 0 ? Math.min(...results.map((r) => r.percentage)) : 0;

  const averageTimeSpent =
    totalSubmissions > 0
      ? Math.round(
          results.reduce((acc, r) => acc + (r.timeSpentSeconds || 0), 0) / totalSubmissions
        )
      : 0;

  const scoreBrackets: ScoreDistributionBracket[] = computeScoreDistribution(results);
  const performanceTiers: PerformanceTier[] = computePerformanceTiers(results);

  // Top Ranked Students by Best Percentage
  const rankedStudents = [...studentSummaries].sort(
    (a, b) => b.bestPercentage - a.bestPercentage || a.averageTimeSpentSeconds - b.averageTimeSpentSeconds
  );

  const maxBracketCount = Math.max(...scoreBrackets.map((b) => b.count), 1);

  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
            Tổng Lượt Nộp
          </span>
          <div className="text-2xl font-black text-slate-900 font-display mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {totalSubmissions}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {uniqueStudentsCount} học sinh tham gia
          </span>
        </Card>

        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
            Điểm Trung Bình
          </span>
          <div className="text-2xl font-black text-emerald-600 font-display mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            {averageScorePct}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Thang 10: {((averageScorePct / 100) * 10).toFixed(1)} / 10
          </span>
        </Card>

        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
            Cao Nhất / Thấp Nhất
          </span>
          <div className="text-2xl font-black text-slate-900 font-display mt-1 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span className="text-emerald-600">{highestScore}%</span>
            <span className="text-xs text-slate-400 font-normal">/ {lowestScore}%</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Độ lệch: {highestScore - lowestScore}%
          </span>
        </Card>

        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
            Thời Gian TB
          </span>
          <div className="text-2xl font-black text-purple-600 font-display mt-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            {Math.floor(averageTimeSpent / 60)}m {averageTimeSpent % 60}s
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Mỗi lượt làm bài
          </span>
        </Card>

        <Card variant="default" padding="sm" className="bg-white col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
            Tỉ Lệ Đạt (≥ 50%)
          </span>
          <div className="text-2xl font-black text-indigo-600 font-display mt-1 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            {totalSubmissions > 0
              ? Math.round((results.filter((r) => r.percentage >= 50).length / totalSubmissions) * 100)
              : 0}
            %
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {results.filter((r) => r.percentage >= 50).length}/{totalSubmissions} lượt đạt chuẩn
          </span>
        </Card>
      </div>

      {/* 2. Visual Score Distribution Histogram & Academic Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Histogram */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="default" padding="md" className="space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Phổ Điểm Chi Tiết (Score Distribution)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân bố số lượng học sinh theo các dải điểm phần trăm
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                N = {totalSubmissions} bài nộp
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {scoreBrackets.map((bracket) => {
                const barWidth = Math.max(4, Math.round((bracket.count / maxBracketCount) * 100));
                return (
                  <div key={bracket.range} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 w-20">{bracket.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold">{bracket.count} bài</span>
                        <span className="text-slate-400 font-mono text-[11px]">({bracket.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${bracket.bgClass}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Academic Performance Tiers */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="default" padding="md" className="space-y-3 bg-white">
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Xếp Loại Học Lực
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân loại theo chuẩn đánh giá kết quả học tập
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {performanceTiers.map((tier) => (
                <div
                  key={tier.tier}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${tier.badgeClass}`}>
                      {tier.label}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{tier.subLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>{tier.count} học sinh</span>
                    <span className="text-slate-400 font-normal">({tier.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Class Leaderboard / Top Ranked Students */}
      <Card variant="default" padding="none" className="overflow-hidden bg-white">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold font-display text-slate-900">
              Bảng Xếp Hạng & Điểm Từng Học Sinh ({rankedStudents.length} học sinh)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {selectedClass === 'all' ? 'Tất cả các lớp' : `Lớp ${selectedClass}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3.5 text-center w-12">Hạng</th>
                <th className="p-3.5">Học sinh</th>
                <th className="p-3.5">Lớp</th>
                <th className="p-3.5 text-center">Số lần làm</th>
                <th className="p-3.5 text-center">Điểm cao nhất</th>
                <th className="p-3.5 text-center">Điểm mới nhất</th>
                <th className="p-3.5 text-center">Điểm TB</th>
                <th className="p-3.5 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rankedStudents.map((std, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <tr
                    key={`${std.studentName}_${std.studentClass}`}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onSelectStudent(std)}
                  >
                    <td className="p-3.5 text-center font-bold font-mono">
                      {isTop1 ? (
                        <span className="inline-flex w-6 h-6 rounded-full bg-amber-100 text-amber-700 items-center justify-center text-xs">
                          🥇
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-flex w-6 h-6 rounded-full bg-slate-200 text-slate-700 items-center justify-center text-xs">
                          🥈
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-flex w-6 h-6 rounded-full bg-amber-900/10 text-amber-800 items-center justify-center text-xs">
                          🥉
                        </span>
                      ) : (
                        <span className="text-slate-400">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      {std.studentName}
                      {std.studentId && (
                        <span className="ml-1.5 text-[10px] text-slate-400 font-mono font-normal">
                          ({std.studentId})
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <Badge variant="neutral" size="sm">
                        {std.studentClass}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-center font-mono text-slate-700">
                      {std.totalAttempts}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="font-bold text-emerald-600 font-mono text-xs">
                        {std.bestPercentage}%
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono text-slate-700">
                      {std.latestPercentage}%
                    </td>

                    <td className="p-3.5 text-center font-mono font-semibold text-slate-800">
                      {std.averagePercentage}%
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(std);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                      >
                        Xem bài làm &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
