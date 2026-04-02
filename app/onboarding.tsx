import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const MILESTONES = [
  { id: '1', label: "Points to show interest/objects" },
  { id: '2', label: "Follows simple 1-step directions" },
  { id: '3', label: "Uses 5+ words consistently" },
  { id: '4', label: "Imitates simple physical actions" },
  { id: '5', label: "Responds to own name when called" },
  { id: '6', label: "Makes eye contact during play" }
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);
  const router = useRouter();

  const toggleMilestone = (id: string) => {
    setSelectedMilestones(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (!name || !age) {
      Alert.alert("Missing Information", "Please enter your child's name and age.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Fallback: try to sign in anonymously if session is missing
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        var userId = signInData.user?.id;
      } else {
        var userId = session.user.id;
      }

      // Logic: Calculate developmental level
      const count = selectedMilestones.length;
      let level = 'Early Learner';
      if (count >= 3) level = 'Emerging Learner';
      if (count >= 5) level = 'Advanced Learner';

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          child_name: name,
          child_age_months: parseInt(age),
          developmental_level: level,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // Success: Go to the main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      Alert.alert("Setup Error", err.message || "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {step === 1 ? (
            <View style={styles.stepContainer}>
              <View style={styles.headerIcon}>
                <Ionicons name="sparkles" size={40} color="#007AFF" />
              </View>
              <Text style={styles.title}>Welcome to{"\n"}ABA at Home</Text>
              <Text style={styles.sub}>Let's personalize your experience based on your child's current stage.</Text>
              
              <Text style={styles.label}>Child's Name</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="Name" 
                placeholderTextColor="#A9A9AC"
              />
              
              <Text style={styles.label}>Age (in months)</Text>
              <TextInput 
                style={styles.input} 
                value={age} 
                onChangeText={setAge} 
                placeholder="e.g., 24" 
                keyboardType="numeric"
                placeholderTextColor="#A9A9AC"
              />
              
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
                <Text style={styles.btnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stepContainer}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Developmental Milestones</Text>
              <Text style={styles.sub}>Which of these skills does {name || 'your child'} show consistently?</Text>
              
              <View style={styles.milestoneList}>
                {MILESTONES.map((m) => {
                  const isSelected = selectedMilestones.includes(m.id);
                  return (
                    <TouchableOpacity 
                      key={m.id} 
                      style={[styles.milestoneCard, isSelected && styles.milestoneSelected]} 
                      onPress={() => toggleMilestone(m.id)}
                    >
                      <Ionicons 
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                        size={24} 
                        color={isSelected ? "#007AFF" : "#C7C7CC"} 
                      />
                      <Text style={[styles.milestoneText, isSelected && styles.textSelected]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity 
                style={[styles.primaryBtn, { marginTop: 20 }]} 
                onPress={handleFinish}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.btnText}>Complete Profile</Text>
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  stepContainer: { padding: 24, flex: 1, justifyContent: 'center' },
  headerIcon: { marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', color: '#1C1C1E', lineHeight: 40, marginBottom: 12 },
  sub: { fontSize: 17, color: '#636366', lineHeight: 24, marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#F2F2F7', padding: 18, borderRadius: 14, fontSize: 17, marginBottom: 20, color: '#000' },
  primaryBtn: { backgroundColor: '#007AFF', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 4 },
  backText: { fontSize: 17, color: '#007AFF' },
  milestoneList: { gap: 12, marginBottom: 20 },
  milestoneCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F2F2F7', borderRadius: 14, gap: 12, borderWeight: 2, borderColor: 'transparent' },
  milestoneSelected: { backgroundColor: '#E1EFFF', borderWidth: 1, borderColor: '#007AFF' },
  milestoneText: { fontSize: 16, color: '#3A3A3C', flex: 1 },
  textSelected: { color: '#007AFF', fontWeight: '600' }
});
