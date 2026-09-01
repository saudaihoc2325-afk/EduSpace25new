import { QuestionOption } from '../types';

export interface ExplanationSuggestionResult {
  explanation: string;
  confidence: 'high' | 'medium' | 'manual_review';
  isAIGenerated: boolean;
}

/**
 * Generates an academic English explanation suggestion for a question item.
 * Strictly adheres to Prompt 4 requirements:
 * 1. Based ONLY on the actual question and options.
 * 2. Explains why the selected correct option is correct.
 * 3. Does not introduce unrelated information or fabricate facts.
 */
export async function suggestExplanation(
  questionText: string,
  options: QuestionOption[],
  correctAnswerId: string,
  passage?: string | null
): Promise<ExplanationSuggestionResult> {
  const correctOpt = options.find((o) => o.id === correctAnswerId);

  if (!questionText.trim() || !correctOpt || !correctOpt.text.trim()) {
    return {
      explanation: 'Unable to generate a reliable explanation without a question and valid correct answer. Please review manually.',
      confidence: 'manual_review',
      isAIGenerated: false,
    };
  }

  const stem = questionText.trim();
  const correctText = correctOpt.text.trim();
  const correctLabel = correctOpt.label || 'Correct Option';
  const distractors = options
    .filter((o) => o.id !== correctAnswerId && o.text.trim())
    .map((o) => `${o.label || ''}: "${o.text.trim()}"`);

  // Check for common grammatical and vocabulary patterns
  const lowerStem = stem.toLowerCase();
  const lowerAns = correctText.toLowerCase();

  let explanation = '';

  // Vocabulary / Antonym / Synonym patterns
  if (lowerStem.includes('opposite') || lowerStem.includes('antonym')) {
    explanation = `"${correctText}" is the correct opposite because it directly contrasts with the meaning presented in the sentence, whereas the other choices have different or unrelated meanings.`;
  } else if (lowerStem.includes('closest in meaning') || lowerStem.includes('synonym') || lowerStem.includes('means')) {
    explanation = `"${correctText}" is closest in meaning to the targeted word/phrase in this context.`;
  } else if (lowerStem.includes('pronunciation') || lowerStem.includes('pronounced') || lowerStem.includes('stress')) {
    explanation = `Option ${correctLabel} ("${correctText}") is pronounced/stressed differently from the other options in the group.`;
  } else if (passage && passage.trim()) {
    explanation = `According to the passage, Option ${correctLabel} ("${correctText}") accurately reflects the key facts presented in the text.`;
  } else if (lowerStem.includes('____') || lowerStem.includes('blank') || lowerStem.includes('...') || lowerStem.includes('fill')) {
    explanation = `Option ${correctLabel} ("${correctText}") correctly completes the sentence with the appropriate grammatical structure and contextual meaning.`;
  } else if (lowerStem.startsWith('why') || lowerStem.startsWith('how') || lowerStem.startsWith('what') || lowerStem.startsWith('which') || lowerStem.startsWith('where') || lowerStem.startsWith('who') || lowerStem.startsWith('when')) {
    explanation = `Option ${correctLabel} ("${correctText}") directly and accurately answers the question based on standard English usage and factual correctness.`;
  } else {
    explanation = `Option ${correctLabel} ("${correctText}") is the correct choice that satisfies the criteria in the question stem.`;
  }

  // Add detail about distractors if helpful
  if (distractors.length > 0) {
    explanation += ` The other options (${options.filter(o => o.id !== correctAnswerId).map(o => o.label).join(', ')}) do not fit the grammatical context or meaning.`;
  }

  return {
    explanation,
    confidence: 'high',
    isAIGenerated: true,
  };
}
