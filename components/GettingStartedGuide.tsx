import { Image, ImageSource } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedPressable from './AnimatedPressable';

type GuidePage = {
  id: string;
  image: ImageSource;
  title: string;
  body: string;
  buttonLabel: string;
  accessibilityLabel: string;
};

const GUIDE_PAGES: GuidePage[] = [
  {
    id: 'welcome',
    image: require('../assets/onboarding/getting-started/welcome.webp'),
    title: 'Getting Started with ABA at Home',
    body:
      "Welcome to ABA at Home!\n\nEvery child learns differently, and every small step forward matters.\n\nYou don't need to be a therapist to help your child learn. We'll guide you with simple, practical lessons that fit naturally into everyday life.\n\nYou're not expected to know everything. We'll learn together, one step at a time.",
    buttonLabel: "Let's Get Started",
    accessibilityLabel: 'Mother and child playing a gentle ball game together',
  },
  {
    id: 'routines',
    image: require('../assets/onboarding/getting-started/routines.webp'),
    title: 'Learning Happens Every Day',
    body:
      "Some of the best learning happens during everyday routines like hand washing, getting dressed, mealtime, and playtime.\n\nOur lessons are designed to help you turn everyday moments into meaningful learning opportunities without changing your family's routine.",
    buttonLabel: 'Next',
    accessibilityLabel: 'Mother helping her child wash his hands',
  },
  {
    id: 'emotions',
    image: require('../assets/onboarding/getting-started/emotions.webp'),
    title: 'Support Communication & Feelings',
    body:
      'Helping your child communicate is about more than words.\n\nLearning to express wants, needs, and emotions builds confidence and strengthens everyday interactions.\n\nSmall conversations and shared moments can make a big difference.',
    buttonLabel: 'Next',
    accessibilityLabel: 'Mother and child exploring emotion cards together',
  },
  {
    id: 'celebrate',
    image: require('../assets/onboarding/getting-started/celebrate.webp'),
    title: 'Celebrate Every Success',
    body:
      'Praise, encouragement, and celebrating effort help children stay motivated and enjoy learning.\n\nEvery small success is a step toward greater independence.',
    buttonLabel: 'Next',
    accessibilityLabel: 'Mother and child celebrating with a high five',
  },
  {
    id: 'growth',
    image: require('../assets/onboarding/getting-started/growth.webp'),
    title: 'Progress Takes Time',
    body:
      "Every child learns at their own pace, and that's okay.\n\nSome skills develop quickly, while others take practice and repetition.\n\nStay patient, celebrate progress, and remember that every small step helps your child grow.",
    buttonLabel: 'Next',
    accessibilityLabel: 'A seed growing gradually into a flowering plant',
  },
  {
    id: 'journey',
    image: require('../assets/onboarding/getting-started/journey.webp'),
    title: "You're Ready to Begin!",
    body:
      "You now have the tools to get started with confidence.\n\nRemember, learning doesn't have to be perfect—it just needs to be consistent.\n\nWe're excited to be part of your family's journey.\n\nLet's take the first step together.",
    buttonLabel: 'Continue to Lessons',
    accessibilityLabel: 'Mother and child walking forward together in a sunny park',
  },
];

export default function GettingStartedGuide({
  onComplete,
}: {
  onComplete: () => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<FlatList<GuidePage>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const pageWidth = Math.max(width, 1);
  const imageHeight = Math.min(pageWidth * 0.58, 330);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => subscription.remove();
  }, []);

  const progressLabel = useMemo(
    () => `Step ${activeIndex + 1} of ${GUIDE_PAGES.length}`,
    [activeIndex]
  );

  const handleNext = async () => {
    if (activeIndex < GUIDE_PAGES.length - 1) {
      const nextIndex = activeIndex + 1;

      pagerRef.current?.scrollToIndex({
        index: nextIndex,
        animated: !reduceMotion,
      });
      setActiveIndex(nextIndex);
      return;
    }

    try {
      setSaving(true);
      await onComplete();
    } finally {
      setSaving(false);
    }
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / pageWidth
    );

    setActiveIndex(
      Math.max(0, Math.min(nextIndex, GUIDE_PAGES.length - 1))
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.eyebrow}>ABA AT HOME</Text>
        <Text style={styles.progressText}>{progressLabel}</Text>
      </View>

      <FlatList
        ref={pagerRef}
        data={GUIDE_PAGES}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: pageWidth }]}>
            <ScrollView
              style={styles.pageScroll}
              contentContainerStyle={styles.pageContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={[styles.imageCard, { height: imageHeight }]}>
                <Image
                  source={item.image}
                  style={styles.image}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={reduceMotion ? 0 : 280}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={item.accessibilityLabel}
                />
                <View pointerEvents="none" style={styles.imageWash} />
              </View>

              <View style={styles.copyWrap}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={progressLabel}
          accessibilityValue={{
            min: 1,
            max: GUIDE_PAGES.length,
            now: activeIndex + 1,
          }}
        >
          {GUIDE_PAGES.map((page, index) => (
            <ProgressDot
              key={page.id}
              active={index === activeIndex}
              completed={index < activeIndex}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>

        <AnimatedPressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={() => void handleNext()}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={
            saving ? 'Saving Getting Started completion' : GUIDE_PAGES[activeIndex].buttonLabel
          }
        >
          <Text style={styles.buttonText}>
            {saving ? 'Opening Lessons…' : GUIDE_PAGES[activeIndex].buttonLabel}
          </Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

function ProgressDot({
  active,
  completed,
  reduceMotion,
}: {
  active: boolean;
  completed: boolean;
  reduceMotion: boolean;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(active ? 1 : 0);
      return;
    }

    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [active, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 24],
          }),
          backgroundColor: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [
              completed ? '#A5B4FC' : '#CBD5E1',
              '#4F46E5',
            ],
          }),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F3',
    paddingBottom: 96,
  },
  topBar: {
    minHeight: 48,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  progressText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  page: {
    flex: 1,
    paddingHorizontal: 18,
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 10,
  },
  imageCard: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F1E8DC',
    borderWidth: 1,
    borderColor: '#F1E3D3',
    shadowColor: '#7C2D12',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  copyWrap: {
    paddingHorizontal: 8,
    paddingTop: 24,
    alignItems: 'center',
  },
  title: {
    color: '#241B35',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  body: {
    marginTop: 14,
    color: '#5F586B',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 620,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 12,
  },
  dots: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 10,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#4F46E5',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
});
