import { supabase } from './supabase';

export const saveGeneratedActivity = async (userId: string, activity: any, skill: string, level: string) => {
  const { data, error } = await supabase
    .from('ai_activities')
    .insert([
      {
        user_id: userId,
        skill_name: skill,
        difficulty_level: level,
        title: activity.title,
        objective: activity.objective,
        materials: activity.materials,
        steps: activity.steps,
        success_tip: activity.success_tip,
      },
    ])
    .select();

  if (error) {
    console.error('Error saving activity:', error);
    return null;
  }
  return data[0];
};