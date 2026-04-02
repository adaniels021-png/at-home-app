import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { SKILL_LIBRARY, SKILL_CATEGORIES } from '../../constants/Skills';
import { Ionicons } from '@expo/vector-icons';

export default function SkillsDashboard() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('sessions')
      .select('skill_name, independent_count, prompted_count')
      .eq('user_id', user.id);

    const categoryTotals: any = {};
    SKILL_CATEGORIES.forEach(cat => categoryTotals[cat] = { ind: 0, total: 0 });

    data?.forEach(session => {
      const skill = SKILL_LIBRARY.find(s => s.label === session.skill_name);
      if (skill) {
        const totalTrials = session.independent_count + session.prompted_count;
        categoryTotals[skill.category].ind += session.independent_count;
        categoryTotals[skill.category].total += totalTrials;
      }
    });

    setStats(categoryTotals);
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <ActivityIndicator style={{flex:1}} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.header}>Skill Mastery</Text>
        
        {SKILL_CATEGORIES.map(cat => {
          const row = stats[cat];
          const pct = row.total > 0 ? Math.round((row.ind / row.total) * 100) : 0;
          
          return (
            <View key={cat} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.catLabel}>{cat}</Text>
                <Text style={styles.pctText}>{pct}%</Text>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: pct > 80 ? '#34C759' : '#5856D6' }]} />
              </View>
              
              <Text style={styles.detailText}>{row.total} total trials logged</Text>
            </View>
          );
        })}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
          <Text style={styles.infoText}>
            Mastery is reached at 80% independent success across 3 consecutive days.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { fontSize: 34, fontWeight: 'bold', marginBottom: 25 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catLabel: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  pctText: { fontSize: 20, fontWeight: '800', color: '#5856D6' },
  barBg: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5, marginBottom: 10, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  detailText: { fontSize: 12, color: '#8E8E93' },
  infoBox: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  infoText: { marginLeft: 10, fontSize: 13, color: '#8E8E93', lineHeight: 18, flex: 1 }
});
