import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type JobStage = 'REQUESTED' | 'RELATIONAL_CLEANUP_COMPLETE' | 'STORAGE_COMPLETE' |
  'REVENUECAT_COMPLETE' | 'AUTH_DELETE_COMPLETE' | 'FAILED_RETRYABLE';
type DeletionJob = { id: string; stage: JobStage; resume_stage: JobStage | null };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const log = (level: 'info' | 'error', event: string,
  fields: Record<string, string | number | boolean | null> = {}) => {
  const entry = JSON.stringify({ component: 'delete-account', event, ...fields });
  (level === 'error' ? console.error : console.info)(entry);
};

serve(async (req) => {
  if (req.method !== 'POST') return json(405, { success: false, code: 'METHOD_NOT_ALLOWED' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  const revenueCatSecret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  const revenueCatProjectId = Deno.env.get('REVENUECAT_PROJECT_ID');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    log('error', 'configuration_missing');
    return json(500, { success: false, code: 'SERVER_CONFIGURATION_ERROR' });
  }

  const authorization = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const userId = authData.user?.id;
  if (authError || !userId) return json(401, { success: false, code: 'AUTH_REQUIRED' });

  let jobId: string | null = null;
  let currentStage: JobStage = 'REQUESTED';
  const processingToken = crypto.randomUUID();
  const fail = async (code: string, resumeStage: JobStage) => {
    if (jobId) {
      await admin.from('account_deletion_jobs').update({
        stage: 'FAILED_RETRYABLE', resume_stage: resumeStage, last_error_code: code,
        processing_token: null, lease_expires_at: null, updated_at: new Date().toISOString(),
      }).eq('id', jobId).eq('user_id', userId).eq('processing_token', processingToken);
    }
    log('error', 'stage_failed', { job_id: jobId, stage: resumeStage, code });
    return json(500, { success: false, code, retryable: true });
  };

  try {
    const { data: prepared, error: prepareError } = await userClient.rpc('prepare_my_account_deletion');
    if (prepareError || !Array.isArray(prepared) || !prepared[0]?.job_id) {
      log('error', 'relational_cleanup_failed', { code: 'RELATIONAL_CLEANUP_FAILED' });
      return json(500, { success: false, code: 'RELATIONAL_CLEANUP_FAILED', retryable: true });
    }
    jobId = prepared[0].job_id;

    const leaseCutoff = new Date().toISOString();
    const leaseExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: leasedJob, error: leaseError } = await admin.from('account_deletion_jobs')
      .update({ processing_token: processingToken, lease_expires_at: leaseExpiry })
      .eq('id', jobId).eq('user_id', userId)
      .or(`lease_expires_at.is.null,lease_expires_at.lt.${leaseCutoff}`)
      .select('id').maybeSingle();
    if (leaseError) return fail('JOB_LEASE_FAILED', 'RELATIONAL_CLEANUP_COMPLETE');
    if (!leasedJob) return json(409, { success: false, code: 'DELETION_IN_PROGRESS', retryable: true });

    const { data: jobData, error: jobError } = await admin.from('account_deletion_jobs')
      .select('id,stage,resume_stage').eq('id', jobId).eq('user_id', userId).single();
    if (jobError || !jobData) return fail('JOB_STATE_UNAVAILABLE', 'REQUESTED');
    const job = jobData as DeletionJob;
    currentStage = job.stage === 'FAILED_RETRYABLE'
      ? (job.resume_stage ?? 'RELATIONAL_CLEANUP_COMPLETE') : job.stage;
    log('info', 'relational_cleanup_complete', { job_id: jobId });

    if (currentStage === 'RELATIONAL_CLEANUP_COMPLETE') {
      const { data: objects, error: manifestError } = await admin
        .from('account_deletion_storage_manifest').select('id,bucket,object_path')
        .eq('deletion_job_id', jobId).eq('state', 'PENDING');
      if (manifestError) return fail('STORAGE_MANIFEST_UNAVAILABLE', currentStage);
      for (const object of objects ?? []) {
        const { error: removeError } = await admin.storage.from(object.bucket).remove([object.object_path]);
        if (removeError) return fail('STORAGE_DELETE_FAILED', currentStage);
        const { error: markError } = await admin.from('account_deletion_storage_manifest')
          .update({ state: 'COMPLETE', completed_at: new Date().toISOString() })
          .eq('id', object.id).eq('deletion_job_id', jobId);
        if (markError) return fail('STORAGE_STATE_UPDATE_FAILED', currentStage);
      }
      const { error: stageError } = await admin.from('account_deletion_jobs')
        .update({ stage: 'STORAGE_COMPLETE', resume_stage: null, updated_at: new Date().toISOString() })
        .eq('id', jobId).eq('user_id', userId).eq('processing_token', processingToken);
      if (stageError) return fail('JOB_STATE_UPDATE_FAILED', currentStage);
      currentStage = 'STORAGE_COMPLETE';
      log('info', 'storage_complete', { job_id: jobId, object_count: objects?.length ?? 0 });
    }

    if (currentStage === 'STORAGE_COMPLETE') {
      if (!revenueCatSecret || !revenueCatProjectId) {
        return fail('REVENUECAT_CONFIGURATION_MISSING', currentStage);
      }
      const url = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(revenueCatProjectId)}` +
        `/customers/${encodeURIComponent(userId)}`;
      const revenueCatResponse = await fetch(url, { method: 'DELETE', headers: {
        accept: 'application/json', authorization: `Bearer ${revenueCatSecret}`,
      }});
      if (![200, 202, 404].includes(revenueCatResponse.status)) {
        return fail('REVENUECAT_DELETE_FAILED', currentStage);
      }
      const { error: stageError } = await admin.from('account_deletion_jobs')
        .update({ stage: 'REVENUECAT_COMPLETE', resume_stage: null, updated_at: new Date().toISOString() })
        .eq('id', jobId).eq('user_id', userId).eq('processing_token', processingToken);
      if (stageError) return fail('JOB_STATE_UPDATE_FAILED', currentStage);
      currentStage = 'REVENUECAT_COMPLETE';
      log('info', 'revenuecat_complete', { job_id: jobId, upstream_status: revenueCatResponse.status });
    }

    if (currentStage === 'REVENUECAT_COMPLETE') {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError && !/not found/i.test(deleteError.message)) return fail('AUTH_DELETE_FAILED', currentStage);
      const timestamp = new Date().toISOString();
      const { error: stageError } = await admin.from('account_deletion_jobs').update({
        stage: 'AUTH_DELETE_COMPLETE', resume_stage: null, last_error_code: null,
        processing_token: null, lease_expires_at: null,
        completed_at: timestamp, updated_at: timestamp,
      }).eq('id', jobId).eq('user_id', userId).eq('processing_token', processingToken);
      if (stageError) log('error', 'completion_state_update_failed', { job_id: jobId });
      log('info', 'account_deletion_complete', { job_id: jobId });
    }
    return json(200, { success: true });
  } catch {
    return fail('UNEXPECTED_DELETE_ACCOUNT_ERROR', currentStage);
  }
});
