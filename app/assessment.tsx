import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateAssessmentQuestions } from '../lib/aiService';
import { canRunAssessments } from '../lib/caregiverPermissions';
import { useChild } from '../lib/SelectedChildContext';
import { supabase } from '../lib/supabase';

type AssessmentQuestion = {
  id: number;
  category: string;
  question: string;
  options: string[];
};

type ReassessmentRow = {
  id: string;
  child_id: string;
  responses: Record<string, string>;
  summary: string | null;
  created_at: string;
};

type ChangeItem = {
  questionId: string;
  questionText: string;
  previousAnswer: string;
  currentAnswer: string;
  direction: 'improved' | 'changed' | 'regressed';
};

const POSITIVE_ANSWERS = new Set([
  'Independently',
  'Consistently',
  'Does well',
  'Often',
  'Mostly independent',
  'Independent',
  'Yes',
  'Several minutes',
  'Minimal support',
  'Words or phrases',
  'Smoothly',
  'Rarely',
]);

const LESS_POSITIVE_ANSWERS = new Set([
  'With prompting',
  'Sometimes',
  'Needs support',
  'Needs some help',
  'In progress',
  'About 1–2 minutes',
  'Moderate support',
  'Gestures or pointing',
  'Some resistance',
]);

function getAnswerScore(answer?: string) {
  if (!answer) return 0;
  if (POSITIVE_ANSWERS.has(answer)) return 3;
  if (LESS_POSITIVE_ANSWERS.has(answer)) return 2;
  return 1;
}

function buildReassessmentSummary(
  childName: string,
  currentResponses: Record<string, string>,
  questions: AssessmentQuestion[],
  previousResponses?: Record<string, string> | null
) {
  const entries = Object.entries(currentResponses);
  const totalAnswered = entries.length;

  if (!totalAnswered) {
    return `No reassessment responses were recorded for ${childName}.`;
  }

  if (!previousResponses) {
    return `${childName}'s first monthly reassessment has been completed. ${totalAnswered} areas were reviewed to update progress and guide the next steps.`;
  }

  let changedCount = 0;
  let improvedCount = 0;
  let regressedCount = 0;

  for (const [questionId, answer] of entries) {
    const previous = previousResponses[questionId];

    if (!previous || previous === answer) continue;

    changedCount += 1;

    const currentScore = getAnswerScore(answer);
    const previousScore = getAnswerScore(previous);

    if (currentScore > previousScore) improvedCount += 1;
    if (currentScore < previousScore) regressedCount += 1;
  }

  if (changedCount === 0) {
    return `${childName}'s monthly reassessment is complete. Responses were mostly stable compared with the last check-in, which suggests steady consistency across the reviewed areas.`;
  }

  if (improvedCount > 0 && regressedCount === 0) {
    return `${childName}'s monthly reassessment is complete. ${improvedCount} area(s) showed positive change, and ${changedCount} response(s) changed overall compared with the previous reassessment.`;
  }

  if (improvedCount > 0 && regressedCount > 0) {
    return `${childName}'s monthly reassessment is complete. There were mixed changes this month, with ${improvedCount} area(s) improving and ${regressedCount} area(s) needing more support compared with the previous reassessment.`;
  }

  const changedQuestions = Object.keys(currentResponses)
    .filter((id) => previousResponses[id] && previousResponses[id] !== currentResponses[id])
    .map((id) => questions.find((q) => String(q.id) === id)?.category)
    .filter(Boolean);

  const topChangedCategory = changedQuestions[0];

  if (topChangedCategory) {
    return `${childName}'s monthly reassessment is complete. Several responses changed since the last check-in, especially in ${topChangedCategory}, which can help guide updated support and lesson focus.`;
  }

  return `${childName}'s monthly reassessment is complete. ${changedCount} response(s) changed since the last check-in, which can help guide updated support and lesson focus.`;
}

function buildChangeItems(
  questions: AssessmentQuestion[],
  currentResponses: Record<string, string>,
  previousResponses?: Record<string, string> | null
): ChangeItem[] {
  if (!previousResponses) return [];

  return questions
    .map((question) => {
      const key = String(question.id);
      const previousAnswer = previousResponses[key];
      const currentAnswer = currentResponses[key];

      if (!previousAnswer || !currentAnswer || previousAnswer === currentAnswer) {
        return null;
      }

      const previousScore = getAnswerScore(previousAnswer);
      const currentScore = getAnswerScore(currentAnswer);

      let direction: ChangeItem['direction'] = 'changed';
      if (currentScore > previousScore) direction = 'improved';
      if (currentScore < previousScore) direction = 'regressed';

      return {
        questionId: key,
        questionText: question.question,
        previousAnswer,
        currentAnswer,
        direction,
      };
    })
    .filter(Boolean) as ChangeItem[];
}

export default function ReassessmentScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const role = selectedChild?.caregiver_access_role;
  const canAssess = canRunAssessments(role);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previousReassessment, setPreviousReassessment] = useState<ReassessmentRow | null>(null);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  useEffect(() => {
    loadReassessment();
  }, [selectedChild]);

  const loadReassessment = async () => {
    if (!selectedChild?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const childAgeMonths =
        (selectedChild as any)?.age_months ||
        ((selectedChild as any)?.age ? Number((selectedChild as any).age) * 12 : undefined);

      const generatedQuestions = await generateAssessmentQuestions(
        childName,
        childAgeMonths
      );

      setQuestions(
  generatedQuestions.map((question, index) => ({
    ...question,
    id: index + 1,
  }))
);

      const { data, error } = await supabase
        .from('reassessments')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      setPreviousReassessment((data?.[0] as ReassessmentRow) || null);
    } catch (error) {
      console.error('Reassessment load error:', error);
      Alert.alert('Error', 'Could not load the monthly reassessment.');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
const selectedAnswer = currentQuestion
  ? answers[String(currentQuestion.id)]
  : undefined;

const isLastQuestion = currentIndex === questions.length - 1;

const progressPercent =
  questions.length > 0
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;

const comparisonItems = useMemo(() => {
  return buildChangeItems(
    questions,
    answers,
    previousReassessment?.responses || null
  );
}, [questions, answers, previousReassessment]);

const improvedCount = useMemo(
  () =>
    comparisonItems.filter(
      (item) => item.direction === 'improved'
    ).length,
  [comparisonItems]
);

const regressedCount = useMemo(
  () =>
    comparisonItems.filter(
      (item) => item.direction === 'regressed'
    ).length,
  [comparisonItems]
);

const changedCount = comparisonItems.length;


  const handleSelectAnswer = (value: string) => {
    if (!currentQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [String(currentQuestion.id)]: value,
    }));
  };

  const goNext = () => {
    if (!selectedAnswer) {
      Alert.alert('Choose an answer', 'Please select one option before continuing.');
      return;
    }

    if (isLastQuestion) {
      void handleSaveReassessment();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const goBack = () => {
    if (currentIndex === 0) {
      router.back();
      return;
    }

    setCurrentIndex((prev) => prev - 1);
  };

  const handleSaveReassessment = async () => {
    if (!canAssess) {
  Alert.alert(
    'Parent Access Only',
    'Only a parent or account owner can complete or update assessments.'
  );
  return;
}
    if (!selectedChild?.id) return;

    if (Object.keys(answers).length !== questions.length) {
      Alert.alert('Incomplete reassessment', 'Please answer all questions before saving.');
      return;
    }

    setSaving(true);

    try {
      const summary = buildReassessmentSummary(
        childName,
        answers,
        questions,
        previousReassessment?.responses || null
      );

      const { error } = await supabase.from('reassessments').insert([
        {
          child_id: selectedChild.id,
          responses: answers,
          summary,
        },
      ]);

      if (error) throw error;

      Alert.alert(
        'Reassessment Saved',
        'The monthly reassessment has been saved and added to progress tracking.',
        [
          {
            text: 'View Progress',
            onPress: () => router.replace('/(tabs)/progress'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Reassessment save error:', error);
      Alert.alert('Save Error', error?.message || 'Could not save reassessment.');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="clipboard-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select a child profile before starting a monthly reassessment.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canAssess) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <Ionicons
          name="lock-closed-outline"
          size={42}
          color="#94A3B8"
        />

        <Text style={styles.emptyTitle}>
          Parent Access Only
        </Text>

        <Text style={styles.emptyText}>
          Assessments can only be completed by the child's
          parent or account owner.
        </Text>
      </View>
    </SafeAreaView>
  );
}

  if (loading || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading reassessment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Monthly Reassessment</Text>
          <Text style={styles.subtitle}>
            Review {childName}&apos;s current skills and needs to keep the plan updated.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {currentIndex + 1} of {questions.length}
            </Text>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {previousReassessment ? (
          <View style={styles.previousCard}>
            <View style={styles.previousHeader}>
              <Ionicons name="time-outline" size={18} color="#7C3AED" />
              <Text style={styles.previousTitle}>Previous Reassessment Found</Text>
            </View>
            <Text style={styles.previousText}>
              Last saved on {new Date(previousReassessment.created_at).toLocaleDateString()}.
              This new reassessment will help track change over time.
            </Text>
          </View>
        ) : (
          <View style={styles.previousCard}>
            <View style={styles.previousHeader}>
              <Ionicons name="sparkles-outline" size={18} color="#7C3AED" />
              <Text style={styles.previousTitle}>First Monthly Reassessment</Text>
            </View>
            <Text style={styles.previousText}>
              This will create the first monthly check-in record for {childName}.
            </Text>
          </View>
        )}

        <View style={styles.questionCard}>
          <Text style={styles.category}>{currentQuestion.category}</Text>
          <Text style={styles.question}>{currentQuestion.question}</Text>

          <View style={styles.optionsWrap}>
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option;

              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                  onPress={() => handleSelectAnswer(option)}
                >
                  <Text
                    style={[styles.optionText, isSelected && styles.optionTextSelected]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {previousReassessment ? (
          <View style={styles.compareCard}>
            <View style={styles.compareHeader}>
              <Ionicons name="analytics-outline" size={18} color="#2563EB" />
              <Text style={styles.compareTitle}>Comparison Snapshot</Text>
            </View>

            <View style={styles.compareStatsRow}>
              <View style={styles.compareStatBox}>
                <Text style={styles.compareStatValue}>{changedCount}</Text>
                <Text style={styles.compareStatLabel}>Changed</Text>
              </View>

              <View style={styles.compareStatBox}>
                <Text style={styles.compareStatValue}>{improvedCount}</Text>
                <Text style={styles.compareStatLabel}>Improved</Text>
              </View>

              <View style={styles.compareStatBox}>
                <Text style={styles.compareStatValue}>{regressedCount}</Text>
                <Text style={styles.compareStatLabel}>Needs Support</Text>
              </View>
            </View>

            {comparisonItems.length > 0 ? (
              comparisonItems.slice(0, 4).map((item) => (
                <View key={item.questionId} style={styles.compareItem}>
                  <Text style={styles.compareQuestion}>{item.questionText}</Text>
                  <Text style={styles.compareAnswer}>
                    Before: {item.previousAnswer}
                  </Text>
                  <Text style={styles.compareAnswer}>
                    Now: {item.currentAnswer}
                  </Text>
                  <Text
                    style={[
                      styles.compareDirection,
                      item.direction === 'improved' && styles.compareImproved,
                      item.direction === 'regressed' && styles.compareRegressed,
                    ]}
                  >
                    {item.direction === 'improved'
                      ? 'Improved'
                      : item.direction === 'regressed'
                      ? 'Needs More Support'
                      : 'Changed'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.compareEmptyText}>
                Changes compared with the last reassessment will appear here as you answer questions.
              </Text>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {isLastQuestion ? 'Save Reassessment' : 'Next'}
              </Text>
              <Ionicons
                name={isLastQuestion ? 'checkmark-circle-outline' : 'arrow-forward'}
                size={18}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 999,
  },
  previousCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  previousHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previousTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '800',
    color: '#6D28D9',
  },
  previousText: {
    color: '#7C3AED',
    fontSize: 14,
    lineHeight: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  category: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  question: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 18,
  },
  optionsWrap: {
    gap: 12,
  },
  optionBtn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionBtnSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  optionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#3730A3',
  },
  compareCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compareTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  compareStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  compareStatBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  compareStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  compareStatLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  compareItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  compareQuestion: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  compareAnswer: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  compareDirection: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  compareImproved: {
    color: '#059669',
  },
  compareRegressed: {
    color: '#DC2626',
  },
  compareEmptyText: {
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
  },
  nextBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
});