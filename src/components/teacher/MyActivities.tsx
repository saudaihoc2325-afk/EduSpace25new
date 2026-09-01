import React, { useState } from 'react';
import {
  Search,
  Filter,
  Play,
  Send,
  Edit3,
  Copy,
  Trash2,
  RefreshCw,
  FileDown,
  Key,
  FolderIcon,
  HelpCircle,
  Plus,
  Layers,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { Activity, Folder, GameType, QuestionItem } from '../../types';
import { GAME_TYPES } from '../../constants/gameTypes';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { WordExportModal } from './export/WordExportModal';
import { questionSetService } from '../../services/firestoreService';

interface MyActivitiesProps {
  activities: Activity[];
  folders: Folder[];
  onCreateNew: () => void;
  onEdit: (activity: Activity) => void;
  onDuplicate: (activity: Activity) => Promise<void>;
  onDelete: (activityId: string) => Promise<void>;
  onPlay: (activity: Activity) => void;
  onAssign: (activity: Activity) => void;
  onConvertGameType: (activityId: string, newType: GameType) => Promise<void>;
}

export const MyActivities: React.FC<MyActivitiesProps> = ({
  activities,
  folders,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
  onPlay,
  onAssign,
  onConvertGameType,
}) => {
  const { showSuccess, showInfo, showError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Convert Modal State
  const [convertModalActivity, setConvertModalActivity] = useState<Activity | null>(null);
  const [targetConvertType, setTargetConvertType] = useState<GameType>('quiz');
  const [isConverting, setIsConverting] = useState(false);

  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicating state
  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);

  // Word Export Modal State
  const [wordExportModalData, setWordExportModalData] = useState<{
    questions: QuestionItem[];
    title: string;
  } | null>(null);
  const [isLoadingWordExport, setIsLoadingWordExport] = useState<string | null>(null);

  const handleOpenWordExport = async (act: Activity) => {
    // If activity has embedded questions in questionSet
    if (act.questionSet?.questions && act.questionSet.questions.length > 0) {
      setWordExportModalData({
        questions: act.questionSet.questions,
        title: act.title,
      });
      return;
    }

    // Otherwise fetch questionSet from Firestore if questionSetId exists
    if (act.questionSetId) {
      try {
        setIsLoadingWordExport(act.id);
        const set = await questionSetService.getQuestionSet(act.questionSetId);
        if (set && set.questions && set.questions.length > 0) {
          setWordExportModalData({
            questions: set.questions,
            title: act.title || set.title,
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
    } else {
      showError('Bài tập không có bộ câu hỏi gắn kèm.');
    }
  };

  // Filtered activities
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.description && act.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder =
      selectedFolderFilter === 'all'
        ? true
        : selectedFolderFilter === 'root'
        ? !act.folderId
        : act.folderId === selectedFolderFilter;

    const matchesType = selectedTypeFilter === 'all' ? true : act.gameType === selectedTypeFilter;

    return matchesSearch && matchesFolder && matchesType;
  });

  const getFolderName = (fId?: string | null) => {
    if (!fId) return 'Root Library';
    const f = folders.find((folder) => folder.id === fId);
    return f ? f.name : 'Unknown Folder';
  };

  const getGameMeta = (type: GameType) => {
    return GAME_TYPES.find((g) => g.type === type) || GAME_TYPES[0];
  };

  const handleExecuteConvert = async () => {
    if (!convertModalActivity) return;
    setIsConverting(true);
    try {
      await onConvertGameType(convertModalActivity.id, targetConvertType);
      showSuccess(
        `Activity successfully converted to ${getGameMeta(targetConvertType).label} format in Firestore!`
      );
      setConvertModalActivity(null);
    } catch (err) {
      console.error('Error converting activity game type:', err);
      showError('Failed to convert game type.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteConfirmId);
      showSuccess('Activity removed from Firestore database.');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
      showError('Failed to delete activity.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateClick = async (act: Activity) => {
    setIsDuplicatingId(act.id);
    try {
      await onDuplicate(act);
      showSuccess(`Duplicated "${act.title}" to Firestore.`);
    } catch (err) {
      console.error('Error duplicating activity:', err);
      showError('Failed to duplicate activity.');
    } finally {
      setIsDuplicatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            My Activities
          </h1>
          <p className="text-xs text-slate-500">
            {activities.length} interactive exercises stored in your teacher account.
          </p>
        </div>

        <Button
          id="btn-activities-create-new"
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={onCreateNew}
        >
          Create Activity
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="default" padding="sm" className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-1">
            <Input
              id="search-activities-input"
              icon={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Search by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Folder Filter */}
          <div>
            <select
              id="filter-activities-folder"
              value={selectedFolderFilter}
              onChange={(e) => setSelectedFolderFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="all">📁 All Folders ({activities.length})</option>
              <option value="root">📂 Root Library (No Folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Game Type Filter */}
          <div>
            <select
              id="filter-activities-type"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="all">🎮 All Game Formats</option>
              {GAME_TYPES.map((g) => (
                <option key={g.type} value={g.type}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Activities Grid */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matching activities found' : 'No activities created yet'}
          description={
            searchQuery
              ? 'Try changing your search terms or filter settings.'
              : 'Design your first interactive English game quiz or exercise for your high school students.'
          }
          icon={<Layers className="w-8 h-8 text-slate-400" />}
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={onCreateNew}
            >
              Create Activity
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((act) => {
            const meta = getGameMeta(act.gameType);
            const questionCount = act.questionSet?.questions?.length || act.itemCount || 0;
            const folderName = getFolderName(act.folderId);

            return (
              <Card
                key={act.id}
                variant="default"
                padding="md"
                className="hover:border-indigo-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${meta.badgeColor}`}
                    >
                      {meta.label}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 truncate max-w-[140px]">
                      <FolderIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{folderName}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 font-display group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
                    {act.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                    {act.description || 'Interactive English exercise created for high school curriculum.'}
                  </p>

                  {/* Meta stats */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    <span className="font-semibold text-slate-600">
                      {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{act.status}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Play className="w-3.5 h-3.5 text-emerald-600" />}
                      onClick={() => onPlay(act)}
                      title="Preview / Play Exercise"
                    >
                      Play
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => onAssign(act)}
                      title="Assign to Students"
                    >
                      Assign
                    </Button>
                  </div>

                    {/* Quick menu buttons */}
                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        onClick={() => handleOpenWordExport(act)}
                        disabled={isLoadingWordExport === act.id}
                        className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-indigo-500"
                        title="Xuất đề thi và đáp án file Word (.docx)"
                      >
                        {isLoadingWordExport === act.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onEdit(act)}
                        className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Activity"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                    <button
                      onClick={() => {
                        setConvertModalActivity(act);
                        setTargetConvertType(act.gameType);
                      }}
                      className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Switch Game Format (e.g. Match Up, Anagram, Quiz)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDuplicateClick(act)}
                      disabled={isDuplicatingId === act.id}
                      className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Duplicate Activity"
                    >
                      {isDuplicatingId === act.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(act.id)}
                      className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CONVERT GAME TYPE MODAL */}
      {convertModalActivity && (
        <Modal
          isOpen={!!convertModalActivity}
          onClose={() => setConvertModalActivity(null)}
          title={`Switch Game Format: "${convertModalActivity.title}"`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              One question set can power multiple game modes. Choose a new template format to transform this exercise:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {GAME_TYPES.map((gt) => {
                const isSelected = targetConvertType === gt.type;
                return (
                  <button
                    key={gt.type}
                    type="button"
                    onClick={() => setTargetConvertType(gt.type)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{gt.label}</span>
                        {gt.type === convertModalActivity.gameType && (
                          <Badge variant="default" size="sm">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {gt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setConvertModalActivity(null)}
                disabled={isConverting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleExecuteConvert}
                disabled={isConverting}
                icon={isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {isConverting ? 'Updating in Firestore...' : 'Apply Format'}
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
          title="Delete Activity"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this activity from Firestore? This action cannot be undone.
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
                {isDeleting ? 'Deleting...' : 'Delete Activity'}
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
          sourceType="activity"
          onClose={() => setWordExportModalData(null)}
        />
      )}
    </div>
  );
};
