import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { generateProgressSummary } from '../../lib/aiService';
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

type LessonLogRow = {
  id: string;
  child_id: string;
  category: string | null;
  lesson_number: number | null;
  lesson_payload: any;
  status: string;
  performance_score: number | null;
  prompt_level: string | null;
  behavior_response: string | null;
  consistency_level: string | null;
  skill_area: string | null;
  stage_number: number | null;
  completed_at: string | null;
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

  const [growthDetailsVisible, setGrowthDetailsVisible] = useState(false);

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
          .from('daily_lesson_instances')
          .select(`
            id,
            child_id,
            category,
            lesson_number,
            lesson_payload,
            status,
            performance_score,
            prompt_level,
            behavior_response,
            consistency_level,
            skill_area,
            stage_number,
            completed_at,
            created_at
          `)
          .eq('child_id', selectedChild.id)
          .in('status', ['completed', 'success'])
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
        const summary = await generateProgressSummary(selectedChild.id);
        setAiRecommendations(summary?.summary ? [summary.summary] : []);
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

  const progressScore = useMemo(() => {
  const scored = lessonLogs.filter(
    (log) => typeof log.performance_score === 'number'
  );

  const lessonAverage = scored.length
    ? scored.reduce((sum, log) => sum + Number(log.performance_score || 0), 0) /
      scored.length
    : 0;

  const routineBoost = Math.min(routineLogs.length * 5, 18);

  const supportPenalty =
    lessonLogs.filter(
      (log) =>
        log.prompt_level === 'physical' ||
        log.behavior_response === 'frustrated' ||
        log.consistency_level === 'low'
    ).length * 6;

  const base = scored.length ? lessonAverage : routineLogs.length ? 58 : 0;

  const rawScore = Math.max(
    0,
    Math.min(100, Math.round(base + routineBoost - supportPenalty))
  );

  if (rawScore >= 95) return 92;
  if (rawScore >= 85) return 86;
  if (rawScore >= 75) return 78;
  if (rawScore >= 60) return 68;
  if (rawScore > 0) return 54;

  return 0;
}, [lessonLogs, routineLogs]);

const strongestSkillGrowth = useMemo(() => {
  if (!lessonLogs.length) {
    return 'Building Predictability';
  }

  const counts: Record<string, number> = {};

  lessonLogs.forEach((log) => {
    const skill =
      log.skill_area ||
      log.lesson_payload?.focus_skill ||
      log.category ||
      'Learning';

    counts[skill] = (counts[skill] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Learning';
}, [lessonLogs]);

const strongestSkillText = useMemo(() => {
  if (strongestSkillGrowth === 'Building Predictability') {
    return 'Daily routines are creating more consistency and confidence.';
  }

  return 'This is the area showing the clearest practice pattern right now.';
}, [strongestSkillGrowth]);

const mostPracticedSkill = useMemo(() => {
  const counts: Record<string, number> = {};

  lessonLogs.forEach((log) => {
    const skill =
      log.skill_area ||
      log.lesson_payload?.focus_skill ||
      log.category ||
      'Learning';

    counts[skill] = (counts[skill] || 0) + 1;
  });

  if (!Object.keys(counts).length && routineLogs.length > 0) {
    return {
      title: 'Daily Routines',
      count: routineLogs.length,
      description: `${routineLogs.length} routine moment${
  routineLogs.length === 1 ? '' : 's'
} practiced this week.`,
    };
  }

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  if (!winner) {
    return {
      title: 'Getting Started',
      count: 0,
      description: 'Practice will appear here after lessons or routines are completed.',
    };
  }

  return {
    title: winner[0],
    count: winner[1],
    description: `${winner[1]} lesson${winner[1] === 1 ? '' : 's'} practiced this week.`,
  };
}, [lessonLogs, routineLogs]);

const strongestSkillDetails = useMemo(() => {
  if (!lessonLogs.length && routineLogs.length > 0) {
    return [
      `${routineLogs.length} routine moment${routineLogs.length === 1 ? '' : 's'} completed this week.`,
      'Routine practice helps create more predictability at home.',
      'Keep repeating the same routine steps so they feel familiar.',
    ];
  }

  if (!lessonLogs.length) {
    return [
      'No lesson practice has been logged yet this week.',
      'One short lesson or routine check-off will start the progress pattern.',
      'This area will update as more practice is completed.',
    ];
  }

  const relatedLessons = lessonLogs.filter((log) => {
    const skill =
      log.skill_area ||
      log.lesson_payload?.focus_skill ||
      log.category ||
      'Learning';

    return skill === strongestSkillGrowth;
  });

  return [
    `${relatedLessons.length} practice moment${
      relatedLessons.length === 1 ? '' : 's'
    } connected to ${strongestSkillGrowth}.`,
    'This area had the clearest practice pattern this week.',
    'Repeat this skill once more before adding a harder next step.',
  ];
}, [lessonLogs, routineLogs, strongestSkillGrowth]);

  const progressTone = useMemo(() => {
  if (progressScore >= 85) return 'Strong week';
  if (progressScore >= 70) return 'Steady progress';
  if (progressScore >= 50) return 'Building momentum';
  return 'Fresh start';
}, [progressScore]);

  const parentWins = useMemo(() => {
    const wins: string[] = [];

    if (lessonLogs.length > 0) {
      wins.push(`${childName} is getting repeated practice with ${strongestSkillGrowth}.`);
    }

    if (routineLogs.length > 0) {
      wins.push('Routine practice is helping create more predictability at home.');
    }

    const independentCount = lessonLogs.filter(
      (log) =>
        log.prompt_level === 'independent' ||
        log.behavior_response === 'independent'
    ).length;

    if (independentCount > 0) {
      wins.push('There were signs of growing independence this week.');
    }

    if (!wins.length) {
      wins.push('Start with one short lesson or routine moment to begin this week’s progress story.');
    }

    return wins.slice(0, 3);
  }, [childName, lessonLogs, routineLogs, strongestSkillGrowth]);

  const nextStep = useMemo(() => {
    if (!lessonLogs.length && !routineLogs.length) {
      return 'Choose one calm moment today and complete a short lesson or routine check-off.';
    }

    const needsSupport = lessonLogs.some(
      (log) =>
        log.prompt_level === 'physical' ||
        log.behavior_response === 'frustrated' ||
        log.consistency_level === 'low'
    );

    if (needsSupport) {
      return 'Keep the next practice short, use simple words, and celebrate small attempts.';
    }

    if (progressScore >= 80) {
      return 'Try a gentle next step: add one new example, person, place, or material.';
    }

    return 'Repeat the strongest skill once more this week to build confidence.';
  }, [lessonLogs, routineLogs, progressScore]);

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
        <ActivityIndicator size="large" color="#7C3AED" />
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
      <View style={styles.bgBlobOne} />
      <View style={styles.bgBlobTwo} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#29145F" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Weekly Insights</Text>
          <Text style={styles.headerSubtitle}>Simple progress for {childName}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => void loadProgressData()}
        >
          <Ionicons name="refresh" size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTextArea}>
            <Text style={styles.heroKicker}>THIS WEEK</Text>
            <Text style={styles.heroTitle}>{progressTone}</Text>
            <Text style={styles.heroText}>
              A parent-friendly snapshot of what is growing, what helped, and
              what to try next.
            </Text>
          </View>

          <View style={styles.illustrationWrap}>
            <View style={styles.illustrationCircleLarge} />
            <View style={styles.illustrationCircleSmall} />
            <View style={styles.illustrationPersonOne}>
              <Ionicons name="person" size={30} color="#7C3AED" />
            </View>
            <View style={styles.illustrationPersonTwo}>
              <Ionicons name="happy" size={28} color="#F97316" />
            </View>
            <View style={styles.illustrationSparkle}>
              <Ionicons name="sparkles" size={22} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreTopRow}>
            <View>
              <Text style={styles.scoreLabel}>Weekly Progress Score</Text>
              <Text style={styles.scoreValue}>{progressScore}%</Text>
            </View>

            <View style={styles.scoreBadge}>
              <Ionicons name="heart-circle-outline" size={18} color="#7C3AED" />
              <Text style={styles.scoreBadgeText}>{progressTone}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressScore}%` }]} />
          </View>

          <Text style={styles.scoreNote}>
            Based on recent lesson feedback, routine consistency, and support needs.
          </Text>
        </View>

        <TouchableOpacity
  activeOpacity={0.9}
  style={styles.growthCard}
  onPress={() => setGrowthDetailsVisible(true)}
>
  <View style={styles.growthIcon}>
    <Ionicons name="trending-up" size={24} color="#0F766E" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.growthLabel}>Strongest Skill Growth</Text>
    <Text style={styles.growthTitle}>{strongestSkillGrowth}</Text>
    <Text style={styles.growthText}>{strongestSkillText}</Text>
    <Text style={styles.tapHint}>Tap to see why</Text>
  </View>

  <Ionicons name="chevron-forward" size={20} color="#0F766E" />
</TouchableOpacity>

<View style={styles.practiceCard}>
  <View style={styles.practiceIcon}>
    <Ionicons name="repeat-outline" size={22} color="#5B3FF4" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.practiceLabel}>Most Practiced This Week</Text>
    <Text style={styles.practiceTitle}>{mostPracticedSkill.title}</Text>
    <Text style={styles.practiceText}>{mostPracticedSkill.description}</Text>
  </View>
</View>

        <Text style={styles.sectionTitle}>Helpful Parent Takeaways</Text>

        <View style={styles.takeawayCard}>
          {parentWins.map((win, index) => (
            <View key={`${win}-${index}`} style={styles.takeawayRow}>
              <View style={styles.takeawayDot}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.takeawayText}>{win}</Text>
            </View>
          ))}
        </View>

        <View style={styles.nextStepCard}>
          <View style={styles.nextStepHeader}>
            <View style={styles.nextStepIcon}>
              <Ionicons name="compass-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.nextStepTitle}>Best Next Step</Text>
          </View>

          <Text style={styles.nextStepText}>{nextStep}</Text>
        </View>

        <View style={styles.aiCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles-outline" size={20} color="#2563EB" />
            <Text style={styles.aiTitle}>Personalized Note</Text>
          </View>

          {recommendationsLoading ? (
            <Text style={styles.aiText}>Reviewing recent progress...</Text>
          ) : aiRecommendations.length > 0 ? (
            aiRecommendations.slice(0, 2).map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.aiText}>
                {item}
              </Text>
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
              ? `Last check-in: ${new Date(lastReassessment).toLocaleDateString()}`
              : 'No check-in completed yet.'}
          </Text>

          <Text style={styles.reassessmentSubText}>
            {isReassessmentDue
              ? 'A quick check-in can refresh the plan.'
              : 'The current plan is still up to date.'}
          </Text>

          {latestReassessmentSummary ? (
            <Text style={styles.summaryText}>{latestReassessmentSummary}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.reassessmentButton}
            onPress={() => router.push('/onboarding/assessment' as any)}
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
          <Text style={styles.reportButtonText}>See Full Weekly Report</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Supportive summaries only — not a diagnosis or medical recommendation.
        </Text>
      </ScrollView>
      <Modal
  visible={growthDetailsVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setGrowthDetailsVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <View style={styles.modalIcon}>
          <Ionicons name="trending-up" size={22} color="#0F766E" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>Why this area?</Text>
          <Text style={styles.modalSubtitle}>{strongestSkillGrowth}</Text>
        </View>

        <TouchableOpacity onPress={() => setGrowthDetailsVisible(false)}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      {strongestSkillDetails.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.modalRow}>
          <View style={styles.modalDot} />
          <Text style={styles.modalText}>{item}</Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => setGrowthDetailsVisible(false)}
      >
        <Text style={styles.modalButtonText}>Got it</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F1' },

  bgBlobOne: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(221, 214, 254, 0.45)',
    top: -90,
    right: -80,
  },

  bgBlobTwo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(254, 215, 170, 0.35)',
    bottom: 120,
    left: -110,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFF8F1',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,248,241,0.96)',
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  headerTextWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: '#201047',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    color: '#7C6F92',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 220,
  },

  heroCard: {
    backgroundColor: '#5B3FF4',
    borderRadius: 34,
    padding: 22,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#5B3FF4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },

  heroTextArea: {
    flex: 1.15,
    zIndex: 2,
  },

  heroKicker: {
    color: '#DDD6FE',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 8,
  },

  heroText: {
    color: '#EDE9FE',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },

  illustrationWrap: {
    flex: 0.85,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },

  illustrationCircleLarge: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  illustrationCircleSmall: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.20)',
    bottom: 10,
    right: 0,
  },

  illustrationPersonOne: {
    position: 'absolute',
    left: 14,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  illustrationPersonTwo: {
    position: 'absolute',
    right: 10,
    top: 28,
    width: 56,
    height: 56,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  illustrationSparkle: {
    position: 'absolute',
    top: 2,
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  scoreTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  scoreLabel: {
    color: '#7C6F92',
    fontSize: 13,
    fontWeight: '900',
  },

  scoreValue: {
    marginTop: 4,
    color: '#201047',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.2,
  },

  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },

  scoreBadgeText: {
    marginLeft: 5,
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '900',
  },

  progressTrack: {
    height: 12,
    backgroundColor: '#EEE7FF',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
  },

  scoreNote: {
    color: '#7C6F92',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
  },

  growthCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  growthIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  growthLabel: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  growthTitle: {
    color: '#064E3B',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },

  growthText: {
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 5,
  },

  sectionTitle: {
    color: '#201047',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  takeawayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1E7FF',
    marginBottom: 14,
  },

  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13,
  },

  takeawayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },

  takeawayText: {
    flex: 1,
    color: '#475569',
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '800',
  },

  nextStepCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },

  nextStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  nextStepIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  nextStepTitle: {
    color: '#7C2D12',
    fontSize: 17,
    fontWeight: '900',
  },

  nextStepText: {
    color: '#9A3412',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
  },

  aiCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  aiTitle: {
    marginLeft: 8,
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '900',
  },

  aiText: {
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },

  reassessmentCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#99F6E4',
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
    height: 58,
    borderRadius: 21,
    backgroundColor: '#5B3FF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#5B3FF4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },

  reportButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  footerText: {
    marginTop: 14,
    color: '#A8A29E',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },

  tapHint: {
  color: '#0F766E',
  fontSize: 12,
  fontWeight: '900',
  marginTop: 8,
  opacity: 0.75,
},

practiceCard: {
  backgroundColor: '#F5F3FF',
  borderRadius: 28,
  padding: 18,
  borderWidth: 1,
  borderColor: '#DDD6FE',
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 22,
},

practiceIcon: {
  width: 52,
  height: 52,
  borderRadius: 19,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 13,
},

practiceLabel: {
  color: '#6D28D9',
  fontSize: 12,
  fontWeight: '900',
  letterSpacing: 0.7,
  textTransform: 'uppercase',
},

practiceTitle: {
  color: '#201047',
  fontSize: 21,
  fontWeight: '900',
  marginTop: 4,
},

practiceText: {
  color: '#6D28D9',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
  marginTop: 5,
},

modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(15, 23, 42, 0.35)',
  justifyContent: 'center',
  padding: 24,
},

modalCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 30,
  padding: 22,
},

modalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 18,
},

modalIcon: {
  width: 48,
  height: 48,
  borderRadius: 18,
  backgroundColor: '#ECFDF5',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

modalTitle: {
  color: '#201047',
  fontSize: 19,
  fontWeight: '900',
},

modalSubtitle: {
  color: '#0F766E',
  fontSize: 14,
  fontWeight: '800',
  marginTop: 2,
},

modalRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 13,
},

modalDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#0F766E',
  marginTop: 7,
  marginRight: 10,
},

modalText: {
  flex: 1,
  color: '#475569',
  fontSize: 14,
  lineHeight: 21,
  fontWeight: '700',
},

modalButton: {
  marginTop: 10,
  height: 50,
  borderRadius: 18,
  backgroundColor: '#5B3FF4',
  alignItems: 'center',
  justifyContent: 'center',
},

modalButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
},
});