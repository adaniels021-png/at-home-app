import { generatePremiumLesson } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';

const FREE_QUEUE_LIMIT = 2;
const PRO_QUEUE_LIMIT = 4;
const MAX_GENERATION_ATTEMPTS = 3;

function getQueueLimit(isPro: boolean) {
  return isPro ? PRO_QUEUE_LIMIT : FREE_QUEUE_LIMIT;
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    throw new Error('User not authenticated.');
  }

  return data.user.id;
}

function isBasicOrFallbackLesson(lesson: any, source?: string | null) {
  if (!lesson || typeof lesson !== 'object') return true;
  // Do NOT automatically reject fallback.
  // Only reject it if the content itself is too basic.

  const text = [
    lesson.lesson_name,
    lesson.objective,
    ...(lesson.materials || []),
    ...(lesson.teaching_steps || []),
  ]
    .join(' ')
    .toLowerCase();

  const basicPhrases = [
    'preferred item',
    'small reinforcer',
    'give one short',
    'wait 3–5 seconds',
    'prompt gently',
    'reinforce any successful attempt',
    'simple parent-led routine',
  ];

  const basicHits = basicPhrases.filter((phrase) => text.includes(phrase)).length;

  const teachingSteps = Array.isArray(lesson.teaching_steps)
    ? lesson.teaching_steps
    : [];

  const objective = String(lesson.objective || '');

  return basicHits >= 4 || teachingSteps.length < 5 || objective.length < 120;
}

function hasFullLessonContent(lesson: any) {
  return Boolean(
    lesson?.lesson_name &&
      lesson?.objective &&
      String(lesson.objective).length >= 120 &&
      Array.isArray(lesson.materials) &&
      lesson.materials.length >= 2 &&
      Array.isArray(lesson.setup) &&
      lesson.setup.length >= 2 &&
      Array.isArray(lesson.teaching_steps) &&
      lesson.teaching_steps.length >= 5 &&
      Array.isArray(lesson.prompting_hierarchy) &&
      lesson.prompting_hierarchy.length >= 3 &&
      Array.isArray(lesson.reinforcement) &&
      lesson.reinforcement.length >= 1 &&
      lesson.success_criteria
  );
}

function normalizeGeneratedLesson(result: any, category: string) {
  const lesson = result?.lesson || result;
  const source = result?.source || 'ai';

  if (!hasFullLessonContent(lesson) || isBasicOrFallbackLesson(lesson, source)) {
    throw new Error('Generated lesson was too basic or fallback.');
  }

  return {
    lesson: {
      ...lesson,
      focus_skill: lesson.focus_skill || category,
      setting: lesson.setting || 'Home',
    },
    source: 'ai' as const,
  };
}

async function getNextLessonNumber({
  childId,
  category,
}: {
  childId: string;
  category: string;
}) {
  const [logsRes, instancesRes, queueRes] = await Promise.all([
    supabase
      .from('lesson_logs')
      .select('lesson_number')
      .eq('child_id', childId)
      .eq('category', category)
      .order('lesson_number', { ascending: false })
      .limit(1),

    supabase
      .from('daily_lesson_instances')
      .select('lesson_number')
      .eq('child_id', childId)
      .eq('category', category)
      .order('lesson_number', { ascending: false })
      .limit(1),

    supabase
      .from('lesson_queue')
      .select('lesson_number')
      .eq('child_id', childId)
      .eq('category', category)
      .order('lesson_number', { ascending: false })
      .limit(1),
  ]);

  const logNumber = Number(logsRes.data?.[0]?.lesson_number || 0);
  const instanceNumber = Number(instancesRes.data?.[0]?.lesson_number || 0);
  const queueNumber = Number(queueRes.data?.[0]?.lesson_number || 0);

  return Math.max(logNumber, instanceNumber, queueNumber) + 1;
}

async function markBadQueuedLessonsUsed(childId: string, category: string) {
  const { data } = await supabase
    .from('lesson_queue')
    .select('id, lesson_payload, source')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('is_used', false);

  const badIds =
    data
      ?.filter((row: any) =>
        isBasicOrFallbackLesson(row.lesson_payload, row.source)
      )
      .map((row: any) => row.id) || [];

  if (badIds.length > 0) {
    await supabase
      .from('lesson_queue')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .in('id', badIds);
  }
}

async function generateFullAiLesson({
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
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const generated = await generatePremiumLesson({
        childName,
        childId,
        skill: category,
        location: 'Home',
        lessonNumber,
      });

      return normalizeGeneratedLesson(generated, category);
    } catch (error) {
      lastError = error;
      console.log(`AI lesson generation attempt ${attempt} failed:`, error);
    }
  }

  throw lastError || new Error('Could not generate a full AI lesson.');
}

export async function ensureLessonQueue({
  childId,
  childName = 'your child',
  category = 'Communication',
  isPro,
}: {
  childId: string;
  childName?: string;
  category?: string;
  isPro: boolean;
}) {
  const userId = await getAuthenticatedUserId();
  const queueLimit = getQueueLimit(isPro);

  await markBadQueuedLessonsUsed(childId, category);

  const { data: queuedLessons, error } = await supabase
    .from('lesson_queue')
    .select('id')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('is_used', false)
    .not('lesson_payload', 'is', null)

  if (error) {
    console.log('Queue check error:', error);
    return;
  }

  const currentCount = queuedLessons?.length ?? 0;
  const lessonsNeeded = queueLimit - currentCount;

  if (lessonsNeeded <= 0) return;

  const startLessonNumber = await getNextLessonNumber({
    childId,
    category,
  });

  for (let i = 0; i < lessonsNeeded; i++) {
    const lessonNumber = startLessonNumber + i;

    try {
      const normalized = await generateFullAiLesson({
        childId,
        childName,
        category,
        lessonNumber,
      });

      const { error: insertError } = await supabase.from('lesson_queue').upsert(
        {
          user_id: userId,
          child_id: childId,
          category,
          lesson_number: lessonNumber,
          lesson_payload: normalized.lesson,
          source: normalized.source,
          is_used: false,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'child_id,category,lesson_number',
        }
      );

      if (insertError) {
        console.log('Queue insert error:', insertError);
      }
    } catch (error) {
      console.log('Skipped saving basic/fallback queued lesson:', error);
    }
  }
}

export async function getNextQueuedLesson({
  childId,
  childName = 'your child',
  category = 'Communication',
  isPro,
}: {
  childId: string;
  childName?: string;
  category?: string;
  isPro: boolean;
}) {
  const userId = await getAuthenticatedUserId();
  const today = todayString();
  const now = new Date().toISOString();

  await markBadQueuedLessonsUsed(childId, category);

  const { data: openInstance, error: openError } = await supabase
    .from('daily_lesson_instances')
    .select('*')
    .eq('child_id', childId)
    .eq('lesson_date', today)
    .eq('category', category)
    .in('status', ['generated', 'started'])
    .is('completed_at', null)
    .order('lesson_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (openError) throw openError;

  if (
    openInstance?.lesson_payload &&
    !isBasicOrFallbackLesson(openInstance.lesson_payload, openInstance.source)
  ) {
    return {
      lesson_instance_id: openInstance.id,
      lesson_payload: openInstance.lesson_payload,
      lesson_number: openInstance.lesson_number,
      source: openInstance.source || 'ai',
    };
  }

  if (openInstance?.id) {
    await supabase
      .from('daily_lesson_instances')
      .update({
        status: 'unsuccessful',
        updated_at: now,
      })
      .eq('id', openInstance.id);
  }

  const { data: todayInstances, error: todayError } = await supabase
    .from('daily_lesson_instances')
    .select('lesson_number')
    .eq('child_id', childId)
    .eq('lesson_date', today)
    .eq('category', category);

  if (todayError) throw todayError;

  const usedTodayNumbers = (todayInstances || [])
    .map((row: any) => Number(row.lesson_number))
    .filter(Boolean);

  if (usedTodayNumbers.length > 0) {
    await supabase
      .from('lesson_queue')
      .update({
        is_used: true,
        used_at: now,
      })
      .eq('child_id', childId)
      .eq('category', category)
      .eq('is_used', false)
      .in('lesson_number', usedTodayNumbers);
  }

  let queueQuery = supabase
    .from('lesson_queue')
    .select('*')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('is_used', false)
    .not('lesson_payload', 'is', null)
    .order('lesson_number', { ascending: true })
    .limit(1);

  if (usedTodayNumbers.length > 0) {
    queueQuery = queueQuery.not(
      'lesson_number',
      'in',
      `(${usedTodayNumbers.join(',')})`
    );
  }

  let { data: lessonToOpen, error: queueError } = await queueQuery.maybeSingle();

  if (queueError) throw queueError;

  if (
    lessonToOpen &&
    isBasicOrFallbackLesson(lessonToOpen.lesson_payload, lessonToOpen.source)
  ) {
    await supabase
      .from('lesson_queue')
      .update({
        is_used: true,
        used_at: now,
      })
      .eq('id', lessonToOpen.id);

    lessonToOpen = null;
  }

  if (!lessonToOpen) {
    const nextLessonNumber = await getNextLessonNumber({
      childId,
      category,
    });

    const normalized = await generateFullAiLesson({
      childId,
      childName,
      category,
      lessonNumber: nextLessonNumber,
    });

    const { data: insertedQueue, error: insertQueueError } = await supabase
      .from('lesson_queue')
      .insert({
        user_id: userId,
        child_id: childId,
        category,
        lesson_number: nextLessonNumber,
        lesson_payload: normalized.lesson,
        source: normalized.source,
        is_used: false,
        created_at: now,
      })
      .select()
      .single();

    if (insertQueueError) throw insertQueueError;

    lessonToOpen = insertedQueue;
  }

  const { data: lessonInstance, error: instanceError } = await supabase
    .from('daily_lesson_instances')
    .insert({
      user_id: userId,
      child_id: childId,
      lesson_date: today,
      category,
      lesson_number: lessonToOpen.lesson_number,
      lesson_payload: lessonToOpen.lesson_payload,
      source: lessonToOpen.source || 'ai',
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
    if (instanceError.code === '23505') {
      if (lessonToOpen.id) {
        await supabase
          .from('lesson_queue')
          .update({
            is_used: true,
            used_at: now,
          })
          .eq('id', lessonToOpen.id);
      }

      return await getNextQueuedLesson({
        childId,
        childName,
        category,
        isPro,
      });
    }

    console.log('Create lesson instance from queue error:', instanceError);
    throw instanceError;
  }

  await supabase
    .from('lesson_queue')
    .update({
      is_used: true,
      used_at: now,
    })
    .eq('id', lessonToOpen.id);

  ensureLessonQueue({
    childId,
    childName,
    category,
    isPro,
  }).catch((err) => {
    console.log('Background lesson refill failed:', err);
  });

  return {
    lesson_instance_id: lessonInstance.id,
    lesson_payload: lessonInstance.lesson_payload,
    lesson_number: lessonInstance.lesson_number,
    source: lessonInstance.source || lessonToOpen.source || 'ai',
  };
}