// lib/worksheetSkillInterpreter.ts

import { DifficultyLevel, WorksheetCategory } from './worksheetTemplates';

export type AbaSkillDomain =
  | 'communication'
  | 'receptive_language'
  | 'expressive_language'
  | 'social_skills'
  | 'behavior_regulation'
  | 'adaptive_living'
  | 'fine_motor'
  | 'visual_perception'
  | 'pre_academic'
  | 'play_leisure'
  | 'safety'
  | 'general';

export type WorksheetTeachingMethod =
  | 'task_analysis'
  | 'chaining'
  | 'visual_support'
  | 'matching'
  | 'sorting'
  | 'sequencing'
  | 'tracing'
  | 'coloring'
  | 'cut_and_paste'
  | 'errorless_learning'
  | 'discrimination_training'
  | 'prompt_fading'
  | 'role_play'
  | 'data_collection'
  | 'general_practice';

export type WorksheetStyleIntent =
  | 'task_analysis_strip'
  | 'first_then_board'
  | 'visual_schedule'
  | 'sequencing_story'
  | 'matching_page'
  | 'sorting_page'
  | 'trace_and_label'
  | 'cut_paste_activity'
  | 'coloring_page'
  | 'choice_board'
  | 'social_story'
  | 'behavior_log'
  | 'calm_down_tool'
  | 'blank_practice';

export type PromptingLevel =
  | 'errorless'
  | 'full_physical'
  | 'partial_physical'
  | 'model'
  | 'gesture'
  | 'visual'
  | 'verbal'
  | 'independent'
  | 'mixed';

export type WorksheetSkillInterpretation = {
  originalPrompt: string;
  normalizedPrompt: string;
  domain: AbaSkillDomain;
  category: WorksheetCategory;
  targetSkill: string;
  skillKeywords: string[];
  teachingMethods: WorksheetTeachingMethod[];
  worksheetStyle: WorksheetStyleIntent;
  recommendedDifficulty: DifficultyLevel;
  promptingLevel: PromptingLevel;
  parentGoal: string;
  childAction: string;
  successCriteria: string;
  suggestedAssetKeys: string[];
  suggestedTitle: string;
  therapistNote: string;
  confidence: number;
  reasons: string[];
};

function normalize(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function baseInterpretation(prompt: string): WorksheetSkillInterpretation {
  const normalizedPrompt = normalize(prompt);

  return {
    originalPrompt: prompt,
    normalizedPrompt,
    domain: 'general',
    category: 'Learning & Life Skills',
    targetSkill: 'General Skill Practice',
    skillKeywords: [],
    teachingMethods: ['general_practice'],
    worksheetStyle: 'blank_practice',
    recommendedDifficulty: 'beginner',
    promptingLevel: 'mixed',
    parentGoal: 'Support short, positive skill practice at home.',
    childAction: 'Complete the worksheet with caregiver support.',
    successCriteria: 'Child participates with support during a short practice activity.',
    suggestedAssetKeys: [],
    suggestedTitle: 'Skill Practice Worksheet',
    therapistNote:
      'Keep practice brief, positive, and supported. Use praise, modeling, and breaks as needed.',
    confidence: 20,
    reasons: ['default general interpretation'],
  };
}

function applyHandwashing(result: WorksheetSkillInterpretation) {
  result.domain = 'adaptive_living';
  result.category = 'Visual Routines';
  result.targetSkill = 'Handwashing';
  result.skillKeywords = ['handwashing', 'washing hands', 'soap', 'sink', 'hygiene'];
  result.teachingMethods = ['task_analysis', 'chaining', 'visual_support', 'prompt_fading'];
  result.worksheetStyle = 'task_analysis_strip';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child complete the handwashing routine in the correct order.';
  result.childAction = 'Point to, color, sequence, or practice each handwashing step.';
  result.successCriteria =
    'Child completes or identifies the main handwashing steps with reduced prompting across practice opportunities.';
  result.suggestedAssetKeys = [
    'sink',
    'soap-bottle',
    'wash-hands',
    'water',
    'towel',
  ];
  result.suggestedTitle = 'Handwashing Steps';
  result.therapistNote =
    'Use task analysis and prompt fading. Start with visual or model prompts, then fade support as the child becomes more independent.';
  result.confidence = 95;
  result.reasons.push('identified adaptive living handwashing routine');
}

function applyToothBrushing(result: WorksheetSkillInterpretation) {
  result.domain = 'adaptive_living';
  result.category = 'Visual Routines';
  result.targetSkill = 'Tooth Brushing';
  result.skillKeywords = ['tooth brushing', 'brush teeth', 'toothbrush', 'toothpaste'];
  result.teachingMethods = ['task_analysis', 'chaining', 'visual_support', 'prompt_fading'];
  result.worksheetStyle = 'task_analysis_strip';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child follow the tooth brushing routine step by step.';
  result.childAction = 'Sequence or practice tooth brushing steps using visuals.';
  result.successCriteria =
    'Child identifies or completes tooth brushing steps with less prompting over time.';
  result.suggestedAssetKeys = ['toothbrush-blue', 'toothpaste', 'sink', 'water'];
  result.suggestedTitle = 'Tooth Brushing Steps';
  result.therapistNote =
    'Use chaining and reinforce each completed step. Keep language short and consistent.';
  result.confidence = 95;
  result.reasons.push('identified adaptive living tooth brushing routine');
}

function applyToileting(result: WorksheetSkillInterpretation) {
  result.domain = 'adaptive_living';
  result.category = 'Visual Routines';
  result.targetSkill = 'Toileting Routine';
  result.skillKeywords = ['potty', 'toilet', 'toileting', 'bathroom'];
  result.teachingMethods = ['task_analysis', 'chaining', 'visual_support'];
  result.worksheetStyle = 'visual_schedule';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Support the child in understanding the toileting routine.';
  result.childAction = 'Follow or point to toileting steps in order.';
  result.successCriteria =
    'Child transitions through toileting steps with caregiver support and increased independence.';
  result.suggestedAssetKeys = ['toilet', 'bathroom', 'wash-hands', 'sink'];
  result.suggestedTitle = 'Potty Routine Steps';
  result.therapistNote =
    'Use consistent visuals and neutral language. Reinforce cooperation and routine completion.';
  result.confidence = 92;
  result.reasons.push('identified toileting adaptive routine');
}

function applyFirstThen(result: WorksheetSkillInterpretation) {
  result.domain = 'behavior_regulation';
  result.category = 'Visual Routines';
  result.targetSkill = 'Transition Support';
  result.skillKeywords = ['first then', 'transition', 'nonpreferred', 'reward'];
  result.teachingMethods = ['visual_support', 'prompt_fading', 'errorless_learning'];
  result.worksheetStyle = 'first_then_board';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child understand what happens first and what comes next.';
  result.childAction = 'Place or identify the first task and then activity.';
  result.successCriteria =
    'Child follows a first/then direction with fewer protests or less prompting.';
  result.suggestedAssetKeys = ['first', 'then', 'reward', 'timer'];
  result.suggestedTitle = 'First Then Board';
  result.therapistNote =
    'Use simple language: “First __, then __.” Start with easy tasks and strong reinforcement.';
  result.confidence = 90;
  result.reasons.push('identified first/then transition support');
}

function applySequencing(result: WorksheetSkillInterpretation) {
  result.domain = 'receptive_language';
  result.category = 'Visual Routines';
  result.targetSkill = 'Sequencing';
  result.skillKeywords = ['sequence', 'sequencing', 'steps', 'order', 'story'];
  result.teachingMethods = ['sequencing', 'visual_support', 'cut_and_paste'];
  result.worksheetStyle = 'sequencing_story';
  result.recommendedDifficulty = 'intermediate';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child put events or routine steps in order.';
  result.childAction = 'Arrange pictures or steps in the correct order.';
  result.successCriteria =
    'Child sequences steps correctly with reduced prompting.';
  result.suggestedAssetKeys = ['first', 'next', 'then', 'last'];
  result.suggestedTitle = 'Sequencing Story';
  result.therapistNote =
    'Model the order first. Use first/next/then/last language and fade prompts gradually.';
  result.confidence = Math.max(result.confidence, 80);
  result.reasons.push('identified sequencing skill');
}

function applyMatching(result: WorksheetSkillInterpretation) {
  result.domain = 'visual_perception';
  result.category = 'Learning & Life Skills';
  result.targetSkill = 'Matching';
  result.skillKeywords = ['matching', 'match', 'same'];
  result.teachingMethods = ['matching', 'discrimination_training', 'errorless_learning'];
  result.worksheetStyle = 'matching_page';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child match identical or related items.';
  result.childAction = 'Draw lines, point, or match pictures.';
  result.successCriteria =
    'Child matches items accurately across repeated practice opportunities.';
  result.suggestedAssetKeys = [];
  result.suggestedTitle = 'Matching Practice';
  result.therapistNote =
    'Start with clear differences between items, then increase similarity as the child is successful.';
  result.confidence = Math.max(result.confidence, 80);
  result.reasons.push('identified matching/discrimination skill');
}

function applySorting(result: WorksheetSkillInterpretation) {
  result.domain = 'visual_perception';
  result.category = 'Learning & Life Skills';
  result.targetSkill = 'Sorting';
  result.skillKeywords = ['sorting', 'sort', 'category', 'group'];
  result.teachingMethods = ['sorting', 'discrimination_training'];
  result.worksheetStyle = 'sorting_page';
  result.recommendedDifficulty = 'intermediate';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child sort items by category or feature.';
  result.childAction = 'Place, point to, or circle items in the correct group.';
  result.successCriteria =
    'Child sorts items into correct groups with reduced prompting.';
  result.suggestedAssetKeys = [];
  result.suggestedTitle = 'Sorting Practice';
  result.therapistNote =
    'Use simple categories first, such as food vs toys or clothes vs animals.';
  result.confidence = Math.max(result.confidence, 80);
  result.reasons.push('identified sorting skill');
}

function applyEmotions(result: WorksheetSkillInterpretation) {
  result.domain = 'social_skills';
  result.category = 'Communication & Social Skills';
  result.targetSkill = 'Emotion Identification';
  result.skillKeywords = ['emotion', 'feelings', 'happy', 'sad', 'mad', 'angry', 'scared'];
  result.teachingMethods = ['matching', 'role_play', 'visual_support'];
  result.worksheetStyle = 'matching_page';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child identify and label emotions.';
  result.childAction = 'Match, point to, color, or label feeling faces.';
  result.successCriteria =
    'Child identifies common emotions with visual or verbal support.';
  result.suggestedAssetKeys = ['emotion-happy', 'emotion-sad', 'emotion-angry', 'emotion-scared'];
  result.suggestedTitle = 'Emotion Matching';
  result.therapistNote =
    'Model emotion labels and connect them to real situations throughout the day.';
  result.confidence = 90;
  result.reasons.push('identified emotion identification skill');
}

function applyRequesting(result: WorksheetSkillInterpretation) {
  result.domain = 'communication';
  result.category = 'Communication & Social Skills';
  result.targetSkill = 'Requesting';
  result.skillKeywords = ['requesting', 'ask for', 'mands', 'want', 'help', 'more', 'open'];
  result.teachingMethods = ['visual_support', 'prompt_fading', 'role_play'];
  result.worksheetStyle = 'choice_board';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'visual';
  result.parentGoal = 'Help the child request preferred items or help using words, signs, or pictures.';
  result.childAction = 'Point to, say, or exchange a picture to request.';
  result.successCriteria =
    'Child makes a clear request with reduced prompting during daily routines.';
  result.suggestedAssetKeys = ['more', 'help', 'open', 'favorite-toy', 'snack'];
  result.suggestedTitle = 'Requesting Practice';
  result.therapistNote =
    'Use motivating items and wait briefly before prompting. Reinforce immediately after the request.';
  result.confidence = 88;
  result.reasons.push('identified communication/requesting skill');
}

function applyFollowingDirections(result: WorksheetSkillInterpretation) {
  result.domain = 'receptive_language';
  result.category = 'Learning & Life Skills';
  result.targetSkill = 'Following One-Step Directions';
  result.skillKeywords = ['follow directions', 'one step', 'directions', 'receptive'];
  result.teachingMethods = ['discrimination_training', 'prompt_fading', 'visual_support'];
  result.worksheetStyle = 'blank_practice';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'mixed';
  result.parentGoal = 'Help the child respond to simple one-step directions.';
  result.childAction = 'Point, color, circle, or complete the named action.';
  result.successCriteria =
    'Child follows one-step directions with fewer prompts across several examples.';
  result.suggestedAssetKeys = ['sit', 'stand', 'clap', 'point'];
  result.suggestedTitle = 'Following Directions Practice';
  result.therapistNote =
    'Use short instructions and reinforce correct responses. Fade gestures and models over time.';
  result.confidence = 86;
  result.reasons.push('identified receptive language direction-following skill');
}

function applyFineMotor(result: WorksheetSkillInterpretation) {
  result.domain = 'fine_motor';
  result.category = 'Learning & Life Skills';
  result.targetSkill = 'Fine Motor Practice';
  result.skillKeywords = ['trace', 'tracing', 'cut', 'scissors', 'coloring', 'draw', 'write'];
  result.teachingMethods = ['tracing', 'coloring', 'cut_and_paste'];
  result.worksheetStyle = 'trace_and_label';
  result.recommendedDifficulty = 'beginner';
  result.promptingLevel = 'model';
  result.parentGoal = 'Help the child strengthen early fine motor and pre-writing skills.';
  result.childAction = 'Trace, color, cut, paste, or draw with support.';
  result.successCriteria =
    'Child participates in a short fine motor activity with improved accuracy or endurance.';
  result.suggestedAssetKeys = ['crayons', 'pencil', 'scissors'];
  result.suggestedTitle = 'Fine Motor Practice';
  result.therapistNote =
    'Offer hand-over-hand only if appropriate and fade quickly. Praise effort and participation.';
  result.confidence = Math.max(result.confidence, 78);
  result.reasons.push('identified fine motor worksheet need');
}

export function interpretWorksheetSkill(
  prompt: string,
  options?: {
    category?: WorksheetCategory;
    difficulty?: DifficultyLevel;
  }
): WorksheetSkillInterpretation {
  const result = baseInterpretation(prompt);
  const text = result.normalizedPrompt;

  if (hasAny(text, ['washing hands', 'wash hands', 'hand washing', 'handwashing', 'soap'])) {
    applyHandwashing(result);
  } else if (hasAny(text, ['tooth brushing', 'brush teeth', 'brushing teeth', 'toothbrush', 'toothpaste'])) {
    applyToothBrushing(result);
  } else if (hasAny(text, ['potty', 'toilet', 'toileting', 'bathroom'])) {
    applyToileting(result);
  } else if (hasAny(text, ['first then', 'first/then', 'transition', 'then board'])) {
    applyFirstThen(result);
  } else if (hasAny(text, ['emotion', 'feelings', 'happy', 'sad', 'mad', 'angry', 'scared'])) {
    applyEmotions(result);
  } else if (hasAny(text, ['request', 'requesting', 'ask for', 'want', 'more', 'help me', 'help'])) {
    applyRequesting(result);
  } else if (hasAny(text, ['follow directions', 'following directions', 'one step direction', 'one-step'])) {
    applyFollowingDirections(result);
  } else if (hasAny(text, ['matching', 'match', 'same'])) {
    applyMatching(result);
  } else if (hasAny(text, ['sorting', 'sort', 'category', 'group'])) {
    applySorting(result);
  } else if (hasAny(text, ['sequence', 'sequencing', 'steps', 'order', 'story', 'sandwich'])) {
    applySequencing(result);
  } else if (hasAny(text, ['trace', 'tracing', 'cut', 'scissors', 'coloring', 'draw', 'write'])) {
    applyFineMotor(result);
  }

  if (options?.category) {
    result.category = options.category;
    result.reasons.push(`category override: ${options.category}`);
  }

  if (options?.difficulty) {
    result.recommendedDifficulty = options.difficulty;
    result.reasons.push(`difficulty override: ${options.difficulty}`);
  }

  result.skillKeywords = unique(result.skillKeywords);
  result.teachingMethods = unique(result.teachingMethods) as WorksheetTeachingMethod[];
  result.suggestedAssetKeys = unique(result.suggestedAssetKeys);

  return result;
}

export function interpretWorksheetPrompt(
  prompt: string,
  options?: {
    category?: WorksheetCategory;
    difficulty?: DifficultyLevel;
  }
): WorksheetSkillInterpretation {
  return interpretWorksheetSkill(prompt, options);
}

export function getWorksheetSkillSearchText(
  interpretation: WorksheetSkillInterpretation
) {
  return normalize(
    [
      interpretation.targetSkill,
      interpretation.domain,
      interpretation.category,
      interpretation.worksheetStyle,
      interpretation.skillKeywords.join(' '),
      interpretation.teachingMethods.join(' '),
      interpretation.suggestedTitle,
      interpretation.originalPrompt,
    ].join(' ')
  );
}