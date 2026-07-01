import { supabase } from './supabase';

export async function getMasteredSkills(
  childId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('daily_lesson_instances')
      .select(`
        skill_area,
        consistency_level,
        performance_score
      `)
      .eq('child_id', childId)
      .eq('status', 'completed')
      .not('skill_area', 'is', null);

    if (error) {
      console.error('Error loading mastered skills:', error);
      return [];
    }

    const skillStats = new Map<
      string,
      {
        attempts: number;
        highScores: number;
      }
    >();

    for (const row of data || []) {
      const skill = row.skill_area;

      if (!skill) continue;

      const current =
        skillStats.get(skill) || {
          attempts: 0,
          highScores: 0,
        };

      current.attempts += 1;

      if (
        Number(row.performance_score) >= 80 &&
        row.consistency_level === 'high'
      ) {
        current.highScores += 1;
      }

      skillStats.set(skill, current);
    }

    const masteredSkills: string[] = [];

    for (const [skill, stats] of skillStats.entries()) {
      if (
        stats.attempts >= 3 &&
        stats.highScores >= 2
      ) {
        masteredSkills.push(skill);
      }
    }

    return masteredSkills;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export type SkillRecommendationSummary = {
  skillArea: string;
  attempts: number;
  averageScore: number;
  lastScore: number;
  highConsistencyCount: number;
  lowConsistencyCount: number;
  needsPractice: boolean;
  isStrong: boolean;
};

export async function getSkillRecommendationSummary(
  childId: string
): Promise<SkillRecommendationSummary[]> {
  try {
    const { data, error } = await supabase
      .from('daily_lesson_instances')
      .select(`
        skill_area,
        consistency_level,
        performance_score,
        completed_at,
        created_at
      `)
      .eq('child_id', childId)
      .eq('status', 'completed')
      .not('skill_area', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading skill recommendation summary:', error);
      return [];
    }

    const skillStats = new Map<string, any>();

    for (const row of data || []) {
      const skill = row.skill_area;
      if (!skill) continue;

      const current =
        skillStats.get(skill) || {
          skillArea: skill,
          attempts: 0,
          totalScore: 0,
          lastScore: Number(row.performance_score || 0),
          highConsistencyCount: 0,
          lowConsistencyCount: 0,
        };

      current.attempts += 1;
      current.totalScore += Number(row.performance_score || 0);

      if (row.consistency_level === 'high') {
        current.highConsistencyCount += 1;
      }

      if (row.consistency_level === 'low') {
        current.lowConsistencyCount += 1;
      }

      skillStats.set(skill, current);
    }

    return Array.from(skillStats.values()).map((skill) => {
      const averageScore =
        skill.attempts > 0
          ? Math.round(skill.totalScore / skill.attempts)
          : 0;

      return {
        skillArea: skill.skillArea,
        attempts: skill.attempts,
        averageScore,
        lastScore: skill.lastScore,
        highConsistencyCount: skill.highConsistencyCount,
        lowConsistencyCount: skill.lowConsistencyCount,
        needsPractice:
          skill.attempts < 3 ||
          averageScore < 70 ||
          skill.lowConsistencyCount >= 2,
        isStrong:
          skill.attempts >= 3 &&
          averageScore >= 80 &&
          skill.highConsistencyCount >= 2,
      };
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getSmartRecommendedSkill(
  childId: string,
  availableSkills: string[]
): Promise<string | undefined> {
  const summary = await getSkillRecommendationSummary(childId);

  if (!summary.length) {
    return availableSkills[0];
  }

  const availableSummary = summary.filter((item) =>
    availableSkills.includes(item.skillArea)
  );

  const needsPractice = availableSummary
    .filter((item) => item.needsPractice)
    .sort((a, b) => {
      if (a.attempts !== b.attempts) return a.attempts - b.attempts;
      return a.averageScore - b.averageScore;
    });

  if (needsPractice.length > 0) {
    return needsPractice[0].skillArea;
  }

  const notTriedYet = availableSkills.find(
    (skill) => !summary.some((item) => item.skillArea === skill)
  );

  if (notTriedYet) {
    return notTriedYet;
  }

  return availableSkills[0];
}