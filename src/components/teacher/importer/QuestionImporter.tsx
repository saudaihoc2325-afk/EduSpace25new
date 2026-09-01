import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileType,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Edit3,
  Trash2,
  Copy,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Columns,
  Search,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { ImportedQuestionItem, QuestionItem, QuestionSet, ExcelColumnMapping } from '../../../types';
import { parseDocxFile, parsePdfFile, parseQuestionsFromText, parseRawTextToQuestions } from '../../../services/fileParser';
import { parseExcelOrCsvFile, ExcelParseResult } from '../../../services/importParsers/excelParser';
import {
  downloadSampleExcel,
  downloadSampleCsv,
  downloadSampleWordText,
  SAMPLE_TEXT_SUITE
} from '../../../services/sampleFiles';
import { questionSetService, importHistoryService } from '../../../services/firestoreService';
import { EditQuestionModal } from './EditQuestionModal';
import { ColumnMappingModal } from './ColumnMappingModal';
import { generateOptionId, generateStableId, validateQuestionItem } from '../../../services/importParsers/validator';

interface QuestionImporterProps {
  teacherId: string;
  onClose: () => void;
  onImportComplete?: (questionSet: QuestionSet) => void;
  onCreateGameFromSet?: (questionSet: QuestionSet, count?: number, gameType?: string) => void;
}

type TabMode = 'file' | 'paste';
type FilterStatus = 'ALL' | 'VALID' | 'REVIEW_REQUIRED' | 'ERROR' | 'DUPLICATE';

export const QuestionImporter: React.FC<QuestionImporterProps> = ({
  teacherId,
  onClose,
  onImportComplete,
  onCreateGameFromSet,
}) => {
  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview & Review, 3: Success
  const [tabMode, setTabMode] = useState<TabMode>('file');

  // File & Raw Text state
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsing result state
  const [parsedQuestions, setParsedQuestions] = useState<ImportedQuestionItem[]>([]);
  const [excelResult, setExcelResult] = useState<ExcelParseResult | null>(null);
  const [isColumnMappingOpen, setIsColumnMappingOpen] = useState(false);

  // Filter & Search state in Preview
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingQuestion, setEditingQuestion] = useState<ImportedQuestionItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Target Question Set Configuration
  const [setName, setSetName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<QuestionSet['gradeLevel']>('10');
  const [description, setDescription] = useState('');

  // Success state
  const [savedQuestionSet, setSavedQuestionSet] = useState<QuestionSet | null>(null);
  const [gameQuestionCount, setGameQuestionCount] = useState<number | 'ALL'>('ALL');
  const [selectedGameType, setSelectedGameType] = useState<string>('quiz');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    const validExtensions = ['.docx', '.xlsx', '.xls', '.csv', '.pdf', '.txt'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setErrorMessage(
        'Unsupported file format. Please upload a Word (.docx), Excel (.xlsx/.xls), CSV (.csv), PDF (.pdf), or Text (.txt) file.'
      );
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 20MB limit. Please upload a smaller document.');
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);

    // Auto set default Set name from file name
    const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setSetName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
  };

  // Process Document
  const handleStartParsing = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let questions: ImportedQuestionItem[] = [];
      let currentFileName = 'Pasted_Questions.txt';
      let currentFileType: 'docx' | 'pdf' | 'xlsx' | 'csv' | 'manual' = 'manual';

      if (tabMode === 'paste') {
        if (!pastedText.trim()) {
          throw new Error('Please enter or paste your questions text to continue.');
        }
        currentFileName = 'Pasted_Document.txt';
        currentFileType = 'manual';
        questions = parseRawTextToQuestions(pastedText, {
          fileName: currentFileName,
          fileType: currentFileType,
          ownerId: teacherId,
        });
      } else if (file) {
        currentFileName = file.name;
        const lower = file.name.toLowerCase();

        if (lower.endsWith('.docx')) {
          currentFileType = 'docx';
          questions = await parseDocxFile(file, file.name, teacherId);
        } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
          currentFileType = lower.endsWith('.csv') ? 'csv' : 'xlsx';
          const res = await parseExcelOrCsvFile(file, file.name, teacherId);
          setExcelResult(res);
          questions = res.questions;
        } else if (lower.endsWith('.pdf')) {
          currentFileType = 'pdf';
          questions = await parsePdfFile(file, file.name, teacherId);
        } else if (lower.endsWith('.txt')) {
          currentFileType = 'manual';
          const text = await file.text();
          questions = parseRawTextToQuestions(text, {
            fileName: file.name,
            fileType: 'manual',
            ownerId: teacherId,
          });
        }
      } else {
        throw new Error('Please select a file or paste question text.');
      }

      if (questions.length === 0) {
        throw new Error(
          'No valid questions were detected in the document. Please check the document format and try again.'
        );
      }

      setParsedQuestions(questions);
      if (!setName) {
        setSetName(`Question Set - ${new Date().toLocaleDateString()}`);
      }
      setStep(2);
    } catch (err: any) {
      console.error('Parsing failed:', err);
      setErrorMessage(err.message || 'Failed to parse file. Please verify formatting.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run Excel parsing with custom mapping
  const handleApplyCustomExcelMapping = async (newMapping: ExcelColumnMapping) => {
    if (!file) return;
    setIsProcessing(true);
    setIsColumnMappingOpen(false);
    try {
      const res = await parseExcelOrCsvFile(file, file.name, teacherId, newMapping);
      setExcelResult(res);
      setParsedQuestions(res.questions);
    } catch (err: any) {
      setErrorMessage(`Failed to re-parse Excel with custom mapping: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load 10-Item Sample Suite
  const handleLoadSampleSuite = () => {
    setTabMode('paste');
    setPastedText(SAMPLE_TEXT_SUITE);
    setSetName('Sample Comprehensive Question Bank (10 Questions)');
    setErrorMessage(null);
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selectedForImport: !q.selectedForImport } : q))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedQuestions((prev) => prev.map((q) => ({ ...q, selectedForImport: select })));
  };

  const handleSelectValidOnly = () => {
    setParsedQuestions((prev) =>
      prev.map((q) => ({ ...q, selectedForImport: q.validationStatus === 'VALID' }))
    );
  };

  // Delete question from preview
  const handleDeleteQuestion = (id: string) => {
    setParsedQuestions((prev) => {
      const filtered = prev.filter((q) => q.id !== id);
      return filtered.map((q, idx) => ({ ...q, order: idx + 1 }));
    });
  };

  // Duplicate question in preview
  const handleDuplicateQuestion = (item: ImportedQuestionItem) => {
    setParsedQuestions((prev) => {
      const copy: ImportedQuestionItem = {
        ...item,
        id: generateStableId('q'),
        order: prev.length + 1,
        question: `${item.question} (Copy)`,
      };
      return [...prev, copy];
    });
  };

  // Open edit modal
  const handleEditClick = (item: ImportedQuestionItem) => {
    setEditingQuestion(item);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedQuestion = (updated: ImportedQuestionItem) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
  };

  // Confirm Import & Save to Firestore
  const handleConfirmImport = async () => {
    const selected = parsedQuestions.filter((q) => q.selectedForImport);
    if (selected.length === 0) {
      setErrorMessage('Please select at least one question to import.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const convertedQuestions: QuestionItem[] = selected.map((q, idx) => ({
        id: q.id || `q_${idx + 1}`,
        question: q.question,
        options: q.options,
        correctAnswerId: q.correctAnswerId || '',
        correctAnswerText: q.correctAnswerText || '',
        correctAnswer: q.correctAnswer || (q.options?.find((o) => o.id === q.correctAnswerId)?.label || ''),
        explanation: q.explanation || null,
        passage: q.passage || null,
        unit: q.unit || '',
        lesson: q.lesson || '',
        level: q.level || 'Medium',
        order: idx + 1,
        points: q.points || 10,
        timeLimitSeconds: q.timeLimitSeconds || 30,
        sourceFileName: q.sourceFileName || file?.name || 'document.docx',
        sourceFileType: q.sourceFileType || (file ? 'docx' : 'manual'),
        importedAt: new Date().toISOString(),
      }));

      const sourceFileName = file ? file.name : 'Pasted_Questions.txt';
      const sourceFileType = file
        ? (file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.csv') ? 'xlsx' : 'docx')
        : 'manual';

      const savedSet = await questionSetService.createOrUpdateQuestionSet(teacherId, {
        title: setName.trim() || 'Imported Question Bank',
        description: description.trim() || `Imported ${selected.length} questions from ${sourceFileName}`,
        gradeLevel,
        questions: convertedQuestions,
        sourceFileName,
        sourceFileType,
        importedAt: new Date().toISOString(),
      });

      // Record Import History in Firestore
      const totalDetected = parsedQuestions.length;
      const totalImported = selected.length;
      const totalRejected = totalDetected - totalImported;
      const totalReview = parsedQuestions.filter((q) => q.validationStatus === 'REVIEW_REQUIRED').length;

      await importHistoryService.recordImport(teacherId, {
        fileName: sourceFileName,
        fileType: sourceFileType as any,
        questionSetId: savedSet.id,
        questionSetName: savedSet.title,
        numberDetected: totalDetected,
        numberImported: totalImported,
        numberRejected: totalRejected,
        numberReviewRequired: totalReview,
      });

      setSavedQuestionSet(savedSet);
      setStep(3);

      if (onImportComplete) {
        onImportComplete(savedSet);
      }
    } catch (err: any) {
      console.error('Failed to save imported question set:', err);
      setErrorMessage(err.message || 'Failed to save question bank to Firestore.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Metrics calculations
  const totalDetected = parsedQuestions.length;
  const validCount = parsedQuestions.filter((q) => q.validationStatus === 'VALID').length;
  const reviewCount = parsedQuestions.filter((q) => q.validationStatus === 'REVIEW_REQUIRED').length;
  const errorCount = parsedQuestions.filter((q) => q.validationStatus === 'ERROR').length;
  const duplicateCount = parsedQuestions.filter((q) => q.isDuplicate).length;
  const selectedCount = parsedQuestions.filter((q) => q.selectedForImport).length;

  // Filtered list for display
  const displayedQuestions = parsedQuestions.filter((q) => {
    if (filterStatus === 'VALID' && q.validationStatus !== 'VALID') return false;
    if (filterStatus === 'REVIEW_REQUIRED' && q.validationStatus !== 'REVIEW_REQUIRED') return false;
    if (filterStatus === 'ERROR' && q.validationStatus !== 'ERROR') return false;
    if (filterStatus === 'DUPLICATE' && !q.isDuplicate) return false;

    if (searchQuery.trim()) {
      const qText = (q.question || '').toLowerCase();
      const s = searchQuery.toLowerCase();
      return (
        qText.includes(s) ||
        (q.options || []).some((o) => o.text.toLowerCase().includes(s)) ||
        (q.explanation || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header & Wizard Navigation */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Import Questions into EduSpace25
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-medium">
                  Word • PDF • Excel • CSV
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automatic academic parsing, shuffle-safe option IDs, and validation preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs mr-4">
              <span
                className={`px-2.5 py-1 rounded-full font-medium ${
                  step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                1. Upload
              </span>
              <span className="text-slate-600">→</span>
              <span
                className={`px-2.5 py-1 rounded-full font-medium ${
                  step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                2. Preview & Review
              </span>
              <span className="text-slate-600">→</span>
              <span
                className={`px-2.5 py-1 rounded-full font-medium ${
                  step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                3. Ready
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-3 text-xs text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">Import Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* ---------------- STEP 1: UPLOAD / PASTE SCREEN ---------------- */}
        {step === 1 && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
            {/* Tabs: File Upload vs Direct Paste */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTabMode('file')}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                    tabMode === 'file'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Document (.docx, .pdf, .xlsx, .csv)
                </button>
                <button
                  type="button"
                  onClick={() => setTabMode('paste')}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                    tabMode === 'paste'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Paste Raw Questions Text
                </button>
              </div>

              {/* Sample Suite Button */}
              <button
                type="button"
                onClick={handleLoadSampleSuite}
                className="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/40 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample Test Suite (10 Questions)
              </button>
            </div>

            {/* Mode 1: File Dropzone */}
            {tabMode === 'file' && (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-950/30 scale-[0.99]'
                      : file
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.xlsx,.xls,.csv,.pdf,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {file ? (
                    <div className="space-y-2">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                        <CheckCircle className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-semibold text-white">{file.name}</p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB • Click or drag another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          Drag and drop your file here, or{' '}
                          <span className="text-indigo-400 font-semibold underline">browse</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Supports Microsoft Word (.docx), Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), and Text (.txt) up to 20MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formats info pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                    <FileType className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">Word (.docx)</p>
                      <p className="text-[10px] text-slate-400">Standard & Tables</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">Excel & CSV</p>
                      <p className="text-[10px] text-slate-400">Column Auto-map</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">PDF (.pdf)</p>
                      <p className="text-[10px] text-slate-400">Selectable Text</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">Reading Passages</p>
                      <p className="text-[10px] text-slate-400">Blanks & Units</p>
                    </div>
                  </div>
                </div>

                {/* Download sample templates */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Download className="w-4 h-4 text-indigo-400" />
                    <span>Need standard format templates to get started?</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadSampleExcel}
                      className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      Excel Template (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={downloadSampleCsv}
                      className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <FileType className="w-3.5 h-3.5 text-sky-400" />
                      CSV Template (.csv)
                    </button>
                    <button
                      type="button"
                      onClick={downloadSampleWordText}
                      className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Word Format Guide (.txt)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Paste Raw Text */}
            {tabMode === 'paste' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Paste Raw Question Text
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Supports Question 1: / A. B. C. D. / Answer: A / Explanation: format
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Question 1: Mark enjoys _______ English songs in his free time.
A. listening to
B. to listen
C. listen
D. listened
Answer: A
Explanation: Enjoy + V-ing: Mark enjoys listening to English songs.

Question 2: She has been living in Da Nang _______ 2018.
A. for
B. since
C. in
D. at
Answer: B
Explanation: Use 'since' with a specific point in time in the past.`}
                  className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}
          </div>
        )}

        {/* ---------------- STEP 2: PREVIEW & QUALITY ASSURANCE ---------------- */}
        {step === 2 && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
            {/* Set metadata banner */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Question Set Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="e.g. Unit 1 Grammar & Vocabulary"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Grade Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
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
                  <option value="Higher Ed">Higher Education</option>
                </select>
              </div>
              <div className="flex items-end">
                {excelResult && (
                  <button
                    type="button"
                    onClick={() => setIsColumnMappingOpen(true)}
                    className="w-full py-1.5 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Columns className="w-3.5 h-3.5 text-indigo-400" />
                    Customize Column Mapping
                  </button>
                )}
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <p className="text-[11px] font-medium text-slate-400">Total Detected</p>
                <p className="text-xl font-bold text-white mt-1">{totalDetected}</p>
              </div>
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-emerald-400">Valid</p>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-emerald-300 mt-1">{validCount}</p>
              </div>
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-amber-400">Review Required</p>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xl font-bold text-amber-300 mt-1">{reviewCount}</p>
              </div>
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-rose-400">Errors</p>
                  <XCircle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-xl font-bold text-rose-300 mt-1">{errorCount}</p>
              </div>
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
                <p className="text-[11px] font-medium text-indigo-300">Selected to Import</p>
                <p className="text-xl font-bold text-indigo-200 mt-1">
                  {selectedCount}{' '}
                  <span className="text-xs font-normal text-indigo-400">/ {totalDetected}</span>
                </p>
              </div>
            </div>

            {/* Filter, Search & Bulk Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    filterStatus === 'ALL'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  All ({totalDetected})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('VALID')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    filterStatus === 'VALID'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400 hover:bg-emerald-950/50'
                  }`}
                >
                  Valid ({validCount})
                </button>
                {reviewCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus('REVIEW_REQUIRED')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterStatus === 'REVIEW_REQUIRED'
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-400 hover:bg-amber-950/50'
                    }`}
                  >
                    Review Required ({reviewCount})
                  </button>
                )}
                {duplicateCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus('DUPLICATE')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterStatus === 'DUPLICATE'
                        ? 'bg-purple-600 text-white'
                        : 'text-purple-400 hover:bg-purple-950/50'
                    }`}
                  >
                    Duplicates ({duplicateCount})
                  </button>
                )}
              </div>

              {/* Search & Bulk Select Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search preview..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectValidOnly}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md whitespace-nowrap transition-colors"
                  >
                    Select Valid Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Select All"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Deselect All"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Questions Table / List */}
            <div className="space-y-3">
              {displayedQuestions.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-400">No questions match the current filter.</p>
                </div>
              ) : (
                displayedQuestions.map((item) => {
                  const isValid = item.validationStatus === 'VALID';
                  const isReview = item.validationStatus === 'REVIEW_REQUIRED';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        item.selectedForImport
                          ? isReview
                            ? 'bg-slate-950/80 border-amber-500/50'
                            : 'bg-slate-950/90 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox & Header */}
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={item.selectedForImport}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 mt-1 text-indigo-600 rounded bg-slate-900 border-slate-700 cursor-pointer"
                          />

                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-300">
                                #{item.order}
                              </span>

                              {/* Status Badge */}
                              {isValid && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                                  <CheckCircle className="w-3 h-3" /> Valid
                                </span>
                              )}
                              {isReview && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/40">
                                  <AlertTriangle className="w-3 h-3" /> Review Required
                                </span>
                              )}
                              {item.isDuplicate && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40">
                                  Possible Duplicate
                                </span>
                              )}
                              {item.unit && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                  {item.unit}
                                </span>
                              )}
                            </div>

                            {/* Validation issues warning */}
                            {item.validationIssues && item.validationIssues.length > 0 && (
                              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center justify-between gap-2">
                                <span>⚠️ {item.validationIssues.join(' • ')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(item)}
                                  className="text-[11px] font-semibold underline text-amber-200 hover:text-white"
                                >
                                  Fix now
                                </button>
                              </div>
                            )}

                            {/* Reading Passage (if any) */}
                            {item.passage && (
                              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-300 italic">
                                <span className="font-semibold not-italic text-indigo-400">Passage: </span>
                                {item.passage}
                              </div>
                            )}

                            {/* Question Text */}
                            <p className="text-sm font-medium text-white leading-relaxed">
                              {item.question}
                            </p>

                            {/* Options A, B, C, D */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {(item.options || []).map((opt) => {
                                const isCorrect =
                                  opt.id === item.correctAnswerId ||
                                  opt.label === item.correctAnswer ||
                                  opt.text === item.correctAnswerText;

                                return (
                                  <div
                                    key={opt.id}
                                    className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border ${
                                      isCorrect
                                        ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 font-semibold'
                                        : 'bg-slate-900 border-slate-800 text-slate-300'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {opt.label}
                                    </span>
                                    <span className="truncate">{opt.text}</span>
                                    {isCorrect && (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            {item.explanation && (
                              <p className="text-xs text-slate-400 pt-1 flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>
                                  <strong className="text-slate-300">Explanation:</strong>{' '}
                                  {item.explanation}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="Edit Question"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(item)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ---------------- STEP 3: SUCCESS & CREATE GAME ---------------- */}
        {step === 3 && savedQuestionSet && (
          <div className="p-8 text-center space-y-6 flex-1 text-slate-200 overflow-y-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Question Bank Successfully Created!
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                <strong className="text-slate-200">{savedQuestionSet.title}</strong> has been saved with{' '}
                <strong className="text-emerald-400">{savedQuestionSet.questions.length} questions</strong> to your persistent Firebase Question Bank.
              </p>
            </div>

            {/* Quick Game Creator Card */}
            <div className="p-6 bg-slate-950 border border-indigo-500/30 rounded-2xl max-w-lg mx-auto text-left space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  Create Interactive Game from this Set
                </h4>
              </div>

              {/* Number of Questions Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Question Count to Include in Game:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {([10, 20, 25, 30, 40, 'ALL'] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setGameQuestionCount(cnt)}
                      disabled={
                        cnt !== 'ALL' &&
                        typeof cnt === 'number' &&
                        cnt > savedQuestionSet.questions.length
                      }
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        gameQuestionCount === cnt
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                          : cnt !== 'ALL' &&
                            typeof cnt === 'number' &&
                            cnt > savedQuestionSet.questions.length
                          ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {cnt === 'ALL' ? 'All' : `${cnt}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Choose Game Format:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'quiz', label: 'Quiz Bowl', desc: 'Fast-paced' },
                    { id: 'gameshow', label: 'Gameshow', desc: 'Multi-round' },
                    { id: 'match', label: 'Match Up', desc: 'Card matching' },
                    { id: 'wheel', label: 'Spin Wheel', desc: 'Random picker' },
                  ].map((gt) => (
                    <button
                      key={gt.id}
                      type="button"
                      onClick={() => setSelectedGameType(gt.id)}
                      className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                        selectedGameType === gt.id
                          ? 'bg-indigo-950/80 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <p className="font-bold">{gt.label}</p>
                      <p className="text-[10px] text-slate-400">{gt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() => {
                  if (onCreateGameFromSet) {
                    const countNum =
                      gameQuestionCount === 'ALL'
                        ? savedQuestionSet.questions.length
                        : Number(gameQuestionCount);
                    onCreateGameFromSet(savedQuestionSet, countNum, selectedGameType);
                  }
                }}
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Game Editor with these Questions
              </button>
            </div>
          </div>
        )}

        {/* ---------------- MODAL FOOTER CONTROLS ---------------- */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || (tabMode === 'file' && !file) || (tabMode === 'paste' && !pastedText.trim())}
                onClick={handleStartParsing}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                {isProcessing ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Parsing & Validating Document...
                  </>
                ) : (
                  <>
                    Parse Document & Preview
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Upload
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {selectedCount} questions ready to save
                </span>
                <button
                  type="button"
                  disabled={isProcessing || selectedCount === 0}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Saving to Firebase...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm & Save to Question Bank
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setPastedText('');
                  setParsedQuestions([]);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Import Another File
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Done & View Question Bank
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Question Modal */}
      <EditQuestionModal
        question={editingQuestion}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveEditedQuestion}
      />

      {/* Column Mapping Modal for Excel/CSV */}
      {excelResult && (
        <ColumnMappingModal
          headers={excelResult.headers}
          initialMapping={excelResult.detectedMapping}
          isOpen={isColumnMappingOpen}
          onClose={() => setIsColumnMappingOpen(false)}
          onApplyMapping={handleApplyCustomExcelMapping}
          sampleRows={excelResult.rows}
        />
      )}
    </div>
  );
};
