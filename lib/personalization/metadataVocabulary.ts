import type { CommunicationComplexity, CommunicationMode, SupportLevel } from './types';

export const PERSONALIZATION_METADATA_VERSION = 1 as const;
export const METADATA_REVIEW_STATUSES = ['candidate', 'needs_review', 'approved', 'needs_changes', 'rejected'] as const;
export const METADATA_CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
export const SKILL_STAGE_CODES = ['beginning', 'emerging', 'developing', 'independent', 'generalized'] as const;
export const COMMUNICATION_MODES: CommunicationMode[] = ['spoken_sentences', 'spoken_phrases', 'spoken_words', 'aac', 'pictures_pecs', 'signs', 'gestures_pointing', 'behavior_body_leading', 'other'];
export const COMMUNICATION_COMPLEXITIES: CommunicationComplexity[] = ['beginning_intentional', 'single_unit', 'short_combinations', 'sentences', 'conversation', 'unknown'];
export const INDEPENDENCE_LEVELS: SupportLevel[] = ['not_started', 'high_support', 'learning', 'mostly_independent', 'independent', 'not_current_goal', 'unknown'];

export const TARGET_SKILL_CODES = [
  'behavior.frustration','behavior.impulse_control','behavior.transitions_flexibility','communication.answering_questions',
  'communication.conversation','communication.following_directions','communication.intentional_communication','communication.requesting',
  'communication.self_advocacy','communication.speech_clarity','hygiene.general','learning.attention','learning.engagement',
  'learning.executive_function','learning.imitation','learning.matching','learning.memory','learning.problem_solving','learning.sequencing',
  'learning.sorting','learning.task_initiation','learning.visual_attention','learning.working_memory','motor.balance','motor.bilateral',
  'motor.fine','motor.gross','motor.planning','motor.proprioception','motor.writing_readiness','play.cause_effect','play.cooperative',
  'play.functional','play.independent','play.pretend','regulation.calming','regulation.emotional','regulation.general',
  'regulation.identify_emotions','routine.bedtime','routine.household','routine.meals','routine.morning_bedtime','safety.foundational',
  'self_help.dressing','self_help.feeding','social.conflict_resolution','social.friendship','social.joint_attention',
  'social.perspective_taking','social.repair','social.turn_taking','toileting.basic',
] as const;

// Phase 9F.3 uses target-level mastery/need groups. Keeping a single set avoids
// parallel aliases while human review decides where broader groups are warranted.
export const MASTERY_GROUP_CODES = TARGET_SKILL_CODES;
export const ASSESSMENT_NEED_TAGS = TARGET_SKILL_CODES;

export const MATERIAL_ACTIVITY_TAGS = [
  'activity.community','activity.movement','activity.music','activity.physical_contact','activity.water',
  'material.food','risk.allergy_relevant','risk.fast_spinning','risk.small_objects','sensory.bright_visual',
  'sensory.loud_sound','sensory.messy_texture',
] as const;

export const CONTRAINDICATION_TAGS = [
  'restriction.allergy','restriction.bright_visual','restriction.community','restriction.fast_spinning',
  'restriction.food','restriction.loud_sound','restriction.messy_texture','restriction.movement',
  'restriction.physical_contact','restriction.small_objects','restriction.specific_fear','restriction.water',
] as const;

export type MetadataReviewStatus = (typeof METADATA_REVIEW_STATUSES)[number];
export type MetadataConfidence = (typeof METADATA_CONFIDENCE_LEVELS)[number];
export const PREREQUISITE_REVIEW_STATES = ['no_prerequisite_deterministic','candidate_needs_confirmation','confirmed','rejected','ambiguous'] as const;
export const METADATA_REVIEW_TIERS = ['quick_confirmation','focused_review','detailed_review','content_dependent'] as const;
export type PrerequisiteReviewState = (typeof PREREQUISITE_REVIEW_STATES)[number];
export type MetadataReviewTier = (typeof METADATA_REVIEW_TIERS)[number];
