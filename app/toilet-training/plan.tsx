import { useChild } from '@/lib/SelectedChildContext';
import {
  getPottyReadinessResult,
  PottyReadinessLevel,
  PottyReadinessResult,
} from '@/lib/toiletTrainingStorage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PlanStep = {
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type PottyPlan = {
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  border: string;
  schedule: string;
  goal: string;
  steps: PlanStep[];
};

function getPlanForLevel(
  level?: PottyReadinessLevel
): PottyPlan {
  if (level === 'not_ready') {
    return {
      title: 'Start with Bathroom Comfort',
      subtitle: 'Focus on comfort before expecting potty success.',
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      schedule: 'Practice 1–2 calm bathroom visits today.',
      goal: 'Goal: enter bathroom calmly or sit for 5–10 seconds.',
      steps: [
        {
          title: 'Visit the bathroom',
          text: 'Walk in, look around, and leave before your child becomes upset.',
          icon: 'walk-outline',
        },
        {
          title: 'Try a short sit',
          text: 'If calm, sit for 5–10 seconds. No pressure to go.',
          icon: 'body-outline',
        },
        {
          title: 'Use simple words',
          text: 'Say: “Bathroom,” “Sit,” and “All done.”',
          icon: 'chatbubble-outline',
        },
      ],
    };
  }

  if (level === 'building_skills') {
    return {
      title: 'Build Potty Skills',
      subtitle: 'Practice small steps with a calm, predictable routine.',
      color: '#7C3AED',
      bg: '#FAF5FF',
      border: '#E9D5FF',
      schedule: 'Try 2–4 potty sits today at calm times.',
      goal: 'Goal: sit briefly and complete the routine without pressure.',
      steps: [
        {
          title: 'Use the visual routine',
          text: 'Show each potty step before asking your child to do it.',
          icon: 'images-outline',
        },
        {
          title: 'Practice pants',
          text: 'Practice pants down/up outside of urgent potty moments.',
          icon: 'shirt-outline',
        },
        {
          title: 'Praise effort',
          text: 'Praise sitting, trying, and staying calm — even without success.',
          icon: 'heart-outline',
        },
      ],
    };
  }

  if (level === 'ready_to_start') {
    return {
      title: 'Begin Scheduled Practice',
      subtitle: 'Use short scheduled sits and log what happens.',
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      schedule: 'Try potty sits every 60–90 minutes today.',
      goal: 'Goal: complete 4–6 calm potty sits.',
      steps: [
        {
          title: 'Start after routines',
          text: 'Try sitting after waking, meals, drinks, and before leaving home.',
          icon: 'time-outline',
        },
        {
          title: 'Keep language short',
          text: 'Say: “First potty, then all done.”',
          icon: 'chatbubble-ellipses-outline',
        },
        {
          title: 'Track patterns',
          text: 'Log success, attempt, or accident so the plan improves over time.',
          icon: 'bar-chart-outline',
        },
      ],
    };
  }

  return {
    title: 'Follow a Consistent Routine',
    subtitle: 'Your child may be ready for a more structured potty routine.',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    schedule: 'Use scheduled sits throughout the day.',
    goal: 'Goal: build independence with routine, communication, and handwashing.',
    steps: [
      {
        title: 'Use predictable timing',
        text: 'Try potty sits at the same daily times when possible.',
        icon: 'calendar-outline',
      },
      {
        title: 'Encourage communication',
        text: 'Accept words, gestures, PECS, pointing, or AAC.',
        icon: 'chatbubbles-outline',
      },
      {
        title: 'Build independence',
        text: 'Practice pants, wiping support, flushing tolerance, and handwashing.',
        icon: 'sparkles-outline',
      },
    ],
  };
}

export default function PottyPlanScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [readiness, setReadiness] = useState<PottyReadinessResult | null>(null);

  async function loadPlan() {
    if (!selectedChild?.id) {
      setReadiness(null);
      return;
    }

    const result = await getPottyReadinessResult(selectedChild.id);
    setReadiness(result);
  }

  useFocusEffect(
    useCallback(() => {
      void loadPlan();
    }, [selectedChild?.id])
  );

  const plan = useMemo(() => getPlanForLevel(readiness?.level), [readiness]);

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowMiddle} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Today’s Potty Plan</Text>
            <Text style={styles.subtitle}>Simple steps based on readiness.</Text>
          </View>
        </View>

        {!readiness ? (
          <View style={styles.noAssessmentCard}>
            <View style={styles.noAssessmentIcon}>
              <Ionicons name="clipboard-outline" size={30} color="#7C3AED" />
            </View>

            <Text style={styles.noAssessmentTitle}>Start with Readiness</Text>
            <Text style={styles.noAssessmentText}>
              Complete the potty readiness assessment first so ABA at Home can suggest a better starting plan.
            </Text>

            <TouchableOpacity
              style={styles.assessmentButton}
              onPress={() => router.push('/toilet-training/readiness')}
            >
              <Text style={styles.assessmentButtonText}>Take Readiness Assessment</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={[
            styles.heroCard,
            { backgroundColor: plan.bg, borderColor: plan.border },
          ]}
        >
          <View pointerEvents="none" style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="calendar-outline" size={30} color={plan.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.heroEyebrow, { color: plan.color }]}>
              DAILY PLAN
            </Text>
            <Text style={[styles.heroTitle, { color: plan.color }]}>
              {plan.title}
            </Text>
            <Text style={styles.heroText}>{plan.subtitle}</Text>
          </View>
        </View>

        <View style={styles.focusCard}>
          <View style={styles.focusRow}>
            <Ionicons name="time-outline" size={22} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={styles.focusTitle}>Schedule</Text>
              <Text style={styles.focusText}>{plan.schedule}</Text>
            </View>
          </View>

          <View style={styles.focusDivider} />

          <View style={styles.focusRow}>
            <Ionicons name="flag-outline" size={22} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.focusTitle}>Today’s Goal</Text>
              <Text style={styles.focusText}>{plan.goal}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Steps for Today</Text>
          <Text style={styles.sectionSubtext}>
            Keep it calm, short, and predictable.
          </Text>
        </View>

        <View style={styles.stepsCard}>
          {plan.steps.map((step, index) => (
            <View
              key={step.title}
              style={[
                styles.stepRow,
                index === plan.steps.length - 1 && styles.stepRowLast,
              ]}
            >
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={22} color={plan.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.visualButton}
          onPress={() => router.push('/toilet-training/visual-steps')}
        >
          <Ionicons name="images-outline" size={20} color="#FFFFFF" />
          <Text style={styles.visualButtonText}>Open Visual Potty Routine</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/toilet-training/problem-solver')}
        >
          <Text style={styles.secondaryButtonText}>Need help with a challenge?</Text>
          <Ionicons name="chevron-forward" size={18} color="#2563EB" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 20, paddingBottom: 48 },

  screenGlowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37,99,235,0.08)',
    top: -130,
    right: -90,
  },
  screenGlowMiddle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(16,185,129,0.05)',
    top: 370,
    left: -140,
  },
  screenGlowBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168,85,247,0.05)',
    bottom: -140,
    right: -130,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },

  noAssessmentCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    marginBottom: 18,
  },
  noAssessmentIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAssessmentTitle: {
    color: '#4C1D95',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12,
  },
  noAssessmentText: {
    color: '#5B21B6',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  assessmentButton: {
    marginTop: 14,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assessmentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  heroGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.25)',
    right: -55,
    top: -60,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
  },
  heroText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  focusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  focusRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  focusTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  focusText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 3,
  },
  focusDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  sectionHeader: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },

  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepRowLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  stepText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },

  visualButton: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 11,
  },
  visualButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '900',
  },
});