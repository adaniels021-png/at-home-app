import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Corrected Import
import { generateABAActivity } from '../lib/aiService';
import { supabase } from '../lib/supabase';

export default function LessonDetail() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiActivity, setAiActivity] = useState<any>(null);
  const [childName, setChildName] = useState('your child');

  useEffect(() => {
    fetchChildData();
  }, []);

  const fetchChildData = async () => {
    try {
      const { data } = await supabase.from('children').select('child_name').limit(1).single();
      if (data?.child_name) setChildName(data.child_name);
    } catch (e) {
      console.log("No child profile found yet.");
    }
  };

  const handlePersonalize = async () => {
    setLoading(true);
    try {
      const result = await generateABAActivity(
        "Home", 
        childName, 
        title as string || "General Skill"
      );

      if (result) {
        setAiActivity(result);
      } else {
        Alert.alert("Connection Error", "The AI Coach is currently offline. Please check your settings.");
      }
    } catch (error) {
      console.error("Personalization Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lesson Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonTitle}>{title}</Text>
          <Text style={styles.lessonSubtitle}>Standard ABA Curriculum</Text>
        </View>

        {!aiActivity ? (
          <TouchableOpacity 
            style={styles.aiButton} 
            onPress={handlePersonalize}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.aiButtonText}>Personalize with AI Coach</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <Ionicons name="ribbon" size={20} color="#6366f1" />
              <Text style={styles.aiCardTitle}>AI-Powered Plan for {childName}</Text>
            </View>

            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.activityName}>{aiActivity.name}</Text>

            <Text style={styles.sectionTitle}>Instructions</Text>
            {aiActivity.instructions?.map((step: string, index: number) => (
              <Text key={index} style={styles.instructionStep}>
                {index + 1}. {step}
              </Text>
            ))}

            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={() => setAiActivity(null)}
            >
              <Text style={styles.resetButtonText}>Generate New Variation</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  scrollContent: {
    padding: 20,
  },
  lessonHeader: {
    marginBottom: 24,
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  lessonSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  aiButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  aiCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338ca',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  instructionStep: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 8,
  },
  resetButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
  },
});