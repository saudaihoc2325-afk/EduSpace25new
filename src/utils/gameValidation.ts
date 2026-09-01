import { GameType, QuestionItem } from '../types';

export interface QuestionSuitabilityIssue {
  questionId: string;
  questionNumber: number;
  questionText: string;
  reason: string;
}

export interface GameSuitabilityReport {
  isFullySuitable: boolean;
  totalQuestions: number;
  suitableCount: number;
  unsuitableCount: number;
  issues: QuestionSuitabilityIssue[];
  suggestedAction: 'all_ready' | 'can_exclude_unsuitable' | 'needs_revision';
}

export const gameValidation = {
  /**
   * Validates if a single question is suitable for Anagram game
   */
  isQuestionSuitableForAnagram(q: QuestionItem): { suitable: boolean; reason?: string } {
    const rawAnswer =
      q.correctAnswerText ||
      q.options.find((o) => o.id === q.correctAnswerId)?.text ||
      '';

    const cleaned = rawAnswer.trim();
    if (!cleaned) {
      return { suitable: false, reason: 'Missing correct answer text.' };
    }

    // Check if it's too long (e.g. paragraph or full sentence)
    if (cleaned.length > 25) {
      return {
        suitable: false,
        reason: `Answer is ${cleaned.length} characters long. Anagram is best suited for vocabulary words (2–25 characters).`,
      };
    }

    // Check if it has too many words (e.g., > 3 words)
    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    if (wordCount > 3) {
      return {
        suitable: false,
        reason: 'Answer contains a full sentence instead of a vocabulary word or short phrase.',
      };
    }

    // Check if letters exist (not just numbers or symbols)
    const hasLetters = /[a-zA-Z]/.test(cleaned);
    if (!hasLetters) {
      return { suitable: false, reason: 'Answer does not contain valid alphabetic letters.' };
    }

    return { suitable: true };
  },

  /**
   * Validates if a single question is suitable for Complete the Sentence game
   */
  isQuestionSuitableForCompleteSentence(q: QuestionItem): { suitable: boolean; reason?: string } {
    if (!q.question || q.question.trim().length === 0) {
      return { suitable: false, reason: 'Question stem is empty.' };
    }
    if (!q.options || q.options.length < 2) {
      return { suitable: false, reason: 'Must have at least 2 answer choices.' };
    }
    return { suitable: true };
  },

  /**
   * Validates if a single question is suitable for Match Up game
   */
  isQuestionSuitableForMatchUp(q: QuestionItem): { suitable: boolean; reason?: string } {
    const rawAnswer =
      q.correctAnswerText ||
      q.options.find((o) => o.id === q.correctAnswerId)?.text ||
      '';

    if (!q.question || q.question.trim().length === 0) {
      return { suitable: false, reason: 'Question stem is empty.' };
    }
    if (!rawAnswer.trim()) {
      return { suitable: false, reason: 'No correct answer specified for pairing.' };
    }
    return { suitable: true };
  },

  /**
   * Comprehensive validation report for a Question Set across any Game Type
   */
  validateQuestionSetForGame(questions: QuestionItem[], gameType: GameType): GameSuitabilityReport {
    const issues: QuestionSuitabilityIssue[] = [];

    questions.forEach((q, idx) => {
      let check = { suitable: true, reason: '' };

      if (gameType === 'anagram') {
        check = this.isQuestionSuitableForAnagram(q);
      } else if (gameType === 'match_up') {
        check = this.isQuestionSuitableForMatchUp(q);
      } else if (gameType === 'complete_sentence') {
        check = this.isQuestionSuitableForCompleteSentence(q);
      } else {
        // Quiz, Random Wheel, Open Box, Gameshow Quiz
        if (!q.question.trim()) {
          check = { suitable: false, reason: 'Question prompt is empty.' };
        } else if (!q.options || q.options.length < 2) {
          check = { suitable: false, reason: 'Requires at least 2 options.' };
        } else if (!q.correctAnswerId && !q.correctAnswer) {
          check = { suitable: false, reason: 'No correct answer identified.' };
        }
      }

      if (!check.suitable) {
        issues.push({
          questionId: q.id,
          questionNumber: idx + 1,
          questionText: q.question || 'Untitled Question',
          reason: check.reason || 'Not suitable for this game type.',
        });
      }
    });

    const totalQuestions = questions.length;
    const unsuitableCount = issues.length;
    const suitableCount = totalQuestions - unsuitableCount;
    const isFullySuitable = unsuitableCount === 0;

    let suggestedAction: 'all_ready' | 'can_exclude_unsuitable' | 'needs_revision' = 'all_ready';
    if (!isFullySuitable) {
      suggestedAction = suitableCount >= 3 ? 'can_exclude_unsuitable' : 'needs_revision';
    }

    return {
      isFullySuitable,
      totalQuestions,
      suitableCount,
      unsuitableCount,
      issues,
      suggestedAction,
    };
  },
};
