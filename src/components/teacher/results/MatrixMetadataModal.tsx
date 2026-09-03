import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  CheckCircle2,
  BookOpen,
  Layers,
  Award,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { QuestionItem } from '../../../types';
import { Button } from '../../ui/Button';

interface MatrixMetadataModalProps {
  isOpen: boolean;
  question: QuestionItem | null;
  questionNumber: number;
  onClose: () => void;
  onSave: (updatedQuestion: QuestionItem) => void;
  onOpenFullEditor?: (question: QuestionItem) => void;
}

export const MatrixMetadataModal: React.FC<MatrixMetadataModalProps> = ({
  isOpen,
  question,
  questionNumber,
  onClose,
  onSave,
  onOpenFullEditor,
}) => {
  if (!isOpen || !question) return null;

  const [unit, setUnit] = useState(question.unit || '');
  const [topic, setTopic] = useState(question.topic || question.lesson || '');
  const [skill, setSkill] = useState(question.skill || '');
  const [difficulty, setDifficulty] = useState(question.difficulty || question.level || '');
  const [cognitiveLevel, setCognitiveLevel] = useState(question.cognitiveLevel || '');
  const [questionType, setQuestionType] = useState(question.questionType || 'Multiple Choice');

  useEffect(() => {
    if (question) {
      setUnit(question.unit || '');
      setTopic(question.topic || question.lesson || '');
      setSkill(question.skill || '');
      setDifficulty(question.difficulty || question.level || '');
      setCognitiveLevel(question.cognitiveLevel || '');
      setQuestionType(question.questionType || 'Multiple Choice');
    }
  }, [question]);

  const handleSave = () => {
    const updated: QuestionItem = {
      ...question,
      unit: unit.trim() || undefined,
      lesson: topic.trim() || undefined, // Keep lesson aligned for backward compatibility
      topic: topic.trim() || undefined,
      skill: skill.trim() || undefined,
      difficulty: difficulty.trim() || undefined,
      level: difficulty.trim() || undefined, // Keep level aligned for backward compatibility
      cognitiveLevel: cognitiveLevel.trim() || undefined,
      questionType: questionType.trim() || undefined,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      id="modal-matrix-metadata"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold font-mono">
                Câu #{questionNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                Cập Nhật Ma Trận Đề
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-display text-white">
              Phân Loại Cấu Trúc Đề (Question Classification)
            </h3>
            <p className="text-xs text-slate-300">
              Cập nhật thông tin ma trận đề thi mà không làm thay đổi kết quả lịch sử của học sinh.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Question Text preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Nội dung câu hỏi
            </span>
            <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
              {question.question}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Unit (Bài Học)</span>
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="VD: Unit 1, Unit 5..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
              />
            </div>

            {/* Topic */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span>Chủ Đề (Topic / Lesson)</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Life Stories, Grammar..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
              />
            </div>

            {/* Skill */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kỹ Năng (Skill)</span>
              </label>
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
              >
                <option value="">Chưa xác định (Not specified)</option>
                <option value="Reading">Reading (Đọc hiểu)</option>
                <option value="Listening">Listening (Nghe hiểu)</option>
                <option value="Vocabulary">Vocabulary (Từ vựng)</option>
                <option value="Grammar">Grammar (Ngữ pháp)</option>
                <option value="Writing">Writing (Viết)</option>
                <option value="Speaking">Speaking (Nói)</option>
                <option value="Pronunciation">Pronunciation (Phát âm)</option>
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dạng Câu Hỏi (Question Type)</span>
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
              >
                <option value="">Chưa xác định (Not specified)</option>
                <option value="Multiple Choice">Multiple Choice (Trắc nghiệm)</option>
                <option value="True / False">True / False (Đúng / Sai)</option>
                <option value="Matching">Matching (Nối cột)</option>
                <option value="Complete the Sentence">Complete the Sentence (Điền câu)</option>
                <option value="Ordering">Ordering (Sắp xếp)</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Mức Độ Khó (Difficulty)</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
              >
                <option value="">Chưa xác định (Not specified)</option>
                <option value="Easy">Easy (Dễ)</option>
                <option value="Medium">Medium (Trung bình)</option>
                <option value="Hard">Hard (Khó)</option>
              </select>
            </div>

            {/* Cognitive Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cấp Độ Nhận Thức (Cognitive)</span>
              </label>
              <select
                value={cognitiveLevel}
                onChange={(e) => setCognitiveLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
              >
                <option value="">Chưa xác định (Not specified)</option>
                <option value="Nhận biết">Nhận biết (Recognition)</option>
                <option value="Thông hiểu">Thông hiểu (Understanding)</option>
                <option value="Vận dụng">Vận dụng (Application)</option>
                <option value="Vận dụng cao">Vận dụng cao (Higher Application)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {onOpenFullEditor ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullEditor(question);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Mở Trình Chỉnh Sửa Câu Hỏi Đầy Đủ &rarr;
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="rounded-xl text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Phân Loại Ma Trận</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
