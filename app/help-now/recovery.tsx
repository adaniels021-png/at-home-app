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
type RecoveryOutcome = 'calmer' | 'same';
type RecoveryStage = 1 | 2 | 3;

const SITUATIONS: Situation[] = [
  'meltdown',
  'aggression',
  'elopement',
  'refusal',
  'anxiety',
  'other',
];
const INTENSITIES: Intensity[] = ['mild', 'moderate', 'high'];
const OUTCOMES: RecoveryOutcome[] = ['calmer', 'same'];

const RECOVERY_NOTES: Record<Situation, string> = {
  meltdown: 'Keep stimulation and demands low while things settle.',
  aggression: 'Give everyone a little extra space while things settle.',
  elopement: 'Stay close and keep the environment secure while things settle.',
  refusal: "Don't rush back into the original demand.",
  anxiety: 'Keep the next few minutes quiet and predictable.',
  other: 'Keep the next few minutes simple and low-pressure.',
};

const STAGE_ANNOUNCEMENTS: Record<RecoveryStage, string> = {
  1: 'Recovery step 1 of 3. Settle.',
  2: 'Recovery step 2 of 3. Reconnect gently.',
  3: 'Recovery step 3 of 3. Take a moment for you, too.',
};

export default function HelpNowRecoveryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    situation?: string;
    intensity?: string;
    outcome?: string;
  }>();
  const [stage, setStage] = useState<RecoveryStage>(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const situation = SITUATIONS.includes(params.situation as Situation)
    ? (params.situation as Situation)
    : null;
  const intensity = INTENSITIES.includes(params.intensity as Intensity)
    ? (params.intensity as Intensity)
    : null;
  const outcome = OUTCOMES.includes(params.outcome as RecoveryOutcome)
    ? (params.outcome as RecoveryOutcome)
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

  const transitionToStage = (nextStage: RecoveryStage) => {
    if (reduceMotion) {
      setStage(nextStage);
      AccessibilityInfo.announceForAccessibility(
        STAGE_ANNOUNCEMENTS[nextStage]
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
        STAGE_ANNOUNCEMENTS[nextStage]
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
      transitionToStage((stage - 1) as RecoveryStage);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (situation && intensity) {
      router.replace({
        pathname: '/help-now/coach',
        params: { situation, intensity },
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
          <Text style={styles.invalidTitle}>Let&apos;s restart from a safe place.</Text>
          <Text style={styles.invalidBody}>
            Choose what&apos;s happening so I can support you clearly.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to situation selection"
            onPress={() => router.replace('/help-now/situation')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Choose what&apos;s happening</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const opening =
    outcome === 'calmer'
      ? {
          heading: 'Things are starting to settle.',
          support:
            'Give this moment a little more time before asking for anything else.',
        }
      : {
          heading: "Let's keep things steady a little longer.",
          support:
            "You don't need to solve anything yet. Keep the next few minutes simple.",
        };

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
            <Text style={styles.eyebrow}>RECOVERY</Text>
            <Text style={styles.stepCount}>Step {stage} of 3</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(stage / 3) * 100}%` }]} />
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
          {stage === 1 ? (
            <StageOne
              opening={opening}
              recoveryNote={RECOVERY_NOTES[situation]}
              onContinue={() => transitionToStage(2)}
            />
          ) : null}
          {stage === 2 ? (
            <StageTwo onContinue={() => transitionToStage(3)} />
          ) : null}
          {stage === 3 ? (
            <StageThree
              onHome={() => router.replace('/')}
              onPrevention={() =>
                router.push({
                  pathname: '/help-now/prevention',
                  params: { situation, intensity, outcome },
                })
              }
              onMoreSupport={() => router.replace('/help-now/situation')}
            />
          ) : null}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

function StageOne({
  opening,
  recoveryNote,
  onContinue,
}: {
  opening: { heading: string; support: string };
  recoveryNote: string;
  onContinue: () => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.stageScrollContent}
    >
      <Text style={styles.stageHeading}>{opening.heading}</Text>
      <Text style={styles.stageSupport}>{opening.support}</Text>

      <View style={styles.mainCard}>
        <Text style={styles.cardTitle}>Give this moment time.</Text>
        <Text style={styles.cardSupport}>
          Your child may look calmer before their body is fully settled.
        </Text>

        <View style={styles.forNowSection}>
          <Text style={styles.secondaryLabel}>FOR NOW</Text>
          {[
            'Keep demands low.',
            'Avoid lots of questions.',
            'Give comfortable space.',
            'Stay nearby if your child wants you there.',
          ].map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.situationNote}>{recoveryNote}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to reconnection"
        onPress={onContinue}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>Continue →</Text>
      </Pressable>
    </ScrollView>
  );
}

function StageTwo({ onContinue }: { onContinue: () => void }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.stageScrollContent}
    >
      <Text style={styles.stageHeading}>Reconnect gently.</Text>
      <Text style={styles.stageSupport}>
        You don&apos;t have to talk about what happened to reconnect.
      </Text>

      <View style={styles.mainCard}>
        <Text style={styles.cardTitle}>Let connection be enough.</Text>
        <Text style={styles.cardSupport}>
          Quiet presence, familiar comfort, or simply staying nearby can be
          enough right now.
        </Text>
      </View>

      <View style={styles.phraseCard}>
        <Text style={styles.secondaryLabel}>SAY THIS IF IT HELPS</Text>
        {["I'm here.", 'Take your time.', "We don't have to talk yet."].map(
          (phrase) => (
            <Text key={phrase} style={styles.phraseText}>
              “{phrase}”
            </Text>
          )
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to caregiver reset"
        onPress={onContinue}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>One more step →</Text>
      </Pressable>
    </ScrollView>
  );
}

function StageThree({
  onHome,
  onPrevention,
  onMoreSupport,
}: {
  onHome: () => void;
  onPrevention: () => void;
  onMoreSupport: () => void;
}) {
  const options = [
    {
      title: "We're okay for now",
      subtitle: 'Return to Home.',
      onPress: onHome,
    },
    {
      title: 'Help me plan for next time',
      subtitle: 'Look at what may help earlier next time.',
      onPress: onPrevention,
    },
    {
      title: 'I still need support',
      subtitle: 'Go back to Help Now support.',
      onPress: onMoreSupport,
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.stageScrollContent,
        styles.stageThreeScrollContent,
      ]}
    >
      <Text style={styles.stageHeading}>Take a moment for you, too.</Text>
      <Text style={styles.stageSupport}>
        Hard moments can take a lot out of you.
      </Text>

      <View style={styles.resetCard}>
        <Text style={styles.cardTitle}>Let your body come down, too.</Text>
        <View style={styles.resetPrompts}>
          {[
            'Unclench your jaw.',
            'Drop your shoulders.',
            'Take one slow breath.',
          ].map((prompt) => (
            <View key={prompt} style={styles.listRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>{prompt}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.resetReassurance}>
          You don&apos;t have to figure out the whole situation right now.
        </Text>
      </View>

      <Text style={styles.nextChoiceHeading}>What would help next?</Text>
      <View style={styles.optionList}>
        {options.map((option) => (
          <Pressable
            key={option.title}
            accessibilityRole="button"
            accessibilityLabel={`${option.title}. ${option.subtitle}`}
            onPress={option.onPress}
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.optionCardPressed,
            ]}
          >
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            <Text accessibilityElementsHidden style={styles.chevron}>
              ›
            </Text>
          </Pressable>
        ))}
      </View>
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
    backgroundColor: 'rgba(124,102,191,0.075)',
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
    color: '#AFA1E6',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 1.15,
  },
  stepCount: {
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
    paddingBottom: 32,
  },
  stageThreeScrollContent: {
    paddingBottom: 76,
  },
  stageHeading: {
    color: '#F8F7FA',
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  stageSupport: {
    marginTop: 11,
    marginBottom: 20,
    color: '#AAA6B0',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  mainCard: {
    padding: 22,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    color: '#F4F2F7',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  cardSupport: {
    marginTop: 12,
    color: '#B5B1BC',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  forNowSection: {
    marginTop: 20,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  secondaryLabel: {
    marginBottom: 9,
    color: '#AFA1E6',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.85,
  },
  listRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listDot: {
    width: 5,
    height: 5,
    marginTop: 8,
    marginRight: 10,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
  },
  listText: {
    flex: 1,
    color: '#C7C3CD',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  situationNote: {
    marginTop: 8,
    paddingHorizontal: 10,
    color: '#9F9AA6',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  phraseCard: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.085)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.13)',
  },
  phraseText: {
    marginTop: 7,
    color: '#E8E3F5',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  resetCard: {
    padding: 22,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  resetPrompts: { marginTop: 18 },
  resetReassurance: {
    marginTop: 17,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    color: '#B5B1BC',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  nextChoiceHeading: {
    marginTop: 26,
    marginBottom: 13,
    color: '#F4F2F7',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
  },
  optionList: { gap: 11 },
  optionCard: {
    minHeight: 78,
    paddingHorizontal: 17,
    paddingVertical: 14,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
  },
  optionCardPressed: {
    backgroundColor: 'rgba(167,139,250,0.11)',
    borderColor: 'rgba(196,181,253,0.3)',
  },
  optionCopy: { flex: 1, paddingRight: 10 },
  optionTitle: {
    color: '#F4F2F7',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  optionSubtitle: {
    marginTop: 4,
    color: '#AAA6B0',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  chevron: {
    color: 'rgba(226,232,240,0.42)',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
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
  primaryPressed: { opacity: 0.9 },
  primaryButtonText: {
    color: '#202126',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
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
