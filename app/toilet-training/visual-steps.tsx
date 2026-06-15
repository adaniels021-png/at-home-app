import { useChild } from '@/lib/SelectedChildContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PottyVisualStep = {
  id: string;
  title: string;
  shortScript: string;
  parentTip: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const pottySteps: PottyVisualStep[] = [
  {
    id: 'bathroom',
    title: 'Go to bathroom',
    shortScript: 'First bathroom.',
    parentTip: 'Use a calm voice and keep the direction short.',
    icon: 'walk-outline',
  },
  {
    id: 'pants',
    title: 'Pull pants down',
    shortScript: 'Pants down.',
    parentTip: 'Offer help only if needed. Praise any cooperation.',
    icon: 'shirt-outline',
  },
  {
    id: 'sit',
    title: 'Sit on potty',
    shortScript: 'Sit on potty.',
    parentTip: 'Keep the sit short. Start with 30–60 seconds.',
    icon: 'body-outline',
  },
  {
    id: 'try',
    title: 'Try to go',
    shortScript: 'Try potty.',
    parentTip: 'No pressure. Praise sitting calmly even if nothing happens.',
    icon: 'happy-outline',
  },
  {
    id: 'wipe',
    title: 'Wipe',
    shortScript: 'Wipe.',
    parentTip: 'Use simple, repeated language for this step.',
    icon: 'reader-outline',
  },
  {
    id: 'flush',
    title: 'Flush',
    shortScript: 'Flush.',
    parentTip: 'If flushing is scary, let your child cover their ears or step away.',
    icon: 'water-outline',
  },
  {
    id: 'wash',
    title: 'Wash hands',
    shortScript: 'Wash hands.',
    parentTip: 'End with a predictable routine: soap, rinse, dry.',
    icon: 'hand-left-outline',
  },
];

const pottyStepImages = {
  boy: {
    bathroom: require('../../assets/images/potty-routine/boy/bathroom.png'),
    pants: require('../../assets/images/potty-routine/boy/pants.png'),
    sit: require('../../assets/images/potty-routine/boy/sit.png'),
    try: require('../../assets/images/potty-routine/boy/try.png'),
    wipe: require('../../assets/images/potty-routine/boy/wipe.png'),
    flush: require('../../assets/images/potty-routine/boy/flush.png'),
    wash: require('../../assets/images/potty-routine/boy/wash.png'),
  },
  girl: {
    bathroom: require('../../assets/images/potty-routine/girl/bathroom.png'),
    pants: require('../../assets/images/potty-routine/girl/pants.png'),
    sit: require('../../assets/images/potty-routine/girl/sit.png'),
    try: require('../../assets/images/potty-routine/girl/try.png'),
    wipe: require('../../assets/images/potty-routine/girl/wipe.png'),
    flush: require('../../assets/images/potty-routine/girl/flush.png'),
    wash: require('../../assets/images/potty-routine/girl/wash.png'),
  },
} as const;

export default function VisualPottyStepsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

const storedGender =
  selectedChild?.gender === 'girl' || selectedChild?.gender === 'female'
    ? 'girl'
    : selectedChild?.gender === 'boy' || selectedChild?.gender === 'male'
      ? 'boy'
      : null;

const [temporaryGender, setTemporaryGender] = useState<'boy' | 'girl'>('boy');

const childGender = storedGender ?? temporaryGender;
const shouldShowGenderSelector = !storedGender;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const currentStep = pottySteps[currentIndex];
  const currentStepImage =
  pottyStepImages[childGender][currentStep.id as keyof typeof pottyStepImages.boy];
  const isLastStep = currentIndex === pottySteps.length - 1;
  const allDone = completedSteps.length === pottySteps.length;

  const progressPercent = useMemo(() => {
    return Math.round((completedSteps.length / pottySteps.length) * 100);
  }, [completedSteps.length]);

  function markCurrentStepDone() {
    setCompletedSteps((current) => {
      if (current.includes(currentStep.id)) return current;
      return [...current, currentStep.id];
    });

    if (!isLastStep) {
      setCurrentIndex((current) => current + 1);
    }
  }

  function goBackStep() {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }

  function restartRoutine() {
    setCurrentIndex(0);
    setCompletedSteps([]);
  }

  function jumpToStep(index: number) {
    setCurrentIndex(index);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Visual Potty Routine</Text>
            <Text style={styles.subtitle}>Tap through each step with your child.</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressTitle}>Routine Progress</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.progressText}>
            Completed {completedSteps.length} of {pottySteps.length}
          </Text>
        </View>

        {shouldShowGenderSelector ? (
  <View style={styles.genderFallbackCard}>
    <View style={{ flex: 1 }}>
      <Text style={styles.genderFallbackTitle}>Choose visual style</Text>
      <Text style={styles.genderFallbackText}>
        This child profile was created before gender was added.
      </Text>
    </View>

    <View style={styles.genderToggle}>
      <TouchableOpacity
        style={[
          styles.genderOption,
          temporaryGender === 'boy' && styles.genderOptionActive,
        ]}
        onPress={() => setTemporaryGender('boy')}
      >
        <Text
          style={[
            styles.genderOptionText,
            temporaryGender === 'boy' && styles.genderOptionTextActive,
          ]}
        >
          Boy
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.genderOption,
          temporaryGender === 'girl' && styles.genderOptionActive,
        ]}
        onPress={() => setTemporaryGender('girl')}
      >
        <Text
          style={[
            styles.genderOptionText,
            temporaryGender === 'girl' && styles.genderOptionTextActive,
          ]}
        >
          Girl
        </Text>
      </TouchableOpacity>
    </View>
  </View>
) : null}

        {allDone ? (
          <View style={styles.celebrationCard}>
            <View style={styles.celebrationIcon}>
              <Ionicons name="sparkles-outline" size={42} color="#7C3AED" />
            </View>

            <Text style={styles.celebrationTitle}>All Done!</Text>
            <Text style={styles.celebrationText}>
              Great job finishing the potty routine. Celebrate the effort, even if your child did not go.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={restartRoutine}>
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Start Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.currentStepCard}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Step {currentIndex + 1}</Text>
              </View>

              <Image
  source={currentStepImage}
  style={styles.stepImage}
  resizeMode="contain"
/>

              <Text style={styles.currentStepTitle}>{currentStep.title}</Text>

              <View style={styles.scriptBox}>
                <Text style={styles.scriptLabel}>Say this</Text>
                <Text style={styles.scriptText}>“{currentStep.shortScript}”</Text>
              </View>

              <View style={styles.tipBox}>
                <Ionicons name="heart-outline" size={22} color="#7C3AED" />
                <Text style={styles.tipText}>{currentStep.parentTip}</Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, currentIndex === 0 && styles.disabledButton]}
                  onPress={goBackStep}
                  disabled={currentIndex === 0}
                >
                  <Ionicons name="chevron-back" size={19} color="#2563EB" />
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryButtonSmall} onPress={markCurrentStepDone}>
                  <Text style={styles.primaryButtonText}>
                    {isLastStep ? 'Finish' : 'Next Step'}
                  </Text>
                  <Ionicons name="chevron-forward" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Steps</Text>
              <Text style={styles.sectionSubtext}>Tap any step to jump back or review.</Text>
            </View>

            <View style={styles.stepListCard}>
              {pottySteps.map((step, index) => {
                const completed = completedSteps.includes(step.id);
                const active = currentIndex === index;

                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[styles.stepRow, active && styles.stepRowActive]}
                    onPress={() => jumpToStep(index)}
                  >
                    <View
                      style={[
                        styles.stepNumber,
                        completed && styles.stepNumberDone,
                        active && styles.stepNumberActive,
                      ]}
                    >
                      {completed ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.stepNumberText,
                            active && styles.stepNumberTextActive,
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.stepIcon, active && styles.stepIconActive]}>
                      <Ionicons
                        name={step.icon}
                        size={22}
                        color={active ? '#2563EB' : '#64748B'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepTitle, active && styles.stepTitleActive]}>
                        {step.title}
                      </Text>
                      <Text style={styles.stepScript}>“{step.shortScript}”</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 44,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 19,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2563EB',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 999,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 9,
  },
  currentStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginBottom: 16,
  },
  stepBadgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '900',
  },
  bigIconCircle: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  currentStepTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  scriptBox: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  scriptLabel: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  scriptText: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
  },
  tipBox: {
    width: '100%',
    backgroundColor: '#FAF5FF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  tipText: {
    flex: 1,
    color: '#5B21B6',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButtonSmall: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  stepListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    marginBottom: 4,
  },
  stepRowActive: {
    backgroundColor: '#EFF6FF',
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberDone: {
    backgroundColor: '#059669',
  },
  stepNumberActive: {
    backgroundColor: '#DBEAFE',
  },
  stepNumberText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  stepNumberTextActive: {
    color: '#1D4ED8',
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepIconActive: {
    backgroundColor: '#DBEAFE',
  },
  stepTitle: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '900',
  },
  stepTitleActive: {
    color: '#1E3A8A',
  },
  stepScript: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  celebrationCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
  },
  celebrationIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  celebrationTitle: {
    color: '#4C1D95',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  celebrationText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },

  stepImage: {
  width: '100%',
  height: 260,
  borderRadius: 24,
  marginBottom: 18,
},

genderFallbackCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 14,
  borderWidth: 1,
  borderColor: '#DBEAFE',
  marginBottom: 16,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},

genderFallbackTitle: {
  color: '#0F172A',
  fontSize: 14,
  fontWeight: '900',
},

genderFallbackText: {
  color: '#64748B',
  fontSize: 12,
  fontWeight: '700',
  marginTop: 3,
  lineHeight: 17,
},

genderToggle: {
  flexDirection: 'row',
  backgroundColor: '#EFF6FF',
  borderRadius: 999,
  padding: 4,
},

genderOption: {
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 999,
},

genderOptionActive: {
  backgroundColor: '#2563EB',
},

genderOptionText: {
  color: '#2563EB',
  fontSize: 12,
  fontWeight: '900',
},

genderOptionTextActive: {
  color: '#FFFFFF',
},
});