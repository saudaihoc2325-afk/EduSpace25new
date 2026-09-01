import React, { useState } from 'react';
import {
  X,
  User,
  GraduationCap,
  Award,
  Clock,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { StudentResult, StudentAnswerRecord } from '../../../types';
import { StudentPerformanceSummary } from '../../../utils/analyticsUtils';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { CertificateModal } from '../../student/CertificateModal';

interface StudentDetailModalProps {
  summary: StudentPerformanceSummary;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  summary,
  onClose,
}) => {
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(0);
  const [showCertificate, setShowCertificate] = useState(false);

  const activeAttempt: StudentResult | undefined = summary.attempts[selectedAttemptIndex] || summary.attempts[0];

  const answers: StudentAnswerRecord[] = activeAttempt?.answers || [];
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalQ = answers.length || activeAttempt?.totalQuestions || 0;

  return (
    <div
      id="modal-student-performance-detail"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-lg font-display">
              {summary.studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-display text-white">
                  {summary.studentName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold">
                  Lớp {summary.studentClass}
                </span>
                {summary.studentId && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                    SBD: {summary.studentId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tổng số lần làm bài: <strong>{summary.totalAttempts} lần</strong></span>
                <span>•</span>
                <span>Hoàn thành gần nhất: {new Date(summary.lastCompletedAt).toLocaleString('vi-VN')}</span>
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

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-50 border-b border-slate-200 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Điểm cao nhất</span>
            <div className="text-lg font-black text-emerald-600 font-display mt-0.5">
              {summary.bestPercentage}%
              <span className="text-xs font-normal text-slate-400 ml-1 font-mono">({summary.bestScore}đ)</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Điểm mới nhất</span>
            <div className="text-lg font-black text-indigo-600 font-display mt-0.5">
              {summary.latestPercentage}%
              <span className="text-xs font-normal text-slate-400 ml-1 font-mono">({summary.latestScore}đ)</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Điểm trung bình</span>
            <div className="text-lg font-black text-amber-600 font-display mt-0.5">
              {summary.averagePercentage}%
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Thời gian trung bình</span>
            <div className="text-lg font-black text-purple-600 font-display mt-0.5">
              {Math.floor(summary.averageTimeSpentSeconds / 60)}m {summary.averageTimeSpentSeconds % 60}s
            </div>
          </div>
        </div>

        {/* Modal Body: Attempt Selector & Question Details */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Attempt Selector Tabs (if multiple attempts) */}
          {summary.attempts.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Chọn lần làm bài để xem chi tiết ({summary.attempts.length} lần)
              </label>
              <div className="flex flex-wrap gap-2">
                {summary.attempts.map((att, idx) => {
                  const isSelected = selectedAttemptIndex === idx;
                  return (
                    <button
                      key={att.id || idx}
                      type="button"
                      onClick={() => setSelectedAttemptIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Lần {att.attemptNumber || summary.attempts.length - idx}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                          isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {att.percentage}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Attempt Info Header */}
          {activeAttempt && (
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-indigo-900 block">
                  {activeAttempt.activityTitle || 'Bài tập tiếng Anh'}
                </span>
                <span className="text-indigo-700">
                  Mã bài: <strong className="font-mono">{activeAttempt.assignmentCode}</strong> • Hoàn thành:{' '}
                  {new Date(activeAttempt.completedAt).toLocaleString('vi-VN')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Thời gian</span>
                  <span className="font-bold text-slate-800">
                    {Math.floor((activeAttempt.timeSpentSeconds || 0) / 60)}m {(activeAttempt.timeSpentSeconds || 0) % 60}s
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Đúng</span>
                  <span className="font-bold text-emerald-600">
                    {correctCount}/{totalQ} câu ({activeAttempt.percentage}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Question Breakdown List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Chi tiết câu trả lời từng câu ({answers.length} câu)
            </h3>

            {answers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                Chưa có dữ liệu câu trả lời chi tiết cho lượt làm bài này.
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((ans, idx) => (
                  <div
                    key={ans.questionId || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      ans.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/40 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-2">
                      <span className="text-xs text-slate-800 font-display">
                        Câu #{idx + 1}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs">
                        {ans.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Chính xác (+{ans.pointsEarned || 10}đ)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span className="text-rose-700 font-bold">Chưa đúng</span>
                          </>
                        )}
                      </span>
                    </div>

                    {ans.questionText && (
                      <p className="text-xs text-slate-800 font-medium mb-3">
                        {ans.questionText}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Học sinh chọn:
                        </span>
                        <strong className="text-slate-900 font-mono">
                          {ans.selectedAnswer || 'Không trả lời'}
                        </strong>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">
                          Đáp án đúng chuẩn:
                        </span>
                        <strong className="text-emerald-700 font-mono">
                          {ans.correctAnswer || 'Đáp án mẫu'}
                        </strong>
                      </div>
                    </div>

                    {ans.explanation && (
                      <div className="mt-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-indigo-950">Giải thích của giáo viên: </span>
                          <span>{ans.explanation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <Button
            id="btn-teacher-print-cert"
            variant="outline"
            size="sm"
            icon={<Award className="w-4 h-4 text-amber-600" />}
            onClick={() => setShowCertificate(true)}
            className="border-amber-400/80 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold rounded-xl text-xs"
          >
            🏆 Cấp & In Giấy Khen ({activeAttempt?.percentage || summary.bestPercentage}%)
          </Button>

          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Đóng
          </Button>
        </div>
      </div>

      {showCertificate && activeAttempt && (
        <CertificateModal
          data={{
            studentName: summary.studentName,
            studentClass: summary.studentClass,
            activityTitle: activeAttempt.activityTitle || 'Bài tập tiếng Anh EduSpace25',
            score: activeAttempt.score,
            totalQuestions: activeAttempt.totalQuestions || totalQ,
            percentage: activeAttempt.percentage,
            completedAt: activeAttempt.completedAt,
            assignmentCode: activeAttempt.assignmentCode,
          }}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};
