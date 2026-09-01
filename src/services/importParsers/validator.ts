/**
 * Validator & Anti-Error Integrity Checker for EduSpace25 Question Import
 * 
 * Strict Academic Preservation Rules:
 * - Never invent questions, answers, explanations, or options
 * - Never rewrite or paraphrase
 * - Validate option existence, correct answer matching, blanks, order, and duplicates
 * - Categorize strictly into VALID, REVIEW_REQUIRED, or ERROR
 */

import { ImportedQuestionItem, QuestionOption, ValidationStatus } from '../../types';

export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateStableId(prefix: string = 'q'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateOptionId(label: string, index: number): string {
  const cleanLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `opt_${cleanLabel || index}_${Math.random().toString(36).substring(2, 7)}`;
}

export interface ValidationReport {
  totalDetected: number;
  validCount: number;
  reviewRequiredCount: number;
  errorCount: number;
  missingAnswersCount: number;
  missingOptionsCount: number;
  duplicateCount: number;
  issuesSummary: Array<{
    questionOrder: number;
    questionText: string;
    status: ValidationStatus;
    issues: string[];
  }>;
}

export function validateQuestionItem(
  item: Partial<ImportedQuestionItem>,
  index: number,
  allQuestions: Partial<ImportedQuestionItem>[] = []
): ImportedQuestionItem {
  const issues: string[] = [];
  let status: ValidationStatus = 'VALID';

  const questionText = (item.question || '').trim();
  const options = (item.options || []).map((opt, optIdx) => {
    const label = opt.label || String.fromCharCode(65 + optIdx);
    return {
      id: opt.id || generateOptionId(label, optIdx),
      label,
      text: (opt.text || '').trim(),
      isCorrect: false,
    };
  });

  // 1. Question Text Check
  if (!questionText) {
    issues.push('Question text is empty.');
    status = 'ERROR';
  }

  // 2. Options Check
  if (options.length === 0) {
    issues.push('No answer options were detected.');
    status = 'ERROR';
  } else if (options.length < 2) {
    issues.push(`Only ${options.length} option detected (minimum 2 required).`);
    status = 'REVIEW_REQUIRED';
  }

  // Check for empty option texts
  options.forEach((opt) => {
    if (!opt.text) {
      issues.push(`Option ${opt.label} has empty text.`);
      if (status !== 'ERROR') status = 'REVIEW_REQUIRED';
    }
  });

  // 3. Correct Answer Matching
  let resolvedCorrectAnswerId = item.correctAnswerId;
  let resolvedCorrectAnswerText = item.correctAnswerText || '';
  const rawAnswer = (item.correctAnswer || '').trim();

  if (!rawAnswer && !resolvedCorrectAnswerId) {
    issues.push('Correct answer is missing from the uploaded file.');
    if (status !== 'ERROR') status = 'REVIEW_REQUIRED';
  } else {
    // Attempt match by Option ID
    const matchById = options.find((o) => o.id === resolvedCorrectAnswerId);
    if (matchById) {
      matchById.isCorrect = true;
      resolvedCorrectAnswerText = matchById.text;
    } else {
      // Attempt match by Option Label (e.g., 'A', 'B', 'C', 'D', '(A)', 'A.')
      const normalizedRawAnswer = rawAnswer.replace(/[().:\s]/g, '').toUpperCase();
      const matchByLabel = options.find((o) => (o.label || '').toUpperCase() === normalizedRawAnswer);

      if (matchByLabel) {
        resolvedCorrectAnswerId = matchByLabel.id;
        resolvedCorrectAnswerText = matchByLabel.text;
        matchByLabel.isCorrect = true;
      } else {
        // Attempt match by exact Option Text
        const textMatches = options.filter(
          (o) => o.text.toLowerCase().trim() === rawAnswer.toLowerCase().trim()
        );

        if (textMatches.length === 1) {
          resolvedCorrectAnswerId = textMatches[0].id;
          resolvedCorrectAnswerText = textMatches[0].text;
          textMatches[0].isCorrect = true;
        } else if (textMatches.length > 1) {
          issues.push(`Multiple options match the answer text "${rawAnswer}".`);
          if (status !== 'ERROR') status = 'REVIEW_REQUIRED';
        } else {
          issues.push(`Answer "${rawAnswer}" does not match any available option (A, B, C, D).`);
          if (status !== 'ERROR') status = 'REVIEW_REQUIRED';
        }
      }
    }
  }

  // 4. Duplicate Question Check
  let isDuplicate = false;
  if (questionText) {
    const normalized = normalizeQuestionText(questionText);
    const existingIndex = allQuestions.findIndex(
      (q, qIdx) => qIdx !== index && normalizeQuestionText(q.question || '') === normalized
    );

    if (existingIndex !== -1) {
      isDuplicate = true;
      issues.push(`Possible duplicate of Question #${existingIndex + 1}.`);
      if (status === 'VALID') {
        status = 'REVIEW_REQUIRED';
      }
    }
  }

  // 5. Gap Filling and Sentence Order Handling
  let questionType = item.questionType || 'multiple_choice';
  if (questionText.includes('_______') || questionText.includes('____') || questionText.includes('.....')) {
    questionType = 'gap_fill';
  } else if (/^[a-e]\.\s/im.test(questionText) || questionText.toLowerCase().includes('order the sentences')) {
    questionType = 'ordering';
  }

  const validatedItem: ImportedQuestionItem = {
    id: item.id || generateStableId('q'),
    questionSetId: item.questionSetId,
    ownerId: item.ownerId,
    question: questionText,
    options,
    correctAnswerId: resolvedCorrectAnswerId,
    correctAnswerText: resolvedCorrectAnswerText,
    correctAnswer: rawAnswer || (options.find((o) => o.id === resolvedCorrectAnswerId)?.label || ''),
    explanation: item.explanation ? item.explanation.trim() : null,
    passage: item.passage ? item.passage.trim() : null,
    unit: item.unit ? item.unit.trim() : '',
    lesson: item.lesson ? item.lesson.trim() : '',
    level: item.level ? item.level.trim() : 'Medium',
    questionType,
    sourceFileName: item.sourceFileName,
    sourceFileType: item.sourceFileType,
    importedAt: item.importedAt || new Date().toISOString(),
    order: item.order || index + 1,
    points: item.points || 10,
    timeLimitSeconds: item.timeLimitSeconds || 30,
    validationStatus: status,
    validationIssues: issues,
    isDuplicate,
    selectedForImport: status === 'VALID',
    originalRawNumber: item.originalRawNumber || index + 1,
  };

  return validatedItem;
}

export function generateValidationReport(questions: ImportedQuestionItem[]): ValidationReport {
  let validCount = 0;
  let reviewRequiredCount = 0;
  let errorCount = 0;
  let missingAnswersCount = 0;
  let missingOptionsCount = 0;
  let duplicateCount = 0;

  const issuesSummary: ValidationReport['issuesSummary'] = [];

  questions.forEach((q, idx) => {
    if (q.validationStatus === 'VALID') validCount++;
    if (q.validationStatus === 'REVIEW_REQUIRED') reviewRequiredCount++;
    if (q.validationStatus === 'ERROR') errorCount++;

    if (!q.correctAnswerId) missingAnswersCount++;
    if (!q.options || q.options.length < 2) missingOptionsCount++;
    if (q.isDuplicate) duplicateCount++;

    if (q.validationIssues.length > 0) {
      issuesSummary.push({
        questionOrder: idx + 1,
        questionText: q.question,
        status: q.validationStatus,
        issues: q.validationIssues,
      });
    }
  });

  return {
    totalDetected: questions.length,
    validCount,
    reviewRequiredCount,
    errorCount,
    missingAnswersCount,
    missingOptionsCount,
    duplicateCount,
    issuesSummary,
  };
}
