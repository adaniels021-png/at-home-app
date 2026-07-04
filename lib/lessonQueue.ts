import { generatePremiumLesson } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';

const FREE_QUEUE_LIMIT = 1;
const PRO_QUEUE_LIMIT = 3;
const MAX_GENERATION_ATTEMPTS = 1;

function getQueueLimit(isPro: boolean) {
  return isPro ? PRO_QUEUE_LIMIT : FREE_QUEUE_LIMIT;
}

function todayString() {
  const now = new Date();
  return [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
  ].join('-');
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    throw new Error('User not authenticated.');
  }

  return data.user.id;
}

function hasFullLessonContent(lesson: any): boolean {
  return Boolean(
    lesson?.lesson_name &&
      lesson?.objective &&
      String(lesson.objective).length >= 35 &&
      Array.isArray(lesson.materials) &&
      lesson.materials.length >= 2 &&
      Array.isArray(lesson.setup) &&
      lesson.setup.length >= 2 &&
      Array.isArray(lesson.teaching_steps) &&
      lesson.teaching_steps.length >= 4 &&
      Array.isArray(lesson.prompting_hierarchy) &&
      lesson.prompting_hierarchy.length >= 3 &&
      Array.isArray(lesson.reinforcement) &&
      lesson.reinforcement.length >= 1 &&
      lesson.success_criteria
  );
}

function buildBackupLesson(category: string, childName: string, lessonNumber: number) {
  const name = childName || 'your child';

  const titles: Record<string, string> = {
    Communication: 'Requesting Help During Play',
    Social: 'Taking Turns with a Favorite Item',
    Play: 'Copying Simple Play Actions',
    'Self-Help': 'Following a Simple Home Routine',
    Motor: 'Copying Simple Movement Actions',
  };

  return {
    lesson_name: titles[category] || `${category} Practice at Home`,
    objective: `${name} will practice a short ${category.toLowerCase()} skill at home using clear parent instructions, wait time, gentle prompting, and immediate reinforcement.`,
    setting: 'Home',
    focus_skill: category,
    materials: [
      'One preferred item or simple household object',
      'Small reward or praise',
      'Quiet space with limited distractions',
    ],
    setup: [
      'Choose a calm area where your child can focus for 5 minutes.',
      'Place the materials nearby but keep the activity simple and short.',
    ],
    teaching_steps: [
      'Sit near your child and show the item or activity.',
      'Give one clear instruction using a calm voice.',
      'Wait 3 to 5 seconds before helping.',
      'If your child needs help, use the smallest prompt that works.',
      'Reinforce any successful attempt right away with praise, access, or a short preferred activity.',
    ],
    prompting_hierarchy: [
      'Pause and wait',
      'Gesture toward the correct response',
      'Model the response',
      'Give a short verbal prompt',
      'Use gentle physical support only if needed',
    ],
    reinforcement: [
      'Use specific praise such as “Great trying” or “You did it.”',
      'Give quick access to the item or activity after a successful attempt.',
    ],
    error_correction: [
      'Stay calm and avoid repeating the instruction too many times.',
      'Model the correct response, then give another chance.',
    ],
    generalization: [
      'Try the same skill later in another room.',
      'Have another caregiver practice the same step once.',
    ],
    success_criteria: 'Complete 3 to 5 successful practice opportunities with support.',
    lesson_variation: `Try this lesson with a different toy, routine, or room next time. Lesson ${lessonNumber}.`,
  };
}

function normalizeGeneratedLesson(
  result: any,
  category: string,
  childName: string,
  lessonNumber: number
) {
  const lesson = result?.lesson || result;
  const source = result?.source || 'ai';

  if (!lesson || source === 'fallback' || !hasFullLessonContent(lesson)) {
    return {
      lesson: buildBackupLesson(category, childName, lessonNumber),
      source: 'fallback' as const,
    };
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

  return (
    Math.max(
      Number(logsRes.data?.[0]?.lesson_number || 0),
      Number(instancesRes.data?.[0]?.lesson_number || 0),
      Number(queueRes.data?.[0]?.lesson_number || 0)
    ) + 1
  );
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
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const generated = await generatePremiumLesson({
        childName,
        childId,
        skill: category,
        location: 'Home',
        lessonNumber,
      });

      return normalizeGeneratedLesson(generated, category, childName, lessonNumber);
    } catch (error) {
      console.warn(`AI lesson generation attempt ${attempt} failed:`, error);
    }
  }

  return {
    lesson: buildBackupLesson(category, childName, lessonNumber),
    source: 'fallback' as const,
  };
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
  try {
    const userId = await getAuthenticatedUserId();
    const queueLimit = getQueueLimit(isPro);

    const { data: queuedLessons, error } = await supabase
      .from('lesson_queue')
      .select('id')
      .eq('child_id', childId)
      .eq('category', category)
      .eq('is_used', false)
      .not('lesson_payload', 'is', null);

    if (error) {
      console.error('Queue check error:', error);
      return;
    }

    const lessonsNeeded = queueLimit - (queuedLessons?.length ?? 0);
    if (lessonsNeeded <= 0) return;

    const startLessonNumber = await getNextLessonNumber({ childId, category });

    for (let i = 0; i < lessonsNeeded; i++) {
      const lessonNumber = startLessonNumber + i;

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
        console.error('Queue insert error:', insertError);
      }
    }
  } catch (err) {
    console.error('Error in ensureLessonQueue:', err);
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
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openError) throw openError;

  if (openInstance?.lesson_payload && hasFullLessonContent(openInstance.lesson_payload)) {
    return {
      lesson_instance_id: openInstance.id,
      lesson_payload: openInstance.lesson_payload,
      lesson_number: openInstance.lesson_number,
      source: openInstance.source || 'ai',
    };
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: queuedLesson, error: queueError } = await supabase
      .from('lesson_queue')
      .select('*')
      .eq('child_id', childId)
      .eq('category', category)
      .eq('is_used', false)
      .not('lesson_payload', 'is', null)
      .order('lesson_number', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queueError) throw queueError;

    let selectedLesson = queuedLesson;

    if (selectedLesson?.id && !hasFullLessonContent(selectedLesson.lesson_payload)) {
      await supabase
        .from('lesson_queue')
        .update({ is_used: true, opened_at: now })
        .eq('id', selectedLesson.id);

      selectedLesson = null;
      continue;
    }

    if (!selectedLesson) {
      const nextLessonNumber = await getNextLessonNumber({ childId, category });

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
        .select('*')
        .single();

      if (insertQueueError) {
        console.error('QUEUE: insertQueueError:', insertQueueError);
        throw insertQueueError;
      }

      selectedLesson = insertedQueue;
    }

    if (!selectedLesson?.lesson_payload || !hasFullLessonContent(selectedLesson.lesson_payload)) {
      console.error('QUEUE: invalid selectedLesson:', selectedLesson);

      if (selectedLesson?.id) {
        await supabase
          .from('lesson_queue')
          .update({ is_used: true, opened_at: now })
          .eq('id', selectedLesson.id);
      }

      continue;
    }

    const { data: existingInstance, error: existingError } = await supabase
      .from('daily_lesson_instances')
      .select('*')
      .eq('child_id', childId)
      .eq('lesson_date', today)
      .eq('category', category)
      .eq('lesson_number', selectedLesson.lesson_number)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingInstance) {
      await supabase
        .from('lesson_queue')
        .update({ is_used: true, opened_at: now })
        .eq('id', selectedLesson.id);

      if (
        existingInstance.status !== 'completed' &&
        !existingInstance.completed_at &&
        hasFullLessonContent(existingInstance.lesson_payload)
      ) {
        return {
          lesson_instance_id: existingInstance.id,
          lesson_payload: existingInstance.lesson_payload,
          lesson_number: existingInstance.lesson_number,
          source: existingInstance.source || 'ai',
        };
      }

      continue;
    }

    console.log('QUEUE: creating lesson instance for lesson number:', selectedLesson.lesson_number);

    const { data: lessonInstance, error: instanceError } = await supabase
      .from('daily_lesson_instances')
      .insert({
        user_id: userId,
        child_id: childId,
        lesson_date: today,
        category,
        lesson_number: selectedLesson.lesson_number,
        lesson_payload: selectedLesson.lesson_payload,
        source: selectedLesson.source || 'ai',
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
      console.error('Create lesson instance error:', instanceError);

      await supabase
        .from('lesson_queue')
        .update({ is_used: true, opened_at: now })
        .eq('id', selectedLesson.id);

      continue;
    }

    await supabase
      .from('lesson_queue')
      .update({ is_used: true, opened_at: now })
      .eq('id', selectedLesson.id);

    ensureLessonQueue({
      childId,
      childName,
      category,
      isPro,
    }).catch((err) => {
      console.error('Background lesson refill failed:', err);
    });

    return {
      lesson_instance_id: lessonInstance.id,
      lesson_payload: lessonInstance.lesson_payload,
      lesson_number: lessonInstance.lesson_number,
      source: lessonInstance.source || 'ai',
    };
  }

  return null;
}