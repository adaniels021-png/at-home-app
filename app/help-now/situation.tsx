import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
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

type SituationOption = {
  id: SituationId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  iconBackground: string;
};

const SITUATIONS: SituationOption[] = [
  {
    id: 'meltdown',
    title: 'My child is having a meltdown',
    subtitle: 'Crying, screaming, dropping, or feeling overwhelmed.',
    icon: 'cloudy-outline',
    accent: '#C4B5FD',
    iconBackground: 'rgba(167,139,250,0.14)',
  },
  {
    id: 'aggression',
    title: 'Aggressive behavior',
    subtitle: 'Hitting, biting, kicking, or throwing objects.',
    icon: 'hand-left-outline',
    accent: '#F0B19C',
    iconBackground: 'rgba(240,177,156,0.13)',
  },
  {
    id: 'elopement',
    title: 'Trying to run away',
    subtitle: 'Bolting, wandering, or unsafe movement.',
    icon: 'walk-outline',
    accent: '#93C5FD',
    iconBackground: 'rgba(147,197,253,0.13)',
  },
  {
    id: 'refusal',
    title: 'Refusing to cooperate',
    subtitle: 'Saying no, avoiding tasks, or having trouble transitioning.',
    icon: 'pause-circle-outline',
    accent: '#A5B4FC',
    iconBackground: 'rgba(165,180,252,0.13)',
  },
  {
    id: 'anxiety',
    title: 'Very upset or anxious',
    subtitle: 'Fear, panic, sadness, or frustration.',
    icon: 'heart-outline',
    accent: '#F0ABC4',
    iconBackground: 'rgba(240,171,196,0.13)',
  },
  {
    id: 'other',
    title: 'Something else',
    subtitle: "I'll describe what's happening.",
    icon: 'ellipsis-horizontal-outline',
    accent: '#CBD5E1',
    iconBackground: 'rgba(203,213,225,0.11)',
  },
];

export default function HelpNowSituationScreen() {
  const router = useRouter();
  const [reduceMotion, setReduceMotion] = useState(false);
  const entranceOpacity = useRef(new Animated.Value(0)).current;

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
    };
  }, [entranceOpacity]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/help-now');
  };

  const handleSituationSelect = (situation: SituationId) => {
    router.push({
      pathname: '/help-now/check-in',
      params: { situation },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View pointerEvents="none" style={styles.ambientGlowTop} />
      <View pointerEvents="none" style={styles.ambientGlowBottom} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back to breathing"
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
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Let&apos;s figure this out together.</Text>
          <Text style={styles.subtitle}>
            Choose what best matches what&apos;s happening right now.
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.optionsContent}
        >
          {SITUATIONS.map((situation) => (
            <SituationCard
              key={situation.id}
              situation={situation}
              reduceMotion={reduceMotion}
              onPress={() => handleSituationSelect(situation.id)}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function SituationCard({
  situation,
  reduceMotion,
  onPress,
}: {
  situation: SituationOption;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number) => {
    if (reduceMotion) return;

    Animated.timing(scale, {
      toValue,
      duration: toValue < 1 ? 120 : 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${situation.title}. ${situation.subtitle}`}
      accessibilityHint="Continues with support for this situation"
      onPress={onPress}
      onPressIn={() => animateScale(0.985)}
      onPressOut={() => animateScale(1)}
    >
      <Animated.View style={[styles.optionCard, { transform: [{ scale }] }]}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: situation.iconBackground },
          ]}
        >
          <Ionicons name={situation.icon} size={25} color={situation.accent} />
        </View>

        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle}>{situation.title}</Text>
          <Text style={styles.optionSubtitle}>{situation.subtitle}</Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color="rgba(226,232,240,0.42)"
        />
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
  headerCopy: {
    paddingTop: 22,
    paddingHorizontal: 24,
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
    maxWidth: 340,
    marginTop: 12,
    color: '#AAA6B0',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  optionsContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 12,
  },
  optionCard: {
    minHeight: 94,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    marginRight: 13,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.065)',
  },
  optionCopy: {
    flex: 1,
    paddingRight: 10,
  },
  optionTitle: {
    color: '#F4F2F7',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    marginTop: 5,
    color: '#AAA6B0',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
