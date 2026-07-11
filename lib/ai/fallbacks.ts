import { Lesson } from '../lessonTypes';

/**
 * -------------------------------------------------------
 * FALLBACK LESSONS
 * -------------------------------------------------------
 * Used whenever AI is unavailable or returns invalid data.
 */

export function getFallbackLessonTitle(skill: string): string {
  const titles: Record<string, string> = {
    Communication: 'Practicing Communication at Home',
    Social: 'Building Social Skills at Home',
    Play: 'Learning Through Play',
    'Self-Help': 'Practicing Independence',
    Motor: 'Movement and Motor Practice',
  };

  return titles[skill] || `${skill} Practice at Home`;
}

export function buildFallbackLesson(skill: string): Lesson {
  return {
    lesson_name: getFallbackLessonTitle(skill),

    setting: 'Home',

    focus_skill: skill,

    objective: `Teach your child to practice ${skill.toLowerCase()} during a short home routine by setting up a clear opportunity, giving one simple direction, waiting 3–5 seconds, prompting only as needed, and immediately reinforcing any attempt. The goal is to help your child participate with more confidence, less frustration, and more independence.`,

    materials: [
      'Preferred toy or snack',
      'Simple household item',
    ],

    setup: [
      'Choose one simple toy or activity your child already likes.',
      'Sit facing your child with limited distractions.',
      'Keep the activity short and playful.',
    ],

    prompting_hierarchy: [
      'Wait briefly',
      'Give a simple verbal prompt',
      'Model the response',
      'Use gentle physical support if needed',
    ],

    teaching_steps: [
      'Sit with your child and place the play item in front of you.',
      'Model one simple play action such as rolling, stacking, feeding, or pushing.',
      'Say "Do this," then wait 3–5 seconds.',
      'If your child does not respond, gently model again or help complete the action.',
      'Immediately praise any attempt and continue playing together.',
    ],

    reinforcement: [
      'Praise immediately.',
      'Offer a preferred item or activity.',
    ],

    error_correction: [
      'Model the correct response.',
      'Try again with more support.',
    ],

    generalization: [
      'Practice again later during another daily routine.',
    ],

    success_criteria:
      '3 successful responses with support.',

    difficulty_level: 'balanced',

    difficulty_reason:
      'Default balanced support level.',

    parent_coaching_note:
      'Keep sessions short, positive, and always end on success.',

    lesson_variation:
      'Repeat the activity later using different toys or household routines.',

    abc_strategy:
      'Antecedent → Behavior → Consequence with immediate reinforcement.',
  };
}

/**
 * -------------------------------------------------------
 * FALLBACK DAILY ACTIVITIES
 * -------------------------------------------------------
 */

export function buildFallbackActivities(
  childName: string,
  count = 3
) {
  return [
    {
      name: 'Bubble Chase',

      title: 'Bubble Chase',

      category: 'outdoor',

      location: 'Backyard, park, or sidewalk',

      time: '5–10 minutes',

      description:
        'Blow bubbles together and turn them into a fun chase around the yard.',

      try_this: [
        `Let ${childName} pop bubbles with hands or feet.`,
        'Pause before blowing more bubbles to encourage requesting.',
        'Try tiny bubbles, giant bubbles, or fast bubbles.',
      ],

      why_it_helps:
        'Builds shared attention, communication, movement, and joyful interaction.',
    },

    {
      name: 'Toy Rescue Mission',

      title: 'Toy Rescue Mission',

      category: 'home',

      location: 'Living room',

      time: '5 minutes',

      description:
        'Pretend favorite toys need help getting safely back home.',

      try_this: [
        'Hide several toys around the room.',
        'Celebrate every successful rescue.',
        'Take turns rescuing toys together.',
      ],

      why_it_helps:
        'Encourages pretend play, following directions, and cooperation.',
    },

    {
      name: 'Grocery Store Helper',

      title: 'Grocery Store Helper',

      category: 'community',

      location: 'Local grocery store',

      time: '10–15 minutes',

      description:
        'Turn shopping into a fun helper adventure.',

      try_this: [
        'Find one fruit.',
        'Find one color.',
        'Place one safe item into the shopping cart.',
      ],

      why_it_helps:
        'Supports communication, attention, waiting, and community participation.',
    },
  ].slice(0, count);
}

/**
 * -------------------------------------------------------
 * FALLBACK BEHAVIOR SUPPORT PLAN
 * -------------------------------------------------------
 */

export function buildFallbackBehaviorSupportPlan() {
  return {
    possible_reason:
      'The child may be struggling with communication, regulation, transitions, or unmet needs.',

    prevention_strategies: [
      'Use visual schedules.',
      'Give transition warnings.',
      'Keep routines predictable.',
    ],

    replacement_skills: [
      'Teach requesting help.',
      'Practice calm communication.',
    ],

    calming_supports: [
      'Offer sensory breaks.',
      'Reduce environmental stress.',
    ],

    parent_tips: [
      'Stay calm and consistent.',
      'Reinforce positive behavior immediately.',
    ],

    encouragement:
      'You are doing a great job supporting your child.',
  };
}

// ---------------------------------------------------------------------
// Legacy aliases (temporary during refactor)
// ---------------------------------------------------------------------

export const getLessonFallback = buildFallbackLesson;
export const fallbackLesson = buildFallbackLesson;
export const generateFallbackLesson = buildFallbackLesson;