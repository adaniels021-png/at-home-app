import { supabase } from './supabase';

export type LessonDifficultyTrend = 'increase' | 'decrease' | 'maintain';

export type AdaptiveDecision = {
  category: string;
  skillTarget: string;
  difficultyTrend: LessonDifficultyTrend;
  supportLevel: 'high_support' | 'balanced' | 'challenge';
  reason: string;
  avoidSkills: string[];
  behaviorStrategy: {
    strategy: string;
    summary: string;
  };
};

const SKILL_PROGRESSION_PATHS: Record<string, string[]> = {
  Communication: [
    'Requesting help',
    'Requesting more',
    'Requesting a break',
    'Making a choice between two items',
    'Answering yes/no questions',
    'Using two-word phrases',
    'Using three-word phrases',
    'Requesting attention appropriately',
  ],
  Social: [
    'Responding to name',
    'Making eye contact briefly',
    'Taking turns',
    'Imitating simple actions',
    'Greeting familiar people',
    'Sharing attention with an adult',
  ],
  Play: [
    'Exploring toys appropriately',
    'Imitating play actions',
    'Functional play with one toy',
    'Taking turns during play',
    'Simple pretend play',
  ],
  'Self-Help': [
    'Following one-step directions',
    'Cleaning up one item',
    'Washing hands with prompts',
    'Washing hands independently',
    'Getting dressed with support',
  ],
  Motor: [
    'Imitating gross motor movements',
    'Stacking blocks',
    'Completing simple puzzles',
    'Using crayons or markers',
    'Following movement directions',
  ],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

export async function getAdaptiveLessonDecision({
  childId,
  category,
}: {
  childId: string;
  category: string;
}): Promise<AdaptiveDecision> {
  const path = SKILL_PROGRESSION_PATHS[category] || [category];

  const { data: recentLogs } = await supabase
    .from('lesson_logs')
    .select(
      'lesson_name, performance_score, prompt_level, behavior_response, consistency_level, completed_at'
    )
    .eq('child_id', childId)
    .eq('category', category)
    .order('completed_at', { ascending: false })
    .limit(12);

  const { data: masteryRows } = await supabase
    .from('skill_mastery')
    .select('skill_target, attempts, successful_attempts, average_score, mastery_status')
    .eq('child_id', childId)
    .eq('category', category);

  const logs = recentLogs || [];
  const mastery = masteryRows || [];

  const avoidSkills = logs
    .map((row: any) => row.lesson_name)
    .filter(Boolean)
    .slice(0, 8);

  const scores = logs.map((row: any) => Number(row.performance_score || 0));
  const averageScore =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 70;

  const frustratedCount = logs.filter(
    (row: any) =>
      row.behavior_response === 'frustrated' ||
      row.behavior_response === 'avoidant'
  ).length;

  const physicalPromptCount = logs.filter(
    (row: any) => row.prompt_level === 'physical'
  ).length;

  const independentCount = logs.filter(
    (row: any) =>
      row.prompt_level === 'independent' ||
      row.behavior_response === 'independent'
  ).length;

  const lowConsistencyCount = logs.filter(
    (row: any) => row.consistency_level === 'low'
  ).length;

  let difficultyTrend: LessonDifficultyTrend = 'maintain';
  let supportLevel: AdaptiveDecision['supportLevel'] = 'balanced';
  let reason = 'Recent performance suggests a balanced lesson is appropriate.';

  if (averageScore >= 85 && independentCount >= 2) {
    difficultyTrend = 'increase';
    supportLevel = 'challenge';
    reason =
      'Recent lessons show strong performance and independence, so the next lesson can increase challenge slightly.';
  }

  if (
    averageScore < 60 ||
    frustratedCount >= 2 ||
    physicalPromptCount >= 2 ||
    lowConsistencyCount >= 2
  ) {
    difficultyTrend = 'decrease';
    supportLevel = 'high_support';
    reason =
      'Recent lessons show difficulty, frustration, high prompting, or low consistency, so the next lesson should be simplified.';
  }

  const masteredSkills = new Set(
    mastery
      .filter((row: any) => row.mastery_status === 'mastered')
      .map((row: any) => normalize(row.skill_target))
  );

  const practicingSkill = mastery.find(
    (row: any) =>
      row.mastery_status === 'practicing' &&
      Number(row.average_score || 0) < 85
  );

  const emergingSkill = mastery.find(
    (row: any) =>
      row.mastery_status === 'emerging' ||
      Number(row.average_score || 0) < 60
  );

  let skillTarget = path[0];

  if (supportLevel === 'high_support' && emergingSkill?.skill_target) {
    skillTarget = emergingSkill.skill_target;
  } else if (practicingSkill?.skill_target) {
    skillTarget = practicingSkill.skill_target;
  } else {
    skillTarget =
      path.find((skill) => !masteredSkills.has(normalize(skill))) ||
      path[path.length - 1] ||
      category;
  }

  let behaviorStrategy = {
    strategy: 'balanced',
    summary:
      'Use clear instructions, wait time, least-to-most prompting, and immediate reinforcement.',
  };

  if (supportLevel === 'high_support') {
    behaviorStrategy = {
      strategy: 'increase_support',
      summary:
        'Shorten the task, reduce response demand, use stronger prompts, and reinforce small attempts quickly.',
    };
  }

  if (supportLevel === 'challenge') {
    behaviorStrategy = {
      strategy: 'fade_prompts',
      summary:
        'Increase independence by using longer wait time, fewer prompts, and varied examples.',
    };
  }

  if (lowConsistencyCount >= 2) {
    behaviorStrategy = {
      strategy: 'repeat_with_variation',
      summary:
        'Repeat the target skill with different materials, more practice opportunities, and consistent reinforcement.',
    };
  }

  return {
    category,
    skillTarget,
    difficultyTrend,
    supportLevel,
    reason,
    avoidSkills,
    behaviorStrategy,
  };
}