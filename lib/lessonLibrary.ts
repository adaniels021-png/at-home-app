import { supabase } from './supabase';

export type LessonQualityStatus =
  | 'draft'
  | 'reviewed'
  | 'approved'
  | 'needs_revision';

export type LessonLibraryItem = {
  id: string;
  skill_id: string | null;
  stage_id: string | null;
  category: string;
  skill_area: string;
  stage_number: number;
  stage_name: string;
  lesson_type: string | null;
  title: string;
  description: string | null;
  goal: string | null;
  materials: string[] | null;
  steps: string[] | null;
  caregiver_tips: string[] | null;
  why_skill_matters: string | null;
  setup_instructions: string | null;
  parent_script: string | null;
  expected_child_response: string | null;
  prompting_tips: string[] | null;
  reinforcement_tips: string[] | null;
  if_child_struggles: string[] | null;
  easy_version: string | null;
  harder_version: string | null;
  generalization_ideas: string[] | null;
  safety_notes: string[] | null;
  mastery_criteria: string | null;
  next_lesson_preview: string | null; 
  difficulty: string | null;
  estimated_minutes: number | null;
  pro_only: boolean;
  is_active: boolean;
  admin_notes: string | null;
  quality_status: LessonQualityStatus | string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

function baseLessonQuery() {
  return supabase
    .from('lesson_library')
    .select('*')
    .eq('is_active', true);
}

function cleanArray(values?: string[] | null) {
  return (values || []).map((v) => String(v).trim()).filter(Boolean);
}

async function getCompletedLibraryLessonIds(childId?: string) {
  if (!childId) return [];

  const { data, error } = await supabase
    .from('daily_lesson_instances')
    .select('library_lesson_id')
    .eq('child_id', childId)
    .eq('source', 'library')
    .eq('status', 'completed')
    .not('library_lesson_id', 'is', null);

  if (error) {
    console.log('Completed library lesson lookup failed:', error);
    return [];
  }

  return data?.map((row: any) => row.library_lesson_id).filter(Boolean) || [];
}

async function runLibrarySearch({
  category,
  skillArea,
  stageNumber,
  completedLessonIds,
  excludeSkills,
  label,
}: {
  category?: string;
  skillArea?: string | string[];
  stageNumber?: number;
  completedLessonIds?: string[];
  excludeSkills?: string[];
  label: string;
}) {
  let query = baseLessonQuery();

  if (category) {
    query = query.eq('category', category);
  }

  if (Array.isArray(skillArea) && skillArea.length > 0) {
    query = query.in('skill_area', cleanArray(skillArea));
  } else if (typeof skillArea === 'string' && skillArea.trim()) {
    query = query.eq('skill_area', skillArea.trim());
  }

  if (typeof stageNumber === 'number' && stageNumber > 0) {
    query = query.eq('stage_number', stageNumber);
  }

  const cleanedExcludeSkills = cleanArray(excludeSkills);

  if (cleanedExcludeSkills.length > 0) {
    query = query.not(
      'skill_area',
      'in',
      `(${cleanedExcludeSkills.map((skill) => `"${skill}"`).join(',')})`
    );
  }

  const cleanedCompletedIds = cleanArray(completedLessonIds);

  if (cleanedCompletedIds.length > 0) {
    query = query.not(
      'id',
      'in',
      `(${cleanedCompletedIds.map((id) => `"${id}"`).join(',')})`
    );
  }

  const { data, error } = await query
    .order('stage_number', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) {
    console.log(`Lesson library search failed (${label}):`, error);
    return [];
  }

  console.log(`LESSON LIBRARY SEARCH (${label}) FOUND:`, data?.length || 0);

  return (data || []) as LessonLibraryItem[];
}

export async function getRecommendedLesson({
  category,
  skillArea,
  stageNumber,
  childId,
  excludeSkills,
}: {
  category?: string;
  skillArea?: string | string[];
  stageNumber?: number;
  childId?: string;
  excludeSkills?: string[];
}): Promise<LessonLibraryItem | null> {
  const completedLessonIds = await getCompletedLibraryLessonIds(childId);

  const searches = [
    {
      label: 'exact category + skill + stage',
      category,
      skillArea,
      stageNumber,
      completedLessonIds,
      excludeSkills,
    },
    {
      label: 'category + skill, no stage',
      category,
      skillArea,
      completedLessonIds,
      excludeSkills,
    },
    {
      label: 'category only',
      category,
      completedLessonIds,
    },
    {
      label: 'skill only',
      skillArea,
      completedLessonIds,
    },
    {
      label: 'any active lesson',
      completedLessonIds,
    },
    {
      label: 'any active lesson including completed',
    },
  ];

  for (const search of searches) {
    const lessons = await runLibrarySearch(search);

    if (lessons.length > 0) {
      console.log('USING LIBRARY LESSON:', {
        title: lessons[0].title,
        category: lessons[0].category,
        skill_area: lessons[0].skill_area,
        stage_number: lessons[0].stage_number,
      });

      return lessons[0];
    }
  }

  console.log('NO LIBRARY LESSON FOUND');
  return null;
}

export async function getLessonLibraryItems(): Promise<LessonLibraryItem[]> {
  const { data, error } = await baseLessonQuery()
    .order('category', { ascending: true })
    .order('skill_area', { ascending: true })
    .order('stage_number', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getLessonById(
  id: string
): Promise<LessonLibraryItem | null> {
  const { data, error } = await supabase
    .from('lesson_library')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}