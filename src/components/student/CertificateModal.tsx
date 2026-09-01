import React, { useRef } from 'react';
import {
  Award,
  X,
  Printer,
  Download,
  Sparkles,
  CheckCircle2,
  Calendar,
  GraduationCap,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { APP_NAME, ORG_NAME } from '../../constants/gameTypes';

export interface CertificateData {
  studentName: string;
  studentClass: string;
  activityTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt?: string;
  assignmentCode?: string;
  certificateId?: string;
}

interface CertificateModalProps {
  data: CertificateData;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  data,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const certId =
    data.certificateId ||
    `E25-${(data.assignmentCode || '888').toUpperCase()}-${Math.abs(
      (data.studentName + data.studentClass).split('').reduce((acc, c) => acc + c.charCodeAt(0), 100)
    ).toString().slice(0, 4)}`;

  const formattedDate = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

  const handlePrint = () => {
    window.print();
  };

  const getHonorTitle = (percentage: number) => {
    if (percentage >= 95) return 'EXCELLENCE WITH HIGHEST HONORS';
    if (percentage >= 85) return 'HIGH ACADEMIC DISTINCTION';
    return 'CERTIFICATE OF ACHIEVEMENT';
  };

  const getHonorTitleVi = (percentage: number) => {
    if (percentage >= 95) return 'GIẤY KHEN THÀNH TÍCH XUẤT SẮC HẠNG TỐI ƯU';
    if (percentage >= 85) return 'CHỨNG NHẬN THÀNH TÍCH HỌC TẬP XUẤT SẮC';
    return 'GIẤY CHỨNG NHẬN HOÀN THÀNH XUẤT SẮC';
  };

  return (
    <div
      id="modal-student-certificate"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 rounded-3xl border border-amber-500/40 shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                Giấy Khen Vinh Danh Học Sinh
              </h3>
              <p className="text-[11px] text-slate-400">
                Chứng nhận thành tích học tập trực tuyến EduSpace25
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="btn-print-certificate"
              variant="primary"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/30 text-xs rounded-xl"
            >
              In / Lưu PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/50 flex items-center justify-center">
          <div
            ref={printRef}
            className="certificate-print-root w-full max-w-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50/70 text-slate-900 rounded-2xl p-6 sm:p-10 border-8 border-double border-amber-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden select-none"
          >
            {/* Elegant Background Security Guilloche & Watermark */}
            <div className="absolute inset-2 border-2 border-amber-600/30 rounded-xl pointer-events-none" />
            <div className="absolute inset-4 border border-dashed border-amber-500/20 rounded-lg pointer-events-none" />

            {/* Corner Decorative Ornaments */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-600" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-600" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-600" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-600" />

            {/* Header / Seal */}
            <div className="text-center relative z-10 space-y-2">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 text-[10px] font-extrabold uppercase tracking-widest mb-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{ORG_NAME} • HIGH SCHOOL ENGLISH HUB</span>
              </div>

              <h1 className="text-xl sm:text-3xl font-serif font-black tracking-wider text-amber-950 uppercase drop-shadow-xs">
                {getHonorTitleVi(data.percentage)}
              </h1>
              <p className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-amber-800 uppercase">
                {getHonorTitle(data.percentage)}
              </p>

              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-2" />
            </div>

            {/* Presentation Body */}
            <div className="text-center my-6 sm:my-8 relative z-10 space-y-3">
              <p className="text-xs sm:text-sm text-slate-600 font-serif italic">
                Trân trọng trao tặng cho học sinh (Proudly presented to):
              </p>

              <div className="py-2">
                <div className="text-2xl sm:text-4xl font-serif font-black text-indigo-950 tracking-wide border-b-2 border-amber-400/80 inline-block px-6 pb-1">
                  {data.studentName}
                </div>
                <div className="text-xs sm:text-sm font-bold text-amber-900 mt-1 font-sans">
                  Lớp: <strong className="text-indigo-900">{data.studentClass}</strong>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 max-w-md mx-auto leading-relaxed">
                Đã hoàn thành xuất sắc bài tập tiếng Anh tương tác:
                <br />
                <strong className="text-slate-950 font-bold block text-sm sm:text-base mt-1">
                  "{data.activityTitle}"
                </strong>
              </p>

              {/* Achievement Badge Box */}
              <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-amber-100/60 border border-amber-300/80 rounded-2xl px-4 py-2 mt-2">
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-amber-800 block">Độ chính xác</span>
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-800">
                    {data.percentage}%
                  </span>
                </div>
                <div className="w-px h-6 bg-amber-300" />
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-amber-800 block">Điểm số</span>
                  <span className="text-base sm:text-lg font-black font-mono text-indigo-900">
                    {data.score} / {data.totalQuestions * 10}đ
                  </span>
                </div>
                <div className="w-px h-6 bg-amber-300" />
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-amber-800 block">Xếp loại</span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-900">
                    Xuất Sắc 🌟
                  </span>
                </div>
              </div>
            </div>

            {/* Footer / Verification Stamp & Signatures */}
            <div className="pt-4 border-t border-amber-400/40 grid grid-cols-2 items-end relative z-10 text-xs">
              <div className="text-left space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xác thực hệ thống {APP_NAME}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  Mã số: <strong>#{certId}</strong>
                </p>
                <p className="text-[10px] text-slate-500">
                  Ngày cấp: {formattedDate}
                </p>
              </div>

              <div className="text-right space-y-1">
                {/* Gold Seal Graphic */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 text-white shadow-md border-2 border-white mb-1">
                  <Star className="w-6 h-6 fill-white" />
                </div>
                <p className="text-[11px] font-serif font-bold text-indigo-950 uppercase">
                  Ban Học Thuật EduSpace25
                </p>
                <p className="text-[9px] text-slate-500 italic">
                  Digital Certified Academic Honor
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center print:hidden">
          <p className="text-[11px] text-slate-400">
            Mẹo: Bạn có thể nhấn <strong>In / Lưu PDF</strong> để in ra giấy hoặc lưu thành tệp chứng nhận PDF lưu giữ kỷ niệm.
          </p>
        </div>
      </div>
    </div>
  );
};
