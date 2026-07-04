import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CurriculumCoverage,
  StageCoverage,
  getCurriculumCoverage,
} from '../../lib/curriculumCoverage';

export default function CurriculumDashboardScreen() {
  const router = useRouter();

  const [coverage, setCoverage] = useState<CurriculumCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadCoverage() {
    try {
      const data = await getCurriculumCoverage();
      setCoverage(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadCoverage();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadCoverage();
  };

  const openStage = (stage: StageCoverage) => {
    router.push({
      pathname: '/admin/curriculum-stage',
      params: {
        category: stage.category,
        skill: stage.skill,
        stage: stage.stage,
        stageNumber: String(stage.stageNumber),
      },
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading curriculum coverage...</Text>
      </View>
    );
  }

  const missingStages = coverage?.missingStages ?? [];
  const lowCoverageStages = coverage?.lowCoverageStages ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED"
          />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#29145F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Curriculum Dashboard</Text>
            <Text style={styles.subtitle}>
              Track lesson coverage and curriculum gaps.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Overall Coverage</Text>
          <Text style={styles.heroPercent}>{coverage?.coveragePercent ?? 0}%</Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${coverage?.coveragePercent ?? 0}%` },
              ]}
            />
          </View>

          <Text style={styles.heroText}>
            {coverage?.coveredStages ?? 0} of {coverage?.totalStages ?? 0} stages covered ·{' '}
            {coverage?.totalLessons ?? 0} total lessons
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/admin/curriculum-builder' as any)}
            >
              <Ionicons name="map-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Open Builder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
  const nextGap = missingStages[0] || lowCoverageStages[0];

  if (nextGap) {
    router.push({
      pathname: '/admin/generate-lessons',
      params: {
        category: nextGap.category,
        skill: nextGap.skill,
        stage: nextGap.stage,
        stageNumber: String(nextGap.stageNumber),
      },
    } as any);
    return;
  }

  router.push('/admin/generate-lessons' as any);
}}
            >
              <Ionicons name="sparkles-outline" size={18} color="#7C3AED" />
              <Text style={styles.secondaryButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>

        {coverage?.categories.map((category) => (
          <TouchableOpacity
            key={category.category}
            style={styles.categoryCard}
            onPress={() => router.push('/admin/curriculum-builder' as any)}
          >
            <View style={styles.categoryTop}>
              <View>
                <Text style={styles.categoryTitle}>{category.category}</Text>
                <Text style={styles.categoryMeta}>
                  {category.totalLessons} lessons · {category.coveredStages}/{category.totalStages} stages
                </Text>
              </View>

              <Text style={styles.categoryPercent}>{category.coveragePercent}%</Text>
            </View>

            <View style={styles.smallProgressTrack}>
              <View
                style={[
                  styles.smallProgressFill,
                  { width: `${category.coveragePercent}%` },
                ]}
              />
            </View>
          </TouchableOpacity>
        ))}

        <CoverageSection
          title="Needs Attention"
          icon="alert-circle-outline"
          emptyText="No empty stages right now."
          stages={missingStages}
          onPressStage={openStage}
        />

        <CoverageSection
          title="Low Coverage"
          icon="warning-outline"
          emptyText="No low-coverage stages right now."
          stages={lowCoverageStages}
          onPressStage={openStage}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function CoverageSection({
  title,
  icon,
  emptyText,
  stages,
  onPressStage,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  emptyText: string;
  stages: StageCoverage[];
  onPressStage: (stage: StageCoverage) => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={22} color="#7C3AED" />
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
      </View>

      {stages.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        stages.slice(0, 8).map((stage) => (
          <TouchableOpacity
            key={`${stage.category}-${stage.skill}-${stage.stageNumber}`}
            style={styles.stageRow}
            onPress={() => onPressStage(stage)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.stageTitle}>{stage.stage}</Text>
              <Text style={styles.stageMeta}>
                {stage.category} · {stage.skill} · Stage {stage.stageNumber}
              </Text>
              <Text style={styles.stageCount}>
                {stage.lessonCount} lessons · {stage.activeLessonCount} active
              </Text>
            </View>

            <View style={styles.stageActions}>
  <TouchableOpacity
    style={styles.generateMiniButton}
    onPress={() => onPressStage(stage)}
  >
    <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
  </TouchableOpacity>

  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
</View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  content: { padding: 20, paddingBottom: 120 },
  centered: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '800',
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
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  heroEyebrow: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroPercent: {
    marginTop: 6,
    fontSize: 48,
    fontWeight: '900',
    color: '#2E1065',
  },
  heroText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '800',
    lineHeight: 20,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
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
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    color: '#1E1B4B',
    fontSize: 16,
    fontWeight: '900',
  },
  categoryMeta: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  categoryPercent: {
    color: '#7C3AED',
    fontSize: 18,
    fontWeight: '900',
  },
  smallProgressTrack: {
    height: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  smallProgressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    marginLeft: 8,
    color: '#2E1065',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: '#64748B',
    fontWeight: '800',
    lineHeight: 20,
  },
  stageRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageTitle: {
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '900',
  },
  stageMeta: {
    marginTop: 4,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
  },
  stageCount: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  stageActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

generateMiniButton: {
  width: 34,
  height: 34,
  borderRadius: 13,
  backgroundColor: '#EDE9FE',
  alignItems: 'center',
  justifyContent: 'center',
},
});