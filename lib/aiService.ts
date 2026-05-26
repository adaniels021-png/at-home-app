import { z } from 'zod';
import {
  extractJsonFromText,
  safeString,
  safeStringArray,
  toStringArray,
} from './aiCore';
import {
  CachedDailyLessonRow,
  DailyABAActivity,
  DailyLessonInstanceRow,
  Lesson,
  LessonDifficultyLevel,
  LessonPerformanceProfile,
  LessonStreakRow,
  SKILL_PROGRESSION_PATHS
} from './lessonTypes';
import { buildParentSupportContext } from './parentSupportContext';
import { supabase } from './supabase';

const lessonSchema = z.object({
  lesson_name: z.string().optional(),
  setting: z.string().optional(),
  focus_skill: z.string().optional(),
  objective: z.string().optional(),
  materials: z.array(z.string()).optional(),
  setup: z.array(z.string()).optional(),
  prompting_hierarchy: z.array(z.string()).optional(),
  teaching_steps: z.array(z.string()).optional(),
  reinforcement: z.array(z.string()).optional(),
  error_correction: z.array(z.string()).optional(),
  generalization: z.array(z.string()).optional(),
  success_criteria: z.string().optional(),
  difficulty_level: z.enum(['support', 'balanced', 'challenge']).optional(),
  difficulty_reason: z.string().optional(),
  parent_coaching_note: z.string().optional(),
  lesson_variation: z.string().optional(),
  abc_strategy: z.string().optional(),
});

const activitySchema = z.object({
  name: z.string(),
  materials: z.array(z.string()),
  instructions: z.array(z.string()),
  success_criteria: z.string(),
});


function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function cleanPlainText(text: string | undefined | null): string {
  if (!text) return '';
  return text.trim();
}

async function generateJsonWithEdgeFunction<T>(
  prompt: string,
  fallback: T,
  type = 'lesson'
): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'generate-daily-lessons',
      {
        body: {
          type,
          prompt,
        },
      }
    );

    if (error) {
      throw error;
    }

    const rawText =
      typeof data?.result === 'string'
        ? data.result
        : JSON.stringify(data?.result || '');

    const parsed = extractJsonFromText(rawText);

    return parsed as T;
  } catch (error) {
    console.error('Edge AI generation failed:', error);
    return fallback;
  }
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) throw new Error('No authenticated user');

  return user.id;
}

function coerceLessonShape(raw: any): Partial<Lesson> {
  if (!raw || typeof raw !== 'object') return {};

  return {
    lesson_name: raw.lesson_name ?? raw.name ?? raw.title ?? raw.lessonTitle,
    setting: raw.setting ?? raw.location,
    focus_skill:
      raw.focus_skill ?? raw.skill ?? raw.target_skill ?? raw.skill_focus,
    objective: raw.objective ?? raw.goal ?? raw.description,
    materials: toStringArray(raw.materials),
    setup: toStringArray(raw.setup ?? raw.preparation),
    prompting_hierarchy: toStringArray(
      raw.prompting_hierarchy ?? raw.prompting ?? raw.prompts
    ),
    teaching_steps: toStringArray(
      raw.teaching_steps ?? raw.instructions ?? raw.steps
    ),
    reinforcement: toStringArray(raw.reinforcement ?? raw.rewards),
    error_correction: toStringArray(
      raw.error_correction ?? raw.errorCorrection
    ),
    generalization: toStringArray(
      raw.generalization ?? raw.generalisation
    ),
    success_criteria:
      raw.success_criteria ?? raw.mastery_criteria ?? raw.criteria,
    difficulty_level:
      raw.difficulty_level ?? raw.difficulty ?? raw.lesson_difficulty,
    difficulty_reason:
      raw.difficulty_reason ??
      raw.difficultyReason ??
      raw.why_this_level,
    parent_coaching_note:
      raw.parent_coaching_note ??
      raw.parentTip ??
      raw.parent_coaching,
    lesson_variation:
      raw.lesson_variation ?? raw.variation ?? raw.try_this_next,
    abc_strategy:
      raw.abc_strategy ?? raw.abc ?? raw.behavior_strategy,
  };
}

function hasUsableLessonContent(
  lesson: Partial<Lesson> | null | undefined
): boolean {
  if (!lesson) return false;

  return Boolean(
    lesson.lesson_name &&
      lesson.objective &&
      Array.isArray(lesson.materials) &&
      lesson.materials.length > 0 &&
      Array.isArray(lesson.teaching_steps) &&
      lesson.teaching_steps.length >= 2
  );
}

function getFallbackLessonTitle(skill: string) {
  const titles: Record<string, string> = {
    Communication: 'Practicing Communication at Home',
    Social: 'Building Social Skills at Home',
    Play: 'Learning Through Play',
    'Self-Help': 'Practicing Independence',
    Motor: 'Movement and Motor Practice',
  };

  return titles[skill] || `${skill} Practice at Home`;
}

function buildFallbackLesson(skill: string): Lesson {
  return {
    lesson_name: getFallbackLessonTitle(skill),
    setting: 'Home',
    focus_skill: skill,
    objective: `Teach your child to practice ${skill.toLowerCase()} during a short home routine by setting up a clear opportunity, giving one simple direction, waiting 3–5 seconds, prompting only as needed, and immediately reinforcing any attempt. The goal is to help your child participate with more confidence, less frustration, and more independence.`,
    materials: ['Preferred toy or snack', 'Simple household item'],
    setup: [
     'Choose one simple toy or activity your child already likes.',
     'Sit facing your child with limited distractions.',
     'Keep the activity short and playful.',
    ],
    prompting_hierarchy: [
      'Wait briefly',
      'Give a simple verbal prompt',
      'Model the response',
      'Use gentle physical support if needed',
    ],
    teaching_steps: [
      `Sit with your child and place the play item in front of you.`,
      `Model one simple play action, such as rolling, stacking, feeding, pushing, or pretending.`,
      `Say, “Do this,” then pause for 3–5 seconds.`,
      `If your child does not respond, gently model again or help them complete the action.`,
      `Immediately praise any attempt and let your child continue playing for a few seconds.`,
    ],
    reinforcement: ['Praise and preferred items immediately'],
    error_correction: ['Model correct response and retry'],
    generalization: ['Practice again later in a new setting'],
    success_criteria: '3 successful responses with support',
    difficulty_level: 'balanced',
    difficulty_reason: 'Default balanced support level',
    parent_coaching_note:
      'Keep sessions short and end on a success.',
    lesson_variation:
      'Repeat with a different toy or routine later.',
    abc_strategy:
      'Antecedent → Behavior → Consequence with immediate reinforcement',
  };
}

const SKILL_CATEGORIES = [
  'Communication',
  'Social',
  'Play',
  'Self-Help',
  'Motor',
];

export async function ensureAllCategoryQueues({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  for (const category of SKILL_CATEGORIES) {
    const lessonNumber = await getNextLessonNumber({
  childId,
  category,
});

    await pregenerateLessonQueue({
  childId,
  childName,
  category,
  startLessonNumber: lessonNumber,
  count: 3,
});
  }
}

export type { DailyABAActivity, Lesson } from './lessonTypes';

export type RecommendedSign = {
  label: string;
  reason: string;
};

export async function generateRecommendedSigns({
  childName,
  excludedLabels = [],
}: {
  childName: string;
  assessmentContext?: any;
  recentLessons?: any[];
  excludedLabels?: string[];
}): Promise<RecommendedSign[]> {
  const fallback: RecommendedSign[] = [
    { label: 'More', reason: 'Useful for motivated requesting.' },
    { label: 'Help', reason: 'Supports functional communication.' },
    { label: 'All Done', reason: 'Helps with transitions.' },
  ];

  return fallback.filter(
    (sign) => !excludedLabels.includes(sign.label.toLowerCase())
  );
}

export async function generateProgressRecommendations({
  childName,
  lessonLogs,
}: {
  childName: string;
  lessonLogs: {
    category: string;
    success: boolean;
  }[];
}) {
  try {
    console.log('📊 Generating progress recommendations...');

    // Simple fallback logic (SAFE)
    if (!lessonLogs?.length) {
      return {
        summary: `${childName} is just getting started. Keep building consistency.`,
        recommendations: [
          'Focus on short daily sessions',
          'Reinforce small successes immediately',
          'Stick to familiar routines first',
        ],
      };
    }

    const successRate =
      lessonLogs.filter((l) => l.success).length / lessonLogs.length;

    if (successRate > 0.75) {
      return {
        summary: `${childName} is progressing well.`,
        recommendations: [
          'Increase difficulty slightly',
          'Introduce new environments',
          'Fade prompts gradually',
        ],
      };
    }

    if (successRate > 0.4) {
      return {
        summary: `${childName} is making steady progress.`,
        recommendations: [
          'Continue repetition',
          'Use more reinforcement',
          'Keep sessions short and consistent',
        ],
      };
    }

    return {
      summary: `${childName} needs more support in current skills.`,
      recommendations: [
        'Break skills into smaller steps',
        'Use more prompting',
        'Increase reinforcement frequency',
      ],
    };
  } catch (error) {
    console.error('Recommendation generation failed:', error);

    return {
      summary: 'Progress insights unavailable.',
      recommendations: ['Try again later'],
    };
  }
}

export async function generateProgressSummary(
  childId: string
): Promise<{ summary: string }> {
  try {
    const { data: logs } = await supabase
      .from('lesson_logs')
      .select('*')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(20);

    const { data, error } = await supabase.functions.invoke('ai-core', {
      body: {
        type: 'summary',
        payload: { logs: logs || [] },
      },
    });

    if (error) throw error;

    return {
      summary:
        typeof data?.result === 'string' && data.result.trim()
          ? data.result.trim()
          : 'Progress data is being collected this week.',
    };
  } catch (error) {
    console.error('Weekly summary fallback:', error);
    return { summary: 'Progress data is being collected this week.' };
  }
}

export async function getRecentPerformanceTrend({
  childId,
  category,
}: {
  childId: string;
  category: string;
}): Promise<{
  avgScore: number;
  trend: 'increase' | 'decrease' | 'maintain';
}> {
  try {
    const { data, error } = await supabase
      .from('lesson_logs')
      .select('performance_score')
      .eq('child_id', childId)
      .eq('category', category)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return { avgScore: 70, trend: 'maintain' };
    }

    const scores = data.map((row: any) => Number(row.performance_score || 70));
    const avgScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;

    if (avgScore >= 85) return { avgScore, trend: 'increase' };
    if (avgScore <= 50) return { avgScore, trend: 'decrease' };

    return { avgScore, trend: 'maintain' };
  } catch (error) {
    console.error('Performance trend error:', error);
    return { avgScore: 70, trend: 'maintain' };
  }
}

export async function getActivityDifficultyProfile({
  childId,
}: {
  childId: string;
}): Promise<{
  level: 'support' | 'balanced' | 'challenge';
  reason: string;
}> {
  try {
    const { data, error } = await supabase
      .from('lesson_logs')
      .select('performance_score, prompt_level, behavior_response')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(8);

    if (error || !data || data.length === 0) {
      return {
        level: 'balanced',
        reason: 'Not enough recent data yet, so activities should stay balanced.',
      };
    }

    const scores = data.map((row: any) => Number(row.performance_score || 70));
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const frustrationCount = data.filter(
      (row: any) =>
        row.behavior_response === 'frustrated' ||
        row.behavior_response === 'avoidant'
    ).length;

    if (avg < 60 || frustrationCount >= 2) {
      return {
        level: 'support',
        reason:
          'Recent data suggests the child may need easier activities, shorter steps, and more reinforcement.',
      };
    }

    if (avg >= 85) {
      return {
        level: 'challenge',
        reason:
          'Recent data suggests the child may be ready for more independence or a slightly harder activity.',
      };
    }

    return {
      level: 'balanced',
      reason:
        'Recent data suggests a balanced activity with moderate prompting is appropriate.',
    };
  } catch (error) {
    console.error('Activity difficulty profile error:', error);

    return {
      level: 'balanced',
      reason: 'Difficulty data unavailable, using balanced activities.',
    };
  }
}

export async function getLessonPerformanceProfile(
  childId: string,
  category: string
): Promise<LessonPerformanceProfile> {
  try {
    const { data, error } = await supabase
      .from('lesson_logs')
      .select('status, performance_score, completed_at')
      .eq('child_id', childId)
      .eq('category', category)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const rows = data || [];
    const scored = rows.filter(
      (row: any) => typeof row.performance_score === 'number'
    );

    const averageScore =
      scored.length > 0
        ? scored.reduce(
            (sum: number, row: any) => sum + Number(row.performance_score || 0),
            0
          ) / scored.length
        : null;

    const recentSuccessCount = rows.filter(
      (row: any) => row.status === 'success'
    ).length;

    const recentUnsuccessfulCount = rows.filter(
      (row: any) => row.status === 'unsuccessful'
    ).length;

    if (averageScore !== null && averageScore < 60) {
      return {
        averageScore,
        totalScoredLessons: scored.length,
        recentSuccessCount,
        recentUnsuccessfulCount,
        recommendedDifficulty: 'support',
        reasoning:
          'Recent performance suggests the child may benefit from simpler steps and more support.',
      };
    }

    if (averageScore !== null && averageScore >= 85 && recentSuccessCount >= 3) {
      return {
        averageScore,
        totalScoredLessons: scored.length,
        recentSuccessCount,
        recentUnsuccessfulCount,
        recommendedDifficulty: 'challenge',
        reasoning:
          'Recent performance suggests the child is ready for slightly more independence or challenge.',
      };
    }

    if (recentUnsuccessfulCount >= 3 && recentSuccessCount === 0) {
      return {
        averageScore,
        totalScoredLessons: scored.length,
        recentSuccessCount,
        recentUnsuccessfulCount,
        recommendedDifficulty: 'support',
        reasoning:
          'Several recent unsuccessful lessons suggest reducing task demand and increasing support.',
      };
    }

    return {
      averageScore,
      totalScoredLessons: scored.length,
      recentSuccessCount,
      recentUnsuccessfulCount,
      recommendedDifficulty: 'balanced',
      reasoning:
        'Recent performance looks mixed or steady, so a balanced lesson level is appropriate.',
    };
  } catch (error) {
    console.error('getLessonPerformanceProfile error:', error);

    return {
      averageScore: null,
      totalScoredLessons: 0,
      recentSuccessCount: 0,
      recentUnsuccessfulCount: 0,
      recommendedDifficulty: 'balanced',
      reasoning:
        'Not enough recent performance data was available, so a balanced lesson level was chosen.',
    };
  }
}

export async function getNextSkillTarget({
  childId,
  category,
}: {
  childId: string;
  category: string;
}) {
  const path = SKILL_PROGRESSION_PATHS[category] || [];

  if (!path.length) return category;

  try {
    const { data, error } = await supabase
      .from('lesson_logs')
      .select('lesson_name, performance_score')
      .eq('child_id', childId)
      .eq('category', category)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const completedNames = new Set(
      (data || [])
        .filter((row: any) => (row.performance_score || 0) >= 70)
        .map((row: any) => String(row.lesson_name || '').toLowerCase())
    );

    return (
      path.find((skill) => !completedNames.has(skill.toLowerCase())) ||
      path[path.length - 1]
    );
  } catch (error) {
    console.error('Next skill target error:', error);
    return path[0];
  }
}

export async function updateSkillMastery({
  childId,
  category,
  skillTarget,
  performanceScore,
}: {
  childId: string;
  category: string;
  skillTarget: string;
  performanceScore: number;
}) {
  const { data: existing } = await supabase
    .from('skill_mastery')
    .select('*')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('skill_target', skillTarget)
    .maybeSingle();

  const successful = performanceScore >= 70;

  if (!existing) {
    const attempts = 1;
    const successfulAttempts = successful ? 1 : 0;
    const averageScore = performanceScore;

    const masteryStatus =
      averageScore >= 85 && successfulAttempts >= 3
        ? 'mastered'
        : averageScore >= 60
          ? 'practicing'
          : 'emerging';

    await supabase.from('skill_mastery').insert({
      child_id: childId,
      category,
      skill_target: skillTarget,
      attempts,
      successful_attempts: successfulAttempts,
      average_score: averageScore,
      mastery_status: masteryStatus,
      last_practiced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return;
  }

  const attempts = (existing.attempts || 0) + 1;
  const successfulAttempts =
    (existing.successful_attempts || 0) + (successful ? 1 : 0);

  const oldAverage = Number(existing.average_score || 0);
  const averageScore =
    (oldAverage * (attempts - 1) + performanceScore) / attempts;

  const masteryStatus =
    averageScore >= 85 && successfulAttempts >= 3
      ? 'mastered'
      : averageScore >= 60
        ? 'practicing'
        : 'emerging';

  await supabase
    .from('skill_mastery')
    .update({
      attempts,
      successful_attempts: successfulAttempts,
      average_score: averageScore,
      mastery_status: masteryStatus,
      last_practiced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);
}

export async function getPredictiveSkillTarget({
  childId,
  category,
}: {
  childId: string;
  category: string;
}) {
  const path = SKILL_PROGRESSION_PATHS[category] || [];

  if (!path.length) return category;

  const { data } = await supabase
    .from('skill_mastery')
    .select('skill_target, mastery_status, average_score, attempts')
    .eq('child_id', childId)
    .eq('category', category);

  const masteryMap = new Map(
    (data || []).map((row: any) => [row.skill_target, row])
  );

  const emerging = path.find((skill) => {
    const row = masteryMap.get(skill);
    return !row || row.mastery_status === 'emerging';
  });

  if (emerging) return emerging;

  const practicing = path.find((skill) => {
    const row = masteryMap.get(skill);
    return row?.mastery_status === 'practicing';
  });

  if (practicing) return practicing;

  return path[path.length - 1];
}

export async function getRecentBehaviorPattern({
  childId,
  category,
}: {
  childId: string;
  category: string;
}): Promise<{
  strategy: string;
  summary: string;
}> {
  try {
    const { data, error } = await supabase
      .from('lesson_logs')
      .select(
        'prompt_level, behavior_response, consistency_level, performance_score'
      )
      .eq('child_id', childId)
      .eq('category', category)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return {
        strategy: 'balanced',
        summary:
          'No recent behavior pattern yet. Use balanced prompting, short practice, and immediate reinforcement.',
      };
    }

    const frustratedCount = data.filter(
      (row: any) => row.behavior_response === 'frustrated'
    ).length;

    const avoidantCount = data.filter(
      (row: any) => row.behavior_response === 'avoidant'
    ).length;

    const physicalPromptCount = data.filter(
      (row: any) => row.prompt_level === 'physical'
    ).length;

    const independentCount = data.filter(
      (row: any) =>
        row.prompt_level === 'independent' ||
        row.behavior_response === 'independent'
    ).length;

    const lowConsistencyCount = data.filter(
      (row: any) => row.consistency_level === 'low'
    ).length;

    if (frustratedCount >= 2 || avoidantCount >= 2 || physicalPromptCount >= 2) {
      return {
        strategy: 'support',
        summary:
          'Recent lessons show frustration, avoidance, or high prompting. Reduce task demand, shorten the activity, increase reinforcement, and use easier response expectations.',
      };
    }

    if (lowConsistencyCount >= 2) {
      return {
        strategy: 'repeat_with_variation',
        summary:
          'Recent lessons show inconsistent responses. Repeat the same target skill with slightly different materials, more repetition, and clear reinforcement.',
      };
    }

    if (independentCount >= 3) {
      return {
        strategy: 'increase_independence',
        summary:
          'Recent lessons show growing independence. Fade prompts, increase wait time, and add one small challenge.',
      };
    }

    return {
      strategy: 'balanced',
      summary:
        'Recent behavior appears steady. Use balanced prompting, realistic expectations, and immediate reinforcement.',
    };
  } catch (error) {
    console.error('Behavior pattern error:', error);

    return {
      strategy: 'balanced',
      summary:
        'Behavior pattern unavailable. Use balanced prompting, realistic expectations, and immediate reinforcement.',
    };
  }
}

function buildFallbackActivities(
  childName: string,
  count = 3
): DailyABAActivity[] {
  return [
    {
      name: 'Requesting a Preferred Item',
      materials: ['Preferred toy or snack', 'Small table or play area'],
      instructions: [
        `Sit near ${childName} with the preferred item visible but not immediately available.`,
        'Wait 3–5 seconds to see if your child reaches, looks, points, vocalizes, signs, or uses a word.',
        'Prompt the request if needed by modeling “want” or the item name.',
        'Immediately give the item when your child makes any clear request attempt.',
        'Repeat 3–5 times, keeping the activity short and positive.',
      ],
      success_criteria:
        'Your child makes at least 3 request attempts with support as needed.',
    },
    {
      name: 'Following a Simple Direction',
      materials: ['One familiar toy', 'Small reinforcer or praise'],
      instructions: [
        `Sit with ${childName} in a calm space with one familiar toy nearby.`,
        'Give one clear direction, such as “give me,” “put in,” or “clap hands.”',
        'Wait 3–5 seconds for your child to respond.',
        'If needed, model the action or gently guide the response.',
        'Praise immediately when your child responds or tries.',
      ],
      success_criteria:
        'Your child follows or attempts the direction 3 times during the activity.',
    },
    {
      name: 'Turn-Taking Play',
      materials: ['Blocks, ball, puzzle, or simple toy'],
      instructions: [
        `Choose a simple toy and sit facing ${childName}.`,
        'Take one short turn and say “my turn.”',
        'Offer the toy to your child and say “your turn.”',
        'Help your child take a turn if needed, then praise right away.',
        'Continue for 3–5 turns, ending while your child is still engaged.',
      ],
      success_criteria:
        'Your child participates in at least 2 turn-taking exchanges with support.',
    },
  ].slice(0, count);
}

function normalizeActivities(
  rawActivities: unknown,
  childName: string,
  count = 3
): DailyABAActivity[] {
  const fallback = buildFallbackActivities(childName, count);

  if (!Array.isArray(rawActivities)) return fallback;

  const normalized = rawActivities.map((activity: any, index) => {
    const fallbackItem = fallback[index % fallback.length];

    return {
      name: safeString(activity?.name || activity?.title, fallbackItem.name),
      materials: safeStringArray(activity?.materials, fallbackItem.materials),
      instructions: safeStringArray(
        activity?.instructions || activity?.steps || activity?.teaching_steps,
        fallbackItem.instructions
      ),
      success_criteria: safeString(
        activity?.success_criteria || activity?.successCriteria || activity?.goal,
        fallbackItem.success_criteria
      ),
    };
  });

  const completeActivities = normalized.filter(
    (activity) =>
      activity.name &&
      activity.materials.length > 0 &&
      activity.instructions.length >= 3 &&
      activity.success_criteria
  );

  return completeActivities.length
    ? completeActivities.slice(0, count)
    : fallback;
}

export async function generateDailyABAActivities({
  childName,
  location = 'Home',
  skillFocus = 'Communication, play, routines, and daily living',
  assessmentContext = {},
  recentLessons = [],
  recentRoutines = [],
  count = 3,
}: {
  childName: string;
  location?: string;
  skillFocus?: string;
  assessmentContext?: any;
  recentLessons?: any[];
  recentRoutines?: any[];
  count?: number;
}): Promise<DailyABAActivity[]> {
  const fallbackActivities = buildFallbackActivities(childName, count);

  try {

    const prompt = `
Create ${count} parent-friendly ABA activity ideas.

Child name: ${childName}
Location: ${location}
Skill focus: ${skillFocus}

Assessment context:
${JSON.stringify(assessmentContext, null, 2)}

Recent lessons:
${JSON.stringify(recentLessons, null, 2)}

Recent routines:
${JSON.stringify(recentRoutines, null, 2)}

Return ONLY valid JSON array.

Each activity must include:
{
  "name": "string",
  "materials": ["string"],
  "instructions": ["step 1", "step 2", "step 3"],
  "success_criteria": "string"
}

Rules:
- Instructions must tell the parent exactly what to do with the child.
- Do not only list materials.
- Use simple home materials.
- Keep activities short, supportive, and realistic.
`;

    const parsed = await generateJsonWithEdgeFunction<any[]>(
  prompt,
  fallbackActivities,
  'activities'
);

return normalizeActivities(parsed, childName, count);
  } catch (error) {
    console.error('Generate daily ABA activities error:', error);
    return fallbackActivities;
  }
}

export async function generatePremiumLesson({
  childName,
  childId,
  skill,
  location,
  lessonNumber,
  difficultyTrend = 'maintain',
  skillTarget,
  behaviorPattern,
  avoidSkills = [],
}: {
  childName: string;
  childId: string;
  skill: string;
  location: string;
  lessonNumber: number;
  difficultyTrend?: 'increase' | 'decrease' | 'maintain';
  skillTarget?: string;
  behaviorPattern?: {
    strategy: string;
    summary: string;
  };
  avoidSkills?: string[];
}): Promise<{ lesson: Lesson; source: 'ai' | 'fallback' }> {
  try {
    const difficultyModifier =
      difficultyTrend === 'increase'
        ? 'Increase independence. Fade prompts, add slight variation, and expect stronger responses.'
        : difficultyTrend === 'decrease'
          ? 'Reduce difficulty. Use shorter trials, more prompting, and fast reinforcement.'
          : 'Keep a balanced level with moderate prompting and consistent reinforcement.';

    const fallback = buildFallbackLesson(skill);


    const prompt = `
You are a BCBA-style ABA lesson planner for parents doing short at-home practice.

Create one clear, parent-friendly ABA lesson.

Child name: ${childName}
Child ID: ${childId}
Category: ${skill}
Target skill: ${skillTarget || skill}
Location: ${location}
Lesson number: ${lessonNumber}
Difficulty guidance: ${difficultyModifier}
Behavior pattern: ${
      behaviorPattern?.summary ||
      'Use balanced prompting, reinforcement, and realistic expectations.'
    }

Recent lessons/skills to avoid repeating:${avoidSkills.length ? avoidSkills.join(', ') : 'None'}
Important variety rule:
Do not repeat the same lesson name, same target skill, same teaching activity, or same materials from the recent lessons listed above. Create a clearly different activity while staying in the same category.

Return ONLY valid JSON.

Required JSON shape:
{
  "lesson_name": "string",
  "setting": "Home",
  "focus_skill": "string",
  "objective": "clear parent-facing paragraph explaining exactly what the parent should do",
  "materials": ["string"],
  "setup": ["string"],
  "prompting_hierarchy": ["string"],
  "teaching_steps": ["string"],
  "reinforcement": ["string"],
  "error_correction": ["string"],
  "generalization": ["string"],
  "success_criteria": "string",
  "difficulty_level": "support | balanced | challenge",
  "difficulty_reason": "string",
  "parent_coaching_note": "string",
  "lesson_variation": "string",
  "abc_strategy": "string"
}

Rules:
- NEVER use generic phrases like "A structured lesson to support your child’s development today."
- NEVER use vague objectives.
- Objective must be specific, detailed, and parent-facing.
- Objective must explain exactly what the parent will teach, what the child will practice, where it happens, what materials are used, how prompting works, and what success looks like.
- Teaching steps must be detailed enough that a parent can follow them without guessing.
- Each teaching step must include what the parent says, what the parent does, what the child should do, how to prompt, and how to reinforce.
- Use real home examples, real materials, and specific instructions.
- Play lessons must include hands-on play instructions.
- Play lessons must include exactly what toy/material to use, what the parent says, what the child should do, how to prompt, and how to reinforce.
- teaching_steps must have at least 5 clear parent action steps.
- setup must have at least 2 parent setup steps.
`;

    const raw = await generateJsonWithEdgeFunction<any>(
  prompt,
  fallback,
  'premium-lesson'
);

const coerced = coerceLessonShape(raw);

    const safeLesson: Lesson = {
      ...fallback,
      ...coerced,

      lesson_name:
        coerced.lesson_name || `${skillTarget || skill} Lesson ${lessonNumber}`,

      setting: coerced.setting || location || 'Home',

      focus_skill: skillTarget || coerced.focus_skill || skill,

      objective:
  coerced.objective &&
  !coerced.objective.toLowerCase().includes('structured lesson')
    ? coerced.objective
    : `Teach ${childName} to practice ${skillTarget || skill} during a short home routine by setting up a clear opportunity, giving one simple direction, waiting 3–5 seconds, using prompts only as needed, and immediately reinforcing any successful attempt. The goal is for ${childName} to participate in the skill with more confidence, less frustration, and more independence.`,
      materials: coerced.materials?.length
        ? coerced.materials
        : fallback.materials,

      setup: coerced.setup?.length ? coerced.setup : fallback.setup,

     teaching_steps:
  coerced.teaching_steps?.length && coerced.teaching_steps.length >= 5
    ? coerced.teaching_steps
    : [
        `Sit with ${childName} in a calm area and place the materials directly in front of you.`,
        `Tell ${childName}, “We are going to practice ${skillTarget || skill},” using a calm and upbeat voice.`,
        `Show the item or activity and give one clear direction related to the skill, then wait 3–5 seconds.`,
        `If ${childName} does not respond, model the action first, then offer a verbal or gesture prompt as needed.`,
        `Immediately praise any attempt, even if it is not perfect, and provide access to a preferred item or short play break.`,
        `Repeat the practice 3–5 times, keeping the activity short, positive, and easy to finish successfully.`,
      ],

      prompting_hierarchy: coerced.prompting_hierarchy?.length
        ? coerced.prompting_hierarchy
        : fallback.prompting_hierarchy,

      reinforcement: coerced.reinforcement?.length
        ? coerced.reinforcement
        : fallback.reinforcement,

      error_correction: coerced.error_correction?.length
        ? coerced.error_correction
        : fallback.error_correction,

      generalization: coerced.generalization?.length
        ? coerced.generalization
        : fallback.generalization,

      success_criteria:
        coerced.success_criteria ||
        'The child completes 3 successful responses with support as needed.',

      difficulty_level:
        coerced.difficulty_level ||
        (difficultyTrend === 'increase'
          ? 'challenge'
          : difficultyTrend === 'decrease'
            ? 'support'
            : 'balanced'),

      difficulty_reason: coerced.difficulty_reason || difficultyModifier,

      parent_coaching_note:
        coerced.parent_coaching_note ||
        'Keep the activity short, positive, and end after a successful attempt.',

      lesson_variation:
        coerced.lesson_variation ||
        'Try the same skill later using a different toy or daily routine.',

      abc_strategy:
        coerced.abc_strategy ||
        'Antecedent: give a clear opportunity. Behavior: child responds. Consequence: reinforce immediately.',
    };

    if (!hasUsableLessonContent(safeLesson)) {
      return {
        lesson: fallback,
        source: 'fallback',
      };
    }

    return {
      lesson: safeLesson,
      source: 'ai',
    };
  } catch (error) {
    console.error('AI lesson failed:', error);

    return {
      lesson: buildFallbackLesson(skill),
      source: 'fallback',
    };
  }
}

export async function saveParentSupportPlan({
  childId,
  toolType,
  title,
  inputData,
  aiResponse,
}: {
  childId: string;
  toolType: string;
  title: string;
  inputData: any;
  aiResponse: any;
}) {
  try {
    // ALWAYS use authenticated Supabase user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data, error } = await supabase
      .from('parent_support_plans')
      .insert({
        user_id: user.id,
        child_id: childId,
        tool_type: toolType,
        title,
        input_data: inputData,
        ai_response: aiResponse,
      })
      .select()
      .single();

    if (error) {
      console.error(
        'saveParentSupportPlan error:',
        error
      );

      throw error;
    }

    return data;
  } catch (error) {
    console.error(
      'saveParentSupportPlan crash:',
      error
    );

    throw error;
  }
}

export async function generateBehaviorSupportPlan({
  childId,
  childName,
  behavior,
  beforeBehavior,
  afterBehavior,
  location,
}: {
  childId: string;
  childName: string;
  behavior: string;
  beforeBehavior: string;
  afterBehavior?: string;
  location?: string;
}) {
  try {
    const supportContext = await buildParentSupportContext({
  childId,
});

const contextSummary = supportContext
  ? `
Child Name: ${supportContext.childName}

Age: ${supportContext.age || 'Unknown'}

Diagnosis:
${supportContext.diagnosis}

Communication Level:
${supportContext.communicationLevel}

Sensory Needs:
${supportContext.sensoryNeeds?.join(', ') || 'Unknown'}

Weak Skills:
${supportContext.weakSkills?.join(', ') || 'None identified'}

Strong Skills:
${supportContext.strongSkills?.join(', ') || 'None identified'}

Recent Lesson Challenges:
${supportContext.recentChallenges?.join(', ') || 'None'}
`
  : 'No additional child context available.';

    const prompt = `
You are an experienced BCBA helping a parent at home.

Generate a calm, supportive, parent-friendly ABA behavior support plan.

Child Name:
${childName}

CHILD CONTEXT:
${contextSummary}

Behavior:
${behavior}

What happens BEFORE the behavior:
${beforeBehavior}

What happens AFTER the behavior:
${afterBehavior || 'Not provided'}

Where it happens:
${location || 'Not provided'}

Requirements:
- Use simple parent-friendly language
- Avoid clinical jargon
- Never shame the child or caregiver
- Focus on regulation, communication, reinforcement, and prevention
- Include emotional support for caregivers
- Keep recommendations realistic for home use

Return ONLY valid JSON.

JSON Format:
{
  "possible_reason": "",
  "prevention_strategies": [
    ""
  ],
  "replacement_skills": [
    ""
  ],
  "calming_supports": [
    ""
  ],
  "parent_tips": [
    ""
  ],
  "encouragement": ""
}
`;

return await generateJsonWithEdgeFunction(
  prompt,
  {
    possible_reason:
      'The child may be struggling with communication, regulation, transitions, or unmet needs.',
    prevention_strategies: [
      'Use visual schedules.',
      'Give transition warnings.',
      'Keep routines predictable.',
    ],
    replacement_skills: [
      'Teach requesting help.',
      'Practice calm communication.',
    ],
    calming_supports: [
      'Offer sensory breaks.',
      'Reduce environmental stress.',
    ],
    parent_tips: [
      'Stay calm and consistent.',
      'Reinforce positive behavior immediately.',
    ],
    encouragement:
      'You are doing a great job supporting your child.',
  },
  'behavior-support'
);
    
  } catch (error) {
    console.error('generateBehaviorSupportPlan error:', error);

    return {
      possible_reason:
        'The child may be struggling with communication, regulation, transitions, or unmet needs.',

      prevention_strategies: [
        'Use visual schedules.',
        'Give transition warnings.',
        'Keep routines predictable.',
      ],

      replacement_skills: [
        'Teach requesting help.',
        'Practice calm communication.',
      ],

      calming_supports: [
        'Offer sensory breaks.',
        'Reduce environmental stress.',
      ],

      parent_tips: [
        'Stay calm and consistent.',
        'Reinforce positive behavior immediately.',
      ],

      encouragement:
        'You are doing a great job supporting your child.',
    };
  }
}

export async function generateSocialStory({
  childId,
  childName,
  situation,
  goal,
  location,
  supportNeeds,
}: {
  childId: string;
  childName: string;
  situation: string;
  goal?: string;
  location?: string;
  supportNeeds?: string;
}) {
  try {
    const supportContext = await buildParentSupportContext({
      childId,
    });

    const contextSummary = supportContext
      ? `
Child Name: ${supportContext.childName}
Age: ${supportContext.age || 'Unknown'}
Communication Level: ${supportContext.communicationLevel}
Sensory Needs: ${supportContext.sensoryNeeds?.join(', ') || 'Unknown'}
Weak Skills: ${supportContext.weakSkills?.join(', ') || 'None identified'}
Strong Skills: ${supportContext.strongSkills?.join(', ') || 'None identified'}
`
      : 'No additional child context available.';

    const prompt = `
Create a personalized social story for a child.

Child Name: ${childName}

Child Context:
${contextSummary}

Situation:
${situation}

Goal:
${goal || 'Help the child understand what to expect and what they can do.'}

Location:
${location || 'Not provided'}

Support Needs:
${supportNeeds || 'Not provided'}

Return ONLY valid JSON.

JSON Format:
{
  "title": "",
  "introduction": "",
  "story_pages": [
    {
      "page_title": "",
      "text": "",
      "visual_suggestion": ""
    }
  ],
  "practice_tips": [""],
  "caregiver_note": "",
  "calming_phrase": ""
}

Rules:
- Use simple, positive, child-friendly language.
- Write in first person when possible.
- Keep each story page short.
- Do not shame the child.
- Focus on what the child CAN do.
- Include visuals a parent could create or print.
- Make the story supportive for home use.
`;

    return await generateJsonWithEdgeFunction(
  prompt,
  {
    title: `${situation} Social Story`,
    introduction: `${childName} can learn what to expect and how to feel safe.`,
    story_pages: [
      {
        page_title: 'I can learn',
        text: 'Sometimes I practice new things. My grown-up will help me.',
        visual_suggestion: 'Picture of child with caregiver.',
      },
      {
        page_title: 'I can stay calm',
        text: 'I can take a breath, ask for help, or take a break.',
        visual_suggestion: 'Picture of calm breathing or break card.',
      },
    ],
    practice_tips: [
      'Read the story before the situation happens.',
      'Use a calm voice.',
      'Praise small successes.',
    ],
    caregiver_note:
      'Read this story often and keep practice short and positive.',
    calming_phrase: 'I am safe. I can ask for help.',
  },
  'social-story'
);

  } catch (error) {
    console.error('generateSocialStory error:', error);

    return {
      title: `${situation} Social Story`,
      introduction: `${childName} can learn what to expect and how to feel safe.`,
      story_pages: [
        {
          page_title: 'I can learn',
          text: `Sometimes I practice new things. My grown-up will help me.`,
          visual_suggestion: 'Picture of child with caregiver.',
        },
        {
          page_title: 'I can stay calm',
          text: 'I can take a breath, ask for help, or take a break.',
          visual_suggestion: 'Picture of calm breathing or break card.',
        },
      ],
      practice_tips: [
        'Read the story before the situation happens.',
        'Use a calm voice.',
        'Praise small successes.',
      ],
      caregiver_note:
        'Read this story often and keep practice short and positive.',
      calming_phrase: 'I am safe. I can ask for help.',
    };
  }
}

export async function pregenerateLessonQueue({
  childName,
  childId,
  category,
  startLessonNumber,
  count = 3,
}: {
  childName: string;
  childId: string;
  category: string;
  startLessonNumber: number;
  count?: number;
}) {
  try {
    console.log('⚡ Generating lesson queue...');

    const { getProgressionDecision } = await import('./progressionEngine');

    const progression = await getProgressionDecision({
      childId,
      category,
    });

    const trend = progression.difficultyTrend;
    const skillTarget = progression.skillTarget;

    const behaviorPattern = await getRecentBehaviorPattern({
      childId,
      category,
    });

    for (let i = 0; i < count; i++) {
      const lessonNumber = startLessonNumber + i;

      // 🚫 Prevent duplicates
      const { data: existing } = await supabase
        .from('lesson_queue')
        .select('id')
        .eq('child_id', childId)
        .eq('category', category)
        .eq('lesson_number', lessonNumber)
        .maybeSingle();

      if (existing) continue;

      const result = await generatePremiumLesson({
        childName,
        childId,
        skill: category,
        location: 'Home',
        lessonNumber,
        difficultyTrend: trend,
        skillTarget,
        behaviorPattern,
      });

      const { error } = await supabase.from('lesson_queue').upsert({
        child_id: childId,
        category,
        lesson_number: lessonNumber,
        lesson_payload: result.lesson,
        source: result.source,
        difficulty_trend: trend,
        skill_target: skillTarget,
        is_used: false,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Queue insert error:', error);
      }
    }

    console.log('✅ Lesson queue ready');
  } catch (error) {
    console.error('Queue generation failed:', error);
  }
}

export async function getNextLessonFromQueue({
  childId,
  category,
}: {
  childId: string;
  category: string;
}) {
  try {
    const today = getTodayDateString();
    const now = new Date().toISOString();
    const userId = await getAuthenticatedUserId();

    const { data: queuedLessons, error } = await supabase
      .from('lesson_queue')
      .select('*')
      .eq('child_id', childId)
      .eq('category', category)
      .eq('is_used', false)
      .order('lesson_number', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Get lesson queue error:', error);
      return null;
    }

    if (!queuedLessons || queuedLessons.length === 0) {
      console.log('No unused queued lessons found.');
      return null;
    }

    for (const queuedLesson of queuedLessons) {
      if (!queuedLesson?.lesson_payload) continue;

      const { data: existingInstance } = await supabase
        .from('daily_lesson_instances')
        .select('*')
        .eq('user_id', userId)
        .eq('child_id', childId)
        .eq('lesson_date', today)
        .eq('category', category)
        .eq('lesson_number', queuedLesson.lesson_number)
        .maybeSingle();

      if (existingInstance) {
        await supabase
          .from('lesson_queue')
          .update({
            is_used: true,
            used_at: now,
          })
          .eq('id', queuedLesson.id);

        if (existingInstance.status !== 'completed') {
          return {
            ...queuedLesson,
            id: existingInstance.id,
            lesson_payload: existingInstance.lesson_payload,
            lesson_number: existingInstance.lesson_number,
          };
        }

        continue;
      }

      const { data: instance, error: instanceError } = await supabase
        .from('daily_lesson_instances')
        .insert({
          user_id: userId,
          child_id: childId,
          lesson_date: today,
          category,
          lesson_number: queuedLesson.lesson_number,
          lesson_payload: queuedLesson.lesson_payload,
          source: queuedLesson.source || 'ai',
          status: 'started',
          started_at: now,
          last_opened_at: now,
          is_resumed: false,
          resumed_from_date: null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (instanceError) {
        console.error(
          'Create lesson instance from queue error:',
          instanceError
        );

        await supabase
          .from('lesson_queue')
          .update({
            is_used: true,
            used_at: now,
          })
          .eq('id', queuedLesson.id);

        continue;
      }

      await supabase
        .from('lesson_queue')
        .update({
          is_used: true,
          used_at: now,
        })
        .eq('id', queuedLesson.id);

      return {
        ...queuedLesson,
        id: instance.id,
        lesson_payload: instance.lesson_payload,
        lesson_number: instance.lesson_number,
      };
    }

    console.log('No usable queued lesson found after skipping duplicates.');
    return null;
  } catch (error) {
    console.error('getNextLessonFromQueue error:', error);
    return null;
  }
}

export async function getCachedDailyLesson(params: {
  childId: string;
  category: string;
}): Promise<CachedDailyLessonRow | null> {
  const { childId, category } = params;

  const { data, error } = await supabase
    .from('daily_generated_lessons')
    .select('*')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('lesson_date', getTodayDateString())
    .maybeSingle();

  if (error) {
    console.error('getCachedDailyLesson error:', error);
    return null;
  }

  return (data as CachedDailyLessonRow | null) ?? null;
}

export async function getNextLessonNumber(params: {
  childId: string;
  category: string;
}): Promise<number> {
  const { childId, category } = params;

  const { data, error } = await supabase
    .from('lesson_logs')
    .select('lesson_number')
    .eq('child_id', childId)
    .eq('category', category)
    .order('lesson_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('getNextLessonNumber error:', error);
    return 1;
  }

  const lastNumber = data?.[0]?.lesson_number ?? 0;
  return lastNumber + 1;
}

export async function getTodayLessonInstance(params: {
  childId: string;
  category: string;
}): Promise<DailyLessonInstanceRow | null> {
  const { childId, category } = params;
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('daily_lesson_instances')
    .select('*')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .eq('category', category)
    .eq('lesson_date', getTodayDateString())
    .in('status', ['generated', 'started', 'unsuccessful'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getTodayLessonInstance error:', error);
    return null;
  }

  return (data as DailyLessonInstanceRow | null) ?? null;
}

export async function getMostRecentIncompleteLesson(params: {
  childId: string;
  category: string;
}): Promise<DailyLessonInstanceRow | null> {
  const { childId, category } = params;
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('daily_lesson_instances')
    .select('*')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .eq('category', category)
    .in('status', ['generated', 'started', 'unsuccessful'])
    .order('lesson_date', { ascending: false })
    .limit(1);

  if (error) {
    console.error('getMostRecentIncompleteLesson error:', error);
    return null;
  }

  return ((data as DailyLessonInstanceRow[] | null) || [])[0] || null;
}

export async function createOrUpdateTodayLessonInstance({
  childId,
  category,
  lessonNumber,
  lesson,
  source,
}: {
  childId: string;
  category: string;
  lessonNumber: number;
  lesson: Lesson;
  source: 'ai' | 'fallback';
}): Promise<DailyLessonInstanceRow | null> {
  const userId = await getAuthenticatedUserId();
  const today = getTodayDateString();
  const now = new Date().toISOString();

const { data, error } = await supabase
  .from('daily_lesson_instances')
  .insert({
    user_id: userId,
    child_id: childId,
    lesson_date: today,
    category,
    lesson_number: lessonNumber,
    lesson_payload: lesson,
    source,
    status: 'generated',
    last_opened_at: now,
    is_resumed: false,
    resumed_from_date: null,
    created_at: now,
    updated_at: now,
  })
  .select()
  .single();

  if (error) {
    console.error('createOrUpdateTodayLessonInstance error:', error);
    return null;
  }

  return data as DailyLessonInstanceRow;
}

export async function createResumedLessonInstance(params: {
  childId: string;
  category: string;
  lessonNumber: number;
  lesson: Lesson;
  source: 'ai' | 'fallback';
  resumedFromDate: string;
}): Promise<DailyLessonInstanceRow | null> {
  const userId = await getAuthenticatedUserId();
  const today = getTodayDateString();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('daily_lesson_instances')
    .upsert(
      {
        user_id: userId,
        child_id: params.childId,
        lesson_date: today,
        category: params.category,
        lesson_number: params.lessonNumber,
        lesson_payload: params.lesson,
        source: params.source,
        status: 'started',
        started_at: now,
        last_opened_at: now,
        is_resumed: true,
        resumed_from_date: params.resumedFromDate,
      },
      {
        onConflict: 'user_id,child_id,category,lesson_date',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('createResumedLessonInstance error:', error);
    return null;
  }

  return data as DailyLessonInstanceRow;
}

export async function markLessonInstanceOpened(
  instanceId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('daily_lesson_instances')
    .update({
      status: 'started',
      started_at: now,
      last_opened_at: now,
    })
    .eq('id', instanceId);

  if (error) {
    console.error('markLessonInstanceOpened error:', error);
  }
}

export async function completeLessonInstance(params: {
  instanceId: string;
  status: 'completed' | 'unsuccessful';
  performanceScore?: number | null;
  notes?: string | null;
}): Promise<void> {
  const {
    instanceId,
    status,
    performanceScore = null,
    notes = null,
  } = params;

  const updates: Record<string, any> = {
    status,
    performance_score: performanceScore,
    notes,
    last_opened_at: new Date().toISOString(),
  };

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('daily_lesson_instances')
    .update(updates)
    .eq('id', instanceId);

  if (error) {
    console.error('completeLessonInstance error:', error);
  }
}

export async function getLessonStreak(
  childId: string
): Promise<LessonStreakRow | null> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('lesson_streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .maybeSingle();

  if (error) {
    console.error('getLessonStreak error:', error);
    return null;
  }

  return (data as LessonStreakRow | null) ?? null;
}

export async function ensureLessonStreakRow(
  childId: string
): Promise<LessonStreakRow | null> {
  const userId = await getAuthenticatedUserId();

  const existing = await getLessonStreak(childId);
  if (existing) return existing;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lesson_streaks')
    .insert({
      user_id: userId,
      child_id: childId,
      current_streak: 0,
      best_streak: 0,
      last_completed_date: null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('ensureLessonStreakRow error:', error);
    return null;
  }

  return data as LessonStreakRow;
}



export async function updateLessonStreakOnCompletion(
  childId: string
): Promise<LessonStreakRow | null> {
  const streak = await ensureLessonStreakRow(childId);
  if (!streak) return null;

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  if (streak.last_completed_date === today) {
    return streak;
  }

  let currentStreak = 1;

  if (streak.last_completed_date === yesterday) {
    currentStreak = (streak.current_streak || 0) + 1;
  }

  const bestStreak = Math.max(streak.best_streak || 0, currentStreak);

  const { data, error } = await supabase
    .from('lesson_streaks')
    .update({
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_completed_date: today,
    })
    .eq('id', streak.id)
    .select()
    .single();

  if (error) {
    console.error('updateLessonStreakOnCompletion error:', error);
    return null;
  }

  return data as LessonStreakRow;
}

export function getPerformanceScoreFromRating(
  rating: 1 | 2 | 3 | 4 | 5
): number {
  const map: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 20,
    2: 40,
    3: 60,
    4: 80,
    5: 100,
  };

  return map[rating];
}

export function getDifficultyDisplay(level?: LessonDifficultyLevel | null): {
  label: string;
  description: string;
} {
  switch (level) {
    case 'support':
      return {
        label: 'Support',
        description: 'More prompting, simpler steps, and easier wins.',
      };

    case 'challenge':
      return {
        label: 'Challenge',
        description: 'More independence and higher demand.',
      };

    case 'balanced':
    default:
      return {
        label: 'Balanced',
        description: 'A steady mix of support and independence.',
      };
  }
}

export async function getNextActivitiesFromQueue({
  childId,
}: {
  childId: string;
}) {
  try {
    const { data, error } = await supabase
      .from('activity_queue')
      .select('*')
      .eq('child_id', childId)
      .eq('is_used', false)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getNextActivitiesFromQueue error:', error);
      return null;
    }

    if (!data?.activities_json) {
      return null;
    }

    await supabase
      .from('activity_queue')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    return data.activities_json;
  } catch (error) {
    console.error('getNextActivitiesFromQueue crash:', error);
    return null;
  }
}

export async function generateAssessmentQuestions(
  childName: string,
  count = 24
) {
  const fallbackQuestions = [
    {
      id: 'communication_1',
      category: 'Communication',
      question: `How does ${childName} usually communicate wants and needs?`,
      options: ['Words', 'Gestures', 'PECS/visuals', 'Crying/frustration'],
    },
    {
      id: 'communication_2',
      category: 'Communication',
      question: `Does ${childName} request help when needed?`,
      options: ['Often', 'Sometimes', 'Rarely', 'Not yet'],
    },
    {
      id: 'social_1',
      category: 'Social',
      question: `How does ${childName} respond to other children?`,
      options: ['Engages often', 'Watches nearby', 'Avoids', 'Gets upset'],
    },
    {
      id: 'play_1',
      category: 'Play',
      question: `How does ${childName} usually play with toys?`,
      options: ['Pretend play', 'Functional play', 'Lines up/spins items', 'Limited interest'],
    },
    {
      id: 'self_help_1',
      category: 'Self-Help',
      question: `How independent is ${childName} with daily routines?`,
      options: ['Very independent', 'Some help', 'Lots of help', 'Not yet'],
    },
    {
      id: 'sensory_1',
      category: 'Sensory',
      question: `Does ${childName} have sensory sensitivities?`,
      options: ['Often', 'Sometimes', 'Rarely', 'Not sure'],
    },
  ];

  while (fallbackQuestions.length < count) {
    fallbackQuestions.push({
      id: `general_${fallbackQuestions.length + 1}`,
      category: 'General',
      question: `What support does ${childName} need most right now?`,
      options: ['Communication', 'Behavior', 'Routines', 'Play/Social skills'],
    });
  }

  return fallbackQuestions.slice(0, count);
}

export async function generateDailyLesson(
  childName: string,
  childId: string,
  lessonNumber: number,
  category: string
): Promise<{
  name: string;
  materials: string;
  instructions: string;
  prompting: string;
  reinforcement: string;
  success_criteria: string;
  pro_tip: string;
  video_term: string;
}> {
  try {
    const result = await generatePremiumLesson({
      childName,
      childId,
      skill: category,
      location: 'Home',
      lessonNumber,
    });

    const lesson = result.lesson;

    return {
      name: lesson.lesson_name,
      materials: lesson.materials.join('\n'),
      instructions: lesson.teaching_steps.join('\n'),
      prompting: lesson.prompting_hierarchy.join('\n'),
      reinforcement: lesson.reinforcement.join('\n'),
      success_criteria: lesson.success_criteria,
      pro_tip:
        lesson.generalization?.[0] ||
        lesson.difficulty_reason ||
        'Practice again later in a different setting.',
      video_term: `${category} ABA parent training`,
    };
  } catch (error) {
    console.error('generateDailyLesson error:', error);

    return {
      name: getFallbackLessonTitle(category),
      materials: 'Preferred items, simple household materials',
      instructions:
        'Present the activity, wait for a response, prompt as needed, reinforce immediately.',
      prompting:
        'Use least-to-most prompting: wait → verbal → gesture → model → physical.',
      reinforcement:
        'Use praise, toys, or preferred rewards immediately after success.',
      success_criteria: '3 successful responses with support.',
      pro_tip: 'Keep it short and end on a win.',
      video_term: `${category} ABA parent training`,
    };
  }
}