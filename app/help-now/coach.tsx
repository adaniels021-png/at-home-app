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
  useWindowDimensions,
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
type Outcome = 'calmer' | 'same' | 'harder';

type CoachingStep = {
  title: string;
  support?: string;
  phrases?: string[];
};

type CoachingSequence = {
  heading: string;
  steps: CoachingStep[];
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

const HEADINGS: Record<Situation, string> = {
  meltdown: "Let's lower the overwhelm.",
  aggression: "Let's create some calm and space.",
  elopement: "Let's keep things close and steady.",
  refusal: "Let's lower the pressure.",
  anxiety: "Let's make this moment feel smaller.",
  other: "Let's take this one step at a time.",
};

const sequence = (situation: Situation, steps: CoachingStep[]): CoachingSequence => ({
  heading: HEADINGS[situation],
  steps,
});

const COACHING_CONTENT: Record<
  Situation,
  Record<Intensity, CoachingSequence>
> = {
  aggression: {
    mild: sequence('aggression', [
      {
        title: 'Give a little more space.',
        support: 'Lower demands and avoid crowding your child.',
      },
      {
        title: 'Use fewer words.',
        support: 'Keep your voice quiet and your sentences short.',
        phrases: ["I'm here.", "You're safe.", 'We can wait.'],
      },
      {
        title: 'Pause before asking anything else.',
        support:
          'Give the moment time to settle before trying to talk it through.',
      },
      {
        title: 'Watch for the body to soften.',
        support:
          'Slower movement, quieter sounds, or accepting your presence can mean the intensity is coming down.',
      },
    ]),
    moderate: sequence('aggression', [
      {
        title: 'Create more space.',
        support:
          'Move unnecessary people and breakable or unsafe objects farther away if you can do so safely.',
      },
      {
        title: 'Keep your words very short.',
        phrases: ["I'm here.", 'Safe body.', 'We can wait.'],
      },
      {
        title: 'Lower demands for now.',
        support:
          'This is not the moment to explain, negotiate, or ask several questions.',
      },
      {
        title: 'Stay nearby without crowding.',
        support: 'Keep your own movements slow and predictable.',
      },
      {
        title: 'Wait for the intensity to come down.',
        support: 'Focus on safety and regulation before problem-solving.',
      },
    ]),
    high: sequence('aggression', [
      {
        title: 'Make the space safer.',
        support:
          'Move other people and unsafe or breakable objects away when possible.',
      },
      {
        title: 'Give more physical space.',
        support:
          'Avoid crowding, cornering, or standing directly over your child.',
      },
      {
        title: 'Use only a few calm words.',
        phrases: ["I'm here.", "You're safe.", 'We can wait.'],
      },
      {
        title: 'Pause demands and explanations.',
        support: 'Keep the moment simple until the intensity decreases.',
      },
      {
        title: 'Stay focused on safety.',
        support:
          'If anyone becomes at immediate risk of serious injury, move to Safety Mode.',
      },
    ]),
  },
  meltdown: {
    mild: sequence('meltdown', [
      {
        title: 'Lower the amount of talking.',
        support: 'Give your child a little more processing space.',
      },
      {
        title: "Reduce what you're asking right now.",
        support: 'One small expectation is enough.',
      },
      {
        title: 'Make the environment simpler.',
        support: 'Lower noise, movement, or other stimulation when possible.',
      },
      {
        title: 'Give them time.',
        support: 'You do not need to stop the emotion immediately.',
      },
    ]),
    moderate: sequence('meltdown', [
      {
        title: 'Reduce stimulation.',
        support: 'Lower noise, lights, people, or demands when possible.',
      },
      {
        title: 'Use very few words.',
        phrases: ["I'm here.", 'Take your time.', "You're safe."],
      },
      {
        title: 'Stop trying to reason through it.',
        support: 'Save explanations and problem-solving for later.',
      },
      {
        title: 'Give space without disappearing.',
        support: 'Stay available while reducing pressure.',
      },
      {
        title: 'Wait for signs of settling.',
        support: 'Look for quieter sounds, slower movement, or easier breathing.',
      },
    ]),
    high: sequence('meltdown', [
      { title: 'Make the environment quieter and safer.' },
      { title: 'Stop nonessential demands.' },
      {
        title: 'Use only simple reassurance.',
        phrases: ["I'm here.", "You're safe.", 'No rush.'],
      },
      { title: 'Give physical and verbal space.' },
      { title: 'Wait before trying to solve the problem.' },
    ]),
  },
  elopement: {
    mild: sequence('elopement', [
      {
        title: 'Move closer without rushing.',
        support:
          'Stay between your child and obvious unsafe areas when you can do so safely.',
      },
      { title: 'Use one short direction.', phrases: ['Stay with me.'] },
      { title: 'Reduce extra talking.' },
      { title: 'Offer a simple next place.', phrases: ["Let's stand right here."] },
    ]),
    moderate: sequence('elopement', [
      { title: 'Stay close and reduce distractions.' },
      {
        title: 'Position yourself toward the safer direction.',
        support:
          'Prioritize preventing access to traffic, parking lots, stairs, water, or other clear hazards.',
      },
      {
        title: 'Use one calm phrase.',
        phrases: ['Stay with me.', 'This way.'],
      },
      { title: 'Do not argue while moving toward safety.' },
      { title: 'Once movement slows, reduce demands.' },
    ]),
    high: sequence('elopement', [
      { title: 'Keep the safest route in front of you.' },
      { title: 'Stay close and keep directions very short.' },
      { title: 'Move away from nearby hazards if possible.' },
      { title: 'Reduce demands once you reach a safer area.' },
      {
        title: 'Focus on staying together, not explaining what happened yet.',
      },
    ]),
  },
  refusal: {
    mild: sequence('refusal', [
      { title: 'Make the next step smaller.' },
      {
        title: 'Offer one simple choice.',
        phrases: ['Shoes first or jacket first?'],
      },
      { title: 'Wait quietly.', support: 'Give your child time to respond.' },
      {
        title: 'Notice any small cooperation.',
        support:
          'Praise the first step instead of waiting for perfect completion.',
      },
    ]),
    moderate: sequence('refusal', [
      { title: 'Lower the pressure.' },
      { title: 'Reduce the task to one small step.' },
      { title: 'Offer one clear choice.' },
      { title: 'Give quiet wait time.' },
      { title: 'Reinforce movement in the right direction.' },
    ]),
    high: sequence('refusal', [
      { title: 'Pause the power struggle.' },
      { title: 'Remove unnecessary words.' },
      { title: 'Give a short break if the situation allows.' },
      { title: 'Return with one small request.' },
      { title: 'Focus on one success, not finishing everything.' },
    ]),
  },
  anxiety: {
    mild: sequence('anxiety', [
      { title: 'Slow everything down.' },
      {
        title: 'Use calm, predictable words.',
        phrases: ["I'm here.", "You're safe.", 'We have time.'],
      },
      { title: 'Make the next step clear.' },
      { title: 'Give extra processing time.' },
    ]),
    moderate: sequence('anxiety', [
      { title: 'Reduce questions.' },
      { title: 'Lower stimulation when possible.' },
      { title: 'Use predictable reassurance.' },
      { title: 'Stay nearby without pushing for conversation.' },
      { title: 'Wait for breathing and movement to settle.' },
    ]),
    high: sequence('anxiety', [
      { title: 'Make the environment feel smaller and quieter.' },
      { title: 'Stop nonessential demands.' },
      { title: 'Use only a few reassuring words.' },
      { title: 'Give time and physical space.' },
      { title: 'Delay problem-solving until regulation improves.' },
    ]),
  },
  other: {
    mild: sequence('other', [
      { title: 'Slow the moment down.' },
      { title: 'Use fewer words.' },
      { title: 'Lower unnecessary demands.' },
      { title: 'Give a little more time.' },
    ]),
    moderate: sequence('other', [
      { title: 'Reduce pressure.' },
      { title: 'Make the environment calmer.' },
      { title: 'Use one short instruction or reassurance.' },
      { title: 'Wait before trying the next step.' },
    ]),
    high: sequence('other', [
      { title: 'Focus on calm and safety first.' },
      { title: 'Reduce talking and demands.' },
      { title: 'Create space when possible.' },
      { title: 'Wait for the intensity to decrease.' },
      {
        title: 'If the situation becomes unsafe, switch to Safety Mode.',
      },
    ]),
  },
};

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'calmer', label: 'Getting calmer' },
  { id: 'same', label: 'About the same' },
  { id: 'harder', label: 'Getting harder' },
];

export default function HelpNowCoachScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{
    situation?: string;
    intensity?: string;
  }>();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;

  const situation = SITUATIONS.includes(params.situation as Situation)
    ? (params.situation as Situation)
    : null;
  const intensity = INTENSITIES.includes(params.intensity as Intensity)
    ? (params.intensity as Intensity)
    : null;
  const content = situation && intensity ? COACHING_CONTENT[situation][intensity] : null;

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
      contentTranslateX.stopAnimation();
    };
  }, [contentOpacity, contentTranslateX, entranceOpacity]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({
      pathname: '/help-now/check-in',
      params: { situation: situation ?? 'other' },
    });
  };

  const goToSafety = () => {
    router.push({
      pathname: '/help-now/safety',
      params: { situation: situation ?? 'other' },
    });
  };

  const transitionContent = (update: () => void) => {
    if (reduceMotion) {
      update();
      return;
    }

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: -10,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      update();
      contentTranslateX.setValue(10);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const advance = () => {
    if (!content) return;
    if (stepIndex < content.steps.length - 1) {
      transitionContent(() => setStepIndex((current) => current + 1));
      return;
    }

    transitionContent(() => {
      setOutcome(null);
      setShowCheckIn(true);
    });
  };

  const repeatSequence = () => {
    if (repeatCount >= 1) return;
    transitionContent(() => {
      setRepeatCount(1);
      setOutcome(null);
      setStepIndex(0);
      setShowCheckIn(false);
    });
  };

  const goToRecovery = (selectedOutcome: 'calmer' | 'same') => {
    if (!situation || !intensity) return;
    router.push({
      pathname: '/help-now/recovery',
      params: { situation, intensity, outcome: selectedOutcome },
    });
  };

  const shouldShowSafety =
    intensity === 'high' ||
    (intensity === 'moderate' &&
      (situation === 'aggression' || situation === 'elopement'));

  if (!content || !situation || !intensity) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.invalidContent}>
          <Text style={styles.invalidTitle}>Let&apos;s start with a quick check-in.</Text>
          <Text style={styles.invalidBody}>
            This helps me guide you through the next step.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/help-now/situation')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Choose what&apos;s happening</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const step = content.steps[stepIndex];
  const compactHeight = screenHeight < 720;
  const spaciousHeight = screenHeight >= 850;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View pointerEvents="none" style={styles.ambientGlowTop} />
      <View pointerEvents="none" style={styles.ambientGlowBottom} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back to check-in"
        hitSlop={12}
        onPress={handleBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>

      <Animated.View style={[styles.screen, { opacity: entranceOpacity }]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>RIGHT NOW</Text>
          <Text style={styles.heading}>{content.heading}</Text>
        </View>

        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: contentOpacity,
              transform: [{ translateX: contentTranslateX }],
            },
          ]}
        >
          {showCheckIn ? (
            <OutcomeCheckIn
              outcome={outcome}
              repeatCount={repeatCount}
              onSelect={setOutcome}
              onRepeat={repeatSequence}
              onRecovery={goToRecovery}
              onSafety={goToSafety}
              reduceMotion={reduceMotion}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepScrollContent}
            >
              <View style={styles.progressHeader}>
                <Text style={styles.stepCount}>
                  Step {stepIndex + 1} of {content.steps.length}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${((stepIndex + 1) / content.steps.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View
                accessibilityLiveRegion="polite"
                style={[
                  styles.stepCard,
                  compactHeight && styles.stepCardCompact,
                  spaciousHeight && styles.stepCardSpacious,
                ]}
              >
                <Text style={styles.stepTitle}>{step.title}</Text>
                {step.support ? (
                  <Text style={styles.stepSupport}>{step.support}</Text>
                ) : null}
              </View>

              {step.phrases?.length ? (
                <View style={styles.phraseCard}>
                  <Text style={styles.phraseLabel}>SAY THIS IF IT HELPS</Text>
                  {step.phrases.slice(0, 3).map((phrase) => (
                    <Text key={phrase} style={styles.phraseText}>
                      “{phrase}”
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    stepIndex === content.steps.length - 1
                      ? 'Check in'
                      : 'Next step'
                  }
                  onPress={advance}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {stepIndex === content.steps.length - 1
                      ? 'Check in →'
                      : 'Next step →'}
                  </Text>
                </Pressable>

                {shouldShowSafety ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Safety changed"
                    onPress={goToSafety}
                    style={({ pressed }) => [
                      styles.safetyButton,
                      pressed && styles.safetyPressed,
                    ]}
                  >
                    <Text style={styles.safetyText}>Safety changed →</Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

function OutcomeCheckIn({
  outcome,
  repeatCount,
  onSelect,
  onRepeat,
  onRecovery,
  onSafety,
  reduceMotion,
}: {
  outcome: Outcome | null;
  repeatCount: number;
  onSelect: (outcome: Outcome) => void;
  onRepeat: () => void;
  onRecovery: (outcome: 'calmer' | 'same') => void;
  onSafety: () => void;
  reduceMotion: boolean;
}) {
  const responseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    responseOpacity.setValue(0);
    if (!outcome) return;

    Animated.timing(responseOpacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => responseOpacity.stopAnimation();
  }, [outcome, reduceMotion, responseOpacity]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.outcomeContent}
    >
      <Text style={styles.outcomeTitle}>How are things going now?</Text>
      <View accessibilityRole="radiogroup" style={styles.outcomeList}>
        {OUTCOMES.map((option) => {
          const selected = outcome === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => [
                styles.outcomeCard,
                selected && styles.outcomeCardSelected,
                pressed && styles.outcomeCardPressed,
              ]}
            >
              <Text style={styles.outcomeLabel}>{option.label}</Text>
              <View
                style={[
                  styles.radio,
                  selected && styles.radioSelected,
                ]}
              >
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {outcome === 'calmer' ? (
        <Animated.View style={{ opacity: responseOpacity }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onRecovery('calmer')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Continue →</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {outcome === 'same' ? (
        <Animated.View
          style={[styles.outcomeResponse, { opacity: responseOpacity }]}
        >
          <Text style={styles.responseTitle}>
            Let&apos;s stay with it a little longer.
          </Text>
          {repeatCount < 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRepeat}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Repeat these steps</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => onRecovery('same')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Continue to Recovery</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {outcome === 'harder' ? (
        <Animated.View
          style={[styles.outcomeResponse, { opacity: responseOpacity }]}
        >
          <Text style={styles.responseTitle}>Let&apos;s check safety again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onSafety}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Check Safety →</Text>
          </Pressable>
        </Animated.View>
      ) : null}
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
    backgroundColor: 'rgba(124,102,191,0.085)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -230,
    left: -180,
    width: 470,
    height: 470,
    borderRadius: 235,
    backgroundColor: 'rgba(104,88,160,0.05)',
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
  header: { paddingTop: 17, paddingHorizontal: 24, paddingBottom: 20 },
  eyebrow: {
    color: '#A78BFA',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 1.15,
  },
  heading: {
    marginTop: 7,
    color: '#F8F7FA',
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  animatedContent: { flex: 1 },
  stepScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  progressHeader: { marginBottom: 18 },
  stepCount: {
    color: '#AAA6B0',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    marginTop: 9,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#A78BFA',
  },
  stepCard: {
    minHeight: 178,
    padding: 24,
    borderRadius: 27,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 3,
  },
  stepCardCompact: {
    minHeight: 154,
    paddingVertical: 20,
  },
  stepCardSpacious: {
    minHeight: 190,
  },
  stepTitle: {
    color: '#F8F7FA',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.65,
  },
  stepSupport: {
    marginTop: 15,
    color: '#B5B1BC',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '600',
  },
  phraseCard: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.14)',
  },
  phraseLabel: {
    color: '#AFA1E6',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.85,
  },
  phraseText: {
    marginTop: 7,
    color: '#E8E3F5',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  actions: { marginTop: 'auto', paddingTop: 20 },
  primaryButton: {
    width: '100%',
    minHeight: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#F8F7FA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 11 },
    shadowOpacity: 0.27,
    shadowRadius: 21,
    elevation: 7,
  },
  primaryPressed: { opacity: 0.9 },
  primaryButtonText: {
    color: '#202126',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  safetyButton: {
    minHeight: 48,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyPressed: { opacity: 0.72 },
  safetyText: {
    color: '#B9B3C6',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  outcomeContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  outcomeTitle: {
    color: '#F8F7FA',
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.55,
  },
  outcomeList: { marginTop: 20, gap: 12 },
  outcomeCard: {
    minHeight: 72,
    paddingHorizontal: 18,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
  },
  outcomeCardSelected: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderColor: 'rgba(196,181,253,0.38)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 11,
    elevation: 3,
  },
  outcomeCardPressed: { opacity: 0.82 },
  outcomeLabel: {
    color: '#F4F2F7',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  radio: {
    width: 22,
    height: 22,
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
  outcomeResponse: { marginTop: 24, gap: 12 },
  responseTitle: {
    marginBottom: 2,
    color: '#C5C2CA',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  secondaryText: {
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
    marginBottom: 28,
    color: '#AAA6B0',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
  },
});
