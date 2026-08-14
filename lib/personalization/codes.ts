import type {
  AttentionSupport,
  CommunicationComplexity,
  CommunicationMode,
  PriorityLevel,
  SupportLevel,
} from './types';

export const PERSONALIZATION_SCHEMA_VERSION = 1;
export const RECENT_COMPLETED_LESSON_LIMIT = 10;

export const UNKNOWN_SUPPORT: SupportLevel = 'unknown';

export const COMMUNICATION_LEVEL_MAP: Record<
  string,
  { mode: CommunicationMode; complexity: CommunicationComplexity }
> = {
  'Mostly gestures or pointing': {
    mode: 'gestures_pointing',
    complexity: 'beginning_intentional',
  },
  'Single words': { mode: 'spoken_words', complexity: 'single_unit' },
  'Short phrases': { mode: 'spoken_phrases', complexity: 'short_combinations' },
  'Full sentences': { mode: 'spoken_sentences', complexity: 'sentences' },
  'PECS / picture cards': { mode: 'pictures_pecs', complexity: 'unknown' },
  'AAC device': { mode: 'aac', complexity: 'unknown' },
  'Limited communication right now': {
    mode: 'other',
    complexity: 'unknown',
  },
};

export const REQUEST_MODE_MAP: Record<string, CommunicationMode> = {
  'Pulls caregiver toward item': 'behavior_body_leading',
  'Points or reaches': 'gestures_pointing',
  'Uses sounds or words': 'spoken_words',
  'Uses signs': 'signs',
  'Uses pictures / PECS': 'pictures_pecs',
  'Uses AAC': 'aac',
  'Gets upset because requesting is hard': 'behavior_body_leading',
};

export const REQUEST_SUPPORT_MAP: Record<string, SupportLevel> = {
  'Pulls caregiver toward item': 'high_support',
  'Points or reaches': 'learning',
  'Uses sounds or words': 'learning',
  'Uses signs': 'learning',
  'Uses pictures / PECS': 'learning',
  'Uses AAC': 'learning',
  'Gets upset because requesting is hard': 'high_support',
};

export const INDEPENDENCE_MAP: Record<string, SupportLevel> = {
  'Full physical help': 'high_support',
  'Lots of reminders': 'high_support',
  'Some prompts': 'learning',
  'Mostly independent': 'mostly_independent',
  'Depends on the routine': 'unknown',
};

export const INSTRUCTION_MAP: Record<string, SupportLevel> = {
  'Does not respond yet': 'not_started',
  'Responds with full physical help': 'high_support',
  'Responds with modeling': 'learning',
  'Responds with gestures or reminders': 'learning',
  'Responds independently sometimes': 'mostly_independent',
};

export const IMITATION_MAP: Record<string, SupportLevel> = {
  'Not yet': 'not_started',
  'With full help': 'high_support',
  'After seeing a model': 'learning',
  'Sometimes independently': 'mostly_independent',
  'Often independently': 'independent',
};

export const ATTENTION_MAP: Record<string, AttentionSupport> = {
  'Less than 1 minute': 'very_short',
  '1–3 minutes': 'short',
  '3–5 minutes': 'moderate',
  '5–10 minutes': 'moderate',
  '10+ minutes': 'extended',
};

export const ALTERNATE_RESPONSE_MODES = new Set<CommunicationMode>([
  'aac',
  'pictures_pecs',
  'signs',
  'gestures_pointing',
  'behavior_body_leading',
]);

export const PRIMARY_PRIORITY_MAP: Record<string, string> = {
  Communication: 'communication',
  'Behavior support': 'regulation_behavior',
  'Daily routines': 'daily_living',
  'Social skills': 'social',
  'School readiness': 'learning_readiness',
  Independence: 'independence',
};

export const PARENT_GOAL_MAP: Record<string, string> = {
  'Improve communication': 'communication',
  'Reduce meltdowns': 'regulation',
  'Build daily routines': 'daily_living',
  'Help with transitions': 'transitions',
  'Increase independence': 'independence',
  'Support school readiness': 'learning_readiness',
  'Improve social skills': 'social',
  'Create calmer home days': 'regulation',
};

export const ROUTINE_NEED_MAP: Record<string, string> = {
  'Morning routine': 'routine.morning',
  Bedtime: 'routine.bedtime',
  'Tooth brushing': 'hygiene.toothbrushing',
  Bathing: 'hygiene.bathing',
  'Getting dressed': 'self_help.dressing',
  Meals: 'routine.meals',
  'Leaving the house': 'routine.leaving_home',
  'Cleaning up': 'routine.cleaning_up',
  'Potty routine': 'toileting.basic',
};

export function priorityFromSelection(
  primary: string[],
  targets: string[],
  primaryCode: string
): PriorityLevel {
  if (primary.includes(primaryCode)) return 'high';
  if (targets.length > 0) return 'medium';
  return 'none';
}

export function normalizeLegacySkillCode(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');

  return slug ? `legacy.${slug}` : null;
}

export function normalizeSelectionCodes(prefix: string, values: string[]): string[] {
  return values
    .map((value) => normalizeLegacySkillCode(value)?.replace(/^legacy\./, `${prefix}.`))
    .filter((value): value is string => Boolean(value));
}
