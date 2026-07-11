// lib/worksheetTemplates.ts

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorksheetCategory =
  | 'Visual Routines'
  | 'Communication & Social Skills'
  | 'Behavior & Regulation'
  | 'Learning & Life Skills';

export type WorksheetItem = {
  id: string;
  title: string;
  category: WorksheetCategory;
  description: string;
  ageRange: string;
  image?: any;
};

export const CATEGORIES: Array<WorksheetCategory | 'All'> = [
  'All',
  'Visual Routines',
  'Communication & Social Skills',
  'Behavior & Regulation',
  'Learning & Life Skills',
];

export const WORKSHEETS: WorksheetItem[] = [
  {
    id: 'washing-hands-strip',
    title: 'Task Analysis Strip: Washing Hands',
    category: 'Visual Routines',
    description:
      'A step-by-step visual handwashing routine with six clear sequential actions.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/washing-hands-strip.jpeg'),
  },
  {
    id: 'first-then-board',
    title: 'First/Then Board',
    category: 'Visual Routines',
    description:
      'A printable visual support board with cut-and-paste activity icons for routines and transitions.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/first-then-board.jpeg'),
  },
  {
    id: 'sandwich-sequencing',
    title: 'Sequencing Story: Making a Sandwich',
    category: 'Visual Routines',
    description:
      'A visual sequencing activity where children place sandwich-making steps in the correct order.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/sandwich-sequencing.jpeg'),
  },
  {
    id: 'asking-to-play',
    title: 'Social Story Template: Asking to Play',
    category: 'Communication & Social Skills',
    description:
      'A guided social story that teaches children how to approach peers and ask to play appropriately.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/asking-to-play.jpeg'),
  },
  {
    id: 'saying-hello',
    title: 'Conversation Script: Saying Hello',
    category: 'Communication & Social Skills',
    description:
      'A simple color-coded greeting conversation worksheet for practicing social exchanges.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/saying-hello.jpeg'),
  },
  {
    id: 'free-time-choice-board',
    title: 'Choice Board: Free Time',
    category: 'Communication & Social Skills',
    description:
      'A colorful visual choice board that helps children independently choose preferred free-time activities.',
    ageRange: 'Ages 2–8',
    image: require('../assets/worksheets/free-time-choice-board.jpeg'),
  },
  {
    id: 'calm-to-mad-thermometer',
    title: 'Feelings Thermometer: Calm to Mad',
    category: 'Behavior & Regulation',
    description:
      'A visual emotional regulation thermometer helping children identify feelings from calm to very upset.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/calm-to-mad-thermometer.jpeg'),
  },
  {
    id: 'five-stars-token-board',
    title: 'Token Board: 5 Stars for a Reward',
    category: 'Behavior & Regulation',
    description:
      'A reinforcement token board where children earn stars toward a motivating reward.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/five-stars-token-board.jpeg'),
  },
  {
    id: 'coping-strategy-cards',
    title: 'Coping Strategy Cards',
    category: 'Behavior & Regulation',
    description:
      'Illustrated coping and self-regulation strategy cards designed for calm-down support.',
    ageRange: 'Ages 3–10',
    image: require('../assets/worksheets/coping-strategy-cards.jpeg'),
  },
  {
    id: 'abc-behavior-chart',
    title: 'Behavior Tracking Sheet (ABC Chart)',
    category: 'Behavior & Regulation',
    description:
      'A caregiver-friendly ABC behavior tracking worksheet with antecedent, behavior, consequence, intensity, and duration tracking.',
    ageRange: 'Caregiver Tool',
    image: require('../assets/worksheets/abc-behavior-chart.jpeg'),
  },
  {
    id: 'farm-ocean-sorting',
    title: 'Matching & Sorting: Farm vs. Ocean Animals',
    category: 'Learning & Life Skills',
    description:
      'A sorting and categorization worksheet where children place animals into farm or ocean groups.',
    ageRange: 'Ages 2–7',
    image: require('../assets/worksheets/farm-ocean-sorting.jpeg'),
  },
  {
    id: 'association-pairs',
    title: 'Go-Together Worksheet: Association Pairs',
    category: 'Learning & Life Skills',
    description:
      'A logic and language activity matching naturally associated items together.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/association-pairs.jpeg'),
  },
  {
    id: 'paths-to-objects',
    title: 'Tracing / Pre-Writing: Paths to Objects',
    category: 'Learning & Life Skills',
    description:
      'A fine-motor tracing worksheet where children follow wavy, zigzag, and looped paths to objects.',
    ageRange: 'Ages 3–7',
    image: require('../assets/worksheets/paths-to-objects.jpeg'),
  },
  {
    id: 'numbers-and-a',
    title: 'High-Contrast Math & Literacy: Numbers and A',
    category: 'Learning & Life Skills',
    description:
      'A high-contrast early learning worksheet focused on tracing the number 1 and the letter A.',
    ageRange: 'Ages 3–8',
    image: require('../assets/worksheets/numbers-and-a.jpeg'),
  },
];

export function getSkillFocus(category?: WorksheetCategory) {
  switch (category) {
    case 'Visual Routines':
      return 'Routine completion, independence, sequencing, transitions, and task follow-through.';
    case 'Communication & Social Skills':
      return 'Functional communication, social understanding, requesting, conversation practice, and choice-making.';
    case 'Behavior & Regulation':
      return 'Emotional awareness, coping skills, reinforcement, self-regulation, and behavior tracking.';
    case 'Learning & Life Skills':
      return 'Matching, sorting, fine motor skills, early academics, associations, and functional learning.';
    default:
      return 'Functional home practice and parent-supported learning.';
  }
}