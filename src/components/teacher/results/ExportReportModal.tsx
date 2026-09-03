import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  FileDown,
  Printer,
  Calendar,
  Layers,
  Users,
  Award,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Filter,
  Eye,
  Loader2,
} from 'lucide-react';
import {
  ResultsReportPayload,
  exportResultsToExcel,
  exportResultsToWord,
  exportResultsToPdf,
  formatDuration,
} from '../../../utils/resultsReportExportUtils';
import { APP_NAME, ORG_NAME } from '../../../constants/gameTypes';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../../context/ToastContext';

interface ExportReportModalProps {
  payload: ResultsReportPayload;
  onClose: () => void;
}

type ExportFormat = 'excel' | 'word' | 'pdf';

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ payload, onClose }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [includeQuestionAnalysis, setIncludeQuestionAnalysis] = useState<boolean>(
    payload.questionErrorItems.length > 0
  );
  const [includeClassComparison, setIncludeClassComparison] = useState<boolean>(
    payload.classComparisonItems.length > 0
  );
  const [includeStudentProgress, setIncludeStudentProgress] = useState<boolean>(
    payload.studentSummaries.length > 0
  );

  // Hidden/Visible container for PDF rendering & Print preview
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Direct Browser Print (Print / Save as PDF)
  const handlePrint = () => {
    window.print();
  };

  // Main Export Handler
  const handleExecuteExport = async () => {
    if (payload.totalResults === 0) {
      showError('Không có dữ liệu bài nộp phù hợp với bộ lọc hiện tại để xuất báo cáo.');
      return;
    }

    setIsExporting(true);
    try {
      if (selectedFormat === 'excel') {
        exportResultsToExcel(payload);
        showSuccess('Đã xuất báo cáo kết quả Excel (.xlsx) với đầy đủ 5 sheets thành công!');
      } else if (selectedFormat === 'word') {
        await exportResultsToWord(payload);
        showSuccess('Đã tạo và tải xuống báo cáo Word (.docx) chuyên nghiệp thành công!');
      } else if (selectedFormat === 'pdf') {
        if (!printContainerRef.current) {
          throw new Error('Print container not ready');
        }
        showInfo('Đang kết xuất tệp PDF vector độ phân giải cao...');
        await exportResultsToPdf(printContainerRef.current, `Report_${payload.selectedClass}`);
        showSuccess('Đã xuất báo cáo PDF (.pdf) chuẩn tiếng Việt không lỗi font thành công!');
      }
    } catch (err) {
      console.error('Export error:', err);
      showError('Có lỗi xảy ra trong quá trình xuất báo cáo. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="modal-export-results-report"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display text-white">
                  Xuất Báo Cáo Sổ Điểm & Kết Quả (Export Report)
                </h2>
                <Badge variant="indigo" size="sm">
                  {payload.totalResults} bài nộp
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Định dạng chuẩn: Excel đa trang (.xlsx), Word in ấn (.docx) hoặc PDF chuẩn tiếng Việt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4 text-slate-300" />}
              onClick={handlePrint}
              className="hidden sm:inline-flex bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 rounded-xl text-xs"
            >
              In trực tiếp (Print)
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns (Controls & Preview) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/50 print:block print:overflow-visible">
          {/* Left Column: Format & Scope Settings (print:hidden) */}
          <div className="lg:col-span-5 p-5 sm:p-6 space-y-5 print:hidden">
            {/* 1. Format Chooser */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                1. Chọn định dạng xuất (Export Format)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  id="btn-format-excel"
                  onClick={() => setSelectedFormat('excel')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    selectedFormat === 'excel'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <FileSpreadsheet
                    className={`w-6 h-6 ${
                      selectedFormat === 'excel' ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold">Excel (.xlsx)</span>
                  <span className="text-[10px] text-slate-500">5 Sheets phân tích</span>
                </button>

                <button
                  type="button"
                  id="btn-format-word"
                  onClick={() => setSelectedFormat('word')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    selectedFormat === 'word'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <FileText
                    className={`w-6 h-6 ${
                      selectedFormat === 'word' ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold">Word (.docx)</span>
                  <span className="text-[10px] text-slate-500">Mẫu in văn phòng</span>
                </button>

                <button
                  type="button"
                  id="btn-format-pdf"
                  onClick={() => setSelectedFormat('pdf')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    selectedFormat === 'pdf'
                      ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-sm ring-2 ring-rose-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <FileDown
                    className={`w-6 h-6 ${
                      selectedFormat === 'pdf' ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold">PDF (.pdf)</span>
                  <span className="text-[10px] text-slate-500">Không lỗi font</span>
                </button>
              </div>
            </div>

            {/* 2. Active Filters Overview (Prompt 14 Section 4 & 5) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  Bộ lọc đang áp dụng
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Khớp chính xác dữ liệu
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Bài tập:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                    {payload.selectedActivityTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Lớp học:</span>
                  <span className="font-semibold text-slate-800">{payload.selectedClass}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Khoảng thời gian:</span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px]">
                    {payload.dateRangeText}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Học sinh lọc:</span>
                  <span className="font-semibold text-slate-800">{payload.selectedStudentName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Chế độ điểm:</span>
                  <span className="font-semibold text-slate-800">{payload.attemptModeText}</span>
                </div>
              </div>
            </div>

            {/* 3. Summary Metrics Bar */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 block">
                Chỉ số thống kê sẽ xuất (Summary Statistics)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Tổng bài</span>
                  <span className="text-base font-bold text-slate-900 font-display">
                    {payload.totalResults}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Học sinh</span>
                  <span className="text-base font-bold text-slate-900 font-display">
                    {payload.totalStudents}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Điểm TB</span>
                  <span className="text-base font-bold text-emerald-600 font-display">
                    {payload.averageScore}%
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Included Sections Checklist */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Nội dung đính kèm trong báo cáo
              </label>

              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="rounded text-indigo-600"
                  />
                  <span className="font-medium text-slate-800">
                    Bảng kết quả chi tiết từng học sinh ({payload.totalResults} lượt nộp)
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeStudentProgress}
                    onChange={(e) => setIncludeStudentProgress(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-medium text-slate-800">
                    Báo cáo tiến độ học sinh ({payload.studentSummaries.length} học sinh)
                  </span>
                </label>

                {payload.questionErrorItems.length > 0 && (
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={includeQuestionAnalysis}
                      onChange={(e) => setIncludeQuestionAnalysis(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-medium text-slate-800">
                      Ma trận phân tích lỗi sai câu hỏi ({payload.questionErrorItems.length} câu)
                    </span>
                  </label>
                )}

                {payload.classComparisonItems.length > 0 && (
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={includeClassComparison}
                      onChange={(e) => setIncludeClassComparison(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-medium text-slate-800">
                      Bảng so sánh thống kê các lớp ({payload.classComparisonItems.length} lớp)
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button
                id="btn-confirm-export-report"
                variant="primary"
                size="lg"
                disabled={isExporting || payload.totalResults === 0}
                onClick={handleExecuteExport}
                icon={
                  isExporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : selectedFormat === 'excel' ? (
                    <FileSpreadsheet className="w-5 h-5" />
                  ) : selectedFormat === 'word' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <FileDown className="w-5 h-5" />
                  )
                }
                className={`w-full font-bold text-sm rounded-2xl shadow-lg transition-all ${
                  selectedFormat === 'excel'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                    : selectedFormat === 'word'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                }`}
              >
                {isExporting
                  ? 'Đang tạo báo cáo...'
                  : selectedFormat === 'excel'
                  ? 'Tải xuống tệp Excel (.xlsx)'
                  : selectedFormat === 'word'
                  ? 'Tải xuống tệp Word (.docx)'
                  : 'Tải xuống tệp PDF (.pdf)'}
              </Button>
            </div>
          </div>

          {/* Right Column: Live Printable Document Preview */}
          <div className="lg:col-span-7 p-4 sm:p-8 overflow-y-auto bg-slate-200/50 print:p-0 print:bg-white print:overflow-visible">
            <div className="flex items-center justify-between pb-3 text-xs text-slate-500 print:hidden">
              <span className="font-semibold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                Bản xem trước tài liệu in (Print & PDF Layout Preview)
              </span>
              <span>Khổ giấy: A4 Chuẩn</span>
            </div>

            {/* The Actual Document View (Used by html2canvas for PDF and window.print) */}
            <div
              ref={printContainerRef}
              id="report-printable-container"
              className="bg-white rounded-2xl shadow-md border border-slate-300/80 p-6 sm:p-10 space-y-6 text-slate-900 mx-auto max-w-[760px] print:shadow-none print:border-none print:p-0 print:m-0"
              style={{ minHeight: '800px' }}
            >
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="font-extrabold uppercase text-[11px] tracking-widest text-indigo-700 block">
                    {APP_NAME} • {payload.teacherName}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 tracking-tight mt-0.5">
                    BÁO CÁO KẾT QUẢ VÀ SỔ ĐIỂM (RESULTS REPORT)
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Bài tập: <strong>{payload.selectedActivityTitle}</strong> • Lớp:{' '}
                    <strong>{payload.selectedClass}</strong>
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-mono">
                  <div>Ngày lập: {new Date().toLocaleDateString('vi-VN')}</div>
                  <div>Giáo viên: {payload.teacherName}</div>
                </div>
              </div>

              {/* Filters Box in Document */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Phạm vi báo cáo (Filters)
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    • Thời gian: <strong>{payload.dateRangeText}</strong>
                  </div>
                  <div>
                    • Học sinh: <strong>{payload.selectedStudentName}</strong>
                  </div>
                  <div>
                    • Lớp: <strong>{payload.selectedClass}</strong>
                  </div>
                  <div>
                    • Lần làm bài: <strong>{payload.attemptModeText}</strong>
                  </div>
                </div>
              </div>

              {/* KPI Summary Block */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Tổng Hợp Chỉ Số Thống Kê
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Số bài nộp</span>
                    <span className="text-lg font-bold font-display text-slate-900">
                      {payload.totalResults}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Số học sinh</span>
                    <span className="text-lg font-bold font-display text-slate-900">
                      {payload.totalStudents}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Điểm TB</span>
                    <span className="text-lg font-bold font-display text-emerald-700">
                      {payload.averageScore}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Cao nhất</span>
                    <span className="text-lg font-bold font-display text-slate-900">
                      {payload.highestScore}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Thấp nhất</span>
                    <span className="text-lg font-bold font-display text-slate-900">
                      {payload.lowestScore}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Thời gian TB</span>
                    <span className="text-sm font-bold font-display text-slate-900 mt-0.5 block">
                      {formatDuration(payload.averageTimeSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Results Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Bảng Kết Quả Chi Tiết ({payload.results.length} bài nộp)
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                        <th className="p-2 text-center w-8">STT</th>
                        <th className="p-2">Học sinh</th>
                        <th className="p-2 text-center">Lớp</th>
                        <th className="p-2">Bài tập</th>
                        <th className="p-2 text-center">Điểm</th>
                        <th className="p-2 text-center">Đúng/Tổng</th>
                        <th className="p-2 text-center">TG</th>
                        <th className="p-2 text-right">Ngày nộp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payload.results.slice(0, 15).map((res, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">{res.studentName}</td>
                          <td className="p-2 text-center">{res.studentClass}</td>
                          <td className="p-2 max-w-[140px] truncate">
                            {res.activityTitle || 'Interactive Activity'}
                          </td>
                          <td className="p-2 text-center font-bold text-indigo-700 font-mono">
                            {res.percentage}%
                          </td>
                          <td className="p-2 text-center font-mono">
                            {typeof res.correctCount === 'number' ? res.correctCount : res.score}/
                            {res.totalQuestions || 0}
                          </td>
                          <td className="p-2 text-center font-mono">
                            {formatDuration(res.timeSpentSeconds || 0)}
                          </td>
                          <td className="p-2 text-right text-slate-500 font-mono text-[10px]">
                            {new Date(res.completedAt).toLocaleDateString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {payload.results.length > 15 && (
                  <p className="text-[10px] text-slate-400 italic text-right print:hidden">
                    * Đang hiển thị 15/{payload.results.length} dòng xem trước. Toàn bộ {payload.results.length} dòng
                    sẽ có đầy đủ trong file xuất.
                  </p>
                )}
              </div>

              {/* Question Error Section Preview if selected */}
              {includeQuestionAnalysis && payload.questionErrorItems.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Phân Tích Lỗi Sai Câu Hỏi ({payload.questionErrorItems.length} câu)
                  </h3>
                  <table className="w-full text-left text-[11px] border border-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-rose-50 text-rose-950 font-bold uppercase text-[10px] border-b border-rose-200">
                        <th className="p-2 text-center w-12">Câu</th>
                        <th className="p-2">Nội dung câu hỏi</th>
                        <th className="p-2 text-center">Lượt làm</th>
                        <th className="p-2 text-center">Đúng</th>
                        <th className="p-2 text-center">Sai</th>
                        <th className="p-2 text-center">Tỉ lệ sai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payload.questionErrorItems.slice(0, 5).map((q) => (
                        <tr key={q.questionId} className="bg-white">
                          <td className="p-2 text-center font-bold">Câu {q.questionNumber}</td>
                          <td className="p-2 max-w-[240px] truncate">{q.questionText}</td>
                          <td className="p-2 text-center font-mono">{q.timesAttempted}</td>
                          <td className="p-2 text-center font-mono text-emerald-600">{q.correctCount}</td>
                          <td className="p-2 text-center font-mono text-rose-600 font-bold">
                            {q.wrongAnswers}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-rose-700">
                            {q.errorRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Class Comparison Preview if selected */}
              {includeClassComparison && payload.classComparisonItems.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    So Sánh Thống Kê Các Lớp ({payload.classComparisonItems.length} lớp)
                  </h3>
                  <table className="w-full text-left text-[11px] border border-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold uppercase text-[10px] border-b border-slate-300">
                        <th className="p-2 text-center w-8">STT</th>
                        <th className="p-2">Lớp</th>
                        <th className="p-2 text-center">Học sinh</th>
                        <th className="p-2 text-center">Bài nộp</th>
                        <th className="p-2 text-center">Điểm TB</th>
                        <th className="p-2 text-center">Cao nhất</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payload.classComparisonItems.map((c, idx) => (
                        <tr key={c.className} className="bg-white">
                          <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-bold">{c.className}</td>
                          <td className="p-2 text-center font-mono">{c.studentsCount}</td>
                          <td className="p-2 text-center font-mono">{c.resultsCount}</td>
                          <td className="p-2 text-center font-bold text-indigo-700 font-mono">
                            {c.averageScore}%
                          </td>
                          <td className="p-2 text-center font-mono">{c.highestScore}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-700 uppercase">Người lập báo cáo</p>
                  <p className="text-[10px] text-slate-400 mt-1">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 uppercase">Giáo viên bộ môn</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">{payload.teacherName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Dữ liệu xuất tự động tính toán dựa trên {payload.totalResults} bài nộp thực tế.
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
