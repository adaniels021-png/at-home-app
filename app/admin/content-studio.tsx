import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLessonLibraryItems } from '../../lib/lessonLibrary';

type StudioCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
  onPress: () => void;
};

type StatCardProps = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function ContentStudioScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [lessonCount, setLessonCount] = useState(0);
  const [activeLessonCount, setActiveLessonCount] = useState(0);
  const [inactiveLessonCount, setInactiveLessonCount] = useState(0);
  const [draftLessonCount, setDraftLessonCount] = useState(0);
  const [revisionLessonCount, setRevisionLessonCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);

      const lessons = await getLessonLibraryItems();

      setLessonCount(lessons.length);
      setActiveLessonCount(lessons.filter((lesson) => lesson.is_active).length);
      setInactiveLessonCount(
        lessons.filter((lesson) => lesson.is_active === false).length
      );

    setDraftLessonCount(
  lessons.filter((lesson: any) => lesson.quality_status === 'draft').length
);

setRevisionLessonCount(
  lessons.filter((lesson: any) => lesson.quality_status === 'needs_revision').length
);
    } catch (error) {
      console.error('Content Studio stats error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  const reviewCount = useMemo(() => inactiveLessonCount, [inactiveLessonCount]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#29145F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AI Content Studio</Text>
            <Text style={styles.subtitle}>
              Manage lessons, activities, review queues, and future content.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={28} color="#7C3AED" />
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Admin</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Your ABA content command center</Text>
          <Text style={styles.heroText}>
            Generate, review, organize, and publish educational content from one place.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Library Overview</Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#7C3AED" />
            <Text style={styles.loadingText}>Loading content stats...</Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard icon="library-outline" label="Lessons" value={lessonCount} />
            <StatCard icon="checkmark-circle-outline" label="Active" value={activeLessonCount} />
            <StatCard icon="clipboard-outline" label="Drafts" value={draftLessonCount} />
            <StatCard icon="refresh-outline" label="Revisions" value={revisionLessonCount} />
            <StatCard icon="hourglass-outline" label="Activities" value="Soon" />
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <StudioCard
          icon="school-outline"
          title="Generate Lessons"
          description="Create new ABA lesson content using your AI lesson generator."
          badge="AI"
          onPress={() => router.push('/admin/generate-lessons' as any)}
        />

   <StudioCard
  icon="analytics-outline"
  title="Curriculum Dashboard"
  description="Track curriculum coverage, missing stages, and low-coverage areas."
  badge="New"
  onPress={() => router.push('/admin/curriculum-dashboard' as any)}
/>

<StudioCard
  icon="map-outline"
  title="Curriculum Builder"
  description="Browse categories, skills, stages, and curriculum progress."
  onPress={() => router.push('/admin/curriculum-builder' as any)}
/>

<StudioCard
  icon="library-outline"
  title="All Lessons"
  description="Browse, search, and edit individual lessons in your curriculum."
  onPress={() => router.push('/admin/lesson-library' as any)}
/>

        <StudioCard
          icon="clipboard-outline"
          title="Lesson Review Queue"
          description="Review generated or inactive lessons before publishing."
          badge={reviewCount > 0 ? String(reviewCount) : undefined}
          onPress={() => router.push('/admin/lesson-review' as any)}
        />

        <StudioCard
          icon="color-wand-outline"
          title="Generate Activities"
          description="Create activity ideas for the Activities Library."
          badge="AI"
          onPress={() => router.push('/admin/activity-library/ai-generate' as any)}
        />

        <StudioCard
  icon="document-text-outline"
  title="Worksheet Generator"
  description="Create printable worksheet drafts for review."
  badge="New"
  onPress={() => router.push('/admin/worksheet-generator' as any)}
/>

<StudioCard
  icon="clipboard-outline"
  title="Worksheet Review Queue"
  description="Approve, reject, or delete worksheet drafts."
  badge="New"
  onPress={() => router.push('/admin/worksheet-review' as any)}
/>

        <Text style={styles.sectionTitle}>Coming Next</Text>

        <StudioCard
          icon="heart-circle-outline"
          title="Behavior Support Generator"
          description="Create calming strategies and parent support plans."
          badge="Soon"
          disabled
          onPress={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color="#7C3AED" />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StudioCard({
  icon,
  title,
  description,
  badge,
  disabled,
  onPress,
}: StudioCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.disabledCard]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={23} color="#7C3AED" />
      </View>

      <View style={styles.cardText}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>

          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#2E1065',
  },
  subtitle: {
    marginTop: 3,
    color: '#7C6F92',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: '#92400E',
    fontWeight: '900',
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  heroText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 12,
    marginTop: 4,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 10,
    color: '#64748B',
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 23,
    fontWeight: '900',
    color: '#2E1065',
  },
  statLabel: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledCard: {
    opacity: 0.65,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E1B4B',
    marginRight: 8,
  },
  cardDescription: {
    marginTop: 5,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 19,
  },
  badge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '900',
  },
});