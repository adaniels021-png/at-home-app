import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [goalStats, setGoalStats] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const { data: sessions } = await supabase.from('sessions').select('goals_practiced');
      if (sessions) {
        const counts: any = {};
        sessions.forEach(s => {
          s.goals_practiced?.forEach((goal: string) => {
            counts[goal] = (counts[goal] || 0) + 1;
          });
        });
        const formatted = Object.keys(counts)
          .map(key => ({ name: key, count: counts[key] }))
          .sort((a, b) => b.count - a.count);
        setGoalStats(formatted);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Goal History</Text>
        <Text style={styles.subtitle}>Practice frequency per skill</Text>
        {goalStats.map((item) => (
          <View key={item.name} style={styles.statRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.goalName}>{item.name}</Text>
              <Text style={styles.goalCount}>{item.count} sessions</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min((item.count / 10) * 100, 100)}%` }]} />
            </View>
          </View>
        ))}
        {goalStats.length === 0 && (
          <Text style={styles.empty}>No sessions logged this week.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 25 },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 30 },
  statRow: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalName: { fontSize: 17, fontWeight: '600' },
  goalCount: { fontSize: 14, color: '#8E8E93' },
  progressBarBg: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5 },
  progressBarFill: { height: 10, backgroundColor: '#007AFF', borderRadius: 5 },
  empty: { textAlign: 'center', marginTop: 40, color: '#8E8E93' }
});
