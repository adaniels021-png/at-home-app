import { saveParentReflection } from '@/lib/parentReflectionsStorage';
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

type Encouragement = {
  title: string;
  message: string;
};

const situations: ResetSituation[] = [
  { id: 'overwhelmed', title: 'I feel overwhelmed', icon: 'pulse-outline' },
  { id: 'meltdown-ended', title: 'Meltdown ended', icon: 'rainy-outline' },
  { id: 'public-meltdown', title: 'Public meltdown', icon: 'people-outline' },
  { id: 'aggression', title: 'Aggression happened', icon: 'warning-outline' },
  { id: 'guilt', title: 'I feel guilty', icon: 'heart-dislike-outline' },
  { id: 'exhausted', title: 'I feel exhausted', icon: 'battery-dead-outline' },
  { id: 'shut-down', title: 'I feel shut down', icon: 'remove-circle-outline' },
  { id: 'transition', title: 'Transition struggle', icon: 'swap-horizontal-outline' },
];

const encouragements: Encouragement[] = [
  {
    title: 'You are doing enough.',
    message:
      'Your child does not need perfection. They need your support, safety, and steady presence.',
  },
  {
    title: 'This moment is not the whole story.',
    message:
      'A hard moment does not erase your progress. You can reset and take the next small step.',
  },
  {
    title: 'Small calm choices matter.',
    message:
      'Lowering your voice, pausing, or choosing fewer words can help the whole moment soften.',
  },
  {
    title: 'You are allowed to pause.',
    message:
      'Taking a breath before responding is not giving up. It is choosing connection over pressure.',
  },
  {
    title: 'Progress can be quiet.',
    message:
      'Some days, success looks like recovering, reconnecting, and trying again later.',
  },
  {
    title: 'You are learning too.',
    message:
      'Parenting through hard moments takes practice. You are building skill with every reset.',
  },
  {
    title: 'Connection comes first.',
    message:
      'Teaching can wait until everyone feels safer and calmer. Repair and regulation matter first.',
  },
  {
    title: 'One small win counts.',
    message:
      'Even one calm phrase, one pause, or one gentle repair is meaningful progress.',
  },
  {
    title: 'You are not alone in this.',
    message:
      'Difficult moments happen. What matters is that you keep showing up with care.',
  },
  {
    title: 'Reset before you respond.',
    message:
      'You do not have to solve everything immediately. A calmer body can choose a clearer next step.',
  },
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

  const [selectedSituationId, setSelectedSituationId] = useState<string>('overwhelmed');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const selectedPlan = useMemo(() => {
    return plans[selectedSituationId] || plans.overwhelmed;
  }, [selectedSituationId]);

  const selectedSituation = useMemo(() => {
    return situations.find((item) => item.id === selectedSituationId) || situations[0];
  }, [selectedSituationId]);

  const dailyEncouragement = useMemo(() => {
    const today = new Date();
    const daySeed = today.getFullYear() + today.getMonth() + today.getDate();

    return encouragements[daySeed % encouragements.length];
  }, []);

  function toggleStep(step: string) {
    setSaved(false);
    setCompletedSteps((prev) =>
      prev.includes(step)
        ? prev.filter((item) => item !== step)
        : [...prev, step]
    );
  }

  async function saveReflection() {
    await saveParentReflection({
      type: 'emotional-reset',
      title: selectedPlan.title,
      subtitle: selectedSituation.title || 'Emotional Reset',
      body: selectedPlan.message,
      completedSteps,
      icon: 'heart-circle-outline',
      color: '#7C3AED',
      bg: '#F5F3FF',
    });

    setSaved(true);
  }

  function resetPage() {
    setSelectedSituationId('overwhelmed');
    setCompletedSteps([]);
    setSaved(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundBase} />
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobBottomRight} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.backText}>Parent Support</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} pointerEvents="none" />

          <View style={styles.heroIcon}>
            <Ionicons name="heart-circle-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Emotional Reset</Text>

          <Text style={styles.heroText}>
            A quick reset when the moment feels heavy. Pick what’s happening and take one small next step.
          </Text>
        </View>

        <View style={styles.progressStrip}>
          <ProgressStep number="1" title="Pick feeling" />
          <View style={styles.progressLine} />
          <ProgressStep number="2" title="Reset body" />
          <View style={styles.progressLine} />
          <ProgressStep number="3" title="Next step" />
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 1</Text>
          <Text style={styles.sectionTitle}>What are you feeling right now?</Text>
          <Text style={styles.helperText}>Choose the closest fit.</Text>

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
                    size={19}
                    color={selected ? '#FFFFFF' : '#7C3AED'}
                  />

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.situationText,
                      selected && styles.situationTextSelected,
                    ]}
                  >
                    {situation.title}
                  </Text>

                  {selected && (
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.stepLabel}>Step 2</Text>
          <Text style={styles.planEyebrow}>Start here</Text>
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
                  size={23}
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
              <Ionicons name="arrow-forward-circle" size={21} color="#059669" />
              <Text style={styles.nextText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.avoidCard}>
          <Text style={styles.avoidTitle}>Try not to do this right now</Text>

          {selectedPlan.avoid.map((item) => (
            <View key={item} style={styles.avoidRow}>
              <Ionicons name="close-circle-outline" size={21} color="#B91C1C" />
              <Text style={styles.avoidText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.reassuranceCard}>
          <Ionicons name="sparkles-outline" size={26} color="#7C3AED" />

          <Text style={styles.reassuranceTitle}>{dailyEncouragement.title}</Text>

          <Text style={styles.reassuranceText}>{dailyEncouragement.message}</Text>
        </View>

        <View style={styles.nextSupportCard}>
          <View style={styles.nextSupportIcon}>
            <Ionicons name="compass-outline" size={23} color="#7C3AED" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nextSupportTitle}>Need more support?</Text>
            <Text style={styles.nextSupportText}>Try Breathe Together or Quiet Space next.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saved && styles.saveButtonSaved]}
          onPress={saveReflection}
          activeOpacity={0.9}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={saved ? '#FFFFFF' : '#7C3AED'}
          />

          <Text style={[styles.saveButtonText, saved && styles.saveButtonTextSaved]}>
            {saved ? 'Saved to Quick Access' : 'Save Reflection'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetPage} activeOpacity={0.9}>
          <Ionicons name="refresh-outline" size={18} color="#7C3AED" />
          <Text style={styles.resetText}>Reset this page</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressStep({ number, title }: { number: string; title: string }) {
  return (
    <View style={styles.progressStep}>
      <View style={styles.progressDot}>
        <Text style={styles.progressNumber}>{number}</Text>
      </View>
      <Text style={styles.progressText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F3FF',
  },

  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F7F3FF',
  },

  bgBlobTopRight: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#EDE9FE',
    top: -120,
    right: -120,
    opacity: 0.72,
  },

  bgBlobLeft: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FCE7F3',
    top: 620,
    left: -170,
    opacity: 0.24,
  },

  bgBlobBottomRight: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#DBEAFE',
    bottom: 80,
    right: -145,
    opacity: 0.16,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 46,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  backText: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
    borderRadius: 34,
    padding: 24,
    marginBottom: 14,
    minHeight: 222,
  },

  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -72,
    right: -66,
  },

  heroIcon: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: -0.5,
  },

  heroText: {
    color: '#F3E8FF',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '800',
  },

  progressStrip: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 13,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressStep: {
    flex: 1,
    alignItems: 'center',
  },

  progressDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  progressNumber: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
  },

  progressText: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  progressLine: {
    width: 22,
    height: 1,
    backgroundColor: '#C4B5FD',
    marginBottom: 21,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  planCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  avoidCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
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
    marginBottom: 9,
  },

  sectionTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 7,
    letterSpacing: -0.25,
  },

  helperText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 14,
  },

  situationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  situationCard: {
    width: '48%',
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },

  situationCardSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  situationText: {
    color: '#5B21B6',
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 9,
  },

  situationTextSelected: {
    color: '#FFFFFF',
  },

  planEyebrow: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },

  planMessage: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '800',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontWeight: '900',
    lineHeight: 20,
  },

  checkTextSelected: {
    color: '#FFFFFF',
  },

  nextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 11,
  },

  nextText: {
    flex: 1,
    marginLeft: 9,
    color: '#047857',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 21,
  },

  avoidTitle: {
    color: '#0F172A',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
    marginBottom: 3,
  },

  avoidRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },

  avoidText: {
    flex: 1,
    marginLeft: 9,
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 21,
  },

  reassuranceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  reassuranceTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    color: '#5B21B6',
    marginTop: 10,
    marginBottom: 7,
  },

  reassuranceText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '800',
  },

  nextSupportCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  nextSupportIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  nextSupportTitle: {
    color: '#5B21B6',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  nextSupportText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },

  saveButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  saveButtonSaved: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  saveButtonText: {
    marginLeft: 8,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 14,
  },

  saveButtonTextSaved: {
    color: '#FFFFFF',
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
