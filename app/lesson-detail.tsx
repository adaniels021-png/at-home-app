import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLessonById, LessonLibraryItem } from '../lib/lessonLibrary';
import { useChildSubscription as useSubscription } from '../lib/ChildSubscriptionContext';

export default function LessonDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isPro, loading: subscriptionLoading } = useSubscription();

  const [lesson, setLesson] = useState<LessonLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLesson() {
      if (subscriptionLoading) return;

      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getLessonById(id, isPro);
        setLesson(data);
      } catch (error) {
        console.error('Lesson detail error:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadLesson();
  }, [id, isPro, subscriptionLoading]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#6366F1" />
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Lesson not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Lesson Detail</Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.category}>{lesson.category}</Text>
        <Text style={styles.title}>{lesson.title}</Text>

        <Text style={styles.meta}>
          {lesson.skill_area} • Stage {lesson.stage_number}: {lesson.stage_name}
        </Text>

        {lesson.description ? (
          <Text style={styles.description}>{lesson.description}</Text>
        ) : null}

        <InfoCard title="Goal" text={lesson.goal} icon="flag-outline" />

        <InfoCard
          title="Why This Skill Matters"
          text={lesson.why_skill_matters}
          icon="heart-outline"
        />

        <InfoCard
          title="Setup"
          text={lesson.setup_instructions}
          icon="construct-outline"
        />

        <InfoCard
          title="Parent Script"
          text={lesson.parent_script}
          icon="chatbubble-ellipses-outline"
        />

        <InfoCard
          title="Expected Child Response"
          text={lesson.expected_child_response}
          icon="happy-outline"
        />

        <Section title="Materials" items={lesson.materials || []} />
        <Section title="Teaching Steps" items={lesson.steps || []} numbered />
        <Section title="Caregiver Tips" items={lesson.caregiver_tips || []} />
        <Section title="Prompting Tips" items={lesson.prompting_tips || []} />
        <Section title="Reinforcement Tips" items={lesson.reinforcement_tips || []} />
        <Section title="If Child Struggles" items={lesson.if_child_struggles || []} />

        <InfoCard title="Easy Version" text={lesson.easy_version} icon="remove-circle-outline" />
        <InfoCard title="Harder Version" text={lesson.harder_version} icon="add-circle-outline" />

        <Section title="Generalization Ideas" items={lesson.generalization_ideas || []} />
        <Section title="Safety Notes" items={lesson.safety_notes || []} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({
  title,
  text,
  icon,
}: {
  title: string;
  text?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  if (!text) return null;

  return (
    <View style={styles.infoCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color="#6366F1" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <Text style={styles.bodyText}>{text}</Text>
    </View>
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
    <View style={styles.infoCard}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, color: '#64748B', fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  backLink: { marginTop: 12, color: '#6366F1', fontWeight: '800' },
  category: { color: '#8B5CF6', fontWeight: '900', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#2F2A3D', marginBottom: 8 },
  meta: { color: '#6B6478', fontWeight: '800', marginBottom: 14 },
  description: { fontSize: 16, lineHeight: 24, color: '#4B465C', marginBottom: 16 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1E7DA',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2F2A3D',
    marginBottom: 8,
    marginLeft: 6,
  },
  bodyText: { fontSize: 15, lineHeight: 23, color: '#4B465C', fontWeight: '600' },
  itemText: { fontSize: 15, lineHeight: 23, color: '#4B465C', marginBottom: 6 },
});
