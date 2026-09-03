import { StudentResult, StudentAnswerRecord, Assignment, Activity, QuestionSet, QuestionOption } from '../types';

export interface QuestionOptionDetail {
  id?: string;
  label: string; // 'A', 'B', 'C', 'D'
  text: string;
  isCorrect?: boolean;
  count: number;
  percentage: number;
}

export interface QuestionAnalysisItem {
  questionId: string;
  questionNumber: number;
  questionText: string;
  timesAttempted: number; // Total Attempts
  totalAttempts: number; // alias
  correctAnswers: number; // Correct
  correctCount: number; // alias
  wrongAnswers: number; // Wrong
  accuracyRate: number | null; // Correct / Total * 100, null if totalAttempts === 0
  accuracyPercentage: number | null; // alias
  errorRate: number; // Wrong / Total * 100
  hasValidResponseData: boolean;
  difficulty?: string;
  cognitiveLevel?: string;
  unit?: string;
  topic?: string;
  skill?: string;
  questionType?: string;
  averageTimeSeconds?: number;
  explanation?: string;
  correctAnswer: string;
  options?: QuestionOptionDetail[];
  optionBreakdown: {
    label: string;
    text: string;
    count: number;
    percentage: number;
    isCorrect: boolean;
  }[];
  hasSelectedAnswerData: boolean;
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
 * Check if the provided results contain any question-level response records
 */
export function hasQuestionLevelResponses(results: StudentResult[]): boolean {
  if (!Array.isArray(results) || results.length === 0) return false;
  return results.some((r) => {
    const ansList = Array.isArray(r.answers)
      ? r.answers
      : Array.isArray((r as any).questionAnswers)
      ? (r as any).questionAnswers
      : [];
    return ansList.length > 0;
  });
}

/**
 * Perform comprehensive item-level Question Error Analysis
 */
export function analyzeQuestions(
  results: StudentResult[],
  activities?: Activity[],
  questionSets?: QuestionSet[],
  targetQuestionSetId?: string | null
): QuestionAnalysisItem[] {
  // 1. Build master question lookup map from QuestionSets and Activities
  const masterQuestionMap = new Map<
    string,
    {
      question: any;
      questionNumber: number;
    }
  >();

  if (Array.isArray(questionSets)) {
    questionSets.forEach((qs) => {
      (qs.questions || []).forEach((q, idx) => {
        if (q && q.id) {
          masterQuestionMap.set(q.id, {
            question: q,
            questionNumber: typeof q.order === 'number' && q.order > 0 ? q.order : idx + 1,
          });
        }
      });
    });
  }

  if (Array.isArray(activities)) {
    activities.forEach((act) => {
      const qList = act.questionSet?.questions;
      if (Array.isArray(qList)) {
        qList.forEach((q, idx) => {
          if (q && q.id && !masterQuestionMap.has(q.id)) {
            masterQuestionMap.set(q.id, {
              question: q,
              questionNumber: typeof q.order === 'number' && q.order > 0 ? q.order : idx + 1,
            });
          }
        });
      }
    });
  }

  // 2. Aggregate student answers by question
  const questionMap = new Map<
    string,
    {
      questionId: string;
      questionText: string;
      correctAnswer: string;
      explanation?: string;
      answers: StudentAnswerRecord[];
      fallbackNumber: number;
    }
  >();

  // If a specific QuestionSet is targeted, pre-seed all its questions
  if (targetQuestionSetId && Array.isArray(questionSets)) {
    const targetQS = questionSets.find((qs) => qs.id === targetQuestionSetId);
    if (targetQS && Array.isArray(targetQS.questions)) {
      targetQS.questions.forEach((q, idx) => {
        const qNum = typeof q.order === 'number' && q.order > 0 ? q.order : idx + 1;
        questionMap.set(q.id, {
          questionId: q.id,
          questionText: q.question || `Câu hỏi #${qNum}`,
          correctAnswer: q.correctAnswerText || q.correctAnswer || '',
          explanation: q.explanation || undefined,
          answers: [],
          fallbackNumber: qNum,
        });
      });
    }
  }

  let counter = 0;
  if (Array.isArray(results)) {
    results.forEach((res) => {
      const ansList = Array.isArray(res.answers)
        ? res.answers
        : Array.isArray((res as any).questionAnswers)
        ? (res as any).questionAnswers
        : [];

      ansList.forEach((ans: any) => {
        const qId = ans.questionId || ans.questionText || `unknown_question_${counter}`;
        const existing = questionMap.get(qId) || {
          questionId: qId,
          questionText: ans.questionText || 'Câu hỏi',
          correctAnswer: ans.correctAnswer || '',
          explanation: ans.explanation,
          answers: [],
          fallbackNumber: ++counter,
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
  }

  if (questionMap.size === 0) {
    return [];
  }

  const analysisItems: QuestionAnalysisItem[] = [];

  // 3. Calculate Error Rate, Accuracy Rate, and Distractor Analysis for each question
  questionMap.forEach((qData) => {
    const totalAttempts = qData.answers.length;

    // Check master question reference
    const masterRef = masterQuestionMap.get(qData.questionId);
    const masterQ = masterRef?.question;

    const questionNumber = masterRef?.questionNumber || qData.fallbackNumber;
    const questionText = masterQ?.question || qData.questionText;
    const correctAnswer =
      masterQ?.correctAnswerText ||
      masterQ?.correctAnswer ||
      qData.correctAnswer ||
      '';
    const explanation = masterQ?.explanation || qData.explanation;

    const hasValidResponseData = totalAttempts > 0;
    const correctAnswers = hasValidResponseData
      ? qData.answers.filter((a) => a.isCorrect === true).length
      : 0;
    const wrongAnswers = hasValidResponseData ? totalAttempts - correctAnswers : 0;
    const accuracyRate = hasValidResponseData
      ? Math.round((correctAnswers / totalAttempts) * 100)
      : null;
    const errorRate = hasValidResponseData
      ? Math.round((wrongAnswers / totalAttempts) * 100)
      : 0;

    // Metadata ONLY from QuestionSet if actually present. NEVER fabricate!
    const difficulty = masterQ?.difficulty?.trim()
      ? masterQ.difficulty.trim()
      : masterQ?.level?.trim()
      ? masterQ.level.trim()
      : undefined;
    const cognitiveLevel = masterQ?.cognitiveLevel?.trim() ? masterQ.cognitiveLevel.trim() : undefined;
    const unit = masterQ?.unit?.trim() ? masterQ.unit.trim() : undefined;
    const topic = masterQ?.topic?.trim()
      ? masterQ.topic.trim()
      : masterQ?.lesson?.trim()
      ? masterQ.lesson.trim()
      : undefined;
    const skill = masterQ?.skill?.trim() ? masterQ.skill.trim() : undefined;
    const questionType = masterQ?.questionType?.trim() ? masterQ.questionType.trim() : undefined;

    const totalTime = qData.answers.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0);
    const averageTimeSeconds = totalAttempts > 0 ? Math.round(totalTime / totalAttempts) : undefined;

    // Compute raw distractor options count
    const distractorCounts = new Map<string, number>();
    let hasSelectedAnswerData = false;

    qData.answers.forEach((ans) => {
      if (ans.selectedAnswer && ans.selectedAnswer.trim() && ans.selectedAnswer !== 'Chưa trả lời') {
        hasSelectedAnswerData = true;
      }
      const choice = (ans.selectedAnswer || 'Không trả lời').trim();
      distractorCounts.set(choice, (distractorCounts.get(choice) || 0) + 1);
    });

    const distractors: { answerText: string; count: number; percentage: number }[] = [];
    distractorCounts.forEach((count, answerText) => {
      distractors.push({
        answerText,
        count,
        percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
      });
    });
    distractors.sort((a, b) => b.count - a.count);

    // 4. Compute Structured Option Breakdown (A, B, C, D)
    let optionBreakdown: {
      label: string;
      text: string;
      count: number;
      percentage: number;
      isCorrect: boolean;
    }[] = [];

    const optionsList = masterQ?.options;
    if (Array.isArray(optionsList) && optionsList.length > 0) {
      optionBreakdown = optionsList.map((opt: any, optIdx: number) => {
        const optLabel = opt.label || String.fromCharCode(65 + optIdx);
        const isCorrect = Boolean(
          opt.isCorrect ||
          (opt.id && masterQ.correctAnswerId && opt.id === masterQ.correctAnswerId) ||
          (opt.text && correctAnswer && opt.text.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) ||
          (optLabel && correctAnswer && optLabel.trim().toLowerCase() === correctAnswer.trim().toLowerCase())
        );

        const count = qData.answers.filter((ans) => {
          if (!ans.selectedAnswer && !ans.selectedAnswerId) return false;
          if (ans.selectedAnswerId && opt.id && ans.selectedAnswerId === opt.id) return true;
          const sel = (ans.selectedAnswer || '').trim().toLowerCase();
          const optText = (opt.text || '').trim().toLowerCase();
          const lbl = optLabel.toLowerCase();
          if (sel && optText && sel === optText) return true;
          if (sel && (sel === lbl || sel === `${lbl}.` || sel.startsWith(`${lbl}. `) || sel.startsWith(`${lbl}: `))) return true;
          return false;
        }).length;

        return {
          label: optLabel,
          text: opt.text || `Lựa chọn ${optLabel}`,
          count,
          percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
          isCorrect,
        };
      });
    } else {
      // Fallback if question options are not explicitly defined
      optionBreakdown = distractors.map((d, dIdx) => ({
        label: String.fromCharCode(65 + dIdx),
        text: d.answerText,
        count: d.count,
        percentage: d.percentage,
        isCorrect: Boolean(correctAnswer && d.answerText.trim().toLowerCase() === correctAnswer.trim().toLowerCase()),
      }));
    }

    analysisItems.push({
      questionId: qData.questionId,
      questionNumber,
      questionText,
      timesAttempted: totalAttempts,
      totalAttempts,
      correctAnswers,
      correctCount: correctAnswers,
      wrongAnswers,
      accuracyRate,
      accuracyPercentage: accuracyRate,
      errorRate,
      hasValidResponseData,
      difficulty,
      cognitiveLevel,
      unit,
      topic,
      skill,
      questionType,
      averageTimeSeconds,
      explanation,
      correctAnswer,
      options: optionBreakdown,
      optionBreakdown,
      hasSelectedAnswerData,
      distractors,
    });
  });

  // Sort: questions with valid response data sorted by highest Error Rate, secondary by wrongAnswers, then timesAttempted, then questionNumber
  return analysisItems.sort((a, b) => {
    if (a.hasValidResponseData !== b.hasValidResponseData) {
      return a.hasValidResponseData ? -1 : 1;
    }
    const diffError = b.errorRate - a.errorRate;
    if (diffError !== 0) return diffError;
    const diffWrong = b.wrongAnswers - a.wrongAnswers;
    if (diffWrong !== 0) return diffWrong;
    const diffAttempts = b.timesAttempted - a.timesAttempted;
    if (diffAttempts !== 0) return diffAttempts;
    return a.questionNumber - b.questionNumber;
  });
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
