import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  Packer,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  ShadingType,
  UnderlineType,
} from 'docx';
import { QuestionItem, QuestionOption, QuestionSet, Activity, Assignment } from '../types';
import { APP_NAME, ORG_NAME } from '../constants/gameTypes';

export interface DocxExportOptions {
  title: string;
  subtitle?: string;
  schoolName?: string;
  teacherName?: string;
  subject?: string;
  gradeLevel?: string;
  targetClass?: string;
  timeLimitMinutes?: number;
  instructions?: string;
  testCode?: string; // e.g. "101", "102"
  
  // Content Options
  selectedQuestionIds?: string[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  includePassages?: boolean;
  includeStudentHeader?: boolean;
  includeScoreBox?: boolean;
  
  // Format Options
  mode: 'worksheet' | 'answer_key' | 'combined';
  answerKeyFormat?: 'matrix_only' | 'detailed_only' | 'both';
  includeExplanations?: boolean;
  includePoints?: boolean;
  fontFamily?: string;
  fontSizePt?: number;
  language?: 'vi' | 'en';
}

export interface PreparedQuestion {
  originalIndex: number;
  displayNumber: number;
  questionId: string;
  questionText: string;
  passage?: string | null;
  options: {
    letter: string; // "A", "B", "C", "D"
    text: string;
    isCorrect: boolean;
  }[];
  correctLetter: string;
  correctText: string;
  explanation?: string | null;
  points?: number;
  level?: string;
}

/**
 * Shuffles an array using Fisher-Yates algorithm with deterministic or random seed
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Prepares and maps questions according to shuffle and selection options
 */
export function prepareQuestionsForExport(
  rawQuestions: QuestionItem[],
  options: {
    selectedQuestionIds?: string[];
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  }
): PreparedQuestion[] {
  if (!rawQuestions || rawQuestions.length === 0) return [];

  // 1. Filter by selected IDs if specified
  let workingList = [...rawQuestions];
  if (options.selectedQuestionIds && options.selectedQuestionIds.length > 0) {
    const idSet = new Set(options.selectedQuestionIds);
    workingList = workingList.filter((q) => idSet.has(q.id));
  }

  // 2. Shuffle Questions if requested
  if (options.shuffleQuestions) {
    workingList = shuffleArray(workingList);
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  // 3. Process each question and shuffle options if requested
  return workingList.map((q, qIndex) => {
    let rawOpts = (q.options || []).filter((opt) => opt && opt.text !== undefined);
    
    // If no options exist, create standard fallback or extract
    if (rawOpts.length === 0 && q.correctAnswer) {
      rawOpts = [{ id: 'opt_1', text: q.correctAnswer, isCorrect: true }];
    }

    // Determine correct option identification
    const correctId = q.correctAnswerId;
    const correctRawText = (q.correctAnswerText || q.correctAnswer || '').trim().toLowerCase();

    // Map each raw option to an object with isCorrect flag
    let normalizedOpts = rawOpts.map((opt) => {
      const isMatchById = !!(correctId && opt.id === correctId);
      const isMatchByText =
        !correctId && correctRawText ? opt.text.trim().toLowerCase() === correctRawText : false;
      const isMatchByProp = !!opt.isCorrect;

      return {
        id: opt.id,
        text: opt.text.trim(),
        isCorrect: isMatchById || isMatchByText || isMatchByProp,
      };
    });

    // If none flagged as correct, try marking the first one or matching letter
    if (!normalizedOpts.some((o) => o.isCorrect) && normalizedOpts.length > 0) {
      if (q.correctAnswer && ['A', 'B', 'C', 'D'].includes(q.correctAnswer.toUpperCase())) {
        const idx = ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer.toUpperCase());
        if (normalizedOpts[idx]) normalizedOpts[idx].isCorrect = true;
      } else {
        normalizedOpts[0].isCorrect = true;
      }
    }

    // Shuffle options if requested
    if (options.shuffleOptions && normalizedOpts.length > 1) {
      normalizedOpts = shuffleArray(normalizedOpts);
    }

    // Assign letters A, B, C, D
    const formattedOptions = normalizedOpts.map((opt, oIdx) => ({
      letter: optionLetters[oIdx] || `${oIdx + 1}`,
      text: opt.text,
      isCorrect: opt.isCorrect,
    }));

    const correctOpt = formattedOptions.find((o) => o.isCorrect) || formattedOptions[0];

    return {
      originalIndex: q.order || qIndex + 1,
      displayNumber: qIndex + 1,
      questionId: q.id,
      questionText: (q.question || '').trim(),
      passage: q.passage || null,
      options: formattedOptions,
      correctLetter: correctOpt ? correctOpt.letter : 'A',
      correctText: correctOpt ? correctOpt.text : '',
      explanation: q.explanation || null,
      points: q.points || 1,
      level: q.level || undefined,
    };
  });
}

/**
 * Creates the official School & Department Header Paragraphs/Table
 */
function createHeaderTable(options: DocxExportOptions): Table {
  const schoolName = options.schoolName || 'SỞ GD&ĐT • TRƯỜNG THPT .................................';
  const orgTitle = options.teacherName || `${ORG_NAME} (TỔ TIẾNG ANH)`;
  const subject = options.subject || 'MÔN: TIẾNG ANH (ENGLISH)';
  const testTitle = options.title || 'PHIẾU BÀI TẬP / ĐỀ KIỂM TRA ĐỊNH KỲ';
  const testCode = options.testCode ? `Mã đề thi: ${options.testCode}` : 'Mã đề: 101';
  const timeLimit = options.timeLimitMinutes ? `Thời gian làm bài: ${options.timeLimitMinutes} phút` : 'Thời gian làm bài: 45 phút';

  const font = options.fontFamily || 'Times New Roman';

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: schoolName.toUpperCase(),
                    font,
                    size: 19, // ~9.5pt
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: orgTitle.toUpperCase(),
                    font,
                    size: 20, // 10pt
                    bold: true,
                    underline: { type: UnderlineType.SINGLE },
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: testTitle.toUpperCase(),
                    font,
                    size: 22, // 11pt
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: subject.toUpperCase(),
                    font,
                    size: 20,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${timeLimit} (Không kể thời gian phát đề)`,
                    font,
                    size: 18,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates Student Information & Grading Table
 */
function createStudentInfoTable(options: DocxExportOptions): Table {
  const font = options.fontFamily || 'Times New Roman';
  const targetClass = options.targetClass && options.targetClass !== 'all' ? options.targetClass : '................';
  const testCode = options.testCode || '101';

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: 'Họ và tên học sinh: ', font, size: 21, bold: true }),
                  new TextRun({ text: '................................................................................', font, size: 21 }),
                ],
              }),
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: 'Lớp: ', font, size: 21, bold: true }),
                  new TextRun({ text: `${targetClass}       `, font, size: 21 }),
                  new TextRun({ text: 'Số báo danh (SBD): ', font, size: 21, bold: true }),
                  new TextRun({ text: '.....................       ', font, size: 21 }),
                  new TextRun({ text: 'Phòng thi: ', font, size: 21, bold: true }),
                  new TextRun({ text: '.........', font, size: 21 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: 'F4F6F8', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({ text: 'MÃ ĐỀ THI', font, size: 20, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 80 },
                children: [
                  new TextRun({ text: testCode, font, size: 32, bold: true, color: '1A365D' }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({ text: 'ĐIỂM SỐ', font, size: 20, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 60 },
                children: [
                  new TextRun({ text: '............ / 10', font, size: 24, bold: true }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({ text: 'NHẬN XÉT CỦA GIÁO VIÊN: ', font, size: 19, bold: true }),
                ],
              }),
              new Paragraph({
                spacing: { before: 40, after: 60 },
                children: [
                  new TextRun({
                    text: '....................................................................................................................................',
                    font,
                    size: 19,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates Answer Matrix Table (Bảng đáp án nhanh)
 */
function createAnswerMatrixTable(questions: PreparedQuestion[], font: string): Table {
  const total = questions.length;
  const colsPerRow = 10;
  const numRows = Math.ceil(total / colsPerRow);

  const tableRows: TableRow[] = [];

  for (let r = 0; r < numRows; r++) {
    const startIdx = r * colsPerRow;
    const endIdx = Math.min(startIdx + colsPerRow, total);
    const rowQuestions = questions.slice(startIdx, endIdx);

    // Row for Question Numbers
    const qNumCells: TableCell[] = [
      new TableCell({
        shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Câu', font, size: 18, bold: true })],
          }),
        ],
      }),
    ];

    // Row for Answer Letters
    const ansCells: TableCell[] = [
      new TableCell({
        shading: { fill: 'EDF2F7', type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Đ/A', font, size: 18, bold: true })],
          }),
        ],
      }),
    ];

    rowQuestions.forEach((q) => {
      qNumCells.push(
        new TableCell({
          shading: { fill: 'F7FAFC', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${q.displayNumber}`, font, size: 18, bold: true })],
            }),
          ],
        })
      );

      ansCells.push(
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: q.correctLetter,
                  font,
                  size: 20,
                  bold: true,
                  color: '0D9488',
                }),
              ],
            }),
          ],
        })
      );
    });

    // Fill remaining empty cells if last row has less than colsPerRow
    for (let c = rowQuestions.length; c < colsPerRow; c++) {
      qNumCells.push(
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '', font, size: 18 })] })],
        })
      );
      ansCells.push(
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '', font, size: 18 })] })],
        })
      );
    }

    tableRows.push(new TableRow({ children: qNumCells }));
    tableRows.push(new TableRow({ children: ansCells }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
    },
    rows: tableRows,
  });
}

/**
 * Builds the DOCX Document structure for Student Worksheet, Teacher Key, or Combined
 */
export function generateWordDocument(
  rawQuestions: QuestionItem[],
  options: DocxExportOptions
): Document {
  const font = options.fontFamily || 'Times New Roman';
  const preparedQuestions = prepareQuestionsForExport(rawQuestions, {
    selectedQuestionIds: options.selectedQuestionIds,
    shuffleQuestions: options.shuffleQuestions,
    shuffleOptions: options.shuffleOptions,
  });

  const sections: any[] = [];
  const bodyParagraphs: (Paragraph | Table)[] = [];

  // ============================================================
  // PART A: STUDENT WORKSHEET (If mode is 'worksheet' or 'combined')
  // ============================================================
  if (options.mode === 'worksheet' || options.mode === 'combined') {
    // 1. Header Table
    bodyParagraphs.push(createHeaderTable(options));
    bodyParagraphs.push(new Paragraph({ spacing: { before: 120, after: 120 } }));

    // 2. Student Info Box
    if (options.includeStudentHeader !== false) {
      bodyParagraphs.push(createStudentInfoTable(options));
      bodyParagraphs.push(new Paragraph({ spacing: { before: 160, after: 160 } }));
    }

    // 3. Instructions & Section Intro
    bodyParagraphs.push(
      new Paragraph({
        spacing: { before: 80, after: 120 },
        children: [
          new TextRun({
            text: 'Mark the letter A, B, C, or D on your answer sheet to indicate the correct answer to each of the following questions.',
            font,
            size: 21,
            italics: true,
            bold: true,
          }),
        ],
      })
    );

    // 4. Questions List
    let currentPassage: string | null = null;

    preparedQuestions.forEach((q) => {
      // If question has a new reading passage, display it in a distinguished callout
      if (options.includePassages !== false && q.passage && q.passage.trim() !== currentPassage) {
        currentPassage = q.passage.trim();
        bodyParagraphs.push(
          new Paragraph({
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: 'Read the following passage and answer the questions that follow:',
                font,
                size: 21,
                bold: true,
                italics: true,
                color: '1E293B',
              }),
            ],
          })
        );
        bodyParagraphs.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '94A3B8' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '94A3B8' },
              left: { style: BorderStyle.SINGLE, size: 6, color: '475569' },
              right: { style: BorderStyle.SINGLE, size: 2, color: '94A3B8' },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        spacing: { before: 100, after: 100 },
                        children: [
                          new TextRun({
                            text: currentPassage,
                            font,
                            size: 20,
                            italics: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
        bodyParagraphs.push(new Paragraph({ spacing: { before: 100, after: 100 } }));
      }

      // Question Title & Stem
      bodyParagraphs.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: `Question ${q.displayNumber}: `,
              font,
              size: 22,
              bold: true,
              color: '0F172A',
            }),
            new TextRun({
              text: q.questionText,
              font,
              size: 22,
              bold: false,
            }),
            ...(options.includePoints && q.points
              ? [
                  new TextRun({
                    text: ` (${q.points} pt)`,
                    font,
                    size: 18,
                    italics: true,
                    color: '64748B',
                  }),
                ]
              : []),
          ],
        })
      );

      // Options Rendering (Formatted neatly)
      const optionsRuns: TextRun[] = [];
      const optsCount = q.options.length;

      // Determine if options are short enough to fit on one or two lines
      const maxOptLength = Math.max(...q.options.map((o) => o.text.length), 0);

      if (optsCount === 4 && maxOptLength <= 15) {
        // Render 4 options in 1 line
        q.options.forEach((opt, idx) => {
          optionsRuns.push(
            new TextRun({
              text: `${opt.letter}. `,
              font,
              size: 21,
              bold: true,
            }),
            new TextRun({
              text: opt.text,
              font,
              size: 21,
            }),
            new TextRun({
              text: idx < optsCount - 1 ? '             ' : '',
              font,
              size: 21,
            })
          );
        });

        bodyParagraphs.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { before: 40, after: 80 },
            children: optionsRuns,
          })
        );
      } else if (optsCount === 4 && maxOptLength <= 35) {
        // Render 2 options per line (2 lines total)
        const line1Runs: TextRun[] = [
          new TextRun({ text: `${q.options[0].letter}. `, font, size: 21, bold: true }),
          new TextRun({ text: `${q.options[0].text}                                        `, font, size: 21 }),
          new TextRun({ text: `${q.options[1].letter}. `, font, size: 21, bold: true }),
          new TextRun({ text: q.options[1].text, font, size: 21 }),
        ];
        const line2Runs: TextRun[] = [
          new TextRun({ text: `${q.options[2].letter}. `, font, size: 21, bold: true }),
          new TextRun({ text: `${q.options[2].text}                                        `, font, size: 21 }),
          new TextRun({ text: `${q.options[3].letter}. `, font, size: 21, bold: true }),
          new TextRun({ text: q.options[3].text, font, size: 21 }),
        ];

        bodyParagraphs.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { before: 40, after: 40 },
            children: line1Runs,
          }),
          new Paragraph({
            indent: { left: 360 },
            spacing: { before: 40, after: 80 },
            children: line2Runs,
          })
        );
      } else {
        // Render 1 option per line
        q.options.forEach((opt) => {
          bodyParagraphs.push(
            new Paragraph({
              indent: { left: 360 },
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({
                  text: `${opt.letter}. `,
                  font,
                  size: 21,
                  bold: true,
                }),
                new TextRun({
                  text: opt.text,
                  font,
                  size: 21,
                }),
              ],
            })
          );
        });
      }
    });

    // End of exam marker
    bodyParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: '---------- HẾT ----------',
            font,
            size: 20,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({
            text: '(Cán bộ coi thi không giải thích gì thêm)',
            font,
            size: 18,
            italics: true,
          }),
        ],
      })
    );
  }

  // ============================================================
  // PART B: TEACHER ANSWER KEY & EXPLANATIONS
  // ============================================================
  if (options.mode === 'answer_key' || options.mode === 'combined') {
    // If combined mode, insert a clean PageBreak before Answer Key
    if (options.mode === 'combined') {
      bodyParagraphs.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // Answer Key Header
    bodyParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: `${ORG_NAME.toUpperCase()} • TỔ TIẾNG ANH`,
            font,
            size: 20,
            bold: true,
            color: '475569',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({
            text: 'ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT',
            font,
            size: 28,
            bold: true,
            color: '0F172A',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 160 },
        children: [
          new TextRun({
            text: `Bài tập: ${options.title} | Mã đề: ${options.testCode || '101'} | Tổng số: ${preparedQuestions.length} câu`,
            font,
            size: 20,
            italics: true,
            bold: true,
            color: '2563EB',
          }),
        ],
      })
    );

    // 1. Quick Answer Matrix Table (Bảng đáp án nhanh)
    if (options.answerKeyFormat !== 'detailed_only') {
      bodyParagraphs.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: 'I. BẢNG ĐÁP ÁN NHANH (QUICK ANSWER KEY):',
              font,
              size: 22,
              bold: true,
              color: '0F172A',
            }),
          ],
        }),
        createAnswerMatrixTable(preparedQuestions, font),
        new Paragraph({ spacing: { before: 160, after: 160 } })
      );
    }

    // 2. Detailed Solutions & Explanations (Hướng dẫn giải chi tiết)
    if (options.answerKeyFormat !== 'matrix_only') {
      bodyParagraphs.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: 'II. LỜI GIẢI CHI TIẾT VÀ GIẢI THÍCH (DETAILED EXPLANATIONS):',
              font,
              size: 22,
              bold: true,
              color: '0F172A',
            }),
          ],
        })
      );

      preparedQuestions.forEach((q) => {
        bodyParagraphs.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({
                text: `Câu ${q.displayNumber}: `,
                font,
                size: 22,
                bold: true,
                color: '1E293B',
              }),
              new TextRun({
                text: q.questionText,
                font,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            indent: { left: 360 },
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: '➜ Đáp án đúng: ',
                font,
                size: 21,
                bold: true,
                color: '059669',
              }),
              new TextRun({
                text: `${q.correctLetter}. ${q.correctText}`,
                font,
                size: 21,
                bold: true,
                color: '059669',
              }),
            ],
          })
        );

        if (options.includeExplanations !== false && q.explanation && q.explanation.trim()) {
          bodyParagraphs.push(
            new Paragraph({
              indent: { left: 360 },
              spacing: { before: 40, after: 80 },
              children: [
                new TextRun({
                  text: '📝 Giải thích chi tiết: ',
                  font,
                  size: 20,
                  bold: true,
                  color: '4338CA',
                }),
                new TextRun({
                  text: q.explanation.trim(),
                  font,
                  size: 20,
                  italics: true,
                  color: '334155',
                }),
              ],
            })
          );
        }
      });
    }
  }

  // Build Document with Running Header and Page Numbers Footer
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000, // ~1.75cm
              bottom: 1000,
              left: 1100, // ~2cm
              right: 1100,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${APP_NAME} • ${ORG_NAME} | ${options.title}`,
                    font,
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Trang ',
                    font,
                    size: 18,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font,
                    size: 18,
                    color: '64748B',
                    bold: true,
                  }),
                  new TextRun({
                    text: ' / ',
                    font,
                    size: 18,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font,
                    size: 18,
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
        },
        children: bodyParagraphs,
      },
    ],
  });
}

/**
 * Downloads a generated Document as a .docx file in the browser
 */
export async function downloadDocxFile(
  questions: QuestionItem[],
  options: DocxExportOptions,
  customFileName?: string
): Promise<void> {
  const doc = generateWordDocument(questions, options);
  const blob = await Packer.toBlob(doc);

  const cleanTitle = (options.title || 'De_Kiem_Tra')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const modeSuffix =
    options.mode === 'worksheet'
      ? 'De_Bai'
      : options.mode === 'answer_key'
      ? 'Dap_An'
      : 'De_Va_DapAn';
  const testCodeSuffix = options.testCode ? `_MaDe${options.testCode}` : '';
  const dateStr = new Date().toISOString().slice(0, 10);

  const fileName =
    customFileName || `EduSpace25_${cleanTitle}_${modeSuffix}${testCodeSuffix}_${dateStr}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates multiple test codes (e.g. 101, 102, 103, 104) with separate shuffled worksheets and answer keys
 */
export async function downloadMultipleTestVariants(
  questions: QuestionItem[],
  baseOptions: DocxExportOptions,
  testCodes: string[] = ['101', '102', '103', '104']
): Promise<void> {
  for (const code of testCodes) {
    const opts: DocxExportOptions = {
      ...baseOptions,
      testCode: code,
      shuffleQuestions: true,
      shuffleOptions: true,
      mode: 'combined',
    };

    await downloadDocxFile(questions, opts);
    // slight delay between downloads so browser triggers them cleanly
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
