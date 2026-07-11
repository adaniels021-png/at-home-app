// lib/aiService.ts

import AIManager from './ai/AIManager';
import * as fallbacks from './ai/fallbacks';
import * as normalizers from './ai/normalizers';
import { supabase } from './supabase';

type Json = Record<string, any>;

type ChildProfile = {
  id: string;
  child_name?: string | null;
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function getContextChildName(
  context: AIContext,
  options: Partial<AIContext> = {}
): string {
  return (
    options.childName ||
    context.child?.child_name ||
    context.child?.name ||
    'Your Child'
  );
}

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


export const getChildProfile = async (
  childId: string
): Promise<ChildProfile | null> => {
  if (!isValidUuid(childId)) {
    return null;
  }

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .maybeSingle();

  if (error) {
    console.warn(
      '[aiService] Failed to load child profile:',
      error.message
    );

    return null;
  }

  return data as ChildProfile | null;
};

export const getLatestAssessment = async (
  childId: string
): Promise<Assessment | null> => {
  if (!isValidUuid(childId)) {
    return null;
  }

  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(
      '[aiService] Failed to load latest assessment:',
      error.message
    );

    return null;
  }

  return data as Assessment | null;
};

export const getRecentLessonLogs = async (
  childId: string,
  limit = 10
): Promise<LessonLog[]> => {
  if (!isValidUuid(childId)) {
    return [];
  }

  const { data, error } = await supabase
    .from('lesson_logs')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(
      '[aiService] Failed to load recent lesson logs:',
      error.message
    );

    return [];
  }

  return (data ?? []) as LessonLog[];
};

export const buildAIContext = async (
  childId: string,
  extra: Partial<AIContext> = {}
): Promise<AIContext> => {
  /*
   * Preview/demo generators do not use real database child records.
   * Never send synthetic IDs into Supabase UUID columns.
   */
  if (!isValidUuid(childId)) {
    return {
      child: {
        id: childId || 'preview-child',
        child_name:
          typeof extra.childName === 'string'
            ? extra.childName
            : 'Your Child',
        name:
          typeof extra.childName === 'string'
            ? extra.childName
            : 'Your Child',
      },
      assessment: null,
      recentLessonLogs: [],
      ...extra,
    };
  }

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
    const result = await AIManager.generateLesson({
      childId,

      childName: getContextChildName(
        context,
        options
      ),

      skill:
        options.skill ||
        options.skillArea ||
        'Communication',

      location:
        options.location ||
        options.setting ||
        'Home',

      lessonNumber: Number(
        options.lessonNumber ?? 1
      ),

      difficultyTrend:
        options.difficultyTrend === 'increase' ||
        options.difficultyTrend === 'decrease' ||
        options.difficultyTrend === 'maintain'
          ? options.difficultyTrend
          : 'maintain',

      skillTarget:
        options.skillTarget ||
        options.skillArea,

      behaviorPattern:
        options.behaviorPattern,

      avoidSkills: Array.isArray(
        options.avoidSkills
      )
        ? options.avoidSkills
        : [],

      lessonVarietyGuidance:
        options.lessonVarietyGuidance ||
        '',
    });

    return normalizeWith(result, [
      'normalizeLesson',
      'normalizeAILesson',
    ]);
  } catch (error) {
    console.warn(
      '[aiService] Lesson AI failed. Using fallback.',
      error
    );

    const fallbackSkill =
      options.skill ||
      options.skillArea ||
      'Communication';

    /*
     * Your fallbacks file exports buildFallbackLesson,
     * so call it directly when available.
     */
    const fallbackBuilder = (
      fallbacks as Record<string, any>
    ).buildFallbackLesson;

    if (
      typeof fallbackBuilder === 'function'
    ) {
      return {
        lesson:
          fallbackBuilder(fallbackSkill),
        source: 'fallback',
      };
    }

    throw error;
  }
};

export const generateDailyLesson = generateLesson;
export const generatePersonalizedLesson = generateLesson;

export const saveLessonLog = async (
  log: LessonLog
): Promise<LessonLog | null> => {
  if (!isValidUuid(log.child_id)) {
    console.warn(
      '[aiService] Cannot save lesson log because child_id is not a valid UUID.'
    );

    return null;
  }

  const { data, error } = await supabase
    .from('lesson_logs')
    .insert(log)
    .select('*')
    .single();

  if (error) {
    console.warn(
      '[aiService] Failed to save lesson log:',
      error.message
    );

    return null;
  }

  return data as LessonLog;
};

export const updateLessonLog = async (
  logId: string,
  updates: Partial<LessonLog>
): Promise<LessonLog | null> => {
  if (!isValidUuid(logId)) {
    console.warn(
      '[aiService] Cannot update lesson log because logId is not a valid UUID.'
    );

    return null;
  }

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
  if (!isValidUuid(childId)) {
    console.warn(
      '[aiService] Cannot complete lesson because childId is not a valid UUID.'
    );

    return null;
  }

  return saveLessonLog({
    child_id: childId,
    lesson_id: lesson?.id ?? null,
    title:
      lesson?.title ??
      lesson?.lesson_name ??
      null,
    skill_area:
      lesson?.skillArea ??
      lesson?.skill_area ??
      lesson?.focus_skill ??
      null,
    status: 'completed',
    notes: notes ?? null,
    data: lesson ?? null,
  });
};

export const generateActivity = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  const context = await buildAIContext(
    childId,
    options
  );

  try {
    const activities =
      await AIManager.generateActivities({
        childName: getContextChildName(
          context,
          options
        ),

        location:
          options.location ||
          options.setting ||
          'Home',

        skillFocus:
          options.skillFocus ||
          options.skillArea ||
          'Fun family activities that naturally support development',

        assessmentContext:
          context.assessment || {},

        recentLessons:
          context.recentLessonLogs || [],

        recentRoutines:
          Array.isArray(
            options.recentRoutines
          )
            ? options.recentRoutines
            : [],

        count: 1,
      });

    const activity =
      Array.isArray(activities)
        ? activities[0] ?? null
        : activities;

    return normalizeWith(activity, [
      'normalizeActivity',
      'normalizeAIActivity',
    ]);
  } catch (error) {
    console.warn(
      '[aiService] Activity AI failed. Using fallback.',
      error
    );

    const fallbackBuilder = (
      fallbacks as Record<string, any>
    ).buildFallbackActivities;

    if (
      typeof fallbackBuilder === 'function'
    ) {
      return fallbackBuilder(
        getContextChildName(
          context,
          options
        ),
        1
      )[0];
    }

    return null;
  }
};

export const generateDailyActivity = generateActivity;

export const getOrCreateDailyActivity = async (
  childId: string,
  options: Partial<AIContext> = {}
): Promise<any> => {
  if (!isValidUuid(childId)) {
    console.warn(
      '[aiService] Skipping daily activity database lookup because childId is not a valid UUID.'
    );

    return generateActivity(childId, options);
  }

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
    console.warn(
      '[aiService] Failed to save daily activity:',
      error.message
    );

    return activity;
  }

  return data;
};

export const saveActivity = async (
  childId: string,
  activity: any
): Promise<any | null> => {
  if (!isValidUuid(childId)) {
    console.warn(
      '[aiService] Cannot save activity because childId is not a valid UUID.'
    );

    return null;
  }

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
    console.warn(
      '[aiService] Failed to save activity:',
      error.message
    );

    return null;
  }

  return data;
};

export const unsaveActivity = async (
  savedActivityId: string
): Promise<boolean> => {
  if (!isValidUuid(savedActivityId)) {
    console.warn(
      '[aiService] Cannot remove saved activity because the ID is not a valid UUID.'
    );

    return false;
  }

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
  if (!isValidUuid(childId)) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_activities')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    console.warn(
      '[aiService] Failed to load saved activities:',
      error.message
    );

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
    const support = await AIManager.generateBehaviorSupport({
  childId,
  childName: getContextChildName(context, options),
  behavior: options.behavior ?? options.concern ?? 'General behavior',
  beforeBehavior: options.trigger ?? 'Unknown trigger',
  afterBehavior: '',
  location: options.setting ?? 'Home',
});
    return normalizeWith(support, [
      'normalizeBehaviorSupport',
      'normalizeBehaviorPlan',
    ]);
   } catch (error) {
    console.warn(
      '[aiService] Behavior AI failed. Using fallback.',
      error
    );

    const fallbackBuilder = (
      fallbacks as Record<string, any>
    ).buildFallbackBehaviorSupportPlan;

    const fallback =
      typeof fallbackBuilder === 'function'
        ? fallbackBuilder()
        : {
            possible_reason:
              'The child may be struggling with communication, regulation, transitions, or unmet needs.',
            prevention_strategies: [
              'Use visual schedules.',
              'Give transition warnings.',
              'Keep routines predictable.',
            ],
            replacement_skills: [
              'Teach requesting help.',
              'Practice calm communication.',
            ],
            calming_supports: [
              'Offer sensory breaks.',
              'Reduce environmental stress.',
            ],
            parent_tips: [
              'Stay calm and consistent.',
              'Reinforce positive behavior immediately.',
            ],
            encouragement:
              'You are doing a great job supporting your child.',
          };

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
  if (!isValidUuid(childId)) {
    console.warn(
      '[aiService] Cannot save behavior support because childId is not a valid UUID.'
    );

    return null;
  }

  const { data, error } = await supabase
    .from('behavior_support_logs')
    .insert({
      child_id: childId,
      support,
      concern:
        options.concern ??
        options.behavior ??
        null,
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

const getChildIdFromArgs = (
  input: any
): string => {
  if (
    typeof input === 'string' &&
    input.trim()
  ) {
    return input.trim();
  }

  return (
    input?.childId ||
    input?.child_id ||
    'preview-child'
  );
};

export const generateDailyABAActivities = async (
  input: string | Partial<AIContext>
): Promise<any[]> => {
  const childId =
    getChildIdFromArgs(input);

  const options =
    typeof input === 'string'
      ? {}
      : input;

  const count = Math.min(
    Math.max(
      Number(options.count ?? 3),
      1
    ),
    6
  );

  const context = await buildAIContext(
    childId,
    options
  );

  try {
    const activities =
      await AIManager.generateActivities({
        childName: getContextChildName(
          context,
          options
        ),

        location:
          options.location ||
          options.setting ||
          'Home, outdoor, or community',

        skillFocus:
          options.skillFocus ||
          options.skillArea ||
          'Fun family activities that naturally support development',

        assessmentContext:
          context.assessment || {},

        recentLessons:
          context.recentLessonLogs || [],

        recentRoutines:
          Array.isArray(
            options.recentRoutines
          )
            ? options.recentRoutines
            : [],

        count,
      });

    return Array.isArray(activities)
      ? activities.slice(0, count)
      : [];
  } catch (error) {
    console.error(
      '[aiService] Daily activity generation failed:',
      error
    );

    const fallbackBuilder = (
      fallbacks as Record<string, any>
    ).buildFallbackActivities;

    if (
      typeof fallbackBuilder === 'function'
    ) {
      return fallbackBuilder(
        getContextChildName(
          context,
          options
        ),
        count
      );
    }

    return [];
  }
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
  const childId =
    getChildIdFromArgs(input);

  const options =
    typeof input === 'string'
      ? {}
      : input;

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
