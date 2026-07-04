import { Ionicons } from '@expo/vector-icons';

export type CurriculumCategory = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  color: string;
  skills: CurriculumSkill[];
};

export type CurriculumSkill = {
  id: string;
  title: string;
  stages: string[];
};

export const CURRICULUM: CurriculumCategory[] = [
  {
    id: 'communication',
    title: 'Communication',
    icon: 'chatbubbles-outline',
    color: '#7C3AED',
    description:
      'Helping children communicate wants, needs, thoughts, and conversations.',
    skills: [
      {
        id: 'requesting',
        title: 'Requesting',
        stages: [
          'Requesting Preferred Items',
          'Requesting Help',
          'Requesting Choices',
          'Independent Requesting',
        ],
      },
      {
        id: 'following-directions',
        title: 'Following Directions',
        stages: [
          'One-Step Directions',
          'Two-Step Directions',
          'Routine Instructions',
          'Independent Following',
        ],
      },
      {
        id: 'answering-questions',
        title: 'Answering Questions',
        stages: [
          'Yes / No',
          'WH Questions',
          'Personal Questions',
          'Conversation',
        ],
      },
    ],
  },

  {
    id: 'daily-routines',
    title: 'Daily Routines',
    icon: 'home-outline',
    color: '#2563EB',
    description:
      'Teaching independence during everyday home routines.',
    skills: [
      {
        id: 'morning-routine',
        title: 'Morning Routine',
        stages: [
          'Wake Up',
          'Getting Dressed',
          'Breakfast',
          'Leaving Home',
        ],
      },
      {
        id: 'personal-care',
        title: 'Personal Care',
        stages: [
          'Hand Washing',
          'Brushing Teeth',
          'Hair Care',
          'Bath Time',
        ],
      },
      {
        id: 'toileting',
        title: 'Toileting',
        stages: [
          'Potty Awareness',
          'Scheduled Toileting',
          'Independent Toileting',
          'Generalization',
        ],
      },
    ],
  },

  {
    id: 'play-social-skills',
    title: 'Play & Social Skills',
    icon: 'people-outline',
    color: '#EC4899',
    description:
      'Developing play, social interaction, and peer engagement.',
    skills: [
      {
        id: 'play',
        title: 'Play Skills',
        stages: [
          'Functional Play',
          'Imitation',
          'Pretend Play',
          'Independent Play',
        ],
      },
      {
        id: 'social',
        title: 'Social Interaction',
        stages: [
          'Joint Attention',
          'Turn Taking',
          'Peer Interaction',
          'Conversation',
        ],
      },
    ],
  },

  {
    id: 'learning-attention',
    title: 'Learning & Attention',
    icon: 'school-outline',
    color: '#059669',
    description:
      'Building attention, learning readiness, and early academic skills.',
    skills: [
      {
        id: 'attention',
        title: 'Attention',
        stages: [
          'Sitting',
          'Looking',
          'Listening',
          'Working Independently',
        ],
      },
      {
        id: 'matching',
        title: 'Matching & Sorting',
        stages: [
          'Object Matching',
          'Picture Matching',
          'Sorting',
          'Categories',
        ],
      },
    ],
  },

  {
    id: 'movement-coordination',
    title: 'Movement & Coordination',
    icon: 'walk-outline',
    color: '#EA580C',
    description:
      'Developing gross motor, fine motor, and coordination skills.',
    skills: [
      {
        id: 'gross-motor',
        title: 'Gross Motor',
        stages: [
          'Large Movements',
          'Balance',
          'Jumping',
          'Obstacle Courses',
        ],
      },
      {
        id: 'fine-motor',
        title: 'Fine Motor',
        stages: [
          'Grasping',
          'Pincer Grip',
          'Scissor Skills',
          'Writing Readiness',
        ],
      },
    ],
  },

  {
    id: 'emotions-behavior',
    title: 'Emotions & Behavior',
    icon: 'heart-outline',
    color: '#DC2626',
    description:
      'Helping children understand emotions, self-regulation, and flexible behavior.',
    skills: [
      {
        id: 'regulation',
        title: 'Emotional Regulation',
        stages: [
          'Identifying Feelings',
          'Calming Strategies',
          'Self-Regulation',
          'Generalization',
        ],
      },
      {
        id: 'behavior',
        title: 'Behavior Skills',
        stages: [
          'Waiting',
          'Transitions',
          'Flexibility',
          'Problem Solving',
        ],
      },
    ],
  },
];

export const CURRICULUM_CATEGORIES = CURRICULUM.map((c) => c.title);

export function getCurriculumCategory(title: string) {
  return CURRICULUM.find((c) => c.title === title);
}

export function getCurriculumSkill(
  categoryTitle: string,
  skillTitle: string
) {
  const category = getCurriculumCategory(categoryTitle);

  return category?.skills.find((s) => s.title === skillTitle);
}