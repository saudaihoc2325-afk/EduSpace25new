import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileDown,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Printer,
  Sparkles,
  HelpCircle,
  Layers,
  GraduationCap,
  Calendar,
  Check,
  UserCheck,
  Gamepad2,
  BookOpen,
} from 'lucide-react';
import { Assignment, StudentResult } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import {
  groupResultsByStudent,
  StudentPerformanceSummary,
} from '../../utils/analyticsUtils';
import { exportResultsToCsv } from '../../utils/exportUtils';
import { StudentDetailModal } from './results/StudentDetailModal';
import { ClassStatisticsTab } from './results/ClassStatisticsTab';
import { QuestionAnalysisTab } from './results/QuestionAnalysisTab';
import { PrintReportModal } from './results/PrintReportModal';

interface ResultsViewProps {
  results: StudentResult[];
  assignments: Assignment[];
  initialSelectedAssignmentId?: string | null;
  onRefresh?: () => void;
}

type TabType = 'gradebook' | 'class-stats' | 'question-analysis';
type AttemptFilterType = 'all' | 'best' | 'latest';
type DateFilterType = 'all' | 'today' | '7days' | '30days';

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  assignments,
  initialSelectedAssignmentId,
  onRefresh,
}) => {
  const { showSuccess, showInfo } = useToast();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<TabType>('gradebook');

  // Filters State
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState<string>(
    initialSelectedAssignmentId || 'all'
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [attemptFilter, setAttemptFilter] = useState<AttemptFilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [performanceTierFilter, setPerformanceTierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Modals & Expandable rows
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [selectedStudentSummary, setSelectedStudentSummary] = useState<StudentPerformanceSummary | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract Unique Classes dynamically from raw results & assignments
  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>();
    results.forEach((r) => {
      if (r.studentClass) classes.add(r.studentClass.trim());
    });
    assignments.forEach((a) => {
      if (a.targetClass && a.targetClass !== 'All Classes' && a.targetClass !== 'General') {
        classes.add(a.targetClass.trim());
      }
    });
    return Array.from(classes).sort();
  }, [results, assignments]);

  // Compute Base Filtered Results (Assignment, Class, Date, Search)
  const baseFilteredResults = useMemo(() => {
    const now = new Date().getTime();

    return results.filter((res) => {
      // 1. Assignment Filter
      if (selectedAssignmentFilter !== 'all') {
        if (
          res.assignmentId !== selectedAssignmentFilter &&
          res.assignmentCode !== selectedAssignmentFilter
        ) {
          return false;
        }
      }

      // 2. Class Filter
      if (selectedClassFilter !== 'all') {
        if (res.studentClass?.trim().toLowerCase() !== selectedClassFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // 3. Date Filter
      if (dateFilter !== 'all') {
        const completedTime = new Date(res.completedAt).getTime();
        const diffDays = (now - completedTime) / (1000 * 3600 * 24);

        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === '7days' && diffDays > 7) return false;
        if (dateFilter === '30days' && diffDays > 30) return false;
      }

      // 4. Performance Tier Filter
      if (performanceTierFilter !== 'all') {
        const pct = res.percentage;
        if (performanceTierFilter === 'excellent' && pct < 90) return false;
        if (performanceTierFilter === 'good' && (pct < 80 || pct >= 90)) return false;
        if (performanceTierFilter === 'fair' && (pct < 65 || pct >= 80)) return false;
        if (performanceTierFilter === 'average' && (pct < 50 || pct >= 65)) return false;
        if (performanceTierFilter === 'below' && pct >= 50) return false;
      }

      // 5. Search Filter (Name, Class, SBD, Code)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = res.studentName?.toLowerCase().includes(q);
        const matchClass = res.studentClass?.toLowerCase().includes(q);
        const matchId = res.studentId?.toLowerCase().includes(q);
        const matchCode = res.assignmentCode?.toLowerCase().includes(q);
        const matchTitle = res.activityTitle?.toLowerCase().includes(q);

        if (!matchName && !matchClass && !matchId && !matchCode && !matchTitle) {
          return false;
        }
      }

      return true;
    });
  }, [
    results,
    selectedAssignmentFilter,
    selectedClassFilter,
    dateFilter,
    performanceTierFilter,
    searchQuery,
  ]);

  // Group by Student for Attempt Aggregations
  const studentSummaries = useMemo(() => {
    return groupResultsByStudent(baseFilteredResults);
  }, [baseFilteredResults]);

  // Apply Attempt View Filter (All / Best / Latest)
  const displayResults = useMemo(() => {
    if (attemptFilter === 'all') {
      return baseFilteredResults;
    }

    if (attemptFilter === 'best') {
      return studentSummaries.map((s) => {
        const bestAttempt =
          s.attempts.find((a) => a.percentage === s.bestPercentage) || s.attempts[0];
        return bestAttempt;
      });
    }

    if (attemptFilter === 'latest') {
      return studentSummaries.map((s) => s.attempts[0]); // most recent is first in timeline
    }

    return baseFilteredResults;
  }, [baseFilteredResults, studentSummaries, attemptFilter]);

  // Active Assignment Metadata
  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentFilter);
  const activeAssignmentTitle = activeAssignment
    ? `${activeAssignment.title} (${activeAssignment.assignmentCode})`
    : 'Tất cả bài tập';

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      showSuccess('Đã cập nhật dữ liệu sổ điểm mới nhất từ Firebase!');
    }, 600);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    exportResultsToCsv(displayResults, assignments, {
      assignmentTitle: activeAssignmentTitle,
      className: selectedClassFilter === 'all' ? 'Tất cả các lớp' : selectedClassFilter,
    });
    showSuccess('Đã xuất file sổ điểm Excel/CSV thành công!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              Results & Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-time Firestore
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sổ điểm thời gian thực, thống kê lớp học, phổ điểm phân bố, và ma trận phân tích câu hỏi học sinh.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="btn-refresh-results"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs rounded-xl"
          >
            {isRefreshing ? 'Đang tải...' : 'Làm mới'}
          </Button>

          {results.length > 0 && (
            <>
              <Button
                id="btn-print-teacher-report"
                variant="outline"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5 text-indigo-600" />}
                onClick={() => setIsPrintModalOpen(true)}
                className="text-xs rounded-xl"
              >
                In Báo Cáo
              </Button>

              <Button
                id="btn-export-csv-gradebook"
                variant="primary"
                size="sm"
                icon={<FileDown className="w-3.5 h-3.5" />}
                onClick={handleExportCSV}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20"
              >
                Xuất Excel / CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Main Analytics Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('gradebook')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'gradebook'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Sổ Điểm & Bài Nộp ({displayResults.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('class-stats')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'class-stats'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Thống Kê Lớp & Phổ Điểm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('question-analysis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'question-analysis'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Phân Tích Câu Hỏi & Ma Trận Đề</span>
        </button>
      </div>

      {/* 3. Comprehensive Filter Suite */}
      <Card variant="default" padding="sm" className="bg-slate-50/70 border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 items-center">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Input
              id="input-search-results-main"
              placeholder="Tìm theo tên học sinh, lớp, SBD hoặc mã bài..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Assignment Dropdown */}
          <div>
            <select
              id="select-filter-assignment-main"
              aria-label="Filter by Assignment"
              value={selectedAssignmentFilter}
              onChange={(e) => setSelectedAssignmentFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả bài tập ({assignments.length})</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} (Mã: {a.assignmentCode})
                </option>
              ))}
            </select>
          </div>

          {/* Class Dropdown */}
          <div>
            <select
              id="select-filter-class-main"
              aria-label="Filter by Class"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả các lớp ({uniqueClasses.length})</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Attempt Mode Dropdown */}
          <div>
            <select
              id="select-filter-attempt-mode"
              aria-label="Filter attempt view mode"
              value={attemptFilter}
              onChange={(e) => setAttemptFilter(e.target.value as AttemptFilterType)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả lượt nộp</option>
              <option value="best">Chỉ lấy điểm cao nhất</option>
              <option value="latest">Chỉ lấy điểm mới nhất</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-200/60 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Học lực:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'excellent', label: 'Xuất sắc (≥90%)' },
              { id: 'good', label: 'Giỏi (80-89%)' },
              { id: 'fair', label: 'Khá (65-79%)' },
              { id: 'average', label: 'TB (50-64%)' },
              { id: 'below', label: 'Cần cố gắng (<50%)' },
            ].map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setPerformanceTierFilter(tag.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  performanceTierFilter === tag.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Thời gian:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'today', label: 'Hôm nay' },
              { id: '7days', label: '7 ngày qua' },
            ].map((df) => (
              <button
                key={df.id}
                type="button"
                onClick={() => setDateFilter(df.id as DateFilterType)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                  dateFilter === df.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: GRADEBOOK & SUBMISSIONS TABLE */}
      {activeTab === 'gradebook' && (
        <div className="space-y-4">
          {displayResults.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="w-6 h-6" />}
              title="Chưa có kết quả nộp bài phù hợp"
              description="Kết quả làm bài của học sinh sẽ tự động đồng bộ lên đây sau khi học sinh nhập mã 6 chữ số và hoàn thành bài tập."
              actionLabel={assignments.length > 0 ? 'Xem danh sách bài tập' : 'Tạo bài tập mới'}
              onAction={() => {}}
            />
          ) : (
            <Card variant="default" padding="none" className="overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="p-3.5">Học sinh</th>
                      <th className="p-3.5">Lớp</th>
                      <th className="p-3.5">Bài tập & Mã</th>
                      <th className="p-3.5 text-center">Lần làm</th>
                      <th className="p-3.5 text-center">Điểm số</th>
                      <th className="p-3.5 text-center">Tỉ lệ đúng</th>
                      <th className="p-3.5 text-center">Thời gian</th>
                      <th className="p-3.5 text-right">Hoàn thành lúc</th>
                      <th className="p-3.5 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayResults.map((res) => {
                      const isExpanded = expandedResultId === res.id;
                      const studentSum = studentSummaries.find(
                        (s) =>
                          s.studentName.trim().toLowerCase() === res.studentName.trim().toLowerCase() &&
                          s.studentClass.trim().toLowerCase() === res.studentClass.trim().toLowerCase()
                      );

                      return (
                        <React.Fragment key={res.id || res.attemptId}>
                          <tr
                            id={`result-row-${res.id}`}
                            className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                            onClick={() => setExpandedResultId(isExpanded ? null : res.id)}
                          >
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{res.studentName}</span>
                              </div>
                              {res.studentId && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  SBD: {res.studentId}
                                </span>
                              )}
                            </td>

                            <td className="p-3.5">
                              <Badge variant="neutral" size="sm">
                                {res.studentClass}
                              </Badge>
                            </td>

                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]">
                                {res.activityTitle || 'Bài tập tiếng Anh'}
                              </div>
                              <span className="font-mono text-[10px] text-indigo-600 font-bold">
                                Mã: {res.assignmentCode}
                              </span>
                            </td>

                            <td className="p-3.5 text-center font-mono text-slate-600">
                              #{res.attemptNumber || 1}
                            </td>

                            <td className="p-3.5 text-center font-bold text-slate-900 font-mono">
                              {res.score}/{res.totalQuestions}
                            </td>

                            <td className="p-3.5 text-center">
                              <span
                                className={`font-bold px-2.5 py-1 rounded-full text-xs font-mono inline-block ${
                                  res.percentage >= 80
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : res.percentage >= 50
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {res.percentage}%
                              </span>
                            </td>

                            <td className="p-3.5 text-center text-slate-500 font-mono">
                              {Math.floor((res.timeSpentSeconds || 0) / 60)}m {(res.timeSpentSeconds || 0) % 60}s
                            </td>

                            <td className="p-3.5 text-right text-slate-500 text-[11px] font-mono">
                              {new Date(res.completedAt).toLocaleString('vi-VN', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>

                            <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {studentSum && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentSummary(studentSum)}
                                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
                                    title="Xem hồ sơ chi tiết học sinh"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setExpandedResultId(isExpanded ? null : res.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                  aria-label="Toggle answer details"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Question-by-Question Breakdown */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={9} className="p-4 sm:p-6 border-b border-slate-200">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                      <BookOpen className="w-4 h-4 text-indigo-600" />
                                      Chi tiết câu trả lời ({res.studentName} - Lần #{res.attemptNumber || 1})
                                    </h4>
                                    {studentSum && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedStudentSummary(studentSum)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                      >
                                        Xem lịch sử tất cả các lần làm bài ({studentSum.totalAttempts} lần) &rarr;
                                      </button>
                                    )}
                                  </div>

                                  {res.answers && res.answers.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {res.answers.map((ans, idx) => (
                                        <div
                                          key={ans.questionId || idx}
                                          className={`p-3 rounded-2xl border text-xs ${
                                            ans.isCorrect
                                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                              : 'bg-rose-50/70 border-rose-200 text-rose-950'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between font-bold mb-1">
                                            <span>Câu #{idx + 1}</span>
                                            <span className="flex items-center gap-1">
                                              {ans.isCorrect ? (
                                                <>
                                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                  <span className="text-emerald-700">Đúng (+{ans.pointsEarned || 10}đ)</span>
                                                </>
                                              ) : (
                                                <>
                                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                                  <span className="text-rose-700">Chưa chính xác</span>
                                                </>
                                              )}
                                            </span>
                                          </div>

                                          {ans.questionText && (
                                            <p className="text-[11px] text-slate-700 mb-2 font-medium">
                                              {ans.questionText}
                                            </p>
                                          )}

                                          <div className="space-y-1 text-[11px] pt-1.5 border-t border-slate-200/60">
                                            <div>
                                              <span className="text-slate-500">Học sinh chọn: </span>
                                              <strong className="font-mono text-slate-900">
                                                {ans.selectedAnswer || 'Chưa trả lời'}
                                              </strong>
                                            </div>
                                            {!ans.isCorrect && (
                                              <div>
                                                <span className="text-emerald-700 font-semibold">
                                                  Đáp án đúng:{' '}
                                                </span>
                                                <strong className="font-mono text-emerald-800">
                                                  {ans.correctAnswer}
                                                </strong>
                                              </div>
                                            )}
                                          </div>

                                          {ans.explanation && (
                                            <div className="mt-1.5 p-1.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-[10px] text-indigo-900">
                                              <strong>Giải thích: </strong>
                                              <span>{ans.explanation}</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400">
                                      Lượt nộp chỉ ghi nhận tổng điểm chung.
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: CLASS STATISTICS & HISTOGRAM */}
      {activeTab === 'class-stats' && (
        <ClassStatisticsTab
          results={baseFilteredResults}
          studentSummaries={studentSummaries}
          assignments={assignments}
          selectedClass={selectedClassFilter}
          onSelectStudent={(std) => setSelectedStudentSummary(std)}
        />
      )}

      {/* TAB 3: QUESTION-LEVEL ITEM ANALYSIS */}
      {activeTab === 'question-analysis' && (
        <QuestionAnalysisTab results={baseFilteredResults} />
      )}

      {/* 5. MODALS & DRILL-DOWN VIEWS */}

      {/* Student Profile & Attempt Timeline Modal */}
      {selectedStudentSummary && (
        <StudentDetailModal
          summary={selectedStudentSummary}
          onClose={() => setSelectedStudentSummary(null)}
        />
      )}

      {/* Printable Report Modal */}
      {isPrintModalOpen && (
        <PrintReportModal
          results={baseFilteredResults}
          studentSummaries={studentSummaries}
          assignments={assignments}
          activeAssignmentTitle={activeAssignmentTitle}
          activeClass={selectedClassFilter}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
