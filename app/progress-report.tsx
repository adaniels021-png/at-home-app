import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useChild } from '../lib/SelectedChildContext';
import { supabase } from '../lib/supabase';

interface SkillGrowth {
  category: string;
  previous: number;
  current: number;
}

export default function ProgressReport() {
  const { selectedChild } = useChild();
  const router = useRouter();
  const [report, setReport] = useState<SkillGrowth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComparison() {
      if (!selectedChild?.id) return;

      // 1. Get the last two assessment IDs to compare growth
      const { data: assessments, error: aError } = await supabase
        .from('assessments')
        .select('id')
        .eq('child_id', selectedChild.id)
        .order('assessment_date', { ascending: false })
        .limit(2);

      if (assessments && assessments.length >= 2) {
        const currentId = assessments[0].id;
        const previousId = assessments[1].id;

        // 2. Fetch scores for both assessment periods
        const { data: scores } = await supabase
          .from('child_assessment_scores')
          .select('skill_category, score, assessment_id')
          .in('assessment_id', [currentId, previousId]);

        if (scores) {
          const categories = ['Manding', 'Joint Attention', 'Vocal Imitation', 'Fine Motor', 'Social Skills'];
          const comparison = categories.map(cat => ({
            category: cat,
            current: scores.find(s => s.skill_category === cat && s.assessment_id === currentId)?.score || 0,
            previous: scores.find(s => s.skill_category === cat && s.assessment_id === previousId)?.score || 0
          }));
          setReport(comparison);
        }
      }
      setLoading(false);
    }
    fetchComparison();
  }, [selectedChild]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Report</Text>
        <TouchableOpacity onPress={() => Alert.alert("Export", "PDF Export coming soon!")}>
          <Ionicons name="share-outline" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.welcomeText}>Growth for {selectedChild?.child_name}</Text>
        <Text style={styles.subText}>Comparing your last two 30-day assessments.</Text>

        {report.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Complete at least two assessments to see growth data.</Text>
          </View>
        ) : (
          report.map((item) => {
            const improved = item.current > item.previous;
            return (
              <View key={item.category} style={styles.skillRow}>
                <View style={styles.rowHeader}>
                  <Text style={styles.categoryName}>{item.category}</Text>
                  {improved && (
                    <View style={styles.growthBadge}>
                      <Text style={styles.growthText}>+{item.current - item.previous} pts</Text>
                    </View>
                  )}
                </View>

                <View style={styles.chartContainer}>
                  {/* Previous Month Bar */}
                  <View style={styles.barWrapper}>
                    <Text style={styles.barLabel}>Previous</Text>
                    <View style={styles.barBackground}>
                      <View style={[styles.bar, styles.prevBar, { width: `${(item.previous / 5) * 100}%` }]} />
                    </View>
                    <Text style={styles.scoreText}>{item.previous}/5</Text>
                  </View>

                  {/* Current Month Bar */}
                  <View style={styles.barWrapper}>
                    <Text style={styles.barLabel}>Current</Text>
                    <View style={styles.barBackground}>
                      <View style={[styles.bar, styles.currBar, { width: `${(item.current / 5) * 100}%` }]} />
                    </View>
                    <Text style={styles.scoreText}>{item.current}/5</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {report.length > 0 && (
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="sparkles" size={20} color="#2563EB" />
              <Text style={styles.insightTitle}>Coach Insights</Text>
            </View>
            <Text style={styles.insightBody}>
              {selectedChild?.child_name} is showing consistent growth in {report.sort((a,b) => b.current - a.current)[0]?.category}. 
              Keep reinforcing these wins with high-frequency praise!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 60 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  content: { padding: 24 },
  welcomeText: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subText: { fontSize: 16, color: '#6B7280', marginTop: 4, marginBottom: 32 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 16, fontSize: 16, paddingHorizontal: 40 },
  skillRow: { marginBottom: 30 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryName: { fontSize: 17, fontWeight: '700', color: '#374151', flex: 1 },
  growthBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  growthText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  chartContainer: { gap: 10 },
  barWrapper: { flexDirection: 'row', alignItems: 'center' },
  barLabel: { fontSize: 11, color: '#9CA3AF', width: 55, fontWeight: '600', textTransform: 'uppercase' },
  barBackground: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginHorizontal: 10 },
  bar: { height: '100%', borderRadius: 5 },
  prevBar: { backgroundColor: '#D1D5DB' },
  currBar: { backgroundColor: '#2563EB' },
  scoreText: { fontSize: 13, fontWeight: '700', color: '#111827', width: 30 },
  insightCard: { backgroundColor: '#F0F7FF', padding: 24, borderRadius: 28, marginTop: 10 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  insightTitle: { fontSize: 16, fontWeight: '800', color: '#1E40AF', marginLeft: 8 },
  insightBody: { color: '#1E40AF', lineHeight: 22, fontSize: 15, opacity: 0.9 }
});