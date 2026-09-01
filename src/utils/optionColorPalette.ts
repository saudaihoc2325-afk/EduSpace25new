/**
 * EduSpace25 - Dynamic 3D Neon Option Color Palette
 * Generates distinct, high-contrast, vibrant 3D gradient themes for options A, B, C, D, E, F, G, H...
 * Provides optical depth, neon glow highlights, and tactile 3D hover/active press states.
 */

export interface OptionColorTheme {
  letter: string;
  name: string;
  hexPrimary: string;
  hexSecondary: string;
  badgeBg: string;
  badgeShadow: string;
  badgeBorder: string;
  badgeText: string;
  cardIdleBg: string;
  cardIdleBorder: string;
  cardIdleShadow: string;
  cardIdleHover: string;
  glowAura: string;
  accentText: string;
}

export const OPTION_THEMES: OptionColorTheme[] = [
  // A - Vibrant Coral / Crimson Rose
  {
    letter: 'A',
    name: 'Coral Crimson',
    hexPrimary: '#f43f5e',
    hexSecondary: '#e11d48',
    badgeBg: 'bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(244,63,94,0.45)]',
    badgeBorder: 'border-rose-300/40',
    badgeText: 'text-white font-extrabold',
    cardIdleBg: 'bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-rose-950/30',
    cardIdleBorder: 'border-rose-500/35 hover:border-rose-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(159,18,57,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(225,29,72,0.6),0_0_24px_rgba(244,63,94,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(244, 63, 94, 0.4)',
    accentText: 'text-rose-300',
  },
  // B - Bright Sapphire / Electric Cyan
  {
    letter: 'B',
    name: 'Sapphire Cyan',
    hexPrimary: '#0284c7',
    hexSecondary: '#2563eb',
    badgeBg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(14,165,233,0.45)]',
    badgeBorder: 'border-sky-300/40',
    badgeText: 'text-white font-extrabold',
    cardIdleBg: 'bg-gradient-to-r from-sky-950/40 via-slate-900/90 to-blue-950/30',
    cardIdleBorder: 'border-sky-500/35 hover:border-sky-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(3,105,161,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(2,132,199,0.6),0_0_24px_rgba(14,165,233,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(14, 165, 233, 0.4)',
    accentText: 'text-sky-300',
  },
  // C - Vivid Mint / Emerald
  {
    letter: 'C',
    name: 'Emerald Mint',
    hexPrimary: '#10b981',
    hexSecondary: '#059669',
    badgeBg: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(16,185,129,0.45)]',
    badgeBorder: 'border-emerald-300/40',
    badgeText: 'text-white font-extrabold',
    cardIdleBg: 'bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-teal-950/30',
    cardIdleBorder: 'border-emerald-500/35 hover:border-emerald-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(4,120,87,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(16,185,129,0.6),0_0_24px_rgba(16,185,129,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(16, 185, 129, 0.4)',
    accentText: 'text-emerald-300',
  },
  // D - Radiant Amber / Golden Orange
  {
    letter: 'D',
    name: 'Amber Gold',
    hexPrimary: '#f59e0b',
    hexSecondary: '#d97706',
    badgeBg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(245,158,11,0.45)]',
    badgeBorder: 'border-amber-300/40',
    badgeText: 'text-slate-950 font-black',
    cardIdleBg: 'bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-orange-950/30',
    cardIdleBorder: 'border-amber-500/35 hover:border-amber-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(180,83,9,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(245,158,11,0.6),0_0_24px_rgba(245,158,11,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(245, 158, 11, 0.4)',
    accentText: 'text-amber-300',
  },
  // E - Electric Violet / Purple
  {
    letter: 'E',
    name: 'Electric Purple',
    hexPrimary: '#a855f7',
    hexSecondary: '#7e22ce',
    badgeBg: 'bg-gradient-to-br from-purple-400 via-violet-500 to-purple-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(168,85,247,0.45)]',
    badgeBorder: 'border-purple-300/40',
    badgeText: 'text-white font-extrabold',
    cardIdleBg: 'bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-violet-950/30',
    cardIdleBorder: 'border-purple-500/35 hover:border-purple-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(107,33,168,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(168,85,247,0.6),0_0_24px_rgba(168,85,247,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(168, 85, 247, 0.4)',
    accentText: 'text-purple-300',
  },
  // F - Hot Magenta / Fuchsia
  {
    letter: 'F',
    name: 'Hot Magenta',
    hexPrimary: '#d946ef',
    hexSecondary: '#c026d3',
    badgeBg: 'bg-gradient-to-br from-fuchsia-400 via-pink-500 to-rose-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(217,70,239,0.45)]',
    badgeBorder: 'border-fuchsia-300/40',
    badgeText: 'text-white font-extrabold',
    cardIdleBg: 'bg-gradient-to-r from-fuchsia-950/40 via-slate-900/90 to-pink-950/30',
    cardIdleBorder: 'border-fuchsia-500/35 hover:border-fuchsia-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(162,28,175,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(217,70,239,0.6),0_0_24px_rgba(217,70,239,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(217, 70, 239, 0.4)',
    accentText: 'text-fuchsia-300',
  },
  // G - Turquoise Teal
  {
    letter: 'G',
    name: 'Turquoise Teal',
    hexPrimary: '#14b8a6',
    hexSecondary: '#0d9488',
    badgeBg: 'bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(20,184,166,0.45)]',
    badgeBorder: 'border-teal-300/40',
    badgeText: 'text-white font-extrabold',
    cardIdleBg: 'bg-gradient-to-r from-teal-950/40 via-slate-900/90 to-cyan-950/30',
    cardIdleBorder: 'border-teal-500/35 hover:border-teal-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(15,118,110,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(20,184,166,0.6),0_0_24px_rgba(20,184,166,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(20, 184, 166, 0.4)',
    accentText: 'text-teal-300',
  },
  // H - Deep Royal Indigo
  {
    letter: 'H',
    name: 'Royal Indigo',
    hexPrimary: '#6366f1',
    hexSecondary: '#4f46e5',
    badgeBg: 'bg-gradient-to-br from-indigo-400 via-blue-500 to-indigo-600',
    badgeShadow: 'shadow-[0_4px_12px_rgba(99,102,241,0.45)]',
    badgeBorder: 'border-indigo-300/40',
    badgeText: 'text-white font-extrabold',
    cardIdleBg: 'bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-blue-950/30',
    cardIdleBorder: 'border-indigo-500/35 hover:border-indigo-400/80',
    cardIdleShadow: 'shadow-[0_4px_0_rgba(67,56,202,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
    cardIdleHover: 'hover:shadow-[0_4px_0_rgba(99,102,241,0.6),0_0_24px_rgba(99,102,241,0.35)] hover:-translate-y-0.5',
    glowAura: 'rgba(99, 102, 241, 0.4)',
    accentText: 'text-indigo-300',
  },
];

/**
 * Get option theme by index or letter label
 */
export function getOptionTheme(index: number, label?: string): OptionColorTheme {
  if (label && label.length === 1) {
    const charCode = label.toUpperCase().charCodeAt(0);
    const alphaIndex = charCode - 65; // 'A' -> 0, 'B' -> 1, etc.
    if (alphaIndex >= 0 && alphaIndex < OPTION_THEMES.length) {
      return OPTION_THEMES[alphaIndex];
    }
  }
  const safeIndex = Math.abs(index) % OPTION_THEMES.length;
  return OPTION_THEMES[safeIndex];
}

export interface OptionStyleResolution {
  cardClasses: string;
  badgeClasses: string;
  iconType: 'none' | 'correct' | 'incorrect';
}

/**
 * Resolves full 3D Neon interactive CSS classes based on question answer state
 */
export function resolveOption3DStyle({
  index,
  label,
  isAnswered,
  isSelected,
  isCorrect,
}: {
  index: number;
  label?: string;
  isAnswered: boolean;
  isSelected: boolean;
  isCorrect: boolean;
}): OptionStyleResolution {
  const theme = getOptionTheme(index, label);

  // 1. When game is answered
  if (isAnswered) {
    if (isCorrect) {
      return {
        cardClasses:
          'bg-gradient-to-r from-emerald-900/90 via-emerald-800/85 to-teal-900/90 border-emerald-400 text-white font-semibold shadow-[0_4px_0_rgba(6,95,70,1),0_0_30px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400 scale-[1.01]',
        badgeClasses:
          'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black shadow-[0_0_15px_rgba(52,211,153,0.8)] border-emerald-200',
        iconType: 'correct',
      };
    }
    if (isSelected && !isCorrect) {
      return {
        cardClasses:
          'bg-gradient-to-r from-rose-950/95 via-rose-900/85 to-red-950/95 border-rose-500 text-rose-100 font-semibold shadow-[0_4px_0_rgba(159,18,57,1),0_0_25px_rgba(244,63,94,0.6)] ring-2 ring-rose-500 animate-shake',
        badgeClasses:
          'bg-gradient-to-br from-rose-500 to-red-600 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.8)] border-rose-300',
        iconType: 'incorrect',
      };
    }
    // Dimmed unselected other options
    return {
      cardClasses:
        'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-40 shadow-none cursor-not-allowed',
      badgeClasses:
        'bg-slate-800 text-slate-500 border-slate-700 shadow-none',
      iconType: 'none',
    };
  }

  // 2. When currently selected before submit (or single click action)
  if (isSelected) {
    return {
      cardClasses: `${theme.cardIdleBg} border-white/80 text-white shadow-[0_4px_0_rgba(255,255,255,0.4),0_0_25px_${theme.glowAura}] -translate-y-0.5`,
      badgeClasses: `${theme.badgeBg} ${theme.badgeText} ${theme.badgeShadow} border-white scale-110`,
      iconType: 'none',
    };
  }

  // 3. Normal Idle state with 3D depth & vibrant neon hover
  return {
    cardClasses: `${theme.cardIdleBg} ${theme.cardIdleBorder} ${theme.cardIdleShadow} ${theme.cardIdleHover} text-slate-100 active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.5)]`,
    badgeClasses: `${theme.badgeBg} ${theme.badgeText} ${theme.badgeShadow} ${theme.badgeBorder}`,
    iconType: 'none',
  };
}
