import { getMasteredSkills } from './lessonRecommendations';
import { SKILL_PROGRESSION_PATHS } from './lessonTypes';

export async function getPersonalizedLearningPath(childId: string) {
  const masteredSkills = await getMasteredSkills(childId);

  const path = Object.entries(SKILL_PROGRESSION_PATHS).map(
    ([category, skills]) => {
      const skillList = Array.isArray(skills) ? skills : [skills];

      const completed = skillList.filter((skill) =>
        masteredSkills.includes(skill)
      );

      const nextSkill =
        skillList.find((skill) => !masteredSkills.includes(skill)) ||
        skillList[skillList.length - 1];

      return {
        category,
        totalSkills: skillList.length,
        completedSkills: completed.length,
        progressPercent: Math.round(
          (completed.length / skillList.length) * 100
        ),
        nextSkill,
      };
    }
  );

  return path;
}