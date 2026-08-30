import { contains, excludes, pass, read } from './daily-adventures-validator-utils.mjs';

const context = read('lib/ChildSubscriptionContext.tsx');
const api = read('lib/dailyAdventuresApi.ts');
const sql = read('supabase/migrations/20260830120000_daily_adventures_phase_a_foundation.sql');

contains(context, /requestIdRef/, 'Stale child entitlement request protection is missing');
contains(context, /resolvedChildId === selectedChild\?\.id/, 'Entitlement is not bound to the selected child');
contains(context, /resolve_child_server_entitlement/, 'Authoritative child resolver is not used');
contains(api, /childId: string/, 'Daily Adventures helpers are not child-scoped');
excludes(api, /isPro|entitlementActive|personalIsPro/, 'Client can supply an entitlement decision');
contains(sql, /public\.resolve_child_server_entitlement\(target_child_id\)/, 'Server does not resolve the target child entitlement');

pass('Selected-child entitlement and switching contract');
