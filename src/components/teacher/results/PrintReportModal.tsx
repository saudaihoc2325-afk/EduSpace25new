import React from 'react';
import { X, Printer, FileText, CheckCircle, Award, Users } from 'lucide-react';
import { StudentResult, Assignment } from '../../../types';
import {
  StudentPerformanceSummary,
  computeScoreDistribution,
  computePerformanceTiers,
} from '../../../utils/analyticsUtils';
import { APP_NAME, ORG_NAME } from '../../../constants/gameTypes';
import { Button } from '../../ui/Button';

interface PrintReportModalProps {
  results: StudentResult[];
  studentSummaries: StudentPerformanceSummary[];
  assignments: Assignment[];
  activeAssignmentTitle: string;
  activeClass: string;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  results,
  studentSummaries,
  assignments,
  activeAssignmentTitle,
  activeClass,
  onClose,
}) => {
  const totalSubmissions = results.length;
  const uniqueStudents = studentSummaries.length;
  const averagePct =
    totalSubmissions > 0
      ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions)
      : 0;

  const highestScore = totalSubmissions > 0 ? Math.max(...results.map((r) => r.percentage)) : 0;
  const lowestScore = totalSubmissions > 0 ? Math.min(...results.map((r) => r.percentage)) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="modal-print-teacher-report"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar (Non-printable) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm font-display text-white">
              Bản Xem Trước In Báo Cáo Sổ Điểm
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              id="btn-trigger-browser-print"
              variant="primary"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
            >
              In Báo Cáo (Print / Save PDF)
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 text-slate-900 space-y-6 print:p-0 print:m-0 print:overflow-visible">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="font-extrabold uppercase text-xs tracking-widest text-slate-500 block">
                {ORG_NAME}
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 tracking-tight">
                {APP_NAME} • BÁO CÁO KẾT QUẢ BÀI TẬP TIẾNG ANH
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Bài tập: <strong>{activeAssignmentTitle}</strong> • Lớp: <strong>{activeClass === 'all' ? 'Tất cả các lớp' : activeClass}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              <div>Ngày lập: {new Date().toLocaleDateString('vi-VN')}</div>
              <div>Giáo viên: {ORG_NAME}</div>
            </div>
          </div>

          {/* KPI Summary Block */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng bài nộp</span>
              <span className="text-xl font-bold font-display text-slate-900">{totalSubmissions}</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Số học sinh</span>
              <span className="text-xl font-bold font-display text-slate-900">{uniqueStudents}</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Điểm TB</span>
              <span className="text-xl font-bold font-display text-indigo-700">{averagePct}% ({((averagePct/100)*10).toFixed(1)}/10)</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Cao nhất / Thấp nhất</span>
              <span className="text-xl font-bold font-display text-slate-900">{highestScore}% / {lowestScore}%</span>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Bảng Tổng Hợp Kết Quả Học Sinh ({studentSummaries.length} học sinh)
            </h3>
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-600">
                  <th className="p-2 border-r border-slate-300 text-center w-10">STT</th>
                  <th className="p-2 border-r border-slate-300">Họ và tên</th>
                  <th className="p-2 border-r border-slate-300 text-center">Lớp</th>
                  <th className="p-2 border-r border-slate-300 text-center">SBD</th>
                  <th className="p-2 border-r border-slate-300 text-center">Số lần làm</th>
                  <th className="p-2 border-r border-slate-300 text-center">Điểm cao nhất</th>
                  <th className="p-2 border-r border-slate-300 text-center">Điểm TB</th>
                  <th className="p-2 border-r border-slate-300 text-center">Thời gian</th>
                  <th className="p-2 text-right">Ngày hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                {studentSummaries.map((std, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-bold">{std.studentName}</td>
                    <td className="p-2 border-r border-slate-200 text-center">{std.studentClass}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{std.studentId || '—'}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{std.totalAttempts}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold font-mono">
                      {std.bestPercentage}%
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{std.averagePercentage}%</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">
                      {Math.floor(std.averageTimeSpentSeconds / 60)}m {std.averageTimeSpentSeconds % 60}s
                    </td>
                    <td className="p-2 text-right text-slate-500 font-mono text-[11px]">
                      {new Date(std.lastCompletedAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature Block for Printout */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs">
            <div>
              <p className="font-bold text-slate-600">NGƯỜI LẬP BÁO CÁO</p>
              <p className="text-[10px] text-slate-400 mt-1">(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold text-slate-600">GIÁO VIÊN BỘ MÔN</p>
              <p className="text-[10px] text-slate-400 mt-1">{ORG_NAME}</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            Mẹo: Nhấn &quot;In Báo Cáo&quot; và chọn &quot;Save as PDF&quot; để xuất file PDF chất lượng cao.
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
