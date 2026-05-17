import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

type SkillEvent = {
  id: string;
  child_id: string;
  card_id: string | null;
  event_type: 'spontaneous' | 'prompted' | 'independent_phrase';
  prompt_level: 'verbal' | 'gesture' | 'model' | 'physical' | null;
  phrase_length: number | null;
  notes: string | null;
  created_at: string;
};

type DayPoint = {
  label: string;
  spontaneous: number;
  prompted: number;
  independentPhrase: number;
};

function getStartOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export default function SkillProgressTrackerScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as {
    selectedChild?: { id?: string; name?: string } | null;
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [events, setEvents] = useState<SkillEvent[]>([]);

  const loadSkillEvents = useCallback(async () => {
    if (!selectedChild?.id) {
      setEvents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);

      const { data, error } = await supabase
        .from('pecs_skill_events')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEvents((data as SkillEvent[]) || []);
    } catch (error) {
      console.error('Load skill events error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadSkillEvents();
    }, [loadSkillEvents])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (refreshing) {
        void loadSkillEvents();
      }
    }, [refreshing, loadSkillEvents])
  );

  const spontaneousCount = useMemo(
    () => events.filter((e) => e.event_type === 'spontaneous').length,
    [events]
  );

  const promptedCount = useMemo(
    () => events.filter((e) => e.event_type === 'prompted').length,
    [events]
  );

  const independentPhraseCount = useMemo(
    () => events.filter((e) => e.event_type === 'independent_phrase').length,
    [events]
  );

  const totalRequestTrials = useMemo(
    () => spontaneousCount + promptedCount,
    [spontaneousCount, promptedCount]
  );

  const independencePercent = useMemo(() => {
    if (totalRequestTrials === 0) return 0;
    return Math.round((spontaneousCount / totalRequestTrials) * 100);
  }, [spontaneousCount, totalRequestTrials]);

  const averagePhraseLength = useMemo(() => {
    const phraseEvents = events.filter(
      (e) => e.event_type === 'independent_phrase' && (e.phrase_length || 0) > 0
    );

    if (!phraseEvents.length) return 0;

    const total = phraseEvents.reduce((sum, item) => sum + (item.phrase_length || 0), 0);
    return Number((total / phraseEvents.length).toFixed(1));
  }, [events]);

  const promptBreakdown = useMemo(() => {
    return {
      verbal: events.filter((e) => e.event_type === 'prompted' && e.prompt_level === 'verbal').length,
      gesture: events.filter((e) => e.event_type === 'prompted' && e.prompt_level === 'gesture').length,
      model: events.filter((e) => e.event_type === 'prompted' && e.prompt_level === 'model').length,
      physical: events.filter((e) => e.event_type === 'prompted' && e.prompt_level === 'physical').length,
    };
  }, [events]);

  const weeklyTrend = useMemo(() => {
    const today = getStartOfDay(new Date());
    const buckets: DayPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);

      buckets.push({
        label: formatDayLabel(day),
        spontaneous: 0,
        prompted: 0,
        independentPhrase: 0,
      });
    }

    events.forEach((event) => {
      const eventDay = getStartOfDay(new Date(event.created_at));
      const diffDays = Math.floor(
        (today.getTime() - eventDay.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays >= 0 && diffDays <= 6) {
        const bucketIndex = 6 - diffDays;
        const bucket = buckets[bucketIndex];

        if (!bucket) return;

        if (event.event_type === 'spontaneous') bucket.spontaneous += 1;
        if (event.event_type === 'prompted') bucket.prompted += 1;
        if (event.event_type === 'independent_phrase') bucket.independentPhrase += 1;
      }
    });

    return buckets;
  }, [events]);

  const maxTrendValue = useMemo(() => {
    const values = weeklyTrend.flatMap((day) => [
      day.spontaneous,
      day.prompted,
      day.independentPhrase,
    ]);
    return Math.max(...values, 1);
  }, [weeklyTrend]);

  const recentNotes = useMemo(() => {
    return events
      .filter((e) => e.notes && e.notes.trim().length > 0)
      .slice(0, 5);
  }, [events]);

  if (!selectedChild?.id && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="stats-chart-outline" size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select a child profile first to view skill progress.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading skill progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Skill Progress Tracker</Text>
            <Text style={styles.headerSubtitle}>
              Track spontaneous requests, prompted requests, and independent phrases.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="school-outline" size={18} color="#4F46E5" />
          <Text style={styles.infoText}>
            This screen helps show communication growth over time for {selectedChild?.name || 'your child'}.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{spontaneousCount}</Text>
            <Text style={styles.statLabel}>Spontaneous requests</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{promptedCount}</Text>
            <Text style={styles.statLabel}>Prompted requests</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{independentPhraseCount}</Text>
            <Text style={styles.statLabel}>Independent phrases</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{independencePercent}%</Text>
            <Text style={styles.statLabel}>Independence rate</Text>
          </View>
        </View>

        <View style={styles.highlightCard}>
          <Text style={styles.highlightTitle}>Progress Snapshot</Text>
          <Text style={styles.highlightText}>
            {totalRequestTrials === 0
              ? 'No request data yet. Start using cards and marking prompted responses to see progress.'
              : `${selectedChild?.name || 'Your child'} responded independently ${independencePercent}% of the time across tracked request opportunities.`}
          </Text>
          <Text style={styles.highlightSubtext}>
            Average independent phrase length: {averagePhraseLength || 0} words
          </Text>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>7-Day Trend</Text>
          <Text style={styles.sectionSubtitle}>
            Daily counts for spontaneous requests, prompted requests, and independent phrases.
          </Text>

          <View style={styles.chartWrap}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.legendText}>Spontaneous</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
                <Text style={styles.legendText}>Prompted</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
                <Text style={styles.legendText}>Independent Phrase</Text>
              </View>
            </View>

            <View style={styles.chartRow}>
              {weeklyTrend.map((day) => (
                <View key={day.label} style={styles.chartDayColumn}>
                  <Text style={styles.chartTopText}>
                    {day.spontaneous + day.prompted + day.independentPhrase}
                  </Text>

                  <View style={styles.multiBarTrack}>
                    <View
                      style={[
                        styles.multiBar,
                        styles.spontaneousBar,
                        {
                          height: `${Math.max((day.spontaneous / maxTrendValue) * 100, day.spontaneous ? 10 : 4)}%`,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.multiBar,
                        styles.promptedBar,
                        {
                          height: `${Math.max((day.prompted / maxTrendValue) * 100, day.prompted ? 10 : 4)}%`,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.multiBar,
                        styles.phraseBar,
                        {
                          height: `${Math.max((day.independentPhrase / maxTrendValue) * 100, day.independentPhrase ? 10 : 4)}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.chartLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Prompt Breakdown</Text>
          <Text style={styles.sectionSubtitle}>
            Which prompt types are being used the most.
          </Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Verbal</Text>
            <View style={styles.breakdownPill}>
              <Text style={styles.breakdownPillText}>{promptBreakdown.verbal}</Text>
            </View>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Gesture</Text>
            <View style={styles.breakdownPill}>
              <Text style={styles.breakdownPillText}>{promptBreakdown.gesture}</Text>
            </View>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Model</Text>
            <View style={styles.breakdownPill}>
              <Text style={styles.breakdownPillText}>{promptBreakdown.model}</Text>
            </View>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Physical</Text>
            <View style={styles.breakdownPill}>
              <Text style={styles.breakdownPillText}>{promptBreakdown.physical}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Recent Phrase Notes</Text>
          <Text style={styles.sectionSubtitle}>
            Recent spoken phrases saved from the sentence strip.
          </Text>

          {recentNotes.length === 0 ? (
            <View style={styles.emptyMiniCard}>
              <Text style={styles.emptyMiniText}>No phrase notes yet.</Text>
            </View>
          ) : (
            recentNotes.map((event) => (
              <View key={event.id} style={styles.noteCard}>
                <Text style={styles.noteText}>{event.notes}</Text>
                <Text style={styles.noteMeta}>
                  {event.phrase_length || 0} words • {new Date(event.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={18} color="#D97706" />
            <Text style={styles.tipTitle}>Coaching tip</Text>
          </View>
          <Text style={styles.tipText}>
            A healthy trend is more spontaneous responding over time and fewer prompted responses.
            As phrase length grows, keep modeling short, meaningful expansions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
    paddingTop: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },

  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  infoText: {
    marginLeft: 8,
    color: '#3730A3',
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },

  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  highlightTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  highlightText: {
    color: '#475569',
    lineHeight: 21,
    fontSize: 14,
    marginBottom: 8,
  },
  highlightSubtext: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 13,
  },

  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 14,
    fontWeight: '600',
  },

  chartWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 6,
  },
  legendText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  chartDayColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  chartTopText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 8,
  },
  multiBarTrack: {
    height: 120,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4,
  },
  multiBar: {
    width: 10,
    borderRadius: 999,
    minHeight: 4,
  },
  spontaneousBar: {
    backgroundColor: '#16A34A',
  },
  promptedBar: {
    backgroundColor: '#EA580C',
  },
  phraseBar: {
    backgroundColor: '#4F46E5',
  },
  chartLabel: {
    marginTop: 10,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },

  breakdownRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 14,
  },
  breakdownPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  breakdownPillText: {
    color: '#3730A3',
    fontWeight: '800',
    fontSize: 12,
  },

  noteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  noteText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  noteMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  emptyMiniCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyMiniText: {
    color: '#94A3B8',
    fontWeight: '700',
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },

  tipCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginTop: 4,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#92400E',
  },
  tipText: {
    color: '#B45309',
    lineHeight: 20,
    fontSize: 14,
  },
});