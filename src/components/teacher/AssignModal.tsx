import React, { useState } from 'react';
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
} from 'lucide-react';
import { Activity, Assignment, AssignmentSettings } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../../context/ToastContext';
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

const COMMON_CLASSES = [
  'All Classes',
  '10A1', '10A2', '10A3', '10A4', '10A5',
  '11A1', '11A2', '11A3', '11A4', '11A5',
  '12A1', '12A2', '12A3', '12A4', '12A5',
  'Custom Class',
];

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
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Class *</label>
              <Select
                id="modal-select-class"
                value={selectedClassOption}
                onChange={(e) => setSelectedClassOption(e.target.value)}
                options={COMMON_CLASSES.map((c) => ({ value: c, label: c }))}
              />
              {selectedClassOption === 'Custom Class' && (
                <input
                  type="text"
                  value={customClass}
                  onChange={(e) => setCustomClass(e.target.value)}
                  placeholder="Enter class name (e.g. 10A7)"
                  className="mt-2 w-full text-xs h-9 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 outline-none"
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
