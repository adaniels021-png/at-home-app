import { supabase } from './supabase';

export async function getDailyReminderPreferences(childId: string) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('daily_lesson_enabled, daily_lesson_hour, daily_lesson_minute')
    .eq('child_id', childId)
    .maybeSingle();

  if (error) throw error;

  return {
    enabled: data?.daily_lesson_enabled ?? false,
    hour: data?.daily_lesson_hour ?? 18,
    minute: data?.daily_lesson_minute ?? 0,
  };
}