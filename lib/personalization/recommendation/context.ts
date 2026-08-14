import { supabase } from '../../supabase';
import { buildChildPersonalizationProfile } from '../buildChildProfile';
import type { PersonalizedRecommendationContext, ShadowHistoryItem } from './types';

const HISTORY_LIMIT = 20;

function toHistoryItem(row: Record<string, unknown>): ShadowHistoryItem {
  return {
    instanceId: String(row.id || ''),
    libraryLessonId: typeof row.library_lesson_id === 'string' ? row.library_lesson_id : null,
    source: String(row.source || 'unknown'),
    status: String(row.status || 'unknown'),
    skillArea: typeof row.skill_area === 'string' ? row.skill_area : null,
    stageNumber: typeof row.stage_number === 'number' ? row.stage_number : null,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
  };
}

export async function buildPersonalizedRecommendationContext(
  childId: string
): Promise<PersonalizedRecommendationContext> {
  const builtProfile = await buildChildPersonalizationProfile(childId);
  // Shadow diagnostics need normalized flags, never caregiver free text.
  const profile = {
    ...builtProfile,
    priorities: { ...builtProfile.priorities, parentGoalNotes: null },
    restrictions: { ...builtProfile.restrictions, notes: null },
  };
  const [instancesResult, logsResult] = await Promise.all([
    supabase
      .from('daily_lesson_instances')
      .select('id,library_lesson_id,source,status,skill_area,stage_number,completed_at,created_at')
      .eq('child_id', childId)
      .in('status', ['completed', 'unsuccessful'])
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from('lesson_logs')
      .select('category,lesson_name,status,performance_score,prompt_level,behavior_response,consistency_level,completed_at')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);

  if (instancesResult.error) throw instancesResult.error;
  if (logsResult.error) throw logsResult.error;

  const history = (instancesResult.data || []).map((row) => toHistoryItem(row));

  return {
    schemaVersion: profile.schemaVersion,
    builtAt: new Date().toISOString(),
    profile,
    history: {
      recentCuratedCompletions: history.filter(
        (item) => item.source === 'library' && item.status === 'completed'
      ),
      recentAiCompletions: history.filter(
        (item) => item.source !== 'library' && item.status === 'completed'
      ),
      recentUnsuccessfulAttempts: history.filter(
        (item) => item.status === 'unsuccessful'
      ),
      recentLessonObservations: (logsResult.data || []).map((row) => ({
        category: row.category,
        lessonName: row.lesson_name,
        status: String(row.status || 'unknown'),
        performanceScore:
          typeof row.performance_score === 'number' ? row.performance_score : null,
        promptLevel: row.prompt_level,
        behaviorResponse: row.behavior_response,
        consistencyLevel: row.consistency_level,
        completedAt: row.completed_at,
      })),
    },
    assessmentTimestamps: {
      initial: profile.source.assessmentCompletedAt,
      reassessment: profile.source.reassessmentCompletedAt,
    },
  };
}
