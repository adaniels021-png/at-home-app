import { generatePremiumLesson } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';

const FREE_QUEUE_LIMIT = 2;
const PRO_QUEUE_LIMIT = 4;

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

function buildFallbackLesson(
  category: string,
  childName: string,
  lessonNumber: number
) {
  return {
    lesson_name: `${category} Practice Lesson ${lessonNumber}`,
    objective: `${childName || 'Your child'} will practice a simple ${category.toLowerCase()} skill during a short parent-led routine.`,
    setting: 'Home',
    focus_skill: category,
    materials: ['Preferred item', 'Visual support if available', 'Small reinforcer'],
    setup: [
      'Choose a calm area with limited distractions.',
      'Place the materials nearby before starting.',
    ],
    teaching_steps: [
      'Get your child’s attention.',
      'Give one short, clear instruction.',
      'Wait 3–5 seconds for a response.',
      'Prompt gently if needed.',
      'Reinforce any successful attempt right away.',
    ],
    prompting_hierarchy: [
      'Independent',
      'Gesture prompt',
      'Model prompt',
      'Verbal prompt',
      'Physical support only if needed',
    ],
    reinforcement: [
      'Specific praise',
      'Access to a preferred item',
      'Short celebration after success',
    ],
    error_correction: [
      'Stay calm and brief.',
      'Model the correct response.',
      'Try again with more support.',
    ],
    generalization: [
      'Practice the same skill in another room.',
      'Have another caregiver try the same routine later.',
    ],
    success_criteria: 'Complete 3–5 practice opportunities with support.',
    parent_coaching_note:
      'Keep the session short, positive, and focused on successful attempts.',
  };
}

function normalizeGeneratedLesson(
  result: any,
  category: string,
  childName: string,
  lessonNumber: number
) {
  const lesson = result?.lesson || result;

  if (!lesson || typeof lesson !== 'object') {
    return {
      lesson: buildFallbackLesson(category, childName, lessonNumber),
      source: 'fallback',
    };
  }

  return {
    lesson: {
      ...buildFallbackLesson(category, childName, lessonNumber),
      ...lesson,
      focus_skill: lesson.focus_skill || category,
      setting: lesson.setting || 'Home',
    },
    source: result?.source || 'ai',
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

  await supabase
    .from('lesson_queue')
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
    })
    .eq('child_id', childId)
    .eq('category', category)
    .eq('is_used', false)
    .is('lesson_payload', null);

  const { data: queuedLessons, error } = await supabase
    .from('lesson_queue')
    .select('id')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('is_used', false)
    .not('lesson_payload', 'is', null);

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
      const generated = await generatePremiumLesson({
        childName,
        childId,
        skill: category,
        location: 'Home',
        lessonNumber,
      });

      const normalized = normalizeGeneratedLesson(
        generated,
        category,
        childName,
        lessonNumber
      );

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
      console.log('Generate queued lesson error:', error);

      const fallback = buildFallbackLesson(category, childName, lessonNumber);

      await supabase.from('lesson_queue').upsert(
        {
          user_id: userId,
          child_id: childId,
          category,
          lesson_number: lessonNumber,
          lesson_payload: fallback,
          source: 'fallback',
          is_used: false,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'child_id,category,lesson_number',
        }
      );
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

  if (openInstance?.lesson_payload) {
    return {
      lesson_instance_id: openInstance.id,
      lesson_payload: openInstance.lesson_payload,
      lesson_number: openInstance.lesson_number,
      source: openInstance.source || 'ai',
    };
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

  if (!lessonToOpen) {
    const nextLessonNumber = await getNextLessonNumber({
      childId,
      category,
    });

    const generated = await generatePremiumLesson({
      childName,
      childId,
      skill: category,
      location: 'Home',
      lessonNumber: nextLessonNumber,
    });

    const normalized = normalizeGeneratedLesson(
      generated,
      category,
      childName,
      nextLessonNumber
    );

    const { data: insertedQueue, error: insertQueueError } = await supabase
      .from('lesson_queue')
      .insert({
        user_id: userId,
        child_id: childId,
        category,
        lesson_number: nextLessonNumber,
        lesson_payload: normalized.lesson,
        source: normalized.source || 'ai',
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
