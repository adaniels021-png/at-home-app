import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SKILL_LIBRARY } from '../constants/Skills';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function LoggerScreen() {
  const router = useRouter();
  const { skill: skillLabel = "General Skill" } = useLocalSearchParams();
  
  // Find the skill in our library
  const skillData = SKILL_LIBRARY.find(s => s.label === skillLabel);
  
  const [target, setTarget] = useState(skillData?.targets[0] || "General Practice");
  const [independent, setIndependent] = useState(0);
  const [prompted, setPrompted] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const safeBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)');

  const handleSave = async () => {
    if (independent + prompted === 0) return Alert.alert("Empty", "Log at least one trial.");
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase.from('sessions').insert([{
        user_id: user.id,
        skill_name: skillLabel,
        target_name: target, // New field for specific target
        independent_count: independent,
        prompted_count: prompted,
        notes: notes.trim(),
      }]);

      if (error) throw error;
      if (independent > prompted) {
        setShowConfetti(true);
        setTimeout(() => safeBack(), 2000);
      } else {
        safeBack();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 25 }}>
          <Text style={styles.title}>{skillLabel}</Text>
          
          {/* Target Selector */}
          <Text style={styles.label}>Specific Target</Text>
          <View style={styles.targetContainer}>
            {skillData?.targets.map(t => (
              <TouchableOpacity 
                key={t} 
                style={[styles.targetBtn, target === t && styles.targetBtnActive]} 
                onPress={() => setTarget(t)}
              >
                <Text style={[styles.targetBtnText, target === t && styles.targetBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.counterRow}>
            <Counter val={independent} set={setIndependent} label="Independent" color="#34C759" />
            <Counter val={prompted} set={setPrompted} label="Prompted" color="#FF9500" />
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput style={styles.input} multiline value={notes} onChangeText={setNotes} placeholder="How did it go?" />

          <TouchableOpacity style={styles.save} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Complete Session</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={safeBack}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      {showConfetti && <ConfettiCannon count={150} origin={{ x: -10, y: 0 }} />}
    </SafeAreaView>
  );
}

const Counter = ({ val, set, label, color }: any) => (
  <View style={{ width: '47%', alignItems: 'center' }}>
    <Text style={{ fontSize: 44, fontWeight: '800', marginBottom: 5 }}>{val}</Text>
    <TouchableOpacity 
      style={{ backgroundColor: color, padding: 18, borderRadius: 16, width: '100%', alignItems: 'center' }} 
      onPress={() => set((p: number) => p + 1)}
    >
      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  label: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginBottom: 10, textTransform: 'uppercase' },
  targetContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 25 },
  targetBtn: { backgroundColor: '#F2F2F7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  targetBtnActive: { backgroundColor: '#007AFF' },
  targetBtnText: { color: '#1C1C1E', fontSize: 13, fontWeight: '500' },
  targetBtnTextActive: { color: '#FFF' },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  input: { backgroundColor: '#F2F2F7', borderRadius: 12, padding: 15, minHeight: 80, marginBottom: 30 },
  save: { backgroundColor: '#007AFF', padding: 20, borderRadius: 16, alignItems: 'center' },
  saveText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cancel: { textAlign: 'center', marginTop: 20, color: '#8E8E93' }
});
