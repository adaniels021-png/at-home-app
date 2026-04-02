import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const DAYS = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  title: `Day ${i + 1}`,
  topic: i === 0 ? "Establishing Pairing" : i === 1 ? "Following Simple Commands" : "Building Communication",
  description: i === 0 ? "Spend 15 minutes playing with no demands. Just follow their lead!" : "Practice 'Sit' or 'Touch' with high-value rewards."
}));

export default function CurriculumScreen() {
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  async function fetchProgress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('current_day').eq('id', user.id).single();
      if (data?.current_day) setCurrentDay(data.current_day);
    }
    setLoading(false);
  }

  const completeDay = async (day: number) => {
    if (day !== currentDay) return;
    const nextDay = currentDay + 1;
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('profiles')
      .update({ current_day: nextDay })
      .eq('id', user?.id);

    if (!error) setCurrentDay(nextDay);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>30-Day Journey</Text>
        <Text style={styles.sub}>Master the basics of ABA at home, one day at a time.</Text>

        {DAYS.map((item) => {
          const isCompleted = item.day < currentDay;
          const isCurrent = item.day === currentDay;
          const isLocked = item.day > currentDay;

          return (
            <View key={item.day} style={styles.dayRow}>
              <View style={styles.timeline}>
                <View style={[styles.dot, isCompleted && styles.dotCompleted, isCurrent && styles.dotCurrent]} />
                {item.day !== 30 && <View style={styles.line} />}
              </View>

              <TouchableOpacity 
                style={[styles.card, isLocked && styles.cardLocked, isCurrent && styles.cardCurrent]}
                disabled={isLocked}
                onPress={() => completeDay(item.day)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.dayText, isLocked && styles.textLocked]}>Day {item.day}</Text>
                  {isCompleted && <Ionicons name="checkmark-circle" size={20} color="#34C759" />}
                  {isLocked && <Ionicons name="lock-closed" size={18} color="#AEAEB2" />}
                </View>
                <Text style={[styles.topicText, isLocked && styles.textLocked]}>{item.topic}</Text>
                
                {isCurrent && (
                  <View style={styles.activeContent}>
                    <Text style={styles.descText}>{item.description}</Text>
                    <View style={styles.completeBtn}>
                      <Text style={styles.completeBtnText}>Mark as Done</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center' },
  scroll: { padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' },
  sub: { fontSize: 16, color: '#636366', marginBottom: 30, marginTop: 4 },
  dayRow: { flexDirection: 'row', minHeight: 100 },
  timeline: { alignItems: 'center', marginRight: 15, width: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#C7C7CC', marginTop: 8 },
  dotCompleted: { backgroundColor: '#34C759' },
  dotCurrent: { backgroundColor: '#007AFF', borderWidth: 3, borderColor: '#E1EFFF' },
  line: { width: 2, flex: 1, backgroundColor: '#E5E5EA', marginVertical: 4 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardCurrent: { borderColor: '#007AFF', borderWidth: 1, backgroundColor: '#F0F7FF' },
  cardLocked: { backgroundColor: '#F2F2F7', shadowOpacity: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dayText: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  topicText: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  textLocked: { color: '#AEAEB2' },
  activeContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E1EFFF', paddingTop: 12 },
  descText: { fontSize: 15, color: '#3A3A3C', lineHeight: 22, marginBottom: 15 },
  completeBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 10, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold' }
});
