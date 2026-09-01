import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  ShieldCheck,
  Play,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  FileText,
  FileSpreadsheet,
  FileType,
  BookOpen,
  Calendar,
  Clock,
  RotateCcw,
  Check,
  Layers,
  AlertCircle,
  X
} from 'lucide-react';
import { QuestionItem, QuestionSet, QuestionOption, ValidationStatus } from '../../../types';
import { questionSetService } from '../../../services/firestoreService';
import { validateQuestionSet, validateQuestion, SetValidationSummary, synchronizeQuestionAnswer } from '../../../services/questionValidator';
import { QuestionEditorModal } from './QuestionEditorModal';
import { ValidationModal } from './ValidationModal';
import { WordExportModal } from '../export/WordExportModal';
import { useToast } from '../../../context/ToastContext';
import * as XLSX from 'xlsx';

interface QuestionSetEditorProps {
  questionSetId: string;
  teacherId: string;
  onBack: () => void;
  onNavigateToActivityEditor?: (questions: QuestionItem[], title: string, gameType?: string) => void;
}

export const QuestionSetEditor: React.FC<QuestionSetEditorProps> = ({
  questionSetId,
  teacherId,
  onBack,
  onNavigateToActivityEditor,
}) => {
  const { showSuccess, showError } = useToast();

  // Primary State
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeLevel, setGradeLevel] = useState<QuestionSet['gradeLevel']>('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'REVIEW_REQUIRED' | 'ERROR'>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');

  // Modals State
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isWordExportOpen, setIsWordExportOpen] = useState(false);
  const [deletingQuestionIndex, setDeletingQuestionIndex] = useState<number | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingBackAction, setPendingBackAction] = useState<boolean>(false);

  // Gatekeeper modal for Create Game
  const [showGatekeeperModal, setShowGatekeeperModal] = useState(false);
  const [gatekeeperMode, setGatekeeperMode] = useState<'errors' | 'review'>('errors');

  // Quick Game Creator state
  const [showGameModal, setShowGameModal] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState('quiz');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'ALL'>('ALL');

  // Load Question Set from Firestore
  const loadQuestionSet = useCallback(async () => {
    setLoading(true);
    try {
      const set = await questionSetService.getQuestionSet(questionSetId);
      if (set) {
        setQuestionSet(set);
        setTitle(set.title);
        setDescription(set.description || '');
        setGradeLevel(set.gradeLevel || '10');
        // Normalize questions
        const normalized = (set.questions || []).map((q, idx) =>
          synchronizeQuestionAnswer({
            ...q,
            order: idx + 1,
          })
        );
        setQuestions(normalized);
        setHasUnsavedChanges(false);
      } else {
        showError('Question Set not found in database.');
      }
    } catch (err) {
      console.error('Error loading question set:', err);
      showError('Unable to load this Question Set.');
    } finally {
      setLoading(false);
    }
  }, [questionSetId, showError]);

  useEffect(() => {
    loadQuestionSet();
  }, [loadQuestionSet]);

  // Validation Summary memo
  const validationSummary: SetValidationSummary = useMemo(() => {
    return validateQuestionSet(questions);
  }, [questions]);

  // Unique units for filtering
  const availableUnits = useMemo(() => {
    const units = new Set<string>();
    questions.forEach((q) => {
      if (q.unit && q.unit.trim()) units.add(q.unit.trim());
    });
    return Array.from(units);
  }, [questions]);

  // Filtered and Searched Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q, idx) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        const qVal = validateQuestion(q);
        if (qVal.status !== statusFilter) return false;
      }

      // 2. Level Filter
      if (levelFilter !== 'ALL' && q.level !== levelFilter) {
        return false;
      }

      // 3. Unit Filter
      if (unitFilter !== 'ALL' && q.unit !== unitFilter) {
        return false;
      }

      // 4. Text Search (case-insensitive across stem, options, explanation)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const stemMatch = (q.question || '').toLowerCase().includes(query);
        const optionsMatch = (q.options || []).some((o) => (o.text || '').toLowerCase().includes(query));
        const expMatch = (q.explanation || '').toLowerCase().includes(query);
        const passageMatch = (q.passage || '').toLowerCase().includes(query);
        return stemMatch || optionsMatch || expMatch || passageMatch;
      }

      return true;
    });
  }, [questions, statusFilter, levelFilter, unitFilter, searchQuery]);

  // Save all changes to Firestore
  const handleSaveChanges = async (): Promise<boolean> => {
    if (!questionSet) return false;
    setSaving(true);
    try {
      // Clean and normalize order
      const cleanQuestions: QuestionItem[] = questions.map((q, idx) => ({
        ...q,
        order: idx + 1,
        questionSetId: questionSet.id,
        ownerId: questionSet.ownerId,
      }));

      const updated = await questionSetService.createOrUpdateQuestionSet(questionSet.ownerId, {
        id: questionSet.id,
        title: title.trim() || 'Untitled Question Set',
        description: description.trim(),
        gradeLevel,
        questions: cleanQuestions,
        sourceFileName: questionSet.sourceFileName,
        sourceFileType: questionSet.sourceFileType,
        importedAt: questionSet.importedAt,
      });

      setQuestionSet(updated);
      setQuestions(updated.questions);
      setHasUnsavedChanges(false);
      showSuccess('All changes saved successfully to Firebase Question Bank.');
      return true;
    } catch (err) {
      console.error('Save error:', err);
      showError('Unable to save changes. Your changes have not been saved. Please retry.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Safe Navigation Back Handling
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setPendingBackAction(true);
      setShowUnsavedWarning(true);
    } else {
      onBack();
    }
  };

  // Add a new question
  const handleAddNewQuestion = () => {
    const newIdx = questions.length;
    const newQ: QuestionItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      questionSetId: questionSet?.id,
      ownerId: questionSet?.ownerId || teacherId,
      question: '',
      options: [
        { id: `opt_a_${Math.random().toString(36).substring(2, 7)}`, label: 'A', text: '' },
        { id: `opt_b_${Math.random().toString(36).substring(2, 7)}`, label: 'B', text: '' },
        { id: `opt_c_${Math.random().toString(36).substring(2, 7)}`, label: 'C', text: '' },
        { id: `opt_d_${Math.random().toString(36).substring(2, 7)}`, label: 'D', text: '' },
      ],
      correctAnswerId: '',
      correctAnswerText: '',
      explanation: null,
      passage: null,
      unit: '',
      lesson: '',
      level: 'Medium',
      questionType: 'Multiple Choice',
      order: newIdx + 1,
      points: 10,
      timeLimitSeconds: 30,
      sourceFileName: questionSet?.sourceFileName || '',
      sourceFileType: (questionSet?.sourceFileType as any) || 'manual',
      importedAt: new Date().toISOString(),
    };
    newQ.correctAnswerId = newQ.options[0].id;

    setEditingQuestion(newQ);
    setEditingQuestionIndex(newIdx);
    setIsEditorModalOpen(true);
  };

  // Open Edit Modal for existing question
  const handleEditQuestion = (question: QuestionItem, originalIndex: number) => {
    setEditingQuestion(question);
    setEditingQuestionIndex(originalIndex);
    setIsEditorModalOpen(true);
  };

  // Save single question from modal
  const handleSaveQuestionFromModal = (updatedQuestion: QuestionItem) => {
    if (editingQuestionIndex === null) return;

    setQuestions((prev) => {
      const copy = [...prev];
      if (editingQuestionIndex < copy.length) {
        copy[editingQuestionIndex] = updatedQuestion;
      } else {
        copy.push(updatedQuestion);
      }
      return copy.map((q, idx) => ({ ...q, order: idx + 1 }));
    });

    setHasUnsavedChanges(true);
    setIsEditorModalOpen(false);
    setEditingQuestion(null);
    setEditingQuestionIndex(null);
  };

  // Duplicate a Question
  const handleDuplicateQuestion = (index: number) => {
    const target = questions[index];
    if (!target) return;

    // Deep clone with fresh IDs for question and options
    const newOptions: QuestionOption[] = (target.options || []).map((o, idx) => ({
      id: `opt_${String.fromCharCode(97 + idx)}_${Math.random().toString(36).substring(2, 7)}`,
      label: o.label || String.fromCharCode(65 + idx),
      text: o.text,
    }));

    // Match correct answer to the new option ID
    const origCorrectIdx = target.options.findIndex((o) => o.id === target.correctAnswerId);
    const newCorrectId = origCorrectIdx >= 0 ? newOptions[origCorrectIdx].id : newOptions[0]?.id || '';

    const duplicated: QuestionItem = {
      ...target,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      options: newOptions,
      correctAnswerId: newCorrectId,
      correctAnswerText: target.correctAnswerText,
      order: index + 2,
    };

    setQuestions((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy.map((q, idx) => ({ ...q, order: idx + 1 }));
    });

    setHasUnsavedChanges(true);
    showSuccess(`Duplicated Question #${index + 1} into Question #${index + 2}.`);
  };

  // Delete Question Confirmation
  const handleDeleteQuestionConfirm = () => {
    if (deletingQuestionIndex === null) return;

    setQuestions((prev) => {
      const copy = prev.filter((_, idx) => idx !== deletingQuestionIndex);
      return copy.map((q, idx) => ({ ...q, order: idx + 1 }));
    });

    setHasUnsavedChanges(true);
    showSuccess(`Deleted Question #${deletingQuestionIndex + 1}.`);
    setDeletingQuestionIndex(null);
  };

  // Reorder: Move Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((q, idx) => ({ ...q, order: idx + 1 }));
    });
    setHasUnsavedChanges(true);
  };

  // Reorder: Move Down
  const handleMoveDown = (index: number) => {
    if (index >= questions.length - 1) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((q, idx) => ({ ...q, order: idx + 1 }));
    });
    setHasUnsavedChanges(true);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!questionSet) return;
    const data = questions.map((q, idx) => {
      const optA = q.options?.find((o) => o.label === 'A')?.text || q.options?.[0]?.text || '';
      const optB = q.options?.find((o) => o.label === 'B')?.text || q.options?.[1]?.text || '';
      const optC = q.options?.find((o) => o.label === 'C')?.text || q.options?.[2]?.text || '';
      const optD = q.options?.find((o) => o.label === 'D')?.text || q.options?.[3]?.text || '';

      const correctOpt = q.options?.find((o) => o.id === q.correctAnswerId);
      const answerLabel = correctOpt ? correctOpt.label : q.correctAnswer || 'A';

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

    const cleanTitle = (title || 'QuestionSet').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `${cleanTitle}_EduSpace25.xlsx`);
    showSuccess('Exported Question Set to Excel.');
  };

  // Create Game Button Click (Gatekeeper validation check)
  const handleCreateGameClick = () => {
    const summary = validateQuestionSet(questions);
    if (summary.errors > 0 || questions.length === 0) {
      setGatekeeperMode('errors');
      setShowGatekeeperModal(true);
    } else if (summary.reviewRequired > 0) {
      setGatekeeperMode('review');
      setShowGatekeeperModal(true);
    } else {
      setShowGameModal(true);
    }
  };

  // Launch Game
  const handleLaunchGame = (useOnlyValid: boolean = false) => {
    if (!onNavigateToActivityEditor) return;

    let targetQuestions = [...questions];
    if (useOnlyValid) {
      targetQuestions = targetQuestions.filter((q) => validateQuestion(q).status === 'VALID');
    }

    const count = selectedQuestionCount === 'ALL' ? targetQuestions.length : Number(selectedQuestionCount);
    if (count < targetQuestions.length) {
      targetQuestions = targetQuestions.slice(0, count);
    }

    setShowGatekeeperModal(false);
    setShowGameModal(false);
    onNavigateToActivityEditor(targetQuestions, title || 'Academic Activity', selectedGameType);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-3">
        <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Loading Question Set from Firebase...</p>
      </div>
    );
  }

  if (!questionSet) {
    return (
      <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-white">Question Set Not Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            The requested Question Set could not be found or has been deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-750 rounded-xl"
        >
          Return to Question Bank
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb and Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        
        {/* Left Side: Back & Question Set Metadata */}
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors mt-0.5"
            title="Back to Question Bank"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Question Set Title..."
                className="text-lg sm:text-xl font-black text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors max-w-sm sm:max-w-md"
              />
              
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                Grade {gradeLevel || '10'}
              </span>

              {questionSet.sourceFileName && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1">
                  {questionSet.sourceFileType === 'docx' && <FileType className="w-3 h-3 text-blue-400" />}
                  {questionSet.sourceFileType === 'xlsx' && <FileSpreadsheet className="w-3 h-3 text-emerald-400" />}
                  {questionSet.sourceFileType === 'pdf' && <FileText className="w-3 h-3 text-rose-400" />}
                  {questionSet.sourceFileName}
                </span>
              )}

              {hasUnsavedChanges && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
              <span>{questions.length} Total Questions</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Created {new Date(questionSet.createdAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Updated {new Date(questionSet.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          </div>
        </div>

        {/* Right Side: Primary Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleAddNewQuestion}
            className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-white rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Add Question
          </button>

          <button
            type="button"
            onClick={() => setIsValidationModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Validate Set
          </button>

          <button
            type="button"
            onClick={() => setIsWordExportOpen(true)}
            className="px-3.5 py-2 text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 rounded-xl flex items-center gap-1.5 transition-colors border border-indigo-700/60 shadow-xs"
            title="Xuất đề thi và bảng đáp án file Word (.docx)"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            Xuất Word
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 hidden sm:flex"
            title="Export to Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Excel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveChanges()}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg flex items-center gap-1.5 transition-all ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes *' : 'Saved'}
          </button>

          <button
            type="button"
            onClick={handleCreateGameClick}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            Create Game
          </button>
        </div>
      </div>

      {/* Summary Scorecards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Questions</p>
            <p className="text-lg font-bold text-white">{validationSummary.total}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Valid Questions</p>
            <p className="text-lg font-bold text-emerald-400">{validationSummary.valid}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Review Required</p>
            <p className="text-lg font-bold text-amber-400">{validationSummary.reviewRequired}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Errors</p>
            <p className="text-lg font-bold text-rose-400">{validationSummary.errors}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold text-xs">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, options, explanation..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'VALID', 'REVIEW_REQUIRED', 'ERROR'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  statusFilter === st
                    ? st === 'VALID'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : st === 'REVIEW_REQUIRED'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : st === 'ERROR'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'REVIEW_REQUIRED' ? 'Review' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Level filter dropdown */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:border-indigo-500"
          >
            <option value="ALL">All Levels</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Unit filter dropdown */}
          {availableUnits.length > 0 && (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:border-indigo-500"
            >
              <option value="ALL">All Units</option>
              {availableUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Questions Match Current Filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords or filter settings, or click below to add a new question.
          </p>
          <button
            type="button"
            onClick={handleAddNewQuestion}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const originalIndex = questions.findIndex((item) => item.id === q.id);
            const val = validateQuestion(q);
            const isFirst = originalIndex === 0;
            const isLast = originalIndex === questions.length - 1;

            return (
              <div
                key={q.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all bg-slate-900/90 shadow-md ${
                  val.status === 'ERROR'
                    ? 'border-rose-500/40 ring-1 ring-rose-500/20'
                    : val.status === 'REVIEW_REQUIRED'
                    ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Question Card Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                  
                  {/* Left: Number, Tags, Status Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                      {q.order || originalIndex + 1}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        val.status === 'VALID'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                          : val.status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {val.status === 'VALID' && <CheckCircle2 className="w-3 h-3" />}
                      {val.status === 'REVIEW_REQUIRED' && <AlertTriangle className="w-3 h-3" />}
                      {val.status === 'ERROR' && <XCircle className="w-3 h-3" />}
                      {val.status}
                    </span>

                    {q.unit && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {q.unit}
                      </span>
                    )}

                    {q.lesson && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {q.lesson}
                      </span>
                    )}

                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {q.level || 'Medium'}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                      {q.questionType || 'Multiple Choice'}
                    </span>
                  </div>

                  {/* Right: Actions (Move Up, Move Down, Edit, Duplicate, Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(originalIndex)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(originalIndex)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-slate-800 mx-1" />

                    <button
                      type="button"
                      onClick={() => handleEditQuestion(q, originalIndex)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg flex items-center gap-1 transition-colors"
                      title="Edit Question"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateQuestion(originalIndex)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Duplicate Question"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingQuestionIndex(originalIndex)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Validation Warnings list if non-valid */}
                {val.allIssues.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Issues detected: </span>
                      {val.allIssues.join(' • ')}
                    </div>
                  </div>
                )}

                {/* Optional Passage */}
                {q.passage && (
                  <div className="mt-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 italic leading-relaxed">
                    <span className="font-bold not-italic text-indigo-400">Passage: </span>
                    {q.passage}
                  </div>
                )}

                {/* Question Stem Text */}
                <div className="mt-3">
                  <p className="text-sm font-semibold text-white leading-relaxed whitespace-pre-line">
                    {q.question || <span className="text-rose-400 italic">Empty question stem</span>}
                  </p>
                </div>

                {/* Options Grid (A, B, C, D) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                  {(q.options || []).map((opt, optIdx) => {
                    const isCorrect =
                      opt.id === q.correctAnswerId ||
                      (q.correctAnswer && (opt.label === q.correctAnswer || opt.text === q.correctAnswer));

                    return (
                      <div
                        key={opt.id || optIdx}
                        className={`p-3 rounded-xl text-xs flex items-center gap-3 border transition-all ${
                          isCorrect
                            ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200 font-semibold shadow-sm'
                            : 'bg-slate-950 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {opt.label || String.fromCharCode(65 + optIdx)}
                        </div>

                        <span className="flex-1 break-words">
                          {opt.text || <span className="text-rose-400 italic">Empty option text</span>}
                        </span>

                        {isCorrect && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Area */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-300">Explanation: </span>
                    {q.explanation ? (
                      <span className="text-slate-300 leading-relaxed">{q.explanation}</span>
                    ) : (
                      <span className="text-slate-500 italic">No explanation provided</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- QUESTION EDITOR MODAL ---------------- */}
      {isEditorModalOpen && editingQuestion && (
        <QuestionEditorModal
          question={editingQuestion}
          isOpen={isEditorModalOpen}
          questionNumber={editingQuestionIndex !== null ? editingQuestionIndex + 1 : undefined}
          onClose={() => {
            setIsEditorModalOpen(false);
            setEditingQuestion(null);
            setEditingQuestionIndex(null);
          }}
          onSave={handleSaveQuestionFromModal}
        />
      )}

      {/* ---------------- VALIDATION REPORT MODAL ---------------- */}
      {isValidationModalOpen && (
        <ValidationModal
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          summary={validationSummary}
          onSelectQuestionToFix={(idx) => {
            const target = questions[idx];
            if (target) {
              handleEditQuestion(target, idx);
            }
          }}
          onCreateGame={handleCreateGameClick}
        />
      )}

      {/* ---------------- DELETE QUESTION CONFIRMATION MODAL ---------------- */}
      {deletingQuestionIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                Delete Question #{deletingQuestionIndex + 1}?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove this question from the Question Set? Display order for other questions will update automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingQuestionIndex(null)}
                className="py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteQuestionConfirm}
                className="py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- UNSAVED CHANGES WARNING MODAL ---------------- */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Unsaved Changes</h3>
              <p className="text-xs text-slate-400 mt-1">
                You have unsaved changes in this Question Set. Would you like to save before leaving?
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const success = await handleSaveChanges();
                  if (success && pendingBackAction) {
                    setShowUnsavedWarning(false);
                    onBack();
                  }
                }}
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30"
              >
                Save and Leave
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  if (pendingBackAction) onBack();
                }}
                className="w-full py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 rounded-xl"
              >
                Leave Without Saving
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- GATEKEEPER VALIDATION MODAL ---------------- */}
      {showGatekeeperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                gatekeeperMode === 'errors'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {gatekeeperMode === 'errors' ? <XCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                {gatekeeperMode === 'errors' ? 'Errors Found in Question Set' : 'Review Warnings in Question Set'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {gatekeeperMode === 'errors'
                  ? `Some questions (${validationSummary.errors}) require attention before this Question Set can be safely used in game activities.`
                  : `All required fields are present, but ${validationSummary.reviewRequired} question(s) have warnings (e.g. duplicate options).`}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowGatekeeperModal(false);
                  setIsValidationModalOpen(true);
                }}
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30"
              >
                View Problems & Fix Now
              </button>

              {gatekeeperMode === 'review' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowGatekeeperModal(false);
                    setShowGameModal(true);
                  }}
                  className="w-full py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-xl"
                >
                  Use Valid Questions & Proceed
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowGatekeeperModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- GAME CONFIGURATION MODAL ---------------- */}
      {showGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Play className="w-4 h-4 fill-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white">Create Game Activity</h3>
              </div>
              <button
                onClick={() => setShowGameModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Source Question Set
                </p>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-emerald-400 font-medium">
                  {validationSummary.valid} Valid Academic Questions Available
                </p>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Number of Questions to include:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {([10, 20, 25, 30, 40, 'ALL'] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSelectedQuestionCount(cnt)}
                      disabled={cnt !== 'ALL' && typeof cnt === 'number' && cnt > questions.length}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        selectedQuestionCount === cnt
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                          : cnt !== 'ALL' && typeof cnt === 'number' && cnt > questions.length
                          ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {cnt === 'ALL' ? 'All' : `${cnt}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Format */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Game Engine:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'quiz', label: 'Quiz Bowl', desc: 'Fast-paced multiple choice' },
                    { id: 'gameshow_quiz', label: 'Gameshow Quiz', desc: 'Lifelines & point multipliers' },
                    { id: 'match_up', label: 'Match Up Cards', desc: 'Card matching memory challenge' },
                    { id: 'random_wheel', label: 'Random Wheel', desc: 'Classroom picker wheel' },
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
                onClick={() => setShowGameModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLaunchGame(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Game Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- WORD EXPORT MODAL ---------------- */}
      {isWordExportOpen && (
        <WordExportModal
          questions={questions}
          title={title || questionSet.title}
          sourceType="set"
          onClose={() => setIsWordExportOpen(false)}
        />
      )}
    </div>
  );
};
