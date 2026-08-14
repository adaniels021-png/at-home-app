export type ServerEntitlement = 'FREE' | 'TRIAL' | 'PRO' | 'UNKNOWN';
export type RecommendationRoute = 'LEGACY' | 'SHADOW_V2' | 'CONTROLLED_V2' | 'V2';
export type RecommendationRouteDecision = {
  route: RecommendationRoute;
  algorithm: 'legacy' | 'phase4m-shadow-v2';
  entitlement: ServerEntitlement;
  cohortEligible: boolean;
  cohortBucket: number | null;
  reasonCode: string;
  fallbackAllowed: true;
  configVersion: number;
};

export const SAFE_LEGACY_ROUTE: RecommendationRouteDecision = {
  route: 'LEGACY', algorithm: 'legacy', entitlement: 'UNKNOWN', cohortEligible: false,
  cohortBucket: null, reasonCode: 'ROUTER_FAILURE', fallbackAllowed: true, configVersion: 0,
};

export function parseRecommendationRoute(row: unknown): RecommendationRouteDecision {
  const value = row && typeof row === 'object' ? row as Record<string, unknown> : {};
  const route = String(value.route ?? '');
  const entitlement = String(value.entitlement ?? '');
  const algorithm = String(value.algorithm ?? '');
  if (!['LEGACY','SHADOW_V2','CONTROLLED_V2','V2'].includes(route)
      || !['FREE','TRIAL','PRO','UNKNOWN'].includes(entitlement)
      || !['legacy','phase4m-shadow-v2'].includes(algorithm)) return SAFE_LEGACY_ROUTE;
  if (['CONTROLLED_V2','V2'].includes(route) && !['TRIAL','PRO'].includes(entitlement)) return SAFE_LEGACY_ROUTE;
  if (route === 'CONTROLLED_V2' && value.cohort_eligible !== true) return SAFE_LEGACY_ROUTE;
  return {
    route: route as RecommendationRoute,
    algorithm: algorithm as RecommendationRouteDecision['algorithm'],
    entitlement: entitlement as ServerEntitlement,
    cohortEligible: value.cohort_eligible === true,
    cohortBucket: typeof value.cohort_bucket === 'number' ? value.cohort_bucket : null,
    reasonCode: String(value.reason_code || 'CONFIG_INVALID'),
    fallbackAllowed: true,
    configVersion: Number(value.config_version) || 0,
  };
}

export async function resolveServerRecommendationRoute(): Promise<RecommendationRouteDecision> {
  try {
    const { supabase } = await import('../../supabase');
    const { data, error } = await supabase.rpc('resolve_my_recommendation_route');
    if (error) return { ...SAFE_LEGACY_ROUTE, reasonCode: 'ENTITLEMENT_RESOLVER_FAILURE' };
    return parseRecommendationRoute(Array.isArray(data) ? data[0] : data);
  } catch {
    return { ...SAFE_LEGACY_ROUTE, reasonCode: 'ENTITLEMENT_RESOLVER_FAILURE' };
  }
}

export function isParentV2Route(decision: RecommendationRouteDecision) {
  return decision.route === 'CONTROLLED_V2' || decision.route === 'V2';
}

export type RecommendationAttribution = {
  outcome: 'LEGACY_SELECTION'|'SHADOW_SUCCESS'|'SHADOW_EMPTY_RESULT'|'SHADOW_ERROR'|
    'V2_SUCCESS'|'V2_EMPTY_RESULT'|'V2_ERROR';
};

export function recommendationAttribution(
  _decision: RecommendationRouteDecision,
  outcome: RecommendationAttribution['outcome']
): RecommendationAttribution {
  return { outcome };
}

export async function recordRecommendationAttribution(attribution: RecommendationAttribution) {
  console.info('RECOMMENDATION_ROUTE', attribution);
  try {
    const { supabase } = await import('../../supabase');
    await supabase.rpc('record_my_recommendation_routing_outcome', {
      requested_outcome: attribution.outcome,
    });
  } catch {
    // Operational telemetry is best-effort and must never affect recommendation delivery.
  }
}
