import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

const GOALS = [
  'Improve communication',
  'Reduce meltdowns',
  'Build daily routines',
  'Help with transitions',
  'Increase independence',
  'Support school readiness',
  'Improve social skills',
  'Create calmer home days',
];

export default function ParentGoalsScreen() {
  const router = useRouter();
  const { selectedChild, refreshChildren } = useChild() as any;

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const childName =
    selectedChild?.child_name || selectedChild?.name || 'your child';

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((item) => item !== goal)
        : [...prev, goal]
    );
  };

  const handleContinue = async () => {
    if (selectedGoals.length === 0) {
      Alert.alert('Choose a Goal', 'Please choose at least one parent goal.');
      return;
    }

    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child profile first.');
      return;
    }

    setSaving(true);

    try {
      const completedAt = new Date().toISOString();

      const { error } = await supabase
  .from('children')
  .update({
    parent_goals: selectedGoals,
    parent_goal_notes: notes.trim() || null,
    onboarding_parent_goals_completed_at: completedAt,
    personalization_status: 'completed',
    updated_at: completedAt,
  })
  .eq('id', selectedChild.id);

      if (error) throw error;

      if (typeof refreshChildren === 'function') {
        await refreshChildren();
      }

      router.replace('/onboarding/personalized-plan' as any);
    } catch (error: any) {
      console.error('Parent goals save error:', error);

      Alert.alert(
        'Could Not Save Goals',
        error?.message || 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 3 OF 4</Text>
        </View>

        <Text style={styles.title}>What are your goals?</Text>

        <Text style={styles.subtitle}>
          Choose what matters most right now. ABA at Home will use this to make
          support feel more helpful for {childName}.
        </Text>

        <View style={styles.card}>
          {GOALS.map((goal) => {
            const active = selectedGoals.includes(goal);

            return (
              <TouchableOpacity
                key={goal}
                activeOpacity={0.9}
                style={[styles.goalButton, active && styles.goalButtonActive]}
                onPress={() => toggleGoal(goal)}
              >
                <Text style={[styles.goalText, active && styles.goalTextActive]}>
                  {goal}
                </Text>

                <Ionicons
                  name={active ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={active ? '#4F46E5' : '#94A3B8'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Anything else we should know?</Text>

          <TextInput
            style={styles.notesInput}
            placeholder="Example: Transitions are hardest after school..."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.continueButton, saving && styles.disabledButton]}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueText}>Build My Starting Plan</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          You can update goals later as your child grows and needs change.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 22,
    paddingBottom: 44,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  stepBadgeText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  goalButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  goalButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },

  goalText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
    paddingRight: 10,
  },

  goalTextActive: {
    color: '#3730A3',
  },

  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  notesLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },

  notesInput: {
    minHeight: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 21,
  },

  continueButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.7,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginRight: 8,
  },

  footerText: {
    marginTop: 14,
    color: '#64748B',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});