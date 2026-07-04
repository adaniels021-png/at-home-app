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
  source: 'ai' | 'fallback';
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
  source: 'ai' | 'fallback';
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
    'Making a choice',
    'Answering yes/no questions',
    'Following simple directions',
    'Using short phrases',
    'Requesting attention appropriately',
  ],

  'Daily Routines': [
    'Morning routine',
    'Hand washing',
    'Brushing teeth',
    'Getting dressed',
    'Cleaning up',
    'Mealtime routine',
    'Toileting routine',
    'Bedtime routine',
  ],

  'Play & Social Skills': [
    'Functional play',
    'Imitating play actions',
    'Taking turns',
    'Sharing attention',
    'Simple pretend play',
    'Greeting familiar people',
    'Playing near others',
    'Peer interaction',
  ],

  'Learning & Attention': [
    'Responding to name',
    'Sitting for short activities',
    'Looking at materials',
    'Matching objects',
    'Sorting items',
    'Following learning directions',
    'Completing simple tasks',
    'Working independently',
  ],

  'Movement & Coordination': [
    'Imitating gross motor movements',
    'Following movement directions',
    'Balance practice',
    'Obstacle course practice',
    'Stacking blocks',
    'Completing simple puzzles',
    'Using crayons or markers',
    'Fine motor practice',
  ],

  'Emotions & Behavior': [
    'Identifying feelings',
    'Requesting a break',
    'Waiting briefly',
    'Transitioning between activities',
    'Using calming strategies',
    'Accepting no',
    'Practicing flexibility',
    'Problem solving with support',
  ],
};