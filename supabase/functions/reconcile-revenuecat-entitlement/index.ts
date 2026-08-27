// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fetchRevenueCatSnapshot,
  RevenueCatLookupError,
} from '../_shared/revenuecat-subscriber.ts';
import { shouldUseCachedEntitlement } from '../_shared/entitlement-reconciliation.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const evidence = (result: string, code?: string, upstreamStatus?: number) =>
  console.info(
    JSON.stringify({
      component: 'reconcile-revenuecat-entitlement',
      result,
      ...(code ? { code } : {}),
      ...(upstreamStatus ? { upstreamStatus } : {}),
    })
  );

if (import.meta.main)
  Deno.serve(async (req) => {
    if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const revenueCatSecret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    const revenueCatProjectId = Deno.env.get('REVENUECAT_PROJECT_ID');
    const entitlementId = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') || 'pro';

    if (
      !url ||
      !anon ||
      !service ||
      !revenueCatSecret ||
      !revenueCatProjectId
    ) {
      evidence('SERVER_CONFIGURATION');
      return json({ error: 'SERVER_CONFIGURATION' }, 500);
    }

    const authorization = req.headers.get('authorization');
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    const accessToken = match?.[1];

    if (!accessToken) {
      evidence('UNAUTHENTICATED');
      return json({ error: 'UNAUTHENTICATED' }, 401);
    }

    // Verify the exact bearer token supplied by the caller. Passing it explicitly
    // avoids relying on the server client to infer an Auth session from a global
    // header while retaining both platform JWT verification and Auth verification.
    const authClient = createClient(url, anon, { auth: { persistSession: false } });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      evidence('UNAUTHENTICATED');
      return json({ error: 'UNAUTHENTICATED' }, 401);
    }

    let force = false;
    try {
      const body = await req.json();
      force = body?.force === true;
    } catch {
      // Bodyless callers retain the normal cached reconciliation behavior.
    }

    const db = createClient(url, service, { auth: { persistSession: false } });

    try {
      const { data: current, error: currentError } = await db
        .from('revenuecat_entitlement_state')
        .select('last_synced_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (currentError) throw currentError;

      if (shouldUseCachedEntitlement(current?.last_synced_at, force)) {
        evidence('FRESH');
        return json({ reconciled: true, result: 'FRESH' });
      }

      const snapshot = await fetchRevenueCatSnapshot(
        user.id,
        entitlementId,
        revenueCatSecret,
        revenueCatProjectId
      );
      const { data: result, error } = await db.rpc(
        'reconcile_revenuecat_entitlement_snapshot',
        snapshot.rpc
      );

      if (error || !['APPLIED', 'UNCHANGED'].includes(String(result))) {
        throw error ?? new Error('Unexpected reconciliation result');
      }

      evidence(String(result), force ? 'FORCED' : undefined);
      return json({ reconciled: true, result });
    } catch (error) {
      if (error instanceof RevenueCatLookupError) {
        evidence('UPSTREAM_FAILURE', error.code, error.status);
        return json(
          {
            error: 'RECONCILIATION_FAILED',
            code: error.code,
          },
          error.status === 404 ? 404 : 503
        );
      }

      evidence('DATABASE_OR_INTERNAL_FAILURE');
      return json(
        {
          error: 'RECONCILIATION_FAILED',
          code: 'DATABASE_OR_INTERNAL_FAILURE',
        },
        503
      );
    }
  });
