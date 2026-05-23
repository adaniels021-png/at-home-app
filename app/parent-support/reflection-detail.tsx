import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

export default function ParentSupportPlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    if (id) {
      void loadPlan();
    }
  }, [id]);

  async function loadPlan() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('parent_support_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPlan(data);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Could not load support plan.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!plan) return;

    try {
      await Share.share({
        message: `
${plan.title || 'Support Plan'}

${plan.plan_text || ''}
        `,
      });
    } catch (error) {
      console.error('share error:', error);
    }
  }

  async function handleDelete() {
    if (!plan?.id) return;

    Alert.alert(
      'Delete Plan',
      'Are you sure you want to permanently delete this support plan?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('parent_support_plans')
                .delete()
                .eq('id', plan.id);

              if (error) throw error;

              router.back();
            } catch (error: any) {
              Alert.alert(
                'Delete Failed',
                error?.message || 'Could not delete plan.'
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons
            name="document-text-outline"
            size={50}
            color="#94A3B8"
          />

          <Text style={styles.emptyTitle}>Plan Not Found</Text>

          <Text style={styles.emptyText}>
            This support plan could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Support Plan</Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="sparkles"
              size={28}
              color="#7C3AED"
            />
          </View>

          <Text style={styles.heroTitle}>
            {plan.title || 'Behavior Support Plan'}
          </Text>

          <Text style={styles.heroSubtitle}>
            {plan.tool_type === 'behavior_support'
              ? 'Behavior Support'
              : 'Parent Support'}
          </Text>

          <Text style={styles.heroDate}>
            Created{' '}
            {new Date(plan.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.planCard}>
  <Text style={styles.sectionTitle}>AI Recommendations</Text>

  <PlanSection
    title="Possible Reason"
    items={[plan.ai_response?.possible_reason]}
  />

  <PlanSection
    title="Prevention Strategies"
    items={plan.ai_response?.prevention_strategies}
  />

  <PlanSection
    title="Replacement Skills"
    items={plan.ai_response?.replacement_skills}
  />

  <PlanSection
    title="Calming Supports"
    items={plan.ai_response?.calming_supports}
  />

  <PlanSection
    title="Parent Tips"
    items={plan.ai_response?.parent_tips}
  />

  {plan.ai_response?.encouragement ? (
    <View style={styles.encouragementBox}>
      <Ionicons name="heart" size={18} color="#7C3AED" />
      <Text style={styles.encouragementText}>
        {plan.ai_response.encouragement}
      </Text>
    </View>
  ) : null}
</View>
        {plan.reinforcement_summary ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Reinforcement Strategy</Text>

            <Text style={styles.infoText}>
              {plan.reinforcement_summary}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.deleteButtonText}>
            Delete Plan
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanSection({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  const cleanItems = (items || []).filter(Boolean);

  if (!cleanItems.length) return null;

  return (
    <View style={styles.planSection}>
      <Text style={styles.infoTitle}>{title}</Text>

      {cleanItems.map((item, index) => (
        <View key={index} style={styles.resultRow}>
          <View style={styles.resultDot} />
          <Text style={styles.infoText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  heroSubtitle: {
    marginTop: 6,
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 13,
  },

  heroDate: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  planText: {
    color: '#334155',
    lineHeight: 24,
    fontSize: 15,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },

  infoText: {
    color: '#475569',
    lineHeight: 22,
    fontSize: 14,
  },

  deleteButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },

  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    marginLeft: 8,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
  },

  planSection: {
  marginBottom: 18,
},

resultRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 10,
},

resultDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#7C3AED',
  marginTop: 7,
  marginRight: 10,
},

encouragementBox: {
  marginTop: 10,
  backgroundColor: '#F5F3FF',
  borderRadius: 18,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'flex-start',
},

encouragementText: {
  flex: 1,
  marginLeft: 10,
  color: '#6D28D9',
  fontWeight: '700',
  lineHeight: 20,
},
});