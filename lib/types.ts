// lib/types.ts

export type SkillCategory = 
  | 'Manding' 
  | 'Joint Attention' 
  | 'Vocal Imitation' 
  | 'Fine Motor' 
  | 'Social Skills';

export interface Child {
  id: string;
  user_id: string;
  child_name: string;
  date_of_birth: string;
  created_at: string;
}

export interface Assessment {
  id: string;
  child_id: string;
  assessment_date: string;
  notes?: string;
}

export interface ChildAssessmentScore {
  id: string;
  child_id: string;
  assessment_id: string;
  skill_category: SkillCategory;
  score: number; // 1-5
  recorded_at: string;
}

// Helper for the UI state during an assessment
export type AssessmentScoresState = Record<string, number>;