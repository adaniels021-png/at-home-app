import type { ChildPersonalizationProfile } from '../types';
import type {
  FilterDecision,
  PersonalizedRecommendationContext,
  ShadowLessonCandidate,
  ShadowRecommendationOptions,
} from './types';

const normalize = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase();

function decision(filter: string, accepted: boolean, reason: string): FilterDecision {
  return { filter, accepted, reason };
}

export function filterByEntitlement(
  candidate: ShadowLessonCandidate,
  options: ShadowRecommendationOptions
) {
  const accepted = options.isPro || !candidate.lesson.pro_only;
  return decision('entitlement', accepted, accepted ? 'Entitlement permits lesson.' : 'Pro lesson for Free profile.');
}

export function filterByActive(candidate: ShadowLessonCandidate) {
  return decision('active', candidate.lesson.is_active, candidate.lesson.is_active ? 'Lesson is active.' : 'Lesson is inactive.');
}

export function filterByApproval(candidate: ShadowLessonCandidate) {
  const accepted = candidate.lesson.quality_status === 'approved';
  return decision('approval', accepted, accepted ? 'Lesson is approved.' : 'Lesson is not approved.');
}

export function filterByCategory(
  candidate: ShadowLessonCandidate,
  options: ShadowRecommendationOptions
) {
  const accepted = normalize(candidate.lesson.category) === normalize(options.category);
  return decision('category', accepted, accepted ? 'Category matches.' : 'Category does not match.');
}

export function filterBySkill(
  candidate: ShadowLessonCandidate,
  options: ShadowRecommendationOptions
) {
  if (!options.skillArea) return decision('skill', true, 'No skill constraint supplied.');
  const accepted = normalize(candidate.lesson.skill_area) === normalize(options.skillArea);
  return decision('skill', accepted, accepted ? 'Skill area matches.' : 'Skill area does not match.');
}

export function filterByStage(
  candidate: ShadowLessonCandidate,
  options: ShadowRecommendationOptions
) {
  if (!options.stageNumber) return decision('stage', true, 'No stage constraint supplied.');
  const accepted = candidate.lesson.stage_number === options.stageNumber;
  return decision('stage', accepted, accepted ? 'Stage matches.' : 'Stage does not match.');
}

export function filterByCommunication(
  candidate: ShadowLessonCandidate,
  profile: ChildPersonalizationProfile
) {
  if (!profile.communication.modes.length) {
    return decision('communication', true, 'Communication mode is unknown; no exclusion applied.');
  }
  if (!candidate.metadata.supportedResponseModes.length) {
    return decision('communication', true, 'Communication metadata missing; diagnostic pass-through.');
  }
  const accepted = profile.communication.modes.some((mode) =>
    candidate.metadata.supportedResponseModes.includes(mode)
  );
  return decision('communication', accepted, accepted ? 'Supports a child communication mode.' : 'No compatible response mode.');
}

export function filterByRestrictions(
  candidate: ShadowLessonCandidate,
  profile: ChildPersonalizationProfile
) {
  const conflicts = profile.restrictions.tags.filter((tag) =>
    candidate.metadata.contraindicationTags.includes(tag)
  );
  return decision('restrictions', conflicts.length === 0, conflicts.length ? `Contraindication: ${conflicts.join(', ')}.` : 'No reviewed contraindication conflict.');
}

export function filterByNeeds(
  candidate: ShadowLessonCandidate,
  profile: ChildPersonalizationProfile
) {
  const needs = new Set([
    ...profile.priorities.needTags,
    ...profile.regulation.currentNeeds,
    ...profile.social.currentNeeds,
    ...profile.safety.currentNeeds,
  ]);
  const matches = candidate.metadata.assessmentNeedTags.filter((tag) => needs.has(tag));
  return decision('needs', true, matches.length ? `Priority match: ${matches.join(', ')}.` : 'No explicit need match; retained to avoid over-filtering.');
}

export function filterByParentGoals(
  candidate: ShadowLessonCandidate,
  profile: ChildPersonalizationProfile
) {
  const goals = new Set([...profile.priorities.primary, ...profile.priorities.parentGoals]);
  const matches = candidate.metadata.assessmentNeedTags.filter((tag) =>
    [...goals].some((goal) => tag === goal || tag.startsWith(`${goal}.`))
  );
  return decision('parent_goals', true, matches.length ? `Parent-goal alignment: ${matches.join(', ')}.` : 'No direct parent-goal mapping; retained.');
}

export function filterByWeakSkills(
  candidate: ShadowLessonCandidate,
  profile: ChildPersonalizationProfile
) {
  const codes = [candidate.metadata.targetSkillCode, candidate.metadata.masteryGroup]
    .filter((value): value is string => Boolean(value));
  const matches = codes.filter((code) => profile.lessonState.weakSkillCodes.includes(code));
  return decision('weak_skills', true, matches.length ? `Weak-skill alignment: ${matches.join(', ')}.` : 'Not identified as weak; retained.');
}

export function filterByPrerequisites(
  candidate: ShadowLessonCandidate,
  profile: ChildPersonalizationProfile
) {
  const missing = candidate.metadata.prerequisiteSkillCodes.filter(
    (code) => !profile.lessonState.masteredSkillCodes.includes(code)
  );
  if (candidate.metadata.status !== 'reviewed') {
    return decision('prerequisites', true, missing.length ? `Unreviewed prerequisite candidates: ${missing.join(', ')}.` : 'No unmet candidate prerequisite.');
  }
  return decision('prerequisites', missing.length === 0, missing.length ? `Unmet prerequisite: ${missing.join(', ')}.` : 'Prerequisites satisfied.');
}

export function filterByMastery(
  candidate: ShadowLessonCandidate,
  profile: ChildPersonalizationProfile
) {
  const code = candidate.metadata.masteryGroup || candidate.metadata.targetSkillCode;
  const accepted = !code || !profile.lessonState.masteredSkillCodes.includes(code);
  return decision('mastery', accepted, accepted ? 'Target is not mastered.' : 'Mastery group is already mastered.');
}

export function filterByRecentHistory(
  candidate: ShadowLessonCandidate,
  context: PersonalizedRecommendationContext
) {
  const recent = context.profile.lessonState.recentlyCompletedLessonIds.includes(candidate.lesson.id);
  return decision('recent_history', !recent, recent ? 'Lesson was recently completed.' : 'Lesson is not a recent completion.');
}

export const filterByVariety = filterByRecentHistory;
