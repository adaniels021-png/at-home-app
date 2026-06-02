import { generateDailyABAActivities } from './aiService';
import { supabase } from './supabase';

export type ActivitySetting = 'home' | 'community' | 'either';
export type ActivityDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type DailyActivity = {
  name: string;
  setting: ActivitySetting;
  difficulty: ActivityDifficulty;
  goal: string;
  materials: string[];
  instructions: string[];
  success_criteria: string;
  parent_tip: string;
  sensory_note?: string;
  community_option?: string;
};

export type SavedActivityRow = {
  id: string;
  child_id: string;
  activity_name: string;
  activity_json: DailyActivity;
  is_saved: boolean;
  is_favorite: boolean;
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

export async function safePregenerateActivityQueue({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  try {
    return;
  } catch (error) {
    console.error('Pregenerate activity queue error:', error);
  }
}
  
  export function buildActivityId(activity: any, index: number) {
  return (
    activity?.id ||
    `${activity?.name || 'activity'}-${index}`
  );
}

export function normalizeActivity(activity: any, index = 0): DailyActivity {
  const materials = safeArray(activity?.materials);
  const instructions = safeArray(
    activity?.instructions || activity?.steps || activity?.teaching_steps
  );

  return {
    name: safeString(activity?.name || activity?.title, `Activity ${index + 1}`),
    setting:
      activity?.setting === 'community' || activity?.setting === 'either'
        ? activity.setting
        : 'home',
    difficulty:
      activity?.difficulty === 'advanced' ||
      activity?.difficulty === 'intermediate'
        ? activity.difficulty
        : 'beginner',
    goal: safeString(
      activity?.goal || activity?.objective,
      'Practice communication, play, attention, or daily living skills in a fun way.'
    ),
    materials:
      materials.length > 0
        ? materials
        : ['Preferred toy or item', 'Simple household item', 'Small reinforcer'],
    instructions:
      instructions.length >= 3
        ? instructions
        : [
            'Set up the activity in a calm and simple space.',
            'Show your child what to do using simple language.',
            'Wait 3–5 seconds for your child to respond.',
            'Prompt gently if needed.',
            'Praise or reward any attempt right away.',
          ],
    success_criteria: safeString(
      activity?.success_criteria || activity?.successCriteria,
      'Your child participates with support for 2–5 minutes.'
    ),
    parent_tip: safeString(
      activity?.parent_tip || activity?.parentTip,
      'Keep it short, fun, and end after a successful attempt.'
    ),
    sensory_note: safeString(activity?.sensory_note || activity?.sensoryNote),
    community_option: safeString(
      activity?.community_option || activity?.communityOption
    ),
  };
}

export function normalizeActivities(value: any): DailyActivity[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeActivity(item, index));
}

export function safeStringArray(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item?.description) return String(item.description).trim();
        if (item?.text) return String(item.text).trim();
        if (item?.step) return String(item.step).trim();
        if (item?.name) return String(item.name).trim();
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

export function buildFallbackActivities(childName = 'your child'): DailyActivity[] {
  return [
    {
      name: 'Treasure Hunt Requests',
      setting: 'home',
      difficulty: 'beginner',
      goal: 'Practice requesting, pointing, looking, or using words/signs to ask for items.',
      materials: ['Favorite toy', 'Snack', 'Small basket or bag'],
      instructions: [
        `Hide 3 favorite items around the room where ${childName} can partially see them.`,
        'Point to one item and say, “What do you want?” or “Find it!”',
        'Wait 3–5 seconds for a reach, point, look, sign, sound, or word.',
        'Prompt the request if needed, then immediately give access to the item.',
        'Celebrate each find with praise and a short play moment.',
      ],
      success_criteria: `${childName} makes 3 request attempts with support.`,
      parent_tip: 'Accept any clear communication attempt, not only full words.',
      sensory_note: 'Use calm hiding spots if your child becomes overstimulated.',
      community_option: 'Try this at the park by looking for a bench, tree, slide, or ball.',
    },
    {
      name: 'Grocery Store Color Mission',
      setting: 'community',
      difficulty: 'intermediate',
      goal: 'Practice color recognition, scanning, and following simple directions.',
      materials: ['Grocery cart', 'Real store items or pretend food at home'],
      instructions: [
        'Choose one color, such as red.',
        `Ask ${childName} to help find something red on a shelf, in the cart, or at home.`,
        'Point to two choices if needed and say, “Which one is red?”',
        'Praise any correct look, touch, point, or answer.',
        'Repeat with 2–3 colors, keeping it playful and short.',
      ],
      success_criteria: `${childName} identifies or points to 3 colored items with support.`,
      parent_tip: 'Use real-life errands as short learning moments, not long lessons.',
      sensory_note: 'Use quieter aisles or practice at home if the store is too loud.',
      community_option: 'Use this at Target, the grocery store, library, or park.',
    },
    {
      name: 'Animal Movement Copycat',
      setting: 'either',
      difficulty: 'beginner',
      goal: 'Practice imitation, motor planning, attention, and social play.',
      materials: ['Open floor space', 'Animal pictures or stuffed animals'],
      instructions: [
        'Pick one animal and model the movement, such as hopping like a bunny.',
        `Say, “${childName}, do this!” and show the movement again.`,
        'Help your child copy using a gesture, model, or gentle prompt if needed.',
        'Give big praise for any attempt.',
        'Try 3 animals, such as bunny, bear, frog, or bird.',
      ],
      success_criteria: `${childName} imitates or attempts 3 animal movements.`,
      parent_tip: 'Silly activities are still learning. Fun increases engagement.',
      sensory_note: 'Choose slower movements if your child needs calming input.',
      community_option: 'Try animal walks at the park or while waiting in line.',
    },
  ];
}

export async function getNextActivitiesFromQueue({
  childId,
}: {
  childId: string;
}) {
  return null;
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

    const generated = await generateDailyABAActivities({
      childName,
      location:
        setting === 'community'
          ? 'Community outings such as store, park, library, car, or errands'
          : setting === 'home'
            ? 'Home'
            : 'Home and community',
      skillFocus: `
Create creative, fun ABA-style activities for children with autism.
Activities should feel like play, errands, movement games, sensory-friendly games, social games, or daily routine practice.
Avoid boring worksheet-style tasks.
Include home and community options.
Difficulty level: ${difficulty}.
Focus on communication, play, imitation, following directions, waiting, turn-taking, requesting, tolerance, sensory-friendly participation, and independence.
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

export async function getQueuedActivities({
  childId,
}: {
  childId: string;
}): Promise<DailyActivity[] | null> {
  try {
    const { data, error } = await supabase
      .from('activity_queue')
      .select('*')
      .eq('child_id', childId)
      .eq('is_used', false)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data?.activities_json) return null;

    await supabase
      .from('activity_queue')
      .update({ is_used: true })
      .eq('id', data.id);

    return normalizeActivities(data.activities_json);
  } catch (error) {
    console.error('getQueuedActivities error:', error);
    return null;
  }
}

export async function pregenerateActivityQueue({
  childId,
  childName,
  count = 5,
}: {
  childId: string;
  childName: string;
  count?: number;
}) {
  try {
    const { data: existing } = await supabase
      .from('activity_queue')
      .select('id')
      .eq('child_id', childId)
      .eq('is_used', false)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    const activities = await generateCreativeDailyActivities({
      childId,
      childName,
      count,
      setting: 'either',
      difficulty: 'beginner',
    });

    const { error } = await supabase.from('activity_queue').insert({
      child_id: childId,
      activities_json: activities,
      is_used: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('pregenerateActivityQueue insert error:', error);
    }
  } catch (error) {
    console.error('pregenerateActivityQueue error:', error);
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

    let activities: DailyActivity[] | null = null;

    if (isPro) {
      activities = await getQueuedActivities({ childId });
    }

    if (!activities || activities.length === 0) {
      activities = await generateCreativeDailyActivities({
        childId,
        childName,
        count: isPro ? 5 : 3,
        setting: 'either',
        difficulty: 'beginner',
      });
    }

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

    void pregenerateActivityQueue({
      childId,
      childName,
      count: 5,
    });

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
}> {
  try {
    const { data, error } = await supabase
      .from('saved_activities')
      .select('activity_name, is_saved, is_favorite')
      .eq('child_id', childId);

    if (error) throw error;

    return {
      savedNames: (data || [])
        .filter((row: any) => row.is_saved)
        .map((row: any) => row.activity_name),
      favoriteNames: (data || [])
        .filter((row: any) => row.is_favorite)
        .map((row: any) => row.activity_name),
    };
  } catch (error) {
    console.error('getSavedActivityState error:', error);
    return {
      savedNames: [],
      favoriteNames: [],
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