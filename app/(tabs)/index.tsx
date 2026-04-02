import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { generateActivity } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

const MILESTONES = ["Eye Contact", "Following Point", "Functional Play", "Imitation", "Manding", "Matching", "Turn Taking"];

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadDashboard();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile(profileData);
        setSelectedGoals(profileData.selected_milestones || []);
        const aiResponse = await generateActivity(profileData.developmental_level, profileData.selected_milestones || []);
        setActivity(aiResponse);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const toggleTimer = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current);
      saveSession();
    } else {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const saveSession = async () => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) {
      Alert.alert("Session Ended", "Sessions under 1 minute aren't logged.");
      setSeconds(0);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sessions').insert({ 
      user_id: user?.id, 
      duration_minutes: mins,
      goals_practiced: selectedGoals // SAVING THE GOALS HERE
    });
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      Alert.alert("Success", "Logged " + mins + "m for: " + selectedGoals.join(', '));
      setSeconds(0);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Daily Pairing</Text>
        <Text style={styles.sectionTitle}>Current Focus</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestoneScroll}>
          {MILESTONES.map(goal => (
            <TouchableOpacity 
              key={goal} 
              style={[styles.chip, selectedGoals.includes(goal) && styles.chipActive]}
              onPress={() => setSelectedGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal])}
            >
              <Text style={[styles.chipText, selectedGoals.includes(goal) && styles.chipTextActive]}>{goal}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>{activity?.title || "Pick a goal!"}</Text>
          <Text style={styles.aiBody}>{activity?.instructions}</Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerDigits}>{Math.floor(seconds/60)}:{(seconds%60).toString().padStart(2,'0')}</Text>
          <TouchableOpacity style={[styles.btn, isTimerRunning ? styles.btnStop : styles.btnStart]} onPress={toggleTimer}>
            <Text style={styles.btnText}>{isTimerRunning ? "Finish & Save" : "Start Pairing"}</Text>
          </TouchableOpacity>
        </View>
        {showConfetti && <ConfettiCannon count={200} origin={{x: -10, y: 0}} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center' },
  greeting: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase' },
  milestoneScroll: { flexDirection: 'row', marginBottom: 25 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#8E8E93', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  aiCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20 },
  aiTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  aiBody: { fontSize: 16, lineHeight: 22 },
  timerCard: { backgroundColor: '#1C1C1E', padding: 30, borderRadius: 24, alignItems: 'center' },
  timerDigits: { color: '#fff', fontSize: 48, fontWeight: '300', marginBottom: 20 },
  btn: { padding: 18, borderRadius: 15, width: '100%', alignItems: 'center' },
  btnStart: { backgroundColor: '#007AFF' },
  btnStop: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
