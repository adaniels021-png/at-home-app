import { useChild } from '@/lib/SelectedChildContext';
import {
  getBestPottyWindows,
  getPottyCoachInsights,
  getWeeklyPottyStats,
  PottyInsight,
} from '@/lib/toiletTrainingStorage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ToiletTrainingInsightsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<PottyInsight[]>([]);
  const [bestWindows, setBestWindows] = useState<string[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    successes: 0,
    attempts: 0,
    accidents: 0,
    total: 0,
    successRate: 0,
  });

  useFocusEffect(
    useCallback(() => {
      void loadInsights();
    }, [selectedChild?.id])
  );

  async function loadInsights() {
    if (!selectedChild?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [coachInsights, windows, stats] = await Promise.all([
        getPottyCoachInsights(selectedChild.id),
        getBestPottyWindows(selectedChild.id),
        getWeeklyPottyStats(selectedChild.id),
      ]);

      setInsights(coachInsights);
      setBestWindows(windows);
      setWeeklyStats(stats);
    } catch (error) {
      console.error('Error loading potty insights:', error);
    } finally {
      setLoading(false);
    }
  }

  const hasLogs = weeklyStats.total > 0;
  const hasEnoughLogs = weeklyStats.total >= 3;

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Smart Insights</Text>
            <Text style={styles.subtitle}>Helpful patterns for potty practice.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.loadingText}>Looking for helpful patterns...</Text>
          </View>
        ) : (
          <>
            <View style={styles.parentCard}>
              <View style={styles.parentIcon}>
                <Ionicons name="heart-outline" size={26} color="#2563EB" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.parentTitle}>
                  {hasLogs ? 'Here’s what we’re noticing' : 'Start simple'}
                </Text>
                <Text style={styles.parentText}>
                  {hasLogs
                    ? 'These insights are meant to help you decide what to try next, not judge progress.'
                    : 'Log a few potty visits and ABA at Home will begin finding helpful timing and support patterns.'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>THIS WEEK</Text>
              <Text style={styles.summaryTitle}>
                {hasLogs ? `${weeklyStats.successRate}% Success Rate` : 'Ready to Learn Patterns'}
              </Text>
              <Text style={styles.summaryText}>
                {hasLogs
                  ? `${weeklyStats.successes} successes, ${weeklyStats.attempts} attempts, and ${weeklyStats.accidents} accidents logged this week.`
                  : 'No pressure. Once you log a few visits, this page will become more personalized.'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Good Times to Try</Text>

            <View style={styles.windowCard}>
              {bestWindows.map((window) => (
                <View key={window} style={styles.windowRow}>
                  <View style={styles.windowIcon}>
                    <Ionicons name="time-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.windowText}>{window}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Helpful Next Steps</Text>

            {insights.map((insight) => (
              <InsightCard key={`${insight.title}-${insight.type}`} insight={insight} />
            ))}

            {!hasEnoughLogs && (
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={22} color="#2563EB" />
                <Text style={styles.infoText}>
                  Smart Insights become more personalized after about 3 or more potty logs.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.coachButton}
              onPress={() => router.push('/toilet-training/problem-solver' as any)}
            >
              <Ionicons name="bulb-outline" size={20} color="#FFFFFF" />
              <Text style={styles.coachButtonText}>Open Potty Coach</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InsightCard({ insight }: { insight: PottyInsight }) {
  const icon =
    insight.type === 'timing'
      ? 'time-outline'
      : insight.type === 'communication'
      ? 'chatbubbles-outline'
      : insight.type === 'comfort'
      ? 'heart-outline'
      : insight.type === 'success'
      ? 'checkmark-circle-outline'
      : 'sparkles-outline';

  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={23} color="#2563EB" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightDescription}>{insight.message}</Text>
        </View>
      </View>

      <View style={styles.nextStepBox}>
        <Text style={styles.nextStepLabel}>Try this next</Text>
        <Text style={styles.nextStepText}>{insight.nextStep}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 20, paddingBottom: 44 },

  screenGlowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37,99,235,0.07)',
    top: -130,
    right: -90,
  },

  screenGlowBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168,85,247,0.05)',
    bottom: -140,
    left: -130,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '800',
  },

  parentCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  parentIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  parentTitle: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: '900',
  },

  parentText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22,
  },

  summaryLabel: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  summaryTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },

  summaryText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  windowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 22,
    gap: 12,
  },

  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  windowIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  windowText: {
    color: '#1E3A8A',
    fontSize: 15,
    fontWeight: '900',
  },

  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },

  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  insightTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },

  insightDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 19,
    fontWeight: '700',
  },

  nextStepBox: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  nextStepLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563EB',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  nextStepText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
    marginBottom: 14,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
    fontWeight: '700',
  },

  coachButton: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },

  coachButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});