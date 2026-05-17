import { supabase } from './supabase';


export type ProgressionDecision = {
  category: string;
  skillTarget: string;
  difficultyTrend: 'increase' | 'decrease' | 'maintain';
  reason: string;
  shouldRepeatSkill: boolean;
};

const SKILL_PATHS: Record<string, string[]> = {
  Communication: [
    'Requesting help',
    'Requesting more',
    'Requesting a break',
    'Making a choice',
    'Answering yes/no',
    'Using two-word phrases',
    'Requesting attention',
  ],
  Social: [
    'Responding to name',
    'Imitating actions',
    'Taking turns',
    'Greeting others',
    'Sharing attention',
  ],
  Play: [
    'Functional play',
    'Imitating play actions',
    'Turn-taking play',
    'Pretend play',
    'Flexible play',
  ],
  'Self-Help': [
    'Following one-step directions',
    'Cleaning up',
    'Washing hands',
    'Dressing with support',
    'Independent routine steps',
  ],
  Motor: [
    'Gross motor imitation',
    'Stacking blocks',
    'Simple puzzles',
    'Using crayons',
    'Movement directions',
  ],
};

export async function getProgressionDecision({
  childId,
  category,
}: {
  childId: string;
  category: string;
}): Promise<ProgressionDecision> {
  const path = SKILL_PATHS[category] || [category];

  const { data: mastery } = await supabase
    .from('skill_mastery')
    .select('*')
    .eq('child_id', childId)
    .eq('category', category);

  const { data: recentLogs } = await supabase
    .from('lesson_logs')
    .select(
      'lesson_name, performance_score, prompt_level, behavior_response, consistency_level, completed_at'
    )
    .eq('child_id', childId)
    .eq('category', category)
    .order('completed_at', { ascending: false })
    .limit(5);

  const logs = recentLogs || [];

  const scores = logs.map((l: any) => Number(l.performance_score || 70));
  const avg =
    scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 70;

  const frustrationCount = logs.filter(
    (l: any) =>
      l.behavior_response === 'frustrated' ||
      l.behavior_response === 'avoidant'
  ).length;

  const highPromptCount = logs.filter(
    (l: any) => l.prompt_level === 'physical' || l.prompt_level === 'model'
  ).length;

  const masteryMap = new Map(
    (mastery || []).map((row: any) => [row.skill_target, row])
  );

  const currentSkill =
    path.find((skill) => {
      const row = masteryMap.get(skill);
      return !row || row.mastery_status === 'emerging';
    }) ||
    path.find((skill) => {
      const row = masteryMap.get(skill);
      return row?.mastery_status === 'practicing';
    }) ||
    path[path.length - 1];

  if (avg >= 85 && frustrationCount === 0 && highPromptCount === 0) {
    const currentIndex = path.indexOf(currentSkill);
    const nextSkill = path[Math.min(currentIndex + 1, path.length - 1)];

    return {
      category,
      skillTarget: nextSkill,
      difficultyTrend: 'increase',
      shouldRepeatSkill: false,
      reason:
        'Recent scores are strong with low support needs, so the next lesson can increase challenge.',
    };
  }

  if (avg < 60 || frustrationCount >= 2 || highPromptCount >= 2) {
    return {
      category,
      skillTarget: currentSkill,
      difficultyTrend: 'decrease',
      shouldRepeatSkill: true,
      reason:
        'Recent lessons show the child may need more support, easier steps, and more reinforcement.',
    };
  }

  return {
    category,
    skillTarget: currentSkill,
    difficultyTrend: 'maintain',
    shouldRepeatSkill: true,
    reason:
      'Recent progress is steady, so the next lesson should repeat the skill with a new activity variation.',
  };
}