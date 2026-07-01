export type LessonDifficultyLevel = 'support' | 'balanced' | 'challenge';

export type Lesson = {
  lesson_name: string;
  setting: string;
  focus_skill: string;
  objective: string;
  materials: string[];
  setup: string[];
  prompting_hierarchy: string[];
  teaching_steps: string[];
  reinforcement: string[];
  error_correction: string[];
  generalization: string[];
  success_criteria: string;
  difficulty_level: LessonDifficultyLevel;
  difficulty_reason: string;
  parent_coaching_note?: string;
  lesson_variation?: string;
  abc_strategy?: string;
};

export type DailyABAActivity = {
  name: string;
  materials: string[];
  instructions: string[];
  success_criteria: string;
};

export interface AssessmentQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
}

export type LessonHistoryItem = {
  lesson_number: number;
  lesson_name?: string | null;
  status?: string | null;
  completed_at?: string | null;
  performance_score?: number | null;
};

export type CachedDailyLessonRow = {
  id: string;
  child_id: string;
  lesson_date: string;
  category: string;
  lesson_number: number | null;
  lesson_payload: Lesson;
  source: 'ai' | 'fallback' | 'library';
  generated_at: string;
  updated_at: string;
};

export type DailyLessonInstanceRow = {
  id: string;
  user_id: string;
  child_id: string;
  lesson_date: string;
  category: string;
  lesson_number: number;
  lesson_payload: Lesson;
  source: 'ai' | 'fallback' | 'library';
  status: 'generated' | 'started' | 'completed' | 'unsuccessful';
  started_at?: string | null;
  completed_at?: string | null;
  last_opened_at?: string | null;
  performance_score?: number | null;
  notes?: string | null;
  resumed_from_date?: string | null;
  is_resumed?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type LessonStreakRow = {
  id: string;
  user_id: string;
  child_id: string;
  current_streak: number;
  best_streak: number;
  last_completed_date: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonPerformanceProfile = {
  averageScore: number | null;
  totalScoredLessons: number;
  recentSuccessCount: number;
  recentUnsuccessfulCount: number;
  recommendedDifficulty: LessonDifficultyLevel;
  reasoning: string;
};

export type RecommendedSign = {
  label: string;
  reason: string;
};

export const SKILL_PROGRESSION_PATHS: Record<string, string[]> = {
  Communication: [
    'Requesting help',
    'Requesting more',
    'Requesting a break',
    'Making a choice between two items',
    'Answering yes/no questions',
    'Using two-word phrases',
    'Using three-word phrases',
    'Requesting attention appropriately',
  ],

  'Daily Routines': [
    'Following one-step routines',
    'Cleaning up one item',
    'Washing hands with prompts',
    'Brushing teeth with prompts',
    'Getting dressed with support',
    'Mealtime participation',
    'Bedtime routine participation',
  ],

  'Play & Social Skills': [
    'Joint attention',
    'Imitating play actions',
    'Functional play',
    'Taking turns',
    'Sharing attention with an adult',
    'Simple pretend play',
    'Greeting familiar people',
  ],

  'Learning & Attention': [
    'Matching identical items',
    'Sorting by color',
    'Sorting by shape',
    'Attending to a short activity',
    'Following two-step directions',
    'Completing simple puzzles',
  ],

  'Movement & Coordination': [
    'Imitating gross motor movements',
    'Stacking blocks',
    'Using crayons or markers',
    'Fine motor practice',
    'Following movement directions',
  ],

  'Emotions & Behavior': [
    'Identifying emotions',
    'Requesting a break',
    'Waiting briefly',
    'Using a calming strategy',
    'Handling small changes',
    'Following a replacement behavior',
  ],
};