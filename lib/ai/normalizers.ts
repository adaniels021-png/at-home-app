import {
    safeString,
    safeStringArray,
    toStringArray,
} from '../aiCore';

import { Lesson } from '../lessonTypes';

import { buildFallbackActivities } from './fallbacks';

/**
 * -------------------------------------------------------
 * LESSON NORMALIZATION
 * -------------------------------------------------------
 * Converts various AI JSON formats into the Lesson shape
 * used throughout the app.
 */

export function coerceLessonShape(
  raw: any
): Partial<Lesson> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return {
    lesson_name:
      raw.lesson_name ??
      raw.name ??
      raw.title ??
      raw.lessonTitle,

    setting:
      raw.setting ??
      raw.location,

    focus_skill:
      raw.focus_skill ??
      raw.skill ??
      raw.target_skill ??
      raw.skill_focus,

    objective:
      raw.objective ??
      raw.goal ??
      raw.description,

    materials: toStringArray(raw.materials),

    setup: toStringArray(
      raw.setup ??
      raw.preparation
    ),

    prompting_hierarchy: toStringArray(
      raw.prompting_hierarchy ??
      raw.prompting ??
      raw.prompts
    ),

    teaching_steps: toStringArray(
      raw.teaching_steps ??
      raw.instructions ??
      raw.steps
    ),

    reinforcement: toStringArray(
      raw.reinforcement ??
      raw.rewards
    ),

    error_correction: toStringArray(
      raw.error_correction ??
      raw.errorCorrection
    ),

    generalization: toStringArray(
      raw.generalization ??
      raw.generalisation
    ),

    success_criteria:
      raw.success_criteria ??
      raw.mastery_criteria ??
      raw.criteria,

    difficulty_level:
      raw.difficulty_level ??
      raw.difficulty ??
      raw.lesson_difficulty,

    difficulty_reason:
      raw.difficulty_reason ??
      raw.difficultyReason ??
      raw.why_this_level,

    parent_coaching_note:
      raw.parent_coaching_note ??
      raw.parentTip ??
      raw.parent_coaching,

    lesson_variation:
      raw.lesson_variation ??
      raw.variation ??
      raw.try_this_next,

    abc_strategy:
      raw.abc_strategy ??
      raw.abc ??
      raw.behavior_strategy,
  };
}

/**
 * Ensures the AI returned enough lesson content
 * to actually use.
 */

export function hasUsableLessonContent(
  lesson: Partial<Lesson> | null | undefined
): boolean {
  if (!lesson) return false;

  return Boolean(
    lesson.lesson_name &&
      lesson.objective &&
      Array.isArray(lesson.materials) &&
      lesson.materials.length > 0 &&
      Array.isArray(lesson.teaching_steps) &&
      lesson.teaching_steps.length >= 2
  );
}

/**
 * -------------------------------------------------------
 * DAILY ACTIVITY NORMALIZATION
 * -------------------------------------------------------
 */

export function normalizeActivities(
  rawActivities: unknown,
  childName: string,
  count = 3
) {
  const fallback = buildFallbackActivities(
    childName,
    count
  );

  if (!Array.isArray(rawActivities)) {
    return fallback;
  }

  const normalized = rawActivities.map(
    (activity: any, index: number) => {
      const fallbackItem =
        fallback[index % fallback.length];

      return {
        name: safeString(
          activity?.name ??
            activity?.title,
          fallbackItem.name
        ),

        title: safeString(
          activity?.title ??
            activity?.name,
          fallbackItem.title
        ),

        category: safeString(
          activity?.category,
          fallbackItem.category
        ),

        location: safeString(
          activity?.location ??
            activity?.where,
          fallbackItem.location
        ),

        time: safeString(
          activity?.time ??
            activity?.duration ??
            activity?.estimated_time,
          fallbackItem.time
        ),

        description: safeString(
          activity?.description ??
            activity?.summary,
          fallbackItem.description
        ),

        try_this: safeStringArray(
          activity?.try_this ??
            activity?.tryThis ??
            activity?.ideas ??
            activity?.instructions ??
            activity?.steps,
          fallbackItem.try_this
        ).slice(0, 4),

        why_it_helps: safeString(
          activity?.why_it_helps ??
            activity?.whyItHelps ??
            activity?.benefit ??
            activity?.success_criteria,
          fallbackItem.why_it_helps
        ),
      };
    }
  );

  const valid = normalized.filter(
    (activity) =>
      activity.name &&
      activity.title &&
      activity.description &&
      activity.try_this.length >= 2 &&
      activity.why_it_helps
  );

  if (!valid.length) {
    return fallback;
  }

  return valid.slice(0, count);
}