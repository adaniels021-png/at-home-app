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

import { generateProgressRecommendations } from '../../lib/aiService';
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

type LessonLogRow = {
  id: string;
  child_id: string;
  category: string;
  lesson_number: number;
  lesson_name: string | null;
  status: string;
  performance: string | null;
  notes: string | null;
  completed_at: string;
  created_at: string;
};

type RoutineLogRow = {
  id: string;
  child_id: string;
  routine_period: string;
  routine_name?: string | null;
  task_name: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
};

type ReassessmentRow = {
  id: string;
  child_id: string;
  responses: Record<string, any>;
  summary: string | null;
  created_at: string;
};

export default function ProgressScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessonLogs, setLessonLogs] = useState<LessonLogRow[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLogRow[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [lastReassessment, setLastReassessment] = useState<string | null>(null);
  const [latestReassessmentSummary, setLatestReassessmentSummary] =
    useState<string | null>(null);

  const childName =
    selectedChild?.child_name || selectedChild?.name || 'your child';

  useEffect(() => {
    if (selectedChild?.id) {
      void loadProgressData();
    } else {
      setLoading(false);
    }
  }, [selectedChild?.id]);

  async function loadProgressData() {
    if (!selectedChild?.id) return;

    try {
      setLoading(true);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [lessonRes, routineRes, reassessmentRes] = await Promise.all([
        supabase
          .from('lesson_logs')
          .select('*')
          .eq('child_id', selectedChild.id)
          .eq('status', 'success')
          .gte('completed_at', sevenDaysAgo.toISOString())
          .order('completed_at', { ascending: false }),

        supabase
          .from('routine_logs')
          .select('*')
          .eq('child_id', selectedChild.id)
          .eq('completed', true)
          .gte('completed_at', sevenDaysAgo.toISOString())
          .order('completed_at', { ascending: false }),

        supabase
          .from('reassessments')
          .select('*')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (lessonRes.error) throw lessonRes.error;
      if (routineRes.error) throw routineRes.error;
      if (reassessmentRes.error) throw reassessmentRes.error;

      const lessons = (lessonRes.data || []) as LessonLogRow[];
      const routines = (routineRes.data || []) as RoutineLogRow[];
      const reassessment =
        (reassessmentRes.data?.[0] as ReassessmentRow | undefined) || null;

      setLessonLogs(lessons);
      setRoutineLogs(routines);
      setLastReassessment(reassessment?.created_at || null);
      setLatestReassessmentSummary(reassessment?.summary || null);

      setRecommendationsLoading(true);

      try {
        const result = await generateProgressRecommendations({
          childName,
          lessonLogs: lessons.map((log) => ({
            category: log.category,
            performance: log.performance,
            completed_at: log.completed_at,
          })),
          routineLogs: routines.map((log) => ({
            routine_period: log.routine_period,
            completed_at: log.completed_at,
          })),
        });

        setAiRecommendations(result?.recommendations || []);
      } catch (error) {
        console.error('Recommendation load error:', error);
        setAiRecommendations([]);
      } finally {
        setRecommendationsLoading(false);
      }
    } catch (error: any) {
      console.error('Progress load error:', error);
      Alert.alert(
        'Progress Error',
        error?.message || 'Could not load progress right now.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const lessonsThisWeek = lessonLogs.length;
  const routinesThisWeek = routineLogs.length;

  const topLessonCategory = useMemo(() => {
    if (!lessonLogs.length) return 'No lessons yet';

    const counts: Record<string, number> = {};

    lessonLogs.forEach((log) => {
      const category = log.category || 'General';
      counts[category] = (counts[category] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [lessonLogs]);

  const strongestRoutine = useMemo(() => {
    if (!routineLogs.length) return 'No routine data yet';

    const counts: Record<string, number> = {};

    routineLogs.forEach((log) => {
      const period = log.routine_period || 'Routine';
      counts[period] = (counts[period] || 0) + 1;
    });

    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!winner) return 'No routine data yet';

    return winner.charAt(0).toUpperCase() + winner.slice(1);
  }, [routineLogs]);

  const lessonTrend = useMemo(() => {
    const withPerformance = lessonLogs.filter((log) => !!log.performance);

    if (!withPerformance.length) {
      return 'Complete a few lessons with feedback to see learning patterns.';
    }

    const counts = {
      easy: 0,
      justRight: 0,
      challenging: 0,
    };

    withPerformance.forEach((log) => {
      if (log.performance === 'easy') counts.easy += 1;
      if (log.performance === 'just_right') counts.justRight += 1;
      if (log.performance === 'challenging') counts.challenging += 1;
    });

    if (counts.justRight >= counts.easy && counts.justRight >= counts.challenging) {
      return 'Recent lessons seem to be landing at a helpful level.';
    }

    if (counts.easy > counts.challenging) {
      return 'Some lessons may be feeling easier, so the next step may be adding gentle challenge.';
    }

    return 'Some lessons may need extra repetition, shorter steps, or more support.';
  }, [lessonLogs]);

  const weeklyInsights = useMemo(() => {
    const insights: string[] = [];

    if (lessonsThisWeek > 0) {
      insights.push(`${childName} practiced ${topLessonCategory} most often this week.`);
    }

    if (routinesThisWeek > 0) {
      insights.push(`${strongestRoutine} routine showed the most consistency.`);
    }

    insights.push(lessonTrend);

    if (lessonsThisWeek === 0 && routinesThisWeek === 0) {
      return [
        'Progress insights will appear after lessons or routines are completed.',
        'Start with one short lesson or one routine check-off today.',
      ];
    }

    return insights.slice(0, 3);
  }, [
    childName,
    lessonsThisWeek,
    routinesThisWeek,
    strongestRoutine,
    topLessonCategory,
    lessonTrend,
  ]);

  const focusAreas = useMemo(() => {
    const areas = [
      {
        title: 'Communication',
        icon: 'chatbubbles-outline' as keyof typeof Ionicons.glyphMap,
        color: '#2563EB',
        bg: '#EFF6FF',
        text:
          topLessonCategory === 'Communication'
            ? 'Communication has been a major focus this week.'
            : 'Use choices, requesting, and simple language during daily routines.',
      },
      {
        title: 'Routines',
        icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
        color: '#0F766E',
        bg: '#ECFDF5',
        text:
          routinesThisWeek > 0
            ? 'Routine practice is helping build predictability.'
            : 'Try one simple routine check-off to begin building consistency.',
      },
      {
        title: 'Learning',
        icon: 'book-outline' as keyof typeof Ionicons.glyphMap,
        color: '#7C3AED',
        bg: '#F5F3FF',
        text:
          lessonsThisWeek > 0
            ? 'Short lessons are building a useful learning pattern.'
            : 'Start with a short lesson when your child is regulated.',
      },
    ];

    return areas;
  }, [lessonsThisWeek, routinesThisWeek, topLessonCategory]);

  const isReassessmentDue = useMemo(() => {
    if (!lastReassessment) return true;

    const last = new Date(lastReassessment);
    const now = new Date();
    const diffDays =
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

    return diffDays >= 30;
  }, [lastReassessment]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadProgressData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading weekly insights...</Text>
      </View>
    );
  }

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="stats-chart-outline" size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select or create a child profile to view weekly insights.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Weekly Insights</Text>
          <Text style={styles.headerSubtitle}>Helpful patterns for {childName}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => void loadProgressData()}
        >
          <Ionicons name="refresh" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles-outline" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>This week at a glance</Text>

          <Text style={styles.heroText}>
            These insights are based on recent lessons, routines, and caregiver
            activity. They are meant to guide—not pressure—your family.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lessonsThisWeek}</Text>
            <Text style={styles.statLabel}>Lessons practiced</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{routinesThisWeek}</Text>
            <Text style={styles.statLabel}>Routine moments</Text>
          </View>
        </View>

        <View style={styles.insightsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={20} color="#7C3AED" />
            <Text style={styles.cardTitle}>Parent-Friendly Insights</Text>
          </View>

          {weeklyInsights.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.insightRow}>
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recommended Focus Areas</Text>

        {focusAreas.map((area) => (
          <View key={area.title} style={styles.focusCard}>
            <View style={[styles.focusIcon, { backgroundColor: area.bg }]}>
              <Ionicons name={area.icon} size={23} color={area.color} />
            </View>

            <View style={styles.focusTextWrap}>
              <Text style={styles.focusTitle}>{area.title}</Text>
              <Text style={styles.focusText}>{area.text}</Text>
            </View>
          </View>
        ))}

        <View style={styles.aiCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles-outline" size={20} color="#2563EB" />
            <Text style={styles.aiTitle}>Personalized Next Steps</Text>
          </View>

          {recommendationsLoading ? (
            <Text style={styles.aiText}>Reviewing recent progress...</Text>
          ) : aiRecommendations.length > 0 ? (
            aiRecommendations.slice(0, 4).map((item, index) => (
              <View key={`${item}-${index}`} style={styles.aiRow}>
                <Text style={styles.aiNumber}>{index + 1}</Text>
                <Text style={styles.aiText}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.aiText}>
              Complete a few more lessons or routines to unlock stronger
              personalized recommendations.
            </Text>
          )}
        </View>

        <View style={styles.reassessmentCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard-outline" size={20} color="#0F766E" />
            <Text style={styles.reassessmentTitle}>Plan Check-In</Text>
          </View>

          <Text style={styles.reassessmentText}>
            {lastReassessment
              ? `Last reassessment: ${new Date(lastReassessment).toLocaleDateString()}`
              : 'No reassessment completed yet.'}
          </Text>

          <Text style={styles.reassessmentSubText}>
            {isReassessmentDue
              ? 'A new reassessment can help refresh the plan.'
              : 'The current plan is still up to date.'}
          </Text>

          {latestReassessmentSummary ? (
            <Text style={styles.summaryText}>{latestReassessmentSummary}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.reassessmentButton}
            onPress={() => router.push('/reassessment' as any)}
          >
            <Text style={styles.reassessmentButtonText}>
              {isReassessmentDue ? 'Start Check-In' : 'View / Update'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/reports' as any)}
        >
          <Ionicons name="document-text-outline" size={19} color="#FFFFFF" />
          <Text style={styles.reportButtonText}>Export Progress Report</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Progress insights are supportive summaries, not a clinical diagnosis or
          medical recommendation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '600',
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },

  headerSubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 42,
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    padding: 22,
    marginBottom: 16,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#E0E7FF',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  statValue: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
  },

  statLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  cardTitle: {
    marginLeft: 8,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 11,
  },

  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    marginTop: 7,
    marginRight: 10,
  },

  insightText: {
    flex: 1,
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  focusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  focusIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  focusTextWrap: {
    flex: 1,
  },

  focusTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  focusText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 4,
  },

  aiCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 8,
    marginBottom: 16,
  },

  aiTitle: {
    marginLeft: 8,
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '900',
  },

  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  aiNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '900',
    marginRight: 9,
  },

  aiText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  reassessmentCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },

  reassessmentTitle: {
    marginLeft: 8,
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '900',
  },

  reassessmentText: {
    color: '#115E59',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },

  reassessmentSubText: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 12,
  },

  summaryText: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    color: '#115E59',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 12,
  },

  reassessmentButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F766E',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
  },

  reassessmentButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  reportButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  reportButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  footerText: {
    marginTop: 14,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
});