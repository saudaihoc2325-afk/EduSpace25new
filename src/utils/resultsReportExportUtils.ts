import * as XLSX from 'xlsx';
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
  ShadingType,
} from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StudentResult, Assignment, Activity, QuestionSet } from '../types';
import {
  StudentPerformanceSummary,
  QuestionAnalysisItem,
  analyzeQuestions,
  groupResultsByStudent,
} from './analyticsUtils';
import { APP_NAME, ORG_NAME } from '../constants/gameTypes';

export interface ClassComparisonStats {
  className: string;
  studentsCount: number;
  resultsCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSeconds: number;
}

export interface ResultsReportPayload {
  teacherName: string; // "ENGLISH GROUP"
  reportTitle: string; // "Results Report"
  dateRangeText: string;
  selectedClass: string;
  selectedActivityTitle: string;
  selectedStudentName: string;
  attemptModeText: string;

  results: StudentResult[];
  assignments: Assignment[];
  activities?: Activity[];
  questionSets?: QuestionSet[];

  // Computed metrics from actual data
  totalResults: number;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSeconds: number;

  studentSummaries: StudentPerformanceSummary[];
  selectedStudentSummary?: StudentPerformanceSummary | null;
  questionErrorItems: QuestionAnalysisItem[];
  classComparisonItems: ClassComparisonStats[];
}

/**
 * Computes report payload using strictly existing filtered data
 */
export function buildReportPayload({
  results,
  assignments,
  activities = [],
  questionSets = [],
  selectedAssignmentFilter,
  selectedClassFilter,
  selectedStudentFilter,
  startDateFilter,
  endDateFilter,
  dateFilter,
  attemptFilter,
}: {
  results: StudentResult[];
  assignments: Assignment[];
  activities?: Activity[];
  questionSets?: QuestionSet[];
  selectedAssignmentFilter: string;
  selectedClassFilter: string;
  selectedStudentFilter: string;
  startDateFilter: string;
  endDateFilter: string;
  dateFilter: string;
  attemptFilter: string;
}): ResultsReportPayload {
  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentFilter);
  const selectedActivityTitle = activeAssignment
    ? `${activeAssignment.title} (${activeAssignment.assignmentCode})`
    : selectedAssignmentFilter === 'all'
    ? 'Tất cả bài tập'
    : 'Bài tập được chọn';

  const selectedClass = selectedClassFilter === 'all' ? 'Tất cả các lớp' : selectedClassFilter;
  const selectedStudentName =
    selectedStudentFilter === 'all' ? 'Tất cả học sinh' : selectedStudentFilter;

  // Date range display string
  let dateRangeText = 'Tất cả thời gian';
  if (startDateFilter && endDateFilter) {
    dateRangeText = `Từ ${startDateFilter} đến ${endDateFilter}`;
  } else if (startDateFilter) {
    dateRangeText = `Từ ngày ${startDateFilter}`;
  } else if (endDateFilter) {
    dateRangeText = `Đến ngày ${endDateFilter}`;
  } else if (dateFilter === 'today') {
    dateRangeText = 'Hôm nay';
  } else if (dateFilter === '7days') {
    dateRangeText = '7 ngày qua';
  } else if (dateFilter === '30days') {
    dateRangeText = '30 ngày qua';
  }

  // Attempt mode text
  let attemptModeText = 'Tất cả các lần làm bài';
  if (attemptFilter === 'best') attemptModeText = 'Chỉ tính điểm cao nhất của mỗi học sinh';
  if (attemptFilter === 'latest') attemptModeText = 'Chỉ tính lần làm bài mới nhất';

  // Group by student
  const studentSummaries = groupResultsByStudent(results);
  const selectedStudentSummary =
    selectedStudentFilter !== 'all'
      ? studentSummaries.find(
          (s) => s.studentName.trim().toLowerCase() === selectedStudentFilter.trim().toLowerCase()
        ) || null
      : null;

  // Summary statistics
  const totalResults = results.length;
  const totalStudents = studentSummaries.length;
  const averageScore =
    totalResults > 0
      ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalResults)
      : 0;
  const highestScore = totalResults > 0 ? Math.max(...results.map((r) => r.percentage)) : 0;
  const lowestScore = totalResults > 0 ? Math.min(...results.map((r) => r.percentage)) : 0;
  const averageTimeSeconds =
    totalResults > 0
      ? Math.round(results.reduce((acc, r) => acc + (r.timeSpentSeconds || 0), 0) / totalResults)
      : 0;

  // Question Error Analysis
  const questionErrorItems = analyzeQuestions(results, activities, questionSets);

  // Class Comparison
  const classMap = new Map<string, StudentResult[]>();
  results.forEach((r) => {
    const cls = r.studentClass ? r.studentClass.trim() : 'Chưa phân lớp';
    const list = classMap.get(cls) || [];
    list.push(r);
    classMap.set(cls, list);
  });

  const classComparisonItems: ClassComparisonStats[] = [];
  classMap.forEach((cResults, cName) => {
    const cStudents = new Set(cResults.map((r) => r.studentName.trim().toLowerCase())).size;
    const cAvg =
      cResults.length > 0
        ? Math.round(cResults.reduce((acc, r) => acc + r.percentage, 0) / cResults.length)
        : 0;
    const cHigh = cResults.length > 0 ? Math.max(...cResults.map((r) => r.percentage)) : 0;
    const cLow = cResults.length > 0 ? Math.min(...cResults.map((r) => r.percentage)) : 0;
    const cAvgTime =
      cResults.length > 0
        ? Math.round(
            cResults.reduce((acc, r) => acc + (r.timeSpentSeconds || 0), 0) / cResults.length
          )
        : 0;

    classComparisonItems.push({
      className: cName,
      studentsCount: cStudents,
      resultsCount: cResults.length,
      averageScore: cAvg,
      highestScore: cHigh,
      lowestScore: cLow,
      averageTimeSeconds: cAvgTime,
    });
  });
  classComparisonItems.sort((a, b) => a.className.localeCompare(b.className, 'vi'));

  return {
    teacherName: 'ENGLISH GROUP',
    reportTitle: 'Results Report',
    dateRangeText,
    selectedClass,
    selectedActivityTitle,
    selectedStudentName,
    attemptModeText,
    results,
    assignments,
    activities,
    questionSets,
    totalResults,
    totalStudents,
    averageScore,
    highestScore,
    lowestScore,
    averageTimeSeconds,
    studentSummaries,
    selectedStudentSummary,
    questionErrorItems,
    classComparisonItems,
  };
}

/**
 * Format seconds to readable mm:ss string
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}

/**
 * EXPORT EXCEL (.xlsx)
 * Sheets:
 * 1. Summary
 * 2. Results
 * 3. Student Progress
 * 4. Question Error Analysis
 * 5. Class Comparison
 */
export function exportResultsToExcel(payload: ResultsReportPayload): void {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().slice(0, 10);
  const asgnMap = new Map<string, Assignment>();
  payload.assignments.forEach((a) => asgnMap.set(a.id, a));

  // --- SHEET 1: SUMMARY ---
  const summaryAoa: (string | number)[][] = [
    [APP_NAME],
    ['BÁO CÁO KẾT QUẢ VÀ SỔ ĐIỂM HỌC SINH (RESULTS REPORT)'],
    ['Giáo viên / Bộ môn:', payload.teacherName],
    ['Ngày xuất báo cáo:', new Date().toLocaleString('vi-VN')],
    [],
    ['=== THÔNG TIN BỘ LỌC HIỆN TẠI (FILTERS) ==='],
    ['Khoảng thời gian (Date Range):', payload.dateRangeText],
    ['Lớp học (Class):', payload.selectedClass],
    ['Bài tập / Hoạt động (Activity):', payload.selectedActivityTitle],
    ['Học sinh (Student):', payload.selectedStudentName],
    ['Chế độ lần làm bài (Attempt Filter):', payload.attemptModeText],
    [],
    ['=== CHỈ SỐ THỐNG KÊ TỔNG HỢP (SUMMARY STATISTICS) ==='],
    ['Tổng số bài làm đã nộp (Number of Results):', payload.totalResults],
    ['Số học sinh tham gia (Number of Students):', payload.totalStudents],
    [
      'Điểm trung bình (Average Score):',
      `${payload.averageScore}% (${((payload.averageScore / 100) * 10).toFixed(1)}/10)`,
    ],
    ['Điểm cao nhất (Highest Score):', `${payload.highestScore}%`],
    ['Điểm thấp nhất (Lowest Score):', `${payload.lowestScore}%`],
    [
      'Thời gian làm bài trung bình (Average Time):',
      formatDuration(payload.averageTimeSeconds),
    ],
    [],
    ['* Lưu ý: Toàn bộ dữ liệu được trích xuất chính xác theo bộ lọc hiện tại của giáo viên.'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 40 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // --- SHEET 2: DETAILED RESULTS ---
  const resultsHeaders = [
    'STT',
    'Student (Học sinh)',
    'Class (Lớp)',
    'SBD / Mã HS',
    'Activity (Bài tập)',
    'Mã bài tập',
    'Score (%)',
    'Điểm thang 10',
    'Correct (Câu đúng)',
    'Total (Tổng câu)',
    'Time (Thời gian)',
    'Date (Thời điểm nộp)',
    'Attempt (Lần làm)',
  ];

  const resultsRows = payload.results.map((res, index) => {
    const asgn = asgnMap.get(res.assignmentId);
    const activityTitle = res.activityTitle || asgn?.title || 'Interactive Activity';
    const totalQ = res.totalQuestions || (res.answers ? res.answers.length : 0);
    const correctC = typeof res.correctCount === 'number' ? res.correctCount : res.score;
    const score10 = totalQ > 0 ? ((correctC / totalQ) * 10).toFixed(1) : '0.0';
    const timeSpent = res.timeSpentSeconds || 0;

    let dateText = res.completedAt;
    try {
      dateText = new Date(res.completedAt).toLocaleString('vi-VN');
    } catch {
      // keep original
    }

    return [
      index + 1,
      res.studentName,
      res.studentClass,
      res.studentId || '',
      activityTitle,
      res.assignmentCode || asgn?.assignmentCode || '',
      `${res.percentage}%`,
      score10,
      correctC,
      totalQ,
      formatDuration(timeSpent),
      dateText,
      res.attemptNumber || 1,
    ];
  });

  const wsResults = XLSX.utils.aoa_to_sheet([resultsHeaders, ...resultsRows]);
  wsResults['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 10 },
    { wch: 14 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResults, 'Results');

  // --- SHEET 3: STUDENT PROGRESS ---
  if (payload.studentSummaries.length > 0) {
    const progressHeaders = [
      'STT',
      'Student (Học sinh)',
      'Class (Lớp)',
      'Mã HS / SBD',
      'Number of Activities (Số lượt làm)',
      'Average Score (%)',
      'Highest Score (%)',
      'Lowest Score (%)',
      'Average Time',
      'Lần làm bài gần nhất',
    ];

    const progressRows = payload.studentSummaries.map((s, idx) => {
      const lowestScore = Math.min(...s.attempts.map((a) => a.percentage));
      let lastDate = s.lastCompletedAt;
      try {
        lastDate = new Date(s.lastCompletedAt).toLocaleString('vi-VN');
      } catch {
        // keep
      }

      return [
        idx + 1,
        s.studentName,
        s.studentClass,
        s.studentId || '',
        s.totalAttempts,
        `${s.averagePercentage}%`,
        `${s.bestPercentage}%`,
        `${lowestScore}%`,
        formatDuration(s.averageTimeSpentSeconds),
        lastDate,
      ];
    });

    const progressAoa: (string | number)[][] = [progressHeaders, ...progressRows];

    // If a specific student was selected, append their activity history directly below!
    if (payload.selectedStudentSummary) {
      const sel = payload.selectedStudentSummary;
      progressAoa.push([]);
      progressAoa.push([`LỊCH SỬ CHI TIẾT CỦA HỌC SINH: ${sel.studentName.toUpperCase()} (LỚP ${sel.studentClass})`]);
      progressAoa.push([
        'Lần làm',
        'Bài tập / Hoạt động',
        'Điểm số',
        'Số câu đúng / Tổng số',
        'Thời gian làm bài',
        'Thời điểm hoàn thành',
      ]);
      sel.attempts.forEach((att, attIdx) => {
        const asgn = asgnMap.get(att.assignmentId);
        const title = att.activityTitle || asgn?.title || 'Interactive Activity';
        const totalQ = att.totalQuestions || (att.answers ? att.answers.length : 0);
        const correctC = typeof att.correctCount === 'number' ? att.correctCount : att.score;
        let cDate = att.completedAt;
        try {
          cDate = new Date(att.completedAt).toLocaleString('vi-VN');
        } catch {
          // keep
        }
        progressAoa.push([
          `Lần ${att.attemptNumber || attIdx + 1}`,
          title,
          `${att.percentage}%`,
          `${correctC} / ${totalQ}`,
          formatDuration(att.timeSpentSeconds || 0),
          cDate,
        ]);
      });
    }

    const wsProgress = XLSX.utils.aoa_to_sheet(progressAoa);
    wsProgress['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 12 },
      { wch: 14 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsProgress, 'Student Progress');
  }

  // --- SHEET 4: QUESTION ERROR ANALYSIS ---
  if (payload.questionErrorItems.length > 0) {
    const qHeaders = [
      'Question Number (Câu số)',
      'Question Text (Nội dung câu hỏi)',
      'Attempts (Lượt làm)',
      'Correct (Số lượt đúng)',
      'Wrong (Số lượt sai)',
      'Accuracy Rate (Tỉ lệ đúng)',
      'Error Rate (Tỉ lệ sai)',
      'Đáp án chính xác',
    ];

    const qRows = payload.questionErrorItems.map((q) => [
      q.questionNumber,
      q.questionText,
      q.timesAttempted,
      q.correctCount,
      q.wrongAnswers,
      `${q.accuracyRate}%`,
      `${q.errorRate}%`,
      q.correctAnswer || '',
    ]);

    const wsQ = XLSX.utils.aoa_to_sheet([qHeaders, ...qRows]);
    wsQ['!cols'] = [
      { wch: 16 },
      { wch: 45 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsQ, 'Question Error Analysis');
  }

  // --- SHEET 5: CLASS COMPARISON ---
  if (payload.classComparisonItems.length > 0) {
    const classHeaders = [
      'STT',
      'Class (Lớp)',
      'Students (Số học sinh)',
      'Results (Số bài làm)',
      'Average Score (%)',
      'Highest Score (%)',
      'Lowest Score (%)',
      'Average Time',
    ];

    const classRows = payload.classComparisonItems.map((c, idx) => [
      idx + 1,
      c.className,
      c.studentsCount,
      c.resultsCount,
      `${c.averageScore}%`,
      `${c.highestScore}%`,
      `${c.lowestScore}%`,
      formatDuration(c.averageTimeSeconds),
    ]);

    const wsClass = XLSX.utils.aoa_to_sheet([classHeaders, ...classRows]);
    wsClass['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsClass, 'Class Comparison');
  }

  // Generate and download
  const safeTitle = (payload.selectedActivityTitle || 'Results_Report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  XLSX.writeFile(wb, `EduSpace25_Results_Report_${safeTitle}_${dateStr}.xlsx`);
}

/**
 * Helper to build standard Word table cells
 */
function createTableCell({
  text,
  isHeader = false,
  align = AlignmentType.LEFT,
  widthPercent,
  bold = false,
  bgColor,
}: {
  text: string;
  isHeader?: boolean;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  widthPercent?: number;
  bold?: boolean;
  bgColor?: string;
}): TableCell {
  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    shading: bgColor
      ? { fill: bgColor, type: ShadingType.CLEAR }
      : isHeader
      ? { fill: '0F172A', type: ShadingType.CLEAR }
      : undefined,
    margins: {
      top: 120,
      bottom: 120,
      left: 140,
      right: 140,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: isHeader || bold,
            size: isHeader ? 19 : 18,
            color: isHeader ? 'FFFFFF' : '1E293B',
            font: 'Times New Roman',
          }),
        ],
      }),
    ],
  });
}

/**
 * EXPORT WORD (.docx)
 */
export async function exportResultsToWord(payload: ResultsReportPayload): Promise<void> {
  const asgnMap = new Map<string, Assignment>();
  payload.assignments.forEach((a) => asgnMap.set(a.id, a));
  const dateStr = new Date().toISOString().slice(0, 10);

  const docChildren: any[] = [];

  // 1. Header & Title Block
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: APP_NAME,
          bold: true,
          size: 28,
          color: '4338CA',
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 140 },
      children: [
        new TextRun({
          text: 'BÁO CÁO KẾT QUẢ VÀ SỔ ĐIỂM HỌC SINH (RESULTS REPORT)',
          bold: true,
          size: 24,
          color: '0F172A',
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: `Teacher: ${payload.teacherName}  •  Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`,
          italics: true,
          size: 20,
          color: '64748B',
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // 2. Active Filters Box
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({
          text: 'I. BỘ LỌC DỮ LIỆU ĐANG CHỌN (ACTIVE FILTERS)',
          bold: true,
          size: 22,
          color: '312E81',
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: '• Khoảng thời gian (Date Range): ', bold: true, font: 'Times New Roman' }),
        new TextRun({ text: payload.dateRangeText, font: 'Times New Roman' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: '• Lớp học (Class): ', bold: true, font: 'Times New Roman' }),
        new TextRun({ text: payload.selectedClass, font: 'Times New Roman' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: '• Bài tập / Hoạt động (Activity): ', bold: true, font: 'Times New Roman' }),
        new TextRun({ text: payload.selectedActivityTitle, font: 'Times New Roman' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: '• Học sinh (Student): ', bold: true, font: 'Times New Roman' }),
        new TextRun({ text: payload.selectedStudentName, font: 'Times New Roman' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: '• Chế độ bài làm (Attempt Mode): ', bold: true, font: 'Times New Roman' }),
        new TextRun({ text: payload.attemptModeText, font: 'Times New Roman' }),
      ],
    })
  );

  // 3. Summary Statistics Table
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 120 },
      children: [
        new TextRun({
          text: 'II. TỔNG HỢP KẾT QUẢ THỐNG KÊ (SUMMARY STATISTICS)',
          bold: true,
          size: 22,
          color: '312E81',
          font: 'Times New Roman',
        }),
      ],
    })
  );

  const summaryTableRows = [
    new TableRow({
      children: [
        createTableCell({ text: 'Chỉ số thống kê', isHeader: true, widthPercent: 60 }),
        createTableCell({ text: 'Giá trị thực tế', isHeader: true, widthPercent: 40, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        createTableCell({ text: 'Tổng số lượt nộp bài (Number of Results)' }),
        createTableCell({ text: String(payload.totalResults), bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        createTableCell({ text: 'Số học sinh tham gia (Number of Students)' }),
        createTableCell({ text: String(payload.totalStudents), bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        createTableCell({ text: 'Điểm trung bình (Average Score)' }),
        createTableCell({
          text: `${payload.averageScore}% (${((payload.averageScore / 100) * 10).toFixed(1)}/10)`,
          bold: true,
          align: AlignmentType.RIGHT,
        }),
      ],
    }),
    new TableRow({
      children: [
        createTableCell({ text: 'Điểm cao nhất (Highest Score)' }),
        createTableCell({ text: `${payload.highestScore}%`, bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        createTableCell({ text: 'Điểm thấp nhất (Lowest Score)' }),
        createTableCell({ text: `${payload.lowestScore}%`, bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
    new TableRow({
      children: [
        createTableCell({ text: 'Thời gian làm bài trung bình (Average Time)' }),
        createTableCell({ text: formatDuration(payload.averageTimeSeconds), bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ];

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: summaryTableRows,
    })
  );

  // 4. Detailed Results Table
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: `III. CHI TIẾT BÀI NỘP HỌC SINH (DETAILED RESULTS - ${payload.results.length} BẢN GHI)`,
          bold: true,
          size: 22,
          color: '312E81',
          font: 'Times New Roman',
        }),
      ],
    })
  );

  const resultsTableRows = [
    new TableRow({
      children: [
        createTableCell({ text: 'STT', isHeader: true, widthPercent: 5, align: AlignmentType.CENTER }),
        createTableCell({ text: 'Học sinh', isHeader: true, widthPercent: 20 }),
        createTableCell({ text: 'Lớp', isHeader: true, widthPercent: 8, align: AlignmentType.CENTER }),
        createTableCell({ text: 'Bài tập', isHeader: true, widthPercent: 24 }),
        createTableCell({ text: 'Điểm (%)', isHeader: true, widthPercent: 10, align: AlignmentType.CENTER }),
        createTableCell({ text: 'Đúng/Tổng', isHeader: true, widthPercent: 11, align: AlignmentType.CENTER }),
        createTableCell({ text: 'Thời gian', isHeader: true, widthPercent: 10, align: AlignmentType.CENTER }),
        createTableCell({ text: 'Lần làm', isHeader: true, widthPercent: 8, align: AlignmentType.CENTER }),
        createTableCell({ text: 'Ngày nộp', isHeader: true, widthPercent: 14, align: AlignmentType.RIGHT }),
      ],
    }),
  ];

  payload.results.forEach((res, idx) => {
    const asgn = asgnMap.get(res.assignmentId);
    const actTitle = res.activityTitle || asgn?.title || 'Interactive Activity';
    const totalQ = res.totalQuestions || (res.answers ? res.answers.length : 0);
    const correctC = typeof res.correctCount === 'number' ? res.correctCount : res.score;
    const isEven = idx % 2 === 1;
    const rowBg = isEven ? 'F8FAFC' : undefined;

    let dStr = res.completedAt;
    try {
      dStr = new Date(res.completedAt).toLocaleDateString('vi-VN');
    } catch {
      // keep
    }

    resultsTableRows.push(
      new TableRow({
        children: [
          createTableCell({ text: String(idx + 1), align: AlignmentType.CENTER, bgColor: rowBg }),
          createTableCell({ text: res.studentName, bold: true, bgColor: rowBg }),
          createTableCell({ text: res.studentClass, align: AlignmentType.CENTER, bgColor: rowBg }),
          createTableCell({ text: actTitle, bgColor: rowBg }),
          createTableCell({ text: `${res.percentage}%`, bold: true, align: AlignmentType.CENTER, bgColor: rowBg }),
          createTableCell({ text: `${correctC}/${totalQ}`, align: AlignmentType.CENTER, bgColor: rowBg }),
          createTableCell({ text: formatDuration(res.timeSpentSeconds || 0), align: AlignmentType.CENTER, bgColor: rowBg }),
          createTableCell({ text: String(res.attemptNumber || 1), align: AlignmentType.CENTER, bgColor: rowBg }),
          createTableCell({ text: dStr, align: AlignmentType.RIGHT, bgColor: rowBg }),
        ],
      })
    );
  });

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: resultsTableRows,
    })
  );

  // 5. Class Comparison Table (if available)
  if (payload.classComparisonItems.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: 'IV. THỐNG KÊ SO SÁNH CÁC LỚP (CLASS COMPARISON)',
            bold: true,
            size: 22,
            color: '312E81',
            font: 'Times New Roman',
          }),
        ],
      })
    );

    const classTableRows = [
      new TableRow({
        children: [
          createTableCell({ text: 'STT', isHeader: true, widthPercent: 6, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Lớp', isHeader: true, widthPercent: 18 }),
          createTableCell({ text: 'Số học sinh', isHeader: true, widthPercent: 14, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Số bài làm', isHeader: true, widthPercent: 14, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Điểm TB (%)', isHeader: true, widthPercent: 16, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Cao nhất', isHeader: true, widthPercent: 16, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Thời gian TB', isHeader: true, widthPercent: 16, align: AlignmentType.CENTER }),
        ],
      }),
    ];

    payload.classComparisonItems.forEach((c, cIdx) => {
      classTableRows.push(
        new TableRow({
          children: [
            createTableCell({ text: String(cIdx + 1), align: AlignmentType.CENTER }),
            createTableCell({ text: c.className, bold: true }),
            createTableCell({ text: String(c.studentsCount), align: AlignmentType.CENTER }),
            createTableCell({ text: String(c.resultsCount), align: AlignmentType.CENTER }),
            createTableCell({ text: `${c.averageScore}%`, bold: true, align: AlignmentType.CENTER }),
            createTableCell({ text: `${c.highestScore}%`, align: AlignmentType.CENTER }),
            createTableCell({ text: formatDuration(c.averageTimeSeconds), align: AlignmentType.CENTER }),
          ],
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: classTableRows,
      })
    );
  }

  // 6. Question Error Analysis Table (if available)
  if (payload.questionErrorItems.length > 0) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: 'V. MA TRẬN PHÂN TÍCH LỖI SAI CÂU HỎI (QUESTION ERROR ANALYSIS)',
            bold: true,
            size: 22,
            color: '312E81',
            font: 'Times New Roman',
          }),
        ],
      })
    );

    const qTableRows = [
      new TableRow({
        children: [
          createTableCell({ text: 'Câu số', isHeader: true, widthPercent: 10, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Nội dung câu hỏi', isHeader: true, widthPercent: 44 }),
          createTableCell({ text: 'Lượt làm', isHeader: true, widthPercent: 10, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Đúng', isHeader: true, widthPercent: 9, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Sai', isHeader: true, widthPercent: 9, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Tỉ lệ đúng', isHeader: true, widthPercent: 9, align: AlignmentType.CENTER }),
          createTableCell({ text: 'Tỉ lệ sai', isHeader: true, widthPercent: 9, align: AlignmentType.CENTER }),
        ],
      }),
    ];

    payload.questionErrorItems.forEach((q) => {
      const isHighError = q.errorRate >= 50;
      const rowBg = isHighError ? 'FFF1F2' : undefined;

      qTableRows.push(
        new TableRow({
          children: [
            createTableCell({ text: `Câu ${q.questionNumber}`, align: AlignmentType.CENTER, bold: true, bgColor: rowBg }),
            createTableCell({ text: q.questionText, bgColor: rowBg }),
            createTableCell({ text: String(q.timesAttempted), align: AlignmentType.CENTER, bgColor: rowBg }),
            createTableCell({ text: String(q.correctCount), align: AlignmentType.CENTER, bgColor: rowBg }),
            createTableCell({ text: String(q.wrongAnswers), align: AlignmentType.CENTER, bold: isHighError, bgColor: rowBg }),
            createTableCell({ text: `${q.accuracyRate}%`, align: AlignmentType.CENTER, bgColor: rowBg }),
            createTableCell({ text: `${q.errorRate}%`, align: AlignmentType.CENTER, bold: isHighError, bgColor: rowBg }),
          ],
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: qTableRows,
      })
    );
  }

  // 7. Signature Block
  docChildren.push(
    new Paragraph({
      spacing: { before: 360, after: 60 },
      children: [
        new TextRun({
          text: '                                 NGƯỜI LẬP BÁO CÁO                                            GIÁO VIÊN BỘ MÔN',
          bold: true,
          size: 20,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 40, after: 300 },
      children: [
        new TextRun({
          text: '                               (Ký và ghi rõ họ tên)                                              ENGLISH GROUP',
          italics: true,
          size: 18,
          color: '64748B',
          font: 'Times New Roman',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
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
                    text: `${APP_NAME} • ${ORG_NAME} (Results Report)`,
                    size: 16,
                    color: '94A3B8',
                    font: 'Times New Roman',
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
                    size: 16,
                    color: '94A3B8',
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanTitle = (payload.selectedActivityTitle || 'Results_Report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);

  link.href = url;
  link.download = `EduSpace25_Results_Report_${cleanTitle}_${dateStr}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * EXPORT PDF (.pdf)
 * Generates high-resolution multi-page PDF using canvas capture
 * to guarantee 100% Vietnamese unicode accuracy and clean table layout.
 */
export async function exportResultsToPdf(
  containerElement: HTMLElement,
  filenamePrefix: string = 'Results_Report'
): Promise<void> {
  const canvas = await html2canvas(containerElement, {
    scale: 2, // High DPI for crisp vector-like text
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 800,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Consecutive pages with page break
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  pdf.save(`EduSpace25_${cleanName}_${dateStr}.pdf`);
}
