import { normalizeActivities } from './activities';
import { ActivityCategory } from './activityCategories';
import { supabase } from './supabase';

export type ActivityLibraryFilter = ActivityCategory | 'surprise';

  
export async function getRecommendedActivitiesFromLibrary({
  filter = 'surprise',
  count = 3,
  excludeTitles = [],
}: {
  filter?: ActivityLibraryFilter | string;
  count?: number;
  excludeTitles?: string[];
}) {
  let query = supabase
    .from('activity_library')
    .select('*')
    .eq('status', 'approved')
    .order('title', { ascending: true });

  if (count < 100) {
    query = query.limit(count * 3);
  }

  if (filter && filter !== 'surprise') {
    query = query.ilike('category', String(filter).toLowerCase());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Activity library load error:', error);
    return [];
  }

  const excluded = excludeTitles.map((title) => title.toLowerCase().trim());

  const filtered = (data || []).filter((activity: any) => {
    const title = String(activity.title || '').toLowerCase().trim();
    return title && (count >= 100 || !excluded.includes(title));
  });

  const selected = count >= 100
    ? filtered
    : filtered.sort(() => Math.random() - 0.5).slice(0, count);

  return normalizeActivities(
    selected.map((activity: any) => ({
      id: activity.id,
      name: activity.title,
      title: activity.title,
      category: String(activity.category || 'surprise').toLowerCase(),
      location: activity.location,
      time: activity.time,
      description: activity.description,
      try_this: activity.try_this || [],
      why_it_helps: activity.why_it_helps,
      materials: activity.materials || [],
      instructions: activity.try_this || [],
      success_criteria: activity.why_it_helps || '',
      source: 'library',
      library_activity_id: activity.id,
      pro_only: activity.pro_only !== false,
    }))
  );
}
