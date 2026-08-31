import {
  ALTERNATE_RESPONSE_MODES,
  ATTENTION_MAP,
  COMMUNICATION_LEVEL_MAP,
  IMITATION_MAP,
  INDEPENDENCE_MAP,
  INSTRUCTION_MAP,
  PERSONALIZATION_SCHEMA_VERSION,
  PRIMARY_PRIORITY_MAP,
  PARENT_GOAL_MAP,
  REQUEST_MODE_MAP,
  REQUEST_SUPPORT_MAP,
  ROUTINE_NEED_MAP,
  normalizeLegacySkillCode,
  normalizeSelectionCodes,
  priorityFromSelection,
} from './codes';
import type {
  AssessmentAnswers,
  ChildPersonalizationProfile,
  CommunicationMode,
  LegacyProfileInput,
  SupportLevel,
} from './types';
import { canonicalInterestKeys, canonicalTargetsFromAssessment } from './canonicalAssessment';
import { buildAutismSupportLevelProfile } from './autismSupportLevel';

type UnknownRecord = Record<string, unknown>;

const RESTRICTION_PATTERNS: readonly {
  tag: string;
  patterns: RegExp[];
}[] = [
  { tag: 'risk.allergy', patterns: [/\ballerg(?:y|ies|ic)\b/gi] },
  { tag: 'risk.small_objects', patterns: [/\bsmall objects?\b/gi] },
  { tag: 'activity.water', patterns: [/\bwater(?: play| activities| activity)?\b/gi] },
  { tag: 'sensory.loud_sound', patterns: [/\bloud (?:sounds?|noises?)\b/gi] },
  { tag: 'sensory.bright_light', patterns: [/\bbright lights?\b/gi] },
  { tag: 'sensory.messy_texture', patterns: [/\bmessy (?:play|textures?)\b/gi] },
  { tag: 'material.food', patterns: [/\bfoods?\b/gi] },
  { tag: 'activity.physical_contact', patterns: [/\bphysical (?:touch|contact|help)\b/gi] },
  { tag: 'activity.movement', patterns: [/\b(?:fast |spinning )?movement\b/gi] },
];

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(asString).filter((item): item is string => Boolean(item)))];
}

function answersFromAssessment(assessment: LegacyProfileInput['assessment']): AssessmentAnswers {
  const responses = asRecord(assessment?.responses);
  return asRecord(responses.answers) as AssessmentAnswers;
}

function mapValues(values: string[], mapping: Record<string, string>): string[] {
  return [...new Set(values.map((value) => mapping[value]).filter(Boolean))];
}

function addMode(modes: CommunicationMode[], mode?: CommunicationMode | null) {
  if (mode && !modes.includes(mode)) modes.push(mode);
}

function normalizeRestrictionText(text: string | null) {
  if (!text) return { tags: [] as string[], unresolved: false };

  const tags: string[] = [];
  let remainder = text;

  for (const entry of RESTRICTION_PATTERNS) {
    let matched = false;
    for (const pattern of entry.patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(remainder)) matched = true;
      pattern.lastIndex = 0;
      remainder = remainder.replace(pattern, ' ');
    }
    if (matched) tags.push(entry.tag);
  }

  const unresolved = remainder
    .replace(/\b(?:and|or|avoid|please|the|a|an|in|lessons?|activities?)\b/gi, ' ')
    .replace(/[^a-z0-9]+/gi, '')
    .length > 0;

  return { tags: [...new Set(tags)], unresolved };
}

function getRoutineState(routines: string[], value: string): SupportLevel {
  return routines.includes(value) ? 'learning' : 'unknown';
}

function applyReassessment(
  profile: ChildPersonalizationProfile,
  reassessment: LegacyProfileInput['reassessment']
) {
  const responses = asRecord(reassessment?.responses);
  const communication = asString(responses['1']);
  const directions = asString(responses['2']);
  const routine = asString(responses['3']);

  if (communication === 'Words') {
    profile.communication.modes = ['spoken_words'];
    profile.communication.primaryMode = 'spoken_words';
    profile.communication.complexity = 'unknown';
    profile.communication.mustSupportAlternateResponse = false;
  } else if (communication === 'Gestures') {
    profile.communication.modes = ['gestures_pointing'];
    profile.communication.primaryMode = 'gestures_pointing';
    profile.communication.complexity = 'unknown';
    profile.communication.mustSupportAlternateResponse = true;
  } else if (communication === 'Pictures') {
    profile.communication.modes = ['pictures_pecs'];
    profile.communication.primaryMode = 'pictures_pecs';
    profile.communication.complexity = 'unknown';
    profile.communication.mustSupportAlternateResponse = true;
  } else if (communication === 'Sounds') {
    profile.communication.modes = ['other'];
    profile.communication.primaryMode = 'other';
    profile.communication.complexity = 'beginning_intentional';
  }

  const directionMap: Record<string, SupportLevel> = {
    'Usually follows': 'independent',
    'Sometimes follows': 'mostly_independent',
    'Needs prompts': 'learning',
    'Not yet': 'not_started',
  };
  if (directions && directionMap[directions]) {
    profile.communication.followsSimpleDirections = directionMap[directions];
    profile.learningSupport.instructionSupport = directionMap[directions];
  }

  if (routine === 'Morning') profile.dailyLiving.morningRoutine = 'learning';
  if (routine === 'Bedtime') profile.dailyLiving.bedtimeRoutine = 'learning';
  if (routine === 'Potty training') profile.dailyLiving.basicToileting = 'learning';
  if (
    routine === 'Transitions' &&
    !profile.regulation.currentNeeds.includes('behavior.transitions')
  ) {
    profile.regulation.currentNeeds.push('behavior.transitions');
    if (profile.regulation.priority === 'none') profile.regulation.priority = 'medium';
  }
}

export function normalizeLegacyChildProfile(
  input: LegacyProfileInput
): ChildPersonalizationProfile {
  const answers = answersFromAssessment(input.assessment);
  const child = input.child || {};
  const primaryGoal = asString(answers.primary_goal);
  const primary = primaryGoal && PRIMARY_PRIORITY_MAP[primaryGoal]
    ? [PRIMARY_PRIORITY_MAP[primaryGoal]]
    : [];
  const parentGoals = mapValues(asStringArray(child.parent_goals), PARENT_GOAL_MAP);
  const communicationLevel = asString(answers.communication_level);
  const communicationMapping = communicationLevel
    ? COMMUNICATION_LEVEL_MAP[communicationLevel]
    : undefined;
  const requestAnswer = asString(answers.requests_needs);
  const modes: CommunicationMode[] = [];

  addMode(modes, communicationMapping?.mode);
  addMode(modes, requestAnswer ? REQUEST_MODE_MAP[requestAnswer] : null);

  const routineChallenges = asStringArray(answers.routine_challenges);
  const behaviorConcerns = asStringArray(answers.behavior_concerns);
  const sensoryNeeds = asStringArray(answers.sensory_needs);
  const socialNeeds = asStringArray(answers.social_skills);
  const safetyNeeds = asStringArray(answers.safety_skills);
  const avoidText = asString(answers.avoid_in_lessons);
  const parentNotes = asString(answers.parent_notes);
  const restrictionText = [avoidText, parentNotes]
    .filter((value): value is string => Boolean(value))
    .join('\n') || null;
  const restrictionResult = normalizeRestrictionText(restrictionText);
  const noBehaviorConcerns = behaviorConcerns.includes('No major concerns');
  const noSensoryConcerns = sensoryNeeds.includes('No major sensory needs');
  const noSafetyConcerns = safetyNeeds.includes('No major safety concerns');

  const ageValue = Number(child.age);
  const age = Number.isFinite(ageValue) && ageValue >= 0 ? ageValue : null;
  const masteryRows = (input.masteryRows || []).map(asRecord);
  const completedRows = (input.completedLessonRows || []).map(asRecord);
  const masteredSkillCodes = masteryRows
    .filter((row) => row.mastery_status === 'mastered')
    .map((row) => normalizeLegacySkillCode(row.skill_target))
    .filter((value): value is string => Boolean(value));
  const weakSkillCodes = masteryRows
    .filter(
      (row) =>
        row.mastery_status === 'emerging' ||
        (typeof row.average_score === 'number' && row.average_score < 60)
    )
    .map((row) => normalizeLegacySkillCode(row.skill_target))
    .filter((value): value is string => Boolean(value));
  const currentSkillStages: Record<string, number> = {};

  for (const row of completedRows) {
    const code = normalizeLegacySkillCode(row.skill_area);
    const stage = Number(row.stage_number);
    if (code && Number.isFinite(stage) && stage > 0) {
      currentSkillStages[code] = Math.max(currentSkillStages[code] || 0, stage);
    }
  }

  const profile: ChildPersonalizationProfile = {
    childId: input.childId,
    schemaVersion: PERSONALIZATION_SCHEMA_VERSION,
    builtAt: input.builtAt || new Date().toISOString(),
    source: {
      initialAssessmentId: asString(input.assessment?.id),
      reassessmentId: asString(input.reassessment?.id),
      assessmentCompletedAt:
        asString(input.assessment?.completed_at) || asString(input.assessment?.created_at),
      reassessmentCompletedAt: asString(input.reassessment?.created_at),
      parentGoalsUpdatedAt:
        asString(child.onboarding_parent_goals_completed_at) || asString(child.updated_at),
    },
    age: { years: age },
    autismSupport: buildAutismSupportLevelProfile(answers, input.reassessment?.responses),
    priorities: {
      primary,
      parentGoals,
      parentGoalNotes: asString(child.parent_goal_notes),
      needTags: [
        ...mapValues(routineChallenges, ROUTINE_NEED_MAP),
        ...normalizeSelectionCodes(
          'communication',
          asStringArray(answers.communication_targets)
        ),
        ...normalizeSelectionCodes('social', socialNeeds),
        ...normalizeSelectionCodes(
          'safety',
          safetyNeeds.filter((value) => value !== 'No major safety concerns')
        ),
      ],
    },
    canonicalTargets: canonicalTargetsFromAssessment(answers),
    communication: {
      modes,
      primaryMode: communicationMapping?.mode || modes[0] || null,
      complexity: communicationMapping?.complexity || 'unknown',
      requestingSupport: requestAnswer
        ? REQUEST_SUPPORT_MAP[requestAnswer] || 'unknown'
        : 'unknown',
      followsSimpleDirections:
        INSTRUCTION_MAP[asString(answers.instruction_following_level) || ''] || 'unknown',
      mustSupportAlternateResponse: modes.some((mode) => ALTERNATE_RESPONSE_MODES.has(mode)),
    },
    dailyLiving: {
      overallIndependence:
        INDEPENDENCE_MAP[asString(answers.independence_level) || ''] || 'unknown',
      morningRoutine: getRoutineState(routineChallenges, 'Morning routine'),
      bedtimeRoutine: getRoutineState(routineChallenges, 'Bedtime'),
      dressing: getRoutineState(routineChallenges, 'Getting dressed'),
      handWashing: 'unknown',
      toothBrushing: getRoutineState(routineChallenges, 'Tooth brushing'),
      basicToileting: getRoutineState(routineChallenges, 'Potty routine'),
      bathroomHygiene: 'unknown',
    },
    learningSupport: {
      attentionSupport: ATTENTION_MAP[asString(answers.attention_span) || ''] || 'unknown',
      instructionSupport:
        INSTRUCTION_MAP[asString(answers.instruction_following_level) || ''] || 'unknown',
      imitationSupport: IMITATION_MAP[asString(answers.imitation_level) || ''] || 'unknown',
      preferredTeachingSupports: normalizeSelectionCodes(
        'teaching',
        asStringArray(answers.learning_style)
      ),
    },
    regulation: {
      priority: noBehaviorConcerns
        ? 'none'
        : priorityFromSelection(primary, behaviorConcerns, 'regulation_behavior'),
      currentNeeds: normalizeSelectionCodes(
        'behavior',
        behaviorConcerns.filter((value) => value !== 'No major concerns')
      ),
      commonChallenges: normalizeSelectionCodes(
        'trigger',
        asStringArray(answers.behavior_triggers)
      ),
      helpfulSupports: normalizeSelectionCodes(
        'regulation_support',
        asStringArray(answers.calming_supports)
      ),
      noMajorConcerns: noBehaviorConcerns,
    },
    sensory: {
      considerations: normalizeSelectionCodes(
        'sensory',
        sensoryNeeds.filter((value) => value !== 'No major sensory needs')
      ),
      noMajorConcerns: noSensoryConcerns,
    },
    social: {
      currentNeeds: normalizeSelectionCodes('social', socialNeeds),
      priority: priorityFromSelection(primary, socialNeeds, 'social'),
    },
    safety: {
      currentNeeds: normalizeSelectionCodes(
        'safety',
        safetyNeeds.filter((value) => value !== 'No major safety concerns')
      ),
      priority: noSafetyConcerns
        ? 'none'
        : priorityFromSelection(primary, safetyNeeds, 'safety'),
      noMajorConcerns: noSafetyConcerns,
    },
    restrictions: {
      tags: restrictionResult.tags,
      notes: restrictionText,
      unresolvedFreeText: restrictionResult.unresolved,
    },
    interests: {
      preferredInterests: canonicalInterestKeys(asStringArray(answers.favorite_interests)),
      reinforcers: canonicalInterestKeys(asStringArray(answers.favorite_interests)),
    },
    lessonState: {
      masteredSkillCodes: [...new Set(masteredSkillCodes)],
      currentSkillStages,
      recentlyShownLessonIds: [],
      recentlyCompletedLessonIds: completedRows
        .map((row) => asString(row.library_lesson_id))
        .filter((value): value is string => Boolean(value)),
      weakSkillCodes: [...new Set(weakSkillCodes)],
    },
  };

  applyReassessment(profile, input.reassessment);
  return profile;
}
