import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activityCount, setActivityCount] = useState(0);

  useEffect(() => {
    if (selectedChild) {
      fetchProgressData();
    }
  }, [selectedChild]);

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      // 1. Get latest assessment scores
      const { data: assessData } = await supabase
        .from('assessments')
        .select('*')
        .eq('child_id', selectedChild?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 2. Get total completed activities
      const { count } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild?.id);

      setStats(assessData);
      setActivityCount(count || 0);
    } catch (e) {
      console.error("Error loading progress:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Developmental Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Child Header Card */}
        <View style={styles.summaryCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(selectedChild?.child_name || selectedChild?.name || '?').charAt(0)}
          </Text>
          </View>
          <Text style={styles.summaryTitle}>{selectedChild?.child_name}&apos;s Growth</Text>
          <View style={styles.badgeRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>{activityCount}</Text>
              <Text style={styles.countLabel}>Activities</Text>
            </View>
          </View>
        </View>

        {/* Detailed Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skill Mastery</Text>
          <Text style={styles.sectionDesc}>Based on your latest assessment and logged activities.</Text>
          
          <View style={styles.chartArea}>
            <ProgressBar label="Communication" score={stats?.communication_score} color="#3B82F6" icon="chatbubbles" />
            <ProgressBar label="Social Skills" score={stats?.social_score} color="#10B981" icon="people" />
            <ProgressBar label="Motor Skills" score={stats?.motor_score} color="#F59E0B" icon="fitness" />
            <ProgressBar label="Adaptive" score={stats?.adaptive_score} color="#8B5CF6" icon="construct" />
            <ProgressBar label="Behavior" score={stats?.behavior_score} color="#EF4444" icon="heart" />
          </View>
        </View>

        {/* Insights Card */}
        <View style={styles.insightCard}>
          <Ionicons name="sparkles" size={24} color="#2563EB" />
          <Text style={styles.insightText}>
            You&apos;re doing great! Focusing on <Text style={{fontWeight: '800'}}>Communication</Text> this week will help bridge the gap in social eye contact.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.reassessBtn}
          onPress={() => router.push('/onboarding/assessment')}
        >
          <Text style={styles.reassessBtnText}>Take New Assessment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressBar({ label, score = 0, color, icon }: any) {
  // Assuming max score per category is roughly 20 for the UI visualization
  const percentage = Math.min((score / 20) * 100, 100);
  
  return (
    <View style={styles.progressRow}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabelText}>{label}</Text>
          <Text style={styles.progressValueText}>{Math.round(percentage)}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 24 },
  summaryCard: { alignItems: 'center', marginBottom: 40 },
  avatarCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#F3F4F6', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#2563EB' },
  summaryTitle: { fontSize: 24, fontWeight: '900', color: '#111827' },
  badgeRow: { flexDirection: 'row', marginTop: 12 },
  countBadge: { 
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    alignItems: 'center' 
  },
  countNumber: { fontSize: 18, fontWeight: '800', color: '#111827' },
  countLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sectionDesc: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 24 },
  chartArea: { gap: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabelText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  progressValueText: { fontSize: 14, fontWeight: '800', color: '#111827' },
  track: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  insightCard: { 
    backgroundColor: '#EFF6FF', 
    padding: 20, 
    borderRadius: 20, 
    flexDirection: 'row', 
    gap: 16, 
    alignItems: 'center',
    marginBottom: 40
  },
  insightText: { flex: 1, fontSize: 14, color: '#1E40AF', lineHeight: 20 },
  reassessBtn: { 
    borderWidth: 2, 
    borderColor: '#E5E7EB', 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  reassessBtnText: { color: '#6B7280', fontWeight: '700', fontSize: 16 }
});
