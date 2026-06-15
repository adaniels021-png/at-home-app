import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '@/lib/SelectedChildContext';
import {
  getPottyEntriesForChild,
  getPottySuccessStreak,
  getWeeklyPottyStats,
  PottyEntry,
} from '@/lib/toiletTrainingStorage';

export default function ToiletTrainingProgressScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [entries, setEntries] = useState<PottyEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    successes: 0,
    attempts: 0,
    accidents: 0,
    total: 0,
    successRate: 0,
  });
  const [streak, setStreak] = useState(0);

  async function loadProgress() {
    if (!selectedChild?.id) return;

    const savedEntries = await getPottyEntriesForChild(selectedChild.id);
    const stats = await getWeeklyPottyStats(selectedChild.id);
    const currentStreak = await getPottySuccessStreak(selectedChild.id);

    setEntries(savedEntries);
    setWeeklyStats(stats);
    setStreak(currentStreak);
  }

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [selectedChild?.id])
  );

  const successWidth = Math.min(weeklyStats.successRate, 100);

  const accidentPercent = useMemo(() => {
    if (weeklyStats.total === 0) return 0;
    return Math.round((weeklyStats.accidents / weeklyStats.total) * 100);
  }, [weeklyStats]);

  const progressMessage = useMemo(() => {
    if (weeklyStats.total === 0) {
      return 'Start logging potty visits to see progress patterns.';
    }

    if (weeklyStats.successRate >= 70) {
      return 'Strong week. Keep using the same calm routine.';
    }

    if (weeklyStats.successRate >= 40) {
      return 'Progress is building. Predictable timing can help.';
    }

    return 'Early practice counts. Celebrate sitting, trying, and staying calm.';
  }, [weeklyStats]);

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowMiddle} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Potty Progress</Text>
            <Text style={styles.subtitle}>Track small wins without pressure.</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="trending-up-outline" size={30} color="#10B981" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>WEEKLY SUMMARY</Text>
            <Text style={styles.heroTitle}>
              {weeklyStats.total > 0 ? `${weeklyStats.successRate}% Success Rate` : 'Ready to Track'}
            </Text>
            <Text style={styles.heroText}>{progressMessage}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="checkmark-circle-outline"
            value={weeklyStats.successes}
            label="Successes"
            color="#059669"
            bg="#ECFDF5"
            border="#A7F3D0"
          />

          <StatCard
            icon="ellipse-outline"
            value={weeklyStats.attempts}
            label="Attempts"
            color="#D97706"
            bg="#FFFBEB"
            border="#FDE68A"
          />

          <StatCard
            icon="alert-circle-outline"
            value={weeklyStats.accidents}
            label="Accidents"
            color="#DC2626"
            bg="#FEF2F2"
            border="#FECACA"
          />

          <StatCard
            icon="flame-outline"
            value={streak}
            label="Day Streak"
            color="#7C3AED"
            bg="#FAF5FF"
            border="#E9D5FF"
          />
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.cardTitle}>Success Rate</Text>
              <Text style={styles.cardSubtitle}>Based on this week’s potty logs.</Text>
            </View>

            <Text style={styles.percentText}>{weeklyStats.successRate}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${successWidth}%` }]} />
          </View>

          <Text style={styles.progressNote}>{progressMessage}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parent Summary</Text>
          <Text style={styles.sectionSubtext}>Simple patterns you can use today.</Text>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow
            icon="checkmark-circle-outline"
            color="#059669"
            title="Successes this week"
            text={
              weeklyStats.successes > 0
                ? `${weeklyStats.successes} successful potty visit${weeklyStats.successes === 1 ? '' : 's'} logged.`
                : 'No successes logged yet this week.'
            }
          />

          <SummaryRow
            icon="alert-circle-outline"
            color="#DC2626"
            title="Accident pattern"
            text={
              weeklyStats.total > 0
                ? `${accidentPercent}% of this week’s logs were accidents.`
                : 'Accident patterns will appear after logging begins.'
            }
          />

          <SummaryRow
            icon="heart-outline"
            color="#7C3AED"
            title="What to focus on"
            text={
              weeklyStats.total > 0
                ? 'Keep language short, stay calm, and praise effort.'
                : 'Start with one calm potty sit and log what happened.'
            }
            last
          />
        </View>

        <TouchableOpacity
  style={styles.viewLogsButton}
  onPress={() => router.push('/toilet-training/logs')}
>
  <View style={styles.viewLogsIcon}>
    <Ionicons name="clipboard-outline" size={22} color="#2563EB" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.viewLogsTitle}>View Log History</Text>
    <Text style={styles.viewLogsText}>
      See all saved potty visits, notes, and dates.
    </Text>
  </View>

  <Ionicons name="chevron-forward" size={22} color="#2563EB" />
</TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
  bg,
  border,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon} size={23} color={color} />
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SummaryRow({
  icon,
  color,
  title,
  text,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  text: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },

  container: {
    padding: 20,
    paddingBottom: 48,
  },

  screenGlowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(99,102,241,0.08)',
    top: -130,
    right: -90,
  },

  screenGlowMiddle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(16,185,129,0.06)',
    top: 360,
    left: -140,
  },

  screenGlowBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168,85,247,0.05)',
    bottom: -140,
    right: -130,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

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

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ECFDF5',
    borderRadius: 30,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  heroGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(16,185,129,0.10)',
    right: -55,
    top: -60,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  heroEyebrow: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 3,
  },

  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#064E3B',
  },

  heroText: {
    fontSize: 13,
    color: '#115E59',
    marginTop: 5,
    lineHeight: 19,
    fontWeight: '800',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },

  statCard: {
    width: '48%',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 5,
  },

  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '900',
  },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },

  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 3,
  },

  percentText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
  },

  progressTrack: {
    height: 13,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 999,
  },

  progressNote: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    lineHeight: 19,
    fontWeight: '700',
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },

  sectionSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  summaryRowLast: {
    borderBottomWidth: 0,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  summaryText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '700',
  },

  viewLogsButton: {
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 16,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},

viewLogsIcon: {
  width: 50,
  height: 50,
  borderRadius: 18,
  backgroundColor: '#EFF6FF',
  alignItems: 'center',
  justifyContent: 'center',
},

viewLogsTitle: {
  fontSize: 16,
  fontWeight: '900',
  color: '#1E3A8A',
},

viewLogsText: {
  fontSize: 13,
  color: '#64748B',
  fontWeight: '700',
  lineHeight: 18,
  marginTop: 3,
},
});