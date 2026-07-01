import { generateDailyABAActivities } from './aiService';

import { supabase } from './supabase';

export type ActivitySetting = 'home' | 'community' | 'outdoor' | 'either';
export type ActivityDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type AdventureCategory =
  | 'home'
  | 'outdoor'
  | 'community'
  | 'sensory'
  | 'creative'
  | 'calm'
  | 'movement'
  | 'surprise';

export type AdventureFeedback = 'loved' | 'good' | 'not_today';

export type DailyActivity = {
  id?: string;
  name: string;
  title?: string;

  category?: AdventureCategory | string;
  setting?: ActivitySetting;
  difficulty?: ActivityDifficulty;

  location?: string;
  time?: string;
  description?: string;

  try_this?: string[];
  tryThis?: string[];

  why_it_helps?: string;
  whyItHelps?: string;

  parent_tip?: string;
  sensory_note?: string;
  community_option?: string;

  // Keep these optional so old saved/generated activities do not crash.
  goal?: string;
  materials?: string[];
  instructions?: string[];
  success_criteria?: string;
};

export type SavedActivityRow = {
  id: string;
  child_id: string;
  activity_name: string;
  activity_json: DailyActivity;
  is_saved: boolean;
  is_favorite: boolean;
  completed?: boolean;
  feedback?: AdventureFeedback;
  created_at?: string;
  updated_at?: string;
};

function safeString(value: any, fallback = '') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function safeArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item?.description) return String(item.description).trim();
        if (item?.text) return String(item.text).trim();
        if (item?.step) return String(item.step).trim();
        if (item?.name) return String(item.name).trim();
        if (item?.title) return String(item.title).trim();
        return String(item ?? '').trim();
      })
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n|\. /)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeCategory(value: any): AdventureCategory {
  const category = safeString(value).toLowerCase();

  if (
    category === 'home' ||
    category === 'outdoor' ||
    category === 'community' ||
    category === 'sensory' ||
    category === 'creative' ||
    category === 'calm' ||
    category === 'movement' ||
    category === 'surprise'
  ) {
    return category;
  }

  return 'surprise';
}

function normalizeSetting(value: any): ActivitySetting {
  if (value === 'home' || value === 'community' || value === 'outdoor') {
    return value;
  }

  return 'either';
}

function normalizeDifficulty(value: any): ActivityDifficulty {
  if (value === 'advanced' || value === 'intermediate') {
    return value;
  }

  return 'beginner';
}

function buildTryThisFallback(activity: any, childName = 'your child') {
  const instructions = safeArray(
    activity?.try_this ||
      activity?.tryThis ||
      activity?.ideas ||
      activity?.steps ||
      activity?.instructions ||
      activity?.teaching_steps
  );

  if (instructions.length >= 2) return instructions.slice(0, 4);

  return [
    `Follow ${childName}'s interest and keep the activity playful.`,
    'Pause, smile, and give your child time to join in their own way.',
    'Celebrate small moments like looking, pointing, laughing, helping, or trying.',
  ];
}

export function getTodayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function buildActivityId(activity: any, index: number) {
  return activity?.id || `${activity?.name || activity?.title || 'adventure'}-${index}`;
}

export function safeStringArray(value: any): string[] {
  return safeArray(value);
}

export function normalizeActivity(
  activity: any,
  index = 0,
  childName = 'your child'
): DailyActivity {
  const name = safeString(
    activity?.name || activity?.title,
    `Daily Adventure ${index + 1}`
  );

  const title = safeString(activity?.title || activity?.name, name);
  const category = normalizeCategory(activity?.category || activity?.type);
  const tryThis = buildTryThisFallback(activity, childName);

  return {
    id: safeString(activity?.id),
    name,
    title,

    category,
    setting: normalizeSetting(activity?.setting),
    difficulty: normalizeDifficulty(activity?.difficulty),

    location: safeString(
      activity?.location || activity?.where,
      category === 'community'
        ? 'Community outing'
        : category === 'outdoor'
          ? 'Backyard, park, or neighborhood'
          : 'Home or everyday family space'
    ),

    time: safeString(
      activity?.time || activity?.estimated_time || activity?.duration,
      '5–10 minutes'
    ),

    description: safeString(
      activity?.description || activity?.summary,
      'A simple, playful idea you can try together in a low-pressure way.'
    ),

    try_this: tryThis,
    tryThis,

    why_it_helps: safeString(
      activity?.why_it_helps ||
        activity?.whyItHelps ||
        activity?.benefit ||
        activity?.developmental_benefit ||
        activity?.parent_tip ||
        activity?.goal ||
        activity?.success_criteria,
      'Supports communication, attention, confidence, connection, and everyday development through play.'
    ),

    whyItHelps: safeString(
      activity?.whyItHelps ||
        activity?.why_it_helps ||
        activity?.benefit ||
        activity?.developmental_benefit,
      'Supports communication, attention, confidence, connection, and everyday development through play.'
    ),

    parent_tip: safeString(
      activity?.parent_tip || activity?.parentTip,
      'Keep it playful, flexible, and short. The goal is connection, not perfection.'
    ),

    sensory_note: safeString(activity?.sensory_note || activity?.sensoryNote),
    community_option: safeString(
      activity?.community_option || activity?.communityOption
    ),

    materials: safeArray(activity?.materials),
    instructions: safeArray(activity?.instructions || activity?.steps),
    goal: safeString(activity?.goal || activity?.objective),
    success_criteria: safeString(activity?.success_criteria || activity?.successCriteria),
  };
}

export function normalizeActivities(value: any): DailyActivity[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeActivity(item, index));
}

export function buildFallbackActivities(childName = 'your child'): DailyActivity[] {
  return [
    {
      name: 'Bubble Chase',
      title: 'Bubble Chase',
      category: 'outdoor',
      setting: 'outdoor',
      difficulty: 'beginner',
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
      parent_tip: 'Follow your child’s energy. This can be active or calm.',
      materials: [],
      instructions: [],
      success_criteria: '',
    },
    {
      name: 'Toy Rescue Mission',
      title: 'Toy Rescue Mission',
      category: 'home',
      setting: 'home',
      difficulty: 'beginner',
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
      parent_tip: 'Make it silly instead of serious.',
      materials: [],
      instructions: [],
      success_criteria: '',
    },
    {
      name: 'Grocery Store Helper',
      title: 'Grocery Store Helper',
      category: 'community',
      setting: 'community',
      difficulty: 'beginner',
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
      parent_tip: 'Keep it short and choose one small helper job.',
      sensory_note: 'Use quieter aisles or shorter trips if the store feels overwhelming.',
      materials: [],
      instructions: [],
      success_criteria: '',
    },
  ];
}

export function buildDailyAdventurePrompt({
  childName,
  count = 3,
  setting = 'either',
  recentTitles = [],
}: {
  childName: string;
  count?: number;
  setting?: ActivitySetting;
  recentTitles?: string[];
}) {
  const settingText =
    setting === 'community'
      ? 'Focus on community activities like stores, parks, libraries, errands, car rides, waiting rooms, or playgrounds.'
      : setting === 'home'
        ? 'Focus on at-home activities using simple everyday items.'
        : setting === 'outdoor'
          ? 'Focus on outdoor activities like parks, sidewalks, playgrounds, backyards, and neighborhood walks.'
          : 'Include a mix of at-home, outdoor, community, sensory, calm, movement, and creative activities.';

  return `
Generate ${count} Daily Adventures for ${childName}.

These should NOT feel like lessons, therapy, ABA programs, worksheets, drills, or formal teaching.

They should feel like playful family activities parents can do naturally at home, outside, or in the community.

${settingText}

Each activity must include:
- name
- title
- category: one of home, outdoor, community, sensory, creative, calm, movement
- location
- time
- description
- try_this: 3 simple playful ideas
- why_it_helps

Avoid:
- goals
- measurable objectives
- "child will"
- trials
- prompts
- data collection language
- clinical wording
- lesson-style instructions
- materials lists unless truly needed

Do not repeat or closely copy these recent activities:
${recentTitles.length ? recentTitles.map((title) => `- ${title}`).join('\n') : '- None'}

Tone:
Warm, parent-friendly, practical, playful, autism-friendly, and low-pressure.
`;
}


export async function getChildActivityContext(childId: string) {
  const [assessmentRes, lessonsRes, routinesRes] = await Promise.all([
    supabase
      .from('assessments')
      .select('responses, completed_at')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('lesson_logs')
      .select('category, lesson_name, status, performance_score, completed_at')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(10),

    supabase
      .from('routine_logs')
      .select('routine_name, routine_period, completed_at, completed')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(10),
  ]);

  return {
    assessmentContext: assessmentRes.data?.responses || {},
    recentLessons: lessonsRes.data || [],
    recentRoutines: routinesRes.data || [],
  };
}

export async function getRecentAdventureTitles({
  childId,
  limit = 30,
}: {
  childId: string;
  limit?: number;
}): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('daily_fun_activities')
      .select('activities_json')
      .eq('child_id', childId)
      .order('activity_date', { ascending: false })
      .limit(14);

    if (error) throw error;

    const titles: string[] = [];

    (data || []).forEach((row: any) => {
      if (Array.isArray(row.activities_json)) {
        row.activities_json.forEach((activity: any) => {
          const title = safeString(activity?.title || activity?.name);
          if (title && !titles.includes(title)) titles.push(title);
        });
      }
    });

    return titles.slice(0, limit);
  } catch (error) {
    console.error('getRecentAdventureTitles error:', error);
    return [];
  }
}

export async function generateCreativeDailyActivities({
  childId,
  childName,
  count = 3,
  setting = 'either',
  difficulty = 'beginner',
}: {
  childId: string;
  childName: string;
  count?: number;
  setting?: ActivitySetting;
  difficulty?: ActivityDifficulty;
}): Promise<DailyActivity[]> {
  try {
    const context = await getChildActivityContext(childId);
    const recentTitles = await getRecentAdventureTitles({ childId });

    const generated = await generateDailyABAActivities({
      childName,
      location:
        setting === 'community'
          ? 'Community outings'
          : setting === 'home'
            ? 'Home'
            : setting === 'outdoor'
              ? 'Outdoor'
              : 'Home, outdoor, and community',
      skillFocus: `
${buildDailyAdventurePrompt({
  childName,
  count,
  setting,
  recentTitles,
})}

Difficulty should be parent-friendly and ${difficulty}, but do not label the activity like a formal lesson.
`,
      assessmentContext: context.assessmentContext,
      recentLessons: context.recentLessons,
      recentRoutines: context.recentRoutines,
      count,
    });

    const normalized = normalizeActivities(generated);

    return normalized.length ? normalized : buildFallbackActivities(childName);
  } catch (error) {
    console.error('generateCreativeDailyActivities error:', error);
    return buildFallbackActivities(childName);
  }
}

export async function getOrCreateDailyActivities({
  childId,
  childName,
  forceRefresh = false,
  isPro = false,
}: {
  childId: string;
  childName: string;
  forceRefresh?: boolean;
  isPro?: boolean;
}): Promise<DailyActivity[]> {
  const today = getTodayLocalDateString();

  try {
    if (!forceRefresh) {
      const { data: existing, error } = await supabase
        .from('daily_fun_activities')
        .select('activities_json')
        .eq('child_id', childId)
        .eq('activity_date', today)
        .maybeSingle();

      if (error) throw error;

      if (Array.isArray(existing?.activities_json)) {
        return normalizeActivities(existing.activities_json);
      }
    }

   const activities = await generateCreativeDailyActivities({
  childId,
  childName,
  count: isPro ? 5 : 3,
  setting: 'either',
  difficulty: 'beginner',
});

    const { error: saveError } = await supabase.from('daily_fun_activities').upsert(
      [
        {
          child_id: childId,
          activity_date: today,
          activities_json: activities,
        },
      ],
      {
        onConflict: 'child_id,activity_date',
      }
    );

    if (saveError) {
      console.error('getOrCreateDailyActivities save error:', saveError);
    }

    return activities;
  } catch (error) {
    console.error('getOrCreateDailyActivities error:', error);
    return buildFallbackActivities(childName);
  }
}

export async function regenerateActivityAtIndex({
  childId,
  childName,
  activities,
  index,
}: {
  childId: string;
  childName: string;
  activities: DailyActivity[];
  index: number;
}): Promise<DailyActivity[]> {
  const today = getTodayLocalDateString();

  const generated = await generateCreativeDailyActivities({
    childId,
    childName,
    count: 1,
    setting: 'either',
    difficulty: 'beginner',
  });

  const replacement = generated[0] || buildFallbackActivities(childName)[0];
  const updated = [...activities];
  updated[index] = replacement;

  const { error } = await supabase.from('daily_fun_activities').upsert(
    [
      {
        child_id: childId,
        activity_date: today,
        activities_json: updated,
      },
    ],
    {
      onConflict: 'child_id,activity_date',
    }
  );

  if (error) {
    console.error('regenerateActivityAtIndex save error:', error);
  }

  return updated;
}

export async function getSavedActivityState({
  childId,
}: {
  childId: string;
}): Promise<{
  savedNames: string[];
  favoriteNames: string[];
  completedNames: string[];
}> {
  try {
    const { data, error } = await supabase
      .from('saved_activities')
      .select('activity_name, is_saved, is_favorite, completed')
      .eq('child_id', childId);

    if (error) throw error;

    return {
      savedNames: (data || [])
        .filter((row: any) => row.is_saved)
        .map((row: any) => row.activity_name),
      favoriteNames: (data || [])
        .filter((row: any) => row.is_favorite)
        .map((row: any) => row.activity_name),
      completedNames: (data || [])
        .filter((row: any) => row.completed)
        .map((row: any) => row.activity_name),
    };
  } catch (error) {
    console.error('getSavedActivityState error:', error);
    return {
      savedNames: [],
      favoriteNames: [],
      completedNames: [],
    };
  }
}

export async function toggleSavedActivity({
  childId,
  activity,
  currentValue,
}: {
  childId: string;
  activity: DailyActivity;
  currentValue: boolean;
}) {
  const nextValue = !currentValue;

  const { error } = await supabase.from('saved_activities').upsert(
    [
      {
        child_id: childId,
        activity_name: activity.name,
        activity_json: activity,
        is_saved: nextValue,
      },
    ],
    {
      onConflict: 'child_id,activity_name',
    }
  );

  if (error) throw error;

  return nextValue;
}

export async function toggleFavoriteActivity({
  childId,
  activity,
  currentValue,
}: {
  childId: string;
  activity: DailyActivity;
  currentValue: boolean;
}) {
  const nextValue = !currentValue;

  const { error } = await supabase.from('saved_activities').upsert(
    [
      {
        child_id: childId,
        activity_name: activity.name,
        activity_json: activity,
        is_favorite: nextValue,
        is_saved: true,
      },
    ],
    {
      onConflict: 'child_id,activity_name',
    }
  );

  if (error) throw error;

  return nextValue;
}

export async function saveActivityFeedback({
  childId,
  activity,
  feedback,
}: {
  childId: string;
  activity: DailyActivity;
  feedback: AdventureFeedback;
}) {
  const { error } = await supabase.from('saved_activities').upsert(
    [
      {
        child_id: childId,
        activity_name: activity.name,
        activity_json: activity,
        is_saved: true,
        completed: true,
        feedback,
      },
    ],
    {
      onConflict: 'child_id,activity_name',
    }
  );

  if (error) throw error;
}

export async function saveGeneratedActivity(
  childId: string,
  activity: any,
  currentSkill?: string,
  currentLevel?: string
) {
  const normalized = normalizeActivity(activity);

  const { error } = await supabase.from('saved_activities').insert({
    child_id: childId,
    activity_name: normalized.name,
    activity_json: normalized,
    is_saved: true,
    is_favorite: false,
  });

  if (error) throw error;
}