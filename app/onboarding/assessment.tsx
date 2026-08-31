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
import { canRunAssessments } from '../../lib/caregiverPermissions';
import {
  AUTISM_SUPPORT_LEVEL_OPTIONS,
  buildAutismSupportLevelProfile,
  DOMAIN_SUPPORT_LEVEL_OPTIONS,
} from '../../lib/personalization/autismSupportLevel';
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
    id: 'autism_support_level',
    section: 'About Your Child',
    question: 'Was your child given an autism support level when they were diagnosed?',
    helper: "That's okay if you don't know. We'll use the rest of the assessment to personalize support.",
    type: 'choice',
    options: [...AUTISM_SUPPORT_LEVEL_OPTIONS],
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
    id: 'favorite_interests',
  section: 'Motivation',
  question: 'What does your child enjoy right now?',
  helper: 'These may be used sometimes as motivation, but lessons will also use everyday home routines and materials.',
  type: 'multi',
  options: [
      'Praise',
      'Snacks',
      'Tablet',
      'Toys',
      'Bubbles',
      'Music',
      'Books',
      'Cars/trains',
      'Blocks',
      'Pretend play',
      'Movement games',
      'Water play',
      'Sensory toys',
    ],
  },
  {
  id: 'instruction_following_level',
  section: 'Learning Readiness',
  question: 'How does your child respond to simple directions?',
  type: 'choice',
  options: [
    'Does not respond yet',
    'Responds with full physical help',
    'Responds with modeling',
    'Responds with gestures or reminders',
    'Responds independently sometimes',
  ],
},
{
  id: 'imitation_level',
  section: 'Learning Readiness',
  question: 'Can your child copy simple actions?',
  type: 'choice',
  options: [
    'Not yet',
    'With full help',
    'After seeing a model',
    'Sometimes independently',
    'Often independently',
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
  id: 'avoid_in_lessons',
  section: 'Safety & Preferences',
  question: 'Are there any items or activities lessons should avoid?',
  helper: 'Examples: food allergies, loud sounds, messy play, small objects, or activities that cause distress.',
  type: 'text',
  },
  {
    id: 'parent_notes',
    section: 'Caregiver Notes',
    question: 'Is there anything important you want the app to know?',
    helper:
      'Examples: fears, favorite items, medical restrictions, family routines, or school goals.',
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

  const favoriteInterests = Array.isArray(answers.favorite_interests)
  ? answers.favorite_interests
  : [];

  const recommendedLessonCategories = [
  primaryGoal === 'Communication' ? 'Communication' : null,
  primaryGoal === 'Social skills' ? 'Social' : null,
  primaryGoal === 'Daily routines' || primaryGoal === 'Independence'
    ? 'Self-Help'
    : null,
  primaryGoal === 'School readiness' ? 'Play' : null,
  communicationTargets.length ? 'Communication' : null,
  routineChallenges.length ? 'Self-Help' : null,
  sensoryNeeds.includes('No major sensory needs') ? null : 'Motor',
  'Play',
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
    preferred_interests: favoriteInterests,
    preferred_reinforcers: favoriteInterests,
    autism_support: buildAutismSupportLevelProfile(answers),
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
  const { selectedChild, refreshChildren } = useChild() as any;
  const role = selectedChild?.caregiver_access_role;
  const canAssess = canRunAssessments(role);

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
    if (question.id === 'autism_support_level') return true;
    if (question.type === 'text') return true;
    if (Array.isArray(selectedAnswer)) return selectedAnswer.length > 0;
    return !!selectedAnswer;
  }, [question.id, question.type, selectedAnswer]);

  const setSingleAnswer = (value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [question.id]: value };
      if (
        question.id === 'autism_support_level'
        && value !== AUTISM_SUPPORT_LEVEL_OPTIONS[3]
      ) {
        delete next.social_communication_support_level;
        delete next.restricted_repetitive_support_level;
      }
      return next;
    });
  };

  const setSupportDomainAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMultiAnswer = (value: string) => {
  setAnswers((prev) => {
    const current = Array.isArray(prev[question.id])
      ? (prev[question.id] as string[])
      : [];

    const noneOptions = [
      'No major concerns',
      'No major sensory needs',
      'No major safety concerns',
    ];

    const isNoneOption = noneOptions.includes(value);

    let next: string[];

    if (isNoneOption) {
      next = current.includes(value) ? [] : [value];
    } else {
      next = current
        .filter((item) => !noneOptions.includes(item));

      next = next.includes(value)
        ? next.filter((item) => item !== value)
        : [...next, value];
    }

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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not authenticated.');
      }

      const payload = {
          child_id: selectedChild.id,
          responses: {
          version: 'premium_v2',
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

      const { error: assessmentError } = await supabase
        .from('assessments')
        .insert(payload);

      if (assessmentError) throw assessmentError;

     const { error: childUpdateError } = await supabase
  .from('children')
  .update({
    assessment_status: 'completed',
    assessment_completed_at: completedAt,
    personalization_status: 'completed',
    next_reassessment_due_at: new Date(
      new Date(completedAt).getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  })
  .eq('id', selectedChild.id);

      if (childUpdateError) throw childUpdateError;

      await supabase
  .from('lesson_queue')
  .delete()
  .eq('child_id', selectedChild.id);

await supabase
  .from('daily_lesson_instances')
  .delete()
  .eq('child_id', selectedChild.id)
  .in('status', ['generated', 'started', 'unsuccessful']);

      if (typeof refreshChildren === 'function') {
  await refreshChildren();
}

      router.replace('/onboarding/parent-goals' as any);
    } catch (error: any) {
      console.error('Save assessment error:', error);

      Alert.alert(
        'Save Error',
        error?.message || 'Could not save the assessment. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canAssess) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.restrictedCard}>
        <Ionicons name="lock-closed-outline" size={42} color="#94A3B8" />

        <Text style={styles.restrictedTitle}>Parent Access Only</Text>

        <Text style={styles.restrictedText}>
          Only the child profile owner or second parent can complete or update the child assessment.
        </Text>

        <TouchableOpacity
          style={styles.restrictedButton}
          onPress={() => router.back()}
        >
          <Text style={styles.restrictedButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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

          <View style={styles.headerCenter}>
            <Text style={styles.stepBadgeText}>STEP 2 OF 4</Text>
            <Text style={styles.headerTitle}>Child Assessment</Text>
          </View>

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

          {question.id === 'autism_support_level'
            && selectedAnswer === AUTISM_SUPPORT_LEVEL_OPTIONS[3] ? (
            <View style={styles.domainSupportWrap}>
              {[
                ['social_communication_support_level', 'Social communication'],
                ['restricted_repetitive_support_level', 'Restricted/repetitive behaviors and flexibility'],
              ].map(([key, label]) => (
                <View key={key} style={styles.domainSupportGroup}>
                  <Text style={styles.domainSupportLabel}>{label} (optional)</Text>
                  <View style={styles.domainSupportOptions}>
                    {DOMAIN_SUPPORT_LEVEL_OPTIONS.map((option) => {
                      const active = answers[key] === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.domainSupportButton, active && styles.optionActive]}
                          onPress={() => setSupportDomainAnswer(key, option)}
                        >
                          <Text style={[styles.domainSupportText, active && styles.optionTextActive]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

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
                  ? 'Build My Plan'
                  : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Your answers help personalize lessons, PECS recommendations,
          worksheets, routines, and parent support tools.
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

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  stepBadgeText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  headerTitle: {
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

  domainSupportWrap: { marginTop: 16, gap: 16 },
  domainSupportGroup: { gap: 8 },
  domainSupportLabel: { color: '#334155', fontSize: 13, fontWeight: '800' },
  domainSupportOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  domainSupportButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  domainSupportText: { color: '#475569', fontSize: 12, fontWeight: '700' },

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

  restrictedCard: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
},

restrictedTitle: {
  marginTop: 14,
  fontSize: 22,
  fontWeight: '900',
  color: '#0F172A',
},

restrictedText: {
  marginTop: 8,
  color: '#64748B',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
  lineHeight: 21,
},

restrictedButton: {
  marginTop: 22,
  backgroundColor: '#4F46E5',
  borderRadius: 18,
  paddingVertical: 13,
  paddingHorizontal: 22,
},

restrictedButtonText: {
  color: '#FFFFFF',
  fontWeight: '900',
},
});
