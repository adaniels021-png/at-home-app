import type { PersonalizedRecommendationContext, ScoreReason, ShadowLessonCandidate, ShadowRecommendationOptions } from './types';

export const PHASE4M_SHADOW_ALGORITHM_VERSION = 'phase4m-shadow-v2' as const;

export const PHASE4M_SCORE_WEIGHTS = {
  exactCanonicalSkill: 36,
  explicitMultiSkill: 28,
  exactDomain: 18,
  broadDomain: 12,
  requestedSkill: 22,
  readinessExact: 14,
  readinessNearby: 7,
  communication: 12,
  supportExact: 8,
  supportAdjacent: 3,
  time: 6,
  interest: 4,
  recent: -25,
  completed: -12,
} as const;

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
const add = (list: ScoreReason[], code: string, points: number, detail: string) => list.push({ code, points, detail });

function canonicalSpecificity(candidate: ShadowLessonCandidate, context: PersonalizedRecommendationContext) {
  const skill = candidate.curriculum.skillKey;
  const domain = candidate.curriculum.domainKey;
  const provenance = context.profile.canonicalTargets?.provenance ?? [];
  const skillEvidence = skill ? provenance.filter((entry) => entry.skillKeys.includes(skill)) : [];
  const domainEvidence = domain ? provenance.filter((entry) => entry.domainKeys.includes(domain)) : [];

  if (skillEvidence.some((entry) => entry.mappingType === 'EXACT_CANONICAL' && entry.skillKeys.length === 1)) {
    return { code: 'canonical_exact_skill', points: PHASE4M_SCORE_WEIGHTS.exactCanonicalSkill, detail: 'Matches one explicit reviewed canonical specialized-skill target.' };
  }
  if (skillEvidence.length) {
    return { code: 'canonical_multi_skill', points: PHASE4M_SCORE_WEIGHTS.explicitMultiSkill, detail: 'Matches a specialized skill explicitly contained in a reviewed multi-skill target.' };
  }
  if (domainEvidence.some((entry) => entry.mappingType !== 'BROAD_DOMAIN_SIGNAL')) {
    return { code: 'canonical_exact_domain', points: PHASE4M_SCORE_WEIGHTS.exactDomain, detail: 'Matches the domain of a specific reviewed assessment target.' };
  }
  if (domainEvidence.length) {
    return { code: 'canonical_broad_domain', points: PHASE4M_SCORE_WEIGHTS.broadDomain, detail: 'Matches a reviewed broad caregiver domain signal.' };
  }
  return null;
}

function desiredSupport(context: PersonalizedRecommendationContext) {
  const value = context.profile.dailyLiving.overallIndependence;
  if (value === 'high_support' || value === 'not_started') return 'more_support';
  if (value === 'mostly_independent' || value === 'independent') return 'less_support';
  if (value === 'learning') return 'balanced_support';
  return null;
}

function interestMatches(candidate: ShadowLessonCandidate, interest: string) {
  const haystack = [candidate.lesson.title, ...(candidate.metadata.materialActivityTags ?? [])]
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  const keys = [interest, interest.replace(/s$/, '')].filter((key) => key.length >= 3);
  return keys.some((key) => haystack.includes(key));
}

export function scorePhase4mCandidate(candidate: ShadowLessonCandidate, context: PersonalizedRecommendationContext, options: ShadowRecommendationOptions) {
  const positive: ScoreReason[] = [];
  const penalties: ScoreReason[] = [];
  const specificity = canonicalSpecificity(candidate, context);
  if (specificity) add(positive, specificity.code, specificity.points, specificity.detail);

  if (options.skillArea && (norm(candidate.curriculum.skillKey) === norm(options.skillArea) || norm(candidate.metadata.targetSkillCode) === norm(options.skillArea))) {
    add(positive, 'specialized_skill_match', PHASE4M_SCORE_WEIGHTS.requestedSkill, 'Matches the explicitly requested specialized skill.');
  }

  const target = options.stageNumber ?? context.profile.lessonState.currentSkillStages[candidate.curriculum.skillKey ?? ''];
  const stage = candidate.curriculum.stageNumber;
  if (target && stage === target) add(positive, 'readiness_exact', PHASE4M_SCORE_WEIGHTS.readinessExact, 'Matches the current readiness stage.');
  else if (target && stage && Math.abs(target - stage) === 1) add(positive, 'readiness_nearby', PHASE4M_SCORE_WEIGHTS.readinessNearby, 'Within a flexible one-stage readiness band.');

  if (context.profile.communication.modes.some((mode) => candidate.metadata.supportedResponseModes.includes(mode))) {
    add(positive, 'communication_compatible', PHASE4M_SCORE_WEIGHTS.communication, 'Supports an established communication method without preferring speech.');
  }

  const desired = desiredSupport(context);
  const reviewed = candidate.metadata.supportLevel;
  if (desired && reviewed === desired) add(positive, 'support_exact', PHASE4M_SCORE_WEIGHTS.supportExact, 'Reviewed support demand matches the current support context.');
  else if (desired && reviewed === 'balanced_support') add(positive, 'support_adjacent', PHASE4M_SCORE_WEIGHTS.supportAdjacent, 'Reviewed balanced support is a reasonable secondary fit.');

  const period = options.routinePreference ?? ((options.localHour ?? 12) < 12 ? 'morning' : (options.localHour ?? 12) >= 17 ? 'evening' : null);
  if ((period === 'morning' && candidate.curriculum.timeRelevance === 'morning_priority') || (period === 'evening' && candidate.curriculum.timeRelevance === 'evening_priority')) {
    add(positive, 'time_relevance', PHASE4M_SCORE_WEIGHTS.time, 'Routine timing is relevant; time never restricts eligibility.');
  }

  if (context.profile.interests.preferredInterests.some((interest) => interestMatches(candidate, interest))) {
    add(positive, 'interest_match', PHASE4M_SCORE_WEIGHTS.interest, 'Existing lesson title or reviewed activity metadata matches a normalized interest.');
  }

  if (context.profile.lessonState.recentlyShownLessonIds.includes(candidate.lesson.id)) add(penalties, 'recently_shown', PHASE4M_SCORE_WEIGHTS.recent, 'Recently shown; freshness penalty only.');
  else if (context.profile.lessonState.recentlyCompletedLessonIds.includes(candidate.lesson.id)) add(penalties, 'recently_completed', PHASE4M_SCORE_WEIGHTS.completed, 'Recently completed; not treated as mastery.');

  return { score: [...positive, ...penalties].reduce((total, reason) => total + reason.points, 0), positive, penalties };
}
