import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CurriculumStageScreen() {
  const router = useRouter();

  const { category, skill, stage, stageNumber } = useLocalSearchParams<{
    category?: string;
    skill?: string;
    stage?: string;
    stageNumber?: string;
  }>();

  const categoryTitle = String(category || '');
  const skillTitle = String(skill || '');
  const stageTitle = String(stage || '');
  const stageLabel = `Stage ${stageNumber || '1'}`;

 const openLessonLibrary = () => {
  router.push({
    pathname: '/admin/lesson-library',
    params: {
      category: categoryTitle,
      skill: skillTitle,
      stageNumber: String(stageNumber || '1'),
    },
  } as any);
};

  const openGenerateLessons = () => {
    router.push('/admin/generate-lessons' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#29145F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{stageLabel}</Text>
            <Text style={styles.subtitle}>{skillTitle}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="layers-outline" size={28} color="#7C3AED" />
          </View>

          <Text style={styles.heroTitle}>{stageTitle}</Text>
          <Text style={styles.heroText}>
            {categoryTitle} · {skillTitle}
          </Text>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Stage Tools</Text>

          <TouchableOpacity style={styles.toolButton} onPress={openLessonLibrary}>
            <View style={styles.toolIcon}>
              <Ionicons name="library-outline" size={21} color="#7C3AED" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>View Matching Lessons</Text>
              <Text style={styles.toolText}>
                Open the lesson library to review related lessons.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={openGenerateLessons}>
            <View style={styles.toolIcon}>
              <Ionicons name="sparkles-outline" size={21} color="#7C3AED" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>Generate More Lessons</Text>
              <Text style={styles.toolText}>
                Create AI draft lessons for this curriculum area.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => router.push('/admin/lesson-review' as any)}
          >
            <View style={styles.toolIcon}>
              <Ionicons name="clipboard-outline" size={21} color="#7C3AED" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle}>Review Drafts</Text>
              <Text style={styles.toolText}>
                Approve, revise, or archive lessons waiting for review.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.placeholderCard}>
          <Ionicons name="bar-chart-outline" size={24} color="#7C3AED" />
          <Text style={styles.placeholderTitle}>Lesson counts coming next</Text>
          <Text style={styles.placeholderText}>
            Next upgrade: this stage will show lesson counts, coverage status,
            and a filtered list of only lessons matching this stage.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  content: { padding: 20, paddingBottom: 120 },
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
    color: '#7C3AED',
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
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
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  heroText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '800',
    lineHeight: 21,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 14,
  },
  toolButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toolTitle: {
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '900',
  },
  toolText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  placeholderCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  placeholderTitle: {
    marginTop: 10,
    color: '#2E1065',
    fontSize: 17,
    fontWeight: '900',
  },
  placeholderText: {
    marginTop: 7,
    color: '#6D28D9',
    fontWeight: '800',
    lineHeight: 20,
    fontSize: 13,
  },
});