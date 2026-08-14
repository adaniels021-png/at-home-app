export type SupportLevel =
  | 'not_started'
  | 'high_support'
  | 'learning'
  | 'mostly_independent'
  | 'independent'
  | 'not_current_goal'
  | 'unknown';

export type PriorityLevel = 'high' | 'medium' | 'low' | 'none';

export type CommunicationMode =
  | 'spoken_sentences'
  | 'spoken_phrases'
  | 'spoken_words'
  | 'aac'
  | 'pictures_pecs'
  | 'signs'
  | 'gestures_pointing'
  | 'behavior_body_leading'
  | 'other';

export type CommunicationComplexity =
  | 'beginning_intentional'
  | 'single_unit'
  | 'short_combinations'
  | 'sentences'
  | 'conversation'
  | 'unknown';

export type AttentionSupport =
  | 'very_short'
  | 'short'
  | 'moderate'
  | 'extended'
  | 'unknown';

export type AssessmentAnswers = Record<string, string | string[] | null | undefined>;

export type ChildPersonalizationProfile = {
  childId: string;
  schemaVersion: number;
  builtAt: string;
  source: {
    initialAssessmentId: string | null;
    reassessmentId: string | null;
    assessmentCompletedAt: string | null;
    reassessmentCompletedAt: string | null;
    parentGoalsUpdatedAt: string | null;
  };
  age: {
    years: number | null;
  };
  priorities: {
    primary: string[];
    parentGoals: string[];
    parentGoalNotes: string | null;
    needTags: string[];
  };
  canonicalTargets?: {
    contractVersion: 'assessment-canonical-v1';
    domainKeys: string[];
    skillKeys: string[];
    broadDomainKeys: string[];
    unmapped: { field: string; value: string; reason: string | null }[];
    provenance: {
      field: string;
      value: string;
      mappingType: string;
      domainKeys: string[];
      skillKeys: string[];
    }[];
  };
  communication: {
    modes: CommunicationMode[];
    primaryMode: CommunicationMode | null;
    complexity: CommunicationComplexity;
    requestingSupport: SupportLevel;
    followsSimpleDirections: SupportLevel;
    mustSupportAlternateResponse: boolean;
  };
  dailyLiving: {
    overallIndependence: SupportLevel;
    morningRoutine: SupportLevel;
    bedtimeRoutine: SupportLevel;
    dressing: SupportLevel;
    handWashing: SupportLevel;
    toothBrushing: SupportLevel;
    basicToileting: SupportLevel;
    bathroomHygiene: SupportLevel;
  };
  learningSupport: {
    attentionSupport: AttentionSupport;
    instructionSupport: SupportLevel;
    imitationSupport: SupportLevel;
    preferredTeachingSupports: string[];
  };
  regulation: {
    priority: PriorityLevel;
    currentNeeds: string[];
    commonChallenges: string[];
    helpfulSupports: string[];
    noMajorConcerns: boolean;
  };
  sensory: {
    considerations: string[];
    noMajorConcerns: boolean;
  };
  social: {
    currentNeeds: string[];
    priority: PriorityLevel;
  };
  safety: {
    currentNeeds: string[];
    priority: PriorityLevel;
    noMajorConcerns: boolean;
  };
  restrictions: {
    tags: string[];
    notes: string | null;
    unresolvedFreeText: boolean;
  };
  interests: {
    preferredInterests: string[];
    reinforcers: string[];
  };
  lessonState: {
    masteredSkillCodes: string[];
    currentSkillStages: Record<string, number>;
    recentlyShownLessonIds: string[];
    recentlyCompletedLessonIds: string[];
    weakSkillCodes: string[];
  };
};

export type LegacyProfileInput = {
  childId: string;
  builtAt?: string;
  child?: {
    age?: unknown;
    parent_goals?: unknown;
    parent_goal_notes?: unknown;
    onboarding_parent_goals_completed_at?: unknown;
    updated_at?: unknown;
  } | null;
  assessment?: {
    id?: unknown;
    responses?: unknown;
    completed_at?: unknown;
    created_at?: unknown;
  } | null;
  reassessment?: {
    id?: unknown;
    responses?: unknown;
    created_at?: unknown;
  } | null;
  masteryRows?: unknown[] | null;
  completedLessonRows?: unknown[] | null;
};
