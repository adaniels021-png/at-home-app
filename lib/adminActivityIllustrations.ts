import { supabase } from './supabase';

export type IllustrationSummary = {
  id: string;
  version: number;
  status: 'generating' | 'draft' | 'approved' | 'failed' | 'rejected' | 'superseded';
  approved_public_url?: string | null;
  source_content_hash: string;
  created_at?: string | null;
  generated_at?: string | null;
  reviewed_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
};

export type AdminIllustrationState = {
  activity_id: string;
  current_source_content_hash: string;
  artwork_may_be_outdated: boolean;
  approved: IllustrationSummary | null;
  candidate: IllustrationSummary | null;
};

function idempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export async function getAdminIllustrationState(activityId: string) {
  const { data, error } = await supabase.rpc('get_admin_activity_illustration_state', {
    target_activity_id: activityId,
  });
  if (error) throw error;
  return data as AdminIllustrationState;
}

export async function generateActivityIllustration(
  activityId: string,
  reason: 'missing' | 'regenerate',
  expectedApprovedId: string | null,
) {
  const { data, error } = await supabase.functions.invoke('generate-activity-illustration', {
    body: {
      activity_id: activityId,
      generation_reason: reason,
      idempotency_key: idempotencyKey(),
      expected_approved_illustration_id: expectedApprovedId,
    },
  });
  if (error) throw error;
  return data;
}

export async function getActivityIllustrationPreview(illustrationId: string) {
  const { data, error } = await supabase.functions.invoke(
    'get-activity-illustration-preview',
    { body: { illustration_id: illustrationId } },
  );
  if (error) throw error;
  return data as { signed_url: string; expires_in: number };
}

export async function approveActivityIllustration(
  illustrationId: string,
  expectedApprovedId: string | null,
) {
  const { data, error } = await supabase.functions.invoke('approve-activity-illustration', {
    body: {
      illustration_id: illustrationId,
      expected_approved_illustration_id: expectedApprovedId,
    },
  });
  if (error) throw error;
  return data;
}

export async function rejectActivityIllustration(illustrationId: string) {
  const { data, error } = await supabase.rpc('reject_activity_illustration', {
    target_illustration_id: illustrationId,
    target_rejection_reason: 'Rejected during admin illustration review.',
  });
  if (error) throw error;
  return data;
}
