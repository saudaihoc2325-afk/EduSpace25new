import React, { useMemo } from 'react';
import { GameType, QuestionItem, GameSettings, StudentAnswerRecord } from '../../types';
import { QuizGame } from './QuizGame';
import { MatchUpGame } from './MatchUpGame';
import { RandomWheelGame } from './RandomWheelGame';
import { OpenTheBoxGame } from './OpenTheBoxGame';
import { AnagramGame } from './AnagramGame';
import { GameshowQuizGame } from './GameshowQuizGame';
import { CompleteSentenceGame } from './CompleteSentenceGame';

interface GameSessionRunnerProps {
  gameType: GameType;
  title: string;
  questions: QuestionItem[];
  settings?: GameSettings;
  selectedQuestionIds?: string[];
  onFinish?: (data: {
    score: number;
    totalQuestions: number;
    correctCount: number;
    timeSpentSeconds: number;
    answers: StudentAnswerRecord[];
  }) => void;
  onExit?: () => void;
  isPreview?: boolean;
}

export const GameSessionRunner: React.FC<GameSessionRunnerProps> = ({
  gameType,
  title,
  questions: rawQuestions,
  settings: initialSettings,
  selectedQuestionIds,
  onFinish,
  onExit,
  isPreview = false,
}) => {
  const settings: GameSettings = initialSettings || {};
  // Filter and prepare questions according to settings without modifying master question set!
  const activeQuestions = useMemo(() => {
    let list = [...rawQuestions];

    // If explicit question IDs are selected
    if (selectedQuestionIds && selectedQuestionIds.length > 0) {
      list = list.filter((q) => selectedQuestionIds.includes(q.id));
    }

    // If question count is limited (e.g. 10, 20, 25, 30, 40)
    if (settings.questionCount && typeof settings.questionCount === 'number' && settings.questionCount > 0) {
      list = list.slice(0, settings.questionCount);
    }

    return list;
  }, [rawQuestions, selectedQuestionIds, settings.questionCount]);

  if (!activeQuestions || activeQuestions.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-300 space-y-4 max-w-md mx-auto">
        <p className="text-sm">No valid questions available to play this game.</p>
        {onExit && (
          <button
            onClick={onExit}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Exit Game
          </button>
        )}
      </div>
    );
  }

  switch (gameType) {
    case 'quiz':
      return (
        <QuizGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
    case 'match_up':
      return (
        <MatchUpGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
    case 'random_wheel':
      return (
        <RandomWheelGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
    case 'open_box':
      return (
        <OpenTheBoxGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
    case 'anagram':
      return (
        <AnagramGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
    case 'gameshow_quiz':
      return (
        <GameshowQuizGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
    case 'complete_sentence':
      return (
        <CompleteSentenceGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
    default:
      return (
        <QuizGame
          title={title}
          questions={activeQuestions}
          settings={settings}
          onFinish={onFinish}
          onExit={onExit}
          isPreview={isPreview}
        />
      );
  }
};
