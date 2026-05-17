import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../lib/SelectedChildContext';
import { generateProgressRecommendations } from '../../lib/aiService';
import { supabase } from '../../lib/supabase';

const screenWidth = Dimensions.get('window').width;

type ProgressSkill = {
  id: number;
  name: string;
  progress: number;
  color: string;
  status: 'Not Started' | 'In Progress' | 'Emerging' | 'Mastered';
  description: string;
  strengths: string[];
  nextSteps: string[];
  caregiverTip: string;
};

type ProgressStat = {
  label: string;
  value: string;
};

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
  routine_period: 'morning' | 'afternoon' | 'evening' | string;
  routine_name: string;
  task_name: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
};

type ReassessmentRow = {
  id: string;
  child_id: string;
  responses: Record<string, string>;
  summary: string | null;
  created_at: string;
};

export default function ProgressScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<ProgressSkill | null>(null);

  const [lessonLogs, setLessonLogs] = useState<LessonLogRow[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLogRow[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [lastReassessment, setLastReassessment] = useState<string | null>(null);
  const [latestReassessmentSummary, setLatestReassessmentSummary] = useState<string | null>(null);

  const childName =
    selectedChild?.child_name ||
    selectedChild?.name ||
    'your child';

  useEffect(() => {
    if (selectedChild?.id) {
      void loadProgressData();
    } else {
      setLoading(false);
    }
  }, [selectedChild]);

  const loadProgressData = async () => {
    if (!selectedChild?.id) return;

    setLoading(true);

    try {
      const currentChildName =
        selectedChild?.child_name ||
        selectedChild?.name ||
        'your child';

      const [lessonRes, routineRes, reassessmentRes] = await Promise.all([
        supabase
          .from('lesson_logs')
          .select('*')
          .eq('child_id', selectedChild.id)
          .eq('status', 'success')
          .order('completed_at', { ascending: false }),

        supabase
          .from('routine_logs')
          .select('*')
          .eq('child_id', selectedChild.id)
          .eq('completed', true)
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
      const latestReassessment = (reassessmentRes.data?.[0] as ReassessmentRow | undefined) || null;

      setLessonLogs(lessons);
      setRoutineLogs(routines);
      setLastReassessment(latestReassessment?.created_at || null);
      setLatestReassessmentSummary(latestReassessment?.summary || null);

      setRecommendationsLoading(true);

      try {
        const recommendationResult = await generateProgressRecommendations({
          childName: currentChildName,
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

        setAiRecommendations(recommendationResult.recommendations || []);
      } catch (error) {
        console.error('Recommendation load error:', error);
        setAiRecommendations([]);
      } finally {
        setRecommendationsLoading(false);
      }
    } catch (error) {
      console.error('Progress load error:', error);
      setAiRecommendations([]);
      setLastReassessment(null);
      setLatestReassessmentSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const lessonsDone = useMemo(() => lessonLogs.length, [lessonLogs]);

  const dayStreak = useMemo(() => {
    if (!lessonLogs.length) return 0;

    const uniqueDates = Array.from(
      new Set(
        lessonLogs.map((log) => {
          const date = new Date(log.completed_at);
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
            date.getUTCDate()
          ).padStart(2, '0')}`;
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

    for (let i = 0; i < uniqueDates.length; i += 1) {
      const [year, month, day] = uniqueDates[i].split('-').map(Number);
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
  }, [lessonLogs]);

  const routinesThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return routineLogs.filter(
      (log) => new Date(log.completed_at) >= sevenDaysAgo
    ).length;
  }, [routineLogs]);

  const mostConsistentRoutine = useMemo(() => {
    if (!routineLogs.length) return 'No routine data';

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyRoutineLogs = routineLogs.filter(
      (log) => new Date(log.completed_at) >= sevenDaysAgo
    );

    if (!weeklyRoutineLogs.length) return 'No routine data';

    const counts: Record<string, number> = {};

    weeklyRoutineLogs.forEach((log) => {
      counts[log.routine_period] = (counts[log.routine_period] || 0) + 1;
    });

    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!winner) return 'No routine data';

    return winner.charAt(0).toUpperCase() + winner.slice(1);
  }, [routineLogs]);

  const routineCompletionRate = useMemo(() => {
    const targetPerWeek = 21;
    const rate = Math.min(100, Math.round((routinesThisWeek / targetPerWeek) * 100));
    return `${rate}%`;
  }, [routinesThisWeek]);

  const topLessonCategory = useMemo(() => {
    if (!lessonLogs.length) return 'No lessons yet';

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyLessonLogs = lessonLogs.filter(
      (log) => new Date(log.completed_at) >= sevenDaysAgo
    );

    if (!weeklyLessonLogs.length) return 'No lessons yet';

    const counts: Record<string, number> = {};
    weeklyLessonLogs.forEach((log) => {
      counts[log.category] = (counts[log.category] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No lessons yet';
  }, [lessonLogs]);

  const recentPerformanceTrend = useMemo(() => {
    const recent = lessonLogs
      .filter((log) => !!log.performance)
      .slice(0, 5);

    if (!recent.length) return 'No lesson feedback yet.';

    const counts = {
      easy: 0,
      just_right: 0,
      challenging: 0,
    };

    recent.forEach((log) => {
      if (log.performance === 'easy') counts.easy += 1;
      if (log.performance === 'just_right') counts.just_right += 1;
      if (log.performance === 'challenging') counts.challenging += 1;
    });

    if (counts.just_right >= counts.easy && counts.just_right >= counts.challenging) {
      return 'Lessons are landing at a good level overall.';
    }

    if (counts.easy > counts.just_right && counts.easy >= counts.challenging) {
      return 'Recent lessons may be feeling easier, which could support moving into slightly harder goals.';
    }

    return 'Recent lessons may need extra support, repetition, or simpler steps.';
  }, [lessonLogs]);

  const combinedInsights = useMemo(() => {
    const insights: string[] = [];

    if (mostConsistentRoutine !== 'No routine data') {
      insights.push(`${mostConsistentRoutine} routine is the strongest area for consistency right now.`);
    }

    if (topLessonCategory !== 'No lessons yet') {
      insights.push(`${topLessonCategory} is the most-practiced lesson category this week.`);
    }

    if (routinesThisWeek >= 10) {
      insights.push('Routine follow-through is building nicely this week.');
    } else if (routinesThisWeek > 0) {
      insights.push('Routine follow-through is getting started and can grow with more daily check-offs.');
    }

    insights.push(recentPerformanceTrend);

    return insights.slice(0, 3);
  }, [mostConsistentRoutine, topLessonCategory, routinesThisWeek, recentPerformanceTrend]);

  const skills: ProgressSkill[] = useMemo(() => {
    const categories = ['Communication', 'Behavior', 'Learning', 'Social'];

    const getStatus = (
      score: number
    ): 'Not Started' | 'In Progress' | 'Emerging' | 'Mastered' => {
      if (score >= 0.85) return 'Mastered';
      if (score >= 0.6) return 'Emerging';
      if (score >= 0.3) return 'In Progress';
      return 'Not Started';
    };

    const getColor = (category: string) => {
      switch (category) {
        case 'Communication':
          return '#3B82F6';
        case 'Behavior':
          return '#10B981';
        case 'Learning':
          return '#8B5CF6';
        case 'Social':
          return '#F59E0B';
        default:
          return '#4F46E5';
      }
    };

    return categories.map((category, index) => {
      const categoryLessons = lessonLogs.filter(
        (log) => log.category?.toLowerCase() === category.toLowerCase()
      );

      if (!categoryLessons.length) {
        return {
          id: index,
          name: category,
          progress: 0,
          color: getColor(category),
          status: 'Not Started',
          description: `${category} skills are just getting started.`,
          strengths: ['Limited data so far'],
          nextSteps: ['Start practicing this skill area more often'],
          caregiverTip:
            'Begin with short, successful practice opportunities and build consistency over time.',
        };
      }

      let score = 0;

      categoryLessons.forEach((log) => {
        if (log.performance === 'easy') score += 1;
        else if (log.performance === 'just_right') score += 0.7;
        else if (log.performance === 'challenging') score += 0.3;
        else score += 0.5;
      });

      score /= categoryLessons.length;

      const routineBonus = Math.min(0.15, routinesThisWeek / 50);
      const finalScore = Math.min(1, score + routineBonus);
      const status = getStatus(finalScore);

      const strengths =
        finalScore > 0.7
          ? [
              'Consistent performance across recent lessons',
              'Responds well to instruction and repetition',
            ]
          : [
              'Building foundational understanding',
              'Shows room for growth with ongoing practice',
            ];

      const nextSteps =
        finalScore > 0.7
          ? [
              'Generalize this skill into new settings',
              'Work on increasing independence',
            ]
          : [
              'Continue repetition with clear support',
              'Use shorter practice sessions and strong reinforcement',
            ];

      const caregiverTip =
        finalScore > 0.7
          ? 'Try practicing this skill in more than one environment to build generalization.'
          : 'Keep practice short, supportive, and motivating so the child can build confidence.';

      return {
        id: index,
        name: category,
        progress: finalScore,
        color: getColor(category),
        status,
        description: `${category} development based on real lesson performance and routine consistency.`,
        strengths,
        nextSteps,
        caregiverTip,
      };
    });
  }, [lessonLogs, routinesThisWeek]);

  const stats: ProgressStat[] = useMemo(
    () => [
      { label: 'Lessons Done', value: String(lessonsDone) },
      { label: 'Day Streak', value: String(dayStreak) },
      { label: 'Routine Tasks', value: String(routinesThisWeek) },
      { label: 'Routine Rate', value: routineCompletionRate },
    ],
    [lessonsDone, dayStreak, routinesThisWeek, routineCompletionRate]
  );

  const buildSkillTrend = (category: string) => {
    const filtered = lessonLogs
      .filter((log) => log.category?.toLowerCase() === category.toLowerCase())
      .slice(0, 10)
      .reverse();

    const labels = filtered.map((_, i) => `#${i + 1}`);

    const data = filtered.map((log) => {
      if (log.performance === 'easy') return 100;
      if (log.performance === 'just_right') return 75;
      if (log.performance === 'challenging') return 40;
      return 60;
    });

    return {
      labels: labels.length ? labels : ['No Data'],
      data: data.length ? data : [0],
    };
  };

  const selectedSkillTrend = useMemo(() => {
    if (!selectedSkill) {
      return { labels: ['No Data'], data: [0] };
    }
    return buildSkillTrend(selectedSkill.name);
  }, [selectedSkill, lessonLogs]);

  const isReassessmentDue = useMemo(() => {
    if (!lastReassessment) return true;

    const last = new Date(lastReassessment);
    const now = new Date();
    const diffDays =
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

    return diffDays >= 30;
  }, [lastReassessment]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="stats-chart-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select or create a child profile to view progress.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSubtitle}>
            Tracking {childName}&apos;s learning and growth
          </Text>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
  <Ionicons name="arrow-back" size={22} color="#0F172A" />
</TouchableOpacity>

        <TouchableOpacity style={styles.reportBtn} onPress={() => void loadProgressData()}>
          <Ionicons name="refresh" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadProgressData();
            }}
            tintColor="#4F46E5"
          />
        }
      >
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/reports')}>
            <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Focus</Text>
          <Text style={styles.summaryBody}>
            {childName} is currently building communication, learning readiness,
            routine consistency, and daily lesson follow-through. Keep logging lessons
            and routines to strengthen long-term progress insights.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="sparkles" size={18} color="#7C3AED" />
            <Text style={styles.insightsTitle}>Progress Insights</Text>
          </View>

          {combinedInsights.map((insight, index) => (
            <View key={`${insight}-${index}`} style={styles.insightRow}>
              <Text style={styles.insightDot}>•</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        <View style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <Ionicons name="sparkles-outline" size={18} color="#2563EB" />
            <Text style={styles.recommendationTitle}>AI Next-Step Recommendations</Text>
          </View>

          {recommendationsLoading ? (
            <Text style={styles.recommendationText}>Reviewing recent progress...</Text>
          ) : aiRecommendations.length > 0 ? (
            aiRecommendations.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.recommendationRow}>
                <Text style={styles.recommendationDot}>•</Text>
                <Text style={styles.recommendationText}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.recommendationText}>
              Complete a few more lessons and routines to unlock personalized next-step recommendations.
            </Text>
          )}
        </View>

        <View style={styles.reassessmentCard}>
          <View style={styles.reassessmentHeader}>
            <Ionicons name="clipboard-outline" size={18} color="#4F46E5" />
            <Text style={styles.reassessmentTitle}>Monthly Reassessment</Text>
          </View>

          <Text style={styles.reassessmentText}>
            {lastReassessment
              ? `Last completed on ${new Date(lastReassessment).toLocaleDateString()}`
              : 'No reassessment completed yet.'}
          </Text>

          <Text style={styles.reassessmentSubText}>
            {isReassessmentDue
              ? 'A new reassessment is ready. Update your child’s progress.'
              : 'Your child’s plan is up to date.'}
          </Text>

          <TouchableOpacity
            style={[
              styles.reassessmentBtn,
              isReassessmentDue && styles.reassessmentBtnActive,
            ]}
            onPress={() => router.push('/reassessment')}
          >
            <Text style={styles.reassessmentBtnText}>
              {isReassessmentDue ? 'Start Reassessment' : 'View / Update'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reassessmentSummaryCard}>
          <View style={styles.reassessmentSummaryHeader}>
            <Ionicons name="document-text-outline" size={18} color="#7C3AED" />
            <Text style={styles.reassessmentSummaryTitle}>Latest Reassessment Summary</Text>
          </View>
          <Text style={styles.reassessmentSummaryText}>
            {latestReassessmentSummary ||
              'Complete a monthly reassessment to generate a saved summary of current strengths and needs.'}
          </Text>
        </View>

        <View style={styles.routineSummaryCard}>
          <View style={styles.routineSummaryHeader}>
            <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
            <Text style={styles.routineSummaryTitle}>Routine Consistency</Text>
          </View>

          <View style={styles.routineSummaryRow}>
            <View style={styles.routineSummaryBox}>
              <Text style={styles.routineSummaryValue}>{routinesThisWeek}</Text>
              <Text style={styles.routineSummaryLabel}>Tasks This Week</Text>
            </View>

            <View style={styles.routineSummaryBox}>
              <Text style={styles.routineSummaryValue}>{mostConsistentRoutine}</Text>
              <Text style={styles.routineSummaryLabel}>Most Consistent</Text>
            </View>
          </View>

          <Text style={styles.routineSummaryText}>
            Routine check-offs are now part of the child’s broader development picture.
            Keep logging morning, afternoon, and evening tasks to build consistency.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Skill Progress</Text>

        {skills.map((skill) => (
          <View key={skill.id} style={styles.skillCard}>
            <View style={styles.skillTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillStatus}>{skill.status}</Text>
              </View>
              <Text style={styles.skillPercent}>
                {Math.round(skill.progress * 100)}%
              </Text>
            </View>

            <View style={styles.barContainer}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${skill.progress * 100}%`,
                    backgroundColor: skill.color,
                  },
                ]}
              />
            </View>

            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => setSelectedSkill(skill)}
            >
              <Text style={styles.detailText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.assessmentCard}>
          <View style={styles.assessmentHeader}>
            <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
            <Text style={styles.assessmentTitle}>30-Day Reassessment</Text>
          </View>
          <Text style={styles.assessmentText}>
            Your monthly reassessment feature can plug in here later so parents can
            update goals, review progress, and refresh the child&apos;s plan.
          </Text>
        </View>

        <View style={styles.footerInfo}>
          <Ionicons name="shield-checkmark" size={16} color="#94A3B8" />
          <Text style={styles.footerText}>
            Progress data now reflects lessons, routines, and reassessment history, with room to expand into worksheets and communication goals.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedSkill}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSkill(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>{selectedSkill?.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedSkill?.status}</Text>
              </View>

              <TouchableOpacity onPress={() => setSelectedSkill(null)}>
                <Ionicons name="close-circle" size={30} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalProgressCard}>
                <Text style={styles.modalProgressLabel}>Progress</Text>
                <Text style={styles.modalProgressValue}>
                  {selectedSkill ? `${Math.round(selectedSkill.progress * 100)}%` : '--'}
                </Text>
                <View style={styles.modalBarContainer}>
                  <View
                    style={[
                      styles.modalBarFill,
                      {
                        width: selectedSkill ? `${selectedSkill.progress * 100}%` : '0%',
                        backgroundColor: selectedSkill?.color || '#4F46E5',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.detailCardTitle}>Progress Over Time</Text>
                <LineChart
                  data={{
                    labels: selectedSkillTrend.labels,
                    datasets: [{ data: selectedSkillTrend.data }],
                  }}
                  width={screenWidth - 72}
                  height={190}
                  fromZero
                  withDots
                  withInnerLines={false}
                  withOuterLines
                  withShadow={false}
                  chartConfig={{
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: () => '#4F46E5',
                    labelColor: () => '#64748B',
                    propsForBackgroundLines: {
                      stroke: '#E2E8F0',
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#4F46E5',
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>What This Skill Means</Text>
                <Text style={styles.detailCardText}>
                  {selectedSkill?.description}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Current Strengths</Text>
                {selectedSkill?.strengths.map((item, index) => (
                  <View key={`strength-${index}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Recommended Next Steps</Text>
                {selectedSkill?.nextSteps.map((item, index) => (
                  <View key={`step-${index}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>{index + 1}.</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tipBox}>
                <View style={styles.tipHeader}>
                  <Ionicons name="bulb" size={18} color="#F59E0B" />
                  <Text style={styles.tipTitle}>Caregiver Tip</Text>
                </View>
                <Text style={styles.tipText}>
                  {selectedSkill?.caregiverTip}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedSkill(null)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#111827',
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  reportBtn: {
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  actionRow: {
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  summaryBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightsTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#6D28D9',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  insightDot: {
    width: 18,
    fontSize: 14,
    fontWeight: '800',
    color: '#7C3AED',
  },
  insightText: {
    flex: 1,
    color: '#6B21A8',
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendationDot: {
    width: 18,
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  recommendationText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
  },
  reassessmentCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },
  reassessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reassessmentTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#3730A3',
  },
  reassessmentText: {
    color: '#4338CA',
    fontSize: 14,
    marginBottom: 4,
  },
  reassessmentSubText: {
    color: '#6366F1',
    fontSize: 13,
    marginBottom: 12,
  },
  reassessmentBtn: {
    backgroundColor: '#CBD5F5',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reassessmentBtnActive: {
    backgroundColor: '#4F46E5',
  },
  reassessmentBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  reassessmentSummaryCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },
  reassessmentSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reassessmentSummaryTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#6D28D9',
  },
  reassessmentSummaryText: {
    color: '#6B21A8',
    fontSize: 14,
    lineHeight: 20,
  },
  routineSummaryCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },
  routineSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routineSummaryTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#3730A3',
  },
  routineSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  routineSummaryBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  routineSummaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  routineSummaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
  routineSummaryText: {
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  skillCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  skillName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  skillStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  skillPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
    marginLeft: 12,
  },
  barContainer: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  detailText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    marginRight: 4,
  },
  assessmentCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 22,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginTop: 6,
    marginBottom: 18,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assessmentTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  assessmentText: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 21,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F8FAFC',
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  modalProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalProgressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  modalProgressValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalBarContainer: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  modalBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chart: {
    marginTop: 8,
    borderRadius: 16,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  detailCardText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 20,
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
  tipBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 18,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#92400E',
  },
  tipText: {
    color: '#B45309',
    lineHeight: 20,
    fontSize: 14,
  },
  closeBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  backBtn: {
  width: 42,
  height: 42,
  borderRadius: 14,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
});