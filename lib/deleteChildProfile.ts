import { supabase } from './supabase';

export async function deleteChildProfile(childId: string) {
  if (!childId) throw new Error('Missing child ID.');

  const tablesToDelete = [
    'pecs_card_usage',
    'pecs_favorites',
    'pecs_cards',
    'routine_logs',
    'custom_routines',
    'lesson_logs',
    'daily_lesson_instances',
    'lesson_queue',
    'assessments',
  ];

  for (const table of tablesToDelete) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('child_id', childId);

    if (error) {
      console.warn(`Could not delete from ${table}:`, error.message);
    }
  }

  const { error: childError } = await supabase
    .from('children')
    .delete()
    .eq('id', childId);

  if (childError) {
    throw childError;
  }

  return true;
}