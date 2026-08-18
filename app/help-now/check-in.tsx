import { Ionicons } from '@expo/vector-icons';
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

type SituationId =
  | 'meltdown'
  | 'aggression'
  | 'elopement'
  | 'refusal'
  | 'anxiety'
  | 'other';

type IntensityId = 'mild' | 'moderate' | 'high';

type IntensityOption = {
  id: IntensityId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  iconBackground: string;
  description: string;
  reassurance: string;
};

const SITUATION_IDS: SituationId[] = [
  'meltdown',
  'aggression',
  'elopement',
  'refusal',
  'anxiety',
  'other',
];

const INTENSITIES: IntensityOption[] = [
  {
    id: 'mild',
    icon: 'leaf-outline',
    accent: '#C4B5FD',
    iconBackground: 'rgba(167,139,250,0.14)',
    label: 'Mild',
    description: 'My child is upset but still somewhat responsive.',
    reassurance: "You're already taking the first step by slowing down.",
  },
  {
    id: 'moderate',
    icon: 'pulse-outline',
    accent: '#A5B4FC',
    iconBackground: 'rgba(165,180,252,0.14)',
    label: 'Moderate',
    description: "It's becoming difficult to calm them.",
    reassurance: "We'll go through this together.",
  },
  {
    id: 'high',
    icon: 'shield-outline',
    accent: '#D8B4C7',
    iconBackground: 'rgba(216,180,199,0.13)',
    label: 'High',
    description:
      "They're very overwhelmed and it's hard to keep everyone regulated.",
    reassurance: "Focus on safety. We'll take this one step at a time.",
  },
];

export default function HelpNowCheckInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ situation?: string }>();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showIntensity, setShowIntensity] = useState(false);
  const [selectedIntensity, setSelectedIntensity] =
    useState<IntensityId | null>(null);

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const intensityOpacity = useRef(new Animated.Value(0)).current;
  const intensityTranslateY = useRef(new Animated.Value(10)).current;
  const reassuranceOpacity = useRef(new Animated.Value(0)).current;

  const situation: SituationId = SITUATION_IDS.includes(
    params.situation as SituationId
  )
    ? (params.situation as SituationId)
    : 'other';

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
      intensityOpacity.stopAnimation();
      intensityTranslateY.stopAnimation();
      reassuranceOpacity.stopAnimation();
    };
  }, [
    entranceOpacity,
    intensityOpacity,
    intensityTranslateY,
    reassuranceOpacity,
  ]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/help-now/situation');
  };

  const handleImmediateDanger = () => {
    router.push({
      pathname: '/help-now/safety',
      params: { situation },
    });
  };

  const revealIntensity = () => {
    if (showIntensity) return;

    setShowIntensity(true);
    Animated.parallel([
      Animated.timing(intensityOpacity, {
        toValue: 1,
        duration: reduceMotion ? 0 : 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(intensityTranslateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const selectIntensity = (intensity: IntensityId) => {
    reassuranceOpacity.setValue(0);
    setSelectedIntensity(intensity);

    Animated.timing(reassuranceOpacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const continueToCoaching = () => {
    if (!selectedIntensity) return;

    router.push({
      pathname: '/help-now/coach',
      params: {
        situation,
        intensity: selectedIntensity,
      },
    });
  };

  const selectedOption = INTENSITIES.find(
    (option) => option.id === selectedIntensity
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View pointerEvents="none" style={styles.ambientGlowTop} />
      <View pointerEvents="none" style={styles.ambientGlowBottom} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back to situation selection"
        hitSlop={12}
        onPress={handleBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>

      <Animated.View style={[styles.screenContent, { opacity: entranceOpacity }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerCopy}>
            <Text style={styles.title}>
              Let&apos;s make sure everyone&apos;s safe.
            </Text>
            <Text style={styles.subtitle}>
              I&apos;ll guide you one step at a time.
            </Text>
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.questionTitle}>
              Is anyone in immediate danger?
            </Text>
            <Text style={styles.questionSubtitle}>Examples:</Text>
            <View style={styles.exampleList}>
              <Text style={styles.exampleText}>• serious self-injury</Text>
              <Text style={styles.exampleText}>• severe aggression</Text>
              <Text style={styles.exampleText}>• running toward traffic</Text>
              <Text style={styles.exampleText}>• medical emergency</Text>
            </View>

            <View style={styles.answerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yes, someone is in immediate danger"
                onPress={handleImmediateDanger}
                style={({ pressed }) => [
                  styles.answerButton,
                  pressed && styles.answerButtonPressed,
                ]}
              >
                <Text style={styles.answerText}>YES</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="No, no one is in immediate danger"
                onPress={revealIntensity}
                style={({ pressed }) => [
                  styles.answerButton,
                  showIntensity && styles.answerButtonSelected,
                  pressed && styles.answerButtonPressed,
                ]}
              >
                <Text style={styles.answerText}>NO</Text>
              </Pressable>
            </View>
          </View>

          {showIntensity ? (
            <Animated.View
              style={[
                styles.intensitySection,
                {
                  opacity: intensityOpacity,
                  transform: [{ translateY: intensityTranslateY }],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>
                How intense is this right now?
              </Text>

              <View style={styles.intensityList}>
                {INTENSITIES.map((option) => (
                  <IntensityCard
                    key={option.id}
                    option={option}
                    selected={selectedIntensity === option.id}
                    reduceMotion={reduceMotion}
                    onPress={() => selectIntensity(option.id)}
                  />
                ))}
              </View>

              <Animated.Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.reassurance,
                  { opacity: reassuranceOpacity },
                ]}
              >
                {selectedOption?.reassurance ?? ' '}
              </Animated.Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue to coaching"
                accessibilityState={{ disabled: !selectedIntensity }}
                disabled={!selectedIntensity}
                onPress={continueToCoaching}
                style={({ pressed }) => [
                  styles.continueButton,
                  !selectedIntensity && styles.continueButtonDisabled,
                  pressed && selectedIntensity && styles.continueButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.continueText,
                    !selectedIntensity && styles.continueTextDisabled,
                  ]}
                >
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function IntensityCard({
  option,
  selected,
  reduceMotion,
  onPress,
}: {
  option: IntensityOption;
  selected: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const selectionProgress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(selectionProgress, {
      toValue: selected ? 1 : 0,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => selectionProgress.stopAnimation();
  }, [reduceMotion, selected, selectionProgress]);

  const scale = selectionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.012],
  });

  const translateY = selectionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${option.label}. ${option.description}`}
      accessibilityState={{ selected }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.intensityCard,
          selected && styles.intensityCardSelected,
          { transform: [{ translateY }, { scale }] },
        ]}
      >
        <View
          accessible={false}
          style={[
            styles.intensityIconContainer,
            { backgroundColor: option.iconBackground },
          ]}
        >
          <Ionicons name={option.icon} size={24} color={option.accent} />
        </View>
        <View style={styles.intensityCopy}>
          <Text style={styles.intensityLabel}>{option.label}</Text>
          <Text style={styles.intensityDescription}>{option.description}</Text>
        </View>
        <View
          style={[
            styles.selectionIndicator,
            selected && styles.selectionIndicatorSelected,
          ]}
        >
          {selected ? <View style={styles.selectionIndicatorDot} /> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  screenContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  headerCopy: {
    paddingTop: 22,
    paddingHorizontal: 6,
    paddingBottom: 22,
  },
  title: {
    color: '#F8F7FA',
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.75,
  },
  subtitle: {
    marginTop: 12,
    color: '#AAA6B0',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  questionCard: {
    padding: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  questionTitle: {
    color: '#F4F2F7',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  questionSubtitle: {
    marginTop: 14,
    color: '#C5C2CA',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  exampleList: {
    marginTop: 5,
    gap: 3,
  },
  exampleText: {
    color: '#AAA6B0',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  answerRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  answerButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  answerButtonSelected: {
    backgroundColor: 'rgba(167,139,250,0.13)',
    borderColor: 'rgba(196,181,253,0.34)',
  },
  answerButtonPressed: {
    opacity: 0.78,
  },
  answerText: {
    color: '#F4F2F7',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  intensitySection: {
    marginTop: 28,
  },
  sectionTitle: {
    paddingHorizontal: 6,
    color: '#F4F2F7',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  intensityList: {
    marginTop: 16,
    gap: 12,
  },
  intensityCard: {
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 2,
  },
  intensityCardSelected: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderColor: 'rgba(196,181,253,0.38)',
    shadowColor: '#A78BFA',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  intensityIconContainer: {
    width: 46,
    height: 46,
    marginRight: 11,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.065)',
  },
  intensityCopy: {
    flex: 1,
    paddingRight: 10,
  },
  intensityLabel: {
    color: '#F4F2F7',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  intensityDescription: {
    marginTop: 5,
    color: '#AAA6B0',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  selectionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(226,232,240,0.28)',
  },
  selectionIndicatorSelected: {
    borderColor: '#C4B5FD',
  },
  selectionIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C4B5FD',
  },
  reassurance: {
    minHeight: 48,
    marginTop: 20,
    paddingHorizontal: 12,
    color: '#C5C2CA',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButton: {
    minHeight: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7FA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 7,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonPressed: {
    opacity: 0.9,
  },
  continueText: {
    color: '#202126',
    fontSize: 17,
    fontWeight: '800',
  },
  continueTextDisabled: {
    color: 'rgba(255,255,255,0.34)',
  },
});
