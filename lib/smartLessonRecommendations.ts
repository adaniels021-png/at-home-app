import { supabase } from './supabase';

export async function getSmartRecommendedSkill(
  childId: string,
  skillAreas: string[]
): Promise<string | undefined> {
  if (!childId || !Array.isArray(skillAreas) || skillAreas.length === 0) {
    return undefined;
  }

  const { data, error } = await supabase
    .from('daily_lesson_instances')
    .select('skill_area, performance_score, consistency_level, completed_at')
    .eq('child_id', childId)
    .in('skill_area', skillAreas)
    .order('completed_at', { ascending: false })
    .limit(50);

  if (error) {
    console.log('Smart recommendation error:', error);
    return skillAreas[0];
  }

  const scores = skillAreas.map((skillArea) => {
    const rows = (data || []).filter((row: any) => row.skill_area === skillArea);

    if (rows.length === 0) {
      return { skillArea, score: -100 };
    }

    const recent = rows.slice(0, 5);
    const avg =
      recent.reduce((sum: number, row: any) => {
        return sum + Number(row.performance_score || 0);
      }, 0) / recent.length;

    const lowConsistencyCount = recent.filter(
      (row: any) => row.consistency_level === 'low'
    ).length;

    return {
      skillArea,
      score: avg - lowConsistencyCount * 10,
    };
  });

  scores.sort((a, b) => a.score - b.score);

  return scores[0]?.skillArea || skillAreas[0];
}