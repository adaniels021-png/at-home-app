import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useChild } from '../lib/SelectedChildContext';
import { supabase } from '../lib/supabase';

type LessonRow = {
  id: string;
  category?: string | null;
  status?: string | null;
  performance?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
};

export default function WeeklyProgressInsights() {
  const { selectedChild } = useChild();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      if (!selectedChild?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('lesson_logs')
        .select(
        'id, category, status, performance, completed_at, created_at'
        )
        .eq('child_id', selectedChild.id)
        .gte('completed_at', sevenDaysAgo.toISOString())
.order('completed_at', { ascending: false });

      if (error) {
        console.log('Weekly insights error:', error);
        setLessons([]);
      } else {
        setLessons(data || []);
      }

      setLoading(false);
    };

    void loadInsights();
  }, [selectedChild?.id]);

  const insight = useMemo(() => {
    const completed = lessons.filter(
  (lesson) => lesson.status === 'success' || lesson.status === 'completed'
);
    const totalCompleted = completed.length;

    const averageScore =
  completed.length > 0
    ? Math.round(
        (completed.filter((l) => l.performance === 'easy').length * 100 +
          completed.filter((l) => l.performance === 'just_right').length * 75 +
          completed.filter((l) => l.performance === 'challenging').length * 40) /
          completed.length
      )
    : 0;

    const strongCategory = getMostCommon(
      completed.map((lesson) => lesson.category).filter(Boolean) as string[]
    );

    const mostPrompted = getMostCommon(
  completed.map((lesson) => lesson.performance).filter(Boolean) as string[]
);

    let message = 'Complete a lesson to start building weekly insights.';

    if (totalCompleted > 0) {
      if (averageScore >= 80) {
        message = 'Strong week so far. Your child is showing solid lesson progress.';
      } else if (averageScore >= 55) {
        message = 'Good progress. A little extra practice may help build consistency.';
      } else {
        message = 'This week may need lighter goals, shorter practice, or more support.';
      }
    }

    return {
      totalCompleted,
      averageScore,
      strongCategory: strongCategory || 'Not enough data',
      mostPrompted: mostPrompted || 'Not enough data',
      message,
    };
  }, [lessons]);

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.glow} />

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="analytics-outline" size={22} color="#4F46E5" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Weekly Progress Insights</Text>
          <Text style={styles.subtitle}>
            A simple look at the last 7 days of lessons.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#4F46E5" />
          <Text style={styles.loadingText}>Checking progress...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatBox label="Completed" value={String(insight.totalCompleted)} />
            <StatBox
              label="Avg. Score"
              value={insight.totalCompleted > 0 ? `${insight.averageScore}%` : '--'}
            />
          </View>

          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Strongest Area</Text>
            <Text style={styles.detailValue}>{insight.strongCategory}</Text>
          </View>

          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Prompting Pattern</Text>
            <Text style={styles.detailValue}>{formatLabel(insight.mostPrompted)}</Text>
          </View>

          <View style={styles.messageBox}>
            <Ionicons name="bulb-outline" size={18} color="#7C3AED" />
            <Text style={styles.messageText}>{insight.message}</Text>
          </View>
        </>
      )}
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getMostCommon(items: string[]) {
  if (items.length === 0) return null;

  const counts: Record<string, number> = {};

  items.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function formatLabel(value: string) {
  if (!value || value === 'Not enough data') return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DCE3EE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  glow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(79,70,229,0.07)',
    top: -85,
    right: -60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  messageBox: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 14,
  },
  messageText: {
    flex: 1,
    marginLeft: 8,
    color: '#5B21B6',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});