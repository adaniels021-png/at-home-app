import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Situation =
  | 'meltdown'
  | 'aggression'
  | 'elopement'
  | 'refusal'
  | 'anxiety'
  | 'other';
type Intensity = 'mild' | 'moderate' | 'high';
type Outcome = 'calmer' | 'same';
type PlanStage = 1 | 2 | 3 | 4;

type EarlySign =
  | 'sensory_avoidance'
  | 'restless_movement'
  | 'quiet_withdrawal'
  | 'vocal_upset'
  | 'body_tense'
  | 'louder_voice'
  | 'push_or_swat'
  | 'frustrated_restless'
  | 'toward_exit'
  | 'pulling_away'
  | 'looking_elsewhere'
  | 'wanting_to_leave'
  | 'turning_away'
  | 'saying_no'
  | 'stopping_still'
  | 'task_frustration'
  | 'seeking_reassurance'
  | 'repeating_concern'
  | 'restless_unsettled'
  | 'voice_changing'
  | 'moving_away'
  | 'unsure';

type HarderFactor =
  | 'stimulation'
  | 'hard_demand'
  | 'unexpected_change'
  | 'waiting'
  | 'basic_comfort'
  | 'unsure';

type HelpfulSupport =
  | 'space'
  | 'fewer_words'
  | 'lower_demand'
  | 'quiet'
  | 'familiar_comfort'
  | 'time'
  | 'unsure';

type SelectOption<T extends string> = {
  id: T;
  label: string;
};

const SITUATIONS: Situation[] = [
  'meltdown',
  'aggression',
  'elopement',
  'refusal',
  'anxiety',
  'other',
];
const INTENSITIES: Intensity[] = ['mild', 'moderate', 'high'];
const OUTCOMES: Outcome[] = ['calmer', 'same'];

const option = <T extends string>(id: T, label: string): SelectOption<T> => ({
  id,
  label,
});

const EARLY_SIGNS: Record<Situation, SelectOption<EarlySign>[]> = {
  meltdown: [
    option('sensory_avoidance', 'Covering ears or avoiding sensory input'),
    option('restless_movement', 'Pacing, moving more, or getting restless'),
    option('quiet_withdrawal', 'Becoming quieter or pulling away'),
    option('vocal_upset', 'Crying, vocalizing, or becoming more upset'),
    option('unsure', "I'm not sure"),
  ],
  aggression: [
    option('body_tense', 'Body becoming tense'),
    option('louder_voice', 'Voice or sounds becoming louder'),
    option('push_or_swat', 'Moving closer, pushing, or swatting'),
    option('frustrated_restless', 'Becoming more frustrated or restless'),
    option('unsure', "I'm not sure"),
  ],
  elopement: [
    option('toward_exit', 'Moving toward an exit'),
    option('pulling_away', 'Pulling away or creating distance'),
    option('looking_elsewhere', 'Looking repeatedly toward somewhere else'),
    option('wanting_to_leave', 'Becoming restless or wanting to leave'),
    option('unsure', "I'm not sure"),
  ],
  refusal: [
    option('turning_away', 'Turning away'),
    option('saying_no', 'Saying no or pushing something away'),
    option('stopping_still', 'Stopping or becoming very still'),
    option('task_frustration', 'Becoming frustrated when the task appeared'),
    option('unsure', "I'm not sure"),
  ],
  anxiety: [
    option('seeking_reassurance', 'Seeking extra reassurance'),
    option('repeating_concern', 'Repeating a question or concern'),
    option('quiet_withdrawal', 'Becoming quieter or withdrawing'),
    option('restless_unsettled', 'Restlessness or difficulty staying settled'),
    option('unsure', "I'm not sure"),
  ],
  other: [
    option('body_tense', 'Body becoming tense or restless'),
    option('quiet_withdrawal', 'Becoming quieter or pulling away'),
    option('voice_changing', 'Voice or sounds changing'),
    option('moving_away', 'Trying to move away from the situation'),
    option('unsure', "I'm not sure"),
  ],
};

const HARDER_FACTORS: SelectOption<HarderFactor>[] = [
  option('stimulation', 'Too much noise, activity, or stimulation'),
  option('hard_demand', 'A demand or task felt hard'),
  option('unexpected_change', 'Something changed unexpectedly'),
  option('waiting', 'Waiting or not having access to something'),
  option(
    'basic_comfort',
    'Tired, hungry, uncomfortable, or already overwhelmed'
  ),
  option('unsure', "I'm not sure"),
];

const HELPFUL_SUPPORTS: SelectOption<HelpfulSupport>[] = [
  option('space', 'More space'),
  option('fewer_words', 'Fewer words'),
  option('lower_demand', 'Lowering the demand'),
  option('quiet', 'A quieter environment'),
  option('familiar_comfort', 'Something familiar or comforting'),
  option('time', 'Just having time'),
  option('unsure', "I'm not sure yet"),
];

const MAKE_IT_EASIER: Record<HarderFactor, string> = {
  stimulation: 'Lower stimulation or move somewhere quieter.',
  hard_demand: 'Make the next step smaller or pause the demand.',
  unexpected_change: 'Slow things down and make the next step predictable.',
  waiting: 'Prepare for the wait and keep explanations short.',
  basic_comfort: 'Lower expectations and address basic comfort first.',
  unsure: 'Keep the environment simple while you watch for early signs.',
};

const TRY_EARLIER: Record<HelpfulSupport, string> = {
  space: 'Give a little more space sooner.',
  fewer_words: 'Use fewer words sooner.',
  lower_demand: 'Reduce or pause the demand earlier.',
  quiet: 'Move toward a quieter space earlier.',
  familiar_comfort: 'Offer familiar comfort earlier.',
  time: 'Pause and give more time before asking again.',
  unsure: 'Stay calm, keep things simple, and give the moment time.',
};

const SITUATION_REMINDERS: Record<Situation, string> = {
  meltdown: 'Lowering stimulation early can help keep overwhelm from building.',
  aggression: 'Creating space early can help keep the moment safer.',
  elopement: 'Stay close and notice movement toward exits early.',
  refusal: 'Smaller steps and less pressure can make re-engagement easier.',
  anxiety: 'Predictability and reassurance can make the next step feel smaller.',
  other: 'Early support can help keep the moment from becoming harder.',
};

const STAGE_COPY: Record<
  Exclude<PlanStage, 4>,
  { heading: string; support: string }
> = {
  1: {
    heading: 'What did you notice first?',
    support:
      'Think about the earliest sign that things were starting to get harder.',
  },
  2: {
    heading: 'What may have made the moment harder?',
    support: "You don't have to know for sure. Just choose what seems closest.",
  },
  3: {
    heading: 'What seemed to help?',
    support: 'Choose the support that seemed most useful.',
  },
};

export default function HelpNowPreventionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    situation?: string;
    intensity?: string;
    outcome?: string;
  }>();
  const [stage, setStage] = useState<PlanStage>(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [earlySign, setEarlySign] = useState<EarlySign | null>(null);
  const [harderFactor, setHarderFactor] = useState<HarderFactor | null>(null);
  const [helpfulSupport, setHelpfulSupport] =
    useState<HelpfulSupport | null>(null);
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const situation = SITUATIONS.includes(params.situation as Situation)
    ? (params.situation as Situation)
    : null;
  const intensity = INTENSITIES.includes(params.intensity as Intensity)
    ? (params.intensity as Intensity)
    : null;
  const outcome = OUTCOMES.includes(params.outcome as Outcome)
    ? (params.outcome as Outcome)
    : null;
  const parametersValid = Boolean(situation && intensity && outcome);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!active) return;
      setReduceMotion(enabled);
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: enabled ? 0 : 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      active = false;
      entranceOpacity.stopAnimation();
      contentOpacity.stopAnimation();
      contentTranslateY.stopAnimation();
    };
  }, [contentOpacity, contentTranslateY, entranceOpacity]);

  const transitionToStage = (nextStage: PlanStage) => {
    if (reduceMotion) {
      setStage(nextStage);
      AccessibilityInfo.announceForAccessibility(
        `Plan for next time. Step ${nextStage} of 4.`
      );
      return;
    }

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 8,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setStage(nextStage);
      AccessibilityInfo.announceForAccessibility(
        `Plan for next time. Step ${nextStage} of 4.`
      );
      contentTranslateY.setValue(-8);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBack = () => {
    if (stage > 1) {
      transitionToStage((stage - 1) as PlanStage);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (situation && intensity && outcome) {
      router.replace({
        pathname: '/help-now/recovery',
        params: { situation, intensity, outcome },
      });
      return;
    }

    router.replace('/help-now/situation');
  };

  if (!parametersValid || !situation || !intensity || !outcome) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.invalidContent}>
          <Text style={styles.invalidTitle}>Let&apos;s start from a safe place.</Text>
          <Text style={styles.invalidBody}>
            Return to Help Now so we can guide the next step clearly.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to Help Now"
            onPress={() => router.replace('/help-now/situation')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Return to Help Now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const earlyOptions = EARLY_SIGNS[situation];
  const selectedEarlyLabel = earlyOptions.find(
    (item) => item.id === earlySign
  )?.label;
  const currentSelection =
    stage === 1 ? earlySign : stage === 2 ? harderFactor : helpfulSupport;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View pointerEvents="none" style={styles.ambientGlowTop} />
      <View pointerEvents="none" style={styles.ambientGlowBottom} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={handleBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>

      <Animated.View style={[styles.screen, { opacity: entranceOpacity }]}>
        <View style={styles.progressHeader}>
          <View style={styles.progressCopyRow}>
            <Text style={styles.eyebrow}>
              {stage === 4 ? 'YOUR PLAN' : 'PLAN FOR NEXT TIME'}
            </Text>
            <Text style={styles.stepCount}>Step {stage} of 4</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(stage / 4) * 100}%` },
              ]}
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.stageContainer,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          {stage < 4 ? (
            <SelectionStage
              copy={STAGE_COPY[stage as 1 | 2 | 3]}
              options={
                stage === 1
                  ? earlyOptions
                  : stage === 2
                    ? HARDER_FACTORS
                    : HELPFUL_SUPPORTS
              }
              selected={currentSelection}
              onSelect={(id) => {
                if (stage === 1) setEarlySign(id as EarlySign);
                if (stage === 2) setHarderFactor(id as HarderFactor);
                if (stage === 3) setHelpfulSupport(id as HelpfulSupport);
              }}
              onContinue={() => transitionToStage((stage + 1) as PlanStage)}
            />
          ) : (
            <PlanStageView
              earlySign={selectedEarlyLabel ?? ''}
              easierPlan={MAKE_IT_EASIER[harderFactor!]}
              earlierPlan={TRY_EARLIER[helpfulSupport!]}
              reminder={SITUATION_REMINDERS[situation]}
              onDone={() => router.replace('/')}
              onRestart={() => router.replace('/help-now/situation')}
            />
          )}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

function SelectionStage({
  copy,
  options,
  selected,
  onSelect,
  onContinue,
}: {
  copy: { heading: string; support: string };
  options: SelectOption<string>[];
  selected: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.stageScrollContent}
    >
      <Text style={styles.stageHeading}>{copy.heading}</Text>
      <Text style={styles.stageSupport}>{copy.support}</Text>

      <View accessibilityRole="radiogroup" style={styles.optionList}>
        {options.map((item) => {
          const isSelected = selected === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                styles.optionCard,
                isSelected && styles.optionCardSelected,
                pressed && styles.optionCardPressed,
              ]}
            >
              <Text style={styles.optionText}>{item.label}</Text>
              <View
                style={[styles.radio, isSelected && styles.radioSelected]}
              >
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue"
        accessibilityState={{ disabled: !selected }}
        disabled={!selected}
        onPress={onContinue}
        style={({ pressed }) => [
          styles.primaryButton,
          !selected && styles.primaryButtonDisabled,
          pressed && selected && styles.primaryPressed,
        ]}
      >
        <Text
          style={[
            styles.primaryButtonText,
            !selected && styles.primaryButtonTextDisabled,
          ]}
        >
          Continue →
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function PlanStageView({
  earlySign,
  easierPlan,
  earlierPlan,
  reminder,
  onDone,
  onRestart,
}: {
  earlySign: string;
  easierPlan: string;
  earlierPlan: string;
  reminder: string;
  onDone: () => void;
  onRestart: () => void;
}) {
  const planSections = [
    { label: 'WATCH FOR', text: earlySign },
    { label: 'MAKE IT EASIER', text: easierPlan },
    { label: 'TRY EARLIER', text: earlierPlan },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.stageScrollContent,
        styles.planScrollContent,
      ]}
    >
      <Text style={styles.stageHeading}>Next time, try this earlier.</Text>
      <Text style={styles.stageSupport}>
        You don&apos;t have to prevent every hard moment. The goal is simply to
        notice sooner and make the moment a little easier.
      </Text>

      <View style={styles.planCard}>
        {planSections.map((section, index) => (
          <View
            key={section.label}
            style={[
              styles.planSection,
              index > 0 && styles.planSectionBorder,
            ]}
          >
            <Text style={styles.planLabel}>{section.label}</Text>
            <Text style={styles.planText}>{section.text}</Text>
          </View>
        ))}
        <Text style={styles.reminder}>{reminder}</Text>
      </View>

      <Text style={styles.supportiveLine}>
        Small adjustments can make the next hard moment easier to navigate.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done. Return to Home"
        onPress={onDone}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>Done</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start Help Now again"
        onPress={onRestart}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.secondaryPressed,
        ]}
      >
        <Text style={styles.secondaryButtonText}>Start Help Now again</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#17181C' },
  ambientGlowTop: {
    position: 'absolute',
    top: -210,
    right: -155,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(124,102,191,0.07)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -230,
    left: -180,
    width: 470,
    height: 470,
    borderRadius: 235,
    backgroundColor: 'rgba(104,88,160,0.045)',
  },
  backButton: {
    zIndex: 20,
    elevation: 12,
    width: 46,
    height: 46,
    marginTop: 8,
    marginLeft: 18,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backPressed: { backgroundColor: 'rgba(255,255,255,0.1)' },
  backGlyph: {
    marginTop: -3,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '300',
  },
  screen: { flex: 1 },
  progressHeader: { paddingTop: 17, paddingHorizontal: 24, paddingBottom: 18 },
  progressCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    flexShrink: 1,
    color: '#AFA1E6',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  stepCount: {
    marginLeft: 12,
    color: '#8F8A96',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#A78BFA',
  },
  stageContainer: { flex: 1 },
  stageScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 88,
  },
  planScrollContent: { paddingBottom: 100 },
  stageHeading: {
    color: '#F8F7FA',
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.65,
  },
  stageSupport: {
    marginTop: 11,
    marginBottom: 20,
    color: '#AAA6B0',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  optionList: { gap: 11 },
  optionCard: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(167,139,250,0.115)',
    borderColor: 'rgba(196,181,253,0.38)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.11,
    shadowRadius: 10,
    elevation: 3,
  },
  optionCardPressed: { opacity: 0.82 },
  optionText: {
    flex: 1,
    paddingRight: 12,
    color: '#F1EFF4',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  radio: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(226,232,240,0.28)',
  },
  radioSelected: { borderColor: '#C4B5FD' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C4B5FD',
  },
  primaryButton: {
    width: '100%',
    minHeight: 62,
    marginTop: 22,
    borderRadius: 31,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7FA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 11 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 7,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryPressed: { opacity: 0.9 },
  primaryButtonText: {
    color: '#202126',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonTextDisabled: { color: 'rgba(255,255,255,0.34)' },
  planCard: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.052)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  planSection: { paddingVertical: 17 },
  planSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  planLabel: {
    color: '#AFA1E6',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.85,
  },
  planText: {
    marginTop: 6,
    color: '#F0EDF4',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  reminder: {
    marginTop: 3,
    paddingTop: 15,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    color: '#9F9AA6',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  supportiveLine: {
    marginTop: 18,
    paddingHorizontal: 10,
    color: '#9F9AA6',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 54,
    marginTop: 11,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.052)',
  },
  secondaryPressed: { opacity: 0.76 },
  secondaryButtonText: {
    color: '#D7D3DD',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  invalidContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invalidTitle: {
    color: '#F8F7FA',
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  invalidBody: {
    marginTop: 12,
    marginBottom: 6,
    color: '#AAA6B0',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
  },
});
