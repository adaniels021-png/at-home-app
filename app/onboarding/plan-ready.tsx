import { ensureLessonQueue } from '@/lib/lessonQueue';
import { useChild } from '@/lib/SelectedChildContext';
import { useSubscription } from '@/lib/SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function PlanReadyScreen() {
  const router = useRouter();

  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();

  useEffect(() => {
  if (!selectedChild?.id) return;

  const childName =
    selectedChild.child_name ||
    selectedChild.name ||
    'your child';

  let cancelled = false;

  async function preloadLessons() {
    try {
      // Load the first lesson category immediately.
      await ensureLessonQueue({
        childId: selectedChild.id,
        childName,
        category: 'Communication',
        isPro,
      });

      const remainingCategories = [
        'Social',
        'Play',
        'Self-Help',
        'Motor',
      ];

      for (const category of remainingCategories) {
        if (cancelled) return;

        await new Promise((resolve) => setTimeout(resolve, 2500));

        ensureLessonQueue({
          childId: selectedChild.id,
          childName,
          category,
          isPro,
        }).catch((error) => {
          console.log(`Background preloading ${category} lessons failed:`, error);
        });
      }
    } catch (error) {
      console.log('Initial lesson preload failed:', error);
    }
  }

  void preloadLessons();

  return () => {
    cancelled = true;
  };
}, [selectedChild?.id, selectedChild?.child_name, selectedChild?.name, isPro]);


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 4 OF 4</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={38} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Your Plan Is Ready</Text>

          <Text style={styles.subtitle}>
            ABA at Home is now personalized with lessons, communication tools,
            routines, worksheets, and caregiver support based on your answers.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you can do next</Text>

          <FeatureRow
            icon="book-outline"
            title="Start today’s lesson"
            text="Open a simple guided lesson matched to your child’s needs."
          />

          <FeatureRow
            icon="chatbubbles-outline"
            title="Use communication supports"
            text="Try PECS-style cards and visual supports for daily communication."
          />

          <FeatureRow
            icon="heart-circle-outline"
            title="Explore parent support"
            text="Find calming tools, encouragement, and practical caregiver guidance."
          />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => router.replace('/(tabs)/daily-lessons' as any)}
        >
          <Ionicons name="book" size={19} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Start First Lesson</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.9}
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Text style={styles.secondaryButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={22} color="#4F46E5" />
      </View>

      <View style={styles.featureTextWrap}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 24,
    paddingBottom: 42,
  },

  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  stepBadgeText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#4F46E5',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -75,
    right: -45,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(224, 231, 255, 0.18)',
    bottom: -55,
    left: -35,
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 10,
  },

  subtitle: {
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  cardTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  featureTextWrap: {
    flex: 1,
  },

  featureTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  featureText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 4,
  },

  primaryButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },

  secondaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '900',
  },
});