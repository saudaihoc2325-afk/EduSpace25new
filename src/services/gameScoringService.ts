import { QuestionItem, StudentAnswerRecord } from '../types';

export interface EvaluationResult {
  isCorrect: boolean;
  scoreGained: number;
  selectedAnswerId: string;
  selectedAnswerText: string;
  correctAnswerId: string;
  correctAnswerText: string;
  explanation?: string | null;
}

export const gameScoringService = {
  /**
   * Deterministic evaluation of multiple choice questions based on correctAnswerId
   */
  evaluateMultipleChoice(
    question: QuestionItem,
    selectedOptionId: string,
    basePoints: number = 10,
    timeRemainingSeconds: number = 0,
    maxTimeSeconds: number = 30,
    enableTimeBonus: boolean = false
  ): EvaluationResult {
    const selectedOpt = question.options.find((o) => o.id === selectedOptionId);
    const correctOpt = question.options.find(
      (o) =>
        o.id === question.correctAnswerId ||
        (question.correctAnswer && o.label?.toUpperCase() === question.correctAnswer.toUpperCase())
    );

    const isCorrect = Boolean(
      (question.correctAnswerId && selectedOptionId === question.correctAnswerId) ||
      (correctOpt && selectedOptionId === correctOpt.id) ||
      (question.correctAnswer && selectedOpt?.label?.toUpperCase() === question.correctAnswer.toUpperCase())
    );

    let scoreGained = 0;
    if (isCorrect) {
      scoreGained = question.points || basePoints;
      if (enableTimeBonus && maxTimeSeconds > 0 && timeRemainingSeconds > 0) {
        const bonus = Math.round((timeRemainingSeconds / maxTimeSeconds) * 50);
        scoreGained += Math.max(0, bonus);
      }
    }

    return {
      isCorrect,
      scoreGained,
      selectedAnswerId: selectedOptionId,
      selectedAnswerText: selectedOpt ? selectedOpt.text : '',
      correctAnswerId: correctOpt ? correctOpt.id : question.correctAnswerId || '',
      correctAnswerText: correctOpt ? correctOpt.text : question.correctAnswerText || '',
      explanation: question.explanation || null,
    };
  },

  /**
   * Evaluates Anagram reconstruction against target word
   */
  evaluateAnagram(
    question: QuestionItem,
    userReconstructedWord: string,
    basePoints: number = 10
  ): EvaluationResult {
    const targetWord = (
      question.correctAnswerText ||
      question.options.find((o) => o.id === question.correctAnswerId)?.text ||
      ''
    )
      .trim()
      .toUpperCase();

    const cleanedUser = userReconstructedWord.trim().toUpperCase();
    const isCorrect = cleanedUser.length > 0 && cleanedUser === targetWord;

    return {
      isCorrect,
      scoreGained: isCorrect ? (question.points || basePoints) : 0,
      selectedAnswerId: userReconstructedWord,
      selectedAnswerText: userReconstructedWord,
      correctAnswerId: question.correctAnswerId || 'anagram_key',
      correctAnswerText: targetWord,
      explanation: question.explanation || null,
    };
  },

  /**
   * Formats time in seconds to mm:ss format
   */
  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  /**
   * Calculates clean percentage rounded to integer (0 - 100)
   */
  calculatePercentage(correctCount: number, totalCount: number): number {
    if (!totalCount || totalCount <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((correctCount / totalCount) * 100)));
  },
};
