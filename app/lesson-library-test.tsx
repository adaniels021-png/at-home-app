import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../components/AnimatedPressable';
import { canAccessLesson } from '../lib/entitlements';
import { getLessonLibraryItems, LessonLibraryItem } from '../lib/lessonLibrary';
import { useChildSubscription as useSubscription } from '../lib/ChildSubscriptionContext';

export default function LessonLibraryTestScreen() {
  const router = useRouter();
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const [lessons, setLessons] = useState<LessonLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLessons() {
      if (subscriptionLoading) return;

      try {
        const data = await getLessonLibraryItems(isPro);
        setLessons(data);
      } catch (error) {
        console.error('Lesson library test error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLessons();
  }, [isPro, subscriptionLoading]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading lesson library...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Lesson Library Test</Text>
      <Text style={styles.subtitle}>{lessons.length} lessons loaded</Text>

      {lessons.map((lesson) => {
        const accessible = canAccessLesson(isPro, lesson);

        return (
          <AnimatedPressable
            key={lesson.id}
            style={styles.card}
            onPress={() =>
              accessible
                ? router.push(`/lesson-library/${lesson.id}`)
                : router.push('/subscription')
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{lesson.category}</Text>
              {!accessible ? (
                <View style={styles.proBadge}>
                  <Ionicons name="lock-closed" size={12} color="#7C3AED" />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.cardTitle}>{lesson.title}</Text>
            <Text style={styles.text}>{lesson.skill_area}</Text>
            <Text style={styles.text}>
              Stage {lesson.stage_number}: {lesson.stage_name}
            </Text>
            <Text style={styles.text}>Type: {lesson.lesson_type}</Text>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  content: { padding: 20, paddingTop: 70, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#2F2A3D' },
  subtitle: { marginTop: 6, marginBottom: 20, fontSize: 16, color: '#6B6478' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  category: { fontSize: 12, fontWeight: '900', color: '#8B5CF6' },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3E8FF',
  },
  proBadgeText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '900',
  },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#2F2A3D' },
  text: { marginTop: 4, color: '#6B6478', fontWeight: '700' },
});
