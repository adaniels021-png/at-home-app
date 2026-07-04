// lib/aiService.ts

import { supabase } from './supabase';

import * as activityGenerator from './ai/activityGenerator';
import * as behaviorGenerator from './ai/behaviorGenerator';
import * as fallbacks from './ai/fallbacks';
import * as lessonGenerator from './ai/lessonGenerator';
import * as normalizers from './ai/normalizers';

type Json = Record<string, any>;

type ChildProfile = {
  id: string;
  name?: string | null;
  age?: number | null;
  diagnosis?: string | null;
  goals?: string[] | null;
  communication_level?: string | null;
  sensory_preferences?: string[] | null;
  behavior_notes?: string | null;
};

type Assessment = {
  id: string;
  child_id: string;
  answers?: Json | null;
  results?: Json | null;
  created_at?: string;
};

type LessonLog = {
  id?: string;
  child_id: string;
  lesson_id?: string | null;
  title?: string | null;
  skill_area?: string | null;
  status?: 'started' | 'completed' | 'skipped' | string;
  notes?: string | null;
  data?: Json | null;
  created_at?: string;
};

type AIContext = {
  child?: ChildProfile | null;
  assessment?: Assessment | null;
  recentLessonLogs?: LessonLog[];
  skillArea?: string;
  difficulty?: string;
  concern?: string;
  behavior?: string;
  setting?: string;
  trigger?: string;
  goal?: string;
  [key: string]: any;
};

const asCallable = <TArgs extends any[], TResult>(
  moduleObject: unknown,
  names: string[]
): ((...args: TArgs) => Promise<TResult>) | null => {
  const record = moduleObject as Record<string, unknown>;

  for (const name of names) {
    const fn = record[name];
    if (typeof fn === 'function') {
      return fn as (...args: TArgs) => Promise<TResult>;
    }
  }

  return null;
};

const callModule = async <TResult>(
  moduleObject: unknown,
  names: string[],
  context: AIContext
): Promise<TResult> => {
  const fn = asCallable<[AIContext], TResult>(moduleObject, names);

  if (!fn) {
    throw new Error(`Missing AI generator export. Tried: ${names.join(', ')}`);
  }

  return fn(context);
};

const normalizeWith = <T>(
  value: T,
  names: string[]
): T => {
  const record = normalizers as Record<string, unknown>;

  for (const name of names) {
    const fn = record[name];
    if (typeof fn === 'function') {
      return (fn as (input: T) => T)(value);
    }
  }

  return value;
};

const fallbackWith = async <T>(
  names: string[],
  context: AIContext
): Promise<T> => {
  return callModule<T>(fallbacks, names, context);
};

export const getChildProfile = async (
  childId: string
): Promise<ChildProfile | null> => {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (error) {
    console.warn('[aiService] Failed to load child profile:', error.message);
    return null;
  }

  return data as ChildProfile;
};

export const getLatestAssessment = async (
  childId: string
): Promise<Assessment | null> => {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[aiService] Failed to load latest assessment:', error.message);
    return null;
  }

  return data as Assessment | null;
};

export const getRecentLessonLogs = async (
  childId: string,
  limit = 10
): Promise<LessonLog[]> => {
  const { data, error } = await supabase
    .from('lesson_logs')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[aiService] Failed to load recent lesson logs:', error.message);
    return [];
  }

  return (data ?? []) as LessonLog[];
};

export const buildAIContext = async (
  childId: string,
  extra: Partial<AIContext> = {}
): Promise<AIContext> => {
  const [child, assessment, recentLessonLogs] = await Promise.all([
    getChildProfile(childId),
    getLatestAssessment(childId),
    getRecentLessonLogs(childId),
  ]);

  return {
    child,
    assessment,
    recentLessonLogs,
    ...extra,
  };
};

export const generateLesson = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  const context = await buildAIContext(childId, options);

  try {
    const lesson = await callModule<any>(
      lessonGenerator,
      [
        'generateLesson',
        'generateAILesson',
        'generatePersonalizedLesson',
        'createLesson',
      ],
      context
    );

    return normalizeWith(lesson, [
      'normalizeLesson',
      'normalizeAILesson',
    ]);
  } catch (error) {
    console.warn('[aiService] Lesson AI failed. Using fallback.', error);

    const fallback = await fallbackWith<any>(
      [
        'getLessonFallback',
        'fallbackLesson',
        'generateFallbackLesson',
      ],
      context
    );

    return normalizeWith(fallback, [
      'normalizeLesson',
      'normalizeAILesson',
    ]);
  }
};

export const generateDailyLesson = generateLesson;
export const generatePersonalizedLesson = generateLesson;

export const saveLessonLog = async (
  log: LessonLog
): Promise<LessonLog | null> => {
  const { data, error } = await supabase
    .from('lesson_logs')
    .insert(log)
    .select('*')
    .single();

  if (error) {
    console.warn('[aiService] Failed to save lesson log:', error.message);
    return null;
  }

  return data as LessonLog;
};

export const updateLessonLog = async (
  logId: string,
  updates: Partial<LessonLog>
): Promise<LessonLog | null> => {
  const { data, error } = await supabase
    .from('lesson_logs')
    .update(updates)
    .eq('id', logId)
    .select('*')
    .single();

  if (error) {
    console.warn('[aiService] Failed to update lesson log:', error.message);
    return null;
  }

  return data as LessonLog;
};

export const completeLesson = async (
  childId: string,
  lesson: any,
  notes?: string
): Promise<LessonLog | null> => {
  return saveLessonLog({
    child_id: childId,
    lesson_id: lesson?.id ?? null,
    title: lesson?.title ?? null,
    skill_area: lesson?.skillArea ?? lesson?.skill_area ?? null,
    status: 'completed',
    notes: notes ?? null,
    data: lesson ?? null,
  });
};

export const generateActivity = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  const context = await buildAIContext(childId, options);

  try {
    const activity = await callModule<any>(
      activityGenerator,
      [
        'generateActivity',
        'generateAIActivity',
        'generateDailyActivity',
        'createActivity',
      ],
      context
    );

    return normalizeWith(activity, [
      'normalizeActivity',
      'normalizeAIActivity',
    ]);
  } catch (error) {
    console.warn('[aiService] Activity AI failed. Using fallback.', error);

    const fallback = await fallbackWith<any>(
      [
        'getActivityFallback',
        'fallbackActivity',
        'generateFallbackActivity',
      ],
      context
    );

    return normalizeWith(fallback, [
      'normalizeActivity',
      'normalizeAIActivity',
    ]);
  }
};

export const generateDailyActivity = generateActivity;

export const getOrCreateDailyActivity = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: existingError } = await supabase
    .from('daily_fun_activities')
    .select('*')
    .eq('child_id', childId)
    .eq('activity_date', today)
    .maybeSingle();

  if (existingError) {
    console.warn(
      '[aiService] Failed to check daily activity:',
      existingError.message
    );
  }

  if (existing) {
    return existing;
  }

  const activity = await generateActivity(childId, options);

  const { data, error } = await supabase
    .from('daily_fun_activities')
    .insert({
      child_id: childId,
      activity_date: today,
      activity,
      title: activity?.title ?? null,
      category: activity?.category ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.warn('[aiService] Failed to save daily activity:', error.message);
    return activity;
  }

  return data;
};

export const saveActivity = async (
  childId: string,
  activity: any
): Promise<any | null> => {
  const { data, error } = await supabase
    .from('saved_activities')
    .insert({
      child_id: childId,
      activity,
      title: activity?.title ?? null,
      category: activity?.category ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.warn('[aiService] Failed to save activity:', error.message);
    return null;
  }

  return data;
};

export const unsaveActivity = async (
  savedActivityId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('saved_activities')
    .delete()
    .eq('id', savedActivityId);

  if (error) {
    console.warn('[aiService] Failed to remove saved activity:', error.message);
    return false;
  }

  return true;
};

export const getSavedActivities = async (
  childId: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('saved_activities')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[aiService] Failed to load saved activities:', error.message);
    return [];
  }

  return data ?? [];
};

export const generateBehaviorSupport = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  const context = await buildAIContext(childId, options);

  try {
    const support = await callModule<any>(
      behaviorGenerator,
      [
        'generateBehaviorSupport',
        'generateBehaviorPlan',
        'generateBehaviorStrategy',
        'generateAIBehaviorSupport',
      ],
      context
    );

    return normalizeWith(support, [
      'normalizeBehaviorSupport',
      'normalizeBehaviorPlan',
    ]);
  } catch (error) {
    console.warn('[aiService] Behavior AI failed. Using fallback.', error);

    const fallback = await fallbackWith<any>(
      [
        'getBehaviorFallback',
        'fallbackBehaviorSupport',
        'generateFallbackBehaviorSupport',
      ],
      context
    );

    return normalizeWith(fallback, [
      'normalizeBehaviorSupport',
      'normalizeBehaviorPlan',
    ]);
  }
};

export const generateBehaviorPlan = generateBehaviorSupport;
export const generateBehaviorStrategy = generateBehaviorSupport;

export const saveBehaviorSupportLog = async (
  childId: string,
  support: any,
  options: Partial<AIContext> = {}
): Promise<any | null> => {
  const { data, error } = await supabase
    .from('behavior_support_logs')
    .insert({
      child_id: childId,
      support,
      concern: options.concern ?? options.behavior ?? null,
      setting: options.setting ?? null,
      trigger: options.trigger ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.warn(
      '[aiService] Failed to save behavior support log:',
      error.message
    );
    return null;
  }

  return data;
};

export const refreshLessonRecommendation = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  return generateLesson(childId, {
    ...options,
    recommendationMode: true,
  });
};

export const refreshActivityRecommendation = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  return generateActivity(childId, {
    ...options,
    recommendationMode: true,
  });
};


export type RecommendedSign = {
  label: string;
  reason: string;
};

const getChildIdFromArgs = (input: any): string => {
  if (typeof input === 'string') return input;
  return input?.childId ?? input?.child_id ?? 'demo-child';
};

export const generateDailyABAActivities = async (
  input: string | Partial<AIContext>
): Promise<any[]> => {
  const childId = getChildIdFromArgs(input);
  const options = typeof input === 'string' ? {} : input;

  const count = typeof input === 'object' ? input?.count ?? 3 : 3;

  const activities = await Promise.all(
    Array.from({ length: count }).map(() => generateActivity(childId, options))
  );

  return activities.filter(Boolean);
};

export const generateABAActivity = async (
  input: string | Partial<AIContext>,
  skill?: string,
  title?: string
): Promise<any> => {
  const childId = getChildIdFromArgs(input);
  const options =
    typeof input === 'string'
      ? { skillArea: skill, title }
      : input;

  return generateActivity(childId, options);
};

export const generatePremiumLesson = async (
  input: string | Partial<AIContext>
): Promise<any> => {
  const childId = getChildIdFromArgs(input);
  const options = typeof input === 'string' ? {} : input;

  return generateLesson(childId, {
    ...options,
    premium: true,
  });
};

export const generateProgressSummary = async (
  input: string | Partial<AIContext>,
  options: Partial<AIContext> = {}
): Promise<any> => {
  const childId = getChildIdFromArgs(input);
  const extra = typeof input === 'string' ? options : input;
  const context = await buildAIContext(childId, extra);

  return {
    summary: 'Progress is building through consistent practice.',
    strengths: [],
    opportunities: [],
    recentLessonLogs: context.recentLessonLogs ?? [],
  };
};

export const generateProgressRecommendations = async (
  input: string | Partial<AIContext>
): Promise<{ recommendations: any[] }> => {
  const childId = getChildIdFromArgs(input);
  const options = typeof input === 'string' ? {} : input;

  const lesson = await refreshLessonRecommendation(childId, options);
  const activity = await refreshActivityRecommendation(childId, options);

  return {
    recommendations: [lesson, activity].filter(Boolean),
  };
};

export const generateAssessmentQuestions = async (
  childName?: string,
  childAgeMonths?: number
): Promise<any[]> => {
  return [
    {
      id: 'communication',
      question: `How does ${childName ?? 'your child'} usually communicate wants and needs?`,
      type: 'multiple_choice',
      options: ['Words', 'Gestures', 'Pictures', 'Sounds', 'A mix'],
    },
    {
      id: 'directions',
      question: 'How does your child respond to simple one-step directions?',
      type: 'multiple_choice',
      options: ['Usually follows', 'Sometimes follows', 'Needs prompts', 'Not yet'],
    },
    {
      id: 'routines',
      question: 'Which routines are hardest right now?',
      type: 'multiple_choice',
      options: ['Morning', 'Meals', 'Transitions', 'Bedtime', 'Potty training'],
    },
  ];
};

export const generateRecommendedSigns = async (
  _input?: Partial<AIContext> & { excludedLabels?: string[] }
): Promise<RecommendedSign[]> => {
  const excluded = (_input?.excludedLabels ?? []).map((item) =>
    item.toLowerCase()
  );

  const signs: RecommendedSign[] = [
    { label: 'More', reason: 'Useful for motivated requesting.' },
    { label: 'Help', reason: 'Supports functional communication.' },
    { label: 'All Done', reason: 'Helps with transitions.' },
  ];

  return signs.filter((sign) => !excluded.includes(sign.label.toLowerCase()));
};

export default {
  buildAIContext,
  getChildProfile,
  getLatestAssessment,
  getRecentLessonLogs,

  generateLesson,
  generateDailyLesson,
  generatePersonalizedLesson,
  saveLessonLog,
  updateLessonLog,
  completeLesson,

  generateActivity,
  generateDailyActivity,
  getOrCreateDailyActivity,
  saveActivity,
  unsaveActivity,
  getSavedActivities,

  generateDailyABAActivities,
generateABAActivity,
generatePremiumLesson,
generateProgressSummary,
generateProgressRecommendations,
generateAssessmentQuestions,
generateRecommendedSigns,

  generateBehaviorSupport,
  generateBehaviorPlan,
  generateBehaviorStrategy,
  saveBehaviorSupportLog,

  refreshLessonRecommendation,
  refreshActivityRecommendation,
};
