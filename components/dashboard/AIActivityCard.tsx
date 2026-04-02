import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { generateABAActivity } from '../../lib/openai';
import { saveGeneratedActivity } from '../../lib/activities';
import { useSkillStore } from '../../store/useSkillStore';

export default function AIActivityCard() {
  const { currentSkill, currentLevel } = useSkillStore();
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateABAActivity(currentSkill, currentLevel);
      if (result) {
        setActivity(result);
        // Using a valid UUID format to satisfy Supabase constraints
        await saveGeneratedActivity('00000000-0000-0000-0000-000000000000', result, currentSkill, currentLevel);
      }
    } catch (err) {
      console.error('Failed to generate/save:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>AI Activity Generator ✨</Text>
      <Text style={styles.subtitle}>Customized for: {currentSkill}</Text>
      {activity ? (
        <View style={styles.resultArea}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <Text style={styles.activitySteps}>{activity.steps?.[0] || 'Check your instructions...'}</Text>
          <TouchableOpacity onPress={() => setActivity(null)}>
            <Text style={styles.resetText}>Clear & Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleGenerate} disabled={loading}>
          {loading ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Generate Daily Activity</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 15 },
  button: { backgroundColor: '#10B981', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  resultArea: { marginTop: 10, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8 },
  activityTitle: { fontWeight: 'bold', fontSize: 16, color: '#059669' },
  activitySteps: { fontSize: 14, color: '#374151', marginTop: 5 },
  resetText: { marginTop: 10, color: '#6B7280', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' }
});