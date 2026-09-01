import { StudentResult, Assignment } from '../types';

/**
 * Escapes a cell value for standard CSV format
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports Student Results to CSV with Vietnamese UTF-8 BOM encoding
 */
export function exportResultsToCsv(
  results: StudentResult[],
  assignments: Assignment[],
  filtersMeta?: {
    assignmentTitle?: string;
    className?: string;
    exportDate?: string;
  }
): void {
  if (!results || results.length === 0) {
    alert('Không có dữ liệu bài nộp để xuất.');
    return;
  }

  const asgnMap = new Map<string, Assignment>();
  assignments.forEach((a) => asgnMap.set(a.id, a));

  const headers = [
    'STT',
    'Họ và tên học sinh',
    'Lớp',
    'Mã học sinh / SBD',
    'Tên bài tập',
    'Mã bài tập (6 ký tự)',
    'Lần làm bài (Attempt)',
    'Điểm số',
    'Tổng số câu',
    'Số câu đúng',
    'Tỉ lệ chính xác (%)',
    'Điểm quy đổi (thang 10)',
    'Thời gian làm bài (giây)',
    'Thời gian làm bài (phút:giây)',
    'Thời điểm hoàn thành',
  ];

  const rows = results.map((res, index) => {
    const asgn = asgnMap.get(res.assignmentId);
    const activityTitle = res.activityTitle || asgn?.title || 'Interactive Activity';
    const totalQ = res.totalQuestions || (res.answers ? res.answers.length : 0);
    const correctC = typeof res.correctCount === 'number' ? res.correctCount : res.score;
    const score10 = totalQ > 0 ? ((correctC / totalQ) * 10).toFixed(1) : '0.0';
    const timeSpent = res.timeSpentSeconds || 0;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const formattedTime = `${minutes}m ${seconds}s`;

    let formattedDate = res.completedAt;
    try {
      formattedDate = new Date(res.completedAt).toLocaleString('vi-VN');
    } catch {
      // keep original
    }

    return [
      escapeCsvCell(index + 1),
      escapeCsvCell(res.studentName),
      escapeCsvCell(res.studentClass),
      escapeCsvCell(res.studentId || ''),
      escapeCsvCell(activityTitle),
      escapeCsvCell(res.assignmentCode || asgn?.assignmentCode || ''),
      escapeCsvCell(res.attemptNumber || 1),
      escapeCsvCell(res.score),
      escapeCsvCell(totalQ),
      escapeCsvCell(correctC),
      escapeCsvCell(`${res.percentage}%`),
      escapeCsvCell(score10),
      escapeCsvCell(timeSpent),
      escapeCsvCell(formattedTime),
      escapeCsvCell(formattedDate),
    ].join(',');
  });

  // Metadata comments in header
  const titleHeader = [
    escapeCsvCell('EDUSPACE25 - BÁO CÁO KẾT QUẢ VÀ SỔ ĐIỂM HỌC SINH'),
    escapeCsvCell(`Giáo viên: ENGLISH GROUP`),
    escapeCsvCell(`Bộ lọc bài tập: ${filtersMeta?.assignmentTitle || 'Tất cả bài tập'}`),
    escapeCsvCell(`Lớp: ${filtersMeta?.className || 'Tất cả các lớp'}`),
    escapeCsvCell(`Ngày xuất báo cáo: ${filtersMeta?.exportDate || new Date().toLocaleString('vi-VN')}`),
    escapeCsvCell(`Tổng số bản ghi: ${results.length}`),
    '', // empty line before table
  ];

  const csvContent = '\uFEFF' + [titleHeader.join('\n'), headers.join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const cleanName = (filtersMeta?.assignmentTitle || 'So_Diem_EduSpace25')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `EduSpace25_Results_${cleanName}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
