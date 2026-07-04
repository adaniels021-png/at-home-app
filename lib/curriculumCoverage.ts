import { CURRICULUM } from './curriculum';
import { supabase } from './supabase';

export type CurriculumCoverageLesson = {
  id: string;
  title: string;
  category?: string | null;
  skill_area?: string | null;
  stage_number?: number | null;
  is_active?: boolean | null;
  quality_status?: string | null;
};

export type StageCoverage = {
  category: string;
  skill: string;
  stage: string;
  stageNumber: number;
  lessonCount: number;
  activeLessonCount: number;
  draftLessonCount: number;
  isMissing: boolean;
  isLowCoverage: boolean;
};

export type SkillCoverage = {
  category: string;
  skill: string;
  totalLessons: number;
  activeLessons: number;
  stages: StageCoverage[];
};

export type CategoryCoverage = {
  category: string;
  totalLessons: number;
  activeLessons: number;
  totalStages: number;
  coveredStages: number;
  coveragePercent: number;
  skills: SkillCoverage[];
};

export type CurriculumCoverage = {
  totalLessons: number;
  activeLessons: number;
  totalStages: number;
  coveredStages: number;
  coveragePercent: number;
  categories: CategoryCoverage[];
  missingStages: StageCoverage[];
  lowCoverageStages: StageCoverage[];
};

const MIN_LESSONS_PER_STAGE = 3;

function calculatePercent(covered: number, total: number) {
  if (!total) return 0;
  return Math.round((covered / total) * 100);
}

export async function getCurriculumCoverage(): Promise<CurriculumCoverage> {
  const { data, error } = await supabase
    .from('lesson_library')
    .select('id,title,category,skill_area,stage_number,is_active,quality_status');

  if (error) {
    console.warn('[curriculumCoverage] Failed to load coverage:', error.message);

    return {
      totalLessons: 0,
      activeLessons: 0,
      totalStages: 0,
      coveredStages: 0,
      coveragePercent: 0,
      categories: [],
      missingStages: [],
      lowCoverageStages: [],
    };
  }

  const lessons = (data ?? []) as CurriculumCoverageLesson[];

  const categories: CategoryCoverage[] = CURRICULUM.map((category) => {
    const skills: SkillCoverage[] = category.skills.map((skill) => {
      const stages: StageCoverage[] = skill.stages.map((stage, index) => {
        const stageNumber = index + 1;

        const matchingLessons = lessons.filter((lesson) => {
          return (
            lesson.category === category.title &&
            lesson.skill_area === skill.title &&
            Number(lesson.stage_number || 1) === stageNumber
          );
        });

        const activeLessonCount = matchingLessons.filter(
          (lesson) => lesson.is_active
        ).length;

        const draftLessonCount = matchingLessons.filter(
          (lesson) => lesson.quality_status !== 'approved'
        ).length;

        const lessonCount = matchingLessons.length;

        return {
          category: category.title,
          skill: skill.title,
          stage,
          stageNumber,
          lessonCount,
          activeLessonCount,
          draftLessonCount,
          isMissing: lessonCount === 0,
          isLowCoverage: lessonCount > 0 && lessonCount < MIN_LESSONS_PER_STAGE,
        };
      });

      const totalLessons = stages.reduce(
        (sum, stage) => sum + stage.lessonCount,
        0
      );

      const activeLessons = stages.reduce(
        (sum, stage) => sum + stage.activeLessonCount,
        0
      );

      return {
        category: category.title,
        skill: skill.title,
        totalLessons,
        activeLessons,
        stages,
      };
    });

    const flatStages = skills.flatMap((skill) => skill.stages);
    const totalStages = flatStages.length;
    const coveredStages = flatStages.filter((stage) => stage.lessonCount > 0).length;
    const totalLessons = skills.reduce((sum, skill) => sum + skill.totalLessons, 0);
    const activeLessons = skills.reduce((sum, skill) => sum + skill.activeLessons, 0);

    return {
      category: category.title,
      totalLessons,
      activeLessons,
      totalStages,
      coveredStages,
      coveragePercent: calculatePercent(coveredStages, totalStages),
      skills,
    };
  });

  const allStages = categories.flatMap((category) =>
    category.skills.flatMap((skill) => skill.stages)
  );

  const totalStages = allStages.length;
  const coveredStages = allStages.filter((stage) => stage.lessonCount > 0).length;

  return {
    totalLessons: lessons.length,
    activeLessons: lessons.filter((lesson) => lesson.is_active).length,
    totalStages,
    coveredStages,
    coveragePercent: calculatePercent(coveredStages, totalStages),
    categories,
    missingStages: allStages.filter((stage) => stage.isMissing),
    lowCoverageStages: allStages.filter((stage) => stage.isLowCoverage),
  };
}

export async function getStageCoverage({
  category,
  skill,
  stageNumber,
}: {
  category: string;
  skill: string;
  stageNumber: number;
}) {
  const coverage = await getCurriculumCoverage();

  return coverage.categories
    .find((item) => item.category === category)
    ?.skills.find((item) => item.skill === skill)
    ?.stages.find((item) => item.stageNumber === stageNumber);
}