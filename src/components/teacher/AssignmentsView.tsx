import React, { useState } from 'react';
import {
  Send,
  Plus,
  Copy,
  Check,
  QrCode,
  Calendar,
  Users,
  BarChart3,
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  StopCircle,
  ExternalLink,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Printer,
  Download,
  Tv,
  Sliders,
  AlertCircle,
  Eye,
  FileText,
} from 'lucide-react';
import { Activity, Assignment, AssignmentSettings, AssignmentStatus, GameType, QuestionItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { APP_NAME, ORG_NAME, GAME_TYPES } from '../../constants/gameTypes';
import {
  getDirectStudentLink,
  getQrCodeUrl,
  downloadQrCodeImage,
  printAssignmentSheet,
} from '../../utils/assignmentUtils';
import { WordExportModal } from './export/WordExportModal';
import { questionSetService } from '../../services/firestoreService';

interface AssignmentsViewProps {
  assignments: Assignment[];
  activities: Activity[];
  onCreateAssignment: (data: {
    activityId: string;
    title?: string;
    instructions?: string;
    targetClass?: string;
    targetType?: 'all' | 'class' | 'custom';
    startDate?: string;
    endDate?: string;
    maxAttempts?: number;
    allowRetry?: boolean;
    showAnswersAfter?: boolean;
    timeLimitMinutes?: number;
    settings?: Partial<AssignmentSettings>;
  }) => Promise<Assignment | void>;
  onUpdateAssignment?: (id: string, data: Partial<Assignment>) => Promise<void>;
  onRegenerateCode?: (id: string) => Promise<string | void>;
  onCloseAssignment: (id: string) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onViewResults: (assignmentId: string) => void;
  onLaunchStudentView: (code: string) => void;
}

const COMMON_CLASSES = [
  'All Classes',
  '10A1', '10A2', '10A3', '10A4', '10A5',
  '11A1', '11A2', '11A3', '11A4', '11A5',
  '12A1', '12A2', '12A3', '12A4', '12A5',
];

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments,
  activities,
  onCreateAssignment,
  onUpdateAssignment,
  onRegenerateCode,
  onCloseAssignment,
  onDeleteAssignment,
  onViewResults,
  onLaunchStudentView,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [gameTypeFilter, setGameTypeFilter] = useState('all');

  // Copy feedback state
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Classroom Display / QR Projection Modal State
  const [displayModalAssignment, setDisplayModalAssignment] = useState<Assignment | null>(null);
  const [projectionQrSize, setProjectionQrSize] = useState<160 | 240 | 320>(240);

  // Create Assignment Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createActivityId, setCreateActivityId] = useState<string>(activities[0]?.id || '');
  const [createTitle, setCreateTitle] = useState('');
  const [createInstructions, setCreateInstructions] = useState('');
  const [createClass, setCreateClass] = useState('All Classes');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createTimeLimit, setCreateTimeLimit] = useState('0');
  const [createMaxAttempts, setCreateMaxAttempts] = useState('1');
  const [createAllowRetry, setCreateAllowRetry] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Assignment Modal State
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editTimeLimit, setEditTimeLimit] = useState('0');
  const [editMaxAttempts, setEditMaxAttempts] = useState('1');
  const [editAllowRetry, setEditAllowRetry] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Regenerate Code Modal State
  const [regenerateTarget, setRegenerateTarget] = useState<Assignment | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Word Export Modal State
  const [wordExportModalData, setWordExportModalData] = useState<{
    questions: QuestionItem[];
    title: string;
  } | null>(null);
  const [isLoadingWordExport, setIsLoadingWordExport] = useState<string | null>(null);

  const handleWordExportAssignment = async (asgn: Assignment) => {
    // 1. Find matching activity in activities prop
    const matchedActivity = activities.find((act) => act.id === asgn.activityId);
    if (matchedActivity?.questionSet?.questions && matchedActivity.questionSet.questions.length > 0) {
      setWordExportModalData({
        questions: matchedActivity.questionSet.questions,
        title: asgn.title || asgn.activityTitle || matchedActivity.title,
      });
      return;
    }

    // 2. If activity has questionSetId, fetch from Firestore
    if (matchedActivity?.questionSetId) {
      try {
        setIsLoadingWordExport(asgn.id);
        const set = await questionSetService.getQuestionSet(matchedActivity.questionSetId);
        if (set && set.questions && set.questions.length > 0) {
          setWordExportModalData({
            questions: set.questions,
            title: asgn.title || asgn.activityTitle || set.title,
          });
        } else {
          showError('Không tìm thấy danh sách câu hỏi của bài tập này.');
        }
      } catch (err) {
        console.error('Failed to load questions for Word export:', err);
        showError('Không thể tải dữ liệu câu hỏi để xuất Word.');
      } finally {
        setIsLoadingWordExport(null);
      }
      return;
    }

    showError('Không tìm thấy dữ liệu câu hỏi của bài tập này để xuất Word.');
  };

  // Metric Computations
  const totalCount = assignments.length;
  const activeCount = assignments.filter((a) => a.status === 'active').length;
  const scheduledCount = assignments.filter((a) => a.status === 'scheduled').length;
  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.totalSubmissions || 0), 0);

  // Filtered List
  const filteredAssignments = assignments.filter((a) => {
    // 1. Search filter (title, code, targetClass, activityTitle)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = (a.title || a.activityTitle || '').toLowerCase().includes(q);
      const matchCode = a.assignmentCode.toLowerCase().includes(q);
      const matchClass = (a.targetClass || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchClass) return false;
    }

    // 2. Status filter
    if (statusFilter !== 'all') {
      if (a.status !== statusFilter) return false;
    }

    // 3. Class filter
    if (classFilter !== 'all') {
      if (classFilter === 'All Classes') {
        if (a.targetClass && a.targetClass !== 'All Classes') return false;
      } else {
        if (a.targetClass !== classFilter) return false;
      }
    }

    // 4. Game Type filter
    if (gameTypeFilter !== 'all') {
      if (a.gameType !== gameTypeFilter) return false;
    }

    return true;
  });

  const handleCopyCode = (asgn: Assignment) => {
    navigator.clipboard.writeText(asgn.assignmentCode);
    setCopiedCodeId(asgn.id);
    showSuccess(`6-Digit Code ${asgn.assignmentCode} copied to clipboard!`);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleCopyLink = (asgn: Assignment) => {
    const fullUrl = getDirectStudentLink(asgn.assignmentCode);
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkId(asgn.id);
    showSuccess(`Direct student link copied to clipboard!`);
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  const handleDownloadQr = async (asgn: Assignment) => {
    const ok = await downloadQrCodeImage(asgn.assignmentCode, asgn.title || asgn.activityTitle);
    if (ok) {
      showSuccess('QR Code downloaded as PNG!');
    }
  };

  const handleOpenEdit = (asgn: Assignment) => {
    setEditingAssignment(asgn);
    setEditTitle(asgn.title || asgn.activityTitle);
    setEditInstructions(asgn.instructions || '');
    setEditClass(asgn.targetClass || 'All Classes');
    setEditStartDate(asgn.startDate || asgn.startAt || '');
    setEditEndDate(asgn.endDate || asgn.endAt || '');
    setEditTimeLimit(String(asgn.timeLimitMinutes || 0));
    setEditMaxAttempts(String(asgn.maxAttempts || 1));
    setEditAllowRetry(asgn.allowRetry || (asgn.settings?.allowMultipleAttempts ?? false));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !onUpdateAssignment) return;

    setIsSubmittingEdit(true);
    try {
      await onUpdateAssignment(editingAssignment.id, {
        title: editTitle.trim(),
        instructions: editInstructions.trim() || undefined,
        targetClass: editClass.trim() || 'All Classes',
        startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined,
        timeLimitMinutes: parseInt(editTimeLimit, 10) || 0,
        maxAttempts: editAllowRetry ? parseInt(editMaxAttempts, 10) || 1 : 1,
        allowRetry: editAllowRetry,
        settings: {
          ...(editingAssignment.settings || {}),
          allowMultipleAttempts: editAllowRetry,
          maxAttempts: editAllowRetry ? parseInt(editMaxAttempts, 10) || 1 : 1,
          timeLimitMinutes: parseInt(editTimeLimit, 10) || 0,
        },
      });

      showSuccess('Assignment updated successfully.');
      setEditingAssignment(null);
    } catch (err) {
      console.error('Error updating assignment:', err);
      showError('Failed to update assignment.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!regenerateTarget || !onRegenerateCode) return;
    setIsRegenerating(true);
    try {
      const newCode = await onRegenerateCode(regenerateTarget.id);
      showSuccess(`New 6-digit code generated: ${newCode || 'Updated'}`);
      setRegenerateTarget(null);
    } catch (err) {
      console.error('Error regenerating code:', err);
      showError('Failed to regenerate code.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDeleteAssignment(deleteConfirmId);
      showSuccess('Assignment deleted from Firestore.');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting assignment:', err);
      showError('Failed to delete assignment.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createActivityId) {
      showError('Please select an activity to assign.');
      return;
    }

    const sourceAct = activities.find((a) => a.id === createActivityId);
    if (!sourceAct) return;

    setIsSubmittingCreate(true);
    try {
      await onCreateAssignment({
        activityId: createActivityId,
        title: createTitle.trim() || sourceAct.title,
        instructions: createInstructions.trim() || undefined,
        targetClass: createClass,
        startDate: createStartDate ? new Date(createStartDate).toISOString() : undefined,
        endDate: createEndDate ? new Date(createEndDate).toISOString() : undefined,
        timeLimitMinutes: parseInt(createTimeLimit, 10) || 0,
        maxAttempts: createAllowRetry ? parseInt(createMaxAttempts, 10) || 1 : 1,
        allowRetry: createAllowRetry,
      });

      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateInstructions('');
      showSuccess('Assignment published with dynamic 6-digit access code.');
    } catch (err) {
      console.error('Error creating assignment:', err);
      showError('Unable to create assignment.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Expired
          </span>
        );
      case 'closed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Assignments & 6-Digit Class Access
          </h1>
          <p className="text-xs text-slate-500">
            Publish interactive English activities with automatic 6-digit codes, printable handouts, and QR codes.
          </p>
        </div>

        <Button
          id="btn-open-create-assignment-modal"
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (activities.length === 0) {
              showError('Please create at least one activity before assigning.');
              return;
            }
            setCreateActivityId(activities[0].id);
            setCreateTitle(activities[0].title);
            setIsCreateModalOpen(true);
          }}
        >
          Create Assignment
        </Button>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card variant="default" padding="sm" className="bg-white border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Assignments
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{totalCount}</div>
        </Card>

        <Card variant="default" padding="sm" className="bg-white border-emerald-100">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Active Sessions
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{activeCount}</div>
        </Card>

        <Card variant="default" padding="sm" className="bg-white border-amber-100">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            Scheduled
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">{scheduledCount}</div>
        </Card>

        <Card variant="default" padding="sm" className="bg-white border-indigo-100">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            Total Submissions
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono mt-1">{totalSubmissions}</div>
        </Card>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assignments by title, 6-digit code, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {(['all', 'active', 'scheduled', 'expired', 'closed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer capitalize shrink-0 ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters: Class & Game Type */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" /> Class:
            </span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-indigo-500 outline-none"
            >
              <option value="all">All Classes</option>
              {COMMON_CLASSES.filter((c) => c !== 'All Classes').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Game Type:</span>
            <select
              value={gameTypeFilter}
              onChange={(e) => setGameTypeFilter(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-indigo-500 outline-none"
            >
              <option value="all">All Game Types</option>
              {GAME_TYPES.map((g) => (
                <option key={g.type} value={g.type}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || statusFilter !== 'all' || classFilter !== 'all' || gameTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setClassFilter('all');
                setGameTypeFilter('all');
              }}
              className="ml-auto text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ASSIGNMENT CARDS LIST */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description={
            assignments.length === 0
              ? 'Generate your first assignment code to share with your English students.'
              : 'No assignments match your active search and filter criteria.'
          }
          icon={<Send className="w-8 h-8 text-slate-400" />}
          action={
            activities.length > 0 ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setCreateActivityId(activities[0].id);
                  setCreateTitle(activities[0].title);
                  setIsCreateModalOpen(true);
                }}
              >
                Assign an Activity
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAssignments.map((asgn) => {
            const isCodeCopied = copiedCodeId === asgn.id;
            const isLinkCopied = copiedLinkId === asgn.id;

            return (
              <Card
                key={asgn.id}
                variant="default"
                padding="md"
                className="hover:border-indigo-200 transition-all flex flex-col justify-between shadow-sm bg-white"
              >
                <div>
                  {/* Top Header with Status & 6-Digit Code */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(asgn.status)}
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                          {asgn.targetClass || 'All Classes'}
                        </span>
                        <span className="text-[11px] uppercase font-semibold text-slate-400">
                          {asgn.gameType}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-display truncate">
                        {asgn.title || asgn.activityTitle}
                      </h3>
                      {asgn.instructions && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {asgn.instructions}
                        </p>
                      )}
                    </div>

                    {/* 6-DIGIT CODE HIGHLIGHT */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Class Code</div>
                      <button
                        onClick={() => handleCopyCode(asgn)}
                        className="font-mono text-xl font-extrabold tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Click to copy 6-digit code"
                      >
                        <span>{asgn.assignmentCode}</span>
                        {isCodeCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submission and Parameters Bar */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 text-center my-3 bg-slate-50/60 rounded-xl">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {asgn.totalSubmissions || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">Submissions</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {asgn.timeLimitMinutes ? `${asgn.timeLimitMinutes}m` : 'Untimed'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">Time Limit</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {asgn.maxAttempts === 1 ? '1 Attempt' : `${asgn.maxAttempts || '∞'} Attempts`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">Policy</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Classroom Display Mode / QR */}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Tv className="w-3.5 h-3.5 text-indigo-600" />}
                      onClick={() => setDisplayModalAssignment(asgn)}
                      title="Classroom Projector & QR Mode"
                    >
                      Project / QR
                    </Button>

                    {/* Copy Link */}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={() => handleCopyLink(asgn)}
                    >
                      {isLinkCopied ? 'Link Copied' : 'Copy Link'}
                    </Button>

                    {/* Print Sheet */}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Printer className="w-3.5 h-3.5 text-slate-600" />}
                      onClick={() => printAssignmentSheet(asgn)}
                      title="Print Classroom Handout Sheet"
                    >
                      Print
                    </Button>

                    {/* Word & Key Export */}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={isLoadingWordExport === asgn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> : <FileText className="w-3.5 h-3.5 text-indigo-600" />}
                      onClick={() => handleWordExportAssignment(asgn)}
                      title="Xuất đề thi và bảng đáp án file Word (.docx)"
                      disabled={isLoadingWordExport === asgn.id}
                    >
                      Word &amp; Key
                    </Button>

                    {/* Student View Launch */}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Eye className="w-3.5 h-3.5 text-emerald-600" />}
                      onClick={() => onLaunchStudentView(asgn.assignmentCode)}
                      title="Test Student View"
                    >
                      Student View
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Results */}
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<BarChart3 className="w-3.5 h-3.5" />}
                      onClick={() => onViewResults(asgn.id)}
                    >
                      Results
                    </Button>

                    {/* Edit Modal */}
                    {onUpdateAssignment && (
                      <button
                        onClick={() => handleOpenEdit(asgn)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Assignment Parameters"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Regenerate Code */}
                    {onRegenerateCode && (
                      <button
                        onClick={() => setRegenerateTarget(asgn)}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Regenerate 6-Digit Code"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}

                    {/* Close / Reopen */}
                    {asgn.status === 'active' ? (
                      <button
                        onClick={async () => {
                          await onCloseAssignment(asgn.id);
                          showInfo(`Assignment ${asgn.assignmentCode} closed.`);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Close Assignment"
                      >
                        <StopCircle className="w-4 h-4" />
                      </button>
                    ) : null}

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteConfirmId(asgn.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CLASSROOM DISPLAY / QR MODAL */}
      {displayModalAssignment && (
        <Modal
          isOpen={!!displayModalAssignment}
          onClose={() => setDisplayModalAssignment(null)}
          title={`Classroom Display: ${displayModalAssignment.title || displayModalAssignment.activityTitle}`}
          size="lg"
        >
          <div className="space-y-6 text-center py-2">
            {/* Header info */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>EduSpace25 • {ORG_NAME}</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                {displayModalAssignment.title || displayModalAssignment.activityTitle}
              </h2>
              <p className="text-xs text-slate-500">
                Target Class: <strong>{displayModalAssignment.targetClass || 'All Classes'}</strong> • Game: <strong>{displayModalAssignment.gameType.toUpperCase()}</strong>
              </p>
            </div>

            {/* Giant 6-Digit Code for Whiteboard Projection */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-3">
              <div className="text-xs uppercase tracking-widest text-indigo-300 font-bold">
                Enter 6-Digit Code
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="font-mono text-5xl sm:text-6xl font-black tracking-widest text-amber-300 drop-shadow-md">
                  {displayModalAssignment.assignmentCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(displayModalAssignment)}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Copy 6-Digit Code"
                >
                  {copiedCodeId === displayModalAssignment.id ? (
                    <Check className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Copy className="w-6 h-6" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Students open <strong>EduSpace25</strong> and type this code to begin
              </p>
            </div>

            {/* QR Projection & Size Switcher */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between max-w-xs mx-auto text-xs font-semibold text-slate-600">
                <span>QR Projection Size:</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setProjectionQrSize(160)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      projectionQrSize === 160 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Small
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectionQrSize(240)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      projectionQrSize === 240 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectionQrSize(320)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      projectionQrSize === 320 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Large
                  </button>
                </div>
              </div>

              <div
                className="bg-white border border-slate-200 rounded-2xl p-3 mx-auto shadow-sm flex items-center justify-center transition-all"
                style={{ width: `${projectionQrSize + 24}px`, height: `${projectionQrSize + 24}px` }}
              >
                <img
                  src={getQrCodeUrl(displayModalAssignment.assignmentCode, projectionQrSize)}
                  alt="Assignment QR Code"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-xs text-slate-500">
                Quét mã QR bằng điện thoại để vào thẳng màn hình nhập Họ tên & Lớp (Không cần mã PIN)
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Button
                variant="primary"
                size="md"
                icon={copiedLinkId === displayModalAssignment.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={() => handleCopyLink(displayModalAssignment)}
              >
                Copy Student Link
              </Button>

              <Button
                variant="outline"
                size="md"
                icon={<Download className="w-4 h-4" />}
                onClick={() => handleDownloadQr(displayModalAssignment)}
              >
                Download QR (PNG)
              </Button>

              <Button
                variant="outline"
                size="md"
                icon={<Printer className="w-4 h-4 text-slate-600" />}
                onClick={() => printAssignmentSheet(displayModalAssignment)}
              >
                Print Handout
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Class Assignment"
        size="md"
      >
        <form onSubmit={handleCreateAssignmentSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Activity to Assign *
            </label>
            <Select
              id="select-assign-activity"
              value={createActivityId}
              onChange={(e) => {
                setCreateActivityId(e.target.value);
                const act = activities.find((a) => a.id === e.target.value);
                if (act && !createTitle) setCreateTitle(act.title);
              }}
              options={activities.map((a) => ({
                value: a.id,
                label: `${a.title} (${a.questionSet?.questions.length || a.itemCount || 0} questions)`,
              }))}
            />
          </div>

          <div>
            <Input
              id="input-create-title"
              label="Assignment Title *"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="e.g. Unit 3 Test Review"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Class</label>
              <Select
                id="input-target-class"
                value={createClass}
                onChange={(e) => setCreateClass(e.target.value)}
                options={COMMON_CLASSES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Time Limit</label>
              <Select
                id="select-time-limit"
                value={createTimeLimit}
                onChange={(e) => setCreateTimeLimit(e.target.value)}
                options={[
                  { value: '0', label: 'Untimed' },
                  { value: '10', label: '10 Minutes' },
                  { value: '15', label: '15 Minutes' },
                  { value: '20', label: '20 Minutes' },
                  { value: '30', label: '30 Minutes' },
                  { value: '45', label: '45 Minutes' },
                  { value: '60', label: '60 Minutes' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmittingCreate}
              icon={isSubmittingCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            >
              {isSubmittingCreate ? 'Publishing...' : 'Generate 6-Digit Code'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT ASSIGNMENT MODAL */}
      {editingAssignment && (
        <Modal
          isOpen={!!editingAssignment}
          onClose={() => setEditingAssignment(null)}
          title={`Edit Assignment: ${editingAssignment.assignmentCode}`}
          size="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Input
                id="edit-asgn-title"
                label="Assignment Title *"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Instructions</label>
              <textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                rows={2}
                placeholder="Instructions for students"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Class</label>
                <Select
                  id="edit-asgn-class"
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  options={COMMON_CLASSES.map((c) => ({ value: c, label: c }))}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Time Limit</label>
                <Select
                  id="edit-asgn-time"
                  value={editTimeLimit}
                  onChange={(e) => setEditTimeLimit(e.target.value)}
                  options={[
                    { value: '0', label: 'Untimed' },
                    { value: '10', label: '10 Minutes' },
                    { value: '15', label: '15 Minutes' },
                    { value: '20', label: '20 Minutes' },
                    { value: '30', label: '30 Minutes' },
                    { value: '45', label: '45 Minutes' },
                    { value: '60', label: '60 Minutes' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-700">Allow Multiple Attempts</span>
              <input
                type="checkbox"
                checked={editAllowRetry}
                onChange={(e) => setEditAllowRetry(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setEditingAssignment(null)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmittingEdit}
                icon={isSubmittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              >
                {isSubmittingEdit ? 'Saving Changes...' : 'Save Updates'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* REGENERATE CODE CONFIRMATION MODAL */}
      {regenerateTarget && (
        <Modal
          isOpen={!!regenerateTarget}
          onClose={() => setRegenerateTarget(null)}
          title="Regenerate 6-Digit Code"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Warning:</strong> The current code (<strong>{regenerateTarget.assignmentCode}</strong>) will be invalidated immediately. Any student who has not joined yet will need the new 6-digit code or updated QR code.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setRegenerateTarget(null)}
                disabled={isRegenerating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmRegenerate}
                disabled={isRegenerating}
                icon={isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              >
                {isRegenerating ? 'Generating...' : 'Confirm New Code'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Assignment"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this assignment from Firestore? Past student results will remain preserved in historical records.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                icon={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              >
                {isDeleting ? 'Deleting...' : 'Delete Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* WORD EXPORT MODAL */}
      {wordExportModalData && (
        <WordExportModal
          questions={wordExportModalData.questions}
          title={wordExportModalData.title}
          sourceType="assignment"
          onClose={() => setWordExportModalData(null)}
        />
      )}
    </div>
  );
};
