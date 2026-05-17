import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '../../lib/responsive';
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

export default function ParentSupportHistoryScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { selectedChild } = useChild();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    void loadPlans();
  }, [selectedChild?.id]);

  async function loadPlans() {
    if (!selectedChild?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('parent_support_plans')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPlans(data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load support plans.');
    } finally {
      setLoading(false);
    }
  }

  const getPlanTypeLabel = (toolType?: string) => {
    switch (toolType) {
      case 'behavior_support':
        return 'Behavior Support';
      case 'social_story':
        return 'Social Story';
      case 'routine_support':
        return 'Routine Support';
      case 'communication_support':
        return 'Communication Support';
      default:
        return 'Parent Support';
    }
  };

  const formatPlanForPrint = (plan: any) => {
    const response = plan.ai_response || {};

    if (plan.tool_type === 'social_story') {
      const pages = Array.isArray(response.story_pages)
        ? response.story_pages
            .map(
              (page: any, index: number) => `
                <h2>Page ${index + 1}: ${page.page_title || 'Story Page'}</h2>
                <p>${page.text || ''}</p>
                <p><strong>Visual idea:</strong> ${
                  page.visual_suggestion || ''
                }</p>
              `
            )
            .join('')
        : '';

      return `
        <h1>${response.title || plan.title || 'Social Story'}</h1>
        <p>${response.introduction || ''}</p>
        ${pages}
        <h2>Practice Tips</h2>
        <ul>${(response.practice_tips || [])
          .map((item: string) => `<li>${item}</li>`)
          .join('')}</ul>
        <h2>Caregiver Note</h2>
        <p>${response.caregiver_note || ''}</p>
        <h2>Calming Phrase</h2>
        <p>${response.calming_phrase || ''}</p>
      `;
    }

    if (plan.tool_type === 'behavior_support') {
      return `
        <h1>${plan.title || 'Behavior Support Plan'}</h1>
        <h2>Possible Reason</h2>
        <p>${response.possible_reason || ''}</p>
        <h2>Prevention Strategies</h2>
        <ul>${(response.prevention_strategies || [])
          .map((item: string) => `<li>${item}</li>`)
          .join('')}</ul>
        <h2>Replacement Skills</h2>
        <ul>${(response.replacement_skills || [])
          .map((item: string) => `<li>${item}</li>`)
          .join('')}</ul>
        <h2>Calming Supports</h2>
        <ul>${(response.calming_supports || [])
          .map((item: string) => `<li>${item}</li>`)
          .join('')}</ul>
        <h2>Parent Tips</h2>
        <ul>${(response.parent_tips || [])
          .map((item: string) => `<li>${item}</li>`)
          .join('')}</ul>
        <h2>Encouragement</h2>
        <p>${response.encouragement || ''}</p>
      `;
    }

    const listSections = Object.entries(response)
      .map(([key, value]) => {
        const title = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (letter) => letter.toUpperCase());

        if (Array.isArray(value)) {
          return `
            <h2>${title}</h2>
            <ul>${value.map((item) => `<li>${item}</li>`).join('')}</ul>
          `;
        }

        if (typeof value === 'string') {
          return `
            <h2>${title}</h2>
            <p>${value}</p>
          `;
        }

        return '';
      })
      .join('');

    return `
      <h1>${plan.title || 'Saved Support Plan'}</h1>
      ${listSections}
    `;
  };

  const handlePrintPlan = async (plan: any) => {
    try {
      const html = `
        <html>
          <body style="font-family: Arial; padding: 24px; line-height: 1.5;">
            <p><strong>Type:</strong> ${getPlanTypeLabel(plan.tool_type)}</p>
            <p><strong>Saved:</strong> ${new Date(
              plan.created_at
            ).toLocaleDateString()}</p>
            ${formatPlanForPrint(plan)}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Created', uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Print Error', 'Could not print this support plan.');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    Alert.alert(
      'Delete Support Plan',
      'Are you sure you want to delete this saved support plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('parent_support_plans')
                .delete()
                .eq('id', planId);

              if (error) throw error;

              setPlans((current) =>
                current.filter((plan) => plan.id !== planId)
              );
            } catch (error: any) {
              Alert.alert(
                'Delete Error',
                error?.message || 'Could not delete this support plan.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/parent-support');
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Saved Support Plans</Text>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {plans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="folder-open-outline" size={42} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No saved plans yet</Text>
              <Text style={styles.emptyText}>
                Generate and save a support plan, and it will appear here.
              </Text>
            </View>
          ) : (
            plans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <TouchableOpacity
                  style={styles.planMainRow}
                  onPress={() =>
                    router.push({
                      pathname: '/parent-support/plan-detail',
                      params: { id: plan.id },
                    })
                  }
                >
                  <View style={styles.planIcon}>
                    <Ionicons name="heart-circle" size={24} color="#7C3AED" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle} numberOfLines={1}>
                      {plan.title || 'Support Plan'}
                    </Text>

                    <Text style={styles.planSubtitle}>
                      {getPlanTypeLabel(plan.tool_type)}
                    </Text>

                    <Text style={styles.planDate}>
                      {new Date(plan.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.printButton}
                    onPress={() => handlePrintPlan(plan)}
                  >
                    <Ionicons name="print-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionText}>Print / Export</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePlan(plan.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSpacer: { width: 42 },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 21,
  },

  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },
  planSubtitle: {
    marginTop: 3,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
  },
  planDate: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  printButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    marginLeft: 6,
  },
});