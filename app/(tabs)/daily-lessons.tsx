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
import { completeLesson } from '../../lib/lessonEngine';
import { ensureLessonQueue, getNextQueuedLesson } from '../../lib/lessonQueue';
import { supabase } from '../../lib/supabase';
type Lesson = any;

const SKILL_CATEGORIES = [
  'Communication',
  'Social',
  'Play',
  'Self-Help',
  'Motor',
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
      Social: 'Building Social Skills',
      Play: 'Learning Through Play',
      'Self-Help': 'Practicing Independence',
      Motor: 'Movement and Motor Practice',
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

  const [started, setStarted] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState('Communication');

  const [lessonData, setLessonData] = useState<Lesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const { count, error } = await supabase
      .from('lesson_instances')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', selectedChild.id)
      .in('status', ['completed', 'success'])
      .gte('completed_at', startOfToday.toISOString())
      .lte('completed_at', endOfToday.toISOString());

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

      const lessonRow = await getNextQueuedLesson({
        childId: selectedChild.id,
        childName,
        category: requestCategory,
        isPro,
      });

      if (loadRequestRef.current !== requestId) return;

      if (!lessonRow?.lesson_payload) {
        throw new Error('No lesson was returned.');
      }

      const lesson = {
        ...lessonRow.lesson_payload,
        id: lessonRow.lesson_instance_id,
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
        status:
          status === 'success'
            ? 'completed'
            : 'unsuccessful',
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
          'Lesson Completed 🎉',
          'A new lesson is ready.'
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

  const lockedPreviewLessons =
    useMemo<LockedPreviewLesson[]>(() => {
      return [
        {
          id: '1',
          title: `${selectedCategory} Lesson ${
            lessonNumber + 1
          }`,
          subtitle:
            'Next personalized lesson',
        },
        {
          id: '2',
          title: `${selectedCategory} Lesson ${
            lessonNumber + 2
          }`,
          subtitle:
            'More guided practice',
        },
        {
          id: '3',
          title: `${selectedCategory} Lesson ${
            lessonNumber + 3
          }`,
          subtitle:
            'Build consistency and confidence',
        },
      ];
    }, [
      selectedCategory,
      lessonNumber,
    ]);

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
        <ScreenHeader childName={childName} />

        <PlanBanner
          isPro={isPro}
          freeLessonsUsedToday={
            freeLessonsUsedToday
          }
        />

        <CategorySelector
          selectedCategory={
            selectedCategory
          }
          onSelectCategory={(
            category
          ) => {
            setLessonData(null);
            setSelectedCategory(
              category
            );
          }}
        />

        {dailyLimitReached ? (
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
        ) : !started ? (
          <LessonStartCard
            lessonData={lessonData}
            lessonNumber={
              lessonNumber
            }
            selectedCategory={
              selectedCategory
            }
            onStart={() =>
              setStarted(true)
            }
          />
        ) : (
          <GuidedLessonView
            lessonData={lessonData}
            lessonNumber={
              lessonNumber
            }
            selectedCategory={
              selectedCategory
            }
            completionRating={
              completionRating
            }
            setCompletionRating={
              setCompletionRating
            }
            promptLevel={promptLevel}
            setPromptLevel={
              setPromptLevel
            }
            behaviorResponse={
              behaviorResponse
            }
            setBehaviorResponse={
              setBehaviorResponse
            }
            consistencyLevel={
              consistencyLevel
            }
            setConsistencyLevel={
              setConsistencyLevel
            }
            isCompleting={
              isCompleting
            }
            onTryAgain={() =>
              void handleLogLesson(
                'unsuccessful'
              )
            }
            onComplete={() =>
              void handleLogLesson(
                'success'
              )
            }
            showLockedPreviews={
              showLockedPreviews
            }
            lockedPreviewLessons={
              lockedPreviewLessons
            }
            onUpgrade={() =>
              router.push(
                '/subscription'
              )
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
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

function ScreenHeader({ childName }: { childName: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Daily Lessons</Text>
      <Text style={styles.headerSubtitle}>
        Personalized ABA learning for {childName}
      </Text>
    </View>
  );
}

function PlanBanner({
  isPro,
  freeLessonsUsedToday,
}: {
  isPro: boolean;
  freeLessonsUsedToday: number;
}) {
  if (isPro) {
    return (
      <View style={styles.proBannerPremium}>
        <View pointerEvents="none" style={styles.proBannerGlow} />

        <View style={styles.proBannerTop}>
          <View style={styles.proBannerIconWrap}>
            <Ionicons name="sparkles" size={20} color="#7C3AED" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.proBannerPremiumTitle}>
              Pro Membership Active
            </Text>

            <Text style={styles.proBannerPremiumSubtitle}>
              Unlimited AI-powered ABA lessons unlocked
            </Text>
          </View>
        </View>

        <View style={styles.proFeatureRow}>
          <View style={styles.proFeatureChip}>
            <Ionicons name="infinite" size={14} color="#5B21B6" />
            <Text style={styles.proFeatureText}>Unlimited Lessons</Text>
          </View>

          <View style={styles.proFeatureChip}>
            <Ionicons name="flash" size={14} color="#5B21B6" />
            <Text style={styles.proFeatureText}>Adaptive Learning</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.freeBannerPremium}>
      <View pointerEvents="none" style={styles.freeBannerGlow} />

      <View style={styles.freeBannerTop}>
        <View style={styles.freeBannerIconWrap}>
          <Ionicons name="gift-outline" size={20} color="#EA580C" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.freeBannerPremiumTitle}>
            Free Daily Access
          </Text>

          <Text style={styles.freeBannerPremiumSubtitle}>
            1 guided lesson available each day
          </Text>
        </View>
      </View>

      <View style={styles.freeUsageRow}>
        <Text style={styles.freeUsageText}>
          Used Today
        </Text>

        <Text style={styles.freeUsageCount}>
          {freeLessonsUsedToday}/1
        </Text>
      </View>

      <View style={styles.freeProgressTrack}>
        <View
          style={[
            styles.freeProgressFill,
            {
              width:
                freeLessonsUsedToday >= 1 ? '100%' : '0%'
            },
          ]}
        />
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

function ActiveLessonView({
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
  performanceProfile,
}: any) {
  return (
    <View>
      <LessonHero
        lessonData={lessonData}
        lessonNumber={lessonNumber}
        selectedCategory={selectedCategory}
      />

      <SummaryRow
        leftTitle="Setting"
        leftValue={lessonData?.setting || 'Home'}
        rightTitle="Skill"
        rightValue={lessonData?.focus_skill || selectedCategory}
      />

      <LessonSection title="Materials" icon="cube-outline" tint="#EEF2FF" iconColor="#4F46E5" items={lessonData?.materials} />
      <LessonSection title="Setup" icon="construct-outline" tint="#ECFDF5" iconColor="#059669" items={lessonData?.setup} />
      <LessonSection title="Teaching Steps" icon="list-outline" tint="#FFF7ED" iconColor="#EA580C" items={lessonData?.teaching_steps} numbered />
      <LessonSection title="Prompting Hierarchy" icon="hand-left-outline" tint="#FDF2F8" iconColor="#DB2777" items={lessonData?.prompting_hierarchy} numbered />
      <LessonSection title="Reinforcement" icon="star-outline" tint="#F3E8FF" iconColor="#7C3AED" items={lessonData?.reinforcement} />
      <LessonSection title="Error Correction" icon="refresh-outline" tint="#EFF6FF" iconColor="#2563EB" items={lessonData?.error_correction} />
      <LessonSection title="Generalization" icon="shuffle-outline" tint="#ECFEFF" iconColor="#0891B2" items={lessonData?.generalization} />

      {lessonData?.parent_coaching_note && (
        <GoalCard icon="person-circle-outline" iconColor="#7C3AED" title="Parent Coaching Tip" text={lessonData.parent_coaching_note} />
      )}

      {lessonData?.lesson_variation && (
        <GoalCard icon="shuffle-outline" iconColor="#0891B2" title="Try It Another Way" text={lessonData.lesson_variation} />
      )}

      <GoalCard
        icon="ribbon-outline"
        iconColor="#F59E0B"
        title="Success Goal"
        text={lessonData?.success_criteria || 'Complete a few successful practice opportunities.'}
      />

      <RatingCard completionRating={completionRating} setCompletionRating={setCompletionRating} performanceProfile={performanceProfile} />

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

function LessonStartCard({
  lessonData,
  lessonNumber,
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
        lessonNumber={lessonNumber}
        selectedCategory={selectedCategory}
      />

      <SummaryRow
        leftTitle="Setting"
        leftValue={lessonData?.setting || 'Home'}
        rightTitle="Skill"
        rightValue={lessonData?.focus_skill || selectedCategory}
      />

      <View style={styles.premiumStartCard}>
        <View pointerEvents="none" style={styles.premiumStartGlow} />
        <View pointerEvents="none" style={styles.premiumStartGlowTwo} />

        <View style={styles.premiumStartHeader}>
          <View style={styles.premiumIconCircle}>
            <Ionicons name="play-circle-outline" size={24} color="#4F46E5" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.premiumStartTitle}>Ready to begin?</Text>
            <Text style={styles.premiumStartSubtitle}>
              This lesson will guide you step by step.
            </Text>
          </View>
        </View>

        <View style={styles.quickInfoRow}>
          <View style={styles.quickInfoCard}>
            <Ionicons name="time-outline" size={18} color="#7C3AED" />
            <Text style={styles.quickInfoLabel}>Time</Text>
            <Text style={styles.quickInfoValue}>5–10 min</Text>
          </View>

          <View style={styles.quickInfoCard}>
            <Ionicons name="heart-outline" size={18} color="#EA580C" />
            <Text style={styles.quickInfoLabel}>Support</Text>
            <Text style={styles.quickInfoValue}>Parent-led</Text>
          </View>
        </View>

        {materials.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Materials Preview</Text>

            {materials.slice(0, 3).map((item: any, index: number) => (
              <View key={index} style={styles.previewBulletRow}>
                <Ionicons name="arrow-forward" size={17} color="#7C3AED" />
                <Text style={styles.previewBulletText}>
                  {formatLessonItem(item)}
                </Text>
              </View>
            ))}
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
  const progressPercent = Math.min(((stepIndex + 1) / steps.length) * 100, 100);

  if (finishedSteps) {
    return (
      <View>
        <View style={styles.reviewHeroCard}>
          <View pointerEvents="none" style={styles.reviewHeroGlow} />

          <View style={styles.reviewIconWrap}>
            <Ionicons name="checkmark-circle" size={34} color="#10B981" />
          </View>

          <Text style={styles.reviewHeroTitle}>Great work today</Text>

          <Text style={styles.reviewHeroText}>
            Take a quick moment to log how the lesson went.
          </Text>
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
      <LessonHero
        lessonData={lessonData}
        lessonNumber={lessonNumber}
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

      <View style={styles.guidedStepCard}>
        <View style={styles.guidedStepHeader}>
          <View style={styles.guidedStepNumber}>
            <Text style={styles.guidedStepNumberText}>{stepIndex + 1}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.guidedStepTitle}>Parent Step</Text>
            <Text style={styles.guidedStepSubtitle}>
              Complete this step, then move forward.
            </Text>
          </View>
        </View>

        <FormattedLessonStep text={formatLessonItem(steps[stepIndex])} />
      </View>

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
        <Text style={styles.tryLaterLinkText}>Try Again Later</Text>
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
    ?.replace(/How to prompt:/gi, '\nHow to prompt:')
    ?.replace(/How to reinforce:/gi, '\nHow to reinforce:')
    ?.trim();

  const sections = cleaned
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <View>
      {sections.map((section, index) => {
        const isHeader =
          section.toLowerCase().startsWith('step') ||
          section.toLowerCase().startsWith('parent says:') ||
          section.toLowerCase().startsWith('parent does:') ||
          section.toLowerCase().startsWith('child should do:') ||
          section.toLowerCase().startsWith('child does:') ||
          section.toLowerCase().startsWith('how to prompt:') ||
          section.toLowerCase().startsWith('how to reinforce:');

        return (
          <Text
            key={index}
            style={
              isHeader
                ? styles.guidedStepSectionHeader
                : styles.guidedStepParagraph
            }
          >
            {section}
          </Text>
        );
      })}
    </View>
  );
}

function LessonHero({ lessonData, lessonNumber, selectedCategory }: any) {
  return (
    <FadeInView delay={80}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {selectedCategory.toUpperCase()} • LESSON {lessonNumber}
            </Text>
          </View>

          <View style={styles.heroSparkleIcon}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {cleanLessonTitle(lessonData?.lesson_name, selectedCategory)}
        </Text>

        <Text style={styles.heroDesc}>
          {lessonData?.objective ||
            'A structured lesson to support your child’s development today.'}
        </Text>
      </View>
    </FadeInView>
  );
}

function SummaryRow({
  leftTitle,
  leftValue,
  rightTitle,
  rightValue,
}: {
  leftTitle: string;
  leftValue: string;
  rightTitle: string;
  rightValue: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryCard, { backgroundColor: '#EEF2FF' }]}>
        <Text style={styles.summaryLabel}>{leftTitle}</Text>
        <Text style={styles.summaryValue}>{leftValue}</Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
        <Text style={styles.summaryLabel}>{rightTitle}</Text>
        <Text style={styles.summaryValue}>{rightValue}</Text>
      </View>
    </View>
  );
}

function LessonSection({
  title,
  icon,
  tint,
  iconColor,
  items,
  numbered = false,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  iconColor: string;
  items?: string[];
  numbered?: boolean;
}) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>

        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {items.map((item, index) => (
        <View key={`${title}-${index}`} style={styles.bulletRow}>
  <Text style={styles.bulletIndex}>
    {numbered ? `${index + 1}.` : '•'}
  </Text>
  <Text style={styles.bulletText}>{formatLessonItem(item)}</Text>
</View>
      ))}
    </View>
  );
}

function GoalCard({ icon, iconColor, title, text }: any) {
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={styles.goalTitle}>{title}</Text>
      </View>
      <Text style={styles.goalText}>{text}</Text>
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
        label="Overall Response"
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
            Try Again Later
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
  borderRadius: 30,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#DCE3EE',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
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
    marginBottom: 18,
  },
  premiumIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumStartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  premiumStartSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  quickInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickInfoLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  quickInfoValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
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
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  startLessonButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },

  guidedProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
guidedStepCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 18,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

guidedStepHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},

guidedStepNumber: {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: '#4F46E5',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

guidedStepNumberText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '900',
},

guidedStepTitle: {
  fontSize: 17,
  color: '#0F172A',
  fontWeight: '900',
},

guidedStepSubtitle: {
  marginTop: 2,
  fontSize: 13,
  color: '#64748B',
  lineHeight: 18,
  fontWeight: '600',
},

guidedStepText: {
  fontSize: 14,
  lineHeight: 23,
  color: '#334155',
  fontWeight: '600',
},
  helpTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FDF2F8',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  helpTipText: {
    flex: 1,
    marginLeft: 8,
    color: '#BE185D',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  helpTipCardAlt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  helpTipTextAlt: {
    flex: 1,
    marginLeft: 8,
    color: '#B45309',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  guidedNavRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  guidedBackButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  guidedBackButtonText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },
  guidedNextButton: {
    flex: 1.4,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  guidedNextButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
  },
  guidedDisabledButton: {
    opacity: 0.45,
  },
  guidedDisabledText: {
    color: '#94A3B8',
  },
  tryLaterLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 18,
  },
  tryLaterLinkText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 13,
  },
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 14 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },

  header: { marginBottom: 18 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { marginTop: 6, fontSize: 14, color: '#64748B' },


  categoryWrap: { marginBottom: 18 },
  categoryChip: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  categoryChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  categoryChipText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  categoryChipTextActive: { color: '#FFFFFF' },

  heroCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#4F46E5',
  borderRadius: 32,
  padding: 24,
  marginBottom: 18,
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.2,
  shadowRadius: 22,
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
  marginBottom: 16,
},

heroBadge: {
  backgroundColor: 'rgba(255,255,255,0.18)',
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderRadius: 14,
},

heroBadgeText: {
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 0.4,
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
  fontSize: 24,
  fontWeight: '900',
  marginBottom: 10,
  letterSpacing: -0.4,
},

heroDesc: {
  color: '#E0E7FF',
  fontSize: 15,
  lineHeight: 23,
  fontWeight: '700',
},

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  summaryCard: { width: '48%', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14 },
  summaryLabel: { fontSize: 12, color: '#475569', fontWeight: '700', marginBottom: 4 },
  summaryValue: { fontSize: 15, color: '#0F172A', fontWeight: '800' },

  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 26, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: '#DCE3EE' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bulletIndex: { width: 22, fontSize: 14, fontWeight: '800', color: '#4F46E5' },
  bulletText: { flex: 1, fontSize: 15, color: '#334155', lineHeight: 23 },

  goalCard: { backgroundColor: '#FFFBEB', borderRadius: 22, padding: 18, marginBottom: 18 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  goalTitle: { marginLeft: 8, fontWeight: '800', color: '#92400E', fontSize: 15 },
  goalText: { color: '#B45309', lineHeight: 23, fontSize: 15 },

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
guidedStepSectionHeader: {
  fontSize: 15,
  lineHeight: 24,
  fontWeight: '900',
  color: '#0F172A',
  marginTop: 12,
  marginBottom: 6,
},

guidedStepParagraph: {
  fontSize: 14,
  lineHeight: 23,
  color: '#334155',
  fontWeight: '600',
  marginBottom: 10,
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
  borderRadius: 28,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E9D5FF',
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
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
  width: 52,
  height: 52,
  borderRadius: 18,
  backgroundColor: '#F5F3FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

proBannerPremiumTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#1E1B4B',
},

proBannerPremiumSubtitle: {
  marginTop: 4,
  fontSize: 13,
  color: '#6D28D9',
  lineHeight: 20,
  fontWeight: '700',
},

proFeatureRow: {
  flexDirection: 'row',
  marginTop: 18,
  gap: 10,
},

proFeatureChip: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F5F3FF',
  borderRadius: 999,
  paddingVertical: 10,
  paddingHorizontal: 14,
},

proFeatureText: {
  marginLeft: 6,
  color: '#5B21B6',
  fontWeight: '800',
  fontSize: 12,
},

freeBannerPremium: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#FED7AA',
  shadowColor: '#EA580C',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 18,
  elevation: 2,
},

freeBannerGlow: {
  position: 'absolute',
  width: 170,
  height: 170,
  borderRadius: 85,
  backgroundColor: 'rgba(251,146,60,0.08)',
  top: -90,
  right: -50,
},

freeBannerTop: {
  flexDirection: 'row',
  alignItems: 'center',
},

freeBannerIconWrap: {
  width: 52,
  height: 52,
  borderRadius: 18,
  backgroundColor: '#FFF7ED',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

freeBannerPremiumTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#7C2D12',
},

freeBannerPremiumSubtitle: {
  marginTop: 4,
  fontSize: 13,
  color: '#C2410C',
  lineHeight: 20,
  fontWeight: '700',
},

freeUsageRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 20,
  marginBottom: 10,
},

freeUsageText: {
  fontSize: 12,
  fontWeight: '800',
  color: '#9A3412',
},

freeUsageCount: {
  fontSize: 13,
  fontWeight: '900',
  color: '#EA580C',
},

freeProgressTrack: {
  height: 10,
  backgroundColor: '#FFEDD5',
  borderRadius: 999,
  overflow: 'hidden',
},

freeProgressFill: {
  height: '100%',
  backgroundColor: '#F97316',
  borderRadius: 999,
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
  borderRadius: 30,
  padding: 24,
  alignItems: 'center',
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

reviewIconWrap: {
  width: 66,
  height: 66,
  borderRadius: 24,
  backgroundColor: '#ECFDF5',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 14,
},

reviewHeroTitle: {
  fontSize: 23,
  fontWeight: '900',
  color: '#064E3B',
  textAlign: 'center',
},

reviewHeroText: {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 22,
  color: '#047857',
  fontWeight: '700',
  textAlign: 'center',
},

reviewMiniRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 18,
},

reviewMiniChip: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ECFDF5',
  borderRadius: 999,
  paddingVertical: 9,
  paddingHorizontal: 12,
},

reviewMiniText: {
  marginLeft: 6,
  fontSize: 11,
  fontWeight: '900',
  color: '#047857',
},

ratingCardPremium: {
  backgroundColor: '#FFFFFF',
  borderRadius: 26,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#DCE3EE',
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
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#DCE3EE',
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
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 20,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.05,
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
});