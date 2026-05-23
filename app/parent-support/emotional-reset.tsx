import { saveCalmStrategy } from '@/lib/calmStrategiesStorage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ResetSituation = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type ResetPlan = {
  title: string;
  message: string;
  steps: string[];
  doNext: string[];
  avoid: string[];
};

const situations: ResetSituation[] = [
  { id: 'overwhelmed', title: 'I feel overwhelmed', icon: 'pulse-outline' },
  { id: 'meltdown-ended', title: 'A meltdown just ended', icon: 'rainy-outline' },
  { id: 'public-meltdown', title: 'Public meltdown', icon: 'people-outline' },
  { id: 'aggression', title: 'Aggression happened', icon: 'warning-outline' },
  { id: 'guilt', title: 'I feel guilty', icon: 'heart-dislike-outline' },
  { id: 'exhausted', title: 'I feel exhausted', icon: 'battery-dead-outline' },
  { id: 'shut-down', title: 'I feel shut down', icon: 'remove-circle-outline' },
  { id: 'transition', title: 'Transition struggle', icon: 'swap-horizontal-outline' },
];

const plans: Record<string, ResetPlan> = {
  overwhelmed: {
    title: 'Lower the pressure first',
    message:
      'You do not have to solve everything at once. Your first job is to lower the intensity of the moment.',
    steps: [
      'Put both feet on the floor.',
      'Relax your shoulders.',
      'Take one slow breath in and out.',
      'Use fewer words for the next few minutes.',
    ],
    doNext: [
      'Choose one small next step.',
      'Reduce noise, lights, or extra talking.',
      'Give yourself permission to pause.',
    ],
    avoid: [
      'Trying to fix everything immediately.',
      'Arguing or explaining too much.',
      'Judging yourself in the moment.',
    ],
  },
  'meltdown-ended': {
    title: 'Recovery before teaching',
    message:
      'After a meltdown, everyone needs recovery time. This is not the best moment for lectures or big conversations.',
    steps: [
      'Keep your voice low.',
      'Give your child space to recover.',
      'Lower demands for a short period.',
      'Let your own body settle too.',
    ],
    doNext: [
      'Reconnect quietly.',
      'Offer water or a calm activity.',
      'Talk about it later, not immediately.',
    ],
    avoid: [
      'Asking too many questions.',
      'Replaying everything right away.',
      'Adding new demands too quickly.',
    ],
  },
  'public-meltdown': {
    title: 'Focus on safety, not judgment',
    message:
      'Public moments can feel intense. Your child needs support, and you deserve compassion too.',
    steps: [
      'Move to a quieter spot if possible.',
      'Use short phrases only.',
      'Ignore unnecessary opinions from others.',
      'Remind yourself: this is a hard moment, not a failure.',
    ],
    doNext: [
      'Leave if leaving helps everyone recover.',
      'Keep the next expectation simple.',
      'Give yourself time to decompress afterward.',
    ],
    avoid: [
      'Performing for strangers.',
      'Over-apologizing.',
      'Trying to force calm quickly.',
    ],
  },
  aggression: {
    title: 'Safety first',
    message:
      'Aggression can feel scary. Focus on safety, space, and reducing demands before trying to teach.',
    steps: [
      'Create safe space between bodies.',
      'Move unsafe objects away if possible.',
      'Use very few words.',
      'Wait for the intensity to lower.',
    ],
    doNext: [
      'Check for injury.',
      'Reduce demands temporarily.',
      'Document what may have triggered it later.',
    ],
    avoid: [
      'Yelling back.',
      'Physically crowding your child.',
      'Trying to reason during peak intensity.',
    ],
  },
  guilt: {
    title: 'You are still a good parent',
    message:
      'A hard moment does not erase your love, effort, or progress. You are allowed to be human.',
    steps: [
      'Name what you feel without judging it.',
      'Say: “This was hard, and I am still trying.”',
      'Take one slow breath.',
      'Choose repair over shame.',
    ],
    doNext: [
      'Reconnect with one calm action.',
      'Let the rest of the day be lighter if needed.',
      'Notice one thing you did well.',
    ],
    avoid: [
      'Replaying the moment all day.',
      'Calling yourself a bad parent.',
      'Expecting perfection from yourself.',
    ],
  },
  exhausted: {
    title: 'Lower expectations',
    message:
      'Exhaustion changes what you can realistically handle. Today may need to be a lower-demand day.',
    steps: [
      'Choose the most important need only.',
      'Let non-urgent tasks wait.',
      'Take a short sensory break if possible.',
      'Use simple routines instead of new expectations.',
    ],
    doNext: [
      'Pick one thing to simplify.',
      'Ask for help if support is available.',
      'Use calm tools before you feel completely depleted.',
    ],
    avoid: [
      'Trying to catch up on everything.',
      'Adding unnecessary tasks.',
      'Ignoring your own basic needs.',
    ],
  },
  'shut-down': {
    title: 'Start very small',
    message:
      'Feeling shut down is your body asking for less input. You do not need a big plan right now.',
    steps: [
      'Sit somewhere quiet if you can.',
      'Unclench your jaw.',
      'Take one sip of water.',
      'Choose one tiny next action.',
    ],
    doNext: [
      'Use fewer words.',
      'Do the next required thing only.',
      'Return to reflection later.',
    ],
    avoid: [
      'Forcing yourself to process everything.',
      'Making big decisions immediately.',
      'Pushing through without a pause.',
    ],
  },
  transition: {
    title: 'Slow the next demand',
    message:
      'Transition struggles can drain everyone. Recovery and predictability matter more than rushing.',
    steps: [
      'Pause before giving another direction.',
      'Use first/then language.',
      'Lower your voice.',
      'Give extra processing time.',
    ],
    doNext: [
      'Return to the routine slowly.',
      'Use a visual or simple cue next time.',
      'Celebrate any small cooperation.',
    ],
    avoid: [
      'Repeating the demand quickly.',
      'Adding too many words.',
      'Turning the transition into a power struggle.',
    ],
  },
};

export default function EmotionalResetScreen() {
  const router = useRouter();

  const [selectedSituationId, setSelectedSituationId] =
    useState<string>('overwhelmed');

  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const selectedPlan = useMemo(() => {
    return plans[selectedSituationId] || plans.overwhelmed;
  }, [selectedSituationId]);

  function toggleStep(step: string) {
    setCompletedSteps((prev) =>
      prev.includes(step)
        ? prev.filter((item) => item !== step)
        : [...prev, step]
    );
  }
async function saveReflection() {
  await saveCalmStrategy({
    type: 'emotional-reset',
    title: selectedPlan.title,
    subtitle: situations.find(
      (item) => item.id === selectedSituationId
    )?.title || 'Parent Reflection',
    icon: 'heart-circle-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
  });

  setSaved(true);
}

  function resetPage() {
    setSelectedSituationId('overwhelmed');
    setCompletedSteps([]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Parent Support</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="heart-circle-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Emotional Reset</Text>

          <Text style={styles.heroText}>
            A quick reset for parents when the moment feels heavy. Pick what is
            happening, and the app will guide your next step.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 1</Text>
          <Text style={styles.sectionTitle}>What are you feeling right now?</Text>
          <Text style={styles.helperText}>
            Choose the closest fit. Your support plan will update automatically.
          </Text>

          <View style={styles.situationGrid}>
            {situations.map((situation) => {
              const selected = selectedSituationId === situation.id;

              return (
                <Pressable
                  key={situation.id}
                  onPress={() => {
                    setSelectedSituationId(situation.id);
                    setCompletedSteps([]);
                    setSaved(false);
                  }}
                  style={[
                    styles.situationCard,
                    selected && styles.situationCardSelected,
                  ]}
                >
                  <Ionicons
                    name={situation.icon}
                    size={21}
                    color={selected ? '#FFFFFF' : '#7C3AED'}
                  />

                  <Text
                    style={[
                      styles.situationText,
                      selected && styles.situationTextSelected,
                    ]}
                  >
                    {situation.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.stepLabel}>Step 2</Text>
          <Text style={styles.sectionTitle}>{selectedPlan.title}</Text>

          <Text style={styles.planMessage}>{selectedPlan.message}</Text>

          <Text style={styles.miniTitle}>Do this first</Text>

          {selectedPlan.steps.map((step) => {
            const selected = completedSteps.includes(step);

            return (
              <Pressable
                key={step}
                style={[styles.checkRow, selected && styles.checkRowSelected]}
                onPress={() => toggleStep(step)}
              >
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={selected ? '#FFFFFF' : '#7C3AED'}
                />

                <Text
                  style={[
                    styles.checkText,
                    selected && styles.checkTextSelected,
                  ]}
                >
                  {step}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 3</Text>
          <Text style={styles.sectionTitle}>What to do next</Text>

          {selectedPlan.doNext.map((item) => (
            <View key={item} style={styles.nextRow}>
              <Ionicons name="arrow-forward-circle" size={20} color="#059669" />
              <Text style={styles.nextText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Try not to do this right now</Text>

          {selectedPlan.avoid.map((item) => (
            <View key={item} style={styles.avoidRow}>
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
              <Text style={styles.avoidText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
  style={styles.saveButton}
  onPress={saveReflection}
>
  <Ionicons
    name={saved ? 'bookmark' : 'bookmark-outline'}
    size={18}
    color="#FFFFFF"
  />

  <Text style={styles.saveButtonText}>
    {saved ? 'Saved to Quick Access' : 'Save Reflection'}
  </Text>
</TouchableOpacity>

        <View style={styles.reassuranceCard}>
          <Ionicons name="sparkles-outline" size={24} color="#7C3AED" />

          <Text style={styles.reassuranceTitle}>You are not failing.</Text>

          <Text style={styles.reassuranceText}>
            A hard moment does not mean you are a bad parent. Reset first, then
            respond from a calmer place.
          </Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetPage}>
          <Ionicons name="refresh-outline" size={18} color="#7C3AED" />
          <Text style={styles.resetText}>Reset this page</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backText: {
    marginLeft: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
  },

  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -70,
    right: -55,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#EDE9FE',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },

  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  helperText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 14,
  },

  situationGrid: {
    gap: 10,
  },

  situationCard: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  situationCardSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  situationText: {
    flex: 1,
    marginLeft: 10,
    color: '#5B21B6',
    fontWeight: '900',
    fontSize: 14,
  },

  situationTextSelected: {
    color: '#FFFFFF',
  },

  planMessage: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: 16,
  },

  miniTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#5B21B6',
    marginBottom: 10,
  },

  checkRow: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkRowSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  checkText: {
    flex: 1,
    marginLeft: 10,
    color: '#5B21B6',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },

  checkTextSelected: {
    color: '#FFFFFF',
  },

  nextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },

  nextText: {
    flex: 1,
    marginLeft: 9,
    color: '#047857',
    fontWeight: '800',
    lineHeight: 20,
  },

  avoidRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },

  avoidText: {
    flex: 1,
    marginLeft: 9,
    color: '#991B1B',
    fontWeight: '800',
    lineHeight: 20,
  },

  reassuranceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  reassuranceTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#5B21B6',
    marginTop: 8,
    marginBottom: 6,
  },

  reassuranceText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },

saveButton: {
  height: 54,
  borderRadius: 18,
  backgroundColor: '#7C3AED',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
},

saveButtonText: {
  marginLeft: 8,
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 15,
},

  resetButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetText: {
    marginLeft: 8,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 14,
  },
});