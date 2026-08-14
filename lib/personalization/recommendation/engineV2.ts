import { countMetadataSources, loadShadowLessonCandidates } from './candidates';
import { buildPersonalizedRecommendationContext } from './context';
import { evaluateEligibility } from './eligibility';
import { PHASE4M_SHADOW_ALGORITHM_VERSION, scorePhase4mCandidate } from './scoringV2';
import type { EvaluatedCandidate, ShadowRecommendationOptions } from './types';

export async function getPhase4mRecommendation(childId: string, options: ShadowRecommendationOptions) {
  if (options.forceFailureForTest) throw new Error('forced phase4m failure');
  const [context, candidates] = await Promise.all([
    buildPersonalizedRecommendationContext(childId), loadShadowLessonCandidates(),
  ]);
  const evaluated = candidates.map((candidate) => {
    const decisions = evaluateEligibility(candidate, context, options);
    const exclusions = decisions.filter((decision) => !decision.accepted).map((decision) => decision.filter);
    const scored = scorePhase4mCandidate(candidate, context, options);
    return { ...candidate, eligible: exclusions.length === 0, score: scored.score, rank: null,
      positiveReasons: scored.positive, penalties: scored.penalties, exclusions, decisions,
      rejectedBy: exclusions[0] ?? null } as EvaluatedCandidate;
  });
  const accepted = evaluated.filter((candidate) => candidate.eligible)
    .sort((a,b) => b.score-a.score || a.lesson.id.localeCompare(b.lesson.id));
  accepted.forEach((candidate,index) => { candidate.rank=index+1; });
  return {
    algorithmVersion: PHASE4M_SHADOW_ALGORITHM_VERSION,
    recommendation: accepted[0] ?? null,
    accepted,
    rejected: evaluated.filter((candidate) => !candidate.eligible),
    summary: { evaluated: candidates.length, eligible: accepted.length,
      metadataSources: countMetadataSources(candidates) },
  };
}
