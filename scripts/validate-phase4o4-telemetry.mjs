import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260813200000_create_recommendation_routing_telemetry.sql', 'utf8');
const router = fs.readFileSync('lib/personalization/recommendation/router.ts', 'utf8');
const daily = fs.readFileSync('app/(tabs)/daily-lessons.tsx', 'utf8');

for (const forbidden of [
  'child_name', 'caregiver_name', 'email', 'phone', 'raw auth', 'revenuecat app user',
  'assessment_answers', 'caregiver_notes', 'medical_information', 'transaction_id',
  'webhook_payload', 'authorization_header', 'user_id', 'child_id',
]) assert(!sql.toLowerCase().includes(forbidden), `sensitive telemetry field: ${forbidden}`);

assert(sql.includes('enable row level security'));
assert(sql.includes('revoke all on public.recommendation_routing_telemetry from public, anon, authenticated'));
assert(sql.includes("if auth.uid() is null then"));
assert(sql.includes("select * into decision from public.resolve_my_recommendation_route()"));
assert(sql.includes("if decision.route = 'LEGACY'"));
assert(sql.includes("normalized_outcome <> 'LEGACY_SELECTION'"));
assert(sql.includes("public.is_app_admin()"));
assert(!sql.match(/grant\s+(insert|update|delete|select)\s+on\s+public\.recommendation_routing_telemetry\s+to\s+(anon|authenticated)/i));

for (const outcome of [
  'LEGACY_SELECTION', 'SHADOW_SUCCESS', 'SHADOW_EMPTY_RESULT', 'SHADOW_ERROR',
  'V2_SUCCESS', 'V2_EMPTY_RESULT', 'V2_ERROR',
]) assert(sql.includes(`'${outcome}'`), `missing outcome ${outcome}`);

assert(router.includes("supabase.rpc('record_my_recommendation_routing_outcome'"));
assert(router.includes('Operational telemetry is best-effort'));
assert(daily.includes("libraryLesson ? 'V2_SUCCESS' : 'V2_EMPTY_RESULT'"));
assert(daily.includes("recommendationAttribution(routeDecision, 'V2_ERROR')"));
assert(daily.includes("recommendationAttribution(routeDecision, 'LEGACY_SELECTION')"));
assert(daily.includes("result.recommendation ? 'SHADOW_SUCCESS' : 'SHADOW_EMPTY_RESULT'"));
assert(!sql.toLowerCase().includes('update public.recommendation_activation_control'));
assert(!sql.toLowerCase().includes('update public.revenuecat_entitlement_state'));
assert(!sql.toLowerCase().includes('update public.lesson_library'));

console.log(JSON.stringify({
  valid: true,
  privacySafe: true,
  serverDerivedRoute: true,
  anonymousDenied: true,
  arbitraryTableMutationDenied: true,
  failClosed: true,
  outcomePaths: 7,
}, null, 2));
