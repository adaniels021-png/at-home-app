import { supabase } from './supabase';

export type ParentWinCategory =
  | 'Communication Win'
  | 'Routine Win'
  | 'Sensory Win'
  | 'Hard Day Win'
  | 'Self-Care Win'
  | 'Tiny Progress';

export type ParentWinPost = {
  id: string;
  user_id: string;
  category: ParentWinCategory;
  content: string;
  display_name: string | null;
  caregiver_role: string | null;
  child_age_range: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'removed' | 'expired';
  report_count: number;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PARENT_WIN_CATEGORIES: ParentWinCategory[] = [
  'Communication Win',
  'Routine Win',
  'Sensory Win',
  'Hard Day Win',
  'Self-Care Win',
  'Tiny Progress',
];

export const POSITIVE_REACTIONS = [
  '❤️ Proud',
  '🥹 Emotional',
  '👏 Big Win',
  '💜 Support',
  '🌟 Inspiring',
] as const;

export const DAILY_PARENT_WIN_PROMPTS = [
  'What small win happened today?',
  'What made today 1% easier?',
  'What communication moment mattered today?',
  'What helped your child regulate today?',
  'What routine went better than expected?',
  'What is something you handled better than before?',
  'What would you tell another overwhelmed parent today?',
  'What tiny progress deserves credit today?',
  'What helped you stay calm today?',
  'What made you proud today?',
  'What did your child try today, even if it was hard?',
  'What moment reminded you that progress is happening?',
  'What is one thing your child did more independently today?',
  'What made you smile as a caregiver today?',
  'What transition went a little smoother today?',
  'What activity held your child’s attention today?',
  'What was one peaceful moment from today?',
  'What helped your child feel understood today?',
  'What is one thing that felt less stressful than before?',
  'What routine step improved this week?',
  'What communication attempt are you proud of?',
  'What sensory support helped today?',
  'What did your child tolerate better than before?',
  'What is one brave thing your child did today?',
  'What did you do today that supported your child well?',
  'What win would you want another parent to celebrate with you?',
  'What made your home feel calmer today?',
  'What lesson, worksheet, or activity went better than expected?',
  'What is one thing your child requested, showed, or expressed today?',
  'What small moment gave you hope today?',
  'What is one thing your child practiced today?',
  'What part of the day went better than usual?',
  'What coping skill helped your child today?',
  'What is one success from your morning or bedtime routine?',
  'What made you feel proud of yourself as a caregiver?',
];

export function getTodayParentWinPrompt() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Number(new Date()) - Number(start);
  const dayOfYear = Math.floor(diff / 86400000);

  return DAILY_PARENT_WIN_PROMPTS[
    dayOfYear % DAILY_PARENT_WIN_PROMPTS.length
  ];
}

function getExpirationDate(days = 5) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function cleanPostContent(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getFirstNameOrInitialName(value?: string | null) {
  if (!value) return 'Anonymous Parent';

  const cleaned = value.trim();

  if (!cleaned) return 'Anonymous Parent';

  const parts = cleaned.split(/\s+/);

  if (parts.length === 1) return parts[0];

  return `${parts[0]} ${parts[1][0]}.`;
}

async function getParentWinProfileSnapshot(userId: string) {
  let displayName = 'Anonymous Parent';
  let caregiverRole = 'Caregiver';
  let childAgeRange: string | null = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, caregiver_name, relationship_to_child')
    .eq('id', userId)
    .maybeSingle();

  displayName = getFirstNameOrInitialName(
    profile?.caregiver_name ||
      profile?.full_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0]
  );

  caregiverRole =
  profile?.relationship_to_child ||
  user?.user_metadata?.relationship_to_child ||
  'Caregiver';

  const { data: child } = await supabase
    .from('children')
    .select('age, child_age, caregiver_relationship')
    .eq('parent_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (child) {
    caregiverRole =
    profile?.relationship_to_child ||
    user?.user_metadata?.relationship_to_child ||
    'Caregiver';

    const ageValue = child.age || child.child_age;

    if (ageValue) {
      childAgeRange = `${ageValue}-year-old`;
    }
  }

  return {
    display_name: displayName,
    caregiver_role: caregiverRole,
    child_age_range: childAgeRange,
  };
}

export function validateParentWinContent(content: string): {
  valid: boolean;
  message?: string;
} {
  const cleaned = cleanPostContent(content);

  if (cleaned.length < 10) {
    return {
      valid: false,
      message: 'Please write a little more before submitting your win.',
    };
  }

  if (cleaned.length > 500) {
    return {
      valid: false,
      message: 'Please keep your win under 500 characters.',
    };
  }

  const blockedWords = [
    'kill',
    'suicide',
    'self harm',
    'abuse',
    'vaccine',
    'cure autism',
    'bleach',
    'miracle cure',
  ];

  const lower = cleaned.toLowerCase();

  const hasBlockedWord = blockedWords.some((word) => lower.includes(word));

  if (hasBlockedWord) {
    return {
      valid: false,
      message:
        'This post may include sensitive or unsafe content. Please keep Parent Wins positive, safe, and non-medical.',
    };
  }

  return { valid: true };
}

export async function submitParentWinPost({
  category = 'Tiny Progress',
  content,
}: {
  category?: ParentWinCategory;
  content: string;
}) {
  const validation = validateParentWinContent(content);

  if (!validation.valid) {
    throw new Error(validation.message || 'Please edit your post.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error('You must be logged in to submit a Parent Win.');
  }

  const profileSnapshot = await getParentWinProfileSnapshot(user.id);

  const { data, error } = await supabase
    .from('parent_win_posts')
    .insert({
      user_id: user.id,
      category,
      content: cleanPostContent(content),
      display_name: profileSnapshot.display_name,
      caregiver_role: profileSnapshot.caregiver_role,
      child_age_range: profileSnapshot.child_age_range,
      status: 'pending',
      expires_at: getExpirationDate(5),
    })
    .select()
    .single();

  if (error) throw error;

  return data as ParentWinPost;
}

export async function getApprovedParentWins() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return [];

  const { data: hidden } = await supabase
    .from('parent_win_hidden_posts')
    .select('post_id')
    .eq('user_id', user.id);

  const hiddenIds = new Set((hidden || []).map((item) => item.post_id));

  const { data, error } = await supabase
    .from('parent_win_posts')
    .select('*')
    .eq('status', 'approved')
    .gt('expires_at', new Date().toISOString())
    .order('approved_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data || []) as ParentWinPost[]).filter(
    (post) => !hiddenIds.has(post.id)
  );
}

export async function getPendingParentWins() {
  const isAdmin = await isCurrentUserParentWinsAdmin();

  if (!isAdmin) {
    throw new Error('Admin access required.');
  }

  const { data, error } = await supabase
    .from('parent_win_posts')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []) as ParentWinPost[];
}

export async function approveParentWinPost(postId: string) {
  const isAdmin = await isCurrentUserParentWinsAdmin();

  if (!isAdmin) {
    throw new Error('Admin access required.');
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('parent_win_posts')
    .update({
      status: 'approved',
      approved_at: now,
      expires_at: getExpirationDate(5),
      updated_at: now,
    })
    .eq('id', postId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function rejectParentWinPost(postId: string) {
  const isAdmin = await isCurrentUserParentWinsAdmin();

  if (!isAdmin) {
    throw new Error('Admin access required.');
  }

  const { error } = await supabase
    .from('parent_win_posts')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function hideParentWinPost(postId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) throw new Error('You must be logged in.');

  const { error } = await supabase
    .from('parent_win_hidden_posts')
    .insert({
      post_id: postId,
      user_id: user.id,
    });

  if (error) throw error;
}

export async function reportParentWinPost({
  postId,
  reason,
  details,
}: {
  postId: string;
  reason: string;
  details?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) throw new Error('You must be logged in.');

  const { error: reportError } = await supabase
    .from('parent_win_reports')
    .insert({
      post_id: postId,
      user_id: user.id,
      reason,
      details: details || null,
    });

  if (reportError) throw reportError;

  const { data: post } = await supabase
    .from('parent_win_posts')
    .select('report_count')
    .eq('id', postId)
    .single();

  const nextReportCount = Number(post?.report_count || 0) + 1;

  const { error: updateError } = await supabase
    .from('parent_win_posts')
    .update({
      report_count: nextReportCount,
      ...(nextReportCount >= 3 ? { status: 'removed' } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (updateError) throw updateError;
}

export async function reactToParentWinPost({
  postId,
  reactionType,
}: {
  postId: string;
  reactionType: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) throw new Error('You must be logged in.');

  const { error } = await supabase
    .from('parent_win_reactions')
    .upsert(
      {
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType,
      },
      {
        onConflict: 'post_id,user_id,reaction_type',
      }
    );

  if (error) throw error;
}

export async function isCurrentUserParentWinsAdmin(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return false;

  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.log('Admin check error:', error);
    return false;
  }

  return !!data;
}

export async function getReactionCounts(postIds: string[]) {
  if (postIds.length === 0) return {};

  const { data, error } = await supabase
    .from('parent_win_reactions')
    .select('post_id, reaction_type')
    .in('post_id', postIds);

  if (error) throw error;

  const counts: Record<string, Record<string, number>> = {};

  (data || []).forEach((reaction) => {
    if (!counts[reaction.post_id]) counts[reaction.post_id] = {};

    counts[reaction.post_id][reaction.reaction_type] =
      (counts[reaction.post_id][reaction.reaction_type] || 0) + 1;
  });

  return counts;
}