import {
  extractJsonFromText,
  safeString,
  safeStringArray,
  toStringArray,
} from './aiCore';
import {
  Lesson,
  LessonDifficultyLevel,
  LessonPerformanceProfile,
  LessonStreakRow,
  SKILL_PROGRESSION_PATHS
} from './lessonTypes';
import { buildParentSupportContext } from './parentSupportContext';
import { supabase } from './supabase';


function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

async function generateJsonWithEdgeFunction<T>(
  prompt: string,
  fallback: T,
  type = 'lesson'
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(
    'generate-daily-lessons',
    {
      body: {
        type,
        prompt,
      },
    }
  );

  console.log('RAW EDGE FUNCTION RESPONSE:', data);

  if (error) {
  console.error('Edge function invoke error:', error);

  const context = (error as any)?.context;

  if (context) {
    try {
      const errorText = await context.text();
      console.error('EDGE FUNCTION ERROR BODY:', errorText);
    } catch (readError) {
      console.error(
        'Could not read edge error body:',
        readError
      );
    }
  }

  throw error;
}

  const rawText =
    typeof data?.result === 'string'
      ? data.result.trim()
      : JSON.stringify(data?.result || '');

  if (!rawText) {
    console.error('AI returned empty result:', data);
    throw new Error('AI returned an empty lesson.');
  }

  const parsed = extractJsonFromText(rawText);

  if (!parsed) {
    console.error('AI JSON PARSE FAILED:', rawText);
    throw new Error('AI returned invalid lesson JSON.');
  }

  return parsed as T;
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
    const { data: logs, error } = await supabase
      .from('lesson_logs')
      .select('category, performance_score, status, completed_at')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const lessonLogs = logs || [];

    if (!lessonLogs.length) {
      return {
        summary:
          'Progress data is being collected this week. Complete a few lessons to see stronger weekly insights.',
      };
    }

    const completedCount = lessonLogs.length;
    const categoryCounts: Record<string, number> = {};

    lessonLogs.forEach((log: any) => {
      const category = log.category || 'Learning';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const topCategory =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'Learning';

    const highScoreCount = lessonLogs.filter(
      (log: any) => Number(log.performance_score || 0) >= 80
    ).length;

    const steadyScoreCount = lessonLogs.filter((log: any) => {
      const score = Number(log.performance_score || 0);
      return score >= 60 && score < 80;
    }).length;

    const supportScoreCount = lessonLogs.filter((log: any) => {
      const score = Number(log.performance_score || 0);
      return score > 0 && score < 60;
    }).length;

    if (
      supportScoreCount > highScoreCount &&
      supportScoreCount >= steadyScoreCount
    ) {
      return {
        summary: `${topCategory} has been the main focus recently. Some lessons looked challenging, so shorter steps, extra modeling, and immediate reinforcement may help.`,
      };
    }

    if (
      highScoreCount > supportScoreCount &&
      highScoreCount >= steadyScoreCount
    ) {
      return {
        summary: `${topCategory} has been the main focus recently. Your child may be ready for a small increase in independence or a slightly harder next step.`,
      };
    }

    return {
      summary: `${topCategory} has been the main focus recently. ${completedCount} recent lesson${completedCount === 1 ? '' : 's'} have been completed, and the current level looks steady for continued practice.`,
    };
  } catch (error) {
    console.warn('Weekly summary fallback:', error);

    return {
      summary:
        'Progress data is being collected this week. Keep practicing short lessons and check back soon.',
    };
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
): any[] {
  return [
    {
      name: 'Bubble Chase',
      title: 'Bubble Chase',
      category: 'outdoor',
      location: 'Backyard, park, or sidewalk',
      time: '5–10 minutes',
      description:
        'Blow bubbles and turn it into a playful chase, pop, and laugh adventure.',
      try_this: [
        `Let ${childName} pop bubbles with hands, feet, or a bubble wand.`,
        'Pause before blowing more bubbles and see how your child asks for more.',
        'Try big bubbles, tiny bubbles, fast bubbles, and slow bubbles.',
      ],
      why_it_helps:
        'Supports movement, shared attention, communication, and joyful connection through play.',
    },
    {
      name: 'Toy Rescue Mission',
      title: 'Toy Rescue Mission',
      category: 'home',
      location: 'Living room or play area',
      time: '5 minutes',
      description:
        'Pretend toys are stuck around the room and need help getting back home.',
      try_this: [
        'Pick 3–5 toys to “rescue.”',
        'Give each toy a silly voice, sound, or name.',
        'Celebrate when each toy makes it back to its basket, shelf, or bed.',
      ],
      why_it_helps:
        'Builds pretend play, cooperation, clean-up routines, and following everyday directions without feeling like a chore.',
    },
    {
      name: 'Grocery Store Helper',
      title: 'Grocery Store Helper',
      category: 'community',
      location: 'Grocery store, Target, or quick errand',
      time: '10–15 minutes',
      description:
        'Let your child be your special helper during a simple shopping trip.',
      try_this: [
        'Ask your child to help find one color, one fruit, or one box.',
        'Let them place a safe item in the cart.',
        'Praise helping, waiting, looking, or staying nearby.',
      ],
      why_it_helps:
        'Supports real-world language, attention, patience, and community participation.',
    },
  ].slice(0, count);
}

function normalizeActivities(
  rawActivities: unknown,
  childName: string,
  count = 3
): any[] {
  const fallback = buildFallbackActivities(childName, count);

  if (!Array.isArray(rawActivities)) return fallback;

  const normalized = rawActivities.map((activity: any, index) => {
    const fallbackItem = fallback[index % fallback.length];

    return {
      name: safeString(activity?.name || activity?.title, fallbackItem.name),
      title: safeString(activity?.title || activity?.name, fallbackItem.title),
      category: safeString(
        activity?.category,
        fallbackItem.category || 'surprise'
      ),
      location: safeString(
        activity?.location || activity?.where,
        fallbackItem.location
      ),
      time: safeString(
        activity?.time || activity?.duration || activity?.estimated_time,
        fallbackItem.time
      ),
      description: safeString(
        activity?.description || activity?.summary,
        fallbackItem.description
      ),
      try_this: safeStringArray(
        activity?.try_this ||
          activity?.tryThis ||
          activity?.ideas ||
          activity?.instructions ||
          activity?.steps,
        fallbackItem.try_this
      ).slice(0, 4),
      why_it_helps: safeString(
        activity?.why_it_helps ||
          activity?.whyItHelps ||
          activity?.benefit ||
          activity?.success_criteria,
        fallbackItem.why_it_helps
      ),
    };
  });

  const completeActivities = normalized.filter(
    (activity) =>
      activity.name &&
      activity.title &&
      activity.description &&
      activity.try_this.length >= 2 &&
      activity.why_it_helps
  );

  return completeActivities.length
    ? completeActivities.slice(0, count)
    : fallback;
}

export async function generateDailyABAActivities({
  childName,
  location = 'Home, outdoor, or community',
  skillFocus = 'Fun family activities that naturally support development',
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
}): Promise<any[]> {
  const fallbackActivities = buildFallbackActivities(childName, count);

  try {
    const prompt = `
Create exactly ${count} Daily Adventures for a parent and child.

Child name: ${childName}
Location preference: ${location}
Personalization notes: ${skillFocus}

These should NOT feel like:
- ABA lessons
- therapy programs
- worksheets
- drills
- formal teaching
- clinical activities

These should feel like fun family activity ideas parents can do at home, outside, or in the community.

Return ONLY valid compact JSON array. No markdown. No extra text.

Each Daily Adventure must follow this exact shape:
{
  "name": "string",
  "title": "string",
  "category": "home | outdoor | community | sensory | creative | calm | movement",
  "location": "string",
  "time": "string",
  "description": "string",
  "try_this": ["string", "string", "string"],
  "why_it_helps": "string"
}

Rules:
- Exactly ${count} adventures.
- Do not include materials.
- Do not include instructions.
- Do not include success_criteria.
- Do not include goals.
- Do not say "child will."
- Do not mention trials, prompting, data collection, mastery, or success criteria.
- Each title should sound playful and fun.
- Each description should feel warm and parent-friendly.
- Each try_this item should be simple, playful, and natural.
- why_it_helps should explain development benefits without sounding clinical.
- Use everyday family language.
- Keep each try_this item under 130 characters.
- Keep why_it_helps under 180 characters.
- Make the ideas feel fresh and not repetitive.
`;

    const parsed = await generateJsonWithEdgeFunction<any[]>(
      prompt,
      fallbackActivities,
      'activities'
    );

    return normalizeActivities(parsed, childName, count);
  } catch (error) {
    console.error('Generate Daily Adventures error:', error);
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
  lessonVarietyGuidance = '',
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
  lessonVarietyGuidance?: string;
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
You are creating a real parent-led ABA home lesson for a child.

This should NOT be generic.
This should feel like a simple ABA therapy session a parent can actually run at home.

Child name: ${childName}
Category: ${skill}
Specific target skill: ${skillTarget || skill}
Location: ${location}
Lesson number: ${lessonNumber}
Difficulty guidance: ${difficultyModifier}

Behavior/support pattern:
${behaviorPattern?.summary || 'Use balanced prompting, short practice, and immediate reinforcement.'}

Variety guidance:
${lessonVarietyGuidance || 'Rotate lesson types so lessons do not all feel the same.'}

Avoid repeating these skills or lesson ideas:
${avoidSkills.length ? avoidSkills.join(', ') : 'None'}

Return ONLY valid JSON. No markdown. No bullets outside JSON.

JSON shape:
{
  "lesson_name": "string",
  "setting": "Home",
  "focus_skill": "string",
  "objective": "string",
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

Lesson quality rules:
- Make the lesson specific to the category and target skill.
- Do not write generic steps like "practice communication."
- Include exactly 2 simple household materials.
- Include exactly 2 setup steps.
- Include exactly 4 prompting hierarchy steps.
- Include exactly 5 teaching steps.
- Teaching steps should tell the parent exactly what to say or do.
- Include wait time when appropriate, such as 3–5 seconds.
- Include what the child should do.
- Include what the parent should do if the child does not respond.
- Include immediate reinforcement after attempts.
- Use home-friendly examples.
- Avoid clinical language.
- Keep it warm, practical, and parent-friendly.
- Do not mention therapy, clinic, therapist, or school.
- difficulty_level must be only support, balanced, or challenge.
- Keep every array item under 120 characters.
- Reinforcement must have exactly 2 items.
- Error correction must have exactly 2 items.
- Do not use long examples inside one sentence.
- Do not include commas at the end of array strings.
- Do not describe physical prompting around the mouth.
- Keep the full JSON compact and short.

Category examples:
Communication: requesting, choosing, help, all done, more, labeling, yes/no.
Social: turn taking, greeting, sharing attention, responding to name, waiting.
Play: imitation, functional play, pretend play, turn-taking play, expanding play.
Self-Help: brushing teeth, handwashing, cleaning up, dressing, snack routine.
Motor: clapping, jumping, stacking, crossing midline, imitation, obstacle play.
`;

    const raw = await generateJsonWithEdgeFunction<any>(
  prompt,
  fallback,
  'premium-lesson'
);
console.log('AI LESSON RAW:', raw);

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

    console.log('FINAL AI LESSON:', safeLesson.lesson_name, safeLesson);

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