import React from 'react';
import {
  HelpCircle,
  Shuffle,
  Disc,
  Package,
  KeyRound,
  Trophy,
  FileText,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { GameType } from '../../types';
import { GAME_TYPES } from '../../constants/gameTypes';

interface GameTypeSelectorProps {
  selectedType: GameType;
  onSelectType: (type: GameType) => void;
  disabled?: boolean;
}

export const GameTypeSelector: React.FC<GameTypeSelectorProps> = ({
  selectedType,
  onSelectType,
  disabled = false,
}) => {
  const getIcon = (type: GameType) => {
    switch (type) {
      case 'quiz':
        return <HelpCircle className="w-5 h-5 text-indigo-400" />;
      case 'match_up':
        return <Shuffle className="w-5 h-5 text-emerald-400" />;
      case 'random_wheel':
        return <Disc className="w-5 h-5 text-amber-400" />;
      case 'open_box':
        return <Package className="w-5 h-5 text-purple-400" />;
      case 'anagram':
        return <KeyRound className="w-5 h-5 text-pink-400" />;
      case 'gameshow_quiz':
        return <Trophy className="w-5 h-5 text-rose-400" />;
      case 'complete_sentence':
        return <FileText className="w-5 h-5 text-cyan-400" />;
      default:
        return <HelpCircle className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {GAME_TYPES.map((game) => {
        const isSelected = selectedType === game.type;

        return (
          <button
            key={game.type}
            type="button"
            onClick={() => !disabled && onSelectType(game.type)}
            disabled={disabled}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between relative transition-all duration-150 ${
              isSelected
                ? 'bg-slate-850 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/40'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {getIcon(game.type)}
                </div>
                {isSelected ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-500/40">
                    <CheckCircle2 className="w-3 h-3" /> Selected
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    Ready
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{game.label}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {game.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
