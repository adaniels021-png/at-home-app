import { generateJsonWithEdgeFunction } from './edgeAI';
import { buildFallbackActivities } from './fallbacks';
import { normalizeActivities } from './normalizers';
import { buildActivityPrompt } from './prompts';

export type DailyABAActivity = {
  name: string;
  title: string;
  category: string;
  location: string;
  time: string;
  description: string;
  try_this: string[];
  why_it_helps: string;
};

export async function generateDailyABAActivities({
  childName,
  location = 'Home, outdoor, or community',
  skillFocus = 'Fun family activities that naturally support development',
  assessmentContext = {},
  recentLessons = [],
  recentRoutines = [],
  count = 3,
}: {
  childName: string;
  location?: string;
  skillFocus?: string;
  assessmentContext?: any;
  recentLessons?: any[];
  recentRoutines?: any[];
  count?: number;
}): Promise<DailyABAActivity[]> {
  const fallback = buildFallbackActivities(childName, count);

  try {
    const prompt = buildActivityPrompt({
  childName,
  location,
  skillFocus,
  count,
});


    const raw = await generateJsonWithEdgeFunction<any[]>(
      prompt,
      fallback,
      'activities'
    );

   const activities = normalizeActivities(
  raw,
  childName,
  count
) as DailyABAActivity[];

if (!activities.length) {
  return fallback;
}

return activities;
  } catch (error) {
    console.error(
      'Activity generation failed:',
      error
    );

    return fallback;
  }
}

/**
 * Future:
 *
 * generateIndoorActivities()
 * generateOutdoorActivities()
 * generateCommunityActivities()
 * generateSensoryActivities()
 * generateWeekendActivities()
 * generateHolidayActivities()
 * generateSeasonalActivities()
 */