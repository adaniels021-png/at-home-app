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

type UsageRow = {
  card_id: string;
  action_type: 'tap' | 'speak' | 'favorite' | 'add_to_board' | 'remove_from_board' | string;
  created_at: string;
};

type CardLookup = {
  id: string;
  title: string;
  helper_text?: string | null;
};

type InsightItem = {
  cardId: string;
  label: string;
  count: number;
};

type ActionItem = {
  action: string;
  count: number;
};

type DayItem = {
  dayLabel: string;
  count: number;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfNDaysAgo(days: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - days);
  return d;
}

function formatShortDay(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function niceActionLabel(action: string) {
  switch (action) {
    case 'tap':
      return 'Tapped';
    case 'speak':
      return 'Spoken';
    case 'favorite':
      return 'Favorited';
    case 'add_to_board':
      return 'Added to board';
    case 'remove_from_board':
      return 'Removed from board';
    default:
      return action.replace(/_/g, ' ');
  }
}

export default function CaregiverInsightsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as {
    selectedChild?: { id?: string; name?: string } | null;
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [topCards, setTopCards] = useState<InsightItem[]>([]);
  const [recentCards, setRecentCards] = useState<InsightItem[]>([]);
  const [topActions, setTopActions] = useState<ActionItem[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DayItem[]>([]);
  const [totals, setTotals] = useState({
    totalInteractions: 0,
    uniqueCards: 0,
    speechCount: 0,
    favoriteCount: 0,
  });

  const childName = useMemo(() => selectedChild?.name || 'your child', [selectedChild?.name]);

  const loadInsights = useCallback(async () => {
    if (!selectedChild?.id) {
      setTopCards([]);
      setRecentCards([]);
      setTopActions([]);
      setDailyTrend([]);
      setTotals({
        totalInteractions: 0,
        uniqueCards: 0,
        speechCount: 0,
        favoriteCount: 0,
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);

      const sevenDaysAgo = startOfNDaysAgo(6).toISOString();

      const [usageRes, builtInOrCustomRes, customCardsRes] = await Promise.all([
        supabase
          .from('pecs_card_usage')
          .select('card_id, action_type, created_at')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('pecs_cards')
          .select('id, title, helper_text')
          .eq('child_id', selectedChild.id),
        supabase
          .from('pecs_card_usage')
          .select('card_id, action_type, created_at')
          .eq('child_id', selectedChild.id)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
      ]);

      if (usageRes.error) throw usageRes.error;
      if (builtInOrCustomRes.error) throw builtInOrCustomRes.error;
      if (customCardsRes.error) throw customCardsRes.error;

      const usageRows = (usageRes.data || []) as UsageRow[];
      const recentRows = (customCardsRes.data || []) as UsageRow[];
      const customCards = (builtInOrCustomRes.data || []) as CardLookup[];

      const customLookup = new Map<string, string>();
      customCards.forEach((card) => {
        customLookup.set(`custom-${card.id}`, card.title);
      });

      const builtInLookup = new Map<string, string>([
        ['1', 'Help'],
        ['2', 'Potty'],
        ['3', 'Break'],
        ['4', 'All Done'],
        ['5', 'More'],
        ['6', 'Stop'],
        ['7', 'Eat'],
        ['8', 'Drink'],
        ['9', 'Snack'],
        ['10', 'Happy'],
        ['11', 'Sad'],
        ['12', 'Mad'],
        ['13', 'Scared'],
        ['14', 'Go'],
        ['15', 'Wait'],
        ['16', 'Play'],
        ['17', 'Sit'],
        ['18', 'Mom'],
        ['19', 'Dad'],
        ['20', 'Teacher'],
        ['21', 'Home'],
        ['22', 'Store'],
        ['23', 'Car'],
        ['24', 'Park'],
        ['25', 'Wake Up'],
        ['26', 'Brush Teeth'],
        ['27', 'Bath'],
        ['28', 'Bedtime'],
      ]);

      const labelForCard = (cardId: string) => {
        return customLookup.get(cardId) || builtInLookup.get(cardId) || cardId;
      };

      const overallCounts: Record<string, number> = {};
      const recentCounts: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      const uniqueCardsSet = new Set<string>();

      usageRows.forEach((row) => {
        overallCounts[row.card_id] = (overallCounts[row.card_id] || 0) + 1;
        actionCounts[row.action_type] = (actionCounts[row.action_type] || 0) + 1;
        uniqueCardsSet.add(row.card_id);
      });

      recentRows.forEach((row) => {
        recentCounts[row.card_id] = (recentCounts[row.card_id] || 0) + 1;
      });

      const sortedTopCards: InsightItem[] = Object.entries(overallCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([cardId, count]) => ({
          cardId,
          label: labelForCard(cardId),
          count,
        }));

      const sortedRecentCards: InsightItem[] = Object.entries(recentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([cardId, count]) => ({
          cardId,
          label: labelForCard(cardId),
          count,
        }));

      const sortedActions: ActionItem[] = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([action, count]) => ({
          action,
          count,
        }));

      const trendMap: Record<string, number> = {};
      const dayBuckets: DayItem[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = startOfNDaysAgo(i);
        const key = d.toISOString().slice(0, 10);
        trendMap[key] = 0;
        dayBuckets.push({
          dayLabel: formatShortDay(d),
          count: 0,
        });
      }

      recentRows.forEach((row) => {
        const key = new Date(row.created_at).toISOString().slice(0, 10);
        if (key in trendMap) trendMap[key] += 1;
      });

      const orderedKeys = Object.keys(trendMap).sort();
      const trendWithCounts = orderedKeys.map((key, index) => ({
        dayLabel: dayBuckets[index]?.dayLabel || key,
        count: trendMap[key],
      }));

      setTopCards(sortedTopCards);
      setRecentCards(sortedRecentCards);
      setTopActions(sortedActions);
      setDailyTrend(trendWithCounts);
      setTotals({
        totalInteractions: usageRows.length,
        uniqueCards: uniqueCardsSet.size,
        speechCount: actionCounts.speak || 0,
        favoriteCount: actionCounts.favorite || 0,
      });
    } catch (error) {
      console.error('Insights error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadInsights();
    }, [loadInsights])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (refreshing) {
        void loadInsights();
      }
    }, [refreshing, loadInsights])
  );

  const maxTrendCount = useMemo(() => {
    return Math.max(...dailyTrend.map((d) => d.count), 1);
  }, [dailyTrend]);

  if (!selectedChild?.id && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="analytics-outline" size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select a child profile first to view caregiver insights.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading caregiver insights...</Text>
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
            <Text style={styles.headerTitle}>Caregiver Insights</Text>
            <Text style={styles.headerSubtitle}>
              See how {childName} is using communication cards across the app.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="bulb-outline" size={18} color="#4F46E5" />
          <Text style={styles.infoText}>
            These insights are based on taps, speech playback, favorites, and board activity.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.totalInteractions}</Text>
            <Text style={styles.statLabel}>Total interactions</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.uniqueCards}</Text>
            <Text style={styles.statLabel}>Unique cards used</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.speechCount}</Text>
            <Text style={styles.statLabel}>Speech plays</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.favoriteCount}</Text>
            <Text style={styles.statLabel}>Favorite taps</Text>
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>7-Day Activity</Text>
          <Text style={styles.sectionSubtitle}>
            A quick look at daily communication activity over the past week.
          </Text>

          <View style={styles.chartCard}>
            <View style={styles.chartBarsRow}>
              {dailyTrend.map((item) => {
                const heightPercent = Math.max((item.count / maxTrendCount) * 100, item.count > 0 ? 10 : 4);

                return (
                  <View key={item.dayLabel} style={styles.chartColumn}>
                    <Text style={styles.chartValue}>{item.count}</Text>
                    <View style={styles.chartTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: `${heightPercent}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartLabel}>{item.dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Most Used Cards</Text>
          <Text style={styles.sectionSubtitle}>
            These are the cards used the most overall.
          </Text>

          {topCards.length === 0 ? (
            <View style={styles.emptyMiniCard}>
              <Text style={styles.emptyMiniText}>No card activity yet.</Text>
            </View>
          ) : (
            topCards.map((item, index) => (
              <View key={`${item.cardId}-${index}`} style={styles.listRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <View style={styles.listTextWrap}>
                  <Text style={styles.listTitle}>{item.label}</Text>
                  <Text style={styles.listSubtitle}>{item.count} total uses</Text>
                </View>

                <Ionicons name="trending-up-outline" size={18} color="#4F46E5" />
              </View>
            ))
          )}
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Top Cards This Week</Text>
          <Text style={styles.sectionSubtitle}>
            These are the most active cards from the last 7 days.
          </Text>

          {recentCards.length === 0 ? (
            <View style={styles.emptyMiniCard}>
              <Text style={styles.emptyMiniText}>No recent activity yet.</Text>
            </View>
          ) : (
            recentCards.map((item, index) => (
              <View key={`${item.cardId}-recent-${index}`} style={styles.listRow}>
                <View style={[styles.rankBadge, styles.rankBadgeRecent]}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <View style={styles.listTextWrap}>
                  <Text style={styles.listTitle}>{item.label}</Text>
                  <Text style={styles.listSubtitle}>{item.count} uses this week</Text>
                </View>

                <Ionicons name="time-outline" size={18} color="#0EA5E9" />
              </View>
            ))
          )}
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Interaction Types</Text>
          <Text style={styles.sectionSubtitle}>
            See which types of activity happen the most.
          </Text>

          {topActions.length === 0 ? (
            <View style={styles.emptyMiniCard}>
              <Text style={styles.emptyMiniText}>No interactions recorded yet.</Text>
            </View>
          ) : (
            topActions.map((item, index) => (
              <View key={`${item.action}-${index}`} style={styles.actionRow}>
                <Text style={styles.actionLabel}>{niceActionLabel(item.action)}</Text>
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>{item.count}</Text>
                </View>
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
            If the same few cards are used often, try modeling a short phrase expansion with them.
            For example, turn “Drink” into “I want drink” or “Need help” into “I need help.”
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 18,
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
    lineHeight: 18,
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

  chartCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 170,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  chartValue: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 8,
  },
  chartTrack: {
    width: '100%',
    height: 110,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: 22,
    borderRadius: 999,
    backgroundColor: '#4F46E5',
    minHeight: 4,
  },
  chartLabel: {
    marginTop: 10,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },

  listRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankBadgeRecent: {
    backgroundColor: '#ECFEFF',
  },
  rankText: {
    color: '#3730A3',
    fontWeight: '800',
    fontSize: 13,
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 2,
  },
  listSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  actionRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLabel: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 14,
  },
  actionPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionPillText: {
    color: '#3730A3',
    fontWeight: '800',
    fontSize: 12,
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