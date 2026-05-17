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
import { ensureLessonQueue } from '../../lib/lessonQueue';

import ProfileSwitcher from '../../components/ProfileSwitcher';
import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { generateProgressSummary } from '../../lib/aiService';
import { useResponsiveLayout } from '../../lib/responsive';
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

type DashboardCache = {
  assessment: any | null;
  weeklyLogs: LessonLogRow[];
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

  const itemWidth = `${100 / layout.gridColumns - 2}%`;

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [assessment, setAssessment] = useState<any | null>(null);
  const [weeklyLogs, setWeeklyLogs] = useState<LessonLogRow[]>([]);
  const [weeklySummary, setWeeklySummary] = useState(
    'Progress data is being collected this week.'
  );

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const PRELOAD_CATEGORIES = [
  'Communication',
  'Social',
  'Play',
  'Self-Help',
  'Motor',
];

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
}, [selectedChild?.id, childName, isPro]);


  const hasAssessment = !!assessment;
  const lessonsThisWeek = weeklyLogs.length;

  const topCategory = useMemo(() => {
    if (!weeklyLogs.length) return 'No lessons yet';

    const counts: Record<string, number> = {};

    for (const log of weeklyLogs) {
      counts[log.category] = (counts[log.category] || 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [weeklyLogs]);

  const streakCount = useMemo(() => calculateStreak(weeklyLogs), [weeklyLogs]);

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

    const [assessmentResult, logsResult] = await Promise.all([
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
        .limit(50)
    ]);

    if (assessmentResult.error) throw assessmentResult.error;
    if (logsResult.error) throw logsResult.error;

    return {
      assessment: assessmentResult.data || null,
      weeklyLogs: (logsResult.data || []) as LessonLogRow[],
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

        let summaryText = 'Progress data is being collected this week.';

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

        setWeeklySummary(summaryText);

        await saveDashboardCache({
          assessment: freshData.assessment,
          weeklyLogs: freshData.weeklyLogs,
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
          <Text style={styles.emptyTitle}>No Child Profile Found</Text>

          <Text style={styles.emptyText}>
            Let’s set up your child to start building your ABA plan.
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

          <TouchableOpacity
            style={styles.heroCard}
            onPress={() =>
              hasAssessment
                ? router.push('/daily-lessons')
                : router.push('/onboarding/assessment')
            }
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  {hasAssessment ? 'TODAY’S PLAN' : 'SETUP'}
                </Text>
              </View>

              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>
              {hasAssessment ? 'Start Today’s Lesson' : 'Complete Assessment'}
            </Text>

            <Text style={styles.heroDesc}>
              {hasAssessment
                ? 'Continue your child’s personalized ABA plan with lessons, communication tools, and support activities.'
                : 'Finish the onboarding assessment to personalize lessons, routines, PECS, worksheets, and progress tracking.'}
            </Text>
          </TouchableOpacity>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.summaryValue}>
                {hasAssessment ? 'Ready' : 'Pending'}
              </Text>
              <Text style={styles.summaryLabel}>Assessment</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.summaryValue}>Daily</Text>
              <Text style={styles.summaryLabel}>Lessons</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.summaryValue}>PECS</Text>
              <Text style={styles.summaryLabel}>Tools</Text>
            </View>
          </View>

          <View style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <Ionicons name="flame" size={20} color="#F97316" />
              <Text style={styles.streakTitle}>Streak</Text>
            </View>

            <Text style={styles.streakNumber}>
              {streakCount} Day{streakCount === 1 ? '' : 's'}
            </Text>

            <Text style={styles.streakText}>
              {streakCount > 0
                ? "You're building a strong routine 💪"
                : 'Complete a lesson today to start your streak'}
            </Text>
          </View>

          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
              <Text style={styles.weeklyTitle}>Weekly Progress</Text>
            </View>

            <View style={styles.weeklyStatsRow}>
              <View style={styles.weeklyStatBox}>
                <Text style={styles.weeklyStatNumber}>{lessonsThisWeek}</Text>
                <Text style={styles.weeklyStatLabel}>Lessons This Week</Text>
              </View>

              <View style={styles.weeklyStatBox}>
                <Text style={styles.weeklyStatNumber}>{topCategory}</Text>
                <Text style={styles.weeklyStatLabel}>Top Category</Text>
              </View>
            </View>

            <View style={styles.weeklySummaryBox}>
              <Text style={styles.weeklySummaryLabel}>Summary</Text>

              <Text style={styles.weeklySummaryText}>
                {summaryLoading
                  ? 'Reviewing this week’s progress...'
                  : weeklySummary}
              </Text>
            </View>
          </View>

          <SectionHeader title="Therapy Tools" />

          <View style={styles.grid}>
            <ActionItem
              itemWidth={itemWidth}
              icon="chatbubbles"
              label="PECS"
              subtitle="Talk tools"
              bg="#EEF2FF"
              color="#4F46E5"
              onPress={() => openRoute('/communication')}
            />

            <ActionItem
              itemWidth={itemWidth}
              icon="create"
              label="Worksheets"
              subtitle={isPro ? 'Printables' : 'Pro feature'}
              bg="#FFF7ED"
              color="#EA580C"
              onPress={() => openPremiumRoute('/worksheets')}
            />

            <ActionItem
              itemWidth={itemWidth}
              icon="color-palette"
              label="Activities"
              subtitle="Fun ideas"
              bg="#FDF2F8"
              color="#DB2777"
              onPress={() => openRoute('/activities')}
            />

            <ActionItem
              itemWidth={itemWidth}
              icon="heart-circle"
              label="Parent Support"
              subtitle={isPro ? 'AI guidance' : 'Pro feature'}
              bg="#F3E8FF"
              color="#7C3AED"
              onPress={() => openPremiumRoute('/parent-support')}
            />
          </View>

          <SectionHeader title="Tracking" />

          <View style={styles.grid}>
            <ActionItem
              itemWidth={itemWidth}
              icon="trending-up"
              label="Progress"
              subtitle="Growth"
              bg="#EFF6FF"
              color="#2563EB"
              onPress={() => openRoute('/progress')}
            />

            <ActionItem
              itemWidth={itemWidth}
              icon="clipboard"
              label="Assessment"
              subtitle="Review"
              bg="#FEF3C7"
              color="#D97706"
              onPress={() => openRoute('/onboarding/assessment')}
            />
          </View>

          <SectionHeader title="Resources" />

          <View style={styles.grid}>
            <ActionItem
              itemWidth={itemWidth}
              icon="play-circle-outline"
              label="Video Hub"
              subtitle="Parent videos"
              bg="#FEF2F2"
              color="#DC2626"
              onPress={() => openRoute('/videos')}
            />

            <ActionItem
              itemWidth={itemWidth}
              icon="book"
              label="Library"
              subtitle="Guides"
              bg="#F1F5F9"
              color="#475569"
              onPress={() => openRoute('/resources')}
            />

            <ActionItem
              itemWidth={itemWidth}
              icon="albums-outline"
              label="Manage PECS"
              subtitle={isPro ? 'Edit cards' : 'Pro feature'}
              bg="#ECFDF5"
              color="#059669"
              onPress={() => openPremiumRoute('/manage-pecs')}
            />

            <ActionItem
              itemWidth={itemWidth}
              icon="add-circle-outline"
              label="Add Child"
              subtitle={isPro ? 'New profile' : 'Pro feature'}
              bg="#EEF2FF"
              color="#4338CA"
              onPress={() => openPremiumRoute('/onboarding/add-child')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ActionItem({
  itemWidth,
  icon,
  label,
  subtitle,
  bg,
  color,
  onPress,
}: {
  itemWidth: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  bg: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.item, { width: itemWidth }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.itemIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <Text style={styles.itemText} numberOfLines={1}>
        {label}
      </Text>

      <Text style={styles.itemSubtext} numberOfLines={1}>
        {subtitle}
      </Text>
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

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
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

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  summaryLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },

  streakCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  streakTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#9A3412',
  },

  streakNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#EA580C',
  },

  streakText: {
    marginTop: 6,
    fontSize: 14,
    color: '#C2410C',
  },

  weeklyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
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
    marginBottom: 14,
    gap: 12,
  },

  weeklyStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },

  weeklyStatNumber: {
    fontSize: 18,
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

  weeklySummaryBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
  },

  weeklySummaryLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3730A3',
    marginBottom: 6,
  },

  weeklySummaryText: {
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  item: {
    minHeight: 140,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  itemIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  itemText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#1E293B',
  },

  itemSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#111827',
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