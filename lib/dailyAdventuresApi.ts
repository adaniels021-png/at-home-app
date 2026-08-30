import { ActivityCategory } from './activityCategories';
import { supabase } from './supabase';

export type DailyAdventureAssignment = {
  assignment_date: string;
  position: number;
  assignment_source: string;
  assignment_count: number;
  incomplete: boolean;
  id: string;
  title: string;
  category: ActivityCategory;
  location: string | null;
  time: string | null;
  description: string | null;
  try_this: string[] | null;
  why_it_helps: string | null;
  materials: string[] | null;
  pro_only: boolean;
};

export type ActivityLibraryItem = Omit<
  DailyAdventureAssignment,
  'assignment_date' | 'position' | 'assignment_source' | 'assignment_count' | 'incomplete'
>;

export type ActivityStateUpdate = {
  saved?: boolean;
  favorite?: boolean;
  completed?: boolean;
  feedback?: 'loved' | 'good' | 'not_today' | null;
};

export async function getMyDailyAdventures(childId: string, date?: string) {
  const { data, error } = await supabase.rpc('get_my_daily_adventures', {
    target_child_id: childId,
    target_date: date || null,
  });

  if (error) throw error;
  return (data || []) as DailyAdventureAssignment[];
}

export async function searchMyActivityLibrary(input: {
  childId: string;
  query?: string;
  category?: ActivityCategory;
  afterTitle?: string;
  afterId?: string;
  limit?: number;
}) {
  const { data, error } = await supabase.rpc('search_my_activity_library', {
    target_child_id: input.childId,
    search_query: input.query || null,
    category_filter: input.category || null,
    after_title: input.afterTitle || null,
    after_id: input.afterId || null,
    page_size: input.limit || 5,
  });

  if (error) throw error;
  return (data || []) as ActivityLibraryItem[];
}

export async function getMyActivityDetail(childId: string, activityId: string) {
  const { data, error } = await supabase.rpc('get_my_activity_detail', {
    target_child_id: childId,
    target_activity_id: activityId,
  });

  if (error) throw error;
  return (Array.isArray(data) ? data[0] || null : data) as ActivityLibraryItem | null;
}

export async function getMySurpriseActivity(childId: string) {
  const { data, error } = await supabase.rpc('get_my_surprise_activity', {
    target_child_id: childId,
  });

  if (error) throw error;
  return (Array.isArray(data) ? data[0] || null : data) as ActivityLibraryItem | null;
}

export async function setMyActivityState(
  childId: string,
  activityId: string,
  update: ActivityStateUpdate
) {
  const { data, error } = await supabase.rpc('set_my_activity_state', {
    target_child_id: childId,
    target_activity_id: activityId,
    saved_value: update.saved ?? null,
    favorite_value: update.favorite ?? null,
    completed_value: update.completed ?? null,
    feedback_value: update.feedback ?? null,
  });

  if (error) throw error;
  return data;
}

export async function getMySavedActivitySnapshot(
  childId: string,
  savedActivityId: string
) {
  const { data, error } = await supabase.rpc('get_my_saved_activity_snapshot', {
    target_child_id: childId,
    target_saved_activity_id: savedActivityId,
  });

  if (error) throw error;
  return data;
}
