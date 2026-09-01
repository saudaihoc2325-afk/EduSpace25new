import React, { useState, useEffect } from 'react';
import {
  Send,
  Check,
  Copy,
  QrCode,
  Sparkles,
  CheckCircle2,
  Loader2,
  Printer,
  Download,
  Eye,
  Sliders,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Settings,
  X,
  FolderPlus,
} from 'lucide-react';
import { Activity, Assignment, AssignmentSettings, ClassItem, GradeLevel } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../../context/ToastContext';
import { classService } from '../../services/firestoreService';
import {
  getDirectStudentLink,
  getQrCodeUrl,
  downloadQrCodeImage,
  printAssignmentSheet,
} from '../../utils/assignmentUtils';

interface AssignModalProps {
  activity: Activity | null;
  onClose: () => void;
  onCreateAssignment: (data: {
    activityId: string;
    title?: string;
    instructions?: string;
    targetClass?: string;
    targetType?: 'all' | 'class' | 'custom';
    classIds?: string[];
    startDate?: string;
    endDate?: string;
    maxAttempts?: number;
    allowRetry?: boolean;
    showAnswersAfter?: boolean;
    timeLimitMinutes?: number;
    settings?: Partial<AssignmentSettings>;
  }) => Promise<Assignment | void>;
  onViewAssignments: () => void;
  onLaunchStudentView?: (code: string) => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  activity,
  onClose,
  onCreateAssignment,
  onViewAssignments,
  onLaunchStudentView,
}) => {
  const { showSuccess, showError } = useToast();

  const [title, setTitle] = useState(activity?.title || '');
  const [instructions, setInstructions] = useState('');
  const [selectedClassOption, setSelectedClassOption] = useState('All Classes');
  const [customClass, setCustomClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('0');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Settings Toggles (Defaults according to Prompt 7)
  const [requireStudentName, setRequireStudentName] = useState(true);
  const [requireClass, setRequireClass] = useState(true);
  const [requireStudentId, setRequireStudentId] = useState(false);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [showScore, setShowScore] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAssignment, setCreatedAssignment] = useState<Assignment | null>(null);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [qrSize, setQrSize] = useState<160 | 240 | 320>(240);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);

  // Dynamic Class Management State (Zero default classes, completely teacher-created)
  const [savedClasses, setSavedClasses] = useState<ClassItem[]>([]);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<GradeLevel>('10');
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [isManagingClasses, setIsManagingClasses] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const teacherOwnerId = activity?.ownerId || 'teacher_default';

  useEffect(() => {
    const unsub = classService.subscribeClasses(teacherOwnerId, (list) => {
      setSavedClasses(list);
    });
    return () => unsub();
  }, [teacherOwnerId]);

  // Compute available class names - only 'All Classes', teacher's custom classes, and 'Custom Class'
  const availableClassOptions = React.useMemo(() => {
    const options = [{ value: 'All Classes', label: 'All Classes (Tất cả các lớp)' }];
    savedClasses.forEach((c) => {
      options.push({
        value: c.name,
        label: c.gradeLevel && c.gradeLevel !== 'All Grades' ? `${c.name} (Khối ${c.gradeLevel})` : c.name,
      });
    });
    options.push({ value: 'Custom Class', label: '+ Nhập tên lớp tùy chỉnh khác...' });
    return options;
  }, [savedClasses]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newClassName.trim().toUpperCase();
    if (!clean) {
      showError('Vui lòng nhập tên lớp');
      return;
    }

    if (savedClasses.some((c) => c.name.toUpperCase() === clean)) {
      showError(`Lớp "${clean}" đã tồn tại trong danh sách của bạn`);
      setSelectedClassOption(clean);
      setIsAddingClass(false);
      return;
    }

    setIsSavingClass(true);
    try {
      const created = await classService.addClass(teacherOwnerId, clean, newClassGrade);
      setSelectedClassOption(created.name);
      setNewClassName('');
      setIsAddingClass(false);
      showSuccess(`Đã tạo và thêm lớp ${created.name} thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo lớp học';
      showError(msg);
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleDeleteClass = async (classItem: ClassItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp "${classItem.name}" khỏi danh sách?`)) {
      return;
    }

    setDeletingClassId(classItem.id);
    try {
      await classService.deleteClass(classItem.id);
      if (selectedClassOption === classItem.name) {
        setSelectedClassOption('All Classes');
      }
      showSuccess(`Đã xóa lớp ${classItem.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa lớp học';
      showError(msg);
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleDeleteAllClasses = async () => {
    if (savedClasses.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn xóa TẤT CẢ (${savedClasses.length}) lớp học đã tạo? Hành động này sẽ làm sạch danh sách lớp.`)) {
      return;
    }

    setIsDeletingAll(true);
    try {
      await classService.deleteAllClasses(teacherOwnerId);
      setSelectedClassOption('All Classes');
      setIsManagingClasses(false);
      showSuccess('Đã làm sạch toàn bộ danh sách lớp học!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa tất cả lớp';
      showError(msg);
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (!activity) return null;

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalTargetClass =
      selectedClassOption === 'Custom Class' ? customClass.trim() || 'General' : selectedClassOption;

    try {
      const asgn = await onCreateAssignment({
        activityId: activity.id,
        title: title.trim() || activity.title,
        instructions: instructions.trim() || undefined,
        targetClass: finalTargetClass,
        targetType: finalTargetClass === 'All Classes' ? 'all' : 'class',
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        maxAttempts: allowMultipleAttempts ? parseInt(maxAttempts, 10) || 1 : 1,
        allowRetry: allowMultipleAttempts,
        timeLimitMinutes: parseInt(timeLimitMinutes, 10) || 0,
        showAnswersAfter: showCorrectAnswers,
        settings: {
          requireStudentName,
          requireClass,
          requireStudentId,
          allowMultipleAttempts,
          maxAttempts: allowMultipleAttempts ? parseInt(maxAttempts, 10) || 1 : 1,
          showScore,
          showExplanation,
          showCorrectAnswers,
          shuffleQuestions,
          shuffleAnswers,
          timeLimitMinutes: parseInt(timeLimitMinutes, 10) || 0,
        },
      });

      if (asgn) {
        setCreatedAssignment(asgn);
        showSuccess(`Assignment created with 6-digit code: ${asgn.assignmentCode}`);
      }
    } catch (err) {
      console.error('Error creating assignment in modal:', err);
      showError('Failed to create assignment in Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setIsCodeCopied(true);
    showSuccess(`6-Digit Code ${code} copied!`);
    setTimeout(() => setIsCodeCopied(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const fullUrl = getDirectStudentLink(code);
    navigator.clipboard.writeText(fullUrl);
    setIsLinkCopied(true);
    showSuccess('Direct student link copied to clipboard!');
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const handleDownloadQr = async (code: string) => {
    setIsDownloadingQr(true);
    try {
      await downloadQrCodeImage(code, title || activity.title);
      showSuccess('QR Code downloaded as PNG!');
    } catch (err) {
      showError('Failed to download QR code.');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  return (
    <Modal
      isOpen={!!activity}
      onClose={() => {
        setCreatedAssignment(null);
        onClose();
      }}
      title={createdAssignment ? 'Assignment Published & 6-Digit Code Ready!' : `Assign Activity: "${activity.title}"`}
      size={createdAssignment ? 'lg' : 'md'}
    >
      {!createdAssignment ? (
        <form onSubmit={handleLaunch} className="space-y-4">
          {/* Selected Activity Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Selected Activity Source
            </div>
            <div className="text-sm font-bold text-slate-900">{activity.title}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-indigo-600 uppercase">{activity.gameType}</span>
              <span>•</span>
              <span>{activity.questionSet?.questions.length || activity.itemCount || 0} Questions</span>
            </div>
          </div>

          {/* Assignment Title */}
          <div>
            <Input
              id="modal-asgn-title"
              label="Assignment Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 3 Review Test - Class 10A1"
              required
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Instructions for Students (Optional)
            </label>
            <textarea
              id="modal-asgn-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. Please complete all questions carefully before Friday 5 PM."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800"
            />
          </div>

          {/* Class Target & Time Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Target Class *</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingClass(!isAddingClass);
                      setIsManagingClasses(false);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm lớp</span>
                  </button>
                  {savedClasses.length > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManagingClasses(!isManagingClasses);
                          setIsAddingClass(false);
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Quản lý ({savedClasses.length})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline Add Class Form */}
              {isAddingClass && (
                <div className="mb-2 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                    <span className="flex items-center gap-1">
                      <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
                      Tạo lớp học mới
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingClass(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Tên lớp (VD: 10A6, 11D1, 12A1)..."
                      className="flex-1 text-xs h-8 px-2.5 rounded-lg border border-indigo-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold uppercase"
                      autoFocus
                    />
                    <select
                      value={newClassGrade}
                      onChange={(e) => setNewClassGrade(e.target.value as GradeLevel)}
                      className="text-xs h-8 px-2 rounded-lg border border-indigo-300 bg-white text-slate-800 focus:outline-none"
                    >
                      <option value="10">Khối 10</option>
                      <option value="11">Khối 11</option>
                      <option value="12">Khối 12</option>
                      <option value="All Grades">Chung</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingClass(false)}
                      className="h-7 text-[11px] px-2.5 rounded-lg"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleCreateClass}
                      disabled={isSavingClass || !newClassName.trim()}
                      icon={isSavingClass ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      className="h-7 text-[11px] px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500"
                    >
                      {isSavingClass ? 'Đang lưu...' : 'Lưu lớp'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Class Management List (Delete classes) */}
              {isManagingClasses && (
                <div className="mb-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1 border-b border-slate-200/60">
                    <span>Danh sách lớp học của bạn ({savedClasses.length})</span>
                    <div className="flex items-center gap-2">
                      {savedClasses.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDeleteAllClasses}
                          disabled={isDeletingAll}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                        >
                          {isDeletingAll ? 'Đang xóa...' : 'Xóa tất cả'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsManagingClasses(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {savedClasses.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-2 text-center">
                      Danh sách trống. Hãy nhấn <strong>+ Thêm lớp</strong> để tạo lớp mới.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {savedClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-xs"
                        >
                          <div className="flex items-center gap-2">
                            <strong className="font-bold text-slate-800">{cls.name}</strong>
                            {cls.gradeLevel && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                                Khối {cls.gradeLevel}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(cls)}
                            disabled={deletingClassId === cls.id}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-1 text-[11px] font-bold"
                            title="Xóa lớp học này"
                          >
                            {deletingClassId === cls.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Select
                id="modal-select-class"
                value={selectedClassOption}
                onChange={(e) => setSelectedClassOption(e.target.value)}
                options={availableClassOptions}
              />
              {savedClasses.length === 0 && selectedClassOption === 'All Classes' && !isAddingClass && (
                <p className="mt-1 text-[11px] text-slate-400 italic">
                  💡 Chưa có lớp học nào được tạo. Bạn có thể nhấn <strong className="text-indigo-600 font-semibold cursor-pointer" onClick={() => setIsAddingClass(true)}>+ Thêm lớp</strong> để tạo lớp mới hoặc để mặc định "All Classes".
                </p>
              )}
              {selectedClassOption === 'Custom Class' && (
                <input
                  type="text"
                  value={customClass}
                  onChange={(e) => setCustomClass(e.target.value)}
                  placeholder="Nhập tên lớp tùy chỉnh (VD: 10A7, Chuyên Anh)..."
                  className="mt-2 w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 outline-none uppercase font-bold"
                  required
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Time Limit (Minutes)</label>
              <Select
                id="modal-select-time"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                options={[
                  { value: '0', label: 'Untimed / No Limit' },
                  { value: '5', label: '5 Minutes' },
                  { value: '10', label: '10 Minutes' },
                  { value: '15', label: '15 Minutes' },
                  { value: '20', label: '20 Minutes' },
                  { value: '30', label: '30 Minutes' },
                  { value: '45', label: '45 Minutes' },
                  { value: '60', label: '60 Minutes (1 Hour)' },
                ]}
              />
            </div>
          </div>

          {/* Schedule Window (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Start Availability (Optional)</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Due / End Availability (Optional)</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Advanced Assignment Settings Accordion */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Assignment & Student Flow Settings
              </span>
              <span className="text-indigo-600 text-[11px]">
                {showAdvancedSettings ? 'Hide' : 'Customize Options'}
              </span>
            </button>

            {showAdvancedSettings && (
              <div className="p-4 bg-white space-y-3.5 border-t border-slate-200 text-xs">
                {/* Attempt Configuration */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-bold text-slate-900">Allow Multiple Attempts</div>
                    <div className="text-[11px] text-slate-500">Students can retry this activity</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowMultipleAttempts}
                    onChange={(e) => setAllowMultipleAttempts(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                {allowMultipleAttempts && (
                  <div className="flex items-center justify-between pl-4 py-1 border-l-2 border-indigo-200">
                    <span className="font-semibold text-slate-700">Max Allowed Attempts</span>
                    <Select
                      id="modal-adv-attempts"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(e.target.value)}
                      options={[
                        { value: '2', label: '2 Attempts' },
                        { value: '3', label: '3 Attempts' },
                        { value: '5', label: '5 Attempts' },
                        { value: '99', label: 'Unlimited' },
                      ]}
                      className="w-32"
                    />
                  </div>
                )}

                {/* Shuffling */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-bold text-slate-900">Shuffle Questions</div>
                    <div className="text-[11px] text-slate-500">Randomize question order per student</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-bold text-slate-900">Shuffle Answer Choices</div>
                    <div className="text-[11px] text-slate-500">Randomize options order in multiple choice</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleAnswers}
                    onChange={(e) => setShuffleAnswers(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Feedback */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-bold text-slate-900">Show Score to Student</div>
                    <div className="text-[11px] text-slate-500">Display score summary upon completion</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showScore}
                    onChange={(e) => setShowScore(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-bold text-slate-900">Show Explanations</div>
                    <div className="text-[11px] text-slate-500">Provide answer explanations after answering</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showExplanation}
                    onChange={(e) => setShowExplanation(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-bold text-slate-900">Show Correct Answers</div>
                    <div className="text-[11px] text-slate-500">Reveal correct answers upon completion</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Highlights */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              Học sinh tham gia qua <strong>Mã 6 chữ số</strong>, quét <strong>Mã QR</strong> hoặc nhấp <strong>Link liên kết</strong>. Học sinh chỉ cần nhập <strong>Họ tên & Lớp</strong>, không cần tạo tài khoản.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            >
              {isSubmitting ? 'Creating Assignment...' : 'Generate 6-Digit Code & Assign'}
            </Button>
          </div>
        </form>
      ) : (
        /* SUCCESS POST-CREATION SCREEN */
        <div className="space-y-6 py-2">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 font-display">
              Assignment is Live for {createdAssignment.targetClass || 'All Classes'}!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Students can join instantly using the 6-digit code, scanning the QR code, or clicking the direct link.
            </p>
          </div>

          {/* 6-DIGIT CODE DISPLAY */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl text-center space-y-3">
            <span className="text-xs uppercase tracking-widest text-indigo-200 font-bold">
              6-Digit Access Code
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-amber-300 drop-shadow">
                {createdAssignment.assignmentCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(createdAssignment.assignmentCode)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Copy 6-Digit Code"
              >
                {isCodeCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-[11px] text-indigo-300">
              Direct access code valid for this classroom session
            </div>
          </div>

          {/* QR CODE DISPLAY & SIZING */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center space-y-4">
            <div className="flex items-center justify-between max-w-xs mx-auto text-xs font-semibold text-slate-600">
              <span>QR Display Size:</span>
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQrSize(160)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    qrSize === 160 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Small
                </button>
                <button
                  type="button"
                  onClick={() => setQrSize(240)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    qrSize === 240 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setQrSize(320)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    qrSize === 320 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Large
                </button>
              </div>
            </div>

            <div
              className="bg-white border border-slate-200 rounded-2xl p-3 mx-auto shadow-sm flex items-center justify-center transition-all"
              style={{ width: `${qrSize + 24}px`, height: `${qrSize + 24}px` }}
            >
              <img
                src={getQrCodeUrl(createdAssignment.assignmentCode, qrSize)}
                alt="Direct Assignment QR Code"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-xs text-slate-500">
              Học sinh quét mã QR bằng camera điện thoại để vào thẳng màn hình làm bài (Chỉ cần Họ tên & Lớp).
            </p>
          </div>

          {/* ACTION BUTTONS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              variant="primary"
              size="md"
              icon={isLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={() => handleCopyLink(createdAssignment.assignmentCode)}
            >
              {isLinkCopied ? 'Link Copied!' : 'Copy Direct Student Link'}
            </Button>

            <Button
              variant="outline"
              size="md"
              icon={isDownloadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              onClick={() => handleDownloadQr(createdAssignment.assignmentCode)}
              disabled={isDownloadingQr}
            >
              Download QR Code (PNG)
            </Button>

            <Button
              variant="outline"
              size="md"
              icon={<Printer className="w-4 h-4 text-slate-600" />}
              onClick={() => printAssignmentSheet(createdAssignment)}
            >
              Print Assignment Sheet
            </Button>

            {onLaunchStudentView ? (
              <Button
                variant="outline"
                size="md"
                icon={<Eye className="w-4 h-4 text-indigo-600" />}
                onClick={() => {
                  onClose();
                  onLaunchStudentView(createdAssignment.assignmentCode);
                }}
              >
                Preview as Student
              </Button>
            ) : (
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setCreatedAssignment(null);
                  onClose();
                  onViewAssignments();
                }}
              >
                View in Assignments
              </Button>
            )}
          </div>

          <div className="pt-2 text-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setCreatedAssignment(null);
                onClose();
                onViewAssignments();
              }}
            >
              Done & Go to Assignments Dashboard
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
