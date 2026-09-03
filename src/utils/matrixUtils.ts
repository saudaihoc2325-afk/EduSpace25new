import { QuestionSet, QuestionItem } from '../types';

export interface MatrixQuestionRow {
  id: string;
  order: number;
  questionNumber: number;
  questionText: string;
  optionsCount: number;
  options: { id?: string; label?: string; text: string; isCorrect?: boolean }[];
  correctAnswerText: string;
  unit: string | null;
  topic: string | null;
  skill: string | null;
  questionType: string | null;
  difficulty: string | null;
  cognitiveLevel: string | null;
  explanation?: string | null;
  points?: number;
}

export interface DistributionCategory {
  category: string;
  count: number;
  percentage: number;
}

export interface DistributionSection {
  title: string;
  isAvailable: boolean;
  emptyMessage: string;
  items: DistributionCategory[];
}

export interface TestBlueprintMatrix {
  questionSetId: string;
  questionSetTitle: string;
  totalQuestions: number;
  rows: MatrixQuestionRow[];
  cognitiveLevelDistribution: DistributionSection;
  difficultyDistribution: DistributionSection;
  unitDistribution: DistributionSection;
  skillDistribution: DistributionSection;
  questionTypeDistribution: DistributionSection;
  hasAnyMetadata: boolean;
  metadataCompletionRate: number;
}

/**
 * Builds the Test Blueprint / Matrix structure strictly from the actual Question Set data.
 * Rule: NEVER invent or guess metadata. If missing, show "Not specified" or "N/A".
 */
export function buildTestBlueprintMatrix(
  questionSet: QuestionSet | null | undefined
): TestBlueprintMatrix | null {
  if (!questionSet) {
    return null;
  }

  const rawQuestions = Array.isArray(questionSet.questions) ? questionSet.questions : [];
  const totalQuestions = rawQuestions.length;

  const rows: MatrixQuestionRow[] = rawQuestions.map((q: QuestionItem, idx: number) => {
    const qNum = typeof q.order === 'number' && q.order > 0 ? q.order : idx + 1;

    // Unit & Topic
    const unitVal = q.unit?.trim() ? q.unit.trim() : null;
    const topicVal = q.topic?.trim()
      ? q.topic.trim()
      : q.lesson?.trim()
      ? q.lesson.trim()
      : null;

    // Skill
    const skillVal = q.skill?.trim() ? q.skill.trim() : null;

    // Question Type
    const qTypeVal = q.questionType?.trim() ? q.questionType.trim() : null;

    // Difficulty
    const diffVal = q.difficulty?.trim()
      ? q.difficulty.trim()
      : q.level?.trim()
      ? q.level.trim()
      : null;

    // Cognitive Level
    const cogVal = q.cognitiveLevel?.trim() ? q.cognitiveLevel.trim() : null;

    // Correct Answer Text
    let correctText = q.correctAnswerText || q.correctAnswer || '';
    if (!correctText && q.correctAnswerId && Array.isArray(q.options)) {
      const matched = q.options.find((o) => o.id === q.correctAnswerId);
      if (matched) {
        correctText = matched.text;
      }
    }

    return {
      id: q.id || `matrix_q_${idx}`,
      order: q.order || idx + 1,
      questionNumber: qNum,
      questionText: q.question || `Câu hỏi #${qNum}`,
      optionsCount: Array.isArray(q.options) ? q.options.length : 0,
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswerText: correctText,
      unit: unitVal,
      topic: topicVal,
      skill: skillVal,
      questionType: qTypeVal,
      difficulty: diffVal,
      cognitiveLevel: cogVal,
      explanation: q.explanation || null,
      points: q.points,
    };
  });

  // Helper to calculate distribution only for categories actually present
  const computeDistribution = (
    accessor: (r: MatrixQuestionRow) => string | null,
    title: string,
    emptyMessage: string
  ): DistributionSection => {
    if (totalQuestions === 0) {
      return { title, isAvailable: false, emptyMessage, items: [] };
    }

    const counts = new Map<string, number>();
    let validCount = 0;

    rows.forEach((r) => {
      const val = accessor(r);
      if (val && val.trim()) {
        const key = val.trim();
        counts.set(key, (counts.get(key) || 0) + 1);
        validCount++;
      }
    });

    if (validCount === 0 || counts.size === 0) {
      return {
        title,
        isAvailable: false,
        emptyMessage,
        items: [],
      };
    }

    const items: DistributionCategory[] = [];
    counts.forEach((count, category) => {
      items.push({
        category,
        count,
        percentage: Math.round((count / totalQuestions) * 100),
      });
    });

    // Sort descending by count, then alphabetically
    items.sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

    return {
      title,
      isAvailable: true,
      emptyMessage,
      items,
    };
  };

  // 1. Cognitive Level Distribution
  const cognitiveLevelDistribution = computeDistribution(
    (r) => r.cognitiveLevel,
    'Cấp Độ Nhận Thức (Cognitive Level)',
    'Difficulty/Cognitive Level not specified.'
  );

  // 2. Difficulty Distribution
  const difficultyDistribution = computeDistribution(
    (r) => r.difficulty,
    'Mức Độ Khó (Difficulty Level)',
    'Difficulty/Cognitive Level not specified.'
  );

  // 3. Unit / Topic Distribution
  const unitDistribution = computeDistribution(
    (r) => {
      if (r.unit && r.topic) return `${r.unit} - ${r.topic}`;
      if (r.unit) return r.unit;
      if (r.topic) return r.topic;
      return null;
    },
    'Phân Bố Unit / Topic',
    'Unit/Topic information is not available.'
  );

  // 4. Skill Distribution
  const skillDistribution = computeDistribution(
    (r) => r.skill,
    'Phân Bố Kỹ Năng (Skill Distribution)',
    'Skill information is not available.'
  );

  // 5. Question Type Distribution
  const questionTypeDistribution = computeDistribution(
    (r) => r.questionType,
    'Dạng Câu Hỏi (Question Type Distribution)',
    'Question Type information is not available.'
  );

  const classifiedCount = rows.filter(
    (r) => Boolean(r.unit || r.topic || r.skill || r.difficulty || r.cognitiveLevel || r.questionType)
  ).length;

  const metadataCompletionRate =
    totalQuestions > 0 ? Math.round((classifiedCount / totalQuestions) * 100) : 0;

  return {
    questionSetId: questionSet.id,
    questionSetTitle: questionSet.title || 'Bộ Câu Hỏi',
    totalQuestions,
    rows,
    cognitiveLevelDistribution,
    difficultyDistribution,
    unitDistribution,
    skillDistribution,
    questionTypeDistribution,
    hasAnyMetadata: classifiedCount > 0,
    metadataCompletionRate,
  };
}
