import { LinearGradient } from 'expo-linear-gradient';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const INHALE_DURATION = 4000;
const HOLD_DURATION = 2000;
const EXHALE_DURATION = 6000;
const BREATH_COUNT = 3;
const AMBIENT_VOLUME = 0.035;
// Assign a bundled, nonverbal ambient asset here when the approved track is available.
const AMBIENT_TRACK: number | null = null;

const ENCOURAGEMENT = [
  {
    title: "Let's do this together.",
    body: 'Your child needs your calm\nmore than your perfect response.',
  },
  {
    title: "You're safe.",
    body: "Your child is safe.\nThere's no rush.",
  },
  {
    title: 'One breath.\nOne moment.',
    body: "You're doing better than you think.",
  },
];

async function fadeAmbientVolume(
  player: AudioPlayer,
  from: number,
  to: number,
  duration: number
) {
  const steps = 10;

  for (let step = 1; step <= steps; step += 1) {
    await new Promise((resolve) => setTimeout(resolve, duration / steps));
    const volume = from + (to - from) * (step / steps);

    try {
      player.volume = volume;
    } catch {
      // The optional player may have been released while a fade was in progress.
    }
  }
}

export default function HelpNowRegulationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [continueEnabled, setContinueEnabled] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [finalReady, setFinalReady] = useState(false);
  const [breathNumber, setBreathNumber] = useState(1);
  const [breathPhase, setBreathPhase] = useState('Inhale slowly');
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  const orbProgress = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const continueOpacity = useRef(new Animated.Value(0)).current;
  const continueScale = useRef(new Animated.Value(0.98)).current;
  const breathingPromptOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const progressValues = useRef(
    Array.from({ length: BREATH_COUNT }, () => new Animated.Value(0))
  ).current;
  const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const ambientPlayer = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, screenOpacity]);

  useEffect(() => {
    let active = true;

    const prepareAmbientAudio = async () => {
      if (!AMBIENT_TRACK) return;

      try {
        await setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'duckOthers',
        });

        const player = createAudioPlayer(AMBIENT_TRACK);
        player.loop = true;
        player.volume = 0;
        player.play();

        if (!active) {
          player.remove();
          return;
        }

        ambientPlayer.current = player;
        await fadeAmbientVolume(player, 0, AMBIENT_VOLUME, 1000);
      } catch {
        // Ambient audio is optional; the regulation experience remains complete without it.
      }
    };

    void prepareAmbientAudio();

    return () => {
      active = false;
      const player = ambientPlayer.current;
      ambientPlayer.current = null;

      if (player) {
        void fadeAmbientVolume(player, AMBIENT_VOLUME, 0, 500).finally(() => {
          try {
            player.remove();
          } catch {
            // Cleanup is best effort for optional ambient audio.
          }
        });
      }
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    let active = true;

    const runAnimation = (animation: Animated.CompositeAnimation) =>
      new Promise<boolean>((resolve) => {
        activeAnimation.current = animation;
        animation.start(({ finished }) => resolve(finished && active));
      });

    const timing = (
      value: Animated.Value,
      toValue: number,
      duration: number,
      easing = Easing.inOut(Easing.cubic)
    ) =>
      runAnimation(
        Animated.timing(value, {
          toValue,
          duration,
          easing,
          useNativeDriver: true,
        })
      );

    const delay = (duration: number) => runAnimation(Animated.delay(duration));

    const lightHaptic = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined
      );
    };

    const announcePhase = (phase: string) => {
      AccessibilityInfo.announceForAccessibility(phase);
    };

    const updateEncouragement = async (index: number) => {
      if (!(await timing(messageOpacity, 0, 500))) return false;
      setMessageIndex(index);
      return timing(messageOpacity, 1, 700, Easing.out(Easing.cubic));
    };

    const revealCompletion = async () => {
      if (!(await timing(messageOpacity, 0, 500))) return;
      setFinalReady(true);
      setBreathPhase('Complete');
      if (!(await timing(messageOpacity, 1, 700, Easing.out(Easing.cubic)))) return;

      lightHaptic();
      announcePhase("You're ready. Let's help your child.");
      if (!(await delay(1000))) return;

      setContinueEnabled(true);
      Animated.parallel([
        Animated.timing(breathingPromptOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(continueOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(continueScale, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    };

    const runBreathingSession = async () => {
      if (reduceMotion) {
        orbProgress.setValue(0.5);
        progressValues.forEach((value) => value.setValue(1));
        setBreathNumber(BREATH_COUNT);
        setBreathPhase('Complete');
        setFinalReady(true);
        setContinueEnabled(true);
        breathingPromptOpacity.setValue(0);
        continueOpacity.setValue(1);
        continueScale.setValue(1);
        AccessibilityInfo.announceForAccessibility(
          "You're ready. Let's help your child."
        );
        return;
      }

      for (let cycle = 0; cycle < BREATH_COUNT; cycle += 1) {
        if (!active) return;

        setBreathNumber(cycle + 1);
        Animated.timing(progressValues[cycle], {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();

        if (cycle > 0) void updateEncouragement(cycle);

        setBreathPhase('Inhale slowly');
        lightHaptic();
        announcePhase(`Breath ${cycle + 1}. Inhale slowly.`);
        if (!(await timing(orbProgress, 1, INHALE_DURATION))) return;

        setBreathPhase('Hold gently');
        announcePhase('Hold gently.');
        if (!(await delay(HOLD_DURATION))) return;

        setBreathPhase('Exhale slowly');
        lightHaptic();
        announcePhase('Exhale slowly.');
        if (!(await timing(orbProgress, 0, EXHALE_DURATION))) return;
      }

      await revealCompletion();
    };

    void runBreathingSession();

    return () => {
      active = false;
      activeAnimation.current?.stop();
      messageOpacity.stopAnimation();
      continueOpacity.stopAnimation();
      continueScale.stopAnimation();
      breathingPromptOpacity.stopAnimation();
      progressValues.forEach((value) => value.stopAnimation());
    };
  }, [
    breathingPromptOpacity,
    continueOpacity,
    continueScale,
    messageOpacity,
    orbProgress,
    progressValues,
    reduceMotion,
  ]);

  const orbScale = orbProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });

  const haloOpacity = orbProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const haloScale = orbProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1.08],
  });

  const handleBack = useCallback(() => {
    router.replace('/');
  }, [router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]);

  const encouragement = ENCOURAGEMENT[messageIndex];

  return (
    <View style={styles.screenBackground}>
      <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />

          <View pointerEvents="none" style={styles.ambientGlowTop} />
          <View pointerEvents="none" style={styles.ambientGlowBottom} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              { top: insets.top + 8 },
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text pointerEvents="none" style={styles.backGlyph}>‹</Text>
          </Pressable>

          <View style={styles.content}>
            <Animated.View
              accessibilityLiveRegion="polite"
              style={[styles.copyBlock, { opacity: messageOpacity }]}
            >
              <Text style={styles.title}>
                {finalReady ? "✨ You're ready." : encouragement.title}
              </Text>
              <Text style={styles.supportingCopy}>
                {finalReady ? "Let's help your child." : encouragement.body}
              </Text>
            </Animated.View>

            <View
              style={styles.orbStage}
              accessible
              accessibilityLabel={`Breath ${breathNumber} of ${BREATH_COUNT}. ${breathPhase}`}
            >
              <Animated.View
                style={[
                  styles.outerHalo,
                  {
                    opacity: haloOpacity,
                    transform: [{ scale: haloScale }],
                  },
                ]}
              />

              <Animated.View
                style={[styles.orbShadow, { transform: [{ scale: orbScale }] }]}
              >
                <LinearGradient
                  colors={[
                    'rgba(216,207,255,0.92)',
                    'rgba(137,112,224,0.88)',
                    'rgba(71,56,128,0.84)',
                  ]}
                  locations={[0, 0.48, 1]}
                  start={{ x: 0.22, y: 0.12 }}
                  end={{ x: 0.82, y: 0.9 }}
                  style={styles.orb}
                >
                  <View style={styles.orbInnerGlow} />
                  <View style={styles.orbGlassHighlight} />
                  <View style={styles.orbLowerShade} />
                </LinearGradient>
              </Animated.View>
            </View>

            <View style={styles.breathProgressBlock}>
              <Text style={styles.breathPhase}>{breathPhase}</Text>
              <Text style={styles.breathCount}>Breath {breathNumber}</Text>
              <View
                style={styles.progressRow}
                accessibilityLabel={`${breathNumber} of ${BREATH_COUNT} breaths`}
              >
                {progressValues.map((progress, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.progressDot,
                      {
                        opacity: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.28, 1],
                        }),
                        transform: [
                          {
                            scale: progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.actionStage}>
              <Animated.Text
                style={[
                  styles.breathingPrompt,
                  { opacity: breathingPromptOpacity },
                ]}
              >
                Breathe with me...
              </Animated.Text>

              <Animated.View
                pointerEvents={continueEnabled ? 'auto' : 'none'}
                accessibilityElementsHidden={!continueEnabled}
                style={[
                  styles.continueWrap,
                  {
                    opacity: continueOpacity,
                    transform: [{ scale: continueScale }],
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue to support"
                  onPress={() => router.push('/help-now/situation')}
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed && styles.continueButtonPressed,
                  ]}
                >
                  <Text style={styles.continueText}>Continue to Support →</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>

          <View style={styles.bypassActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="My child is missing or ran away" hitSlop={8} onPress={() => router.push({ pathname: '/safety/emergency/elopement', params: { origin: 'help-now' } })} style={({ pressed }) => [styles.emergencyBypass, pressed && styles.skipButtonPressed]}>
              <Text style={styles.emergencyBypassText}>My child is missing or ran away →</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Skip to support" hitSlop={8} onPress={() => router.push('/help-now/situation')} style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}>
              <Text style={styles.skipButtonText}>Skip to Support →</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bypassActions: { position: 'absolute', left: 24, right: 24, bottom: 14, alignItems: 'center', gap: 4 },
  emergencyBypass: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  emergencyBypassText: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  screenBackground: {
    flex: 1,
    backgroundColor: '#17181C',
  },
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#17181C',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -210,
    right: -155,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(124,102,191,0.09)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -250,
    left: -180,
    width: 470,
    height: 470,
    borderRadius: 235,
    backgroundColor: 'rgba(104,88,160,0.055)',
  },
  backButton: {
    position: 'absolute',
    zIndex: 20,
    elevation: 12,
    left: 18,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backGlyph: {
    marginTop: -3,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 18,
  },
  copyBlock: {
    width: '100%',
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#F8F7FA',
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  supportingCopy: {
    marginTop: 14,
    color: '#C5C2CA',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
    textAlign: 'center',
  },
  orbStage: {
    width: 190,
    height: 190,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerHalo: {
    position: 'absolute',
    width: 178,
    height: 178,
    borderRadius: 89,
    backgroundColor: 'rgba(157,133,230,0.18)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    elevation: 4,
  },
  orbShadow: {
    width: 138,
    height: 138,
    borderRadius: 69,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 25,
    elevation: 9,
  },
  orb: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 69,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.17)',
  },
  orbInnerGlow: {
    position: 'absolute',
    top: 18,
    left: 23,
    width: 90,
    height: 86,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  orbGlassHighlight: {
    position: 'absolute',
    top: 15,
    left: 30,
    width: 74,
    height: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '-12deg' }],
  },
  orbLowerShade: {
    position: 'absolute',
    right: -17,
    bottom: -19,
    width: 104,
    height: 83,
    borderRadius: 52,
    backgroundColor: 'rgba(28,22,58,0.16)',
  },
  breathProgressBlock: {
    minHeight: 78,
    marginTop: 8,
    alignItems: 'center',
  },
  breathPhase: {
    color: '#BDB8C7',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  breathCount: {
    marginTop: 5,
    color: '#85818D',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D8CFFF',
  },
  actionStage: {
    width: '100%',
    minHeight: 62,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingPrompt: {
    position: 'absolute',
    color: '#929099',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueWrap: {
    position: 'absolute',
    width: '100%',
  },
  continueButton: {
    width: '100%',
    minHeight: 62,
    borderRadius: 31,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7FA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 7,
  },
  continueButtonPressed: {
    opacity: 0.9,
  },
  continueText: {
    color: '#202126',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  skipButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonPressed: {
    opacity: 0.78,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
