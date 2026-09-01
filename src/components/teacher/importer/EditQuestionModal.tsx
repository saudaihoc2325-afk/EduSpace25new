import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  HelpCircle,
  BookOpen,
  Layers,
  Clock,
  Award
} from 'lucide-react';
import { ImportedQuestionItem, QuestionOption } from '../../../types';
import { generateOptionId } from '../../../services/importParsers/validator';

interface EditQuestionModalProps {
  question: ImportedQuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ImportedQuestionItem) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !question) return null;

  const [questionText, setQuestionText] = useState(question.question);
  const [options, setOptions] = useState<QuestionOption[]>(
    question.options && question.options.length > 0
      ? question.options
      : [
          { id: generateOptionId('A', 0), label: 'A', text: '' },
          { id: generateOptionId('B', 1), label: 'B', text: '' },
          { id: generateOptionId('C', 2), label: 'C', text: '' },
          { id: generateOptionId('D', 3), label: 'D', text: '' },
        ]
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    question.correctAnswerId || (question.options?.[0]?.id ?? '')
  );
  const [explanation, setExplanation] = useState(question.explanation || '');
  const [passage, setPassage] = useState(question.passage || '');
  const [unit, setUnit] = useState(question.unit || '');
  const [lesson, setLesson] = useState(question.lesson || '');
  const [level, setLevel] = useState(question.level || 'Medium');
  const [points, setPoints] = useState(question.points || 10);
  const [timeLimit, setTimeLimit] = useState(question.timeLimitSeconds || 30);

  // Sync when question changes
  useEffect(() => {
    if (question) {
      setQuestionText(question.question);
      setOptions(
        question.options && question.options.length > 0
          ? question.options
          : [
              { id: generateOptionId('A', 0), label: 'A', text: '' },
              { id: generateOptionId('B', 1), label: 'B', text: '' },
              { id: generateOptionId('C', 2), label: 'C', text: '' },
              { id: generateOptionId('D', 3), label: 'D', text: '' },
            ]
      );
      setSelectedOptionId(question.correctAnswerId || question.options?.[0]?.id || '');
      setExplanation(question.explanation || '');
      setPassage(question.passage || '');
      setUnit(question.unit || '');
      setLesson(question.lesson || '');
      setLevel(question.level || 'Medium');
      setPoints(question.points || 10);
      setTimeLimit(question.timeLimitSeconds || 30);
    }
  }, [question]);

  const handleOptionTextChange = (index: number, newText: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], text: newText };
    setOptions(updated);
  };

  const handleSave = () => {
    // Validate live
    const issues: string[] = [];
    if (!questionText.trim()) issues.push('Question text cannot be empty.');

    const filledOptions = options.map((opt, idx) => ({
      ...opt,
      id: opt.id || generateOptionId(opt.label || String.fromCharCode(65 + idx), idx),
      label: opt.label || String.fromCharCode(65 + idx),
      text: opt.text.trim(),
    }));

    const validOptionsCount = filledOptions.filter((o) => o.text.length > 0).length;
    if (validOptionsCount < 2) {
      issues.push('At least 2 non-empty options are required.');
    }

    const correctOpt = filledOptions.find((o) => o.id === selectedOptionId);
    if (!correctOpt || !correctOpt.text) {
      issues.push('Please select a valid non-empty option as the correct answer.');
    }

    const updatedItem: ImportedQuestionItem = {
      ...question,
      question: questionText.trim(),
      options: filledOptions,
      correctAnswerId: selectedOptionId,
      correctAnswerText: correctOpt ? correctOpt.text : '',
      correctAnswer: correctOpt ? (correctOpt.label || correctOpt.text) : '',
      explanation: explanation.trim() ? explanation.trim() : null,
      passage: passage.trim() ? passage.trim() : null,
      unit: unit.trim(),
      lesson: lesson.trim(),
      level,
      points: Number(points) || 10,
      timeLimitSeconds: Number(timeLimit) || 30,
      validationStatus: issues.length === 0 ? 'VALID' : 'REVIEW_REQUIRED',
      validationIssues: issues,
      selectedForImport: issues.length === 0,
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              #{question.order}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Edit Imported Question</h3>
              <p className="text-xs text-slate-400">
                Source: {question.sourceFileName || 'Imported Document'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Validation Status Notice */}
          {question.validationIssues && question.validationIssues.length > 0 && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-amber-300">Review Required for this Question:</p>
                <ul className="list-disc list-inside text-amber-200/90 space-y-0.5">
                  {question.validationIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Reading Passage (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Reading Passage (Optional - Shared with other questions)
            </label>
            <textarea
              rows={2}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Paste reading passage or context here if applicable..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-y"
            />
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Question Text <span className="text-red-400">*</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Preserve blanks (_______) for gap-fill questions
              </span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. What is the opposite of 'cheap'?"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium transition-colors"
            />
          </div>

          {/* Answer Choices (A, B, C, D) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Options & Correct Answer Selection <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-indigo-400 font-medium">
                Click radio to mark correct option
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {options.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id;
                const label = opt.label || String.fromCharCode(65 + idx);

                return (
                  <div
                    key={opt.id || idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correct-option-group"
                      id={`opt-radio-${opt.id || idx}`}
                      checked={isSelected}
                      onChange={() => setSelectedOptionId(opt.id)}
                      className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {label}
                    </div>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${label} text`}
                      className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Explanation (Optional)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Why this answer is correct..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Metadata Grid (Unit, Lesson, Level, Points) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Unit 1"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Lesson</label>
              <input
                type="text"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                placeholder="e.g. Vocabulary"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Difficulty</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Time (sec)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            Apply & Validate Question
          </button>
        </div>
      </div>
    </div>
  );
};
