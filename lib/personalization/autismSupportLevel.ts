import type {
  AssessmentAnswers,
  AutismSupportLevelProfile,
  ChildPersonalizationProfile,
} from './types';

type UnknownRecord = Record<string, unknown>;

export const AUTISM_SUPPORT_LEVEL_OPTIONS = [
  'Level 1 — Requiring support',
  'Level 2 — Requiring substantial support',
  'Level 3 — Requiring very substantial support',
  'Different levels were given for different areas',
  "Not sure / I wasn't told",
] as const;

export const DOMAIN_SUPPORT_LEVEL_OPTIONS = [
  'Level 1',
  'Level 2',
  'Level 3',
  'Not sure',
] as const;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function overallOption(value: unknown): string | undefined {
  if (typeof value === 'string' && AUTISM_SUPPORT_LEVEL_OPTIONS.includes(
    value as (typeof AUTISM_SUPPORT_LEVEL_OPTIONS)[number],
  )) return value;
  if (value === '1') return AUTISM_SUPPORT_LEVEL_OPTIONS[0];
  if (value === '2') return AUTISM_SUPPORT_LEVEL_OPTIONS[1];
  if (value === '3') return AUTISM_SUPPORT_LEVEL_OPTIONS[2];
  if (value === 'mixed') return AUTISM_SUPPORT_LEVEL_OPTIONS[3];
  if (value === 'unknown') return AUTISM_SUPPORT_LEVEL_OPTIONS[4];
  return undefined;
}

function domainOption(value: unknown): string | undefined {
  if (typeof value === 'string' && DOMAIN_SUPPORT_LEVEL_OPTIONS.includes(
    value as (typeof DOMAIN_SUPPORT_LEVEL_OPTIONS)[number],
  )) return value;
  if (value === '1') return DOMAIN_SUPPORT_LEVEL_OPTIONS[0];
  if (value === '2') return DOMAIN_SUPPORT_LEVEL_OPTIONS[1];
  if (value === '3') return DOMAIN_SUPPORT_LEVEL_OPTIONS[2];
  if (value === 'unknown') return DOMAIN_SUPPORT_LEVEL_OPTIONS[3];
  return undefined;
}

export function restoreAutismSupportAnswers(
  assessmentAnswers: unknown,
  reassessmentResponses?: unknown,
): Record<string, string> {
  const initial = asRecord(assessmentAnswers);
  const reassessment = asRecord(reassessmentResponses);
  const rawOverall = reassessment.autism_support_level ?? initial.autism_support_level;
  const overall = overallOption(rawOverall);
  if (!overall) return {};

  const restored: Record<string, string> = { autism_support_level: overall };
  if (overall !== AUTISM_SUPPORT_LEVEL_OPTIONS[3]) return restored;

  const social = domainOption(
    reassessment.social_communication_support_level
      ?? initial.social_communication_support_level,
  );
  const repetitive = domainOption(
    reassessment.restricted_repetitive_support_level
      ?? initial.restricted_repetitive_support_level,
  );
  if (social) restored.social_communication_support_level = social;
  if (repetitive) restored.restricted_repetitive_support_level = repetitive;
  return restored;
}

function normalizeOverall(value: unknown): AutismSupportLevelProfile['overall'] {
  if (value === 'Level 1 — Requiring support' || value === '1') return '1';
  if (value === 'Level 2 — Requiring substantial support' || value === '2') return '2';
  if (value === 'Level 3 — Requiring very substantial support' || value === '3') return '3';
  if (value === 'Different levels were given for different areas' || value === 'mixed') return 'mixed';
  return 'unknown';
}

function normalizeDomain(value: unknown): AutismSupportLevelProfile['socialCommunication'] {
  if (value === 'Level 1' || value === '1') return '1';
  if (value === 'Level 2' || value === '2') return '2';
  if (value === 'Level 3' || value === '3') return '3';
  return 'unknown';
}

export function buildAutismSupportLevelProfile(
  answers: AssessmentAnswers,
  reassessmentResponses?: unknown,
): AutismSupportLevelProfile {
  const reassessment = asRecord(reassessmentResponses);
  const overall = normalizeOverall(
    reassessment.autism_support_level ?? answers.autism_support_level,
  );

  if (overall !== 'mixed') {
    return {
      overall,
      socialCommunication: 'unknown',
      restrictedRepetitive: 'unknown',
      source: overall === 'unknown' ? 'unknown' : 'caregiver_reported_professional',
    };
  }

  return {
    overall,
    socialCommunication: normalizeDomain(
      reassessment.social_communication_support_level
        ?? answers.social_communication_support_level,
    ),
    restrictedRepetitive: normalizeDomain(
      reassessment.restricted_repetitive_support_level
        ?? answers.restricted_repetitive_support_level,
    ),
    source: 'caregiver_reported_professional',
  };
}

const BASELINES = {
  '1': 'When individual information is unavailable, begin with lighter prompting, independence opportunities, somewhat more complex directions when appropriate, naturalistic practice, generalization, and developmentally appropriate problem-solving.',
  '2': 'When individual information is unavailable, begin with clear structure, shorter steps, modeling, visual supports, repetition, explicit teaching, predictable routines, and increased caregiver support.',
  '3': 'When individual information is unavailable, begin with highly concrete directions, smaller task steps, strong visual structure, caregiver modeling, predictable repetition, shorter initial practice, lower initial task demands, and more explicit prompting.',
} as const;

export function buildAutismSupportLessonGuidance(
  profile: ChildPersonalizationProfile,
): string {
  const support = profile.autismSupport;
  if (support.overall === 'unknown') return '';

  const reported = support.overall === 'mixed'
    ? `Caregiver-reported professional support levels are domain-specific: social communication ${support.socialCommunication}; restricted/repetitive behavior and flexibility ${support.restrictedRepetitive}. Keep them separate and do not average them or apply the higher value globally.`
    : `Caregiver-reported professional autism support level: Level ${support.overall}. ${BASELINES[support.overall]}`;
  const communication = profile.communication.modes.length
    ? `Established communication modes: ${profile.communication.modes.join(', ')}.`
    : 'Communication mode is not established; do not infer one from support level.';
  const individualSignals = [
    profile.regulation.currentNeeds.length
      ? `Current regulation needs: ${profile.regulation.currentNeeds.join(', ')}.`
      : '',
    profile.learningSupport.preferredTeachingSupports.length
      ? `Established teaching supports: ${profile.learningSupport.preferredTeachingSupports.join(', ')}.`
      : '',
    profile.lessonState.masteredSkillCodes.length
      ? `Demonstrated mastered skills: ${profile.lessonState.masteredSkillCodes.join(', ')}.`
      : '',
    profile.lessonState.weakSkillCodes.length
      ? `Skills currently needing more support: ${profile.lessonState.weakSkillCodes.join(', ')}.`
      : '',
  ].filter(Boolean).join(' ');

  return `${reported} ${communication} ${individualSignals} Use support level only as an initial support-intensity signal. Specific assessment information and demonstrated lesson performance take precedence. Never infer communication mode, intelligence, developmental ability, or inability from autism support level. Performance may increase or decrease prompting, complexity, pacing, structure, and caregiver support without changing the reported diagnostic level.`;
}
