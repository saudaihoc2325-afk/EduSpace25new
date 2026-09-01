import React from 'react';
import {
  Heart,
  Sparkles,
  Lightbulb,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Smile,
  Compass,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface EncouragementCardProps {
  studentName: string;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  onReviewAnswers?: () => void;
  onPlayAgain?: () => void;
  canPlayAgain?: boolean;
}

export const EncouragementCard: React.FC<EncouragementCardProps> = ({
  studentName,
  percentage,
  correctCount,
  totalQuestions,
  onReviewAnswers,
  onPlayAgain,
  canPlayAgain = true,
}) => {
  const getEncouragementContent = () => {
    if (percentage >= 50 && percentage < 70) {
      return {
        badge: 'Cố gắng một chút nữa là đạt điểm cao! 🚀',
        title: `Bạn đã đi được hơn nửa chặng đường rồi, ${studentName}!`,
        message:
          'Bạn đã trả lời đúng một số câu hỏi khó! Chỉ cần chú ý thêm vài điểm ngữ pháp hoặc từ vựng quan trọng bên dưới là điểm số của bạn sẽ bứt phá mạnh mẽ ở lần làm tiếp theo.',
        tip: 'Hãy nhấn "Xem lại bài làm" để đọc phần giải thích chi tiết của giáo viên cho các câu chưa đúng nhé!',
        icon: <Sparkles className="w-5 h-5 text-amber-400" />,
        bgColor: 'from-indigo-950/80 via-slate-900 to-indigo-950/80',
        borderColor: 'border-indigo-500/40',
        textColor: 'text-indigo-200',
      };
    } else {
      return {
        badge: 'Học tập là một hành trình kiên trì! 🌱',
        title: `Đừng nản lòng nhé ${studentName}, bạn đã rất nỗ lực!`,
        message:
          'Tiếng Anh luôn cần thời gian tích lũy và thực hành đều đặn. Mỗi câu chưa đúng hôm nay chính là một cơ hội vàng để bạn ghi nhớ kiến thức sâu sắc hơn cho ngày mai.',
        tip: 'Dành vài phút đọc kỹ phần giải thích của từng câu hỏi, sau đó tự tin thử sức lại một lần nữa nha!',
        icon: <Heart className="w-5 h-5 text-rose-400" />,
        bgColor: 'from-slate-900 via-purple-950/40 to-slate-900',
        borderColor: 'border-purple-500/40',
        textColor: 'text-purple-200',
      };
    }
  };

  const content = getEncouragementContent();

  return (
    <div
      id="card-student-encouragement"
      className={`rounded-3xl bg-gradient-to-br ${content.bgColor} border ${content.borderColor} p-5 sm:p-6 text-left shadow-xl shadow-slate-950/50 relative overflow-hidden space-y-4`}
    >
      {/* Background Soft Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          {content.icon}
        </div>
        <div className="space-y-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-bold">
            <span>{content.badge}</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-white font-display">
            {content.title}
          </h3>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed relative z-10">
        {content.message}
      </p>

      {/* Helpful Advice Box */}
      <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-200/90 relative z-10">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-amber-300 font-bold">Gợi ý dành cho bạn: </strong>
          {content.tip}
        </p>
      </div>

      {/* Quick Action CTAs */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1 relative z-10">
        {onReviewAnswers && (
          <Button
            id="btn-encouragement-review"
            variant="outline"
            size="sm"
            onClick={onReviewAnswers}
            icon={<BookOpen className="w-4 h-4 text-indigo-300" />}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl"
          >
            Đọc Giải Thích Chi Tiết
          </Button>
        )}

        {canPlayAgain && onPlayAgain && (
          <Button
            id="btn-encouragement-play-again"
            variant="primary"
            size="sm"
            onClick={onPlayAgain}
            icon={<RotateCcw className="w-4 h-4" />}
            className="shadow-lg shadow-indigo-600/30 text-xs font-bold rounded-xl"
          >
            Thử Thách Lại Ngay
          </Button>
        )}
      </div>
    </div>
  );
};
