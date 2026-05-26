import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import FadeInView from '../../components/FadeInView';
import { ensureLessonQueue } from '../../lib/lessonQueue';
import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { supabase } from '../../lib/supabase';

const WEEKLY_PROGRESS_LAST_SEEN_KEY = 'weekly_progress_last_seen';

export default function HomeScreen() {
  const router = useRouter();
  const childContext = useChild() as any;

  const selectedChild = childContext?.selectedChild;
  const { isPro } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showWeeklyProgress, setShowWeeklyProgress] = useState(false);

  const childName = useMemo(() => {
    return (
      selectedChild?.child_name ||
      selectedChild?.name ||
      selectedChild?.first_name ||
      'your child'
    );
  }, [selectedChild]);

  function getHomeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return {
      title: 'Good morning ☀️',
      message: 'A calm start can make today feel easier.',
    };
  }

  if (hour < 17) {
    return {
      title: 'Good afternoon 💜',
      message: 'One small support at a time is still progress.',
    };
  }

  return {
    title: 'Good evening 🌙',
    message: 'You showed up today. That matters.',
  };
}

const greetingCopy = useMemo(() => getHomeGreeting(), []);

  const childAge = useMemo(() => {
    return selectedChild?.age || selectedChild?.child_age || null;
  }, [selectedChild]);

  const PRELOAD_CATEGORIES = useMemo(
    () => ['Communication', 'Social', 'Play', 'Self-Help', 'Motor'],
    []
  );

  useFocusEffect(
    useCallback(() => {
      void fetchHomeData();
    }, [selectedChild?.id])
  );

  useEffect(() => {
    if (!selectedChild?.id) return;

    let cancelled = false;

    const preloadLessons = async () => {
      for (const category of PRELOAD_CATEGORIES) {
        if (cancelled) return;

        await ensureLessonQueue({
          childId: selectedChild.id,
          childName,
          category,
          isPro,
        }).catch((error) => {
          console.log(`Lesson preload skipped for ${category}:`, error);
        });
      }
    };

    void preloadLessons();

    return () => {
      cancelled = true;
    };
  }, [selectedChild?.id, childName, isPro, PRELOAD_CATEGORIES]);

  async function checkWeeklyProgressVisibility() {
    const lastViewed = await AsyncStorage.getItem(
      WEEKLY_PROGRESS_LAST_SEEN_KEY
    );

    if (!lastViewed) {
      setShowWeeklyProgress(true);
      return;
    }

    const now = Date.now();
    const diffDays = (now - Number(lastViewed)) / (1000 * 60 * 60 * 24);

    setShowWeeklyProgress(diffDays >= 7);
  }

  async function fetchHomeData() {
    try {
      setLoading(true);

      if (selectedChild?.id) {
        const { data: assessment, error } = await supabase
          .from('assessments')
          .select('id')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        setHasAssessment(!!assessment);
      } else {
        setHasAssessment(false);
      }

      await checkWeeklyProgressVisibility();
    } catch (error: any) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function dismissWeeklyProgress() {
    await AsyncStorage.setItem(
      WEEKLY_PROGRESS_LAST_SEEN_KEY,
      String(Date.now())
    );

    setShowWeeklyProgress(false);
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your home screen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
       <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowMiddle} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        <FadeInView delay={0}>
          <View style={styles.headerCard}>
            <View style={styles.headerGlowOne} />
            <View style={styles.headerGlowTwo} />

            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.greeting}>{greetingCopy.title}</Text>
                  <Text style={styles.subtitle}>
                    {selectedChild
                      ? `${greetingCopy.message} Today’s plan is ready for ${childName}.`
                      : 'Set up your first child profile to begin.'}
                </Text>
              </View>

              <AnimatedPressable
                style={styles.logoutIcon}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={20} color="#334155" />
              </AnimatedPressable>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={80}>
          <View style={styles.childSummaryCard}>
            <View style={styles.childAvatar}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.childSummaryText}>
              <Text style={styles.childName}>
                {selectedChild ? childName : 'No child selected'}
              </Text>

              <Text style={styles.childSubtext}>
                {selectedChild && childAge
                  ? `${childAge} years old`
                  : selectedChild
                    ? 'Child profile active'
                    : 'Create a child profile to personalize the app'}
              </Text>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={130}>
          <AnimatedPressable
            style={styles.lessonCard}
            onPress={() =>
              selectedChild
                ? hasAssessment
                  ? router.push('/daily-lessons')
                  : router.push('/onboarding/assessment')
                : router.push('/onboarding/add-child')
            }
          >
            <View style={styles.lessonGlow} />

            <View style={styles.lessonTopRow}>
              <View style={styles.lessonIcon}>
                <Ionicons name="sparkles" size={22} color="#4F46E5" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.lessonLabel}>
                  {!selectedChild
                    ? 'Start Here'
                    : hasAssessment
                      ? 'Today’s Lesson'
                      : 'Assessment Needed'}
                </Text>

                <Text style={styles.lessonTitle}>
                  {!selectedChild
                    ? 'Create a Child Profile'
                    : hasAssessment
                      ? `Start ${childName}'s Lesson`
                      : 'Complete Your Assessment'}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </View>

            <Text style={styles.lessonText}>
              {!selectedChild
                ? 'Add a child profile so lessons, PECS tools, worksheets, and supports can be personalized.'
                : hasAssessment
                  ? 'Open today’s personalized lesson and keep progress moving in a simple, guided way.'
                  : 'Finish the assessment so ABA at Home can personalize recommendations.'}
            </Text>
          </AnimatedPressable>
        </FadeInView>

        <FadeInView delay={180}>
          <Text style={styles.sectionTitle}>Parent & Learning Tools</Text>

          <View style={styles.toolList}>
            <ToolCard
              icon="heart-circle-outline"
              title="Parent Support"
              subtitle="Caregiver tools, Parent Wins, journaling, and encouragement."
              color="#7C3AED"
              bg="#F5F3FF"
              border="#DDD6FE"
              onPress={() => router.push('/parent-support')}
            />

            <ToolCard
              icon="leaf-outline"
              title="Calm Down Toolkit"
              subtitle="Quick regulation supports for stressful moments."
              color="#0F766E"
              bg="#ECFDF5"
              border="#A7F3D0"
              onPress={() => router.push('/calm-down')}
            />

            <ToolCard
              icon="color-palette-outline"
              title="Activities"
              subtitle="Fun at-home learning ideas for daily practice."
              color="#EA580C"
              bg="#FFF7ED"
              border="#FED7AA"
              onPress={() => router.push('/activities')}
            />

            <ToolCard
              icon="document-text-outline"
              title="Worksheets"
              subtitle="Printable practice pages for learning and routines."
              color="#DB2777"
              bg="#FDF2F8"
              border="#FBCFE8"
              onPress={() => router.push('/worksheets')}
            />

            <ToolCard
              icon="play-circle-outline"
              title="Videos"
              subtitle="Watch-and-learn supports for caregivers and children."
              color="#2563EB"
              bg="#EFF6FF"
              border="#BFDBFE"
              onPress={() => router.push('/videos')}
            />
          </View>
        </FadeInView>
                <FadeInView delay={230}>
          <DropdownSection
            title="Quick Access"
            subtitle="Helpful tools in one place"
            open={quickAccessOpen}
            onPress={() => setQuickAccessOpen((current) => !current)}
          >
            <DropdownItem
              icon="book-outline"
              label="Daily Lessons"
              onPress={() => router.push('/daily-lessons')}
            />

            <DropdownItem
              icon="calendar-outline"
              label="Routine"
              onPress={() => router.push('/routines')}
            />

            <DropdownItem
              icon="chatbubbles-outline"
              label="Communication"
              onPress={() => router.push('/communication')}
            />

            <DropdownItem
              icon="people-outline"
              label="Parent Wins"
              onPress={() => router.push('/parent-support/parent-wins')}
            />
          </DropdownSection>
        </FadeInView>

        <FadeInView delay={280}>
          <DropdownSection
            title="Resource Library"
            subtitle="Guides and extra support"
            open={libraryOpen}
            onPress={() => setLibraryOpen((current) => !current)}
          >
            <DropdownItem
              icon="library-outline"
              label="Resource Library"
              onPress={() => router.push('/resources')}
            />
          </DropdownSection>
        </FadeInView>

        {showWeeklyProgress ? (
          <FadeInView delay={330}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Ionicons name="heart-outline" size={19} color="#0F766E" />
                <Text style={styles.progressTitle}>Weekly Check-In</Text>
              </View>

              <Text style={styles.progressText}>
                Keep it simple. One short lesson, one calming support, or one
                communication moment can still count as progress.
              </Text>

              <AnimatedPressable
                style={styles.progressDismiss}
                onPress={dismissWeeklyProgress}
              >
                <Text style={styles.progressDismissText}>Got it</Text>
              </AnimatedPressable>
            </View>
          </FadeInView>
        ) : null}
            </ScrollView>
    </View>
  );
}

function ToolCard({
  icon,
  title,
  subtitle,
  bg,
  color,
  border,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  bg: string;
  color: string;
  border: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      style={[styles.toolCard, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
    >
      <View style={styles.toolLeft}>
        <View style={styles.toolIconWrap}>
          <Ionicons name={icon} size={26} color={color} />
        </View>

        <View style={styles.toolTextWrap}>
          <Text style={[styles.toolTitle, { color }]}>{title}</Text>
          <Text style={styles.toolSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color={color} />
    </AnimatedPressable>
  );
}

function DropdownSection({
  title,
  subtitle,
  open,
  onPress,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.dropdownCard}>
      <AnimatedPressable style={styles.dropdownHeader} onPress={onPress}>
        <View>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <Text style={styles.dropdownSubtitle}>{subtitle}</Text>
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#4F46E5"
        />
      </AnimatedPressable>

      {open ? <View style={styles.dropdownBody}>{children}</View> : null}
    </View>
  );
}

function DropdownItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable style={styles.dropdownItem} onPress={onPress}>
      <Ionicons name={icon} size={19} color="#4F46E5" />
      <Text style={styles.dropdownItemText}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    paddingTop: 56,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 44,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  headerCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E0F2FE',
    borderRadius: 30,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },

  headerGlowOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.45)',
    top: -70,
    left: -40,
  },

  headerGlowTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(125,211,252,0.45)',
    bottom: -50,
    right: -30,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#0369A1',
  },

  logoutIcon: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },

  childSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  childAvatar: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  childSummaryText: {
    flex: 1,
  },

  childName: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  childSubtext: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  lessonCard: {
    overflow: 'hidden',
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 5,
  },

  lessonGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -70,
    right: -50,
  },

  lessonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  lessonIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  lessonLabel: {
    color: '#DDD6FE',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },

  lessonTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  lessonText: {
    color: '#EDE9FE',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  toolList: {
    gap: 14,
    marginBottom: 20,
  },

  toolCard: {
    borderRadius: 28,
    padding: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },

  toolLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  toolIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  toolTextWrap: {
    flex: 1,
  },

  toolTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },

  toolSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  dropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
  },

  dropdownHeader: {
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  dropdownSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  dropdownBody: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },

  dropdownItemText: {
    flex: 1,
    marginLeft: 10,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },

  progressCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressTitle: {
    marginLeft: 8,
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '900',
  },

  progressText: {
    color: '#115E59',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  progressDismiss: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },

  progressDismissText: {
    color: '#0F766E',
    fontWeight: '900',
    fontSize: 12,
  },

  screenGlowTop: {
  position: 'absolute',
  width: 260,
  height: 260,
  borderRadius: 130,
  backgroundColor: 'rgba(99,102,241,0.07)',
  top: -120,
  right: -80,
},

screenGlowMiddle: {
  position: 'absolute',
  width: 220,
  height: 220,
  borderRadius: 110,
  backgroundColor: 'rgba(14,165,233,0.05)',
  top: 320,
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
});