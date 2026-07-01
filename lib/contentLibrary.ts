import { supabase } from './supabase';

export type ContentType = 'lesson' | 'activity';

export type ContentLibraryItem = {
  id: string;
  content_type: ContentType;
  title: string;
  description: string | null;
  category: string;
  skill_area: string | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  materials: string[] | null;
  steps: string[] | null;
  caregiver_tips: string[] | null;
  goal: string | null;
  pro_only: boolean;
  is_active: boolean;
  created_at: string;
};

export async function getContentLibraryItems(
  contentType?: ContentType
): Promise<ContentLibraryItem[]> {
  let query = supabase
    .from('content_library')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (contentType) {
    query = query.eq('content_type', contentType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error loading content library:', error);
    throw error;
  }

  return data ?? [];
}

export async function getLessonsFromLibrary() {
  return getContentLibraryItems('lesson');
}

export async function getActivitiesFromLibrary() {
  return getContentLibraryItems('activity');
}