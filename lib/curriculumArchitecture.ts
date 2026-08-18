import { z } from 'zod';

export const CURRICULUM_ARCHITECTURE_VERSION = 1 as const;

export const curriculumCategorySchema = z.enum([
  'communication',
  'daily_routines',
  'emotions_behavior',
  'learning_attention',
  'movement_coordination',
  'play_social_skills',
]);

export const mappingStatusSchema = z.enum([
  'mapped',
  'unresolved',
  'retirement',
]);
export const mappingConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const contentDispositionSchema = z.enum([
  'keep_as_is_structurally',
  'keep_content_remap_taxonomy',
  'rewrite_content',
  'differentiate_from_duplicate',
  'retire_duplicate',
  'retire_fallback',
  'approved_retirement',
  'high_scrutiny_review',
  'unresolved_concept',
]);
export const sensitivityLevelSchema = z.enum([
  'standard',
  'high_scrutiny',
]);
export const recommendationEligibilitySchema = z.enum([
  'shadow_candidate',
  'review_required',
  'excluded',
]);
export const difficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
]);
export const supportLevelSchema = z.enum([
  'more_support',
  'balanced_support',
  'less_support',
]);
export const timeOfDayRelevanceSchema = z.enum([
  'morning_priority',
  'evening_priority',
  'context_dependent',
  'time_neutral',
  'unresolved',
]);
export const communicationScopeSchema = z.enum([
  'none',
  'communication_method_inclusive',
  'speech_production_review',
]);
export const feedingScopeSchema = z.enum([
  'none',
  'food_scope_review',
  'consumption_concern_unresolved',
]);

export const curriculumDomainSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  category: curriculumCategorySchema,
  internalName: z.string().min(1),
  parentDisplayName: z.string().min(1),
  definition: z.string().min(1),
  sortOrder: z.number().int().positive(),
  architectureVersion: z.literal(CURRICULUM_ARCHITECTURE_VERSION),
});

export const authoritativeStageSchema = z.object({
  number: z.number().int().min(1).max(5),
  key: z.string().regex(/^s[1-5]_[a-z0-9_]+$/),
  displayName: z.string().min(1),
  definition: z.string().min(1),
  isCore: z.boolean(),
  isGeneralization: z.boolean(),
});

export const specializedSkillSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_.]*$/),
  domainKey: z.string().regex(/^[a-z][a-z0-9_]*$/),
  internalName: z.string().min(1),
  parentDisplayName: z.string().min(1),
  definition: z.string().min(1),
  scopeBoundary: z.string().min(1),
  communicationSafeguard: z.string().nullable(),
  feedingSafeguard: z.string().nullable(),
  sensitivity: sensitivityLevelSchema,
  coreStageCount: z.number().int().min(1).max(4),
  hasOptionalStage5: z.boolean(),
  stages: z.array(authoritativeStageSchema).min(1).max(5),
  architectureVersion: z.literal(CURRICULUM_ARCHITECTURE_VERSION),
});

export const lessonCurriculumMappingSchema = z.object({
  lessonId: z.string().uuid(),
  architectureVersion: z.literal(CURRICULUM_ARCHITECTURE_VERSION),
  domainKey: z.string().nullable(),
  skillKey: z.string().nullable(),
  stageNumber: z.number().int().min(1).max(5).nullable(),
  mappingStatus: mappingStatusSchema,
  mappingConfidence: mappingConfidenceSchema,
  contentDisposition: contentDispositionSchema,
  duplicateGroup: z.string().nullable(),
  ownerDecisionRequired: z.boolean(),
  requiresContentRewrite: z.boolean(),
  requiresTaxonomyChange: z.boolean(),
  sensitivity: sensitivityLevelSchema,
  recommendationEligibility: recommendationEligibilitySchema,
  timeOfDayRelevance: timeOfDayRelevanceSchema,
  communicationScope: communicationScopeSchema,
  feedingScope: feedingScopeSchema,
  legacy: z.object({
    category: z.string(),
    skillArea: z.string(),
    stageNumber: z.number().int().min(1).max(5),
    stageName: z.string(),
    skillId: z.string().uuid().nullable(),
    stageId: z.string().uuid().nullable(),
  }),
  source: z.literal('phase_4a_locked_blueprint'),
  isActivePrimary: z.literal(false),
  notes: z.string(),
});

export const curriculumFixtureSchema = z.object({
  architectureVersion: z.literal(CURRICULUM_ARCHITECTURE_VERSION),
  domains: z.array(curriculumDomainSchema),
  skills: z.array(specializedSkillSchema),
});

export const shadowMappingFixtureSchema = z.object({
  architectureVersion: z.literal(CURRICULUM_ARCHITECTURE_VERSION),
  mappings: z.array(lessonCurriculumMappingSchema),
});

export type CurriculumCategory = z.infer<typeof curriculumCategorySchema>;
export type CurriculumDomain = z.infer<typeof curriculumDomainSchema>;
export type SpecializedSkill = z.infer<typeof specializedSkillSchema>;
export type AuthoritativeStage = z.infer<typeof authoritativeStageSchema>;
export type LessonCurriculumMapping = z.infer<
  typeof lessonCurriculumMappingSchema
>;

export function validateCurriculumFixtures(
  taxonomy: unknown,
  shadowMappings: unknown
) {
  const parsedTaxonomy = curriculumFixtureSchema.parse(taxonomy);
  const parsedMappings = shadowMappingFixtureSchema.parse(shadowMappings);

  const domainKeys = new Set(parsedTaxonomy.domains.map((domain) => domain.key));
  if (domainKeys.size !== parsedTaxonomy.domains.length) {
    throw new Error('Curriculum domain keys must be unique.');
  }

  const skillKeys = new Set(parsedTaxonomy.skills.map((skill) => skill.key));
  if (skillKeys.size !== parsedTaxonomy.skills.length) {
    throw new Error('Specialized skill keys must be unique.');
  }

  for (const skill of parsedTaxonomy.skills) {
    if (!domainKeys.has(skill.domainKey)) {
      throw new Error(`Unknown domain ${skill.domainKey} for skill ${skill.key}.`);
    }
    const numbers = skill.stages.map((stage) => stage.number);
    if (new Set(numbers).size !== numbers.length) {
      throw new Error(`Duplicate stage number for skill ${skill.key}.`);
    }
    if (skill.stages.filter((stage) => stage.isCore).length !== skill.coreStageCount) {
      throw new Error(`Core stage count mismatch for skill ${skill.key}.`);
    }
    const stage5 = skill.stages.find((stage) => stage.number === 5);
    if (Boolean(stage5) !== skill.hasOptionalStage5) {
      throw new Error(`Optional Stage 5 mismatch for skill ${skill.key}.`);
    }
    if (stage5 && (!stage5.isGeneralization || stage5.isCore)) {
      throw new Error(`Stage 5 must be optional generalization for ${skill.key}.`);
    }
  }

  const lessonIds = new Set<string>();
  for (const mapping of parsedMappings.mappings) {
    if (lessonIds.has(mapping.lessonId)) {
      throw new Error(`Duplicate lesson mapping ${mapping.lessonId}.`);
    }
    lessonIds.add(mapping.lessonId);

    if (mapping.mappingStatus === 'mapped') {
      if (!mapping.skillKey || !skillKeys.has(mapping.skillKey)) {
        throw new Error(`Unknown skill for lesson ${mapping.lessonId}.`);
      }
      const skill = parsedTaxonomy.skills.find((item) => item.key === mapping.skillKey)!;
      if (mapping.domainKey !== skill.domainKey) {
        throw new Error(`Domain/skill mismatch for lesson ${mapping.lessonId}.`);
      }
      if (!skill.stages.some((stage) => stage.number === mapping.stageNumber)) {
        throw new Error(`Invalid stage for lesson ${mapping.lessonId}.`);
      }
    }

    const mustBeExcluded =
      mapping.mappingStatus !== 'mapped' ||
      mapping.contentDisposition.startsWith('retire_') ||
      mapping.contentDisposition === 'approved_retirement' ||
      mapping.contentDisposition === 'unresolved_concept';
    if (mustBeExcluded && mapping.recommendationEligibility !== 'excluded') {
      throw new Error(`Non-usable lesson ${mapping.lessonId} must be excluded.`);
    }
    if (
      mapping.sensitivity === 'high_scrutiny' &&
      mapping.recommendationEligibility === 'shadow_candidate'
    ) {
      throw new Error(`High-scrutiny lesson ${mapping.lessonId} requires review.`);
    }
  }

  return { taxonomy: parsedTaxonomy, shadowMappings: parsedMappings };
}
