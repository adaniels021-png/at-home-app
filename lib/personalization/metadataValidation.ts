import {
  ASSESSMENT_NEED_TAGS, COMMUNICATION_COMPLEXITIES, COMMUNICATION_MODES,
  CONTRAINDICATION_TAGS, INDEPENDENCE_LEVELS, MASTERY_GROUP_CODES,
  MATERIAL_ACTIVITY_TAGS, PERSONALIZATION_METADATA_VERSION, SKILL_STAGE_CODES,
  TARGET_SKILL_CODES,
} from './metadataVocabulary';

export type MetadataValidationInput = {
  lessonId: string; metadataVersion: number; targetSkillCode: string | null;
  masteryGroup: string | null; skillStageCode: string | null;
  prerequisiteSkillCodes: string[]; assessmentNeedTags: string[];
  supportedResponseModes: string[]; minCommunicationComplexity: string | null;
  maxCommunicationComplexity: string | null; minIndependenceLevel: string | null;
  maxIndependenceLevel: string | null; contraindicationTags: string[];
  materialActivityTags: string[]; universalSafeFallback: boolean;
  candidateWarnings: string[]; communicationReviewed: boolean; safetyReviewed: boolean;
  prerequisiteReviewed: boolean; prerequisiteReviewState?: string; duplicateReviewed: boolean;
  metadataStale?: boolean;
};

const hasDuplicates = (values: string[]) => new Set(values).size !== values.length;
const includesOnly = (values: string[], allowed: readonly string[]) => values.every((v) => allowed.includes(v));
const rangeError = (min: string | null, max: string | null, order: readonly string[]) =>
  min && max && order.indexOf(min) > order.indexOf(max);

export function validateLessonMetadata(value: MetadataValidationInput): string[] {
  const errors: string[] = [];
  if (value.metadataVersion !== PERSONALIZATION_METADATA_VERSION) errors.push('Unsupported metadata version.');
  if (!value.targetSkillCode || !TARGET_SKILL_CODES.includes(value.targetSkillCode as never)) errors.push('Target skill code is missing or unsupported.');
  if (!value.masteryGroup || !MASTERY_GROUP_CODES.includes(value.masteryGroup as never)) errors.push('Mastery group is missing or unsupported.');
  if (!value.skillStageCode || !SKILL_STAGE_CODES.includes(value.skillStageCode as never)) errors.push('Stage code is missing or unsupported.');
  if (!includesOnly(value.prerequisiteSkillCodes, TARGET_SKILL_CODES)) errors.push('A prerequisite code is unsupported.');
  if (value.targetSkillCode && value.prerequisiteSkillCodes.includes(value.targetSkillCode)) errors.push('A target skill cannot be its own prerequisite.');
  if (!includesOnly(value.assessmentNeedTags, ASSESSMENT_NEED_TAGS)) errors.push('An assessment need tag is unsupported.');
  if (!includesOnly(value.supportedResponseModes, COMMUNICATION_MODES)) errors.push('A response mode is unsupported.');
  if (value.minCommunicationComplexity && !COMMUNICATION_COMPLEXITIES.includes(value.minCommunicationComplexity as never)) errors.push('Minimum communication complexity is unsupported.');
  if (value.maxCommunicationComplexity && !COMMUNICATION_COMPLEXITIES.includes(value.maxCommunicationComplexity as never)) errors.push('Maximum communication complexity is unsupported.');
  if (rangeError(value.minCommunicationComplexity, value.maxCommunicationComplexity, COMMUNICATION_COMPLEXITIES)) errors.push('Communication range is reversed.');
  if (value.minIndependenceLevel && !INDEPENDENCE_LEVELS.includes(value.minIndependenceLevel as never)) errors.push('Minimum independence level is unsupported.');
  if (value.maxIndependenceLevel && !INDEPENDENCE_LEVELS.includes(value.maxIndependenceLevel as never)) errors.push('Maximum independence level is unsupported.');
  if (rangeError(value.minIndependenceLevel, value.maxIndependenceLevel, INDEPENDENCE_LEVELS)) errors.push('Independence range is reversed.');
  if (!includesOnly(value.contraindicationTags, CONTRAINDICATION_TAGS)) errors.push('A contraindication tag is unsupported.');
  if (!includesOnly(value.materialActivityTags, MATERIAL_ACTIVITY_TAGS)) errors.push('A material/activity tag is unsupported.');
  for (const [label, list] of [['prerequisite', value.prerequisiteSkillCodes], ['need', value.assessmentNeedTags], ['response mode', value.supportedResponseModes], ['contraindication', value.contraindicationTags], ['material/activity', value.materialActivityTags]] as const) if (hasDuplicates(list)) errors.push(`Duplicate ${label} values are not allowed.`);
  const warnings = new Set(value.candidateWarnings);
  if (warnings.has('COMMUNICATION_REVIEW_REQUIRED') && !value.communicationReviewed) errors.push('Communication review is unresolved.');
  if (warnings.has('SAFETY_REVIEW_REQUIRED') && !value.safetyReviewed) errors.push('Safety review is unresolved.');
  if (value.materialActivityTags.some((tag) => ['material.food','risk.allergy_relevant','risk.small_objects','activity.water','sensory.loud_sound','sensory.bright_visual','sensory.messy_texture','activity.physical_contact','activity.movement','risk.fast_spinning','activity.community'].includes(tag)) && !value.safetyReviewed) errors.push('Material/activity safety review is unresolved.');
  if (warnings.has('DUPLICATE_REVIEW') && !value.duplicateReviewed) errors.push('Duplicate/progression review is unresolved.');
  if (!value.prerequisiteReviewed || !['no_prerequisite_deterministic','confirmed','rejected'].includes(value.prerequisiteReviewState ?? '')) errors.push('Prerequisite review is unresolved.');
  if (value.metadataStale) errors.push('Lesson content changed after metadata review.');
  if (value.universalSafeFallback && (errors.length || warnings.has('SAFETY_REVIEW_REQUIRED'))) errors.push('Universal fallback requires fully resolved, valid safety metadata.');
  return [...new Set(errors)];
}

export function isSafeBatchEligible(value: MetadataValidationInput & { candidateConfidence: string | null }) {
  return value.candidateConfidence !== 'LOW' && validateLessonMetadata(value).length === 0;
}
