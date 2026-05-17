import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { generatePremiumLesson, Lesson } from '../../lib/aiService';
import { supabase } from '../../lib/supabase';

const SKILL_CATEGORIES = ['Communication', 'Social', 'Play', 'Self-Help', 'Motor'];

type LockedPreviewLesson = {
  id: string;
  title: string;
  subtitle: string;
};

const buildFallbackLesson = (category: string, childName: string): Lesson => {
  const baseName = childName || 'your child';

  const fallbackMap: Record<string, Lesson> = {
    Communication: {
      lesson_name: 'Requesting Help During Play',
      objective: `${baseName} will practice requesting help using simple words, gestures, or a communication card during a short play routine.`,
      setting: 'Home',
      focus_skill: 'Communication',
      materials: ['2 preferred toys', 'help visual card', 'small reinforcer'],
      setup: [
        'Place a preferred toy in view but make part of the activity slightly difficult to start.',
        'Keep a help card or model phrase nearby.',
      ],
      teaching_steps: [
        'Present the toy and wait briefly.',
        'Create a natural reason for the child to need help.',
        'Model or prompt “help” if needed.',
        'Immediately help and praise the child after any communication attempt.',
        'Repeat several short opportunities.',
      ],
      prompting_hierarchy: [
        'Pause and wait',
        'Gesture toward the item',
        'Model the word or phrase',
        'Use a visual prompt',
        'Provide a gentle verbal prompt',
      ],
      reinforcement: [
        'Immediate access to the toy',
        'Specific praise such as “Great asking for help!”',
        'A short preferred activity after success',
      ],
      error_correction: [
        'Keep the correction brief and supportive.',
        'Model the correct response.',
        'Give another quick chance right away.',
      ],
      generalization: [
        'Practice during snack time, puzzles, and daily routines.',
        'Have another caregiver practice the same skill later.',
      ],
      success_criteria: '3 to 5 successful help requests with reduced prompting.',
    },

    Social: {
      lesson_name: 'Simple Turn Taking',
      objective: `${baseName} will practice taking turns with another person during a short structured activity.`,
      setting: 'Home',
      focus_skill: 'Social',
      materials: ['Ball or toy', 'visual for “my turn / your turn”', 'small reward'],
      setup: [
        'Sit face-to-face with the child.',
        'Use one toy that can clearly move back and forth between two people.',
      ],
      teaching_steps: [
        'Show the child the toy and say “my turn” and “your turn.”',
        'Take one short turn.',
        'Prompt the child to take a turn.',
        'Praise calm waiting and successful turn-taking.',
        'Repeat several brief rounds.',
      ],
      prompting_hierarchy: [
        'Visual turn cue',
        'Gesture prompt',
        'Model the words',
        'Short verbal reminder',
      ],
      reinforcement: [
        'Specific praise',
        'Fast access to the next turn',
        'Short preferred activity after the set',
      ],
      error_correction: [
        'Keep the toy close and reset calmly.',
        'Model waiting or giving the toy back.',
        'Try the turn again immediately.',
      ],
      generalization: ['Practice with siblings, parents, or during board games.'],
      success_criteria: '4 to 6 turns with support and calm participation.',
    },

    Play: {
      lesson_name: 'Functional Toy Play',
      objective: `${baseName} will use toys in a simple functional way for short periods with adult support.`,
      setting: 'Home',
      focus_skill: 'Play',
      materials: ['Cause-and-effect toy or pretend play toy', 'visual support', 'reinforcer'],
      setup: [
        'Choose a toy the child already likes.',
        'Limit distractions and sit nearby.',
      ],
      teaching_steps: [
        'Model one simple play action.',
        'Prompt the child to copy the action.',
        'Reinforce attempts quickly.',
        'Expand to one or two more play actions.',
      ],
      prompting_hierarchy: [
        'Model the action',
        'Gesture to the toy',
        'Short verbal prompt',
        'Hand-under-hand support if needed',
      ],
      reinforcement: [
        'Praise',
        'Access to the toy',
        'Short celebration or favorite item',
      ],
      error_correction: [
        'Stop briefly and model again.',
        'Simplify the action if needed.',
        'Return to success quickly.',
      ],
      generalization: ['Use the same play skill with another toy later in the day.'],
      success_criteria: '3 to 5 successful play actions with increasing independence.',
    },

    'Self-Help': {
      lesson_name: 'Simple Self-Help Routine',
      objective: `${baseName} will participate in a short self-help routine with support and praise.`,
      setting: 'Home',
      focus_skill: 'Self-Help',
      materials: ['Routine items', 'visual steps', 'small reward'],
      setup: [
        'Choose a short routine such as washing hands or putting on shoes.',
        'Lay out items in order.',
      ],
      teaching_steps: [
        'Show the first step.',
        'Prompt the child to complete one step at a time.',
        'Praise each completed step.',
        'Move through the routine with as little help as needed.',
      ],
      prompting_hierarchy: [
        'Visual support',
        'Gesture prompt',
        'Verbal cue',
        'Physical support only if needed',
      ],
      reinforcement: [
        'Specific praise',
        'Routine completion celebration',
        'Access to a preferred next activity',
      ],
      error_correction: [
        'Return to the last successful step.',
        'Model the next action clearly.',
        'Give another chance.',
      ],
      generalization: ['Repeat the same routine later with another caregiver.'],
      success_criteria: 'Completes 2 to 4 routine steps with support.',
    },

    Motor: {
      lesson_name: 'Simple Gross Motor Imitation',
      objective: `${baseName} will imitate simple body movements during a short movement game.`,
      setting: 'Home',
      focus_skill: 'Motor',
      materials: ['Open space', 'movement visual', 'preferred reinforcer'],
      setup: [
        'Clear a small area.',
        'Stand where the child can easily see you.',
      ],
      teaching_steps: [
        'Model one easy movement such as clap, stomp, or hands up.',
        'Prompt the child to copy it.',
        'Reinforce each attempt quickly.',
        'Repeat with 2 to 3 simple movements.',
      ],
      prompting_hierarchy: [
        'Model only',
        'Gesture with model',
        'Short verbal cue',
        'Light physical guidance if needed',
      ],
      reinforcement: [
        'Praise',
        'Fun movement break',
        'Access to a favorite item after the set',
      ],
      error_correction: [
        'Slow down the model.',
        'Use one movement at a time.',
        'Return to an easier action if needed.',
      ],
      generalization: ['Practice in another room or outside later.'],
      success_criteria: 'Imitates 3 to 5 movements with support.',
    },
  };

  return fallbackMap[category] || fallbackMap.Communication;
};

export default function DailyLessonsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro } = useSubscription();

  const [selectedCategory, setSelectedCategory] = useState('Communication');
  const [lessonData, setLessonData] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [lessonNumber, setLessonNumber] = useState(1);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [usedFallbackLesson, setUsedFallbackLesson] = useState(false);
  const [freeLessonsUsedToday, setFreeLessonsUsedToday] = useState(0);

  useEffect(() => {
    if (selectedChild?.id) {
      void loadLesson();
    } else {
      setLoading(false);
    }
  }, [selectedChild, selectedCategory, isPro]);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

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

  const loadLesson = async () => {
    if (!selectedChild?.id) return;

    setLoading(true);
    setLessonData(null);
    setUsedFallbackLesson(false);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { count, error: countError } = await supabase
        .from('lesson_logs')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id)
        .eq('category', selectedCategory)
        .eq('status', 'success')
        .gte('completed_at', `${today}T00:00:00Z`);

      if (countError) throw countError;

      const usedToday = count ?? 0;
      setFreeLessonsUsedToday(usedToday);

      const lessonLimit = isPro ? Infinity : 1;

      if (usedToday >= lessonLimit) {
        setDailyLimitReached(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setDailyLimitReached(false);

      const { data: lessonLogData, error: lessonLogError } = await supabase
        .from('lesson_logs')
        .select('lesson_number')
        .eq('child_id', selectedChild.id)
        .eq('category', selectedCategory)
        .eq('status', 'success')
        .order('lesson_number', { ascending: false })
        .limit(1);

      if (lessonLogError) throw lessonLogError;

      const nextNumber =
        lessonLogData && lessonLogData.length > 0
          ? (lessonLogData[0].lesson_number || 0) + 1
          : 1;

      setLessonNumber(nextNumber);

      try {
        const lesson = await generatePremiumLesson({
          childName,
          childId: selectedChild.id,
          skill: selectedCategory,
          location: 'Home',
        });

        if (lesson) {
          setLessonData(lesson);
        } else {
          const fallbackLesson = buildFallbackLesson(selectedCategory, childName);
          setLessonData(fallbackLesson);
          setUsedFallbackLesson(true);
          Alert.alert(
            'Using backup lesson',
            'AI is busy right now, so a built-in lesson was loaded instead.'
          );
        }
      } catch (aiError: any) {
        console.error('Daily lesson AI error:', aiError);

        const errorMessage =
          aiError?.message || aiError?.toString() || 'Unknown AI error';

        const isBusyError =
          errorMessage.includes('503') ||
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.toLowerCase().includes('high demand');

        const fallbackLesson = buildFallbackLesson(selectedCategory, childName);
        setLessonData(fallbackLesson);
        setUsedFallbackLesson(true);

        if (isBusyError) {
          Alert.alert(
            'AI is busy',
            'The AI lesson generator is getting a lot of traffic right now. A backup lesson was loaded for now.'
          );
        } else {
          Alert.alert(
            'Using backup lesson',
            'The AI lesson could not be generated right now, so a backup lesson was loaded.'
          );
        }
      }
    } catch (error) {
      console.error('Daily lesson load error:', error);
      Alert.alert('Lesson Error', 'Could not load today’s lesson. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLesson();
  };

  const handleLogLesson = async (status: 'success' | 'unsuccessful') => {
    if (!selectedChild?.id || !lessonData) return;

    setIsCompleting(true);

    try {
      const { error } = await supabase.from('lesson_logs').insert([
        {
          child_id: selectedChild.id,
          lesson_number: lessonNumber,
          category: selectedCategory,
          lesson_name: lessonData.lesson_name || 'Lesson',
          status,
          completed_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      if (!isPro && status === 'success') {
        setDailyLimitReached(true);
        setFreeLessonsUsedToday(1);

        Alert.alert(
          'Today’s free lesson completed 🎉',
          'You’ve used your 1 free lesson for today. Upgrade to Pro for unlimited daily lessons anytime.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => router.push('/subscription') },
          ]
        );
        return;
      }

      Alert.alert(
        status === 'success' ? 'Lesson Completed' : 'Saved',
        status === 'success'
          ? 'Great work. Your child’s progress has been updated.'
          : 'This lesson was saved. You can try again later.',
        [{ text: 'Continue', onPress: () => void loadLesson() }]
      );
    } catch (error: any) {
      console.error('Lesson log error:', error);
      Alert.alert('Save Error', error?.message || 'Could not save lesson progress.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (!selectedChild) {
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Building today’s lesson...</Text>
        </View>
      </SafeAreaView>
    );
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Daily Lessons</Text>
          <Text style={styles.headerSubtitle}>
            Personalized ABA learning for {childName}
          </Text>
        </View>

        {!isPro ? (
          <View style={styles.freeBanner}>
            <View style={styles.freeBannerHeader}>
              <Ionicons name="gift-outline" size={18} color="#7C2D12" />
              <Text style={styles.freeBannerTitle}>Free Plan</Text>
            </View>
            <Text style={styles.freeBannerText}>
              You get 1 free completed lesson per day. Upgrade to Pro for unlimited lessons.
            </Text>
            <Text style={styles.freeBannerSubtext}>
              Used today: {freeLessonsUsedToday}/1
            </Text>
          </View>
        ) : (
          <View style={styles.proBanner}>
            <View style={styles.proBannerHeader}>
              <Ionicons name="sparkles" size={18} color="#5B21B6" />
              <Text style={styles.proBannerTitle}>Pro Active</Text>
            </View>
            <Text style={styles.proBannerText}>
              Unlimited daily lessons are unlocked.
            </Text>
          </View>
        )}

        <View style={styles.categoryWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SKILL_CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category)}
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

        {dailyLimitReached ? (
          <>
            <View style={styles.limitCard}>
              <Ionicons name="lock-closed" size={42} color="#F59E0B" />

              <Text style={styles.limitTitle}>
                {isPro ? 'All Set for Today' : 'Daily Limit Reached'}
              </Text>

              <Text style={styles.limitText}>
                {isPro
                  ? 'You’ve completed your lessons for now. Come back anytime.'
                  : 'Free users get 1 lesson per day. Upgrade to Pro for unlimited daily lessons.'}
              </Text>

              {!isPro && (
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  onPress={() => router.push('/subscription')}
                >
                  <Text style={styles.upgradeText}>Upgrade to Pro</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isPro && (
              <View style={styles.lockedSection}>
                <View style={styles.lockedSectionHeader}>
                  <Text style={styles.lockedSectionTitle}>Upcoming Lessons</Text>
                  <View style={styles.lockedMiniPill}>
                    <Ionicons name="lock-closed" size={12} color="#7C3AED" />
                    <Text style={styles.lockedMiniPillText}>Pro</Text>
                  </View>
                </View>

                {lockedPreviewLessons.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.lockedLessonCard}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.9}
                  >
                    <View style={styles.lockedLessonBlur}>
                      <View style={styles.lockedLessonTopRow}>
                        <View style={styles.lockedBadge}>
                          <Text style={styles.lockedBadgeText}>LOCKED</Text>
                        </View>
                        <Ionicons name="lock-closed" size={18} color="#7C3AED" />
                      </View>

                      <Text style={styles.lockedLessonTitle}>{item.title}</Text>
                      <Text style={styles.lockedLessonSubtitle}>{item.subtitle}</Text>

                      <View style={styles.fakePreviewRow}>
                        <View style={styles.fakeLineLong} />
                        <View style={styles.fakeLineShort} />
                        <View style={styles.fakeLineMedium} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.unlockAllBtn}
                  onPress={() => router.push('/subscription')}
                >
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  <Text style={styles.unlockAllBtnText}>Unlock All Upcoming Lessons</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {selectedCategory.toUpperCase()} • LESSON {lessonNumber}
                  </Text>
                </View>
                <Ionicons
                  name={usedFallbackLesson ? 'refresh-circle-outline' : 'sparkles'}
                  size={18}
                  color="#FFFFFF"
                />
              </View>

              <Text style={styles.heroTitle}>
                {lessonData?.lesson_name || 'Today’s Lesson'}
              </Text>

              <Text style={styles.heroDesc}>
                {lessonData?.objective ||
                  (isPro
                    ? 'Unlimited personalized lessons tailored to your child.'
                    : 'You get 1 free lesson per day. Upgrade for unlimited learning.')}
              </Text>
            </View>

            {!isPro && (
              <View style={styles.peekSection}>
                <View style={styles.peekHeader}>
                  <Text style={styles.peekTitle}>What unlocks with Pro</Text>
                  <TouchableOpacity onPress={() => router.push('/subscription')}>
                    <Text style={styles.peekLink}>See Pro</Text>
                  </TouchableOpacity>
                </View>

                {lockedPreviewLessons.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.peekCard}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.9}
                  >
                    <View style={styles.peekCardOverlay}>
                      <Ionicons name="lock-closed" size={16} color="#7C3AED" />
                      <Text style={styles.peekLockedText}>
                        Locked after today’s free lesson
                      </Text>
                    </View>

                    <Text style={styles.peekCardTitle}>{item.title}</Text>
                    <Text style={styles.peekCardSubtitle}>{item.subtitle}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {usedFallbackLesson ? (
              <View style={styles.fallbackCard}>
                <Ionicons name="information-circle-outline" size={18} color="#92400E" />
                <Text style={styles.fallbackText}>
                  This lesson is a backup lesson because the AI generator is busy right now.
                </Text>
              </View>
            ) : null}

            <SummaryRow
              leftTitle="Setting"
              leftValue={lessonData?.setting || 'Home'}
              rightTitle="Skill"
              rightValue={lessonData?.focus_skill || selectedCategory}
            />

            <LessonSection
              title="Materials"
              icon="cube-outline"
              tint="#EEF2FF"
              iconColor="#4F46E5"
              items={lessonData?.materials}
            />

            <LessonSection
              title="Setup"
              icon="construct-outline"
              tint="#ECFDF5"
              iconColor="#059669"
              items={lessonData?.setup}
            />

            <LessonSection
              title="Teaching Steps"
              icon="list-outline"
              tint="#FFF7ED"
              iconColor="#EA580C"
              items={lessonData?.teaching_steps}
              numbered
            />

            <LessonSection
              title="Prompting Hierarchy"
              icon="hand-left-outline"
              tint="#FDF2F8"
              iconColor="#DB2777"
              items={lessonData?.prompting_hierarchy}
              numbered
            />

            <LessonSection
              title="Reinforcement"
              icon="star-outline"
              tint="#F3E8FF"
              iconColor="#7C3AED"
              items={lessonData?.reinforcement}
            />

            <LessonSection
              title="Error Correction"
              icon="refresh-outline"
              tint="#EFF6FF"
              iconColor="#2563EB"
              items={lessonData?.error_correction}
            />

            <LessonSection
              title="Generalization"
              icon="shuffle-outline"
              tint="#ECFEFF"
              iconColor="#0891B2"
              items={lessonData?.generalization}
            />

            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Ionicons name="ribbon-outline" size={18} color="#F59E0B" />
                <Text style={styles.goalTitle}>Success Goal</Text>
              </View>
              <Text style={styles.goalText}>
                {lessonData?.success_criteria || 'Complete a few successful practice opportunities.'}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleLogLesson('unsuccessful')}
                disabled={isCompleting}
              >
                <Text style={styles.secondaryButtonText}>Try Again Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleLogLesson('success')}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Completed</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
          <Text style={styles.bulletIndex}>{numbered ? `${index + 1}.` : '•'}</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },

  header: {
    marginBottom: 18,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },

  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
  },

  freeBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },

  freeBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  freeBannerTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
  },

  freeBannerText: {
    color: '#9A3412',
    lineHeight: 20,
    fontSize: 14,
  },

  freeBannerSubtext: {
    marginTop: 8,
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '800',
  },

  proBanner: {
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },

  proBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  proBannerTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#6D28D9',
  },

  proBannerText: {
    color: '#7C3AED',
    lineHeight: 20,
    fontSize: 14,
  },

  categoryWrap: {
    marginBottom: 18,
  },

  categoryChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  categoryChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },

  categoryChipText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },

  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },

  heroDesc: {
    color: '#E0E7FF',
    fontSize: 14,
    lineHeight: 21,
  },

  fallbackCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  fallbackText: {
    flex: 1,
    marginLeft: 8,
    color: '#92400E',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '700',
  },

  peekSection: {
    marginBottom: 18,
  },

  peekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  peekTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },

  peekLink: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 13,
  },

  peekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    opacity: 0.82,
  },

  peekCardOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  peekLockedText: {
    marginLeft: 6,
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 12,
  },

  peekCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },

  peekCardSubtitle: {
    color: '#64748B',
    lineHeight: 19,
    fontSize: 13,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  summaryCard: {
    width: '48%',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bulletIndex: {
    width: 22,
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },

  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },

  goalCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 22,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 18,
  },

  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  goalTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#92400E',
    fontSize: 15,
  },

  goalText: {
    color: '#B45309',
    lineHeight: 21,
    fontSize: 14,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  secondaryButtonText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  },

  limitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  limitTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },

  limitText: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 21,
    fontSize: 14,
  },

  upgradeBtn: {
    marginTop: 14,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },

  upgradeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  lockedSection: {
    marginTop: 2,
  },

  lockedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  lockedSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },

  lockedMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  lockedMiniPillText: {
    marginLeft: 4,
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 11,
  },

  lockedLessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  lockedLessonBlur: {
    padding: 18,
    opacity: 0.55,
  },

  lockedLessonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  lockedBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  lockedBadgeText: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.4,
  },

  lockedLessonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },

  lockedLessonSubtitle: {
    color: '#64748B',
    lineHeight: 19,
    fontSize: 13,
    marginBottom: 12,
  },

  fakePreviewRow: {
    marginTop: 4,
  },

  fakeLineLong: {
    height: 10,
    width: '88%',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    marginBottom: 8,
  },

  fakeLineMedium: {
    height: 10,
    width: '64%',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
  },

  fakeLineShort: {
    height: 10,
    width: '48%',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    marginBottom: 8,
  },

  unlockAllBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },

  unlockAllBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  },
});