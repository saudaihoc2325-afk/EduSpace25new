import { QuestionItem, QuestionOption, ValidationStatus } from '../types';

export interface QuestionValidationResult {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  allIssues: string[];
  isDuplicateOption: boolean;
  duplicateDetails?: string[];
  isAnswerValid: boolean;
}

export interface SetValidationSummary {
  total: number;
  valid: number;
  reviewRequired: number;
  errors: number;
  canCreateGameSafely: boolean;
  hasBlockingErrors: boolean;
  questionResults: {
    questionIndex: number;
    questionId: string;
    questionNumber: number;
    questionTitle: string;
    result: QuestionValidationResult;
  }[];
}

/**
 * Validates an individual QuestionItem according to PROMPT 4 rules:
 * 1. Question text is not empty.
 * 2. Option A is not empty.
 * 3. Option B is not empty.
 * 4. Option C is not empty.
 * 5. Option D is not empty.
 * 6. Exactly one correct answer exists.
 * 7. correctAnswerId matches an existing optionId.
 * 8. correctAnswerText matches the selected option.
 * 9. Duplicate option detection (flags "Possible duplicate options").
 */
export function validateQuestion(q: QuestionItem): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Question Text Check
  const trimmedQuestion = (q.question || '').trim();
  if (!trimmedQuestion) {
    errors.push('Question text is empty.');
  }

  // 2-5. Options Checks
  const options = q.options || [];
  const labels = ['A', 'B', 'C', 'D'];

  if (options.length < 4) {
    errors.push(`Expected 4 options (A, B, C, D), but found ${options.length}.`);
  }

  labels.forEach((label, idx) => {
    const opt = options[idx] || options.find((o) => o.label === label);
    if (!opt || !opt.text || !opt.text.trim()) {
      errors.push(`Option ${label} is empty.`);
    }
  });

  // 6-8. Correct Answer Integrity Check
  const hasAnswerId = !!q.correctAnswerId && q.correctAnswerId.trim() !== '';
  const matchingOption = options.find((o) => o.id === q.correctAnswerId);

  let isAnswerValid = false;

  if (!hasAnswerId) {
    errors.push('No correct answer is selected.');
  } else if (!matchingOption) {
    errors.push('Selected correct answer ID does not match any existing option.');
  } else if (!matchingOption.text || !matchingOption.text.trim()) {
    errors.push(`Selected correct answer (${matchingOption.label || 'Option'}) has empty text.`);
  } else {
    isAnswerValid = true;
    // Check text agreement
    if (q.correctAnswerText && matchingOption.text.trim() !== q.correctAnswerText.trim()) {
      warnings.push(`Correct answer text out of sync with selected option text.`);
    }
  }

  // 9. Duplicate Option Detection
  let isDuplicateOption = false;
  const duplicateDetails: string[] = [];
  const seenTexts = new Map<string, string>(); // text -> label

  options.forEach((opt, idx) => {
    const textNorm = (opt.text || '').trim().toLowerCase();
    const label = opt.label || String.fromCharCode(65 + idx);
    if (textNorm) {
      if (seenTexts.has(textNorm)) {
        isDuplicateOption = true;
        const prevLabel = seenTexts.get(textNorm);
        duplicateDetails.push(`Option ${label} is identical to Option ${prevLabel} ("${opt.text.trim()}")`);
      } else {
        seenTexts.set(textNorm, label);
      }
    }
  });

  if (isDuplicateOption) {
    warnings.push(`Possible duplicate options: ${duplicateDetails.join(', ')}`);
  }

  // Overall Status Resolution
  let status: ValidationStatus = 'VALID';
  if (errors.length > 0) {
    status = 'ERROR';
  } else if (warnings.length > 0) {
    status = 'REVIEW_REQUIRED';
  }

  return {
    status,
    errors,
    warnings,
    allIssues: [...errors, ...warnings],
    isDuplicateOption,
    duplicateDetails,
    isAnswerValid,
  };
}

/**
 * Validates an entire Question Set collection and produces a detailed report
 */
export function validateQuestionSet(questions: QuestionItem[]): SetValidationSummary {
  let validCount = 0;
  let reviewCount = 0;
  let errorCount = 0;

  const questionResults = questions.map((q, idx) => {
    const result = validateQuestion(q);
    if (result.status === 'VALID') validCount++;
    else if (result.status === 'REVIEW_REQUIRED') reviewCount++;
    else errorCount++;

    return {
      questionIndex: idx,
      questionId: q.id,
      questionNumber: q.order || idx + 1,
      questionTitle: (q.question || '').slice(0, 60) || `Question ${idx + 1}`,
      result,
    };
  });

  const hasBlockingErrors = errorCount > 0 || questions.length === 0;
  const canCreateGameSafely = errorCount === 0 && questions.length > 0;

  return {
    total: questions.length,
    valid: validCount,
    reviewRequired: reviewCount,
    errors: errorCount,
    canCreateGameSafely,
    hasBlockingErrors,
    questionResults,
  };
}

/**
 * Synchronizes and repairs a question's correctAnswer fields to ensure absolute consistency:
 * - Ensures every option has a valid stable ID.
 * - Ensures correctAnswerId points to an existing option.
 * - Updates correctAnswerText to match the chosen option's text.
 * - Updates correctAnswer label alias.
 */
export function synchronizeQuestionAnswer(
  q: Partial<QuestionItem>,
  selectedOptionId?: string
): QuestionItem {
  const options: QuestionOption[] = (q.options || []).map((opt, idx) => ({
    id: opt.id || `opt_${String.fromCharCode(97 + idx)}_${Math.random().toString(36).substring(2, 7)}`,
    label: opt.label || String.fromCharCode(65 + idx),
    text: opt.text || '',
  }));

  // Target option ID
  const targetId = selectedOptionId || q.correctAnswerId || options[0]?.id || '';
  const chosenOpt = options.find((o) => o.id === targetId);

  const cleanQuestion: QuestionItem = {
    id: q.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    questionSetId: q.questionSetId,
    ownerId: q.ownerId,
    question: (q.question || '').trim(),
    options,
    correctAnswerId: chosenOpt ? chosenOpt.id : targetId,
    correctAnswerText: chosenOpt ? chosenOpt.text : (q.correctAnswerText || ''),
    correctAnswer: chosenOpt ? (chosenOpt.label || chosenOpt.text) : '',
    explanation: q.explanation && q.explanation.trim() ? q.explanation.trim() : null,
    passage: q.passage && q.passage.trim() ? q.passage.trim() : null,
    unit: q.unit || '',
    lesson: q.lesson || '',
    level: q.level || 'Medium',
    questionType: q.questionType || 'Multiple Choice',
    sourceFileName: q.sourceFileName || '',
    sourceFileType: q.sourceFileType || 'manual',
    importedAt: q.importedAt || new Date().toISOString(),
    order: q.order || 1,
    points: q.points || 10,
    timeLimitSeconds: q.timeLimitSeconds || 30,
  };

  return cleanQuestion;
}
