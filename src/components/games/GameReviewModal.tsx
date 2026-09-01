import React from 'react';
import { X, CheckCircle2, XCircle, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { StudentAnswerRecord, QuestionItem } from '../../types';

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionItem[];
  answers: StudentAnswerRecord[];
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  questions,
  answers,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Answer Review & Explanations</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-200">
          {questions.map((q, idx) => {
            const answerRec = answers.find((a) => a.questionId === q.id) || answers[idx];
            const isCorrect = answerRec ? answerRec.isCorrect : false;

            return (
              <div
                key={q.id || idx}
                className={`p-4 rounded-2xl border ${
                  isCorrect
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                } space-y-3`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                        isCorrect
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/30 text-rose-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {isCorrect ? 'Correct Answer' : 'Incorrect'}
                    </span>
                  </div>

                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> +{q.points || 10} pts
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/40">
                      <XCircle className="w-3.5 h-3.5" /> 0 pts
                    </span>
                  )}
                </div>

                {q.passage && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 italic">
                    <span className="font-semibold text-indigo-400 not-italic">Passage: </span>
                    {q.passage}
                  </div>
                )}

                <p className="text-sm font-semibold text-white leading-relaxed">{q.question}</p>

                {/* Answer comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Your Answer:
                    </span>
                    <span
                      className={`font-semibold ${
                        isCorrect ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {answerRec?.selectedAnswer || 'Not answered'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Correct Key:
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {q.correctAnswerText ||
                        q.options.find((o) => o.id === q.correctAnswerId)?.text ||
                        q.correctAnswer ||
                        '—'}
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20 text-xs text-slate-300 flex items-start gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-indigo-300">Why? </strong>
                      <span>{q.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};
