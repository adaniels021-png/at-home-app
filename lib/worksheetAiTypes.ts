// lib/worksheetAiTypes.ts

import type { WorksheetCategory } from './worksheetTemplates';

export type WorksheetDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type WorksheetFormat =
  | 'visual_routine'
  | 'communication_practice'
  | 'social_story'
  | 'behavior_regulation'
  | 'fine_motor'
  | 'early_learning'
  | 'life_skills'
  | 'caregiver_tool';

export type WorksheetActivityType =
  | 'color'
  | 'circle'
  | 'trace'
  | 'match'
  | 'cut_paste'
  | 'sequence'
  | 'draw'
  | 'maze'
  | 'choice'
  | 'checkbox'
  | 'fill_in'
  | 'sort';

export type WorksheetSection = {
  id: string;
  title: string;
  instruction: string;
  activityType: WorksheetActivityType;
  iconKeyword?: string;
  traceWord?: string;
  choices?: string[];
  correctAnswer?: string;
  coloringPrompt?: string;
  drawingPrompt?: string;
  cutPasteLabels?: string[];
  sequenceLabels?: string[];
  matchPairs?: Array<{
    left: string;
    right: string;
  }>;
};

export type GeneratedWorksheet = {
  title: string;
  subtitle?: string;
  category: WorksheetCategory;
  format: WorksheetFormat;
  difficulty: WorksheetDifficulty;
  ageRange: string;

  theme: string;
  skillGoal: string;
  childDirections: string;
  parentTip: string;
  parentScript?: string;
  targetSkill?: string;
promptingLevel?: string;
teachingMethod?: string;
masteryCriteria?: string;
materialsNeeded?: string[];

  visualStyle: {
    mood: 'playful' | 'calm' | 'bright' | 'soft';
    useMascot: boolean;
    mascotPlacement: 'header' | 'footer' | 'side' | 'none';
    illustrationStyle: 'cartoon' | 'simple_icon' | 'activity_book';
  };

  sections: WorksheetSection[];

  completionBox?: {
    text: string;
    stickerPrompt?: string;
  };

  safetyNote?: string;
};

export type WorksheetAiRequest = {
  prompt: string;
  category?: WorksheetCategory;
  difficulty?: WorksheetDifficulty;
  childName?: string;
  ageRange?: string;
};

export const WORKSHEET_FORMAT_LABELS: Record<WorksheetFormat, string> = {
  visual_routine: 'Visual Routine',
  communication_practice: 'Communication Practice',
  social_story: 'Social Story',
  behavior_regulation: 'Behavior & Regulation',
  fine_motor: 'Fine Motor',
  early_learning: 'Early Learning',
  life_skills: 'Life Skills',
  caregiver_tool: 'Caregiver Tool',
};

export const WORKSHEET_ACTIVITY_LABELS: Record<WorksheetActivityType, string> = {
  color: 'Color',
  circle: 'Circle',
  trace: 'Trace',
  match: 'Match',
  cut_paste: 'Cut & Paste',
  sequence: 'Sequence',
  draw: 'Draw',
  maze: 'Maze',
  choice: 'Choice',
  checkbox: 'Checkbox',
  fill_in: 'Fill In',
  sort: 'Sort',
};

export function isWorksheetFormat(value: string): value is WorksheetFormat {
  return [
    'visual_routine',
    'communication_practice',
    'social_story',
    'behavior_regulation',
    'fine_motor',
    'early_learning',
    'life_skills',
    'caregiver_tool',
  ].includes(value);
}

export function isWorksheetActivityType(
  value: string
): value is WorksheetActivityType {
  return [
    'color',
    'circle',
    'trace',
    'match',
    'cut_paste',
    'sequence',
    'draw',
    'maze',
    'choice',
    'checkbox',
    'fill_in',
    'sort',
  ].includes(value);
}