export type IllustrationSummary = {
  id: string;
  version: number;
  status: 'generating' | 'draft' | 'approved' | 'failed' | 'rejected' | 'superseded';
  source_type?: 'ai' | 'manual_upload';
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

export function normalizeAdminIllustrationState(
  state: AdminIllustrationState,
): AdminIllustrationState {
  const { approved, candidate } = state;

  if (!candidate || candidate.status === 'generating' || candidate.status === 'draft') {
    return state;
  }

  if (candidate.status === 'failed' && (!approved || candidate.version > approved.version)) {
    return state;
  }

  return { ...state, candidate: null };
}
