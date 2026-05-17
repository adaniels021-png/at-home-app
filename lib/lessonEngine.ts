import { supabase } from './supabase';

import { getAdaptiveLessonDecision } from './adaptiveLearningBrain';

import {
  generatePremiumLesson,
  getNextLessonFromQueue,
  Lesson,
  pregenerateLessonQueue,
} from './aiService';


type GetNextLessonInput = {
  childId: string;
  childName: string;
  isPro: boolean;
  category?: string;
};

type CompleteLessonInput = {
  lessonId: string;
  childId?: string;
  category?: string;
  performanceScore: number;
  promptLevel?: string;
  behaviorResponse?: string;
  consistencyLevel?: string;
  status?: 'completed' | 'unsuccessful';
};

type LessonWithMeta = Lesson & {
  id: string;
  lesson_number: number;
  source?: 'ai' | 'fallback';
};

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.id) {
    throw new Error('User not authenticated.');
  }

  return data.user.id;
}

async function ensureLessonQueue({
  childId,
  childName,
  category,
  lessonNumber,
}: {
  childId: string;
  childName: string;
  category: string;
  lessonNumber: number;
}) {
  try {
    const { count, error } = await supabase
      .from('lesson_queue')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('child_id', childId)
      .eq('category', category)
      .eq('is_used', false);

    if (error) {
      console.error('Queue count error:', error);
      return;
    }

    const queueCount = count || 0;

    // already enough lessons
    if (queueCount >= 3) {
      return;
    }

    // check lock
    const { data: existingLock } = await supabase
      .from('lesson_generation_lock')
      .select('id')
      .eq('child_id', childId)
      .eq('category', category)
      .maybeSingle();

    if (existingLock) {
      console.log('⚠️ Generation already in progress');
      return;
    }

    // create lock
    await supabase.from('lesson_generation_lock').insert({
      child_id: childId,
      category,
      created_at: new Date().toISOString(),
    });

    console.log('⚡ Refilling lesson queue...');

    await pregenerateLessonQueue({
      childName,
      childId,
      category,
      startLessonNumber: lessonNumber,
      count: 3 - queueCount,
    });

  } catch (error) {
    console.error('ensureLessonQueue error:', error);

  } finally {
    // ALWAYS remove lock
    await supabase
      .from('lesson_generation_lock')
      .delete()
      .eq('child_id', childId)
      .eq('category', category);
  }
}

async function getRecentLessonHistory(childId: string, category: string) {
  const { data, error } = await supabase
    .from('lesson_logs')
    .select('lesson_name, category, performance_score, created_at')
    .eq('child_id', childId)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('getRecentLessonHistory error:', error);
    return [];
  }

  return data || [];
}

async function getNextLessonNumber(childId: string, category: string) {
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

  return Number(data?.[0]?.lesson_number || 0) + 1;
}

function normalizeText(text: string) {
  return text?.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function extractCoreWords(text: string) {
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length > 3);
}

function similarityScore(a: string, b: string) {
  const aWords = extractCoreWords(a);
  const bWords = extractCoreWords(b);

  if (!aWords.length || !bWords.length) return 0;

  const matches = aWords.filter((word) => bWords.includes(word));
  return matches.length / Math.max(aWords.length, bWords.length);
}

function isLessonTooSimilar(newLesson: any, recentLessons: any[]) {
  if (!newLesson) return true;

  const newName = newLesson.lesson_name || '';
  const newSkill = newLesson.focus_skill || '';
  const newSteps = (newLesson.teaching_steps || []).join(' ');

  return recentLessons.some((lesson) => {
    const oldName = lesson.lesson_name || '';

    const nameScore = similarityScore(newName, oldName);
    const skillScore = similarityScore(newSkill, oldName);
    const stepScore = similarityScore(newSteps, oldName);

    return (
      nameScore > 0.6 ||     // similar name
      skillScore > 0.6 ||    // same skill disguised
      stepScore > 0.5        // similar teaching steps
    );
  });
}

async function getFreeLessonsUsedToday(childId: string) {
  const today = todayString();

  const { count, error } = await supabase
    .from('lesson_logs')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .in('status', ['success', 'completed'])
    .gte('completed_at', `${today}T00:00:00`);

  if (error) {
    console.error('free lesson count error:', error);
    return 0;
  }

  return count || 0;
}

async function getOpenLessonInstance({
  childId,
  category,
}: {
  childId: string;
  category: string;
}) {
  const today = todayString();

  const { data, error } = await supabase
  .from('daily_lesson_instances')
  .select('*')
  .eq('child_id', childId)
  .eq('category', category)
  .eq('lesson_date', today)
  .in('status', ['generated', 'started'])
  .is('completed_at', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

  console.log('OPEN LESSON INSTANCE:', data);

  if (error) {
    console.error('getOpenLessonInstance error:', error);
    return null;
  }

  if (!data) return null;

  if (data.status !== 'started') {
    await supabase
      .from('daily_lesson_instances')
      .update({
        status: 'started',
        started_at: data.started_at || new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
  }

  return data;
}

function normalizeLessonForScreen({
  lesson,
  id,
  lessonNumber,
  source,
}: {
  lesson: Lesson;
  id: string;
  lessonNumber: number;
  source?: 'ai' | 'fallback';
}): LessonWithMeta {
  return {
    ...lesson,
    id,
    lesson_number: lessonNumber,
    source,
  };
}

async function safePregenerateLessons({
  childName,
  childId,
  category,
  startLessonNumber,
}: {
  childName: string;
  childId: string;
  category: string;
  startLessonNumber: number;
}) {
  try {
    await pregenerateLessonQueue({
      childName,
      childId,
      category,
      startLessonNumber,
    });
  } catch (error) {
    console.log('Lesson pregeneration skipped or already exists.');
  }
}

export async function getNextLesson({
  childId,
  childName,
  isPro,
  category = 'Communication',
}: GetNextLessonInput): Promise<LessonWithMeta> {
  const userId = await getUserId();

  if (!isPro) {
    const usedToday = await getFreeLessonsUsedToday(childId);

    if (usedToday >= 1) {
      throw new Error(
        'Daily free lesson limit reached. Upgrade to Pro for unlimited lessons.'
      );
    }
  }

  const lessonNumber = await getNextLessonNumber(childId, category);

  const openLesson = await getOpenLessonInstance({ childId, category });

  if (openLesson?.lesson_payload) {
  return normalizeLessonForScreen({
    lesson: openLesson.lesson_payload,
    id: openLesson.id,
    lessonNumber: openLesson.lesson_number || 1,
    source: openLesson.source,
  });
}

  const queuedLesson = await getNextLessonFromQueue({
    childId,
    category,
  });

  if (queuedLesson?.lesson_payload) {
    void ensureLessonQueue({
  childId,
  childName,
  category,
  lessonNumber:
    Number(queuedLesson?.lesson_number || lessonNumber) + 1,
});

    return normalizeLessonForScreen({
      lesson: queuedLesson.lesson_payload,
      id: queuedLesson.id,
      lessonNumber: queuedLesson.lesson_number || lessonNumber,
      source: queuedLesson.source || 'ai',
    });
  }

  const adaptiveDecision = await getAdaptiveLessonDecision({
  childId,
  category,
});

const trend = adaptiveDecision.difficultyTrend;
const skillTarget = adaptiveDecision.skillTarget;
const behaviorPattern = adaptiveDecision.behaviorStrategy;
const avoidSkills = adaptiveDecision.avoidSkills;

  const recentLessons = await getRecentLessonHistory(childId, category);

let result;
let attempts = 0;
const MAX_ATTEMPTS = 5;

do {
  result = await generatePremiumLesson({
    childName,
    childId,
    skill: category,
    location: 'Home',
    lessonNumber,
    difficultyTrend: trend,
    skillTarget,
    behaviorPattern,
    avoidSkills,
  });

  attempts++;

  console.log('🧠 Lesson attempt:', attempts, result?.lesson?.lesson_name);

} while (
  attempts < MAX_ATTEMPTS &&
  isLessonTooSimilar(result?.lesson, recentLessons)
);

if (isLessonTooSimilar(result.lesson, recentLessons)) {
  console.log('⚠️ Forcing STRONG variation fallback');

  result.lesson.lesson_name =
    result.lesson.lesson_name + ' (New Variation ' + Date.now() + ')';

  result.lesson.materials = [
    'Different toy or item',
    'New environment setup',
  ];

  result.lesson.teaching_steps = [
    'Introduce the skill using a completely different object.',
    'Change the setting (table, floor, outside).',
    'Use a new prompting strategy.',
    'Reinforce quickly with a different reward.',
  ];

  result.lesson.focus_skill =
    (result.lesson.focus_skill || category) + ' variation';
}

  const now = new Date().toISOString();

  const { data, error } = await supabase
  .from('daily_lesson_instances')
  .upsert(
    {
      user_id: userId,
      child_id: childId,
      lesson_date: todayString(),
      category,
      lesson_number: lessonNumber,
      lesson_payload: result.lesson,
      source: result.source || 'ai',
      status: 'started',
      started_at: now,
      last_opened_at: now,
      is_resumed: false,
      resumed_from_date: null,
      created_at: now,
      updated_at: now,
    },
    {
     onConflict: 'child_id,lesson_date,category,lesson_number',
    }
  )
  .select()
  .single();

if (error) {
  console.error('create lesson instance error:', error);

  if (error.code === '23505') {
    const { data: existingLesson, error: existingError } = await supabase
      .from('daily_lesson_instances')
      .select('*')
      .eq('child_id', childId)
      .eq('lesson_date', todayString())
      .eq('category', category)
      .in('status', ['generated', 'started', 'unsuccessful'])
      .order('lesson_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingError && existingLesson?.lesson_payload) {
      return normalizeLessonForScreen({
        lesson: existingLesson.lesson_payload,
        id: existingLesson.id,
        lessonNumber: existingLesson.lesson_number || lessonNumber,
        source: existingLesson.source || 'ai',
      });
    }
  }

  throw error;
}

  return normalizeLessonForScreen({
    lesson: result.lesson,
    id: data.id,
    lessonNumber,
    source: result.source,
  });
}

export async function completeLesson({
  lessonId,
  childId,
  category = 'Communication',
  performanceScore,
  promptLevel = 'verbal',
  behaviorResponse = 'engaged',
  consistencyLevel = 'medium',
  status = 'completed',
}: CompleteLessonInput) {
  const userId = await getUserId();
  const completedAt = new Date().toISOString();

  const { data: instance, error: readError } = await supabase
    .from('daily_lesson_instances')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();

  if (readError) {
    console.error('read lesson instance error:', readError);
    throw readError;
  }

  if (!instance) {
    throw new Error('Lesson instance not found.');
  }

  const lesson = instance.lesson_payload || {};
  const finalChildId = childId || instance.child_id;
  const finalCategory = category || instance.category;
  const logStatus = status === 'completed' ? 'success' : 'unsuccessful';

  const { error: updateError } = await supabase
  .from('daily_lesson_instances')
  .update({
    status,
    performance_score: performanceScore,
    completed_at: status === 'completed' ? completedAt : null,
    last_opened_at: completedAt,
    updated_at: completedAt,
  })
  .eq('id', lessonId);

  if (updateError) {
    console.error('complete lesson instance error:', updateError);
    throw updateError;
  }

  const { error: logError } = await supabase.from('lesson_logs').insert({
  child_id: finalChildId,
  lesson_number: instance.lesson_number,
  category: finalCategory,
  lesson_name: lesson.lesson_name || lesson.focus_skill || 'Daily Lesson',
  status: logStatus,
  performance_score: performanceScore,
  prompt_level: promptLevel,
  behavior_response: behaviorResponse,
  consistency_level: consistencyLevel,
  completed_at: completedAt,
});

  if (logError) {
    console.error('lesson log insert error:', logError);
    throw logError;
  }

  await updateSkillMasteryFromLesson({
    childId: finalChildId,
    category: finalCategory,
    skillTarget: lesson.focus_skill || lesson.lesson_name || finalCategory,
    performanceScore,
  });

  await updateLessonStreak({
    childId: finalChildId,
  });

  return true;
}

async function updateSkillMasteryFromLesson({
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
  const successful = performanceScore >= 70;
  const now = new Date().toISOString();

  const { data: existing, error } = await supabase
    .from('skill_mastery')
    .select('*')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('skill_target', skillTarget)
    .maybeSingle();

  if (error) {
    console.error('skill mastery read error:', error);
    return;
  }

  if (!existing) {
    await supabase.from('skill_mastery').insert({
      child_id: childId,
      category,
      skill_target: skillTarget,
      attempts: 1,
      successful_attempts: successful ? 1 : 0,
      average_score: performanceScore,
      mastery_status:
        performanceScore >= 85 && successful
          ? 'mastered'
          : performanceScore >= 60
            ? 'practicing'
            : 'emerging',
      last_practiced_at: now,
      updated_at: now,
    });

    return;
  }

  const attempts = Number(existing.attempts || 0) + 1;
  const successfulAttempts =
    Number(existing.successful_attempts || 0) + (successful ? 1 : 0);

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
      last_practiced_at: now,
      updated_at: now,
    })
    .eq('id', existing.id);
}

async function updateLessonStreak({ childId }: { childId: string }) {
  try {
    const userId = await getUserId();
    const today = todayString();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const yesterday = [
      yesterdayDate.getFullYear(),
      `${yesterdayDate.getMonth() + 1}`.padStart(2, '0'),
      `${yesterdayDate.getDate()}`.padStart(2, '0'),
    ].join('-');

    const { data: existing, error } = await supabase
      .from('lesson_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('child_id', childId)
      .maybeSingle();

    if (error) {
      console.error('lesson streak read error:', error);
      return;
    }

    if (!existing) {
      await supabase.from('lesson_streaks').insert({
        user_id: userId,
        child_id: childId,
        current_streak: 1,
        best_streak: 1,
        last_completed_date: today,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return;
    }

    if (existing.last_completed_date === today) {
      return;
    }

    const currentStreak =
      existing.last_completed_date === yesterday
        ? Number(existing.current_streak || 0) + 1
        : 1;

    const bestStreak = Math.max(Number(existing.best_streak || 0), currentStreak);

    await supabase
      .from('lesson_streaks')
      .update({
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_completed_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } catch (error) {
    console.error('updateLessonStreak error:', error);
  }
}