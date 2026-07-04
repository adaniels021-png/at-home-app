import { supabase } from './supabase';

export type LessonLibraryItem = {
  id: string;
  title: string;
  category?: string | null;
  skill_area?: string | null;
  stage_number?: number | null;
  is_active?: boolean | null;
};

export const getLessonLibraryItems = async (): Promise<LessonLibraryItem[]> => {
  const { data, error } = await supabase
    .from('lesson_library')
    .select('id,title,category,skill_area,stage_number,is_active')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[lessonLibrary] Failed to load lesson library:', error.message);
    return [];
  }

  return (data ?? []) as LessonLibraryItem[];
};
