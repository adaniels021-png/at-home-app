import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '../../components/AnimatedPressable';
import FadeInView from '../../components/FadeInView';
import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { getLearningPath } from '../../lib/learningPath';
import { completeLesson } from '../../lib/lessonEngine';
import { getRecommendedLesson } from '../../lib/lessonLibrary';
import { getRecommendedStageForSkill } from '../../lib/lessonProgression';
import { ensureLessonQueue, getNextQueuedLesson } from '../../lib/lessonQueue';
import {
  getMasteredSkills
} from '../../lib/lessonRecommendations';
import { SKILL_PROGRESSION_PATHS } from '../../lib/lessonTypes';
import { getSmartRecommendedSkill } from '../../lib/smartLessonRecommendations';
import { supabase } from '../../lib/supabase';
type Lesson = any;

const USE_LIBRARY_LESSONS = true;

function mapAppCategoryToLibraryCategory(category: string) {
  return category;
}

function mapLibraryLessonToDailyLesson(lesson: any) {
  return {
    id: `library-${lesson.id}`,
    library_lesson_id: lesson.id,
    source: 'library',

    lesson_name: lesson.title,
    focus_skill: lesson.skill_area,
    category: lesson.category,

    materials: lesson.materials || [],
    teaching_steps: lesson.steps || [],
    parent_coaching_note:
      lesson.caregiver_tips?.[0] ||
      lesson.goal ||
      'Keep the lesson short, positive, and focused on small wins.',

      estimated_minutes: lesson.estimated_minutes || null,

    goal: lesson.goal,
description: lesson.description,
lesson_summary:
  lesson.description ||
  lesson.goal ||
  lesson.why_skill_matters ||
  null,
lesson_type: lesson.lesson_type,
stage_number: lesson.stage_number,
stage_name: lesson.stage_name,
  };
}

const SKILL_CATEGORIES = [
  'Communication',
  'Daily Routines',
  'Play & Social Skills',
  'Learning & Attention',
  'Movement & Coordination',
  'Emotions & Behavior',
];

type LessonStatus = 'success' | 'unsuccessful';

type PromptLevel = 'independent' | 'verbal' | 'gestural' | 'model' | 'physical';

type BehaviorResponse = 'engaged' | 'avoidant' | 'frustrated' | 'independent';

type ConsistencyLevel = 'high' | 'medium' | 'low';

type LockedPreviewLesson = {
  id: string;
  title: string;
  subtitle: string;
};

function cleanLessonTitle(title: any, category: string) {
  const raw = String(title || '').trim();
  const hasBadVariationTitle =
    raw.toLowerCase().includes('variation') || /\d{8,}/.test(raw);

  if (!raw || hasBadVariationTitle) {
    const cleanTitles: Record<string, string> = {
  Communication: 'Practicing Communication at Home',
  'Daily Routines': 'Practicing Daily Routines',
  'Play & Social Skills': 'Learning Through Play and Connection',
  'Learning & Attention': 'Building Learning and Attention',
  'Movement & Coordination': 'Movement and Coordination Practice',
  'Emotions & Behavior': 'Building Calm Behavior Skills',
};

    return cleanTitles[category] || `${category} Practice`;
  }

  return raw;
}

function getFreeLessonLockKey(childId: string) {
  const today = new Date().toISOString().split('T')[0];
  return `free-lesson-used-${childId}-${today}`;
}



export default function DailyLessonsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro } = useSubscription();

  const loadRequestRef = useRef(0);

const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const retryCountRef = useRef(0);

  const [started, setStarted] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState('Communication');

  const [lessonData, setLessonData] = useState<Lesson | null>(null);
  const [learningPath, setLearningPath] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [preparingLesson, setPreparingLesson] = useState(false);

  const [lessonNumber, setLessonNumber] = useState(1);

  const [dailyLimitReached, setDailyLimitReached] =
    useState(false);

  const [freeLessonsUsedToday, setFreeLessonsUsedToday] =
    useState(0);

  const [completionRating, setCompletionRating] =
    useState<1 | 2 | 3 | 4 | 5>(4);

  const [promptLevel, setPromptLevel] =
    useState<PromptLevel>('verbal');

  const [behaviorResponse, setBehaviorResponse] =
    useState<BehaviorResponse>('engaged');

  const [consistencyLevel, setConsistencyLevel] =
    useState<ConsistencyLevel>('medium');

  const childName = useMemo(() => {
    return (
      selectedChild?.child_name ||
      selectedChild?.name ||
      'your child'
    );
  }, [selectedChild]);

  const checkFreeLessonLimit = useCallback(async () => {
    if (!selectedChild?.id || isPro) {
      setDailyLimitReached(false);
      setFreeLessonsUsedToday(0);
      return false;
    }

    const localLock = await AsyncStorage.getItem(
      getFreeLessonLockKey(selectedChild.id)
    );

    if (localLock === 'true') {
      setFreeLessonsUsedToday(1);
      setDailyLimitReached(true);
      return true;
    }

    const todayStr = new Date().toISOString().split('T')[0];

const { count, error } = await supabase
  .from('daily_lesson_instances')
  .select('id', { count: 'exact', head: true })
  .eq('child_id', selectedChild.id)
  .eq('status', 'completed')
  .eq('lesson_date', todayStr);

    if (error) {
      console.log('Free lesson limit check error:', error);
      return false;
    }

    const used = count || 0;

    setFreeLessonsUsedToday(used);

    if (used >= 1) {
      setDailyLimitReached(true);
      return true;
    }

    setDailyLimitReached(false);
    return false;
  }, [selectedChild?.id, isPro]);

  const loadLesson = useCallback(async () => {
    if (!selectedChild?.id) return;


    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    const requestCategory =
      selectedCategory || 'Communication';

    try {
      setStarted(false);
      setLoading(true);

      const limitReached =
        await checkFreeLessonLimit();

      if (limitReached) {
        setLessonData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const path = await getLearningPath(selectedChild.id);
    setLearningPath(path);

    const libraryCategory = mapAppCategoryToLibraryCategory(requestCategory);


if (USE_LIBRARY_LESSONS) {
  const skillAreaFilter = SKILL_PROGRESSION_PATHS[requestCategory];

  const normalizedSkillAreaFilter: string | undefined =
    Array.isArray(skillAreaFilter)
      ? skillAreaFilter[0]
      : skillAreaFilter;

  let stageFilter: number | undefined;
  let stageSkillArea: string | undefined;

  if (Array.isArray(skillAreaFilter) && skillAreaFilter.length > 0) {
    stageSkillArea = await getSmartRecommendedSkill(
      selectedChild.id,
      skillAreaFilter
    );

    if (stageSkillArea) {
      stageFilter = await getRecommendedStageForSkill({
        childId: selectedChild.id,
        category: requestCategory,
        skillArea: stageSkillArea,
      });
    }
  } else if (normalizedSkillAreaFilter) {
    stageSkillArea = normalizedSkillAreaFilter;

    stageFilter = await getRecommendedStageForSkill({
      childId: selectedChild.id,
      category: requestCategory,
      skillArea: normalizedSkillAreaFilter,
    });
  }

  const masteredSkills = await getMasteredSkills(selectedChild.id);

  const libraryLesson = await getRecommendedLesson({
    category: libraryCategory,
    skillArea: stageSkillArea,
    stageNumber: stageFilter,
    childId: selectedChild.id,
    excludeSkills: masteredSkills,
  });

  if (libraryLesson) {
    const mappedLesson = mapLibraryLessonToDailyLesson(libraryLesson);

    setLessonData(mappedLesson);

    const updatedPath = await getLearningPath(selectedChild.id);

    setLearningPath({
      ...updatedPath,
      nextFocus:
        mappedLesson.focus_skill ||
        mappedLesson.lesson_name,
      message:
        `Building ${
          mappedLesson.focus_skill ||
          mappedLesson.lesson_name
        } skills.`,
    });

    setLessonNumber(libraryLesson.stage_number || 1);
    setPreparingLesson(false);
    setLoading(false);
    setRefreshing(false);
    return;
  }
}

      const lessonRow = await getNextQueuedLesson({
        childId: selectedChild.id,
        childName,
        category: requestCategory,
        isPro,
      });

      if (loadRequestRef.current !== requestId) return;

      if (!lessonRow?.lesson_payload) {
  console.log('SCREEN: no lesson payload returned:', lessonRow);

  console.log('SCREEN: loading lesson for:', {
  childId: selectedChild.id,
  childName,
  category: requestCategory,
  isPro,
});

  setLessonData(null);

  ensureLessonQueue({
    childId: selectedChild.id,
    childName,
    category: requestCategory,
    isPro,
  }).catch((error) => {
    console.log('Background lesson preparation failed:', error);
  });

  if (retryTimerRef.current) {
    clearTimeout(retryTimerRef.current);
  }

  if (retryCountRef.current < 3) {
    setPreparingLesson(true);
    retryCountRef.current++;

    retryTimerRef.current = setTimeout(() => {
      void loadLesson();
    }, 5000);

    return;
  }

  setPreparingLesson(false);
  retryCountRef.current = 0;

  Alert.alert(
  'Lesson still preparing',
  'The app could not open a lesson yet. Please tap Check Again or restart the app.'
);
  return;
}

      const lesson = {
        ...lessonRow.lesson_payload,
        id: lessonRow.lesson_instance_id,
        lesson_summary:
  lessonRow.lesson_payload?.description ||
  lessonRow.lesson_payload?.goal ||
  lessonRow.lesson_payload?.parent_coaching_note ||
  null,
        lesson_number:
          lessonRow.lesson_number || 1,
        source: lessonRow.source || 'ai',
        focus_skill:
          lessonRow.lesson_payload?.focus_skill ||
          requestCategory,
        lesson_name: cleanLessonTitle(
          lessonRow.lesson_payload?.lesson_name,
          requestCategory
        ),
      };

      setLessonData(lesson);

    const updatedPath = await getLearningPath(selectedChild.id);

setLearningPath({
  ...updatedPath,
  nextFocus:
    lesson.focus_skill ||
    lesson.lesson_name ||
    'Building steady progress',
  message:
    `Building ${
      lesson.focus_skill ||
      lesson.lesson_name ||
      selectedCategory
    } skills.`,
});

      setLessonNumber(
        lesson.lesson_number || 1
      );

      ensureLessonQueue({
        childId: selectedChild.id,
        childName,
        category: requestCategory,
        isPro,
      }).catch((error) => {
        console.log(
          'Background lesson queue refill failed:',
          error
        );
      });
    } catch (error: any) {
      if (loadRequestRef.current !== requestId)
        return;

      if (
        error?.message
          ?.toLowerCase()
          .includes('limit')
      ) {
        setDailyLimitReached(true);
      } else {
        console.log('Lesson load error:', error);

        Alert.alert(
          'Lesson Loading Issue',
          'The app could not load a full lesson right now. Please pull down to refresh.'
        );
      }
    } finally {
      if (
        loadRequestRef.current === requestId
      ) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    selectedChild?.id,
    selectedCategory,
    childName,
    isPro,
    checkFreeLessonLimit,
  ]);

  const handleLogLesson = async (
    status: LessonStatus
  ) => {
    if (
      !selectedChild?.id ||
      !lessonData?.id
    ) {
      return;
    }

    try {
      setIsCompleting(true);

    if (lessonData?.library_lesson_id) {
  const todayStr = new Date().toISOString().split('T')[0];

  const performanceScore =
    status === 'success'
      ? completionRating * 20
      : 20;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    throw new Error('User not authenticated.');
  }

  const { data: insertedLesson, error } = await supabase
    .from('daily_lesson_instances')
    .insert({
      child_id: selectedChild.id,
      user_id: user.id,
      lesson_date: todayStr,
      category: selectedCategory,
      lesson_number:
        lessonData.stage_number ||
        lessonNumber ||
        1,
      lesson_payload: lessonData,
      source: 'library',
      status: 'started',
      library_lesson_id:
        lessonData.library_lesson_id,
      skill_area:
        lessonData.focus_skill || null,
      stage_number:
        lessonData.stage_number || null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  await completeLesson({
    lessonId: insertedLesson.id,
    childId: selectedChild.id,
    category: selectedCategory,
    performanceScore,
    promptLevel,
    behaviorResponse,
    consistencyLevel,
    status: status === 'success' ? 'completed' : 'unsuccessful',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  if (!isPro && status === 'success') {
    await AsyncStorage.setItem(
      getFreeLessonLockKey(selectedChild.id),
      'true'
    );

    setFreeLessonsUsedToday(1);
    setDailyLimitReached(true);
    setLessonData(null);
    setStarted(false);

    Alert.alert(
      'Today’s free lesson completed 🎉',
      'You’ve used your free lesson. Upgrade for unlimited access.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: () => router.push('/subscription'),
        },
      ]
    );

    return;
  }

  Alert.alert(
    status === 'success' ? 'Lesson Completed 🎉' : 'Lesson Saved',
    'A new lesson is ready.'
  );

  setStarted(false);
  setLessonData(null);
  setLessonNumber((prev) => prev + 1);

  setTimeout(() => {
    void loadLesson();
  }, 300);

  return;
}

      const performanceScore =
        status === 'success'
          ? completionRating * 20
          : 20;

      await completeLesson({
  lessonId: lessonData.id,
  childId: selectedChild.id,
  category: selectedCategory,
  performanceScore,
  promptLevel,
  behaviorResponse,
  consistencyLevel,
  status: status === 'success' ? 'completed' : 'unsuccessful',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

      if (
        !isPro &&
        status === 'success'
      ) {
        await AsyncStorage.setItem(
          getFreeLessonLockKey(
            selectedChild.id
          ),
          'true'
        );

        setFreeLessonsUsedToday(1);
        setDailyLimitReached(true);
        setLessonData(null);

        Alert.alert(
          'Today’s free lesson completed 🎉',
          'You’ve used your free lesson. Upgrade for unlimited access.',
          [
            {
              text: 'Later',
              style: 'cancel',
            },
            {
              text: 'Upgrade',
              onPress: () =>
                router.push(
                  '/subscription'
                ),
            },
          ]
        );

        return;
      }

      if (status === 'success') {
        ensureLessonQueue({
          childId: selectedChild.id,
          childName,
          category: selectedCategory,
          isPro,
        }).catch((error) => {
          console.log(
            'Lesson queue refill failed:',
            error
          );
        });
      }

      setStarted(false);

      setLessonData(null);

      setLessonNumber((prev) => prev + 1);

      setTimeout(() => {
        void loadLesson();
      }, 300);

      if (status === 'success') {
       Alert.alert(
  'Great Work 🎉',
  'Nice job supporting your child today. Your progress has been saved and the next lesson is ready.'
);
      }
    } catch (error: any) {
      console.log(
        'Complete lesson error:',
        error
      );

      Alert.alert(
        'Save Error',
        error?.message ||
          'Could not save lesson progress.'
      );
    } finally {
      setIsCompleting(false);
    }
  };

 const handleRefresh = async () => {
  retryCountRef.current = 0;

  if (retryTimerRef.current) {
    clearTimeout(retryTimerRef.current);
  }

  setRefreshing(true);
  await loadLesson();
};

  useEffect(() => {
  if (!selectedChild?.id) {
    setLoading(false);
    return;
  }

  void loadLesson();
}, [
  selectedChild?.id,
  selectedCategory,
  loadLesson,
]);

useEffect(() => {
  return () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }
  };
}, []);

 const lockedPreviewLessons =
  useMemo<LockedPreviewLesson[]>(() => {
    return [
      {
        id: '1',
        title: `Next ${selectedCategory} Practice`,
        subtitle: 'Personalized follow-up lesson',
      },
      {
        id: '2',
        title: `More Guided ${selectedCategory}`,
        subtitle: 'Build confidence with another step',
      },
      {
        id: '3',
        title: `Keep Building This Skill`,
        subtitle: 'Continue the learning path with Pro',
      },
    ];
  }, [selectedCategory]);

  const showLockedPreviews = !isPro;

  if (!selectedChild) {
    return <NoChildSelected />;
  }

  if (loading && !refreshing) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View
        pointerEvents="none"
        style={styles.screenGlowTop}
      />

      <View
        pointerEvents="none"
        style={styles.screenGlowMiddle}
      />

      <View
        pointerEvents="none"
        style={styles.screenGlowBottom}
      />

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        <ScreenHeader childName={childName} isPro={isPro} />

        {learningPath && (
  <LearningPathCard learningPath={learningPath} />
)}

        <CategorySelector
  selectedCategory={selectedCategory}
  onSelectCategory={(category) => {
    retryCountRef.current = 0;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    setStarted(false);
    setPreparingLesson(false);
    setLessonData(null);
    setSelectedCategory(category);
  }}
/>

        {!dailyLimitReached && !preparingLesson && !lessonData ? (
  <PreparingLessonCard
    selectedCategory={selectedCategory}
    onRefresh={() => void loadLesson()}
  />
) : dailyLimitReached ? (
          <DailyLimitView
            selectedCategory={
              selectedCategory
            }
            lockedPreviewLessons={
              lockedPreviewLessons
            }
            showLockedPreviews={
              showLockedPreviews
            }
            onUpgrade={() =>
              router.push(
                '/subscription'
              )
            }
            onRefresh={() =>
              void loadLesson()
            }
          />
        ) : preparingLesson ? (
  <PreparingLessonCard
    selectedCategory={selectedCategory}
    onRefresh={() => void loadLesson()}
  />
) : !started ? (
  <LessonStartCard
  lessonData={lessonData}
  selectedCategory={selectedCategory}
  childName={childName}
  onStart={() => setStarted(true)}
/>
        ) : (
          <GuidedLessonView
  lessonData={lessonData}
  lessonNumber={lessonNumber}
  selectedCategory={selectedCategory}
  childName={childName}
  completionRating={completionRating}
  setCompletionRating={setCompletionRating}
  promptLevel={promptLevel}
  setPromptLevel={setPromptLevel}
  behaviorResponse={behaviorResponse}
  setBehaviorResponse={setBehaviorResponse}
  consistencyLevel={consistencyLevel}
  setConsistencyLevel={setConsistencyLevel}
  isCompleting={isCompleting}
  onTryAgain={() => void handleLogLesson('unsuccessful')}
  onComplete={() => void handleLogLesson('success')}
  showLockedPreviews={showLockedPreviews}
  lockedPreviewLessons={lockedPreviewLessons}
  onUpgrade={() => router.push('/subscription')}
/>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LearningPathCard({ learningPath }: any) {
  return (
    <View style={styles.learningPathCard}>
      <View style={styles.learningPathHeader}>
        <View style={styles.learningPathIcon}>
          <Ionicons name="map-outline" size={20} color="#4F46E5" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.learningPathTitle}>
            Personalized Learning Path
          </Text>

          <Text style={styles.learningPathSubtitle}>
            Next focus: {learningPath?.nextFocus || 'Building steady progress'}
          </Text>
        </View>
      </View>

      {!!learningPath?.message && (
  <Text style={styles.learningPathText}>
    {learningPath.message}
  </Text>
)}

{typeof learningPath?.progressPercent === 'number' && (
  <View style={styles.learningProgressWrap}>
    <View style={styles.learningProgressTrack}>
      <View
        style={[
          styles.learningProgressFill,
          { width: `${learningPath.progressPercent}%` },
        ]}
      />
    </View>

    <Text style={styles.learningProgressText}>
      {learningPath.progressPercent}% path progress
    </Text>
  </View>
)}
    </View>
  );
}


function getBehaviorAwareMessage({
  promptLevel,
  behaviorResponse,
  consistencyLevel,
}: {
  promptLevel: string;
  behaviorResponse: string;
  consistencyLevel: string;
}) {
  if (behaviorResponse === 'frustrated') {
    return 'Your child may need a shorter activity, easier response, or a quick break before trying again.';
  }

  if (behaviorResponse === 'avoidant') {
    return 'Try using a more motivating item, simplify the instruction, and reinforce small attempts quickly.';
  }

  if (promptLevel === 'physical') {
    return 'Your child needed strong support today. Next time, try fading to a model or gesture when possible.';
  }

  if (consistencyLevel === 'low') {
    return 'Responses were inconsistent. Repeating this skill with the same routine may help build confidence.';
  }

  if (behaviorResponse === 'independent' || promptLevel === 'independent') {
    return 'Great independence today. Future lessons can gently increase variety or challenge.';
  }

  return 'Nice work. Keep the session short, positive, and reinforce successful attempts right away.';
}

function NoChildSelected() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <Ionicons name="book-outline" size={34} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No child selected</Text>
        <Text style={styles.emptyText}>
          Please select or create a child profile to view daily lessons.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading today’s lesson...</Text>
      </View>
    </SafeAreaView>
  );
}

function ScreenHeader({
  childName,
  isPro,
}: {
  childName: string;
  isPro: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Daily Lessons</Text>
          <Text style={styles.headerSubtitle}>
            Personalized ABA learning for {childName}
          </Text>
        </View>

        {isPro && (
          <View style={styles.proMiniBadge}>
            <Ionicons name="sparkles" size={13} color="#7C3AED" />
            <Text style={styles.proMiniBadgeText}>Pro</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function CategorySelector({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}) {
  return (
    <View style={styles.categoryWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SKILL_CATEGORIES.map((category) => {
          const active = selectedCategory === category;

          return (
            <AnimatedPressable
              key={category}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => onSelectCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  active && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function PreparingLessonCard({
  selectedCategory,
  onRefresh,
}: {
  selectedCategory: string;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.preparingCard}>
      <View pointerEvents="none" style={styles.preparingGlow} />

      <View style={styles.preparingIconWrap}>
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>

      <Text style={styles.preparingTitle}>Preparing your lesson</Text>

      <Text style={styles.preparingText}>
        We’re creating a full {selectedCategory} lesson with step-by-step parent guidance. This may take a moment the first time.
      </Text>

      <View style={styles.preparingMiniRow}>
        <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
        <Text style={styles.preparingMiniText}>
          Personalized lesson is being added to your queue
        </Text>
      </View>

      <AnimatedPressable style={styles.preparingRefreshButton} onPress={onRefresh}>
        <Text style={styles.preparingRefreshText}>Check Again</Text>
      </AnimatedPressable>
    </View>
  );
}

function DailyLimitView({
  selectedCategory,
  lockedPreviewLessons,
  showLockedPreviews,
  onUpgrade,
  onRefresh,
}: {
  selectedCategory: string;
  lockedPreviewLessons: LockedPreviewLesson[];
  showLockedPreviews: boolean;
  onUpgrade: () => void;
  onRefresh: () => void;
}) {
  return (
    <View>
      <View style={styles.limitCardPremium}>
        <View pointerEvents="none" style={styles.limitGlow} />

        <View style={styles.limitIconWrap}>
          <Ionicons name="lock-closed" size={28} color="#F59E0B" />
        </View>

        <Text style={styles.limitTitlePremium}>You’re done for today</Text>

        <Text style={styles.limitTextPremium}>
          You completed your free {selectedCategory} lesson. Pro unlocks unlimited daily lessons and continued practice.
        </Text>

        <AnimatedPressable style={styles.limitUpgradeButton} onPress={onUpgrade}>
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          <Text style={styles.limitUpgradeText}>Unlock Unlimited Lessons</Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.limitRefreshButton} onPress={onRefresh}>
          <Text style={styles.limitRefreshText}>Refresh</Text>
        </AnimatedPressable>
      </View>

      {showLockedPreviews && (
        <LockedPreviewSection
          title="Keep Learning with Pro"
          lockedPreviewLessons={lockedPreviewLessons}
          onUpgrade={onUpgrade}
        />
      )}
    </View>
  );
}


function LessonStartCard({
  lessonData,
  selectedCategory,
  onStart,
}: any) {
  const materials = Array.isArray(lessonData?.materials)
    ? lessonData.materials
    : [];

  return (
    <View>
      <LessonHero
  lessonData={lessonData}
  selectedCategory={selectedCategory}
/>

      <View style={styles.lessonOverviewCard}>
        <View style={styles.lessonOverviewHeader}>
          <View style={styles.lessonOverviewIcon}>
            <Ionicons name="compass-outline" size={22} color="#4F46E5" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.lessonOverviewTitle}>Lesson Overview</Text>
            <Text style={styles.lessonOverviewSubtitle}>
              Parent-led practice with gentle step-by-step guidance.
            </Text>
          </View>
        </View>

        <View style={styles.overviewPillRow}>
          <View style={styles.overviewPill}>
            <Ionicons name="time-outline" size={15} color="#6D28D9" />
            <Text style={styles.overviewPillText}>
              {lessonData?.estimated_minutes
                ? `${lessonData.estimated_minutes} min`
                : '5–10 min'}
            </Text>
          </View>

          <View style={styles.overviewPill}>
            <Ionicons name="heart-outline" size={15} color="#EA580C" />
            <Text style={styles.overviewPillText}>Parent-led</Text>
          </View>

          <View style={styles.overviewPill}>
            <Ionicons name="school-outline" size={15} color="#059669" />
            <Text style={styles.overviewPillText}>
              {lessonData?.focus_skill || selectedCategory}
            </Text>
          </View>
        </View>

        {materials.length > 0 && (
          <View style={styles.materialsCompactBox}>
            <Text style={styles.materialsCompactTitle}>Materials</Text>

            <Text style={styles.materialsCompactText}>
              {materials.slice(0, 3).map(formatLessonItem).join(' • ')}
            </Text>
          </View>
        )}

        {lessonData?.parent_coaching_note && (
          <View style={styles.coachPreviewBox}>
            <Ionicons name="bulb-outline" size={18} color="#7C3AED" />
            <Text style={styles.coachPreviewText}>
              {lessonData.parent_coaching_note}
            </Text>
          </View>
        )}

        <AnimatedPressable
          style={[
            styles.startLessonButton,
            !lessonData?.id && { opacity: 0.55 },
          ]}
          onPress={onStart}
          disabled={!lessonData?.id}
        >
          <Ionicons name="play" size={18} color="#FFFFFF" />
          <Text style={styles.startLessonButtonText}>Start Lesson</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function GuidedLessonView({
  lessonData,
  lessonNumber,
  selectedCategory,
  completionRating,
  setCompletionRating,
  promptLevel,
  setPromptLevel,
  behaviorResponse,
  setBehaviorResponse,
  consistencyLevel,
  setConsistencyLevel,
  isCompleting,
  onTryAgain,
  onComplete,
  showLockedPreviews,
  lockedPreviewLessons,
  onUpgrade,
}: any) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [lessonData?.id]);

  const rawSteps =
  Array.isArray(lessonData?.teaching_steps) && lessonData.teaching_steps.length > 0
    ? lessonData.teaching_steps
    : [
        'Set up the activity in a calm area.',
        'Give one clear instruction.',
        'Wait 3–5 seconds for a response.',
        'Prompt gently if needed.',
        'Reinforce any successful attempt right away.',
      ];

const steps = rawSteps
  .flatMap((step: any) => {
    const text = formatLessonItem(step);

    return text
      .split(/\n(?=\s*(?:\d+\.|\*\*Step|Step\s+\d+))/gi)
      .map((part) => part.trim())
      .filter(Boolean);
  })
  .filter(Boolean);

  const finishedSteps = stepIndex >= steps.length;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const progressPercent =
  steps.length > 0
    ? Math.min(((stepIndex + 1) / steps.length) * 100, 100)
    : 0;

  if (finishedSteps) {
  return (
    <View>
      <View style={styles.reviewHeroCard}>
  <View pointerEvents="none" style={styles.reviewHeroGlow} />
  <View pointerEvents="none" style={styles.reviewHeroGlowTwo} />

  <View style={styles.reviewHeroTopRow}>
    <View style={styles.reviewIconWrap}>
      <Ionicons name="checkmark-circle" size={30} color="#10B981" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.reviewHeroTitle}>Lesson complete</Text>
      <Text style={styles.reviewHeroText}>
        Save today’s session so the learning path can adjust.
      </Text>
    </View>
  </View>

  <View style={styles.masteryBox}>
    <View style={styles.masteryTopRow}>
      <Text style={styles.masteryLabel}>Learning Path Progress</Text>
      <Text style={styles.masteryPercent}>+1 lesson</Text>
    </View>

    <View style={styles.masteryTrack}>
      <View
  style={[
    styles.masteryFill,
    {
      width: `${Math.min(completionRating * 20, 100)}%`,
    },
  ]}
/>
    </View>

    <Text style={styles.masteryText}>
      This lesson helps build consistency with {lessonData?.focus_skill || selectedCategory}.
    </Text>
  </View>

        <View style={styles.reviewMiniRow}>
          <View style={styles.reviewMiniChip}>
            <Ionicons name="time-outline" size={14} color="#047857" />
            <Text style={styles.reviewMiniText}>Lesson finished</Text>
          </View>

          <View style={styles.reviewMiniChip}>
            <Ionicons name="analytics-outline" size={14} color="#047857" />
            <Text style={styles.reviewMiniText}>Ready to log</Text>
          </View>
        </View>
      </View>

      <RatingCard
        completionRating={completionRating}
        setCompletionRating={setCompletionRating}
      />

      <BehaviorCheckCard
        promptLevel={promptLevel}
        setPromptLevel={setPromptLevel}
        behaviorResponse={behaviorResponse}
        setBehaviorResponse={setBehaviorResponse}
        consistencyLevel={consistencyLevel}
        setConsistencyLevel={setConsistencyLevel}
      />

      <BehaviorMessageCard
        promptLevel={promptLevel}
        behaviorResponse={behaviorResponse}
        consistencyLevel={consistencyLevel}
        message={getBehaviorAwareMessage({
          promptLevel,
          behaviorResponse,
          consistencyLevel,
        })}
      />

      <CompletionButtons
        isCompleting={isCompleting}
        onTryAgain={onTryAgain}
        onComplete={onComplete}
      />

      {showLockedPreviews && (
        <>
          <ProUnlockCard onUpgrade={onUpgrade} />
          <LockedPreviewSection
            title="Blurred Upcoming Lessons"
            lockedPreviewLessons={lockedPreviewLessons}
            onUpgrade={onUpgrade}
          />
        </>
      )}
    </View>
  );
}

  return (
    <View>
      <CompactLessonHeader
  lessonData={lessonData}
  selectedCategory={selectedCategory}
/>
        

      <View style={styles.guidedProgressCard}>
        <View style={styles.guidedProgressTop}>
          <Text style={styles.guidedProgressLabel}>
            Step {stepIndex + 1} of {steps.length}
          </Text>
          <Text style={styles.guidedProgressPercent}>
            {Math.round(progressPercent)}%
          </Text>
        </View>

        <View style={styles.guidedProgressTrack}>
          <View
            style={[
              styles.guidedProgressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
      </View>

      <FadeInView key={stepIndex} delay={40}>
  <View style={styles.guidedStepCard}>
        <View style={styles.guidedStepHeader}>
          <View style={styles.guidedStepNumber}>
            <Text style={styles.guidedStepNumberText}>{stepIndex + 1}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.guidedStepTitle}>🎯 Current Step</Text>
            <Text style={styles.guidedStepSubtitle}>
  Follow this step at your child’s pace.
</Text>
          </View>
        </View>

        <FormattedLessonStep text={formatLessonItem(steps[stepIndex])} />
        </View>
</FadeInView>

      <View style={styles.guidedNavRow}>
        <AnimatedPressable
          style={[
            styles.guidedBackButton,
            isFirstStep && styles.guidedDisabledButton,
          ]}
          onPress={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
          disabled={isFirstStep}
        >
          <Text
            style={[
              styles.guidedBackButtonText,
              isFirstStep && styles.guidedDisabledText,
            ]}
          >
            Back
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.guidedNextButton}
          onPress={() => setStepIndex((prev) => prev + 1)}
        >
          <Text style={styles.guidedNextButtonText}>
            {isLastStep ? 'Review Lesson' : 'Next Step'}
          </Text>

          <Ionicons
            name={isLastStep ? 'checkmark-circle-outline' : 'arrow-forward'}
            size={18}
            color="#FFFFFF"
          />
        </AnimatedPressable>
      </View>

      <AnimatedPressable style={styles.tryLaterLink} onPress={onTryAgain}>
        <Text style={styles.secondaryButtonPremiumText}>
  Save as Needs More Practice
</Text>
      </AnimatedPressable>
    </View>
  );
}

function FormattedLessonStep({ text }: { text: string }) {
  const cleaned = text
    ?.replace(/\*\*/g, '')
    ?.replace(/\*/g, '')
    ?.replace(/^\d+\.\s*/g, '')
    ?.replace(/Parent says:/gi, '\nParent says:')
    ?.replace(/Parent does:/gi, '\nParent does:')
    ?.replace(/Child should do:/gi, '\nChild should do:')
    ?.replace(/Child does:/gi, '\nChild does:')
    ?.replace(/Prompt:/gi, '\nPrompt:')
    ?.replace(/Reinforce:/gi, '\nReinforce:')
    ?.trim();

  const sections = cleaned
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <View>
      {sections.map((section, index) => {
        const lower = section.toLowerCase();

        let label = '';
        let content = '';
        let labelColor = '#111827';

        const stepMatch = section.match(/^(Step\s+\d+:)/i);

        if (stepMatch) {
          const stepLabel = stepMatch[1];
          const remaining = section.replace(stepLabel, '').trim();

          return (
            <Text key={index} style={styles.guidedStepParagraph}>
              <Text style={styles.guidedBlackStepLabel}>
                {stepLabel + ' '}
              </Text>
              <Text>{remaining}</Text>
            </Text>
          );
        }

        if (lower.startsWith('parent says:')) {
          label = 'Parent says:';
          content = section.replace(/parent says:/i, '').trim();
          labelColor = '#7C3AED';
        } else if (lower.startsWith('parent does:')) {
          label = 'Parent does:';
          content = section.replace(/parent does:/i, '').trim();
          labelColor = '#2563EB';
        } else if (lower.startsWith('child does:') || lower.startsWith('child should do:')) {
          label = lower.startsWith('child should do:') ? 'Child should do:' : 'Child does:';
          content = section
            .replace(/child does:/i, '')
            .replace(/child should do:/i, '')
            .trim();
          labelColor = '#059669';
        } else if (lower.startsWith('prompt:')) {
          label = 'Prompt:';
          content = section.replace(/prompt:/i, '').trim();
          labelColor = '#EA580C';
        } else if (lower.startsWith('reinforce:')) {
          label = 'Reinforce:';
          content = section.replace(/reinforce:/i, '').trim();
          labelColor = '#DB2777';
        } else {
          return (
            <Text key={index} style={styles.guidedStepParagraph}>
              {section}
            </Text>
          );
        }

        return (
          <Text key={index} style={styles.guidedStepParagraph}>
            <Text style={[styles.guidedInlineLabel, { color: labelColor }]}>
              {label + ' '}
            </Text>
            <Text>{content}</Text>
          </Text>
        );
      })}
    </View>
  );
}

function LessonHero({ lessonData, selectedCategory }: any) {
  return (
    <FadeInView delay={80}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <View style={styles.heroGlowThree} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>✨ TODAY'S PERSONALIZED LESSON</Text>
          </View>

          <View style={styles.heroSparkleIcon}>
            <Ionicons name="book-outline" size={19} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {cleanLessonTitle(lessonData?.lesson_name, selectedCategory)}
        </Text>

        {!!lessonData?.lesson_summary && (
          <Text style={styles.heroDesc} numberOfLines={3}>
            {lessonData.lesson_summary}
          </Text>
        )}

        <View style={styles.heroChipRow}>
          <View style={styles.heroMiniChip}>
            <Ionicons name="time-outline" size={13} color="#FFFFFF" />
            <Text style={styles.heroMiniChipText}>
              {lessonData?.estimated_minutes
                ? `${lessonData.estimated_minutes} min`
                : '5–10 min'}
            </Text>
          </View>

          <View style={styles.heroMiniChip}>
            <Ionicons name="home-outline" size={13} color="#FFFFFF" />
            <Text style={styles.heroMiniChipText}>At home</Text>
          </View>

          <View style={styles.heroMiniChip}>
            <Ionicons name="heart-outline" size={13} color="#FFFFFF" />
            <Text style={styles.heroMiniChipText}>Parent-led</Text>
          </View>
        </View>
      </View>
    </FadeInView>
  );
}

function CompactLessonHeader({ lessonData, selectedCategory }: any) {
  return (
    <View style={styles.compactLessonHeader}>
      <View style={styles.compactLessonIcon}>
        <Ionicons name="book-outline" size={18} color="#4F46E5" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.compactLessonTitle} numberOfLines={1}>
          {cleanLessonTitle(lessonData?.lesson_name, selectedCategory)}
        </Text>

        <Text style={styles.compactLessonSubtitle} numberOfLines={1}>
          {lessonData?.focus_skill || selectedCategory} ·{' '}
          {lessonData?.estimated_minutes
            ? `${lessonData.estimated_minutes} min`
            : '5–10 min'}{' '}
          · Parent-led
        </Text>
      </View>
    </View>
  );
}

function BehaviorMessageCard({
  message,
  promptLevel,
  behaviorResponse,
  consistencyLevel,
}: {
  message: string;
  promptLevel: string;
  behaviorResponse: string;
  consistencyLevel: string;
}) {
  let icon: keyof typeof Ionicons.glyphMap = 'bulb-outline';
  let title = 'Helpful Next Step';

  if (behaviorResponse === 'frustrated') {
    icon = 'heart-outline';
    title = 'Support Needed';
  } else if (behaviorResponse === 'avoidant') {
    icon = 'compass-outline';
    title = 'Try a Gentler Approach';
  } else if (behaviorResponse === 'independent' || promptLevel === 'independent') {
    icon = 'sparkles-outline';
    title = 'Building Independence';
  } else if (consistencyLevel === 'low') {
    icon = 'repeat-outline';
    title = 'Practice May Help';
  }

  return (
    <View style={styles.behaviorMessagePremiumCard}>
      <View style={styles.behaviorMessageIconWrap}>
        <Ionicons name={icon} size={20} color="#7C3AED" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.behaviorMessagePremiumTitle}>{title}</Text>

        <Text style={styles.behaviorMessagePremiumText}>
          {message}
        </Text>
      </View>
    </View>
  );
}

function formatLessonItem(item: any): string {
  if (typeof item === 'string') return item;
  if (item?.type && item?.description) return `${item.type}: ${item.description}`;
  if (item?.context && item?.description) return `${item.context}: ${item.description}`;
  if (item?.title && item?.description) return `${item.title}: ${item.description}`;
  return String(item ?? '');
}

function RatingCard({ completionRating, setCompletionRating }: any) {
  const labels: Record<number, string> = {
    1: 'Very hard',
    2: 'Hard',
    3: 'Okay',
    4: 'Good',
    5: 'Great',
  };

  return (
    <View style={styles.ratingCardPremium}>
      <View style={styles.ratingHeaderRow}>
        <View style={styles.ratingIconWrap}>
          <Ionicons name="analytics-outline" size={20} color="#4F46E5" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.ratingTitlePremium}>How did this lesson go?</Text>
          <Text style={styles.ratingSubtitlePremium}>
            Choose the number that best matches today.
          </Text>
        </View>
      </View>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const active = completionRating === rating;

          return (
            <AnimatedPressable
              key={rating}
              style={[
                styles.ratingButtonPremium,
                active && styles.ratingButtonPremiumActive,
              ]}
              onPress={() => setCompletionRating(rating)}
            >
              <Text
                style={[
                  styles.ratingButtonTextPremium,
                  active && styles.ratingButtonTextPremiumActive,
                ]}
              >
                {rating}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.ratingSelectedBox}>
        <Text style={styles.ratingSelectedLabel}>Selected</Text>
        <Text style={styles.ratingSelectedValue}>
          {completionRating}/5 · {labels[completionRating]}
        </Text>
      </View>
    </View>
  );
}

function BehaviorCheckCard({
  promptLevel,
  setPromptLevel,
  behaviorResponse,
  setBehaviorResponse,
  consistencyLevel,
  setConsistencyLevel,
}: any) {
  return (
    <View style={styles.behaviorPremiumCard}>
      <View style={styles.behaviorPremiumHeader}>
        <View style={styles.behaviorPremiumIcon}>
          <Ionicons
            name="pulse-outline"
            size={20}
            color="#4F46E5"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.behaviorPremiumTitle}>
            Session Insights
          </Text>

          <Text style={styles.behaviorPremiumSubtitle}>
            This helps future lessons adapt to your child’s needs.
          </Text>
        </View>
      </View>

      <BehaviorChipGroup
        label="Prompting Needed"
        value={promptLevel}
        options={[
          'independent',
          'verbal',
          'gestural',
          'model',
          'physical',
        ]}
        onChange={setPromptLevel}
      />

      <BehaviorChipGroup
        label="Child's Response"
        value={behaviorResponse}
        options={[
          'engaged',
          'avoidant',
          'frustrated',
          'independent',
        ]}
        onChange={setBehaviorResponse}
      />

      <BehaviorChipGroup
        label="Consistency"
        value={consistencyLevel}
        options={['high', 'medium', 'low']}
        onChange={setConsistencyLevel}
      />
    </View>
  );
}

function BehaviorChipGroup({ label, value, options, onChange }: any) {
  return (
    <>
      <Text style={styles.behaviorLabel}>{label}</Text>
      <View style={styles.behaviorChipRow}>
        {options.map((item: string) => {
          const active = value === item;
          return (
            <AnimatedPressable
              key={item}
              style={[styles.behaviorChip, active && styles.behaviorChipActive]}
              onPress={() => onChange(item)}
            >
              <Text style={[styles.behaviorChipText, active && styles.behaviorChipTextActive]}>
                {item}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </>
  );
}

function CompletionButtons({ isCompleting, onTryAgain, onComplete }: any) {
  return (
    <View style={styles.completionSection}>
      <View style={styles.completionHeader}>
        <Text style={styles.completionTitle}>
          Finish This Lesson
        </Text>

        <Text style={styles.completionSubtitle}>
          Save today’s progress and prepare the next lesson.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <AnimatedPressable
          style={styles.secondaryButtonPremium}
          onPress={onTryAgain}
          disabled={isCompleting}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color="#475569"
          />

          <Text style={styles.secondaryButtonPremiumText}>
  Save as Needs More Practice
</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.primaryButtonPremium}
          onPress={onComplete}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.primaryButtonInner}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonPremiumText}>
                Complete Lesson
              </Text>
            </View>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}

function ProUnlockCard({ onUpgrade }: any) {
  return (
    <View style={styles.peekSection}>
      <View style={styles.peekHeader}>
        <Text style={styles.peekTitle}>What unlocks with Pro</Text>
        <TouchableOpacity onPress={onUpgrade}>
          <Text style={styles.peekLink}>See Pro</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.proUnlockCard}>
        {['Unlimited daily lessons', 'Full access to upcoming lessons', 'More guided practice and progression'].map((text) => (
          <View key={text} style={styles.proUnlockRow}>
            <Ionicons name="checkmark-circle" size={18} color="#7C3AED" />
            <Text style={styles.proUnlockText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LockedPreviewSection({ title, lockedPreviewLessons, onUpgrade }: any) {
  return (
    <View style={styles.lockedSection}>
      <Text style={styles.lockedSectionTitle}>{title}</Text>

      {lockedPreviewLessons.map((item: any) => (
        <AnimatedPressable
          key={item.id}
          style={styles.lockedLessonCard}
          onPress={onUpgrade}
        >
          <View style={styles.lockedIconCircle}>
            <Ionicons name="lock-closed" size={18} color="#7C3AED" />
          </View>

          <View style={styles.lockedLessonContent}>
            <Text style={styles.lockedBadgeText}>PRO LESSON</Text>
            <Text style={styles.lockedLessonTitle}>{item.title}</Text>
            <Text style={styles.lockedLessonSubtitle}>{item.subtitle}</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
        </AnimatedPressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  premiumStartCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 18,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 3,
},

premiumStartGlow: {
  position: 'absolute',
  width: 150,
  height: 150,
  borderRadius: 75,
  backgroundColor: 'rgba(79,70,229,0.06)',
  top: -70,
  right: -50,
},

premiumStartGlowTwo: {
  position: 'absolute',
  width: 130,
  height: 130,
  borderRadius: 65,
  backgroundColor: 'rgba(16,185,129,0.05)',
  bottom: -70,
  left: -45,
},

premiumStartHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},

premiumIconCircle: {
  width: 44,
  height: 44,
  borderRadius: 16,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 11,
},

premiumStartTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#0F172A',
},

premiumStartSubtitle: {
  marginTop: 3,
  fontSize: 12.5,
  color: '#64748B',
  lineHeight: 18,
  fontWeight: '700',
},
  quickInfoRow: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 14,
},

quickInfoCard: {
  flex: 1,
  backgroundColor: '#F8FAFC',
  borderRadius: 16,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

quickInfoLabel: {
  marginTop: 6,
  fontSize: 11,
  fontWeight: '800',
  color: '#64748B',
},

quickInfoValue: {
  marginTop: 1,
  fontSize: 13,
  fontWeight: '900',
  color: '#0F172A',
},

  previewSection: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 10,
  },
  previewBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  previewBulletText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
    fontWeight: '600',
  },
  coachPreviewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  coachPreviewText: {
    flex: 1,
    marginLeft: 8,
    color: '#5B21B6',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  
  startLessonButton: {
  backgroundColor: '#5B3FF4',
  borderRadius: 17,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
},

startLessonButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '900',
  marginLeft: 8,
},

  guidedProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  guidedProgressLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '800',
  },
  guidedProgressPercent: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '800',
  },
  guidedProgressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  guidedProgressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 999,
  },

guidedStepHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},

guidedProgressCard: {
  backgroundColor: '#EEF2FF',
  borderRadius: 20,
  padding: 16,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#C7D2FE',
},

guidedStepCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E0E7FF',
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
},

guidedStepNumber: {
  width: 44,
  height: 44,
  borderRadius: 14,
  backgroundColor: '#5B3FF4',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

guidedStepTitle: {
  fontSize: 18,
  color: '#0F172A',
  fontWeight: '900',
},

guidedStepSubtitle: {
  marginTop: 2,
  fontSize: 12.5,
  color: '#64748B',
  lineHeight: 18,
  fontWeight: '700',
},

guidedStepParagraph: {
  fontSize: 19,
  lineHeight: 30,
  color: '#475569',
  fontWeight: '700',
  marginBottom: 12,
},

guidedStepNumberText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '900',
},

 guidedNavRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
},

guidedBackButton: {
  width: 110,
  backgroundColor: '#FFFFFF',
  borderRadius: 18,
  paddingVertical: 16,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#CBD5E1',
},

guidedNextButton: {
  width: 170,
  backgroundColor: '#4F46E5',
  borderRadius: 18,
  paddingVertical: 16,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
},
  guidedBackButtonText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },
  
  guidedNextButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
  },
 guidedDisabledButton: {
  opacity: 0.28,
  backgroundColor: '#F8FAFC',
},
 guidedDisabledText: {
  color: '#CBD5E1',
},
  tryLaterLink: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  tryLaterLinkText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 13,
  },
  container: {
  flex: 1,
  backgroundColor: '#F7F8FC',
},

scrollContent: {
  padding: 20,
  paddingBottom: 105,
},
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 14 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },

  header: {
  marginBottom: 14,
},

headerTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: '#0F172A',
  letterSpacing: -0.7,
},

headerSubtitle: {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
  color: '#64748B',
},


  categoryWrap: {
  marginBottom: 12,
},

categoryChip: {
  backgroundColor: '#FFFFFF',
  paddingVertical: 8,
  paddingHorizontal: 13,
  borderRadius: 15,
  marginRight: 8,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

categoryChipText: {
  color: '#475569',
  fontWeight: '800',
  fontSize: 11.5,
},

categoryChipActive: {
  backgroundColor: '#5B3FF4',
  borderColor: '#5B3FF4',
},

categoryChipTextActive: {
  color: '#FFFFFF',
},

heroCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#5B3FF4',
  borderRadius: 30,
  padding: 20,
  marginBottom: 14,
  minHeight: 205,
  shadowColor: '#5B3FF4',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.2,
  shadowRadius: 20,
  elevation: 5,
},

heroGlowOne: {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: 'rgba(255,255,255,0.12)',
  top: -80,
  right: -55,
},

heroGlowTwo: {
  position: 'absolute',
  width: 140,
  height: 140,
  borderRadius: 70,
  backgroundColor: 'rgba(196,181,253,0.22)',
  bottom: -70,
  left: -45,
},

heroTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
},

heroBadge: {
  backgroundColor: 'rgba(255,255,255,0.18)',
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderRadius: 14,
},

heroBadgeText: {
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '900',
  letterSpacing: 0.6,
},

heroSparkleIcon: {
  width: 36,
  height: 36,
  borderRadius: 14,
  backgroundColor: 'rgba(255,255,255,0.18)',
  alignItems: 'center',
  justifyContent: 'center',
},

heroTitle: {
  color: '#FFFFFF',
  fontSize: 23,
  lineHeight: 29,
  fontWeight: '900',
  marginBottom: 8,
  letterSpacing: -0.5,
},

heroDesc: {
  color: '#EDE9FE',
  fontSize: 13.5,
  lineHeight: 21,
  fontWeight: '700',
  marginBottom: 4,
},


summaryCard: {
  width: '48%',
  borderRadius: 18,
  paddingVertical: 12,
  paddingHorizontal: 13,
},

summaryLabel: {
  fontSize: 11,
  color: '#64748B',
  fontWeight: '800',
  marginBottom: 3,
},

summaryValue: {
  fontSize: 14,
  color: '#0F172A',
  fontWeight: '900',
},

  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },

  behaviorLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginTop: 10, marginBottom: 8 },
  behaviorChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  behaviorChip: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  behaviorChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  behaviorChipText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  behaviorChipTextActive: { color: '#FFFFFF' },

  behaviorMessagePremiumCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 18,
  marginBottom: 18,
  flexDirection: 'row',
  alignItems: 'flex-start',
  borderWidth: 1,
  borderColor: '#DDD6FE',
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 2,
},

behaviorMessageIconWrap: {
  width: 44,
  height: 44,
  borderRadius: 16,
  backgroundColor: '#F5F3FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

behaviorMessagePremiumTitle: {
  fontSize: 15,
  fontWeight: '900',
  color: '#312E81',
  marginBottom: 5,
},

behaviorMessagePremiumText: {
  color: '#5B21B6',
  fontSize: 13,
  lineHeight: 20,
  fontWeight: '700',
},

  buttonRow: {
  gap: 12,
  marginBottom: 18,
},
  
  primaryButtonInner: { flexDirection: 'row', alignItems: 'center' },


  limitTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 12 },
  limitText: { textAlign: 'center', color: '#64748B', lineHeight: 21, fontSize: 14 },
  upgradeBtn: { marginTop: 16, backgroundColor: '#4F46E5', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16 },
  upgradeText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryLimitBtn: { marginTop: 10, backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
  secondaryLimitBtnText: { color: '#475569', fontWeight: '800' },

  peekSection: { marginBottom: 18 },
  peekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  peekTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  peekLink: { color: '#4F46E5', fontWeight: '800', fontSize: 13 },
  proUnlockCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18 },
  proUnlockRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  proUnlockText: { marginLeft: 10, color: '#334155', fontWeight: '700', fontSize: 14 },

  lockedLessonCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  marginBottom: 12,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E9D5FF',
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 2,
},

lockedIconCircle: {
  width: 46,
  height: 46,
  borderRadius: 16,
  backgroundColor: '#F3E8FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

lockedLessonContent: {
  flex: 1,
},

lockedBadgeText: {
  color: '#7C3AED',
  fontWeight: '900',
  fontSize: 10,
  letterSpacing: 0.5,
},

lockedLessonTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#1E293B',
  marginTop: 5,
},

lockedLessonSubtitle: {
  color: '#64748B',
  lineHeight: 19,
  fontSize: 13,
  fontWeight: '700',
  marginTop: 3,
},

lockedSection: {
  marginBottom: 18,
},

lockedSectionTitle: {
  fontSize: 16,
  fontWeight: '900',
  color: '#1E293B',
  marginBottom: 12,
},

screenGlowTop: {
  position: 'absolute',
  width: 260,
  height: 260,
  borderRadius: 130,
  backgroundColor: 'rgba(79,70,229,0.07)',
  top: -120,
  right: -80,
},

screenGlowMiddle: {
  position: 'absolute',
  width: 230,
  height: 230,
  borderRadius: 115,
  backgroundColor: 'rgba(14,165,233,0.05)',
  top: 330,
  left: -120,
},

screenGlowBottom: {
  position: 'absolute',
  width: 260,
  height: 260,
  borderRadius: 130,
  backgroundColor: 'rgba(168,85,247,0.05)',
  bottom: -120,
  right: -100,
},

proBannerPremium: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  paddingVertical: 10,
  paddingHorizontal: 12,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#E9D5FF',
},

proBannerGlow: {
  position: 'absolute',
  width: 170,
  height: 170,
  borderRadius: 85,
  backgroundColor: 'rgba(124,58,237,0.08)',
  top: -80,
  right: -60,
},

proBannerTop: {
  flexDirection: 'row',
  alignItems: 'center',
},

proBannerIconWrap: {
  width: 36,
  height: 36,
  borderRadius: 12,
  backgroundColor: '#F5F3FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},

limitCardPremium: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: 30,
  padding: 24,
  alignItems: 'center',
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#FED7AA',
  shadowColor: '#F59E0B',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
},

limitGlow: {
  position: 'absolute',
  width: 190,
  height: 190,
  borderRadius: 95,
  backgroundColor: 'rgba(245,158,11,0.10)',
  top: -90,
  right: -70,
},

limitIconWrap: {
  width: 64,
  height: 64,
  borderRadius: 22,
  backgroundColor: '#FFFBEB',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 14,
},

limitTitlePremium: {
  fontSize: 22,
  fontWeight: '900',
  color: '#0F172A',
  textAlign: 'center',
},

limitTextPremium: {
  marginTop: 8,
  textAlign: 'center',
  color: '#64748B',
  lineHeight: 22,
  fontSize: 14,
  fontWeight: '700',
},

limitUpgradeButton: {
  marginTop: 18,
  backgroundColor: '#4F46E5',
  borderRadius: 18,
  paddingVertical: 15,
  paddingHorizontal: 20,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
},

limitUpgradeText: {
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 14,
  marginLeft: 8,
},

limitRefreshButton: {
  marginTop: 12,
  paddingVertical: 12,
  paddingHorizontal: 18,
},

limitRefreshText: {
  color: '#64748B',
  fontWeight: '800',
  fontSize: 13,
},

reviewHeroCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 18,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#BBF7D0',
  shadowColor: '#10B981',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
},

reviewHeroGlow: {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: 'rgba(16,185,129,0.10)',
  top: -90,
  right: -60,
},

reviewHeroGlowTwo: {
  position: 'absolute',
  width: 140,
  height: 140,
  borderRadius: 70,
  backgroundColor: 'rgba(79,70,229,0.06)',
  bottom: -70,
  left: -50,
},

reviewHeroTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

reviewIconWrap: {
  width: 58,
  height: 58,
  borderRadius: 20,
  backgroundColor: '#ECFDF5',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

reviewHeroTitle: {
  fontSize: 21,
  fontWeight: '900',
  color: '#064E3B',
},

reviewHeroText: {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 20,
  color: '#047857',
  fontWeight: '700',
},

reviewMiniRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 16,
},

reviewMiniChip: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ECFDF5',
  borderRadius: 999,
  paddingVertical: 8,
  paddingHorizontal: 11,
},

reviewMiniText: {
  marginLeft: 6,
  fontSize: 11,
  fontWeight: '900',
  color: '#047857',
},

ratingCardPremium: {
  backgroundColor: '#FFFBEB',
  borderRadius: 26,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#FDE68A',
},

ratingHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 18,
},

ratingIconWrap: {
  width: 48,
  height: 48,
  borderRadius: 16,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

ratingTitlePremium: {
  fontSize: 17,
  fontWeight: '900',
  color: '#0F172A',
},

ratingSubtitlePremium: {
  marginTop: 4,
  fontSize: 13,
  color: '#64748B',
  lineHeight: 19,
  fontWeight: '600',
},

ratingButtonPremium: {
  width: 50,
  height: 50,
  borderRadius: 18,
  backgroundColor: '#F8FAFC',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

ratingButtonPremiumActive: {
  backgroundColor: '#4F46E5',
  borderColor: '#4F46E5',
},

ratingButtonTextPremium: {
  color: '#475569',
  fontWeight: '900',
  fontSize: 15,
},

ratingButtonTextPremiumActive: {
  color: '#FFFFFF',
},

ratingSelectedBox: {
  marginTop: 18,
  backgroundColor: '#F8FAFC',
  borderRadius: 18,
  padding: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

ratingSelectedLabel: {
  fontSize: 11,
  fontWeight: '900',
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},

ratingSelectedValue: {
  marginTop: 4,
  fontSize: 15,
  fontWeight: '900',
  color: '#0F172A',
},

behaviorPremiumCard: {
  backgroundColor: '#F8FAFC',
  borderRadius: 28,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.04,
  shadowRadius: 14,
  elevation: 2,
},

behaviorPremiumHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 18,
},

behaviorPremiumIcon: {
  width: 48,
  height: 48,
  borderRadius: 16,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

behaviorPremiumTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#0F172A',
},

behaviorPremiumSubtitle: {
  marginTop: 4,
  fontSize: 13,
  color: '#64748B',
  lineHeight: 19,
  fontWeight: '600',
},

completionSection: {
  backgroundColor: '#EEF2FF',
  borderRadius: 28,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#C7D2FE',
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 2,
},

completionHeader: {
  marginBottom: 18,
},

completionTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#0F172A',
},

completionSubtitle: {
  marginTop: 5,
  fontSize: 13,
  lineHeight: 20,
  color: '#64748B',
  fontWeight: '600',
},

secondaryButtonPremium: {
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  paddingVertical: 16,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  borderWidth: 1,
  borderColor: '#CBD5E1',
},

secondaryButtonPremiumText: {
  marginLeft: 8,
  color: '#475569',
  fontWeight: '800',
  fontSize: 14,
},

primaryButtonPremium: {
  width: '100%',
  backgroundColor: '#4F46E5',
  borderRadius: 20,
  paddingVertical: 16,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.22,
  shadowRadius: 14,
  elevation: 4,
},

primaryButtonPremiumText: {
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 14,
  marginLeft: 8,
},

heroMoreButton: {
  marginTop: 10,
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.16)',
  paddingVertical: 7,
  paddingHorizontal: 12,
  borderRadius: 999,
},

heroMoreText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '900',
  marginRight: 4,
},

heroChipRow: {
  flexDirection: 'row',
  gap: 7,
  marginTop: 8,
},

heroMiniChip: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.16)',
  paddingVertical: 7,
  paddingHorizontal: 10,
  borderRadius: 999,
},

heroMiniChipText: {
  marginLeft: 5,
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: '900',
},

singleSummaryWrap: {
  marginBottom: 14,
},

guidedInlineLabel: {
  fontWeight: '900',
},

guidedBlackStepLabel: {
  color: '#111827',
  fontWeight: '900',
},

preparingCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: 30,
  padding: 24,
  alignItems: 'center',
  marginTop: 8,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#DDD6FE',
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
},

preparingGlow: {
  position: 'absolute',
  width: 190,
  height: 190,
  borderRadius: 95,
  backgroundColor: 'rgba(124,58,237,0.08)',
  top: -90,
  right: -70,
},

preparingIconWrap: {
  width: 64,
  height: 64,
  borderRadius: 22,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 14,
},

preparingTitle: {
  fontSize: 22,
  fontWeight: '900',
  color: '#0F172A',
  textAlign: 'center',
},

preparingText: {
  marginTop: 8,
  textAlign: 'center',
  color: '#64748B',
  lineHeight: 22,
  fontSize: 14,
  fontWeight: '700',
},

preparingMiniRow: {
  marginTop: 16,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F5F3FF',
  borderRadius: 999,
  paddingVertical: 9,
  paddingHorizontal: 13,
},

preparingMiniText: {
  marginLeft: 7,
  color: '#6D28D9',
  fontSize: 12,
  fontWeight: '800',
},

preparingRefreshButton: {
  marginTop: 18,
  backgroundColor: '#4F46E5',
  borderRadius: 18,
  paddingVertical: 14,
  paddingHorizontal: 20,
  width: '100%',
  alignItems: 'center',
},

preparingRefreshText: {
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 14,
},

learningPathCard: {
  backgroundColor: '#F5F3FF',
  borderRadius: 24,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#DDD6FE',
},

learningPathHeader: {
  flexDirection: 'row',
  alignItems: 'center',
},

learningPathIcon: {
  width: 42,
  height: 42,
  borderRadius: 14,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

learningPathTitle: {
  fontSize: 15,
  fontWeight: '900',
  color: '#0F172A',
},

learningPathSubtitle: {
  marginTop: 3,
  fontSize: 12.5,
  color: '#64748B',
  fontWeight: '700',
},

learningPathText: {
  marginTop: 12,
  fontSize: 13,
  lineHeight: 20,
  color: '#5B21B6',
  fontWeight: '700',
},

headerTopRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
},

proMiniBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F5F3FF',
  borderWidth: 1,
  borderColor: '#DDD6FE',
  borderRadius: 999,
  paddingVertical: 6,
  paddingHorizontal: 10,
  marginTop: 4,
  marginLeft: 10,
},

proMiniBadgeText: {
  marginLeft: 4,
  fontSize: 11,
  fontWeight: '900',
  color: '#6D28D9',
},

learningProgressWrap: {
  marginTop: 14,
},

learningProgressTrack: {
  height: 8,
  backgroundColor: '#E0E7FF',
  borderRadius: 999,
  overflow: 'hidden',
},

learningProgressFill: {
  height: '100%',
  backgroundColor: '#4F46E5',
  borderRadius: 999,
},

learningProgressText: {
  marginTop: 7,
  fontSize: 12,
  fontWeight: '800',
  color: '#4F46E5',
},

lessonOverviewCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 18,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E0E7FF',
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
},

lessonOverviewHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},

lessonOverviewIcon: {
  width: 46,
  height: 46,
  borderRadius: 16,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

lessonOverviewTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#0F172A',
},

lessonOverviewSubtitle: {
  marginTop: 3,
  fontSize: 12.5,
  color: '#64748B',
  lineHeight: 18,
  fontWeight: '700',
},

overviewPillRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 14,
},

overviewPill: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F8FAFC',
  borderRadius: 999,
  paddingVertical: 8,
  paddingHorizontal: 11,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

overviewPillText: {
  marginLeft: 6,
  fontSize: 11.5,
  fontWeight: '900',
  color: '#334155',
},

materialsCompactBox: {
  backgroundColor: '#F0FDF4',
  borderRadius: 18,
  padding: 13,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#BBF7D0',
},

materialsCompactTitle: {
  fontSize: 12,
  fontWeight: '900',
  color: '#047857',
  marginBottom: 5,
},

materialsCompactText: {
  fontSize: 13,
  lineHeight: 20,
  color: '#065F46',
  fontWeight: '700',
},

heroGlowThree: {
  position: 'absolute',
  width: 110,
  height: 110,
  borderRadius: 55,
  backgroundColor: 'rgba(251,191,36,0.18)',
  top: 62,
  right: 24,
},

masteryBox: {
  marginTop: 16,
  backgroundColor: '#F0FDF4',
  borderRadius: 20,
  padding: 14,
  borderWidth: 1,
  borderColor: '#BBF7D0',
},

masteryTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 9,
},

masteryLabel: {
  fontSize: 12,
  fontWeight: '900',
  color: '#047857',
},

masteryPercent: {
  fontSize: 12,
  fontWeight: '900',
  color: '#10B981',
},

masteryTrack: {
  height: 8,
  backgroundColor: '#D1FAE5',
  borderRadius: 999,
  overflow: 'hidden',
},

masteryFill: {
  height: '100%',
  backgroundColor: '#10B981',
  borderRadius: 999,
},

masteryText: {
  marginTop: 9,
  fontSize: 12.5,
  lineHeight: 18,
  fontWeight: '700',
  color: '#047857',
},

compactLessonHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  padding: 14,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E0E7FF',
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
},

compactLessonIcon: {
  width: 42,
  height: 42,
  borderRadius: 14,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

compactLessonTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#0F172A',
},

compactLessonSubtitle: {
  marginTop: 3,
  fontSize: 12.5,
  fontWeight: '700',
  color: '#64748B',
},
});