import { supabase } from '../supabase';
import { RECENT_COMPLETED_LESSON_LIMIT } from './codes';
import { normalizeLegacyChildProfile } from './normalizeLegacyProfile';
import type { ChildPersonalizationProfile } from './types';

export async function buildChildPersonalizationProfile(
  childId: string
): Promise<ChildPersonalizationProfile> {
  if (!childId.trim()) throw new Error('A child ID is required.');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) throw new Error('User not authenticated.');

  // This access check deliberately relies on the existing children RLS contract.
  // No service-role client is used, so inaccessible children return no row.
  const { data: child, error: childError } = await supabase
    .from('children')
    .select(
      'id,age,parent_goals,parent_goal_notes,onboarding_parent_goals_completed_at,updated_at'
    )
    .eq('id', childId)
    .maybeSingle();

  if (childError) throw childError;
  if (!child) throw new Error('Child profile not found or access denied.');

  const [assessmentResult, reassessmentResult, masteryResult, historyResult] =
    await Promise.all([
      supabase
        .from('assessments')
        .select('id,responses,completed_at,created_at')
        .eq('child_id', childId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('reassessments')
        .select('id,responses,created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('skill_mastery')
        .select('skill_target,mastery_status,average_score,attempts,successful_attempts')
        .eq('child_id', childId),
      supabase
        .from('daily_lesson_instances')
        .select('library_lesson_id,skill_area,stage_number,completed_at')
        .eq('child_id', childId)
        .eq('source', 'library')
        .eq('status', 'completed')
        .not('library_lesson_id', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(RECENT_COMPLETED_LESSON_LIMIT),
    ]);

  const firstError = [
    assessmentResult.error,
    reassessmentResult.error,
    masteryResult.error,
    historyResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  return normalizeLegacyChildProfile({
    childId,
    child,
    assessment: assessmentResult.data,
    reassessment: reassessmentResult.data,
    masteryRows: masteryResult.data,
    completedLessonRows: historyResult.data,
  });
}
