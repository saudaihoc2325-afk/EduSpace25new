/**
 * Text Parser wrapper for EduSpace25
 * Delegates to the unified and optimized parseQuestionsFromText in src/services/fileParser.ts
 */

export { parseQuestionsFromText, parseRawTextToQuestions } from '../fileParser';
export type { ParseOptions } from '../fileParser';
