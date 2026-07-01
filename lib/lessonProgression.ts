import { supabase } from './supabase';

export async function getRecommendedStageForSkill({
  childId,
  category,
  skillArea,
}: {
  childId: string;
  category: string;
  skillArea: string;
}) {
  const { data, error } = await supabase
    .from('daily_lesson_instances')
    .select('stage_number, performance_score')
    .eq('child_id', childId)
    .eq('category', category)
    .eq('skill_area', skillArea)
    .eq('source', 'library')
    .eq('status', 'completed')
    .not('stage_number', 'is', null);

  if (error) throw error;

  if (!data || data.length === 0) return 1;

  const completedCount = data.length;
  const avgScore =
    data.reduce((sum, row: any) => sum + Number(row.performance_score || 0), 0) /
    completedCount;

  const highestStage = Math.max(
    ...data.map((row: any) => Number(row.stage_number || 1))
  );

  if (completedCount >= 2 && avgScore >= 80) {
    return Math.min(highestStage + 1, 5);
  }

  return highestStage;
}