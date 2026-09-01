/**
 * Excel (.xlsx, .xls) and CSV (.csv) Importer for EduSpace25
 * 
 * Supports:
 * - Standard structure: Question | A | B | C | D | Answer | Explanation | Unit | Lesson | Level
 * - Case-insensitive header matching (Question / question / QUESTION)
 * - Custom column mapping support
 * - Multiple sheets selection
 * - Comprehensive anti-error validation
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ExcelColumnMapping, ImportedQuestionItem } from '../../types';
import { generateOptionId, generateStableId, validateQuestionItem } from './validator';

export interface ExcelParseResult {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rows: Record<string, any>[];
  detectedMapping: ExcelColumnMapping;
  questions: ImportedQuestionItem[];
  hasValidMapping: boolean;
}

export function autoDetectColumnMapping(headers: string[]): {
  mapping: ExcelColumnMapping;
  confidence: boolean;
} {
  const findCol = (patterns: (string | RegExp)[]): string => {
    for (const pattern of patterns) {
      for (const h of headers) {
        const clean = h.trim().toLowerCase();
        if (typeof pattern === 'string') {
          if (clean === pattern.toLowerCase()) return h;
        } else if (pattern.test(clean)) {
          return h;
        }
      }
    }
    return '';
  };

  const questionCol = findCol([
    'question',
    'câu hỏi',
    'nội dung',
    'question text',
    'content',
    'item',
    'prompt',
    /question/i,
  ]);
  const optionACol = findCol(['a', 'option a', 'lựa chọn a', 'opt_a', 'choice a', /^(a|opt a|choice a)$/i]);
  const optionBCol = findCol(['b', 'option b', 'lựa chọn b', 'opt_b', 'choice b', /^(b|opt b|choice b)$/i]);
  const optionCCol = findCol(['c', 'option c', 'lựa chọn c', 'opt_c', 'choice c', /^(c|opt c|choice c)$/i]);
  const optionDCol = findCol(['d', 'option d', 'lựa chọn d', 'opt_d', 'choice d', /^(d|opt d|choice d)$/i]);
  const answerCol = findCol([
    'answer',
    'correct answer',
    'key',
    'đáp án',
    'correct',
    'ans',
    /^(answer|key|correct answer|correct)$/i,
  ]);
  const explanationCol = findCol([
    'explanation',
    'explain',
    'giải thích',
    'reason',
    'note',
    'hướng dẫn',
    /explanation|explain|reason/i,
  ]);
  const passageCol = findCol(['passage', 'đoạn văn', 'reading', 'reading passage', /passage/i]);
  const unitCol = findCol(['unit', 'bài', 'chủ đề', 'topic', /unit|topic/i]);
  const lessonCol = findCol(['lesson', 'tiết', 'bài học', /lesson/i]);
  const levelCol = findCol(['level', 'độ khó', 'mức độ', 'difficulty', /level|difficulty/i]);

  const mapping: ExcelColumnMapping = {
    questionCol: questionCol || headers[0] || '',
    optionACol: optionACol || headers[1] || '',
    optionBCol: optionBCol || headers[2] || '',
    optionCCol: optionCCol || headers[3] || '',
    optionDCol: optionDCol || headers[4] || '',
    answerCol: answerCol || headers[5] || '',
    explanationCol: explanationCol || headers[6] || '',
    passageCol,
    unitCol,
    lessonCol,
    levelCol,
  };

  const confidence = Boolean(questionCol && (optionACol || answerCol));
  return { mapping, confidence };
}

export async function parseExcelOrCsvFile(
  file: File | ArrayBuffer,
  fileName: string = 'data.xlsx',
  ownerId?: string,
  customMapping?: ExcelColumnMapping,
  sheetName?: string
): Promise<ExcelParseResult> {
  const isCsv = fileName.toLowerCase().endsWith('.csv');
  let sheetNames: string[] = ['Sheet1'];
  let selectedSheet = 'Sheet1';
  let rawData: Record<string, any>[] = [];
  let headers: string[] = [];

  if (isCsv) {
    const textContent = file instanceof File ? await file.text() : new TextDecoder().decode(file);
    const parsedCsv = Papa.parse<Record<string, any>>(textContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    rawData = parsedCsv.data.filter((row) => Object.values(row).some((v) => v !== null && v !== ''));
    headers = parsedCsv.meta.fields || (rawData.length > 0 ? Object.keys(rawData[0]) : []);
  } else {
    const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    sheetNames = workbook.SheetNames;
    selectedSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];

    const worksheet = workbook.Sheets[selectedSheet];
    rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      blankrows: false,
    });

    if (rawData.length > 0) {
      headers = Object.keys(rawData[0]);
    }
  }

  const { mapping: autoMapping, confidence } = autoDetectColumnMapping(headers);
  const activeMapping = customMapping || autoMapping;

  const questions: ImportedQuestionItem[] = [];

  rawData.forEach((row, idx) => {
    const qText = activeMapping.questionCol ? String(row[activeMapping.questionCol] || '').trim() : '';
    const optA = activeMapping.optionACol ? String(row[activeMapping.optionACol] || '').trim() : '';
    const optB = activeMapping.optionBCol ? String(row[activeMapping.optionBCol] || '').trim() : '';
    const optC = activeMapping.optionCCol ? String(row[activeMapping.optionCCol] || '').trim() : '';
    const optD = activeMapping.optionDCol ? String(row[activeMapping.optionDCol] || '').trim() : '';
    const ansText = activeMapping.answerCol ? String(row[activeMapping.answerCol] || '').trim() : '';
    const expText = activeMapping.explanationCol ? String(row[activeMapping.explanationCol] || '').trim() : '';
    const passageText = activeMapping.passageCol ? String(row[activeMapping.passageCol] || '').trim() : '';
    const unitText = activeMapping.unitCol ? String(row[activeMapping.unitCol] || '').trim() : '';
    const lessonText = activeMapping.lessonCol ? String(row[activeMapping.lessonCol] || '').trim() : '';
    const levelText = activeMapping.levelCol ? String(row[activeMapping.levelCol] || '').trim() : 'Medium';

    if (!qText && !optA && !ansText) return;

    const options = [
      { id: generateOptionId('A', 0), label: 'A', text: optA },
      { id: generateOptionId('B', 1), label: 'B', text: optB },
      { id: generateOptionId('C', 2), label: 'C', text: optC },
      { id: generateOptionId('D', 3), label: 'D', text: optD },
    ].filter((o) => Boolean(o.text));

    const itemCandidate: Partial<ImportedQuestionItem> = {
      id: generateStableId('q'),
      ownerId: ownerId || 'teacher_default',
      question: qText,
      options,
      correctAnswer: ansText,
      explanation: expText || null,
      passage: passageText || null,
      unit: unitText,
      lesson: lessonText,
      level: levelText,
      order: questions.length + 1,
      sourceFileName: fileName,
      sourceFileType: isCsv ? 'csv' : 'xlsx',
      originalRawNumber: idx + 1,
    };

    const validated = validateQuestionItem(itemCandidate, questions.length, questions);
    questions.push(validated);
  });

  return {
    sheetNames,
    selectedSheet,
    headers,
    rows: rawData,
    detectedMapping: activeMapping,
    questions,
    hasValidMapping: confidence,
  };
}
