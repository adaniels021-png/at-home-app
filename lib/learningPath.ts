import { getMasteredSkills } from './lessonRecommendations';
import { supabase } from './supabase';

export async function getLearningPath(childId: string) {
  const masteredSkills = await getMasteredSkills(childId);

  const { data } = await supabase
    .from('daily_lesson_instances')
    .select('skill_area, completed_at')
    .eq('child_id', childId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  const recentSkills =
    [...new Set((data || [])
      .map((x: any) => x.skill_area)
      .filter(Boolean))];

  return {
    masteredSkills,
    recentSkills,
    masteredCount: masteredSkills.length,
  };
}