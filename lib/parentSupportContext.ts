import { supabase } from './supabase';

export async function buildParentSupportContext({
  childId,
}: {
  childId: string;
}) {
  try {
    const [
      profileRes,
      assessmentRes,
      lessonLogsRes,
      masteryRes,
    ] = await Promise.all([
      supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .maybeSingle(),

      supabase
        .from('assessments')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('lesson_logs')
        .select('*')
        .eq('child_id', childId)
        .order('completed_at', { ascending: false })
        .limit(15),

      supabase
        .from('skill_mastery')
        .select('*')
        .eq('child_id', childId)
        .limit(20),
    ]);

    const profile = profileRes.data;
    const assessment = assessmentRes.data;
    const lessonLogs = lessonLogsRes.data || [];
    const mastery = masteryRes.data || [];

    const weakSkills = mastery
      .filter(
        (s) =>
          s.mastery_status === 'emerging' ||
          s.average_score < 60
      )
      .map((s) => s.skill_target)
      .slice(0, 8);

    const strongSkills = mastery
      .filter((s) => s.mastery_status === 'mastered')
      .map((s) => s.skill_target)
      .slice(0, 8);

    const recentChallenges = lessonLogs
      .filter((l) => l.performance_score < 70)
      .map((l) => l.lesson_name)
      .slice(0, 6);

    return {
      childName:
        profile?.child_name ||
        profile?.name ||
        'Child',

      age:
        profile?.age ||
        profile?.child_age ||
        null,

      diagnosis:
        profile?.diagnosis ||
        'Autism Spectrum Disorder',

      communicationLevel:
        assessment?.communication_level ||
        'mixed communication abilities',

      sensoryNeeds:
        assessment?.sensory_needs ||
        [],

      weakSkills,

      strongSkills,

      recentChallenges,

      recentLessonCount: lessonLogs.length,
    };
  } catch (error) {
    console.error(
      'buildParentSupportContext error:',
      error
    );

    return null;
  }
}