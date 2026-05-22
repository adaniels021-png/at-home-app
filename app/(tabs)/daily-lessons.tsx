import { Ionicons } from '@expo/vector-icons';
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
import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { completeLesson } from '../../lib/lessonEngine';
import { ensureLessonQueue, getNextQueuedLesson } from '../../lib/lessonQueue';
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

export default function DailyLessonsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro } = useSubscription();

  const loadRequestRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Communication');
  const [lessonData, setLessonData] = useState<Lesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [lessonNumber, setLessonNumber] = useState(1);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const [completionRating, setCompletionRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [promptLevel, setPromptLevel] = useState<PromptLevel>('verbal');
  const [behaviorResponse, setBehaviorResponse] =
    useState<BehaviorResponse>('engaged');
  const [consistencyLevel, setConsistencyLevel] =
    useState<ConsistencyLevel>('medium');

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const loadLesson = useCallback(async () => {
    if (!selectedChild?.id) return;

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    const requestCategory = selectedCategory || 'Communication';

    try {
      setStarted(false);
      setDailyLimitReached(false);
      setLoading(true);

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
        lesson_number: lessonRow.lesson_number || 1,
        source: lessonRow.source || 'ai',
        focus_skill: lessonRow.lesson_payload?.focus_skill || requestCategory,
        lesson_name: cleanLessonTitle(
          lessonRow.lesson_payload?.lesson_name,
          requestCategory
        ),
      };

      setLessonData(lesson);
      setLessonNumber(lesson.lesson_number || 1);

      ensureLessonQueue({
        childId: selectedChild.id,
        childName,
        category: requestCategory,
        isPro,
      }).catch((error) => {
        console.log('Background lesson queue refill failed:', error);
      });
    } catch (error: any) {
      if (loadRequestRef.current !== requestId) return;

      if (error?.message?.toLowerCase().includes('limit')) {
        setDailyLimitReached(true);
      } else {
        console.log('Lesson load error:', error);
        Alert.alert(
          'Lesson Loading Issue',
          'The app could not load a full lesson right now. Please pull down to refresh.'
        );
      }
    } finally {
      if (loadRequestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedChild?.id, selectedCategory, childName, isPro]);

  const handleLogLesson = async (status: LessonStatus) => {
    if (!selectedChild?.id || !lessonData?.id) return;

    setIsCompleting(true);

    try {
      const performanceScore = status === 'success' ? completionRating * 20 : 20;

      await completeLesson({
        lessonId: lessonData.id,
        childId: selectedChild.id,
        category: selectedCategory,
        performanceScore,
        promptLevel,
        behaviorResponse,
        consistencyLevel,
        status: status === 'success' ? 'completed' : 'unsuccessful',
      });

      if (status === 'success') {
        ensureLessonQueue({
          childId: selectedChild.id,
          childName,
          category: selectedCategory,
          isPro,
        }).catch((error) => {
          console.log('Lesson queue refill failed:', error);
        });
      }

      setStarted(false);

      if (!isPro && status === 'success') {
        setDailyLimitReached(true);

        Alert.alert(
          'Today’s free lesson completed 🎉',
          'You’ve used your free lesson. Upgrade for unlimited access.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/subscription') },
          ]
        );

        return;
      }

      setLessonData(null);
      setLessonNumber((prev) => prev + 1);

      setTimeout(() => {
        void loadLesson();
      }, 300);

      if (status === 'success') {
        Alert.alert('Lesson Completed 🎉', 'A new lesson is ready.');
      }
    } catch (error: any) {
      console.log('Complete lesson error:', error);

      Alert.alert(
        'Save Error',
        error?.message || 'Could not save lesson progress.'
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
  }, [selectedChild?.id, selectedCategory, loadLesson]);

  const lockedPreviewLessons = useMemo<LockedPreviewLesson[]>(() => {
    return [
      {
        id: '1',
        title: `${selectedCategory} Lesson ${lessonNumber + 1}`,
        subtitle: 'Next personalized lesson',
      },
      {
        id: '2',
        title: `${selectedCategory} Lesson ${lessonNumber + 2}`,
        subtitle: 'More guided practice',
      },
      {
        id: '3',
        title: `${selectedCategory} Lesson ${lessonNumber + 3}`,
        subtitle: 'Build consistency and confidence',
      },
    ];
  }, [selectedCategory, lessonNumber]);

  const showLockedPreviews = !isPro;

  if (!selectedChild) {
    return <NoChildSelected />;
  }

  if (loading && !refreshing) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          freeLessonsUsedToday={dailyLimitReached ? 1 : 0}
        />

        <CategorySelector
          selectedCategory={selectedCategory}
          onSelectCategory={(category) => {
            setLessonData(null);
            setSelectedCategory(category);
          }}
        />

        {dailyLimitReached ? (
          <DailyLimitView
            selectedCategory={selectedCategory}
            lockedPreviewLessons={lockedPreviewLessons}
            showLockedPreviews={showLockedPreviews}
            onUpgrade={() => router.push('/subscription')}
            onRefresh={() => void loadLesson()}
          />
        ) : !started ? (
          <LessonStartCard
            lessonData={lessonData}
            lessonNumber={lessonNumber}
            selectedCategory={selectedCategory}
            onStart={() => setStarted(true)}
          />
        ) : (
          <GuidedLessonView
            lessonData={lessonData}
            lessonNumber={lessonNumber}
            selectedCategory={selectedCategory}
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
      <View style={styles.proBanner}>
        <View style={styles.proBannerHeader}>
          <Ionicons name="sparkles" size={18} color="#5B21B6" />
          <Text style={styles.proBannerTitle}>Pro Active</Text>
        </View>
        <Text style={styles.proBannerText}>
          Unlimited daily lessons are unlocked.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.freeBanner}>
      <View style={styles.freeBannerHeader}>
        <Ionicons name="gift-outline" size={18} color="#7C2D12" />
        <Text style={styles.freeBannerTitle}>Free Plan</Text>
      </View>

      <Text style={styles.freeBannerText}>
        You get 1 free lesson per day. Upgrade to Pro for unlimited lessons.
      </Text>

      <Text style={styles.freeBannerSubtext}>
        Used today: {freeLessonsUsedToday}/1
      </Text>
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
            <TouchableOpacity
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
            </TouchableOpacity>
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
      <View style={styles.limitCard}>
        <Ionicons name="lock-closed" size={42} color="#F59E0B" />

        <Text style={styles.limitTitle}>Daily Limit Reached</Text>

        <Text style={styles.limitText}>
          You’ve completed your free lesson for today in {selectedCategory}.
        </Text>

        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
          <Text style={styles.upgradeText}>Upgrade to Pro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryLimitBtn} onPress={onRefresh}>
          <Text style={styles.secondaryLimitBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {showLockedPreviews && (
        <LockedPreviewSection
          title="Upcoming Lessons"
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
                <Ionicons name="checkmark-circle" size={17} color="#10B981" />
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

       <TouchableOpacity
  style={styles.startLessonButton}
  onPress={onStart}
  disabled={!lessonData?.id}
>
          <Ionicons name="play" size={18} color="#FFFFFF" />
          <Text style={styles.startLessonButtonText}>Start Lesson</Text>
        </TouchableOpacity>
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

  const steps =
    Array.isArray(lessonData?.teaching_steps) &&
    lessonData.teaching_steps.length > 0
      ? lessonData.teaching_steps
      : [
          'Set up the activity in a calm area.',
          'Give one clear instruction.',
          'Wait 3–5 seconds for a response.',
          'Prompt gently if needed.',
          'Reinforce any successful attempt right away.',
        ];

  const finishedSteps = stepIndex >= steps.length;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const progressPercent = Math.min(((stepIndex + 1) / steps.length) * 100, 100);

  if (finishedSteps) {
    return (
      <View>
        <View style={styles.completionHeaderCard}>
          <Ionicons name="checkmark-circle" size={44} color="#10B981" />
          <Text style={styles.completionHeaderTitle}>Lesson Review</Text>
          <Text style={styles.completionHeaderText}>
            Log how the lesson went so future lessons can adjust to your child.
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
              Follow this step, then move forward when ready.
            </Text>
          </View>
        </View>

        <FormattedLessonStep text={formatLessonItem(steps[stepIndex])} />
      </View>

      {lessonData?.prompting_hierarchy?.length > 0 && (
        <View style={styles.helpTipCard}>
          <Ionicons name="hand-left-outline" size={18} color="#DB2777" />
          <Text style={styles.helpTipText}>
            Prompting tip: {formatLessonItem(lessonData.prompting_hierarchy[0])}
          </Text>
        </View>
      )}

      {lessonData?.reinforcement?.length > 0 && (
        <View style={styles.helpTipCardAlt}>
          <Ionicons name="star-outline" size={18} color="#F59E0B" />
          <Text style={styles.helpTipTextAlt}>
            Reinforcement: {formatLessonItem(lessonData.reinforcement[0])}
          </Text>
        </View>
      )}

      <View style={styles.guidedNavRow}>
        <TouchableOpacity
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
        </TouchableOpacity>

        <TouchableOpacity
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
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.tryLaterLink} onPress={onTryAgain}>
        <Text style={styles.tryLaterLinkText}>Try Again Later</Text>
      </TouchableOpacity>
    </View>
  );
}

function FormattedLessonStep({ text }: { text: string }) {
  const cleaned = text
    ?.replace(/\*\*/g, '')
    ?.replace(/\*/g, '')
    ?.replace(/Parent Says\/Does:/gi, '\nParent Says/Does:')
    ?.replace(/Child Does:/gi, '\nChild Does:')
    ?.replace(/How to Prompt:/gi, '\nHow to Prompt:')
    ?.replace(/How to Reinforce:/gi, '\nHow to Reinforce:')
    ?.trim();

  const sections = cleaned
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <View>
      {sections.map((section, index) => {
        const isHeader =
          section.startsWith('Step') ||
          section.includes('Parent Says/Does:') ||
          section.includes('Child Does:') ||
          section.includes('How to Prompt:') ||
          section.includes('How to Reinforce:');

        return (
          <Text
            key={index}
            style={[
              isHeader
                ? styles.guidedStepSectionHeader
                : styles.guidedStepParagraph,
            ]}
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
    <View style={styles.heroCard}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            {selectedCategory.toUpperCase()} • LESSON {lessonNumber}
          </Text>
        </View>

        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
      </View>

      <Text style={styles.heroTitle}>
        {cleanLessonTitle(lessonData?.lesson_name, selectedCategory)}
      </Text>

      <Text style={styles.heroDesc}>
        {lessonData?.objective ||
          'A structured lesson to support your child’s development today.'}
      </Text>
    </View>
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

function BehaviorMessageCard({ message }: { message: string }) {
  return (
    <View style={styles.behaviorMessageCard}>
      <Ionicons name="bulb-outline" size={18} color="#7C3AED" />
      <Text style={styles.behaviorMessageText}>{message}</Text>
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
  return (
    <View style={styles.ratingCard}>
      <Text style={styles.ratingTitle}>How did this lesson go?</Text>
      <Text style={styles.ratingSubtitle}>This helps adjust future lessons.</Text>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const active = completionRating === rating;
          return (
            <TouchableOpacity
              key={rating}
              style={[styles.ratingButton, active && styles.ratingButtonActive]}
              onPress={() => setCompletionRating(rating)}
            >
              <Text style={[styles.ratingButtonText, active && styles.ratingButtonTextActive]}>
                {rating}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.ratingLabels}>
        <Text style={styles.ratingLabel}>Hard</Text>
        <Text style={styles.ratingLabel}>Great</Text>
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
    <View style={styles.behaviorCheckCard}>
      <Text style={styles.behaviorCheckTitle}>How did your child respond?</Text>

      <BehaviorChipGroup
        label="Prompting needed"
        value={promptLevel}
        options={['independent', 'verbal', 'gestural', 'model', 'physical']}
        onChange={setPromptLevel}
      />

      <BehaviorChipGroup
        label="Overall response"
        value={behaviorResponse}
        options={['engaged', 'avoidant', 'frustrated', 'independent']}
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
            <TouchableOpacity
              key={item}
              style={[styles.behaviorChip, active && styles.behaviorChipActive]}
              onPress={() => onChange(item)}
            >
              <Text style={[styles.behaviorChipText, active && styles.behaviorChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

function CompletionButtons({ isCompleting, onTryAgain, onComplete }: any) {
  return (
    <View style={styles.buttonRow}>
      <TouchableOpacity style={styles.secondaryButton} onPress={onTryAgain} disabled={isCompleting}>
        <Text style={styles.secondaryButtonText}>Try Again Later</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={onComplete} disabled={isCompleting}>
        {isCompleting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.primaryButtonInner}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Completed</Text>
          </View>
        )}
      </TouchableOpacity>
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
        <TouchableOpacity key={item.id} style={styles.lockedLessonCard} onPress={onUpgrade}>
          <View style={styles.lockedLessonBlur}>
            <Text style={styles.lockedBadgeText}>LOCKED</Text>
            <Text style={styles.lockedLessonTitle}>{item.title}</Text>
            <Text style={styles.lockedLessonSubtitle}>{item.subtitle}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
    premiumStartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DCE3EE',
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
  completionHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DCE3EE',
  },
  completionHeaderTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  completionHeaderText: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    textAlign: 'center',
  },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 14 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },

  header: { marginBottom: 18 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { marginTop: 6, fontSize: 14, color: '#64748B' },

  proBanner: { backgroundColor: '#F3E8FF', borderRadius: 20, padding: 16, marginBottom: 18 },
  proBannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  proBannerTitle: { marginLeft: 8, fontSize: 15, fontWeight: '800', color: '#6D28D9' },
  proBannerText: { color: '#7C3AED', lineHeight: 20, fontSize: 14 },

  freeBanner: { backgroundColor: '#FFF7ED', borderRadius: 20, padding: 16, marginBottom: 18 },
  freeBannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  freeBannerTitle: { marginLeft: 8, fontSize: 15, fontWeight: '800', color: '#9A3412' },
  freeBannerText: { color: '#9A3412', lineHeight: 20, fontSize: 14 },
  freeBannerSubtext: { marginTop: 8, color: '#C2410C', fontSize: 12, fontWeight: '800' },

  categoryWrap: { marginBottom: 18 },
  categoryChip: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  categoryChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  categoryChipText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  categoryChipTextActive: { color: '#FFFFFF' },

  heroCard: { backgroundColor: '#4F46E5', borderRadius: 28, padding: 22, marginBottom: 18 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroDesc: { color: '#E0E7FF', fontSize: 15, lineHeight: 23 },

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

  ratingCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginBottom: 18 },
  ratingTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  ratingSubtitle: { marginTop: 5, fontSize: 13, color: '#64748B' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  ratingButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  ratingButtonActive: { backgroundColor: '#4F46E5' },
  ratingButtonText: { color: '#475569', fontWeight: '800' },
  ratingButtonTextActive: { color: '#FFFFFF' },
  ratingLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ratingLabel: { fontSize: 12, color: '#64748B', fontWeight: '700' },

  behaviorCheckCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginBottom: 18 },
  behaviorCheckTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  behaviorLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginTop: 10, marginBottom: 8 },
  behaviorChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  behaviorChip: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  behaviorChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  behaviorChipText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  behaviorChipTextActive: { color: '#FFFFFF' },

  behaviorMessageCard: { backgroundColor: '#F5F3FF', borderRadius: 18, padding: 14, marginBottom: 18, flexDirection: 'row', alignItems: 'flex-start' },
  behaviorMessageText: { flex: 1, marginLeft: 8, color: '#5B21B6', fontSize: 13, lineHeight: 20, fontWeight: '700' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  secondaryButton: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  secondaryButtonText: { color: '#475569', fontWeight: '800', fontSize: 14 },
  primaryButton: { flex: 1, backgroundColor: '#4F46E5', borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  primaryButtonInner: { flexDirection: 'row', alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginLeft: 8 },

  limitCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 18 },
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

  lockedSection: { marginBottom: 12 },
  lockedSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  lockedLessonCard: { backgroundColor: '#FFFFFF', borderRadius: 22, marginBottom: 12 },
  lockedLessonBlur: { padding: 18, opacity: 0.55 },
  lockedBadgeText: { color: '#7C3AED', fontWeight: '800', fontSize: 10 },
  lockedLessonTitle: { fontSize: 18, fontWeight: '800', color: '#334155', marginTop: 8 },
  lockedLessonSubtitle: { color: '#64748B', lineHeight: 19, fontSize: 13 },

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

});