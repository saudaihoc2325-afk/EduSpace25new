import React from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  ShieldCheck,
  Play,
  ArrowRight
} from 'lucide-react';
import { SetValidationSummary } from '../../../services/questionValidator';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SetValidationSummary;
  onSelectQuestionToFix: (index: number) => void;
  onCreateGame: () => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  summary,
  onSelectQuestionToFix,
  onCreateGame,
}) => {
  if (!isOpen) return null;

  const problematicQuestions = summary.questionResults.filter(
    (qr) => qr.result.status !== 'VALID'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Question Set Validation Report
              </h2>
              <p className="text-xs text-slate-400">
                Integrity analysis across all {summary.total} questions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Summary Scorecards */}
          <div className="grid grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <p className="text-xl font-black text-white">{summary.total}</p>
              <p className="text-[10px] font-semibold uppercase text-slate-400 mt-0.5">Total</p>
            </div>

            <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30 text-center">
              <p className="text-xl font-black text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {summary.valid}
              </p>
              <p className="text-[10px] font-semibold uppercase text-emerald-300 mt-0.5">Valid</p>
            </div>

            <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30 text-center">
              <p className="text-xl font-black text-amber-400 flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {summary.reviewRequired}
              </p>
              <p className="text-[10px] font-semibold uppercase text-amber-300 mt-0.5">Review</p>
            </div>

            <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-500/30 text-center">
              <p className="text-xl font-black text-rose-400 flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4" />
                {summary.errors}
              </p>
              <p className="text-[10px] font-semibold uppercase text-rose-300 mt-0.5">Errors</p>
            </div>
          </div>

          {/* Validation Status Message */}
          {summary.errors === 0 && summary.reviewRequired === 0 ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">All Questions Valid!</p>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Every question in this set has full options, valid answers, and no duplicate issues. Ready for game activities.
                </p>
              </div>
            </div>
          ) : summary.errors > 0 ? (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 space-y-1">
                <p className="font-bold text-rose-300">Errors Detected</p>
                <p>
                  {summary.errors} {summary.errors === 1 ? 'question has' : 'questions have'} missing required fields or answer key discrepancies. You must fix errors before using this set safely in games.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 space-y-1">
                <p className="font-bold text-amber-300">Review Recommended</p>
                <p>
                  No critical errors found, but {summary.reviewRequired} {summary.reviewRequired === 1 ? 'question has' : 'questions have'} warnings (such as duplicate options).
                </p>
              </div>
            </div>
          )}

          {/* Detailed Problematic Questions List */}
          {problematicQuestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Questions Requiring Attention ({problematicQuestions.length})
              </h3>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {problematicQuestions.map((pq) => {
                  const isError = pq.result.status === 'ERROR';

                  return (
                    <div
                      key={pq.questionId || pq.questionIndex}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                        isError
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-amber-950/20 border-amber-500/40'
                      }`}
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                              isError ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                            }`}
                          >
                            {pq.questionNumber}
                          </span>
                          <span className="font-semibold text-white truncate max-w-[280px] sm:max-w-md">
                            {pq.questionTitle}
                          </span>
                        </div>

                        <ul className="list-disc list-inside space-y-0.5 pl-6 text-[11px] opacity-90">
                          {pq.result.allIssues.map((issue, i) => (
                            <li key={i} className={isError ? 'text-rose-300' : 'text-amber-300'}>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectQuestionToFix(pq.questionIndex);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        Fix Now
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl"
          >
            Close Report
          </button>

          <button
            type="button"
            disabled={summary.hasBlockingErrors}
            onClick={() => {
              onClose();
              onCreateGame();
            }}
            className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
              summary.hasBlockingErrors
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Proceed to Game Creation
          </button>
        </div>
      </div>
    </div>
  );
};
