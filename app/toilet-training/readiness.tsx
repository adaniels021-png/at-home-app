import { useChild } from '@/lib/SelectedChildContext';
import {
    PottyReadinessLevel,
    savePottyReadinessResult,
} from '@/lib/toiletTrainingStorage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Question = {
  id: string;
  text: string;
  helper: string;
};

const questions: Question[] = [
  {
    id: 'stays_dry',
    text: 'Stays dry for 30–60 minutes',
    helper: 'This can mean your child may be starting to notice body signals.',
  },
  {
    id: 'sits_briefly',
    text: 'Can sit on the toilet or potty briefly',
    helper: 'Even 10–30 seconds counts as a starting point.',
  },
  {
    id: 'follows_direction',
    text: 'Can follow a simple 1-step direction',
    helper: 'Example: “sit down,” “pants down,” or “wash hands.”',
  },
  {
    id: 'bathroom_tolerance',
    text: 'Can enter the bathroom without major distress',
    helper: 'If the bathroom is scary, start with comfort before training.',
  },
  {
    id: 'pants_skill',
    text: 'Helps with pants up or down',
    helper: 'They do not need full independence yet.',
  },
  {
    id: 'wet_awareness',
    text: 'Notices when wet or soiled',
    helper: 'They may pull at diaper, pause, point, or act uncomfortable.',
  },
  {
    id: 'communication',
    text: 'Has a way to request help',
    helper: 'Words, gestures, pointing, PECS, AAC, or bringing you to the bathroom all count.',
  },
  {
    id: 'caregiver_ready',
    text: 'Caregiver can practice consistently',
    helper: 'Short, calm, predictable practice is more important than perfection.',
  },
];

function getReadinessLevel(score: number): PottyReadinessLevel {
  if (score <= 2) return 'not_ready';
  if (score <= 4) return 'building_skills';
  if (score <= 6) return 'ready_to_start';
  return 'ready_for_routine';
}

function getLevelCopy(level: PottyReadinessLevel) {
  if (level === 'not_ready') {
    return {
      title: 'Start with Bathroom Comfort',
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      icon: 'heart-outline' as keyof typeof Ionicons.glyphMap,
      text:
        'Your child may not be ready for full potty training yet. Start with bathroom comfort, sitting practice, and simple routines.',
      focus: [
        'Walk into the bathroom calmly',
        'Sit for 5–10 seconds with no pressure',
        'Practice pants up/down during play',
        'Use simple words or visuals: bathroom, sit, all done',
      ],
    };
  }

  if (level === 'building_skills') {
    return {
      title: 'Build Readiness Skills',
      color: '#7C3AED',
      bg: '#FAF5FF',
      border: '#E9D5FF',
      icon: 'construct-outline' as keyof typeof Ionicons.glyphMap,
      text:
        'Your child is building the skills needed for potty training. Focus on short practice and predictable steps.',
      focus: [
        'Try short potty sits at calm times',
        'Use the same visual routine each time',
        'Praise sitting, trying, and cooperation',
        'Avoid pressure if your child becomes upset',
      ],
    };
  }

  if (level === 'ready_to_start') {
    return {
      title: 'Ready to Begin Practice',
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      icon: 'play-circle-outline' as keyof typeof Ionicons.glyphMap,
      text:
        'Your child appears ready to begin a simple potty practice plan with scheduled sits and calm reinforcement.',
      focus: [
        'Try potty sits every 60–90 minutes',
        'Sit briefly after drinks, meals, or waking',
        'Use short language and visual steps',
        'Log successes, attempts, and accidents',
      ],
    };
  }

  return {
    title: 'Ready for a Routine',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
    text:
      'Your child seems ready for a more consistent potty routine. Keep the routine predictable and track patterns.',
    focus: [
      'Use scheduled potty sits throughout the day',
      'Practice independence with pants and handwashing',
      'Reinforce communication attempts',
      'Review progress weekly and adjust timing',
    ],
  };
}

export default function PottyReadinessScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const score = useMemo(() => {
    return questions.reduce((total, question) => {
      return total + (answers[question.id] ? 1 : 0);
    }, 0);
  }, [answers]);

  const level = useMemo(() => getReadinessLevel(score), [score]);
  const resultCopy = useMemo(() => getLevelCopy(level), [level]);
  const answeredCount = Object.keys(answers).length;
  const complete = answeredCount === questions.length;

  function setAnswer(id: string, value: boolean) {
    setAnswers((current) => ({
      ...current,
      [id]: value,
    }));
  }

  async function saveAssessment() {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child profile first.');
      return;
    }

    if (!complete) {
      Alert.alert(
        'Almost Done',
        'Please answer each question so ABA at Home can create a better starting plan.'
      );
      return;
    }

    await savePottyReadinessResult({
      childId: selectedChild.id,
      score,
      level,
      answers,
      updatedAt: new Date().toISOString(),
    });

    Alert.alert(
      'Readiness Saved',
      'Your potty readiness result has been saved.',
      [
        {
          text: 'View Today’s Plan',
          onPress: () => router.replace('/toilet-training/plan'),
        },
      ]
    );
  }

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
            <Text style={styles.title}>Potty Readiness</Text>
            <Text style={styles.subtitle}>
              Find the best starting point for your child.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="clipboard-outline" size={30} color="#7C3AED" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>STARTING POINT</Text>
            <Text style={styles.heroTitle}>Create a simple potty plan</Text>
            <Text style={styles.heroText}>
              Answer a few parent-friendly questions. This helps guide today’s potty plan.
            </Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressLabel}>Assessment Progress</Text>
            <Text style={styles.progressCount}>
              {answeredCount}/{questions.length}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((answeredCount / questions.length) * 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.questionList}>
          {questions.map((question, index) => {
            const answered = answers[question.id];

            return (
              <View key={question.id} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionNumber}>
                    <Text style={styles.questionNumberText}>{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.questionText}>{question.text}</Text>
                    <Text style={styles.questionHelper}>{question.helper}</Text>
                  </View>
                </View>

                <View style={styles.answerRow}>
                  <TouchableOpacity
                    style={[
                      styles.answerButton,
                      answered === true && styles.answerButtonYes,
                    ]}
                    onPress={() => setAnswer(question.id, true)}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={answered === true ? '#FFFFFF' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.answerButtonText,
                        answered === true && styles.answerButtonTextActive,
                      ]}
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.answerButton,
                      answered === false && styles.answerButtonNo,
                    ]}
                    onPress={() => setAnswer(question.id, false)}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color={answered === false ? '#FFFFFF' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.answerButtonText,
                        answered === false && styles.answerButtonTextActive,
                      ]}
                    >
                      Not Yet
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.resultCard,
            {
              backgroundColor: resultCopy.bg,
              borderColor: resultCopy.border,
            },
          ]}
        >
          <View style={styles.resultHeader}>
            <View style={styles.resultIcon}>
              <Ionicons name={resultCopy.icon} size={24} color={resultCopy.color} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.resultTitle, { color: resultCopy.color }]}>
                {resultCopy.title}
              </Text>
              <Text style={styles.resultText}>{resultCopy.text}</Text>
            </View>
          </View>

          <View style={styles.focusList}>
            {resultCopy.focus.map((item) => (
              <View key={item} style={styles.focusRow}>
                <Ionicons name="checkmark-circle" size={17} color={resultCopy.color} />
                <Text style={styles.focusText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !complete && styles.saveButtonDisabled]}
          onPress={saveAssessment}
          activeOpacity={0.9}
        >
          <Ionicons name="save-outline" size={19} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Readiness Result</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/toilet-training/plan')}
        >
          <Text style={styles.secondaryButtonText}>View Today’s Plan</Text>
          <Ionicons name="chevron-forward" size={18} color="#2563EB" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },

  container: {
    padding: 20,
    paddingBottom: 48,
  },

  screenGlowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,58,237,0.08)',
    top: -130,
    right: -90,
  },

  screenGlowMiddle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(37,99,235,0.05)',
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

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

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

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FAF5FF',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
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
    backgroundColor: 'rgba(124,58,237,0.10)',
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
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#4C1D95',
  },

  heroText: {
    fontSize: 13,
    color: '#5B21B6',
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },

  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },

  progressCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#7C3AED',
  },

  progressTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 11,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
  },

  questionList: {
    gap: 12,
    marginBottom: 18,
  },

  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  questionHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 13,
  },

  questionNumber: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  questionNumberText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '900',
  },

  questionText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  questionHelper: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },

  answerRow: {
    flexDirection: 'row',
    gap: 10,
  },

  answerButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  answerButtonYes: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },

  answerButtonNo: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },

  answerButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },

  answerButtonTextActive: {
    color: '#FFFFFF',
  },

  resultCard: {
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  resultHeader: {
    flexDirection: 'row',
    gap: 12,
  },

  resultIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  resultText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  focusList: {
    marginTop: 14,
    gap: 9,
  },

  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  focusText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  saveButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 11,
  },

  saveButtonDisabled: {
    opacity: 0.45,
  },

  saveButtonText: {
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