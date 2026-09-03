import { StudentResult } from '../types';

export type RankingMethod = 'best' | 'latest';

export interface LeaderboardEntry {
  rank: number;
  studentName: string;
  studentClass: string;
  studentId?: string;
  score: number; // 10-point scale e.g. 9.5
  percentage: number; // 0 - 100
  rawCorrect: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  timeFormatted: string; // e.g. "05:20"
  completedAt: string;
  dateFormatted: string; // e.g. "03/09/2026"
  dateTimeFormatted: string; // e.g. "03/09/2026 14:30"
  attemptNumber: number;
  totalAttempts: number;
  activityTitle: string;
  assignmentCode: string;
  assignmentId: string;
  resultId: string;
}

export interface LeaderboardStats {
  studentsRanked: number;
  averageScore: number; // e.g. 8.2
  highestScore: number; // e.g. 9.5
  averageTimeSeconds: number;
  averageTimeFormatted: string; // e.g. "04:15"
}

export interface LeaderboardFilterParams {
  results: StudentResult[];
  activityFilter?: string; // 'all' or assignmentId / activityId / assignmentCode
  classFilter?: string; // 'all' or class name
  studentSearch?: string; // search query for student name or id
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  rankingMethod?: RankingMethod; // 'best' (default) | 'latest'
}

/**
 * Format duration in seconds to "MM:SS" (or "HH:MM:SS" if over an hour)
 * Example: 320s -> "05:20"
 */
export function formatDurationMMSS(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format ISO completedAt date string to "DD/MM/YYYY" per Prompt 16 Section 5
 * Example: "2026-09-03T14:20:00Z" -> "03/09/2026"
 */
export function formatDateDDMMYYYY(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Format ISO date string to "DD/MM/YYYY HH:mm" for detailed tooltips/timestamps
 */
export function formatDateTimeDDMMYYYY(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return '';
  }
}

/**
 * Converts percentage (0-100) to standard 10-point scale number with 1 decimal precision
 * Example: 95% -> 9.5, 100% -> 10.0, 82% -> 8.2
 */
export function getScoreOn10Scale(percentage: number): number {
  if (typeof percentage !== 'number' || isNaN(percentage)) return 0;
  return Math.round(percentage) / 10;
}

/**
 * Core Leaderboard Computation Function
 * Strict implementation of Prompt 16 ranking rules:
 * 1. Higher score ranks higher.
 * 2. Equal scores -> shorter completion time ranks higher.
 * 3. Equal score & completion time -> earlier completedAt submission timestamp ranks higher.
 * 4. Ranking method: 'best' (default) takes best attempt; 'latest' takes most recent attempt.
 */
export function computeLeaderboard(params: LeaderboardFilterParams): {
  entries: LeaderboardEntry[];
  stats: LeaderboardStats;
} {
  const {
    results,
    activityFilter = 'all',
    classFilter = 'all',
    studentSearch = '',
    startDate = '',
    endDate = '',
    rankingMethod = 'best',
  } = params;

  if (!results || results.length === 0) {
    return {
      entries: [],
      stats: {
        studentsRanked: 0,
        averageScore: 0,
        highestScore: 0,
        averageTimeSeconds: 0,
        averageTimeFormatted: '00:00',
      },
    };
  }

  // 1. Filter results based on Activity, Class, Date Range, and Search
  const filteredResults = results.filter((res) => {
    // 1.1 Activity / Assignment filter
    if (activityFilter && activityFilter !== 'all') {
      const match =
        res.assignmentId === activityFilter ||
        res.assignmentCode === activityFilter ||
        res.activityId === activityFilter;
      if (!match) return false;
    }

    // 1.2 Class filter
    if (classFilter && classFilter !== 'all') {
      if (res.studentClass?.trim().toLowerCase() !== classFilter.trim().toLowerCase()) {
        return false;
      }
    }

    // 1.3 Date Range Filter: From Date (00:00:00)
    if (startDate) {
      const startTs = new Date(`${startDate}T00:00:00`).getTime();
      const compTs = new Date(res.completedAt).getTime();
      if (!isNaN(startTs) && compTs < startTs) return false;
    }

    // 1.4 Date Range Filter: To Date (23:59:59 inclusive of whole day per Section 8)
    if (endDate) {
      const endTs = new Date(`${endDate}T23:59:59`).getTime();
      const compTs = new Date(res.completedAt).getTime();
      if (!isNaN(endTs) && compTs > endTs) return false;
    }

    // 1.5 Student Search
    if (studentSearch && studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      const matchName = res.studentName?.toLowerCase().includes(q);
      const matchClass = res.studentClass?.toLowerCase().includes(q);
      const matchId = res.studentId?.toLowerCase().includes(q);
      if (!matchName && !matchClass && !matchId) return false;
    }

    return true;
  });

  if (filteredResults.length === 0) {
    return {
      entries: [],
      stats: {
        studentsRanked: 0,
        averageScore: 0,
        highestScore: 0,
        averageTimeSeconds: 0,
        averageTimeFormatted: '00:00',
      },
    };
  }

  // 2. Group attempts by Student (Key: studentName + studentClass)
  const studentGroups = new Map<string, StudentResult[]>();

  filteredResults.forEach((res) => {
    const sName = res.studentName ? res.studentName.trim() : 'Học sinh';
    const sClass = res.studentClass ? res.studentClass.trim() : 'Chưa phân lớp';
    const key = `${sName.toLowerCase()}___${sClass.toLowerCase()}`;

    if (!studentGroups.has(key)) {
      studentGroups.set(key, []);
    }
    studentGroups.get(key)!.push(res);
  });

  // 3. For each student, select their qualifying attempt based on RankingMethod
  const selectedAttempts: {
    result: StudentResult;
    totalAttempts: number;
  }[] = [];

  studentGroups.forEach((attempts) => {
    const totalAttempts = attempts.length;

    if (rankingMethod === 'latest') {
      // Latest Attempt: Most recent submission by completedAt
      const sortedByLatest = [...attempts].sort((a, b) => {
        const timeA = new Date(a.completedAt).getTime() || 0;
        const timeB = new Date(b.completedAt).getTime() || 0;
        return timeB - timeA;
      });
      selectedAttempts.push({
        result: sortedByLatest[0],
        totalAttempts,
      });
    } else {
      // Best Score (DEFAULT per Section 10):
      // Highest score first. If tied, shorter completion time. If still tied, earlier completedAt.
      const sortedByBest = [...attempts].sort((a, b) => {
        const scoreDiff = (b.percentage || 0) - (a.percentage || 0);
        if (scoreDiff !== 0) return scoreDiff;

        const timeA = a.timeSpentSeconds || 0;
        const timeB = b.timeSpentSeconds || 0;
        const timeDiff = timeA - timeB; // shorter time ranks higher
        if (timeDiff !== 0) return timeDiff;

        const dateA = new Date(a.completedAt).getTime() || 0;
        const dateB = new Date(b.completedAt).getTime() || 0;
        return dateA - dateB; // earlier submission ranks higher
      });

      selectedAttempts.push({
        result: sortedByBest[0],
        totalAttempts,
      });
    }
  });

  // 4. Sort all students by Leaderboard Ranking Rules (Prompt 16 Section 4):
  // Rule 1: Higher score ranks higher.
  // Rule 2: Shorter completion time ranks higher.
  // Rule 3: Submission timestamp as consistent tie-breaker (earlier ranks higher).
  selectedAttempts.sort((itemA, itemB) => {
    const a = itemA.result;
    const b = itemB.result;

    // 1. Higher score / percentage
    const scoreDiff = (b.percentage || 0) - (a.percentage || 0);
    if (scoreDiff !== 0) return scoreDiff;

    // 2. Shorter completion time
    const timeA = a.timeSpentSeconds || 0;
    const timeB = b.timeSpentSeconds || 0;
    const timeDiff = timeA - timeB;
    if (timeDiff !== 0) return timeDiff;

    // 3. Tie-breaker: earlier completedAt
    const dateA = new Date(a.completedAt).getTime() || 0;
    const dateB = new Date(b.completedAt).getTime() || 0;
    return dateA - dateB;
  });

  // 5. Build final Leaderboard Entries with sequential rank (1, 2, 3, 4...)
  let totalScoreSum = 0;
  let highestScore = 0;
  let totalDurationSec = 0;

  const entries: LeaderboardEntry[] = selectedAttempts.map((item, index) => {
    const res = item.result;
    const pct = typeof res.percentage === 'number' ? res.percentage : 0;
    const score10 = getScoreOn10Scale(pct);
    const timeSec = res.timeSpentSeconds || 0;

    totalScoreSum += score10;
    if (score10 > highestScore) {
      highestScore = score10;
    }
    totalDurationSec += timeSec;

    return {
      rank: index + 1,
      studentName: res.studentName || 'Học sinh',
      studentClass: res.studentClass || 'N/A',
      studentId: res.studentId,
      score: score10,
      percentage: pct,
      rawCorrect: typeof res.correctCount === 'number' ? res.correctCount : res.score || 0,
      totalQuestions: res.totalQuestions || 0,
      timeSpentSeconds: timeSec,
      timeFormatted: formatDurationMMSS(timeSec),
      completedAt: res.completedAt,
      dateFormatted: formatDateDDMMYYYY(res.completedAt),
      dateTimeFormatted: formatDateTimeDDMMYYYY(res.completedAt),
      attemptNumber: res.attemptNumber || 1,
      totalAttempts: item.totalAttempts,
      activityTitle: res.activityTitle || 'Hoạt động tương tác',
      assignmentCode: res.assignmentCode || '',
      assignmentId: res.assignmentId || '',
      resultId: res.id,
    };
  });

  // 6. Compute Summary Statistics (Prompt 16 Section 19)
  const count = entries.length;
  const avgScore = count > 0 ? Math.round((totalScoreSum / count) * 10) / 10 : 0;
  const avgTimeSec = count > 0 ? Math.round(totalDurationSec / count) : 0;

  const stats: LeaderboardStats = {
    studentsRanked: count,
    averageScore: avgScore,
    highestScore,
    averageTimeSeconds: avgTimeSec,
    averageTimeFormatted: formatDurationMMSS(avgTimeSec),
  };

  return {
    entries,
    stats,
  };
}
