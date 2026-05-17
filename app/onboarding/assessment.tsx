import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

type QuestionType = 'choice' | 'multi' | 'text';

type AssessmentQuestion = {
  id: string;
  section: string;
  question: string;
  helper?: string;
  type: QuestionType;
  options?: string[];
};

const QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'primary_goal',
    section: 'Current Priorities',
    question: 'What is the biggest goal for your child right now?',
    helper: 'This helps personalize daily lessons and parent supports.',
    type: 'choice',
    options: [
      'Communication',
      'Behavior support',
      'Daily routines',
      'Social skills',
      'School readiness',
      'Independence',
    ],
  },
  {
    id: 'communication_level',
    section: 'Communication',
    question: 'How does your child communicate most often?',
    type: 'choice',
    options: [
      'Mostly gestures or pointing',
      'Single words',
      'Short phrases',
      'Full sentences',
      'PECS / picture cards',
      'AAC device',
      'Limited communication right now',
    ],
  },
  {
    id: 'requests_needs',
    section: 'Communication',
    question: 'How does your child usually request something they want?',
    type: 'choice',
    options: [
      'Pulls caregiver toward item',
      'Points or reaches',
      'Uses sounds or words',
      'Uses signs',
      'Uses pictures / PECS',
      'Uses AAC',
      'Gets upset because requesting is hard',
    ],
  },
  {
    id: 'communication_targets',
    section: 'Communication',
    question: 'Which communication skills should we focus on?',
    type: 'multi',
    options: [
      'Requesting help',
      'Requesting a break',
      'Answering yes/no',
      'Making choices',
      'Using more words',
      'Using PECS',
      'Using social greetings',
      'Following directions',
    ],
  },
  {
    id: 'behavior_concerns',
    section: 'Behavior',
    question: 'Which behaviors are currently challenging?',
    type: 'multi',
    options: [
      'Tantrums',
      'Aggression',
      'Throwing items',
      'Running away / elopement',
      'Refusing tasks',
      'Difficulty waiting',
      'Difficulty transitioning',
      'Self-injury',
      'No major concerns',
    ],
  },
  {
    id: 'behavior_triggers',
    section: 'Behavior',
    question: 'What usually triggers difficult moments?',
    type: 'multi',
    options: [
      'Denied access',
      'Transitions',
      'Waiting',
      'Loud noises',
      'New places',
      'Changes in routine',
      'Communication frustration',
      'Tiredness',
      'Hunger',
    ],
  },
  {
    id: 'calming_supports',
    section: 'Regulation',
    question: 'What helps your child calm down?',
    type: 'multi',
    options: [
      'Quiet space',
      'Deep pressure',
      'Breathing',
      'Music',
      'Movement',
      'Visual timer',
      'Break card',
      'Favorite toy',
      'Caregiver comfort',
    ],
  },
  {
    id: 'sensory_needs',
    section: 'Sensory',
    question: 'Which sensory needs show up most often?',
    type: 'multi',
    options: [
      'Sensitive to sound',
      'Sensitive to light',
      'Seeks movement',
      'Seeks pressure',
      'Picky eating textures',
      'Avoids messy play',
      'Difficulty with clothing',
      'No major sensory needs',
    ],
  },
  {
    id: 'routine_challenges',
    section: 'Daily Routines',
    question: 'Which routines are hardest right now?',
    type: 'multi',
    options: [
      'Morning routine',
      'Bedtime',
      'Tooth brushing',
      'Bathing',
      'Getting dressed',
      'Meals',
      'Leaving the house',
      'Cleaning up',
      'Potty routine',
    ],
  },
  {
    id: 'independence_level',
    section: 'Daily Routines',
    question: 'How much help does your child need with daily routines?',
    type: 'choice',
    options: [
      'Full physical help',
      'Lots of reminders',
      'Some prompts',
      'Mostly independent',
      'Depends on the routine',
    ],
  },
  {
    id: 'learning_style',
    section: 'Learning Style',
    question: 'How does your child learn best?',
    type: 'multi',
    options: [
      'Pictures',
      'Hands-on practice',
      'Music',
      'Movement',
      'Short instructions',
      'Modeling',
      'Repetition',
      'Rewards',
      'Videos',
    ],
  },
  {
    id: 'attention_span',
    section: 'Learning Style',
    question: 'How long can your child usually stay with a structured activity?',
    type: 'choice',
    options: [
      'Less than 1 minute',
      '1–3 minutes',
      '3–5 minutes',
      '5–10 minutes',
      '10+ minutes',
    ],
  },
  {
    id: 'reinforcers',
    section: 'Motivation',
    question: 'What motivates your child?',
    type: 'multi',
    options: [
      'Praise',
      'Snacks',
      'Tablet',
      'Toys',
      'Bubbles',
      'Music',
      'Movement',
      'Books',
      'Cars/trains',
      'Sensory play',
    ],
  },
  {
    id: 'social_skills',
    section: 'Social Skills',
    question: 'Which social skills need support?',
    type: 'multi',
    options: [
      'Greeting others',
      'Taking turns',
      'Sharing',
      'Playing near others',
      'Playing with others',
      'Understanding emotions',
      'Conversation',
      'Personal space',
    ],
  },
  {
    id: 'safety_skills',
    section: 'Safety',
    question: 'Which safety skills should be prioritized?',
    type: 'multi',
    options: [
      'Staying near caregiver',
      'Stopping when told',
      'Holding hands',
      'Waiting',
      'Using safe body',
      'Asking for help',
      'Community safety',
      'No major safety concerns',
    ],
  },
  {
    id: 'parent_notes',
    section: 'Caregiver Notes',
    question: 'Is there anything important you want the app to know?',
    helper: 'Examples: fears, favorite items, medical restrictions, family routines, or school goals.',
    type: 'text',
  },
];

function buildLessonProfile(
  answers: Record<string, string | string[]>,
  childName: string
) {
  const primaryGoal = String(answers.primary_goal || 'Communication');

  const communicationTargets = Array.isArray(answers.communication_targets)
    ? answers.communication_targets
    : [];

  const routineChallenges = Array.isArray(answers.routine_challenges)
    ? answers.routine_challenges
    : [];

  const behaviorConcerns = Array.isArray(answers.behavior_concerns)
    ? answers.behavior_concerns
    : [];

  const sensoryNeeds = Array.isArray(answers.sensory_needs)
    ? answers.sensory_needs
    : [];

  const reinforcers = Array.isArray(answers.reinforcers)
    ? answers.reinforcers
    : [];

  const recommendedLessonCategories = [
    primaryGoal,
    communicationTargets.length ? 'Communication' : null,
    behaviorConcerns.includes('No major concerns') ? null : 'Behavior',
    routineChallenges.length ? 'Routines' : null,
    sensoryNeeds.includes('No major sensory needs') ? null : 'Sensory',
  ].filter(Boolean);

  return {
    child_name: childName,
    primary_goal: primaryGoal,
    recommended_lesson_categories: Array.from(
      new Set(recommendedLessonCategories)
    ),
    communication_targets: communicationTargets,
    behavior_targets: behaviorConcerns,
    sensory_supports: sensoryNeeds,
    routine_targets: routineChallenges,
    preferred_reinforcers: reinforcers,
    recommended_pecs_cards: [
      'Help',
      'Break',
      'All Done',
      'More',
      'Yes',
      'No',
      ...communicationTargets,
    ].slice(0, 12),
    recommended_worksheets: [
      routineChallenges.length ? 'Task Analysis Strips' : null,
      routineChallenges.length ? 'First/Then Boards' : null,
      behaviorConcerns.includes('No major concerns')
        ? null
        : 'Behavior Tracking Sheets',
      sensoryNeeds.includes('No major sensory needs')
        ? null
        : 'Coping Strategy Cards',
      communicationTargets.length ? 'Choice Boards' : null,
    ].filter(Boolean),
    parent_support_focus: {
      behavior_support:
        behaviorConcerns.includes('No major concerns') === false,
      routine_support: routineChallenges.length > 0,
      communication_support: communicationTargets.length > 0,
      sensory_support:
        sensoryNeeds.includes('No major sensory needs') === false,
    },
  };
}

export default function AssessmentScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);

  const childName =
    selectedChild?.child_name || selectedChild?.name || 'your child';

  const question = QUESTIONS[currentIndex];

  const progress = useMemo(() => {
    return Math.round(((currentIndex + 1) / QUESTIONS.length) * 100);
  }, [currentIndex]);

  const selectedAnswer = answers[question.id];

  const canContinue = useMemo(() => {
    if (question.type === 'text') return true;
    if (Array.isArray(selectedAnswer)) return selectedAnswer.length > 0;
    return !!selectedAnswer;
  }, [question.type, selectedAnswer]);

  const setSingleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: value,
    }));
  };

  const toggleMultiAnswer = (value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[question.id])
        ? (prev[question.id] as string[])
        : [];

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...prev,
        [question.id]: next,
      };
    });
  };

  const goNext = async () => {
    if (!canContinue) {
      Alert.alert('Answer Needed', 'Please select an answer to continue.');
      return;
    }

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    await saveAssessment();
  };

  const goBack = () => {
    if (currentIndex === 0) {
      router.back();
      return;
    }

    setCurrentIndex((prev) => prev - 1);
  };

  const saveAssessment = async () => {
  if (!selectedChild?.id) {
    Alert.alert('No Child Selected', 'Please select a child profile first.');
    return;
  }

  try {
    setSaving(true);

    const lessonProfile = buildLessonProfile(answers, childName);

    const completedAt = new Date().toISOString();

    const payload = {
      child_id: selectedChild.id,
      responses: {
        version: 'premium_v1',
        completed_at: completedAt,
        answers,
        lesson_profile: lessonProfile,
        app_connections: {
          daily_lessons: lessonProfile.recommended_lesson_categories,
          pecs: lessonProfile.recommended_pecs_cards,
          worksheets: lessonProfile.recommended_worksheets,
          routines: lessonProfile.routine_targets,
          parent_support: lessonProfile.parent_support_focus,
        },
      },
      completed_at: completedAt,
    };

    const { error } = await supabase.from('assessments').insert(payload);

    if (error) throw error;

    await supabase
      .from('children')
      .update({
        assessment_status: 'completed',
        assessment_completed_at: completedAt,
        personalization_status: 'processing',
      })
      .eq('id', selectedChild.id);

    router.replace('/(tabs)/dashboard');

  } catch (error: any) {
    console.error('Save assessment error:', error);
    Alert.alert(
      'Save Error',
      error?.message || 'Could not save the assessment.'
    );
  } finally {
    setSaving(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Child Assessment</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressLabel}>
              Question {currentIndex + 1} of {QUESTIONS.length}
            </Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.questionCard}>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>{question.section}</Text>
          </View>

          <Text style={styles.questionText}>
            {question.question.replace('your child', childName)}
          </Text>

          {question.helper ? (
            <Text style={styles.helperText}>{question.helper}</Text>
          ) : null}

          {question.type === 'choice' &&
            question.options?.map((option) => {
              const active = selectedAnswer === option;

              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionButton, active && styles.optionActive]}
                  onPress={() => setSingleAnswer(option)}
                >
                  <Text
                    style={[styles.optionText, active && styles.optionTextActive]}
                  >
                    {option}
                  </Text>

                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4F46E5"
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}

          {question.type === 'multi' &&
            question.options?.map((option) => {
              const active =
                Array.isArray(selectedAnswer) &&
                selectedAnswer.includes(option);

              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionButton, active && styles.optionActive]}
                  onPress={() => toggleMultiAnswer(option)}
                >
                  <Text
                    style={[styles.optionText, active && styles.optionTextActive]}
                  >
                    {option}
                  </Text>

                  <Ionicons
                    name={active ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={active ? '#4F46E5' : '#94A3B8'}
                  />
                </TouchableOpacity>
              );
            })}

          {question.type === 'text' ? (
            <TextInput
              style={styles.textInput}
              placeholder="Type caregiver notes here..."
              placeholderTextColor="#94A3B8"
              multiline
              value={String(selectedAnswer || '')}
              onChangeText={(text) => setSingleAnswer(text)}
            />
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, !canContinue && styles.disabledButton]}
          onPress={goNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentIndex === QUESTIONS.length - 1
                  ? 'Finish Assessment'
                  : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          This assessment personalizes lessons, PECS recommendations, worksheets,
          routines, and parent support tools.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 44 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSpacer: { width: 42 },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 13,
  },
  progressPercent: {
    color: '#4F46E5',
    fontWeight: '900',
    fontSize: 13,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 999,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  sectionPillText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '900',
  },
  questionText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 8,
  },
  helperText: {
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 14,
  },
  optionButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  optionText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
    paddingRight: 10,
  },
  optionTextActive: {
    color: '#3730A3',
  },
  textInput: {
    marginTop: 12,
    minHeight: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    textAlignVertical: 'top',
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 22,
  },
  nextButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginRight: 8,
  },
  footerNote: {
    marginTop: 14,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
});