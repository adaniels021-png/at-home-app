import { Lesson } from '../lessonTypes';

import { generateJsonWithEdgeFunction } from './edgeAI';
import { buildFallbackLesson } from './fallbacks';
import {
  coerceLessonShape,
  hasUsableLessonContent,
} from './normalizers';
import { buildLessonPrompt } from './prompts';

export type GenerateLessonParams = {
  childName: string;
  childId: string;
  skill: string;
  location: string;
  lessonNumber: number;

  difficultyTrend?: 'increase' | 'decrease' | 'maintain';

  skillTarget?: string;

  behaviorPattern?: {
    strategy: string;
    summary: string;
  };

  avoidSkills?: string[];

  lessonVarietyGuidance?: string;
  personalizationGuidance?: string;
};

function getDifficultyModifier(
  trend: 'increase' | 'decrease' | 'maintain'
) {
  switch (trend) {
    case 'increase':
      return 'Increase independence. Fade prompts, add slight variation, and expect stronger responses.';

    case 'decrease':
      return 'Reduce difficulty. Use shorter trials, more prompting, and fast reinforcement.';

    default:
      return 'Keep a balanced level with moderate prompting and consistent reinforcement.';
  }
}

function buildSafeLesson(
  aiLesson: Partial<Lesson>,
  fallback: Lesson,
  params: GenerateLessonParams
): Lesson {
  return {
    ...fallback,
    ...aiLesson,

    lesson_name:
  aiLesson.lesson_name ||
  fallback.lesson_name,
  
    setting:
      aiLesson.setting ||
      params.location ||
      'Home',

    focus_skill:
      params.skillTarget ||
      aiLesson.focus_skill ||
      params.skill,

    objective:
      aiLesson.objective &&
      !aiLesson.objective
        .toLowerCase()
        .includes('structured lesson')
        ? aiLesson.objective
        : `Teach ${params.childName} to practice ${
            params.skillTarget || params.skill
          } during a short home routine by setting up a clear opportunity, giving one simple direction, waiting 3–5 seconds, using prompts only as needed, and immediately reinforcing successful attempts.`,

    materials:
      aiLesson.materials?.length
        ? aiLesson.materials
        : fallback.materials,

    setup:
      aiLesson.setup?.length
        ? aiLesson.setup
        : fallback.setup,

    prompting_hierarchy:
      aiLesson.prompting_hierarchy?.length
        ? aiLesson.prompting_hierarchy
        : fallback.prompting_hierarchy,

    teaching_steps:
      aiLesson.teaching_steps &&
      aiLesson.teaching_steps.length >= 5
        ? aiLesson.teaching_steps
        : fallback.teaching_steps,

    reinforcement:
      aiLesson.reinforcement?.length
        ? aiLesson.reinforcement
        : fallback.reinforcement,

    error_correction:
      aiLesson.error_correction?.length
        ? aiLesson.error_correction
        : fallback.error_correction,

    generalization:
      aiLesson.generalization?.length
        ? aiLesson.generalization
        : fallback.generalization,

    success_criteria:
      aiLesson.success_criteria ||
      fallback.success_criteria,

    difficulty_level:
      aiLesson.difficulty_level ||
      fallback.difficulty_level,

    difficulty_reason:
      aiLesson.difficulty_reason ||
      fallback.difficulty_reason,

    parent_coaching_note:
      aiLesson.parent_coaching_note ||
      fallback.parent_coaching_note,

    lesson_variation:
      aiLesson.lesson_variation ||
      fallback.lesson_variation,

    abc_strategy:
      aiLesson.abc_strategy ||
      fallback.abc_strategy,
  };
}

export async function generatePremiumLesson(
  params: GenerateLessonParams
): Promise<{
  lesson: Lesson;
  source: 'ai' | 'fallback';
}> {
  try {
    const {
      childName,
      skill,
      location,
      lessonNumber,
      difficultyTrend = 'maintain',
      skillTarget,
      behaviorPattern,
      avoidSkills = [],
      lessonVarietyGuidance = '',
      personalizationGuidance = '',
    } = params;

    const difficultyModifier =
      getDifficultyModifier(difficultyTrend);

    const fallback =
      buildFallbackLesson(skill);

    const prompt = buildLessonPrompt({
      childName,
      skill,
      skillTarget:
        skillTarget || skill,
      location,
      lessonNumber,
      difficultyModifier,
      behaviorSummary:
        behaviorPattern?.summary ||
        'Use balanced prompting, short practice, and immediate reinforcement.',
      varietyGuidance:
        lessonVarietyGuidance ||
        'Rotate lesson types so lessons never feel repetitive.',
      avoidSkills,
      personalizationGuidance,
    });

    const raw =
      await generateJsonWithEdgeFunction<any>(
        prompt,
        fallback,
        'premium-lesson'
      );

    console.log(
      'AI LESSON RAW:',
      raw
    );

    const aiLesson =
      coerceLessonShape(raw);

    const lesson =
      buildSafeLesson(
        aiLesson,
        fallback,
        params
      );

    if (
      !hasUsableLessonContent(
        lesson
      )
    ) {
      console.warn(
        'AI lesson incomplete. Using fallback.'
      );


      return {
        lesson: fallback,
        source: 'fallback',
      };
    }

        console.log(
      'FINAL AI LESSON:',
      lesson.lesson_name,
      lesson
    );

    return {
      lesson,
      source: 'ai',
    };
  } catch (error) {
    console.error(
      'generatePremiumLesson error:',
      error
    );

    return {
      lesson: buildFallbackLesson(
        params.skill
      ),
      source: 'fallback',
    };
  }
}
