import { supabase } from './supabase';

type CompleteLessonInput = {
  lessonId: string;
  childId?: string;
  category?: string;
  performanceScore: number;
  promptLevel?: string;
  behaviorResponse?: string;
  consistencyLevel?: string;
  status?: 'completed' | 'unsuccessful';
  timezone?: string; // Added to prevent server-drift resetting user streaks
};

function getSafeTimezone(timezone?: string) {
  try {
    const candidate =
      timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';

    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());

    return candidate;
  } catch {
    return 'UTC';
  }
}

function formatDateForTimezone(date: Date, timezone?: string) {
  const safeTimezone = getSafeTimezone(timezone);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function getLocalDateStrings(timezone?: string) {
  const safeTimezone = getSafeTimezone(timezone);

  const now = new Date();

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  return {
    today: formatDateForTimezone(now, safeTimezone),
    yesterday: formatDateForTimezone(yesterdayDate, safeTimezone),
  };
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.id) {
    throw new Error('User not authenticated.');
  }

  return data.user.id;
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
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}: CompleteLessonInput) {
  
  const completedAt = new Date().toISOString();
  const { today, yesterday } = getLocalDateStrings(timezone);

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
  const finalChildId = childId ?? instance.child_id;
  const finalCategory = category ?? instance.category ?? 'Communication';
  const logStatus = status === 'completed' ? 'success' : 'unsuccessful';

  // Defensive update: If marking unsuccessful, only clear completed_at if it wasn't already set
  const finalCompletedAt = status === 'completed' 
    ? completedAt 
    : (instance.completed_at ? instance.completed_at : null);

  const { error: updateError } = await supabase
    .from('daily_lesson_instances')
    .update({
      status,
      performance_score: performanceScore,
      completed_at: finalCompletedAt,
      last_opened_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', lessonId);

  if (updateError) {
    console.error('complete lesson instance error:', updateError);
    throw updateError;
  }

  const { data: existingLog, error: existingLogError } = await supabase
    .from('lesson_logs')
    .select('id')
    .eq('child_id', finalChildId)
    .eq('lesson_number', instance.lesson_number)
    .eq('category', finalCategory)
    .maybeSingle();

  if (existingLogError) {
    console.error('existing lesson log check error:', existingLogError);
    throw existingLogError;
  }

  if (!existingLog) {
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
  }

  // Use defensive try/catches so side effects don't block the main process path
  if (status === 'completed') {
    try {
      await updateSkillMasteryFromLesson({
        childId: finalChildId,
        category: finalCategory,
        skillTarget: lesson.focus_skill || lesson.lesson_name || finalCategory,
        performanceScore,
      });
    } catch (e) {
      console.error('Non-blocking skill mastery calculation error:', e);
    }

    try {
      await updateLessonStreak({
        childId: finalChildId,
        today,
        yesterday,
      });
    } catch (e) {
      console.error('Non-blocking streak engine tracking error:', e);
    }
  }

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
    const { error: insertError } = await supabase.from('skill_mastery').insert({
      child_id: childId,
      category,
      skill_target: skillTarget,
      attempts: 1,
      successful_attempts: successful ? 1 : 0,
      average_score: Math.round(performanceScore * 10) / 10,
      mastery_status:
        performanceScore >= 85 && successful
          ? 'mastered'
          : performanceScore >= 60
            ? 'practicing'
            : 'emerging',
      last_practiced_at: now,
      updated_at: now,
    });

    if (insertError) {
      console.error('skill mastery insert error:', insertError);
    }
    return;
  }

  const attempts = Number(existing.attempts || 0) + 1;
  const successfulAttempts = Number(existing.successful_attempts || 0) + (successful ? 1 : 0);

  const oldAverage = Number(existing.average_score || 0);
  const calculatedAverage = (oldAverage * (attempts - 1) + performanceScore) / attempts;
  const averageScore = Math.round(calculatedAverage * 10) / 10; // Protects against floating point precision errors

  const masteryStatus =
    averageScore >= 85 && successfulAttempts >= 3
      ? 'mastered'
      : averageScore >= 60
        ? 'practicing'
        : 'emerging';

  const { error: updateError } = await supabase
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

  if (updateError) {
    console.error('skill mastery update error:', updateError);
  }
}

async function updateLessonStreak({ 
  childId, 
  today, 
  yesterday 
}: { 
  childId: string; 
  today: string; 
  yesterday: string; 
}) {
  try {
    const userId = await getUserId();

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
      const { error: insertError } = await supabase.from('lesson_streaks').insert({
        user_id: userId,
        child_id: childId,
        current_streak: 1,
        best_streak: 1,
        last_completed_date: today,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('lesson streak insert error:', insertError);
      }
      return;
    }

    if (existing.last_completed_date === today) {
      return; // Already completed a lesson today, keep streak as is
    }

    const currentStreak = existing.last_completed_date === yesterday
      ? Number(existing.current_streak || 0) + 1
      : 1;

    const bestStreak = Math.max(Number(existing.best_streak || 0), currentStreak);

    const { error: updateError } = await supabase
      .from('lesson_streaks')
      .update({
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_completed_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('lesson streak update error:', updateError);
    }
  } catch (error) {
    console.error('updateLessonStreak error:', error);
  }
}