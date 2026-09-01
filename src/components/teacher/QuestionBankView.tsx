import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  Plus,
  Search,
  BookOpen,
  Layers,
  Sparkles,
  Play,
  Edit3,
  Trash2,
  Download,
  Calendar,
  FileSpreadsheet,
  FileType,
  FileText,
  Clock,
  History,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Eye,
  X,
  Filter,
  Loader2,
} from 'lucide-react';
import { QuestionItem, QuestionSet, ImportHistoryItem } from '../../types';
import { questionSetService, importHistoryService } from '../../services/firestoreService';
import { QuestionImporter } from './importer/QuestionImporter';
import { QuestionSetEditor } from './questions/QuestionSetEditor';
import { WordExportModal } from './export/WordExportModal';
import { useToast } from '../../context/ToastContext';
import * as XLSX from 'xlsx';

interface QuestionBankViewProps {
  teacherId: string;
  onNavigateToActivityEditor?: (initialQuestions?: QuestionItem[], initialTitle?: string, gameType?: string) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  teacherId,
  onNavigateToActivityEditor,
}) => {
  const { showSuccess, showError } = useToast();
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sets' | 'history'>('sets');

  // Currently editing Question Set in dedicated QuestionSetEditor
  const [activeEditingSetId, setActiveEditingSetId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  // Modal states
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [deletingSet, setDeletingSet] = useState<QuestionSet | null>(null);
  const [linkedActivitiesCount, setLinkedActivitiesCount] = useState<number>(0);
  const [isCheckingUsage, setIsCheckingUsage] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [wordExportSet, setWordExportSet] = useState<QuestionSet | null>(null);

  // Quick Game Creator Modal state
  const [gameCreationSet, setGameCreationSet] = useState<QuestionSet | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'ALL'>('ALL');
  const [selectedGameType, setSelectedGameType] = useState<string>('quiz');

  // Subscribe to real Firestore data
  useEffect(() => {
    if (!teacherId) return;

    setLoading(true);
    const unsubSets = questionSetService.subscribeQuestionSets(
      teacherId,
      (sets) => {
        setQuestionSets(sets);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching question sets:', err);
        setLoading(false);
      }
    );

    const unsubHistory = importHistoryService.subscribeImportHistory(
      teacherId,
      (history) => {
        setImportHistory(history);
      }
    );

    return () => {
      unsubSets();
      unsubHistory();
    };
  }, [teacherId]);

  // Handle Create Blank Question Set
  const handleCreateBlankSet = async () => {
    try {
      const newSet = await questionSetService.createOrUpdateQuestionSet(teacherId, {
        title: 'New Question Set',
        description: '',
        gradeLevel: '10',
        questions: [
          {
            id: `q_${Date.now()}_1`,
            question: '',
            options: [
              { id: 'opt_a_1', label: 'A', text: '' },
              { id: 'opt_b_1', label: 'B', text: '' },
              { id: 'opt_c_1', label: 'C', text: '' },
              { id: 'opt_d_1', label: 'D', text: '' },
            ],
            correctAnswerId: 'opt_a_1',
            correctAnswerText: '',
            correctAnswer: 'A',
            explanation: null,
            passage: null,
            unit: '',
            lesson: '',
            level: 'Medium',
            questionType: 'Multiple Choice',
            order: 1,
            points: 10,
            timeLimitSeconds: 30,
            sourceFileName: '',
            sourceFileType: 'manual',
            importedAt: new Date().toISOString(),
          },
        ],
        sourceFileName: '',
        sourceFileType: 'manual',
        importedAt: new Date().toISOString(),
      });

      if (newSet && newSet.id) {
        showSuccess('Created new blank Question Set. Ready for editing.');
        setActiveEditingSetId(newSet.id);
      }
    } catch (err) {
      console.error('Failed to create blank set:', err);
      showError('Failed to create new question set.');
    }
  };

  // If currently editing a Question Set, render the dedicated QuestionSetEditor view!
  if (activeEditingSetId) {
    return (
      <QuestionSetEditor
        questionSetId={activeEditingSetId}
        teacherId={teacherId}
        onBack={() => setActiveEditingSetId(null)}
        onNavigateToActivityEditor={onNavigateToActivityEditor}
      />
    );
  }

  // Handle Open Delete Modal & Check Linked Usage
  const handleOpenDeleteModal = async (set: QuestionSet) => {
    setDeletingSet(set);
    setIsCheckingUsage(true);
    setLinkedActivitiesCount(0);
    try {
      const count = await questionSetService.getLinkedActivitiesCount(set.id, teacherId);
      setLinkedActivitiesCount(count);
    } catch (err) {
      console.error('Failed to check question set usage:', err);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  // Handle Delete Question Set Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingSet) return;
    
    // Front-end authorization check
    if (deletingSet.ownerId !== teacherId) {
      showError('Bạn không có quyền xóa bộ câu hỏi này.');
      return;
    }

    setIsDeleting(true);
    try {
      await questionSetService.deleteQuestionSet(deletingSet.id);
      // Optimistic update for instant UI feedback
      setQuestionSets((prev) => prev.filter((s) => s.id !== deletingSet.id));
      showSuccess(`Đã xóa bộ câu hỏi "${deletingSet.title}" thành công.`);
      setDeletingSet(null);
    } catch (err) {
      console.error('Failed to delete question set:', err);
      showError('Không thể xóa bộ câu hỏi. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Question Set to Excel
  const handleExportSetToExcel = (set: QuestionSet) => {
    const data = set.questions.map((q, idx) => {
      const optA = q.options?.find((o) => o.label === 'A')?.text || q.options?.[0]?.text || '';
      const optB = q.options?.find((o) => o.label === 'B')?.text || q.options?.[1]?.text || '';
      const optC = q.options?.find((o) => o.label === 'C')?.text || q.options?.[2]?.text || '';
      const optD = q.options?.find((o) => o.label === 'D')?.text || q.options?.[3]?.text || '';

      const correctOpt = q.options?.find((o) => o.id === q.correctAnswerId);
      const answerLabel = correctOpt ? correctOpt.label : (q.correctAnswer || 'A');

      return {
        '#': idx + 1,
        Question: q.question,
        A: optA,
        B: optB,
        C: optC,
        D: optD,
        Answer: answerLabel,
        Explanation: q.explanation || '',
        Unit: q.unit || '',
        Lesson: q.lesson || '',
        Level: q.level || 'Medium',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const cleanTitle = (set.title || 'QuestionSet').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `${cleanTitle}_EduSpace25.xlsx`);
  };

  // Launch Game Creation from Question Set
  const handleLaunchGame = (set: QuestionSet, count?: number | 'ALL', gameType?: string) => {
    if (!onNavigateToActivityEditor) return;

    let targetQuestions = [...set.questions];
    const targetCount = count === 'ALL' || !count ? targetQuestions.length : Number(count);

    if (targetCount < targetQuestions.length) {
      // Pick first N or random subset
      targetQuestions = targetQuestions.slice(0, targetCount);
    }

    onNavigateToActivityEditor(targetQuestions, set.title, gameType || selectedGameType || 'quiz');
    setGameCreationSet(null);
  };

  // Filtered Question Sets
  const filteredSets = questionSets.filter((set) => {
    if (selectedGrade !== 'ALL' && set.gradeLevel !== selectedGrade) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = set.title.toLowerCase().includes(q);
      const descMatch = (set.description || '').toLowerCase().includes(q);
      const fileMatch = (set.sourceFileName || '').toLowerCase().includes(q);
      return titleMatch || descMatch || fileMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Question Bank
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-semibold">
                  {questionSets.length} Question Sets
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Persistent academic question repository with Word, PDF, Excel & CSV import engine
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateBlankSet}
            className="px-4 py-2.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-750 hover:text-white rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Create Blank Set
          </button>

          <button
            type="button"
            onClick={() => setIsImporterOpen(true)}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Upload className="w-4 h-4" />
            Import Questions (Word/PDF/Excel)
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Question Sets vs Import History) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sets')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'sets'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            Question Sets ({questionSets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <History className="w-4 h-4 text-amber-400" />
            Import History ({importHistory.length})
          </button>
        </div>
      </div>

      {/* TAB 1: QUESTION SETS LIST */}
      {activeTab === 'sets' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question sets, files, topics..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Grade:
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Grades</option>
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>
          </div>

          {/* Sets Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Loading Question Bank from Firebase...</p>
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No Question Sets Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Import your existing Word tests (.docx), Excel spreadsheets (.xlsx), or PDF documents to build your persistent question bank.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImporterOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Upload className="w-4 h-4" />
                Import First Question Set
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSets.map((set) => {
                const questionCount = (set.questions || []).length;
                const fileType = set.sourceFileType || 'manual';

                return (
                  <div
                    key={set.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-md"
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                            Grade {set.gradeLevel || '10'}
                          </span>

                          {set.sourceFileName && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 truncate max-w-[130px] flex items-center gap-1">
                              {fileType === 'docx' && <FileType className="w-3 h-3 text-blue-400" />}
                              {fileType === 'xlsx' && <FileSpreadsheet className="w-3 h-3 text-emerald-400" />}
                              {fileType === 'pdf' && <FileText className="w-3 h-3 text-rose-400" />}
                              {set.sourceFileName}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteModal(set);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Xóa bộ câu hỏi (Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Title & description */}
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {set.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                        {set.description || `Contains ${questionCount} academic questions.`}
                      </p>

                      {/* Question Count and date metrics */}
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                        <span className="font-semibold text-white flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          {questionCount} Questions
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(set.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-800">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveEditingSetId(set.id)}
                          className="py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          View &amp; Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGameCreationSet(set);
                            setSelectedQuestionCount(Math.min(20, set.questions.length) || 'ALL');
                          }}
                          className="py-2 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          Create Game
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setWordExportSet(set)}
                          className="col-span-2 py-1.5 px-3 text-xs font-semibold bg-slate-850 hover:bg-indigo-950/40 text-indigo-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          Xuất Word (.docx)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(set)}
                          className="py-1.5 px-2 text-xs font-semibold bg-slate-850 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-700/50 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                          title="Xóa bộ câu hỏi khỏi ngân hàng"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IMPORT HISTORY */}
      {activeTab === 'history' && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Document Import Log
            </h3>
          </div>
          {importHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No import history records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 font-medium">Source Document</th>
                    <th className="p-3.5 font-medium">Question Set Created</th>
                    <th className="p-3.5 font-medium">Detected</th>
                    <th className="p-3.5 font-medium">Imported</th>
                    <th className="p-3.5 font-medium">Review Needed</th>
                    <th className="p-3.5 font-medium">Import Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {importHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="p-3.5 font-medium text-white flex items-center gap-2">
                        {item.fileType === 'docx' && <FileType className="w-4 h-4 text-blue-400" />}
                        {item.fileType === 'xlsx' && <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
                        {item.fileType === 'pdf' && <FileText className="w-4 h-4 text-rose-400" />}
                        {item.fileName}
                      </td>
                      <td className="p-3.5 text-indigo-300 font-medium">
                        {item.questionSetName || 'Imported Question Set'}
                      </td>
                      <td className="p-3.5 text-slate-300">{item.numberDetected}</td>
                      <td className="p-3.5 text-emerald-400 font-semibold">{item.numberImported}</td>
                      <td className="p-3.5 text-amber-400 font-semibold">{item.numberReviewRequired || 0}</td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(item.importedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- QUICK GAME CREATION MODAL ---------------- */}
      {gameCreationSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Play className="w-4 h-4 fill-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white">Create Game Activity</h3>
              </div>
              <button
                onClick={() => setGameCreationSet(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Selected Question Set
                </p>
                <p className="text-sm font-bold text-white">{gameCreationSet.title}</p>
                <p className="text-xs text-slate-400">
                  Available questions: {gameCreationSet.questions.length}
                </p>
              </div>

              {/* Number of Questions Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Number of Questions to include in Game:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {([10, 20, 25, 30, 40, 'ALL'] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSelectedQuestionCount(cnt)}
                      disabled={
                        cnt !== 'ALL' &&
                        typeof cnt === 'number' &&
                        cnt > gameCreationSet.questions.length
                      }
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        selectedQuestionCount === cnt
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                          : cnt !== 'ALL' &&
                            typeof cnt === 'number' &&
                            cnt > gameCreationSet.questions.length
                          ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {cnt === 'ALL' ? 'All' : `${cnt}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Format Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Game Format:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'quiz', label: 'Quiz Bowl', desc: 'Fast-paced multiple choice' },
                    { id: 'gameshow', label: 'Gameshow Quiz', desc: 'Lifelines & point bonuses' },
                    { id: 'match', label: 'Match Up Cards', desc: 'Card matching memory' },
                    { id: 'wheel', label: 'Random Wheel', desc: 'Classroom picker game' },
                  ].map((gt) => (
                    <button
                      key={gt.id}
                      type="button"
                      onClick={() => setSelectedGameType(gt.id)}
                      className={`p-3 text-left rounded-xl border text-xs transition-all ${
                        selectedGameType === gt.id
                          ? 'bg-indigo-950/80 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <p className="font-bold text-white">{gt.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{gt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setGameCreationSet(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLaunchGame(gameCreationSet, selectedQuestionCount, selectedGameType)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Game Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRMATION MODAL ---------------- */}
      {deletingSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30 shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                Are you sure you want to delete this Question Set?
              </h3>
              <p className="text-xs text-slate-400">
                Bạn có chắc chắn muốn xóa bộ câu hỏi này khỏi Question Bank không?
              </p>
            </div>

            {/* Target set summary box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">
                  {deletingSet.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span>Grade {deletingSet.gradeLevel || '10'}</span>
                  <span>•</span>
                  <span>{(deletingSet.questions || []).length} câu hỏi</span>
                  <span>•</span>
                  <span>Tạo ngày {new Date(deletingSet.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Linked usage checking / warning alert */}
            {isCheckingUsage ? (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Đang kiểm tra liên kết hoạt động trò chơi...</span>
              </div>
            ) : linkedActivitiesCount > 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300">
                    This Question Set is currently used by other game activities.
                  </p>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Bộ câu hỏi này đang được liên kết với <span className="font-semibold text-amber-100">{linkedActivitiesCount}</span> hoạt động trò chơi. Xóa bộ câu hỏi khỏi Question Bank sẽ không làm mất dữ liệu các hoạt động trò chơi đã tạo trước đó.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Hành động này sẽ xóa vĩnh viễn bộ câu hỏi khỏi cơ sở dữ liệu Firebase. Dữ liệu không thể khôi phục sau khi xóa.
              </p>
            )}

            {/* Modal action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSet(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 rounded-xl transition-colors border border-slate-700"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DELETE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- QUESTION IMPORTER MODAL ---------------- */}
      {isImporterOpen && (
        <QuestionImporter
          teacherId={teacherId}
          onClose={() => setIsImporterOpen(false)}
          onImportComplete={(set) => {
            // Refreshes automatically via Firestore listener
          }}
          onCreateGameFromSet={(set, count, gameType) => {
            setIsImporterOpen(false);
            handleLaunchGame(set, count, gameType);
          }}
        />
      )}

      {/* ---------------- WORD EXPORT MODAL ---------------- */}
      {wordExportSet && (
        <WordExportModal
          questions={wordExportSet.questions || []}
          title={wordExportSet.title}
          sourceType="set"
          onClose={() => setWordExportSet(null)}
        />
      )}
    </div>
  );
};
