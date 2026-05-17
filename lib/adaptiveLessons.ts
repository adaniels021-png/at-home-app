import { supabase } from './supabase';

type LessonLogRow = {
  id: string;
  child_id: string;
  category: string;
  lesson_number: number;
  lesson_name: string | null;
  status: string;
  performance: string | null;
  notes: string | null;
  completed_at: string;
  created_at: string;
};

type ReassessmentRow = {
  id: string;
  child_id: string;
  responses: Record<string, string>;
  summary: string | null;
  created_at: string;
};

type AdaptiveCategory =
  | 'Communication'
  | 'Social'
  | 'Play'
  | 'Self-Help'
  | 'Motor';

export type AdaptiveLessonPlan = {
  recommendedCategory: AdaptiveCategory;
  recommendedLessonNumber: number;
  reason: string;
  categoryScores: Record<AdaptiveCategory, number>;
};

const CATEGORY_ORDER: AdaptiveCategory[] = [
  'Communication',
  'Behavior',
  'Learning',
  'Social',
];

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPerformanceScore(performance?: string | null) {
  if (performance === 'easy') return 1;
  if (performance === 'just_right') return 0.72;
  if (performance === 'challenging') return 0.35;
  return 0.5;
}

function getAnswerScore(answer?: string) {
  if (!answer) return 0.5;

  const positive = new Set([
    'Independently',
    'Consistently',
    'Does well',
    'Often',
    'Mostly independent',
    'Independent',
    'Yes',
    'Several minutes',
    'Minimal support',
    'Words or phrases',
    'Smoothly',
    'Rarely',
  ]);

  const moderate = new Set([
    'With prompting',
    'Sometimes',
    'Needs support',
    'Needs some help',
    'In progress',
    'About 1–2 minutes',
    'Moderate support',
    'Gestures or pointing',
    'Some resistance',
  ]);

  if (positive.has(answer)) return 1;
  if (moderate.has(answer)) return 0.6;
  return 0.25;
}

function mapQuestionToCategory(questionId: string): AdaptiveCategory | null {
  const communication = new Set(['1', '2']);
  const social = new Set(['3', '4']);
  const behavior = new Set(['6', '7', '12']);
  const learning = new Set(['5', '8', '9', '10', '11']);

  if (communication.has(questionId)) return 'Communication';
  if (social.has(questionId)) return 'Social';
  if (behavior.has(questionId)) return 'Behavior';
  if (learning.has(questionId)) return 'Learning';
  return null;
}

function buildAssessmentScores(
  reassessment: ReassessmentRow | null
): Record<AdaptiveCategory, number> {
  const base: Record<AdaptiveCategory, number> = {
    Communication: 0.5,
    Behavior: 0.5,
    Learning: 0.5,
    Social: 0.5,
  };

  if (!reassessment?.responses) return base;

  const grouped: Record<AdaptiveCategory, number[]> = {
    Communication: [],
    Behavior: [],
    Learning: [],
    Social: [],
  };

  Object.entries(reassessment.responses).forEach(([questionId, answer]) => {
    const category = mapQuestionToCategory(questionId);
    if (!category) return;
    grouped[category].push(getAnswerScore(answer));
  });

  CATEGORY_ORDER.forEach((category) => {
    if (grouped[category].length) {
      base[category] = average(grouped[category]);
    }
  });

  return base;
}

function buildLessonScores(
  lessonLogs: LessonLogRow[]
): Record<AdaptiveCategory, number> {
  const grouped: Record<AdaptiveCategory, number[]> = {
    Communication: [],
    Behavior: [],
    Learning: [],
    Social: [],
  };

  lessonLogs.forEach((log) => {
    const category = CATEGORY_ORDER.find(
      (item) => item.toLowerCase() === (log.category || '').toLowerCase()
    );

    if (!category) return;
    grouped[category].push(getPerformanceScore(log.performance));
  });

  const scores: Record<AdaptiveCategory, number> = {
    Communication: 0.5,
    Behavior: 0.5,
    Learning: 0.5,
    Social: 0.5,
  };

  CATEGORY_ORDER.forEach((category) => {
    if (grouped[category].length) {
      scores[category] = average(grouped[category]);
    }
  });

  return scores;
}

function buildRecentPenalty(
  lessonLogs: LessonLogRow[]
): Record<AdaptiveCategory, number> {
  const recent = lessonLogs.slice(0, 6);

  const counts: Record<AdaptiveCategory, number> = {
    Communication: 0,
    Behavior: 0,
    Learning: 0,
    Social: 0,
  };

  recent.forEach((log) => {
    const category = CATEGORY_ORDER.find(
      (item) => item.toLowerCase() === (log.category || '').toLowerCase()
    );
    if (!category) return;
    counts[category] += 1;
  });

  const penalty: Record<AdaptiveCategory, number> = {
    Communication: 0,
    Behavior: 0,
    Learning: 0,
    Social: 0,
  };

  CATEGORY_ORDER.forEach((category) => {
    penalty[category] = counts[category] * 0.08;
  });

  return penalty;
}

function getNextLessonNumber(
  lessonLogs: LessonLogRow[],
  category: AdaptiveCategory
) {
  const categoryLogs = lessonLogs.filter(
    (log) => (log.category || '').toLowerCase() === category.toLowerCase()
  );

  if (!categoryLogs.length) return 1;

  const maxLesson = Math.max(
    ...categoryLogs.map((log) => Number(log.lesson_number) || 0)
  );

  return maxLesson + 1;
}

function buildReason(
  category: AdaptiveCategory,
  finalScores: Record<AdaptiveCategory, number>,
  assessmentScores: Record<AdaptiveCategory, number>,
  lessonScores: Record<AdaptiveCategory, number>
) {
  const assessmentScore = assessmentScores[category];
  const lessonScore = lessonScores[category];

  if (assessmentScore < 0.45 && lessonScore < 0.55) {
    return `${category} is currently the weakest area based on both reassessment and recent lesson performance.`;
  }

  if (assessmentScore < 0.45) {
    return `${category} needs more support based on the latest reassessment.`;
  }

  if (lessonScore < 0.55) {
    return `${category} needs more practice based on recent lesson performance.`;
  }

  return `${category} is the best next focus based on the current balance of progress and recent practice.`;
}

export async function getAdaptiveLessonPlan(
  childId: string
): Promise<AdaptiveLessonPlan> {
  try {
    const [lessonRes, reassessmentRes] = await Promise.all([
      supabase
        .from('lesson_logs')
        .select('*')
        .eq('child_id', childId)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(50),

      supabase
        .from('reassessments')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    if (lessonRes.error) throw lessonRes.error;
    if (reassessmentRes.error) throw reassessmentRes.error;

    const lessonLogs = (lessonRes.data || []) as LessonLogRow[];
    const latestReassessment =
      ((reassessmentRes.data || [])[0] as ReassessmentRow | undefined) || null;

    const assessmentScores = buildAssessmentScores(latestReassessment);
    const lessonScores = buildLessonScores(lessonLogs);
    const recentPenalty = buildRecentPenalty(lessonLogs);

    const finalScores: Record<AdaptiveCategory, number> = {
      Communication: 0,
      Behavior: 0,
      Learning: 0,
      Social: 0,
    };

    CATEGORY_ORDER.forEach((category) => {
      const combined =
        assessmentScores[category] * 0.55 +
        lessonScores[category] * 0.45 -
        recentPenalty[category];

      finalScores[category] = clamp(combined);
    });

    const sorted = [...CATEGORY_ORDER].sort(
      (a, b) => finalScores[a] - finalScores[b]
    );

    const recommendedCategory = sorted[0];
    const recommendedLessonNumber = getNextLessonNumber(
      lessonLogs,
      recommendedCategory
    );
    const reason = buildReason(
      recommendedCategory,
      finalScores,
      assessmentScores,
      lessonScores
    );

    return {
      recommendedCategory,
      recommendedLessonNumber,
      reason,
      categoryScores: finalScores,
    };
  } catch (error) {
    console.error('Adaptive lesson planning error:', error);

    return {
      recommendedCategory: 'Communication',
      recommendedLessonNumber: 1,
      reason:
        'Communication is the default starting point while more progress data is being collected.',
      categoryScores: {
        Communication: 0.4,
        Behavior: 0.5,
        Learning: 0.5,
        Social: 0.5,
      },
    };
  }
}