import { GameTypeMeta } from '../types';

export const ORG_NAME = 'ENGLISH GROUP';
export const APP_NAME = 'EduSpace25';

export const GAME_TYPES: GameTypeMeta[] = [
  {
    type: 'quiz',
    label: 'Quiz',
    description: 'Classic multiple-choice test with timer, instant feedback, and scoring.',
    iconName: 'HelpCircle',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    isReady: true,
  },
  {
    type: 'match_up',
    label: 'Match Up',
    description: 'Connect vocabulary terms with English definitions or correct answers.',
    iconName: 'Shuffle',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    isReady: true,
  },
  {
    type: 'random_wheel',
    label: 'Random Wheel',
    description: 'Spinning picker wheel for random student calls, speaking prompts, or questions.',
    iconName: 'Disc',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    isReady: true,
  },
  {
    type: 'open_box',
    label: 'Open the Box',
    description: 'Interactive numbered mystery boxes concealing grammar and vocabulary tasks.',
    iconName: 'Package',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    isReady: true,
  },
  {
    type: 'anagram',
    label: 'Anagram',
    description: 'Unscramble letters to spell English keywords, idioms, or vocabulary terms.',
    iconName: 'KeyRound',
    badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
    isReady: true,
  },
  {
    type: 'gameshow_quiz',
    label: 'Gameshow Quiz',
    description: 'High-energy studio buzzer format with time-bonus multipliers and lifelines.',
    iconName: 'Trophy',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    isReady: true,
  },
  {
    type: 'complete_sentence',
    label: 'Complete the Sentence',
    description: 'Fill in the blanks with target tenses, prepositions, or collocations.',
    iconName: 'FileText',
    badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    isReady: true,
  },
];

export const FOLDER_COLORS = [
  '#4f46e5', // Indigo
  '#059669', // Emerald
  '#d97706', // Amber
  '#9333ea', // Purple
  '#e11d48', // Rose
  '#0284c7', // Sky
  '#475569', // Slate
];
