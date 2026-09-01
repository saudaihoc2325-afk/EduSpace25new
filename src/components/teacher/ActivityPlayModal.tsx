import React from 'react';
import { X, Send } from 'lucide-react';
import { Activity } from '../../types';
import { GameSessionRunner } from '../games/GameSessionRunner';
import { GAME_TYPES } from '../../constants/gameTypes';

interface ActivityPlayModalProps {
  activity: Activity | null;
  onClose: () => void;
  onAssign: (activity: Activity) => void;
}

export const ActivityPlayModal: React.FC<ActivityPlayModalProps> = ({
  activity,
  onClose,
  onAssign,
}) => {
  if (!activity || !activity.questionSet?.questions) return null;

  const questions = activity.questionSet.questions;
  const meta = GAME_TYPES.find((g) => g.type === activity.gameType) || GAME_TYPES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800/90 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-xl border border-indigo-500/30">
              Preview Mode
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Format: {meta.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAssign(activity);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Assign to Class</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Game Runner Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950">
          <GameSessionRunner
            gameType={activity.gameType}
            title={activity.title}
            questions={questions}
            settings={activity.settings}
            selectedQuestionIds={activity.selectedQuestionIds}
            onExit={onClose}
            isPreview={true}
          />
        </div>
      </div>
    </div>
  );
};
