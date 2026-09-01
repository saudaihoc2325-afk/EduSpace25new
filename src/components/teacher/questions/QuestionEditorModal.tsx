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
  Award,
  Loader2,
  FileText,
  Tag,
  Check,
  RotateCcw
} from 'lucide-react';
import { QuestionItem, QuestionOption } from '../../../types';
import { validateQuestion } from '../../../services/questionValidator';
import { suggestExplanation, ExplanationSuggestionResult } from '../../../services/aiExplanationService';

interface QuestionEditorModalProps {
  question: QuestionItem | null;
  isOpen: boolean;
  questionNumber?: number;
  onClose: () => void;
  onSave: (updatedQuestion: QuestionItem) => void;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  question,
  isOpen,
  questionNumber,
  onClose,
  onSave,
}) => {
  if (!isOpen || !question) return null;

  // Initialize fields
  const [questionText, setQuestionText] = useState(question.question || '');
  const [passage, setPassage] = useState(question.passage || '');

  // 4 Standard Options
  const [options, setOptions] = useState<QuestionOption[]>(() => {
    if (question.options && question.options.length >= 4) {
      return question.options.map((opt, idx) => ({
        id: opt.id || `opt_${String.fromCharCode(97 + idx)}_${Math.random().toString(36).substring(2, 7)}`,
        label: opt.label || String.fromCharCode(65 + idx),
        text: opt.text || '',
      }));
    }
    return [
      { id: `opt_a_${Math.random().toString(36).substring(2, 7)}`, label: 'A', text: question.options?.[0]?.text || '' },
      { id: `opt_b_${Math.random().toString(36).substring(2, 7)}`, label: 'B', text: question.options?.[1]?.text || '' },
      { id: `opt_c_${Math.random().toString(36).substring(2, 7)}`, label: 'C', text: question.options?.[2]?.text || '' },
      { id: `opt_d_${Math.random().toString(36).substring(2, 7)}`, label: 'D', text: question.options?.[3]?.text || '' },
    ];
  });

  const [selectedOptionId, setSelectedOptionId] = useState<string>(() => {
    if (question.correctAnswerId) return question.correctAnswerId;
    return options[0]?.id || '';
  });

  const [explanation, setExplanation] = useState(question.explanation || '');
  const [unit, setUnit] = useState(question.unit || '');
  const [lesson, setLesson] = useState(question.lesson || '');
  const [level, setLevel] = useState(question.level || 'Medium');
  const [questionType, setQuestionType] = useState(question.questionType || 'Multiple Choice');
  const [points, setPoints] = useState<number>(question.points || 10);
  const [timeLimit, setTimeLimit] = useState<number>(question.timeLimitSeconds || 30);

  // AI Suggestion State
  const [aiSuggestion, setAiSuggestion] = useState<ExplanationSuggestionResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Sync state whenever question changes
  useEffect(() => {
    if (question) {
      setQuestionText(question.question || '');
      setPassage(question.passage || '');

      let initialOptions: QuestionOption[];
      if (question.options && question.options.length >= 4) {
        initialOptions = question.options.map((opt, idx) => ({
          id: opt.id || `opt_${String.fromCharCode(97 + idx)}_${Math.random().toString(36).substring(2, 7)}`,
          label: opt.label || String.fromCharCode(65 + idx),
          text: opt.text || '',
        }));
      } else {
        initialOptions = [
          { id: `opt_a_${Math.random().toString(36).substring(2, 7)}`, label: 'A', text: question.options?.[0]?.text || '' },
          { id: `opt_b_${Math.random().toString(36).substring(2, 7)}`, label: 'B', text: question.options?.[1]?.text || '' },
          { id: `opt_c_${Math.random().toString(36).substring(2, 7)}`, label: 'C', text: question.options?.[2]?.text || '' },
          { id: `opt_d_${Math.random().toString(36).substring(2, 7)}`, label: 'D', text: question.options?.[3]?.text || '' },
        ];
      }
      setOptions(initialOptions);

      // Resolve correct answer ID safely
      if (question.correctAnswerId && initialOptions.some((o) => o.id === question.correctAnswerId)) {
        setSelectedOptionId(question.correctAnswerId);
      } else if (question.correctAnswer) {
        const found = initialOptions.find((o) => o.label === question.correctAnswer || o.text === question.correctAnswer);
        setSelectedOptionId(found ? found.id : initialOptions[0].id);
      } else {
        setSelectedOptionId(initialOptions[0].id);
      }

      setExplanation(question.explanation || '');
      setUnit(question.unit || '');
      setLesson(question.lesson || '');
      setLevel(question.level || 'Medium');
      setQuestionType(question.questionType || 'Multiple Choice');
      setPoints(question.points || 10);
      setTimeLimit(question.timeLimitSeconds || 30);
      setAiSuggestion(null);
    }
  }, [question]);

  // Handle Option Text Change with Automatic Answer Synchronization
  const handleOptionTextChange = (index: number, newText: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], text: newText };
    setOptions(updated);
  };

  // Live validation
  const currentTempQuestion: QuestionItem = {
    ...question,
    question: questionText,
    options,
    correctAnswerId: selectedOptionId,
    correctAnswerText: options.find((o) => o.id === selectedOptionId)?.text || '',
    explanation: explanation.trim() ? explanation.trim() : null,
    passage: passage.trim() ? passage.trim() : null,
    unit,
    lesson,
    level,
    questionType,
    order: questionNumber || question.order || 1,
  };

  const validationResult = validateQuestion(currentTempQuestion);

  // Handle AI Explanation Suggestion
  const handleRequestAiSuggestion = async () => {
    setIsAiLoading(true);
    setAiSuggestion(null);
    try {
      const result = await suggestExplanation(questionText, options, selectedOptionId, passage);
      setAiSuggestion(result);
    } catch (err) {
      console.error('Error getting AI explanation:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save changes
  const handleSave = () => {
    const chosenOption = options.find((o) => o.id === selectedOptionId);

    const updatedItem: QuestionItem = {
      ...question,
      id: question.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question: questionText.trim(),
      options: options.map((opt, idx) => ({
        id: opt.id || `opt_${String.fromCharCode(97 + idx)}_${Math.random().toString(36).substring(2, 7)}`,
        label: opt.label || String.fromCharCode(65 + idx),
        text: opt.text.trim(),
      })),
      correctAnswerId: selectedOptionId,
      correctAnswerText: chosenOption ? chosenOption.text.trim() : '',
      correctAnswer: chosenOption ? chosenOption.label || chosenOption.text.trim() : '',
      explanation: explanation.trim() ? explanation.trim() : null,
      passage: passage.trim() ? passage.trim() : null,
      unit: unit.trim(),
      lesson: lesson.trim(),
      level,
      questionType,
      points: Number(points) || 10,
      timeLimitSeconds: Number(timeLimit) || 30,
      order: questionNumber || question.order || 1,
      sourceFileName: question.sourceFileName || '',
      sourceFileType: question.sourceFileType || 'manual',
      importedAt: question.importedAt || new Date().toISOString(),
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              #{questionNumber || question.order || 1}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Question Editor
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    validationResult.status === 'VALID'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : validationResult.status === 'REVIEW_REQUIRED'
                      ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {validationResult.status}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {question.sourceFileName ? `Source: ${question.sourceFileName}` : 'Manually Created Question'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">

          {/* Validation Feedback Banner if issues exist */}
          {validationResult.allIssues.length > 0 && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                validationResult.status === 'ERROR'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {validationResult.status === 'ERROR' ? 'Question Validation Errors:' : 'Review Warnings:'}
                </p>
                <ul className="list-disc list-inside space-y-0.5 opacity-90">
                  {validationResult.allIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Reading Passage (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Reading Passage / Context <span className="text-slate-500 font-normal">(Optional)</span>
              </span>
              <span className="text-[11px] text-slate-500">Shared reading text or paragraph</span>
            </label>
            <textarea
              rows={2}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Paste reading passage or background context here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Question Text <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Preserves exact formatting, quotes, contractions & blanks (_______)
              </span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. He promised _______ her as soon as he arrived at the airport."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Answer Options & Correct Answer Radio Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Options (A, B, C, D) & Correct Answer Selection <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-indigo-400 font-medium">
                Click radio circle to designate correct answer
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
                        ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/40 shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Radio Button */}
                    <input
                      type="radio"
                      name={`modal-correct-opt-${question.id}`}
                      id={`modal-opt-radio-${opt.id}`}
                      checked={isSelected}
                      onChange={() => setSelectedOptionId(opt.id)}
                      className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                      title="Select as correct answer"
                    />

                    {/* Label Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {label}
                    </div>

                    {/* Option Text Input */}
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Enter text for option ${label}...`}
                      className="w-full bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none font-medium"
                    />

                    {isSelected && (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider shrink-0 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40">
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation Section with AI Suggestion Helper */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Explanation <span className="text-slate-500 font-normal">(Optional)</span>
              </label>

              {/* AI Suggest Button */}
              <button
                type="button"
                onClick={handleRequestAiSuggestion}
                disabled={isAiLoading || !questionText.trim()}
                className="px-3 py-1 text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    AI Suggest Explanation
                  </>
                )}
              </button>
            </div>

            {/* AI Suggestion Preview Box if generated */}
            {aiSuggestion && (
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/50 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI SUGGESTION
                  </div>
                  <span className="text-[10px] text-slate-400">Teacher review required</span>
                </div>

                <p className="text-xs text-slate-200 bg-slate-950/60 p-3 rounded-lg border border-indigo-900/60 leading-relaxed italic">
                  {aiSuggestion.explanation}
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExplanation(aiSuggestion.explanation);
                      setAiSuggestion(null);
                    }}
                    className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm flex items-center gap-1 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Use This
                  </button>
                </div>
              </div>
            )}

            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="e.g. 'Promise to do something' takes a to-infinitive..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-y leading-relaxed"
            />
            {!explanation.trim() && (
              <p className="text-[11px] text-slate-500 italic">
                No explanation provided (Optional - questions remain valid without an explanation).
              </p>
            )}
          </div>

          {/* Academic Metadata Grid (Unit, Lesson, Level, Question Type, Points, Time Limit) */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Academic Metadata & Game Settings
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. Unit 5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Lesson</label>
                <input
                  type="text"
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  placeholder="e.g. Grammar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                >
                  <option value="Multiple Choice">Multiple Choice</option>
                  <option value="True / False">True / False</option>
                  <option value="Complete the Sentence">Complete Sentence</option>
                  <option value="Matching">Matching</option>
                  <option value="Ordering">Ordering</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Points</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value) || 10)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Time (sec)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value) || 30)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            Save Question Changes
          </button>
        </div>
      </div>
    </div>
  );
};
