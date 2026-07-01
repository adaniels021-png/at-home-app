import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../components/AnimatedPressable';
import { getLessonLibraryItems, LessonLibraryItem } from '../lib/lessonLibrary';

export default function LessonLibraryTestScreen() {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLessons() {
      try {
        const data = await getLessonLibraryItems();
        setLessons(data);
      } catch (error) {
        console.error('Lesson library test error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLessons();
  }, []);

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

      {lessons.map((lesson) => (
        <AnimatedPressable
          key={lesson.id}
          style={styles.card}
          onPress={() => router.push(`/lesson-library/${lesson.id}`)}
        >
          <Text style={styles.category}>{lesson.category}</Text>
          <Text style={styles.cardTitle}>{lesson.title}</Text>
          <Text style={styles.text}>{lesson.skill_area}</Text>
          <Text style={styles.text}>
            Stage {lesson.stage_number}: {lesson.stage_name}
          </Text>
          <Text style={styles.text}>Type: {lesson.lesson_type}</Text>
        </AnimatedPressable>
      ))}
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
  category: { fontSize: 12, fontWeight: '900', color: '#8B5CF6', marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#2F2A3D' },
  text: { marginTop: 4, color: '#6B6478', fontWeight: '700' },
});