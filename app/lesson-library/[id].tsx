import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import { getLessonById, LessonLibraryItem } from '../../lib/lessonLibrary';

export default function LessonLibraryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lesson, setLesson] = useState<LessonLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLesson() {
      if (!id) return;

      try {
        const data = await getLessonById(id);
        setLesson(data);
      } catch (error) {
        console.error('Lesson detail error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading lesson...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.center}>
        <Text>Lesson not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AnimatedPressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#2F2A3D" />
        <Text style={styles.backText}>Back</Text>
      </AnimatedPressable>

      <Text style={styles.category}>{lesson.category}</Text>
      <Text style={styles.title}>{lesson.title}</Text>

      <Text style={styles.meta}>
        {lesson.skill_area} • Stage {lesson.stage_number}: {lesson.stage_name}
      </Text>

      {lesson.description ? <Text style={styles.description}>{lesson.description}</Text> : null}

      {lesson.goal ? (
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>Goal</Text>
          <Text style={styles.goalText}>{lesson.goal}</Text>
        </View>
      ) : null}

      <Section title="Materials" items={lesson.materials || []} />
      <Section title="Steps" items={lesson.steps || []} numbered />
      <Section title="Caregiver Tips" items={lesson.caregiver_tips || []} />
    </ScrollView>
  );
}

function Section({
  title,
  items,
  numbered,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
}) {
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {items.map((item, index) => (
        <Text key={`${title}-${index}`} style={styles.itemText}>
          {numbered ? `${index + 1}. ` : '• '}
          {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  content: { padding: 20, paddingTop: 70, paddingBottom: 90 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backText: { marginLeft: 6, fontWeight: '800', color: '#2F2A3D' },

  category: { color: '#8B5CF6', fontWeight: '900', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '900', color: '#2F2A3D', marginBottom: 8 },
  meta: { color: '#6B6478', fontWeight: '800', marginBottom: 14 },
  description: { fontSize: 16, lineHeight: 23, color: '#4B465C', marginBottom: 18 },

  goalCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  goalTitle: { color: '#4F46E5', fontWeight: '900', marginBottom: 6 },
  goalText: { color: '#3730A3', lineHeight: 22, fontWeight: '700' },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#2F2A3D', marginBottom: 10 },
  itemText: { fontSize: 15, lineHeight: 23, color: '#4B465C', marginBottom: 6 },
});