import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurriculumSkill } from '../../lib/curriculum';
import {
  StageCoverage,
  getCurriculumCoverage,
} from '../../lib/curriculumCoverage';

export default function CurriculumSkillScreen() {
  const router = useRouter();
  const { category, skill } = useLocalSearchParams<{
    category?: string;
    skill?: string;
  }>();

  const [stageCoverage, setStageCoverage] = useState<StageCoverage[]>([]);

  const categoryTitle = String(category || '');
  const skillTitle = String(skill || '');

  const selectedSkill = useMemo(() => {
    return getCurriculumSkill(categoryTitle, skillTitle);
  }, [categoryTitle, skillTitle]);

  const stages = selectedSkill?.stages ?? [];

  useEffect(() => {
  async function loadCoverage() {
    const data = await getCurriculumCoverage();

    const matchingStages =
      data.categories
        .find((item) => item.category === categoryTitle)
        ?.skills.find((item) => item.skill === skillTitle)
        ?.stages ?? [];

    setStageCoverage(matchingStages);
  }

  void loadCoverage();
}, [categoryTitle, skillTitle]);

  const openLessonLibrary = () => {
    router.push('/admin/lesson-library' as any);
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
            <Text style={styles.title}>{skillTitle || 'Curriculum Skill'}</Text>
            <Text style={styles.subtitle}>{categoryTitle}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="git-branch-outline" size={28} color="#7C3AED" />
          </View>

          <Text style={styles.heroTitle}>Skill progression</Text>
          <Text style={styles.heroText}>
            Review each stage for this skill, open related lessons, or generate new draft lessons.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={openGenerateLessons}>
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Generate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={openLessonLibrary}>
              <Ionicons name="library-outline" size={18} color="#7C3AED" />
              <Text style={styles.secondaryButtonText}>Lessons</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Stages</Text>

        {stages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#7C3AED" />
            <Text style={styles.emptyTitle}>No stages found</Text>
            <Text style={styles.emptyText}>
              This skill does not have stages listed yet.
            </Text>
          </View>
        ) : (
          stages.map((stage, index) => {
  const coverage = stageCoverage.find(
    (item) => item.stageNumber === index + 1
  );

  return (
            
            <TouchableOpacity
              key={`${skillTitle}-${stage}`}
              style={styles.stageCard}
              onPress={() =>
  router.push({
    pathname: '/admin/curriculum-stage',
    params: {
      category: categoryTitle,
      skill: skillTitle,
      stage,
      stageNumber: String(index + 1),
    },
  } as any)
}
              activeOpacity={0.85}
            >
              <View style={styles.stageNumber}>
                <Text style={styles.stageNumberText}>{index + 1}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.stageLabel}>Stage {index + 1}</Text>
                <Text style={styles.stageTitle}>{stage}</Text>
                <Text style={styles.stageMeta}>
                  {coverage?.lessonCount ?? 0} lessons · {coverage?.activeLessonCount ?? 0} active
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
                      );
          })
        )}

        <View style={styles.footerCard}>
          <Ionicons name="information-circle-outline" size={22} color="#7C3AED" />
          <Text style={styles.footerText}>
            Next upgrade: this page will show lesson counts for each stage and open a filtered lesson list automatically.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    fontSize: 29,
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
    marginBottom: 24,
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
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  secondaryButtonText: {
    marginLeft: 7,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 12,
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageNumber: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  stageNumberText: {
    color: '#6D28D9',
    fontWeight: '900',
  },
  stageLabel: {
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 11,
    marginBottom: 3,
  },
  stageTitle: {
    color: '#1E293B',
    fontWeight: '900',
    fontSize: 16,
  },
  stageMeta: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    color: '#2E1065',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
  footerCard: {
    marginTop: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footerText: {
    flex: 1,
    marginLeft: 10,
    color: '#6D28D9',
    fontWeight: '800',
    lineHeight: 19,
    fontSize: 13,
  },
});