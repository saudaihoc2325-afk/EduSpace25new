import { StudentResult, StudentAnswerRecord, Assignment } from '../types';

export interface QuestionAnalysisItem {
  questionId: string;
  questionText: string;
  totalAttempts: number;
  correctCount: number;
  accuracyPercentage: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  averageTimeSeconds?: number;
  explanation?: string;
  correctAnswer: string;
  distractors: {
    answerText: string;
    count: number;
    percentage: number;
  }[];
}

export interface StudentPerformanceSummary {
  studentName: string;
  studentClass: string;
  studentId?: string;
  totalAttempts: number;
  bestScore: number;
  bestPercentage: number;
  latestScore: number;
  latestPercentage: number;
  averagePercentage: number;
  averageTimeSpentSeconds: number;
  attempts: StudentResult[];
  lastCompletedAt: string;
}

export interface ScoreDistributionBracket {
  range: string;
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  colorClass: string;
  bgClass: string;
}

export interface PerformanceTier {
  tier: 'Excellent' | 'Good' | 'Fair' | 'Average' | 'NeedsImprovement';
  label: string;
  subLabel: string;
  minPercentage: number;
  maxPercentage: number;
  count: number;
  percentage: number;
  badgeClass: string;
  borderClass: string;
}

/**
 * Group results by unique student (Name + Class) and compute metrics
 */
export function groupResultsByStudent(results: StudentResult[]): StudentPerformanceSummary[] {
  const map = new Map<string, StudentResult[]>();

  results.forEach((res) => {
    const key = `${res.studentName.trim().toLowerCase()}___${res.studentClass.trim().toLowerCase()}`;
    const list = map.get(key) || [];
    list.push(res);
    map.set(key, list);
  });

  const summaries: StudentPerformanceSummary[] = [];

  map.forEach((attempts) => {
    // Sort attempts by completion date ascending
    const sorted = [...attempts].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    const bestPercentage = Math.max(...sorted.map((a) => a.percentage));
    const bestAttempt = sorted.find((a) => a.percentage === bestPercentage) || latest;

    const avgPct = Math.round(
      sorted.reduce((acc, a) => acc + a.percentage, 0) / sorted.length
    );
    const avgTime = Math.round(
      sorted.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0) / sorted.length
    );

    summaries.push({
      studentName: first.studentName,
      studentClass: first.studentClass,
      studentId: first.studentId || latest.studentId,
      totalAttempts: sorted.length,
      bestScore: bestAttempt.score,
      bestPercentage,
      latestScore: latest.score,
      latestPercentage: latest.percentage,
      averagePercentage: avgPct,
      averageTimeSpentSeconds: avgTime,
      attempts: sorted.reverse(), // most recent first for timeline
      lastCompletedAt: latest.completedAt,
    });
  });

  // Sort by student name alphabetical
  return summaries.sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'));
}

/**
 * Perform comprehensive item-level question analysis
 */
export function analyzeQuestions(results: StudentResult[]): QuestionAnalysisItem[] {
  const questionMap = new Map<
    string,
    {
      questionId: string;
      questionText: string;
      correctAnswer: string;
      explanation?: string;
      answers: StudentAnswerRecord[];
    }
  >();

  results.forEach((res) => {
    (res.answers || []).forEach((ans) => {
      const qId = ans.questionId || ans.questionText || 'unknown_question';
      const existing = questionMap.get(qId) || {
        questionId: qId,
        questionText: ans.questionText || 'Câu hỏi',
        correctAnswer: ans.correctAnswer || '',
        explanation: ans.explanation,
        answers: [],
      };

      if (!existing.correctAnswer && ans.correctAnswer) {
        existing.correctAnswer = ans.correctAnswer;
      }
      if (!existing.explanation && ans.explanation) {
        existing.explanation = ans.explanation;
      }
      if (ans.questionText && existing.questionText === 'Câu hỏi') {
        existing.questionText = ans.questionText;
      }

      existing.answers.push(ans);
      questionMap.set(qId, existing);
    });
  });

  const analysisItems: QuestionAnalysisItem[] = [];

  questionMap.forEach((qData) => {
    const totalAttempts = qData.answers.length;
    if (totalAttempts === 0) return;

    const correctCount = qData.answers.filter((a) => a.isCorrect).length;
    const accuracyPercentage = Math.round((correctCount / totalAttempts) * 100);

    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    if (accuracyPercentage >= 75) difficulty = 'Easy';
    else if (accuracyPercentage < 50) difficulty = 'Hard';

    const totalTime = qData.answers.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0);
    const averageTimeSeconds = Math.round(totalTime / totalAttempts);

    // Compute distractor options
    const distractorCounts = new Map<string, number>();
    qData.answers.forEach((ans) => {
      const choice = (ans.selectedAnswer || 'Không trả lời').trim();
      distractorCounts.set(choice, (distractorCounts.get(choice) || 0) + 1);
    });

    const distractors: { answerText: string; count: number; percentage: number }[] = [];
    distractorCounts.forEach((count, answerText) => {
      distractors.push({
        answerText,
        count,
        percentage: Math.round((count / totalAttempts) * 100),
      });
    });

    distractors.sort((a, b) => b.count - a.count);

    analysisItems.push({
      questionId: qData.questionId,
      questionText: qData.questionText,
      totalAttempts,
      correctCount,
      accuracyPercentage,
      difficulty,
      averageTimeSeconds,
      explanation: qData.explanation,
      correctAnswer: qData.correctAnswer,
      distractors,
    });
  });

  // Sort hardest first (lowest accuracy %)
  return analysisItems.sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);
}

/**
 * Compute 5-bracket Score Distribution (Histogram)
 */
export function computeScoreDistribution(results: StudentResult[]): ScoreDistributionBracket[] {
  const brackets: ScoreDistributionBracket[] = [
    { range: '0-20%', label: '0 - 20%', min: 0, max: 20, count: 0, percentage: 0, colorClass: 'text-rose-600', bgClass: 'bg-rose-500' },
    { range: '21-40%', label: '21 - 40%', min: 21, max: 40, count: 0, percentage: 0, colorClass: 'text-orange-600', bgClass: 'bg-orange-500' },
    { range: '41-60%', label: '41 - 60%', min: 41, max: 60, count: 0, percentage: 0, colorClass: 'text-amber-600', bgClass: 'bg-amber-500' },
    { range: '61-80%', label: '61 - 80%', min: 61, max: 80, count: 0, percentage: 0, colorClass: 'text-sky-600', bgClass: 'bg-sky-500' },
    { range: '81-100%', label: '81 - 100%', min: 81, max: 100, count: 0, percentage: 0, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-500' },
  ];

  const total = results.length;
  if (total === 0) return brackets;

  results.forEach((r) => {
    const pct = Math.max(0, Math.min(100, r.percentage));
    const target = brackets.find((b) => pct >= b.min && pct <= b.max);
    if (target) {
      target.count += 1;
    } else {
      brackets[0].count += 1;
    }
  });

  brackets.forEach((b) => {
    b.percentage = Math.round((b.count / total) * 100);
  });

  return brackets;
}

/**
 * Compute Vietnamese High School Performance Tiers
 */
export function computePerformanceTiers(results: StudentResult[]): PerformanceTier[] {
  const tiers: PerformanceTier[] = [
    {
      tier: 'Excellent',
      label: 'Xuất sắc',
      subLabel: '90% - 100%',
      minPercentage: 90,
      maxPercentage: 100,
      count: 0,
      percentage: 0,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      borderClass: 'border-emerald-500',
    },
    {
      tier: 'Good',
      label: 'Giỏi',
      subLabel: '80% - 89%',
      minPercentage: 80,
      maxPercentage: 89,
      count: 0,
      percentage: 0,
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
      borderClass: 'border-teal-500',
    },
    {
      tier: 'Fair',
      label: 'Khá',
      subLabel: '65% - 79%',
      minPercentage: 65,
      maxPercentage: 79,
      count: 0,
      percentage: 0,
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      borderClass: 'border-indigo-500',
    },
    {
      tier: 'Average',
      label: 'Trung bình',
      subLabel: '50% - 64%',
      minPercentage: 50,
      maxPercentage: 64,
      count: 0,
      percentage: 0,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      borderClass: 'border-amber-500',
    },
    {
      tier: 'NeedsImprovement',
      label: 'Chưa đạt / Cần cố gắng',
      subLabel: '< 50%',
      minPercentage: 0,
      maxPercentage: 49,
      count: 0,
      percentage: 0,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      borderClass: 'border-rose-500',
    },
  ];

  const total = results.length;
  if (total === 0) return tiers;

  results.forEach((r) => {
    const pct = Math.max(0, Math.min(100, r.percentage));
    const target = tiers.find((t) => pct >= t.minPercentage && pct <= t.maxPercentage);
    if (target) {
      target.count += 1;
    } else {
      tiers[tiers.length - 1].count += 1;
    }
  });

  tiers.forEach((t) => {
    t.percentage = Math.round((t.count / total) * 100);
  });

  return tiers;
}
