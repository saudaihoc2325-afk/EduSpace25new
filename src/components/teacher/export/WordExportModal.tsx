import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Key,
  Layers,
  Shuffle,
  Clock,
  Sparkles,
  CheckCircle2,
  BookOpen,
  School,
  Settings,
  Eye,
  X,
  FileCheck,
  Check,
  Copy,
  Printer,
  ChevronRight,
  HelpCircle,
  Hash,
} from 'lucide-react';
import { QuestionItem, QuestionSet, Activity, Assignment } from '../../../types';
import { APP_NAME, ORG_NAME } from '../../../constants/gameTypes';
import {
  DocxExportOptions,
  downloadDocxFile,
  downloadMultipleTestVariants,
  prepareQuestionsForExport,
} from '../../../utils/docxExportUtils';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { useToast } from '../../../context/ToastContext';

interface WordExportModalProps {
  questions: QuestionItem[];
  title?: string;
  sourceType?: 'set' | 'activity' | 'assignment';
  sourceCode?: string;
  targetClass?: string;
  onClose: () => void;
}

export const WordExportModal: React.FC<WordExportModalProps> = ({
  questions,
  title: initialTitle = 'Bài tập tiếng Anh',
  sourceType = 'set',
  sourceCode,
  targetClass: initialTargetClass = 'all',
  onClose,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  // Mode: 'worksheet' (Student), 'answer_key' (Teacher), 'combined' (Both)
  const [exportMode, setExportMode] = useState<'worksheet' | 'answer_key' | 'combined'>('combined');

  // Customization Form State
  const [docTitle, setDocTitle] = useState(initialTitle);
  const [schoolName, setSchoolName] = useState('SỞ GD&ĐT • TRƯỜNG THPT .................................');
  const [teacherName, setTeacherName] = useState(`${ORG_NAME} (TỔ TIẾNG ANH)`);
  const [subjectName, setSubjectName] = useState('MÔN: TIẾNG ANH (ENGLISH)');
  const [selectedClass, setSelectedClass] = useState(initialTargetClass === 'all' ? '' : initialTargetClass);
  const [timeLimit, setTimeLimit] = useState<number>(45);
  const [testCode, setTestCode] = useState<string>('101');

  // Options Toggles
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);
  const [includePassages, setIncludePassages] = useState<boolean>(true);
  const [includeStudentHeader, setIncludeStudentHeader] = useState<boolean>(true);
  const [includeExplanations, setIncludeExplanations] = useState<boolean>(true);
  const [includePoints, setIncludePoints] = useState<boolean>(false);
  const [answerKeyFormat, setAnswerKeyFormat] = useState<'both' | 'matrix_only' | 'detailed_only'>('both');

  // Question subset selector
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    questions.map((q) => q.id)
  );

  // Active Preview Tab inside Modal
  const [previewTab, setPreviewTab] = useState<'worksheet' | 'answer_key'>('worksheet');
  const [isExporting, setIsExporting] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Toggle Single Question Selection
  const toggleQuestionSelect = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      if (selectedQuestionIds.length === 1) {
        showInfo('Cần giữ ít nhất 1 câu hỏi để xuất đề.');
        return;
      }
      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== qId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, qId]);
    }
  };

  const selectAllQuestions = () => {
    setSelectedQuestionIds(questions.map((q) => q.id));
  };

  // Compute Prepared Questions for Live Preview
  const preparedForPreview = useMemo(() => {
    return prepareQuestionsForExport(questions, {
      selectedQuestionIds,
      shuffleQuestions,
      shuffleOptions,
    });
  }, [questions, selectedQuestionIds, shuffleQuestions, shuffleOptions]);

  // Construct Export Options Payload
  const getExportOptions = (mode: 'worksheet' | 'answer_key' | 'combined', customCode?: string): DocxExportOptions => {
    return {
      title: docTitle.trim() || 'Bài tập tiếng Anh',
      schoolName: schoolName.trim(),
      teacherName: teacherName.trim(),
      subject: subjectName.trim(),
      targetClass: selectedClass.trim() || undefined,
      timeLimitMinutes: timeLimit > 0 ? timeLimit : 45,
      testCode: customCode || testCode.trim() || '101',
      selectedQuestionIds,
      shuffleQuestions,
      shuffleOptions,
      includePassages,
      includeStudentHeader,
      includeExplanations,
      includePoints,
      mode,
      answerKeyFormat,
      fontFamily: 'Times New Roman',
    };
  };

  // Handle Single Download Trigger
  const handleDownloadSingle = async (mode: 'worksheet' | 'answer_key' | 'combined') => {
    if (selectedQuestionIds.length === 0) {
      showError('Vui lòng chọn ít nhất 1 câu hỏi.');
      return;
    }

    try {
      setIsExporting(true);
      const opts = getExportOptions(mode);
      await downloadDocxFile(questions, opts);

      const label =
        mode === 'worksheet'
          ? 'Đề bài học sinh'
          : mode === 'answer_key'
          ? 'Đáp án & Lời giải chi tiết'
          : 'Trọn bộ Đề thi + Đáp án';

      showSuccess(`Đã tạo và tải file Word (.docx) "${label}" thành công!`);
    } catch (err: any) {
      console.error('Error generating Word document:', err);
      showError('Không thể tạo file Word. Vui lòng kiểm tra lại nội dung câu hỏi.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Multi-Test Variants (101, 102, 103, 104)
  const handleGenerateMultipleVariants = async () => {
    if (selectedQuestionIds.length === 0) {
      showError('Vui lòng chọn ít nhất 1 câu hỏi.');
      return;
    }

    try {
      setIsBatchGenerating(true);
      const baseOpts = getExportOptions('combined');
      await downloadMultipleTestVariants(questions, baseOpts, ['101', '102', '103', '104']);
      showSuccess('Đã tự động xáo trộn và tải trọn bộ 4 Mã đề (101, 102, 103, 104) kèm đáp án tương ứng!');
    } catch (err: any) {
      console.error('Error batch generating variants:', err);
      showError('Không thể xuất bộ mã đề. Vui lòng thử lại.');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  return (
    <div
      id="modal-word-export"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shadow-inner">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg font-display text-white">
                  Xuất File Word (.docx) &amp; Đáp Án
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                  Chuẩn đề thi THPT
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Tạo đề in phiếu bài tập học sinh, bảng đáp án ma trận và hướng dẫn giải chi tiết cho giáo viên.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main 2-Column Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Customization Settings (Scrollable) */}
          <div className="lg:col-span-5 border-r border-slate-200 bg-slate-50/70 p-4 sm:p-5 overflow-y-auto space-y-5">
            {/* 1. Export Mode Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Chế độ xuất tài liệu
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExportMode('worksheet');
                    setPreviewTab('worksheet');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${
                    exportMode === 'worksheet'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Đề học sinh</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportMode('answer_key');
                    setPreviewTab('answer_key');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${
                    exportMode === 'answer_key'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>Chỉ đáp án</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportMode('combined');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${
                    exportMode === 'combined'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Đề + Đáp án</span>
                </button>
              </div>
            </div>

            {/* 2. Document Information */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                Thông tin tiêu đề đề thi
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Tiêu đề bài kiểm tra / phiếu bài tập:
                  </label>
                  <Input
                    id="input-export-doc-title"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Ví dụ: ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA KỲ 1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Mã đề:
                    </label>
                    <Input
                      id="input-export-test-code"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value)}
                      placeholder="101"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Thời gian (phút):
                    </label>
                    <Input
                      id="input-export-time-limit"
                      type="number"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                      placeholder="45"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Lớp:
                    </label>
                    <Input
                      id="input-export-target-class"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      placeholder="10A1 hoặc để trống"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Tổ bộ môn:
                    </label>
                    <Input
                      id="input-export-teacher-org"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="ENGLISH GROUP"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Shuffling & Format Options */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-indigo-600" />
                Tùy chọn trộn đề &amp; Định dạng
              </h4>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">
                    🔀 Xáo trộn thứ tự câu hỏi (Shuffle Questions)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">
                    🔀 Xáo trộn thứ tự đáp án A, B, C, D (Shuffle Options)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeStudentHeader}
                    onChange={(e) => setIncludeStudentHeader(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700">
                    Khung điền tên học sinh, lớp, SBD &amp; ô chấm điểm
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includePassages}
                    onChange={(e) => setIncludePassages(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700">
                    Bao gồm bài đọc hiểu (Reading Passages)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeExplanations}
                    onChange={(e) => setIncludeExplanations(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700">
                    Bao gồm lời giải thích chi tiết trong bản đáp án
                  </span>
                </label>
              </div>
            </div>

            {/* 4. Question Subset Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Chọn câu hỏi ({selectedQuestionIds.length}/{questions.length})
                </h4>
                <button
                  type="button"
                  onClick={selectAllQuestions}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Chọn tất cả
                </button>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {questions.map((q, idx) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id || idx}
                      onClick={() => toggleQuestionSelect(q.id)}
                      className={`p-1.5 rounded-lg text-[11px] flex items-center justify-between cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-medium'
                          : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2 truncate">
                        <span className="font-mono font-bold text-indigo-700">#{idx + 1}</span>
                        <span className="truncate">{q.question}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Word Document Preview */}
          <div className="lg:col-span-7 flex flex-col bg-slate-100/80 p-4 sm:p-6 overflow-hidden">
            {/* Preview Navigation Bar */}
            <div className="flex items-center justify-between mb-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewTab('worksheet')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    previewTab === 'worksheet'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Bản xem trước đề thi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('answer_key')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    previewTab === 'answer_key'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Bản xem trước đáp án</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-500 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200">
                {preparedForPreview.length} câu • Mã đề: {testCode}
              </span>
            </div>

            {/* A4 Paper Canvas Simulated Preview */}
            <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-300 shadow-sm p-6 sm:p-8 font-serif text-slate-900 space-y-4 text-xs">
              {previewTab === 'worksheet' ? (
                <>
                  {/* School & Test Header */}
                  <div className="grid grid-cols-2 text-center pb-2 border-b border-slate-200 gap-2">
                    <div>
                      <div className="font-bold uppercase text-[10px] text-slate-700">{schoolName}</div>
                      <div className="font-bold uppercase text-[11px] text-slate-900 underline mt-0.5">{teacherName}</div>
                    </div>
                    <div>
                      <div className="font-bold uppercase text-xs text-slate-900">{docTitle}</div>
                      <div className="font-bold uppercase text-[10px] text-slate-700">{subjectName}</div>
                      <div className="italic text-[10px] text-slate-500">Thời gian: {timeLimit} phút</div>
                    </div>
                  </div>

                  {/* Student Info Box */}
                  {includeStudentHeader && (
                    <div className="border border-slate-400 rounded p-2.5 space-y-2 bg-slate-50/50">
                      <div className="flex justify-between items-center text-[11px]">
                        <div>
                          <strong>Họ và tên: </strong>
                          <span className="text-slate-400 font-mono">...........................................................................</span>
                        </div>
                        <div className="bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-xs">
                          Mã đề: {testCode}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <div>
                          <strong>Lớp: </strong>
                          <span>{selectedClass || '............'}</span>
                          <span className="ml-4">
                            <strong>SBD: </strong>
                            <span className="text-slate-400 font-mono">.....................</span>
                          </span>
                        </div>
                        <div>
                          <strong>Điểm: </strong>
                          <span className="font-bold font-mono">....... / 10</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Worksheet Instructions */}
                  <div className="italic text-[11px] text-slate-600 font-semibold pt-1">
                    Mark the letter A, B, C, or D on your answer sheet to indicate the correct answer to each of the following questions.
                  </div>

                  {/* Questions Preview */}
                  <div className="space-y-3 pt-1">
                    {preparedForPreview.slice(0, 8).map((q) => (
                      <div key={q.questionId} className="space-y-1">
                        <div className="font-semibold text-slate-900">
                          <strong className="text-slate-950">Question {q.displayNumber}: </strong>
                          <span>{q.questionText}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pl-3 text-slate-700 font-sans text-[11px]">
                          {q.options.map((opt) => (
                            <div key={opt.letter}>
                              <strong>{opt.letter}.</strong> {opt.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {preparedForPreview.length > 8 && (
                      <div className="p-3 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 text-[11px]">
                        + {preparedForPreview.length - 8} câu hỏi tiếp theo sẽ được kết xuất đầy đủ vào file Word.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Answer Key Preview */}
                  <div className="text-center space-y-1 pb-3 border-b border-slate-200">
                    <div className="font-bold uppercase text-xs text-slate-500">{ORG_NAME} • TỔ TIẾNG ANH</div>
                    <h2 className="text-base font-bold text-slate-900">ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT</h2>
                    <div className="text-[11px] text-indigo-700 font-semibold italic">
                      {docTitle} • Mã đề: {testCode} • {preparedForPreview.length} câu hỏi
                    </div>
                  </div>

                  {/* Quick Answer Matrix Grid Preview */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase text-slate-800">
                      I. Bảng đáp án nhanh (Quick Answer Matrix):
                    </h4>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-center font-mono">
                      {preparedForPreview.slice(0, 20).map((q) => (
                        <div key={q.questionId} className="border border-slate-300 rounded overflow-hidden">
                          <div className="bg-slate-100 text-[10px] font-bold py-0.5 border-b border-slate-300 text-slate-600">
                            {q.displayNumber}
                          </div>
                          <div className="bg-emerald-50 text-emerald-800 font-bold py-1 text-xs">
                            {q.correctLetter}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Solutions Preview */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="font-bold text-xs uppercase text-slate-800">
                      II. Hướng dẫn giải chi tiết (Explanations):
                    </h4>
                    {preparedForPreview.slice(0, 4).map((q) => (
                      <div key={q.questionId} className="space-y-1 p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="font-semibold text-slate-900 text-[11px]">
                          <strong>Câu {q.displayNumber}: </strong> {q.questionText}
                        </div>
                        <div className="text-emerald-800 font-bold text-[11px] pl-2">
                          ➜ Đáp án đúng: {q.correctLetter}. {q.correctText}
                        </div>
                        {q.explanation && (
                          <div className="text-indigo-900 italic text-[10px] pl-2">
                            <strong>Giải thích: </strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              id="btn-batch-generate-variants"
              variant="outline"
              size="sm"
              icon={<Shuffle className="w-4 h-4 text-amber-400" />}
              onClick={handleGenerateMultipleVariants}
              disabled={isBatchGenerating || isExporting}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl text-xs"
            >
              {isBatchGenerating ? 'Đang tạo 4 mã đề...' : 'Sinh 4 Mã Đề (101-104)'}
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              id="btn-download-worksheet-only"
              variant="outline"
              size="sm"
              icon={<FileText className="w-4 h-4 text-indigo-400" />}
              onClick={() => handleDownloadSingle('worksheet')}
              disabled={isExporting || isBatchGenerating}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl text-xs font-bold"
            >
              Tải Đề Bài (.docx)
            </Button>

            <Button
              id="btn-download-answer-key-only"
              variant="outline"
              size="sm"
              icon={<Key className="w-4 h-4 text-emerald-400" />}
              onClick={() => handleDownloadSingle('answer_key')}
              disabled={isExporting || isBatchGenerating}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl text-xs font-bold"
            >
              Tải Đáp Án (.docx)
            </Button>

            <Button
              id="btn-download-combined-doc"
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => handleDownloadSingle('combined')}
              disabled={isExporting || isBatchGenerating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30"
            >
              {isExporting ? 'Đang xuất Word...' : 'Tải Đề + Đáp Án (.docx)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
