import React, { useState, useMemo, useEffect } from 'react';
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Flame,
  Sparkles,
  TrendingDown,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowUpDown,
  BookOpen,
  Eye,
  X,
  Layers,
  Award,
  Edit3,
  Table,
  SlidersHorizontal,
  FileSpreadsheet,
  Grid,
} from 'lucide-react';
import { StudentResult, Activity, QuestionSet, Assignment, QuestionItem } from '../../../types';
import {
  analyzeQuestions,
  hasQuestionLevelResponses,
  QuestionAnalysisItem,
} from '../../../utils/analyticsUtils';
import {
  buildTestBlueprintMatrix,
  TestBlueprintMatrix,
  MatrixQuestionRow,
} from '../../../utils/matrixUtils';
import { questionSetService } from '../../../services/firestoreService';
import { useToast } from '../../../context/ToastContext';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { MatrixMetadataModal } from './MatrixMetadataModal';

interface QuestionAnalysisTabProps {
  results: StudentResult[];
  activities?: Activity[];
  questionSets?: QuestionSet[];
  assignments?: Assignment[];
  selectedAssignmentId?: string;
  onUpdateQuestionSet?: (updatedSet: QuestionSet) => Promise<void> | void;
}

type SubSectionView = 'all' | 'analysis' | 'matrix';
type SortOption = 'error_desc' | 'error_asc' | 'attempts_desc' | 'q_number';
type ErrorFilter = 'all' | 'high' | 'medium' | 'low';

export const QuestionAnalysisTab: React.FC<QuestionAnalysisTabProps> = ({
  results,
  activities = [],
  questionSets = [],
  assignments = [],
  selectedAssignmentId,
  onUpdateQuestionSet,
}) => {
  const { showSuccess, showError } = useToast();

  // 1. Sub-Section View Selector (A only, B only, or Both)
  const [activeSubSection, setActiveSubSection] = useState<SubSectionView>('all');

  // 2. Local QuestionSets cache to support immediate Matrix updates upon editing
  const [localQuestionSets, setLocalQuestionSets] = useState<QuestionSet[]>(questionSets);

  useEffect(() => {
    setLocalQuestionSets(questionSets);
  }, [questionSets]);

  // 3. Determine Active QuestionSet based on selectedAssignmentId or first available
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string>('');

  useEffect(() => {
    if (selectedAssignmentId && selectedAssignmentId !== 'all') {
      const asgn = assignments.find((a) => a.id === selectedAssignmentId);
      if (asgn?.questionSetId) {
        setSelectedQuestionSetId(asgn.questionSetId);
        return;
      }
      if (asgn?.activityId) {
        const act = activities.find((a) => a.id === asgn.activityId);
        if (act?.questionSetId) {
          setSelectedQuestionSetId(act.questionSetId);
          return;
        }
        if (act?.questionSet?.id) {
          setSelectedQuestionSetId(act.questionSet.id);
          return;
        }
      }
    }

    // Default to first question set if current selection is invalid
    if (!selectedQuestionSetId) {
      if (localQuestionSets.length > 0) {
        setSelectedQuestionSetId(localQuestionSets[0].id);
      } else if (activities.length > 0 && activities[0].questionSet?.id) {
        setSelectedQuestionSetId(activities[0].questionSet.id);
      }
    }
  }, [selectedAssignmentId, assignments, activities, localQuestionSets, selectedQuestionSetId]);

  // Get active Question Set object
  const activeQuestionSet: QuestionSet | null = useMemo(() => {
    if (selectedQuestionSetId) {
      const found = localQuestionSets.find((qs) => qs.id === selectedQuestionSetId);
      if (found) return found;

      // Check inside activities
      const actWithSet = activities.find(
        (a) => a.questionSetId === selectedQuestionSetId || a.questionSet?.id === selectedQuestionSetId
      );
      if (actWithSet?.questionSet) return actWithSet.questionSet;
    }

    // Fallbacks
    if (localQuestionSets.length > 0) return localQuestionSets[0];
    if (activities.length > 0 && activities[0].questionSet) return activities[0].questionSet;
    return null;
  }, [selectedQuestionSetId, localQuestionSets, activities]);

  // 4. Test Blueprint / Matrix Calculation (Section B)
  const matrixData: TestBlueprintMatrix | null = useMemo(() => {
    if (!activeQuestionSet) return null;
    return buildTestBlueprintMatrix(activeQuestionSet);
  }, [activeQuestionSet]);

  // 5. Question Analysis Calculation (Section A)
  const hasData = useMemo(() => hasQuestionLevelResponses(results), [results]);

  const questionAnalysisItems: QuestionAnalysisItem[] = useMemo(() => {
    return analyzeQuestions(
      results,
      activities,
      localQuestionSets,
      activeQuestionSet?.id || null
    );
  }, [results, activities, localQuestionSets, activeQuestionSet]);

  // Count items with actual student attempts
  const attemptedItems = useMemo(
    () => questionAnalysisItems.filter((q) => q.hasValidResponseData && q.timesAttempted > 0),
    [questionAnalysisItems]
  );

  // Top questions with most errors
  const topErrorQuestions = useMemo(() => {
    return [...attemptedItems]
      .sort((a, b) => b.errorRate - a.errorRate || b.wrongAnswers - a.wrongAnswers)
      .slice(0, 3);
  }, [attemptedItems]);

  // Filter and Sort for Section A
  const [searchQuery, setSearchQuery] = useState('');
  const [errorFilter, setErrorFilter] = useState<ErrorFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('error_desc');
  const [selectedAnalysisQuestion, setSelectedAnalysisQuestion] = useState<QuestionAnalysisItem | null>(null);

  const filteredAnalysisQuestions = useMemo(() => {
    let list = questionAnalysisItems.filter((q) => {
      const qText = q.questionText.toLowerCase();
      const qAns = q.correctAnswer.toLowerCase();
      const qNum = `câu ${q.questionNumber} #${q.questionNumber}`;
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        qText.includes(query) ||
        qAns.includes(query) ||
        qNum.includes(query);

      let matchesError = true;
      if (errorFilter === 'high') matchesError = q.errorRate >= 50;
      else if (errorFilter === 'medium') matchesError = q.errorRate >= 25 && q.errorRate < 50;
      else if (errorFilter === 'low') matchesError = q.errorRate < 25;

      return matchesSearch && matchesError;
    });

    list.sort((a, b) => {
      if (sortOption === 'error_desc') {
        return b.errorRate - a.errorRate || b.wrongAnswers - a.wrongAnswers || a.questionNumber - b.questionNumber;
      }
      if (sortOption === 'error_asc') {
        return a.errorRate - b.errorRate || a.wrongAnswers - b.wrongAnswers || a.questionNumber - b.questionNumber;
      }
      if (sortOption === 'attempts_desc') {
        return b.timesAttempted - a.timesAttempted || a.questionNumber - b.questionNumber;
      }
      if (sortOption === 'q_number') {
        return a.questionNumber - b.questionNumber;
      }
      return 0;
    });

    return list;
  }, [questionAnalysisItems, searchQuery, errorFilter, sortOption]);

  // Section B Matrix Filtering
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixSkillFilter, setMatrixSkillFilter] = useState('all');
  const [matrixLevelFilter, setMatrixLevelFilter] = useState('all');

  const filteredMatrixRows: MatrixQuestionRow[] = useMemo(() => {
    if (!matrixData) return [];
    return matrixData.rows.filter((row) => {
      const query = matrixSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        row.questionText.toLowerCase().includes(query) ||
        `câu ${row.questionNumber} #${row.questionNumber}`.includes(query) ||
        (row.topic && row.topic.toLowerCase().includes(query)) ||
        (row.unit && row.unit.toLowerCase().includes(query));

      const matchesSkill =
        matrixSkillFilter === 'all' ||
        (row.skill && row.skill.toLowerCase() === matrixSkillFilter.toLowerCase());

      const matchesLevel =
        matrixLevelFilter === 'all' ||
        (row.cognitiveLevel && row.cognitiveLevel.toLowerCase() === matrixLevelFilter.toLowerCase()) ||
        (row.difficulty && row.difficulty.toLowerCase() === matrixLevelFilter.toLowerCase());

      return matchesSearch && matchesSkill && matchesLevel;
    });
  }, [matrixData, matrixSearch, matrixSkillFilter, matrixLevelFilter]);

  // Metadata Edit Modal
  const [editingQuestion, setEditingQuestion] = useState<{
    question: QuestionItem;
    number: number;
  } | null>(null);

  const handleSaveMetadata = async (updatedQ: QuestionItem) => {
    if (!activeQuestionSet) return;

    try {
      // Update question in active question set
      const updatedQuestions = (activeQuestionSet.questions || []).map((q) =>
        q.id === updatedQ.id ? updatedQ : q
      );

      const updatedSet: QuestionSet = {
        ...activeQuestionSet,
        questions: updatedQuestions,
      };

      // 1. Update local state immediately so Matrix & Question Analysis update instantly
      setLocalQuestionSets((prev) =>
        prev.map((qs) => (qs.id === updatedSet.id ? updatedSet : qs))
      );

      // 2. Persist to Firestore if ownerId is present
      if (activeQuestionSet.ownerId) {
        await questionSetService.createOrUpdateQuestionSet(activeQuestionSet.ownerId, {
          id: activeQuestionSet.id,
          title: activeQuestionSet.title,
          description: activeQuestionSet.description,
          gradeLevel: activeQuestionSet.gradeLevel,
          questions: updatedQuestions,
        });
      }

      if (onUpdateQuestionSet) {
        await onUpdateQuestionSet(updatedSet);
      }

      showSuccess('Đã lưu phân loại ma trận đề thành công! Kết quả học sinh không bị ảnh hưởng.');
    } catch (err) {
      console.error('Failed to update question matrix metadata:', err);
      showError('Không thể lưu thông tin phân loại ma trận. Vui lòng thử lại.');
    }
  };

  // Section A Summary Metrics
  const totalAnalyzed = questionAnalysisItems.length;
  const highErrorCount = questionAnalysisItems.filter((q) => q.errorRate >= 50 && q.timesAttempted > 0).length;
  const mediumErrorCount = questionAnalysisItems.filter(
    (q) => q.errorRate >= 25 && q.errorRate < 50 && q.timesAttempted > 0
  ).length;
  const lowErrorCount = questionAnalysisItems.filter((q) => q.errorRate < 25 && q.timesAttempted > 0).length;
  const avgErrorRate =
    attemptedItems.length > 0
      ? Math.round(attemptedItems.reduce((acc, q) => acc + q.errorRate, 0) / attemptedItems.length)
      : 0;

  return (
    <div id="section-question-analysis-and-matrix" className="space-y-6 animate-in fade-in duration-200">
      {/* ============================================================ */}
      {/* NAVIGATION BAR & SECTION SWITCHER (A & B Split)              */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
        {/* Section View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl shrink-0">
          <button
            type="button"
            id="btn-view-all-sections"
            onClick={() => setActiveSubSection('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubSection === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Tất Cả (Cả 2 Phần)</span>
          </button>

          <button
            type="button"
            id="btn-view-question-analysis"
            onClick={() => setActiveSubSection('analysis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubSection === 'analysis'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>A. Phân Tích Câu Hỏi</span>
          </button>

          <button
            type="button"
            id="btn-view-test-blueprint"
            onClick={() => setActiveSubSection('matrix')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubSection === 'matrix'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>B. Ma Trận Đề (Test Blueprint)</span>
          </button>
        </div>

        {/* Question Set Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 shrink-0 hidden md:inline">
            Bộ câu hỏi:
          </span>
          <select
            id="select-active-question-set"
            aria-label="Chọn bộ câu hỏi để phân tích và xem ma trận"
            value={selectedQuestionSetId}
            onChange={(e) => setSelectedQuestionSetId(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {localQuestionSets.map((qs) => (
              <option key={qs.id} value={qs.id}>
                {qs.title} ({(qs.questions || []).length} câu)
              </option>
            ))}
            {activities.map((act) => {
              if (!act.questionSet || localQuestionSets.some((qs) => qs.id === act.questionSet?.id))
                return null;
              return (
                <option key={act.id} value={act.questionSet.id}>
                  {act.title} ({(act.questionSet.questions || []).length} câu)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION A: QUESTION ANALYSIS (Phân Tích Câu Hỏi)             */}
      {/* ============================================================ */}
      {(activeSubSection === 'all' || activeSubSection === 'analysis') && (
        <section id="section-a-question-analysis" className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-50/80 via-indigo-50/40 to-slate-50 border border-rose-100 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  PHẦN A
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Hiệu Suất Thực Tế Của Học Sinh
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                Phân Tích Câu Hỏi (Question Analysis)
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Đánh giá mức độ làm sai của học sinh qua từng câu hỏi dựa trên kết quả nộp bài thực tế.
                Tự động tính Tỷ Lệ Lỗi (Error Rate), Tỷ Lệ Đúng (Accuracy Rate) và thống kê phương án gây nhiễu.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="bg-white/95 border border-rose-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Tỷ Lệ Sai TB</span>
                <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                  {avgErrorRate}%
                </span>
              </div>
              <div className="bg-white/95 border border-slate-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Lượt Bài Nộp</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {results.length}
                </span>
              </div>
            </div>
          </div>

          {/* If No student response data available for Section A */}
          {!hasData || attemptedItems.length === 0 ? (
            <div
              id="banner-question-analysis-no-data"
              className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3 shadow-xs"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                  No student response data is available.
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chưa có dữ liệu bài làm của học sinh cho bộ lọc hiện tại.
                  Tuy nhiên, bạn vẫn có thể xem và chỉnh sửa cấu trúc đề thi tại <strong>Phần B: Ma Trận Đề (Test Blueprint)</strong> bên dưới.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* TOP QUESTIONS WITH MOST ERRORS (Top Câu Hỏi Sai Nhiều Nhất) */}
              <div id="section-top-error-questions" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-rose-600 fill-rose-600" />
                    <h3 className="text-sm sm:text-base font-black text-slate-900 font-display uppercase tracking-wide">
                      TOP QUESTIONS WITH MOST ERRORS (Top Câu Hỏi Học Sinh Sai Nhiều Nhất)
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Sắp xếp theo Tỷ Lệ Lỗi (Error Rate) cao nhất
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {topErrorQuestions.map((q, idx) => (
                    <Card
                      key={q.questionId || idx}
                      variant="default"
                      padding="md"
                      className="bg-white border-rose-200 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                      onClick={() => setSelectedAnalysisQuestion(q)}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform" />

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                              Câu #{q.questionNumber}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Error Rate</span>
                            <span className="font-mono text-base font-black text-rose-600">
                              {q.errorRate}%
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-relaxed min-h-[36px]">
                          {q.questionText}
                        </p>

                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(4, q.errorRate)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-0.5">
                            <span>Đúng: {q.accuracyRate !== null ? `${q.accuracyRate}%` : 'N/A'}</span>
                            <span>Sai: {q.errorRate}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center text-xs">
                          <div className="bg-slate-50 rounded-xl p-1.5">
                            <span className="text-[10px] text-slate-400 font-bold block">Attempts</span>
                            <strong className="text-slate-800 font-mono">{q.timesAttempted}</strong>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-1.5">
                            <span className="text-[10px] text-emerald-700 font-bold block">Correct</span>
                            <strong className="text-emerald-700 font-mono">{q.correctAnswers}</strong>
                          </div>
                          <div className="bg-rose-50 rounded-xl p-1.5">
                            <span className="text-[10px] text-rose-700 font-bold block">Wrong</span>
                            <strong className="text-rose-700 font-mono">{q.wrongAnswers}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="w-full mt-1 py-1.5 rounded-xl bg-slate-50 group-hover:bg-rose-50 text-slate-700 group-hover:text-rose-700 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Chi Tiết Câu Hỏi</span>
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Filter and Sort Toolbar */}
              <Card variant="default" padding="sm" className="bg-slate-50/80 border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
                  <div className="lg:col-span-2">
                    <Input
                      id="input-search-question-analysis"
                      placeholder="Tìm theo nội dung câu hỏi, câu #, đáp án..."
                      leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div>
                    <select
                      id="select-filter-error-tier"
                      aria-label="Lọc theo mức độ sai"
                      value={errorFilter}
                      onChange={(e) => setErrorFilter(e.target.value as ErrorFilter)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    >
                      <option value="all">Tất cả mức độ sai ({questionAnalysisItems.length})</option>
                      <option value="high">Lỗi cao (Error Rate ≥ 50%) - {highErrorCount} câu</option>
                      <option value="medium">Lỗi vừa (25% - 49%) - {mediumErrorCount} câu</option>
                      <option value="low">Lỗi thấp (&lt; 25%) - {lowErrorCount} câu</option>
                    </select>
                  </div>

                  <div>
                    <select
                      id="select-sort-question-analysis"
                      aria-label="Sắp xếp danh sách câu hỏi"
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    >
                      <option value="error_desc">Tỷ lệ sai cao nhất (Mặc định)</option>
                      <option value="error_asc">Tỷ lệ đúng cao nhất (Dễ nhất)</option>
                      <option value="attempts_desc">Số lượt làm nhiều nhất</option>
                      <option value="q_number">Thứ tự câu hỏi (Câu 1, 2, 3...)</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Question-by-Question Analysis Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-rose-600" />
                    <span>Danh Sách Phân Tích Tất Cả Câu Hỏi ({filteredAnalysisQuestions.length} câu)</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    Bấm vào bất kỳ câu hỏi nào để xem phương án học sinh chọn & giải thích
                  </span>
                </div>

                {filteredAnalysisQuestions.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                    Không tìm thấy câu hỏi nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="p-3.5 pl-5">Câu Hỏi (Question)</th>
                            <th className="p-3.5 text-center">Tỷ Lệ Lỗi (Error Rate)</th>
                            <th className="p-3.5 text-center">Sai (Wrong)</th>
                            <th className="p-3.5 text-center">Đúng (Correct)</th>
                            <th className="p-3.5 text-center">Lượt Làm (Attempts)</th>
                            <th className="p-3.5 text-center">Độ Chính Xác (Accuracy)</th>
                            <th className="p-3.5 text-center">Phân Loại (Matrix)</th>
                            <th className="p-3.5 pr-5 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAnalysisQuestions.map((q, idx) => (
                            <tr
                              key={q.questionId || idx}
                              onClick={() => setSelectedAnalysisQuestion(q)}
                              className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                            >
                              <td className="p-3.5 pl-5 max-w-xs sm:max-w-md">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                                    Câu #{q.questionNumber}
                                  </span>
                                  {q.timesAttempted > 0 && q.errorRate >= 50 && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                      Sai nhiều ({q.errorRate}%)
                                    </span>
                                  )}
                                  {q.timesAttempted === 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
                                      Chưa có bài làm
                                    </span>
                                  )}
                                </div>
                                <p className="font-semibold text-slate-900 line-clamp-2 leading-relaxed">
                                  {q.questionText}
                                </p>
                              </td>

                              <td className="p-3.5 text-center">
                                {q.timesAttempted > 0 ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span
                                      className={`font-mono text-sm font-black ${
                                        q.errorRate >= 50
                                          ? 'text-rose-600'
                                          : q.errorRate >= 25
                                          ? 'text-amber-600'
                                          : 'text-emerald-600'
                                      }`}
                                    >
                                      {q.errorRate}%
                                    </span>
                                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                      <div
                                        className={`h-full rounded-full ${
                                          q.errorRate >= 50
                                            ? 'bg-rose-500'
                                            : q.errorRate >= 25
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${Math.max(4, q.errorRate)}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono">-</span>
                                )}
                              </td>

                              <td className="p-3.5 text-center font-mono font-bold text-rose-600">
                                {q.timesAttempted > 0 ? q.wrongAnswers : '-'}
                              </td>

                              <td className="p-3.5 text-center font-mono font-bold text-emerald-600">
                                {q.timesAttempted > 0 ? q.correctAnswers : '-'}
                              </td>

                              <td className="p-3.5 text-center font-mono text-slate-700 font-semibold">
                                {q.timesAttempted}
                              </td>

                              <td className="p-3.5 text-center">
                                <span className="font-mono font-bold text-slate-700">
                                  {q.accuracyRate !== null ? `${q.accuracyRate}%` : 'N/A'}
                                </span>
                              </td>

                              <td className="p-3.5 text-center">
                                <div className="inline-flex flex-col items-center gap-0.5">
                                  <span className="text-[11px] font-semibold text-slate-700">
                                    {q.skill || q.unit || 'Not specified'}
                                  </span>
                                  {(q.difficulty || q.cognitiveLevel) && (
                                    <span className="text-[10px] text-slate-400">
                                      {q.difficulty || q.cognitiveLevel}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5 pr-5 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAnalysisQuestion(q);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Chi Tiết</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* SECTION B: TEST BLUEPRINT / MATRIX (Ma Trận Đề)              */}
      {/* ============================================================ */}
      {(activeSubSection === 'all' || activeSubSection === 'matrix') && (
        <section id="section-b-test-blueprint-matrix" className="space-y-6 pt-4 border-t border-slate-200/80">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/90 via-sky-50/40 to-slate-50 border border-indigo-100 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  PHẦN B
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Cấu Trúc & Phân Bố Bộ Câu Hỏi
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                Ma Trận Đề (Test Blueprint / Matrix)
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Mô tả cấu trúc nội tại của đề kiểm tra: phân bố Cấp Độ Nhận Thức, Độ Khó, Kỹ Năng, Unit và Dạng Câu Hỏi.
                Ma trận gắn liền với bộ đề và hoàn toàn độc lập với kết quả làm bài của học sinh.
              </p>
            </div>

            {matrixData && (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="bg-white/95 border border-indigo-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Tổng Câu Hỏi</span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">
                    {matrixData.totalQuestions}
                  </span>
                </div>
                <div className="bg-white/95 border border-slate-200 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Phân Loại Xong</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                    {matrixData.metadataCompletionRate}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {!matrixData ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Vui lòng chọn một bộ câu hỏi để xem ma trận đề.
            </div>
          ) : (
            <>
              {/* 5 Distribution Cards (Sections 12, 13, 14, 15, 16 of Prompt 17) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Cognitive Level Distribution */}
                <Card variant="default" padding="md" className="bg-white border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Cấp Độ Nhận Thức (Cognitive)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {matrixData.cognitiveLevelDistribution.items.length} mức
                    </span>
                  </div>

                  {!matrixData.cognitiveLevelDistribution.isAvailable ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                      {matrixData.cognitiveLevelDistribution.emptyMessage}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matrixData.cognitiveLevelDistribution.items.map((lvl) => (
                        <div key={lvl.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{lvl.category}</span>
                            <span className="font-mono text-slate-500 font-bold">
                              {lvl.count} câu ({lvl.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${lvl.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* 2. Difficulty Distribution */}
                <Card variant="default" padding="md" className="bg-white border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Mức Độ Khó (Difficulty)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {matrixData.difficultyDistribution.items.length} mức
                    </span>
                  </div>

                  {!matrixData.difficultyDistribution.isAvailable ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                      {matrixData.difficultyDistribution.emptyMessage}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matrixData.difficultyDistribution.items.map((diff) => (
                        <div key={diff.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{diff.category}</span>
                            <span className="font-mono text-slate-500 font-bold">
                              {diff.count} câu ({diff.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                diff.category.toLowerCase().includes('easy') || diff.category.toLowerCase().includes('dễ')
                                  ? 'bg-emerald-500'
                                  : diff.category.toLowerCase().includes('hard') || diff.category.toLowerCase().includes('khó')
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${diff.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* 3. Skill Distribution */}
                <Card variant="default" padding="md" className="bg-white border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <span>Kỹ Năng Ngôn Ngữ (Skills)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {matrixData.skillDistribution.items.length} kỹ năng
                    </span>
                  </div>

                  {!matrixData.skillDistribution.isAvailable ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                      {matrixData.skillDistribution.emptyMessage}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matrixData.skillDistribution.items.map((sk) => (
                        <div key={sk.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{sk.category}</span>
                            <span className="font-mono text-slate-500 font-bold">
                              {sk.count} câu ({sk.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500 rounded-full"
                              style={{ width: `${sk.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* 4. Unit / Topic Distribution */}
                <Card variant="default" padding="md" className="bg-white border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <span>Phân Bố Unit / Topic</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {matrixData.unitDistribution.items.length} đơn vị
                    </span>
                  </div>

                  {!matrixData.unitDistribution.isAvailable ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                      {matrixData.unitDistribution.emptyMessage}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {matrixData.unitDistribution.items.map((t) => (
                        <div key={t.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 truncate pr-2">{t.category}</span>
                            <span className="font-mono text-slate-500 font-bold shrink-0">
                              {t.count} câu ({t.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${t.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* 5. Question Type Distribution */}
                <Card variant="default" padding="md" className="bg-white border-slate-200 shadow-xs space-y-3 md:col-span-2 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      <span>Dạng Câu Hỏi (Question Types)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {matrixData.questionTypeDistribution.items.length} dạng
                    </span>
                  </div>

                  {!matrixData.questionTypeDistribution.isAvailable ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                      {matrixData.questionTypeDistribution.emptyMessage}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {matrixData.questionTypeDistribution.items.map((qt) => (
                        <div key={qt.category} className="p-2.5 bg-slate-50 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{qt.category}</span>
                            <span className="font-mono text-purple-700 font-bold">
                              {qt.count} câu ({qt.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${qt.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Test Blueprint / Matrix Table (Section 11 of Prompt 17) */}
              <div className="space-y-3">
                {/* Table Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div className="w-full sm:w-72">
                    <Input
                      id="input-search-matrix-table"
                      placeholder="Tìm câu hỏi, Unit, chủ đề..."
                      leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Lọc theo kỹ năng"
                      value={matrixSkillFilter}
                      onChange={(e) => setMatrixSkillFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700"
                    >
                      <option value="all">Tất cả Kỹ Năng</option>
                      {matrixData.skillDistribution.items.map((s) => (
                        <option key={s.category} value={s.category}>
                          {s.category} ({s.count})
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Lọc theo độ khó / cấp độ"
                      value={matrixLevelFilter}
                      onChange={(e) => setMatrixLevelFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700"
                    >
                      <option value="all">Tất cả Cấp Độ / Độ Khó</option>
                      {matrixData.cognitiveLevelDistribution.items.map((c) => (
                        <option key={c.category} value={c.category}>
                          {c.category}
                        </option>
                      ))}
                      {matrixData.difficultyDistribution.items.map((d) => (
                        <option key={d.category} value={d.category}>
                          {d.category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="p-3.5 pl-5 w-14">#</th>
                          <th className="p-3.5 max-w-sm">Câu Hỏi (Question)</th>
                          <th className="p-3.5 text-center">Unit / Topic</th>
                          <th className="p-3.5 text-center">Kỹ Năng (Skill)</th>
                          <th className="p-3.5 text-center">Dạng Câu Hỏi</th>
                          <th className="p-3.5 text-center">Độ Khó</th>
                          <th className="p-3.5 text-center">Cấp Độ Nhận Thức</th>
                          <th className="p-3.5 pr-5 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMatrixRows.map((row) => {
                          const originalQ = (activeQuestionSet.questions || []).find(
                            (q) => q.id === row.id
                          ) || {
                            id: row.id,
                            question: row.questionText,
                            options: row.options || [],
                            correctAnswer: row.correctAnswerText,
                            unit: row.unit || undefined,
                            topic: row.topic || undefined,
                            skill: row.skill || undefined,
                            difficulty: row.difficulty || undefined,
                            cognitiveLevel: row.cognitiveLevel || undefined,
                            questionType: row.questionType || undefined,
                          };

                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="p-3.5 pl-5 font-mono font-bold text-slate-500">
                                #{row.questionNumber}
                              </td>

                              <td className="p-3.5 max-w-sm">
                                <p className="font-semibold text-slate-900 line-clamp-2 leading-relaxed">
                                  {row.questionText}
                                </p>
                              </td>

                              <td className="p-3.5 text-center">
                                {row.unit || row.topic ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-200 inline-block max-w-[140px] truncate">
                                    {row.unit || row.topic}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Not specified</span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                {row.skill ? (
                                  <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 font-semibold text-[11px] border border-sky-200 inline-block">
                                    {row.skill}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Not specified</span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                {row.questionType ? (
                                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 font-semibold text-[11px] border border-purple-200 inline-block">
                                    {row.questionType}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Not specified</span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                {row.difficulty ? (
                                  <span
                                    className={`px-2.5 py-1 rounded-full font-bold text-[11px] border inline-block ${
                                      row.difficulty.toLowerCase().includes('easy') || row.difficulty.toLowerCase().includes('dễ')
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : row.difficulty.toLowerCase().includes('hard') || row.difficulty.toLowerCase().includes('khó')
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    {row.difficulty}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Not specified</span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                {row.cognitiveLevel ? (
                                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 font-bold text-[11px] border border-indigo-200 inline-block">
                                    {row.cognitiveLevel}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Not specified</span>
                                )}
                              </td>

                              <td className="p-3.5 pr-5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingQuestion({
                                      question: originalQ,
                                      number: row.questionNumber,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Phân loại / Sửa</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: QUESTION ANALYSIS DETAILS (Distractor Analysis)     */}
      {/* ============================================================ */}
      {selectedAnalysisQuestion && (
        <div
          id="modal-question-error-detail"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedAnalysisQuestion(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold font-mono">
                    Câu hỏi #{selectedAnalysisQuestion.questionNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedAnalysisQuestion.errorRate >= 50
                        ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                        : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                    }`}
                  >
                    Tỷ lệ lỗi: {selectedAnalysisQuestion.errorRate}%
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-display text-white">
                  Chi Tiết Câu Hỏi & Phân Tích Phương Án
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAnalysisQuestion(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Question Text */}
              <div className="space-y-1 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Nội dung câu hỏi (Question Text)
                </span>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {selectedAnalysisQuestion.questionText}
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Attempts</span>
                  <strong className="text-base font-black text-slate-800 font-mono">
                    {selectedAnalysisQuestion.timesAttempted}
                  </strong>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">Correct</span>
                  <strong className="text-base font-black text-emerald-700 font-mono">
                    {selectedAnalysisQuestion.correctAnswers}
                  </strong>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Wrong</span>
                  <strong className="text-base font-black text-rose-700 font-mono">
                    {selectedAnalysisQuestion.wrongAnswers}
                  </strong>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-2.5">
                  <span className="text-[10px] text-indigo-700 uppercase font-bold block">Accuracy</span>
                  <strong className="text-base font-black text-indigo-700 font-mono">
                    {selectedAnalysisQuestion.accuracyRate !== null ? `${selectedAnalysisQuestion.accuracyRate}%` : 'N/A'}
                  </strong>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-rose-50 border border-rose-200 rounded-2xl p-2.5">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Error Rate</span>
                  <strong className="text-base font-black text-rose-700 font-mono">
                    {selectedAnalysisQuestion.errorRate}%
                  </strong>
                </div>
              </div>

              {/* Correct Answer Highlight */}
              {selectedAnalysisQuestion.correctAnswer && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-emerald-800 font-bold block">Đáp án đúng (Correct Answer):</span>
                    <span className="text-emerald-950 font-semibold text-sm">
                      {selectedAnalysisQuestion.correctAnswer}
                    </span>
                  </div>
                </div>
              )}

              {/* Wrong Answer Analysis / Distractor Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    <span>Wrong Answer Analysis (Phân Bố Các Lựa Chọn & Lỗi Sai)</span>
                  </span>
                  {selectedAnalysisQuestion.hasSelectedAnswerData && (
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Thực tế học sinh đã chọn
                    </span>
                  )}
                </div>

                {selectedAnalysisQuestion.hasSelectedAnswerData ? (
                  <div className="space-y-2">
                    {selectedAnalysisQuestion.optionBreakdown.map((opt, optIdx) => {
                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-2xl border text-xs transition-all ${
                            opt.isCorrect
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                                  opt.isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {opt.label}
                              </span>
                              <span className="truncate">{opt.text}</span>
                              {opt.isCorrect && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                                  Đáp án đúng
                                </span>
                              )}
                            </div>

                            <div className="text-right shrink-0 font-mono">
                              <strong className={opt.isCorrect ? 'text-emerald-700' : 'text-slate-900'}>
                                {opt.label} &rarr; {opt.count} học sinh
                              </strong>
                              <span className="text-slate-400 ml-1.5">({opt.percentage}%)</span>
                            </div>
                          </div>

                          <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                opt.isCorrect ? 'bg-emerald-500' : 'bg-rose-400'
                              }`}
                              style={{ width: `${Math.max(3, opt.percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                    Dữ liệu lựa chọn cụ thể không có sẵn trong cấu trúc nộp bài của câu này.
                  </div>
                )}
              </div>

              {/* Explanation */}
              {selectedAnalysisQuestion.explanation && (
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-1 text-xs text-indigo-950">
                  <strong className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <Info className="w-4 h-4 text-indigo-600" />
                    Giải thích từ bộ câu hỏi (Explanation):
                  </strong>
                  <p className="text-slate-700 leading-relaxed pt-1">
                    {selectedAnalysisQuestion.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAnalysisQuestion(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: MATRIX METADATA EDITOR MODAL                        */}
      {/* ============================================================ */}
      {editingQuestion && (
        <MatrixMetadataModal
          isOpen={Boolean(editingQuestion)}
          question={editingQuestion.question}
          questionNumber={editingQuestion.number}
          onClose={() => setEditingQuestion(null)}
          onSave={handleSaveMetadata}
        />
      )}
    </div>
  );
};
