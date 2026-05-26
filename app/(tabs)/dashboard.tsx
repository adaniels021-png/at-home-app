import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileSwitcher from '../../components/ProfileSwitcher';
import WeeklyProgressInsights from '../../components/WeeklyProgressInsights';
import { generateProgressSummary } from '../../lib/aiService';
import { ensureLessonQueue } from '../../lib/lessonQueue';
import { useResponsiveLayout } from '../../lib/responsive';
import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { supabase } from '../../lib/supabase';

type LessonLogRow = {
  id: string;
  child_id: string;
  category: string;
  lesson_number: number;
  lesson_name: string | null;
  status: string;
  performance?: string | null;
  notes: string | null;
  completed_at: string;
  created_at: string;
};

type RoutineLogRow = {
  id: string;
  child_id: string;
  routine_period: string;
  task_name: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
};

type DashboardCache = {
  assessment: any | null;
  weeklyLogs: LessonLogRow[];
  todayRoutineLogs: RoutineLogRow[];
  weeklySummary: string;
  cachedAt: string;
};

function getDashboardCacheKey(childId: string) {
  return `dashboard-cache-${childId}`;
}

function calculateStreak(logs: LessonLogRow[]) {
  if (!logs.length) return 0;

  const uniqueDates = Array.from(
    new Set(
      logs.map((log) => {
        const date = new Date(log.completed_at);
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
          2,
          '0'
        )}-${String(date.getUTCDate()).padStart(2, '0')}`;
      })
    )
  ).sort((a, b) => (a > b ? -1 : 1));

  let streak = 0;

  let currentDate = new Date();
  currentDate = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate()
    )
  );

  for (const uniqueDate of uniqueDates) {
    const [year, month, day] = uniqueDate.split('-').map(Number);
    const logDate = new Date(Date.UTC(year, month - 1, day));

    const diff = Math.floor(
      (currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff === 0 || diff === 1) {
      streak += 1;
      currentDate = logDate;
    } else {
      break;
    }
  }

  return streak;
}

export default function Dashboard() {
  const router = useRouter();
  const layout = useResponsiveLayout();

  const { selectedChild, loading: childLoading } = useChild();
  const { isPro } = useSubscription();

  const featuredItemWidth = `${100 / layout.gridColumns - 2}%`;

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);

  const [assessment, setAssessment] = useState<any | null>(null);
  const [weeklyLogs, setWeeklyLogs] = useState<LessonLogRow[]>([]);
  const [todayRoutineLogs, setTodayRoutineLogs] = useState<RoutineLogRow[]>([]);
  const [weeklySummary, setWeeklySummary] = useState(
    'Progress data is being collected this week.'
  );

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

const PRELOAD_CATEGORIES = useMemo(
  () => ['Communication', 'Social', 'Play', 'Self-Help', 'Motor'],
  []
);

useEffect(() => {
  if (!selectedChild?.id) return;

  let cancelled = false;

  PRELOAD_CATEGORIES.forEach((category, index) => {
    setTimeout(() => {
      if (cancelled) return;

      ensureLessonQueue({
        childId: selectedChild.id,
        childName,
        category,
        isPro,
      })
        .then(() => {
          console.log(`✅ Preloaded ${category} lessons`);
        })
        .catch((error) => {
          console.log(`Lesson preload skipped for ${category}:`, error);
        });
    }, index * 900);
  });

  return () => {
    cancelled = true;
  };
}, [selectedChild?.id, childName, isPro, PRELOAD_CATEGORIES]);

  const hasAssessment = !!assessment;
  const lessonsThisWeek = weeklyLogs.length;
  const routineCompletedToday = todayRoutineLogs.length;

  const topCategory = useMemo(() => {
    if (!weeklyLogs.length) return 'None yet';

    const counts: Record<string, number> = {};

    for (const log of weeklyLogs) {
      counts[log.category] = (counts[log.category] || 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [weeklyLogs]);

  const streakCount = useMemo(() => calculateStreak(weeklyLogs), [weeklyLogs]);

  const dashboardTip = useMemo(() => {
    if (!hasAssessment) {
      return 'Complete the assessment first so lessons, routines, and support tools can be personalized.';
    }

    if (routineCompletedToday === 0 && lessonsThisWeek === 0) {
      return 'Start with one routine task or one short lesson today. Small steps still count.';
    }

    if (routineCompletedToday > 0 && lessonsThisWeek === 0) {
      return 'Great routine progress. Try one short daily lesson next.';
    }

    if (lessonsThisWeek > 0) {
      return 'You are building helpful consistency. Keep sessions short, positive, and repeatable.';
    }

    return 'Use today’s tools to support communication, learning, and daily structure.';
  }, [hasAssessment, routineCompletedToday, lessonsThisWeek]);

  const loadCachedDashboard = useCallback(async () => {
    if (!selectedChild?.id) return null;

    try {
      const cached = await AsyncStorage.getItem(
        getDashboardCacheKey(selectedChild.id)
      );

      if (!cached) return null;

      return JSON.parse(cached) as DashboardCache;
    } catch (error) {
      console.error('Load dashboard cache error:', error);
      return null;
    }
  }, [selectedChild?.id]);

  const saveDashboardCache = useCallback(
    async (data: DashboardCache) => {
      if (!selectedChild?.id) return;

      try {
        await AsyncStorage.setItem(
          getDashboardCacheKey(selectedChild.id),
          JSON.stringify(data)
        );
      } catch (error) {
        console.error('Save dashboard cache error:', error);
      }
    },
    [selectedChild?.id]
  );

  const loadDashboardFromSupabase = useCallback(async () => {
    if (!selectedChild?.id) return null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const today = new Date().toISOString().split('T')[0];

    const [assessmentResult, logsResult, routineResult] = await Promise.all([
      supabase
        .from('assessments')
        .select('id, child_id, created_at')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('lesson_logs')
        .select(
          'id, child_id, category, lesson_number, lesson_name, status, notes, completed_at, created_at'
        )
        .eq('child_id', selectedChild.id)
        .eq('status', 'success')
        .gte('completed_at', sevenDaysAgo.toISOString())
        .order('completed_at', { ascending: false })
        .limit(50),

      supabase
        .from('routine_logs')
        .select(
          'id, child_id, routine_period, task_name, completed, completed_at, created_at'
        )
        .eq('child_id', selectedChild.id)
        .gte('completed_at', `${today}T00:00:00Z`)
        .order('completed_at', { ascending: false }),
    ]);

    if (assessmentResult.error) throw assessmentResult.error;
    if (logsResult.error) throw logsResult.error;
    if (routineResult.error) throw routineResult.error;

    return {
      assessment: assessmentResult.data || null,
      weeklyLogs: (logsResult.data || []) as LessonLogRow[],
      todayRoutineLogs: (routineResult.data || []) as RoutineLogRow[],
    };
  }, [selectedChild?.id]);

  const loadDashboard = useCallback(
    async (forceRefresh = false) => {
      if (!selectedChild?.id) return;

      try {
        if (!forceRefresh) {
          const cached = await loadCachedDashboard();

          if (cached) {
            setAssessment(cached.assessment);
            setWeeklyLogs(cached.weeklyLogs || []);
            setTodayRoutineLogs(cached.todayRoutineLogs || []);
            setWeeklySummary(
              cached.weeklySummary || 'Progress data is being collected this week.'
            );
            setInitialLoading(false);
          }
        }

        setRefreshing(true);

        const freshData = await loadDashboardFromSupabase();

        if (!freshData) return;

        setAssessment(freshData.assessment);
        setWeeklyLogs(freshData.weeklyLogs);
        setTodayRoutineLogs(freshData.todayRoutineLogs);

        let summaryText = 'Progress data is being collected this week.';

        if (forceRefresh || !weeklySummary || weeklySummary === 'Progress data is being collected this week.') {
          setSummaryLoading(true);

           try {
             const summary = await generateProgressSummary(selectedChild.id);
              summaryText =
                summary?.summary || 'Progress data is being collected this week.';
            } catch (error) {
              console.error('Weekly summary error:', error);
            } finally {
              setSummaryLoading(false);
            }
          } else {
            summaryText = weeklySummary;
          }

        setWeeklySummary(summaryText);

        await saveDashboardCache({
          assessment: freshData.assessment,
          weeklyLogs: freshData.weeklyLogs,
          todayRoutineLogs: freshData.todayRoutineLogs,
          weeklySummary: summaryText,
          cachedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Dashboard load error:', error);
        setWeeklySummary('Could not load weekly progress right now.');
      } finally {
        setRefreshing(false);
        setInitialLoading(false);
      }
    },
    [
      selectedChild?.id,
      loadCachedDashboard,
      loadDashboardFromSupabase,
      saveDashboardCache,
    ]
  );

  useEffect(() => {
    if (!selectedChild?.id) return;

    setInitialLoading(true);
    void loadDashboard(false);
  }, [selectedChild?.id, loadDashboard]);

  const openRoute = (path: string) => {
    router.push(path as any);
  };

  const openPremiumRoute = (path: string) => {
    if (!isPro) {
      router.push('/subscription');
      return;
    }

    router.push(path as any);
  };

  if (childLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="person-add-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Child Profile Found</Text>

          <Text style={styles.emptyText}>
            Let’s set up your child to start building your ABA support plan.
          </Text>

          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => router.replace('/onboarding/setup-child')}
          >
            <Text style={styles.setupButtonText}>Set Up Child</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.horizontalPadding,
            alignItems: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDashboard(true)}
            tintColor="#4F46E5"
          />
        }
      >
        <View style={[styles.contentInner, { maxWidth: layout.maxContentWidth }]}>
          {refreshing ? (
            <Text style={styles.refreshingText}>Updating dashboard...</Text>
          ) : null}

          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.greeting}>Welcome back 👋</Text>
              <Text style={styles.subtitle}>
                Today’s support plan for {childName}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.statsBtn, { minHeight: layout.touchSize }]}
              onPress={() => router.push('/progress')}
            >
              <Ionicons name="stats-chart" size={22} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <ProfileSwitcher />

          <WeeklyProgressInsights />

          {!hasAssessment ? (
            <TouchableOpacity
              style={styles.assessmentPromptCard}
              onPress={() => router.push('/onboarding/assessment')}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>SETUP NEEDED</Text>
                </View>

                <Ionicons name="clipboard-outline" size={18} color="#FFFFFF" />
              </View>

              <Text style={styles.heroTitle}>Complete Assessment</Text>

              <Text style={styles.heroDesc}>
                Finish the onboarding assessment to personalize lessons, routines, PECS, worksheets, and progress tracking.
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.focusProgressRow}>
            <View style={styles.compactFocusCard}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb-outline" size={17} color="#F59E0B" />
                <Text style={styles.tipTitle}>Today’s Focus</Text>
              </View>

              <Text style={styles.tipText}>{dashboardTip}</Text>
            </View>

            <View style={styles.compactStreakCard}>
              <View style={styles.streakHeader}>
                <Ionicons name="flame" size={17} color="#F97316" />
                <Text style={styles.streakTitle}>Streak</Text>
              </View>

              <Text style={styles.compactStreakNumber}>
                {streakCount} Day{streakCount === 1 ? '' : 's'}
              </Text>

              <Text style={styles.compactStreakText}>
                {streakCount > 0 ? 'Keep going!' : 'Start today'}
              </Text>
            </View>
          </View>

          <View style={styles.compactWeeklyCard}>
            <View style={styles.weeklyHeader}>
              <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
              <Text style={styles.weeklyTitle}>Weekly Progress</Text>
            </View>

            <View style={styles.weeklyStatsRow}>
              <View style={styles.weeklyStatBox}>
                <Text style={styles.weeklyStatNumber}>{lessonsThisWeek}</Text>
                <Text style={styles.weeklyStatLabel}>Lessons</Text>
              </View>

              <View style={styles.weeklyStatBox}>
                <Text style={styles.weeklyStatNumber}>{topCategory}</Text>
                <Text style={styles.weeklyStatLabel}>Top Category</Text>
              </View>
            </View>

            <Text style={styles.weeklySummaryText}>
              {summaryLoading ? 'Reviewing progress...' : weeklySummary}
            </Text>
          </View>

          <SectionHeader title="Featured Parent Tools" />

          <View style={styles.featuredGrid}>
            <FeaturedToolCard
              itemWidth={featuredItemWidth}
              icon="color-palette"
              label="Activities"
              subtitle="Fun at-home ideas for learning, play, and skill building."
              bg="#FDF2F8"
              color="#DB2777"
              accent="#DB2777"
              onPress={() => openRoute('/activities')}
            />

            <FeaturedToolCard
              itemWidth={featuredItemWidth}
              icon="heart-outline"
              label="Calm Down"
              subtitle="Quick calming tools for regulation, sensory needs, and emotional support."
              bg="#ECFDF5"
              color="#059669"
              accent="#059669"
              onPress={() => openRoute('/calm-down')}
            />

            <FeaturedToolCard
              itemWidth={featuredItemWidth}
              icon="create"
              label="Worksheets"
              subtitle={isPro ? 'Printable practice for tracing, colors, shapes, and more.' : 'Upgrade to unlock printable practice.'}
              bg="#FFF7ED"
              color="#EA580C"
              accent="#EA580C"
              onPress={() => openPremiumRoute('/worksheets')}
            />

            <FeaturedToolCard
              itemWidth={featuredItemWidth}
              icon="heart-circle"
              label="Parent Support"
              subtitle={isPro ? 'Guidance tools for daily ABA support at home.' : 'Upgrade to unlock parent support tools.'}
              bg="#F3E8FF"
              color="#7C3AED"
              accent="#7C3AED"
              onPress={() => openPremiumRoute('/parent-support')}
            />

            <FeaturedToolCard
              itemWidth={featuredItemWidth}
              icon="play-circle-outline"
              label="Videos"
              subtitle="Parent-friendly video help and support resources."
              bg="#FEF2F2"
              color="#DC2626"
              accent="#DC2626"
              onPress={() => openRoute('/videos')}
            />
          </View>

          <TouchableOpacity
            style={styles.libraryButton}
            onPress={() => setShowLibrary((prev) => !prev)}
          >
            <View style={styles.libraryButtonLeft}>
              <View style={styles.libraryIconWrap}>
                <Ionicons name="library-outline" size={21} color="#4F46E5" />
              </View>

              <View style={styles.dropdownTextWrap}>
                <Text style={styles.libraryTitle}>Library</Text>
                <Text style={styles.librarySubtitle}>
                  PECS, guides, resources, and saved tools
                </Text>
              </View>
            </View>

            <Ionicons
              name={showLibrary ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#64748B"
            />
          </TouchableOpacity>

          {showLibrary ? (
            <View style={styles.libraryDropdown}>
              <LibraryItem
                icon="chatbubbles"
                title="PECS"
                subtitle="Communication cards"
                color="#4F46E5"
                bg="#EEF2FF"
                onPress={() => openRoute('/communication')}
              />

              <LibraryItem
                icon="albums-outline"
                title="Manage PECS"
                subtitle={isPro ? 'Edit and organize cards' : 'Pro feature'}
                color="#059669"
                bg="#ECFDF5"
                onPress={() => openPremiumRoute('/manage-pecs')}
              />

              <LibraryItem
                icon="book"
                title="Guides"
                subtitle="Parent learning resources"
                color="#475569"
                bg="#F1F5F9"
                onPress={() => openRoute('/resources')}
              />

              <LibraryItem
                icon="folder-open-outline"
                title="Resources"
                subtitle="Helpful support materials"
                color="#D97706"
                bg="#FEF3C7"
                onPress={() => openRoute('/resources')}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.libraryButton}
            onPress={() => setShowQuickAccess((prev) => !prev)}
          >
            <View style={styles.libraryButtonLeft}>
              <View style={styles.quickAccessIconWrap}>
                <Ionicons name="apps-outline" size={21} color="#7C3AED" />
              </View>

              <View style={styles.dropdownTextWrap}>
                <Text style={styles.libraryTitle}>Quick Access</Text>
                <Text style={styles.librarySubtitle}>
                  Lessons, routine, talk, progress, and assessment
                </Text>
              </View>
            </View>

            <Ionicons
              name={showQuickAccess ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#64748B"
            />
          </TouchableOpacity>

          {showQuickAccess ? (
            <View style={styles.libraryDropdown}>
              <LibraryItem
                icon="school-outline"
                title="Lessons"
                subtitle="Daily learning practice"
                color="#4F46E5"
                bg="#EEF2FF"
                onPress={() => openRoute('/daily-lessons')}
              />

              <LibraryItem
                icon="calendar-outline"
                title="Routine"
                subtitle={`${routineCompletedToday} completed today`}
                color="#059669"
                bg="#ECFDF5"
                onPress={() => openRoute('/routine')}
              />

              <LibraryItem
                icon="chatbubbles-outline"
                title="Talk"
                subtitle="Communication tools"
                color="#DB2777"
                bg="#FDF2F8"
                onPress={() => openRoute('/communication')}
              />

              <LibraryItem
                icon="trending-up"
                title="Progress"
                subtitle="View growth and tracking"
                color="#2563EB"
                bg="#EFF6FF"
                onPress={() => openRoute('/progress')}
              />

              <LibraryItem
                icon="clipboard"
                title="Assessment"
                subtitle={hasAssessment ? 'Review plan' : 'Complete setup'}
                color="#D97706"
                bg="#FEF3C7"
                onPress={() => openRoute('/onboarding/assessment')}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function FeaturedToolCard({
  itemWidth,
  icon,
  label,
  subtitle,
  bg,
  color,
  accent,
  onPress,
}: {
  itemWidth: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  bg: string;
  color: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.featuredCard, { width: itemWidth }]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={[styles.featuredAccentBar, { backgroundColor: accent }]} />

      <View style={[styles.featuredIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={27} color={color} />
      </View>

      <Text style={styles.featuredText} numberOfLines={1}>
        {label}
      </Text>

      <Text style={styles.featuredSubtext} numberOfLines={3}>
        {subtitle}
      </Text>

      <View style={styles.featuredFooter}>
        <Text style={[styles.featuredFooterText, { color }]}>Open</Text>
        <Ionicons name="arrow-forward" size={15} color={color} />
      </View>
    </TouchableOpacity>
  );
}

function LibraryItem({
  icon,
  title,
  subtitle,
  bg,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  bg: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.libraryItem} onPress={onPress} activeOpacity={0.86}>
      <View style={[styles.libraryItemIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.libraryItemTextWrap}>
        <Text style={styles.libraryItemTitle}>{title}</Text>
        <Text style={styles.libraryItemSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingTop: 20, paddingBottom: 40 },
  contentInner: { width: '100%' },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },

  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  refreshingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  headerTextWrap: { flex: 1, paddingRight: 12 },

  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  statsBtn: {
    minWidth: 48,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  assessmentPromptCard: {
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

  focusProgressRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },

  compactFocusCard: {
    flex: 1.45,
    backgroundColor: '#FFFBEB',
    borderRadius: 22,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },

  compactStreakCard: {
    flex: 0.75,
    backgroundColor: '#FFF7ED',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  tipTitle: {
    marginLeft: 8,
    fontWeight: '900',
    color: '#92400E',
  },

  tipText: {
    color: '#B45309',
    lineHeight: 19,
    fontWeight: '600',
    fontSize: 13,
  },

  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  streakTitle: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },

  compactStreakNumber: {
    fontSize: 19,
    fontWeight: '900',
    color: '#EA580C',
  },

  compactStreakText: {
    marginTop: 4,
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '700',
  },

  compactWeeklyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  weeklyTitle: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },

  weeklyStatsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },

  weeklyStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
  },

  weeklyStatNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },

  weeklyStatLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },

  weeklySummaryText: {
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 19,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 12,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  featuredCard: {
    minHeight: 178,
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },

  featuredAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },

  featuredIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  featuredText: {
    fontWeight: '900',
    fontSize: 16,
    color: '#0F172A',
  },

  featuredSubtext: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 18,
  },

  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  featuredFooterText: {
    fontSize: 12,
    fontWeight: '900',
    marginRight: 4,
  },

  libraryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  libraryButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },

  libraryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  quickAccessIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  dropdownTextWrap: {
    flex: 1,
  },

  libraryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },

  librarySubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  libraryDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 18,
  },

  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  libraryItemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  libraryItemTextWrap: {
    flex: 1,
  },

  libraryItemTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },

  libraryItemSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#111827',
    marginTop: 12,
  },

  emptyText: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#6B7280',
    lineHeight: 21,
  },

  setupButton: {
    minHeight: 52,
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  setupButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});