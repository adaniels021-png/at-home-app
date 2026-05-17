import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const childContext = useChild() as any;

  const selectedChild = childContext?.selectedChild;
  const refreshChildren = childContext?.refreshChildren;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);

  const childName = useMemo(() => {
    return (
      selectedChild?.child_name ||
      selectedChild?.name ||
      selectedChild?.first_name ||
      'your child'
    );
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      void fetchHomeData();
    }, [selectedChild?.id])
  );

  async function fetchHomeData() {
    try {
      setLoading(true);

      if (typeof refreshChildren === 'function') {
        await refreshChildren();
      }

      if (selectedChild?.id) {
        const { data: assessment, error } = await supabase
          .from('assessments')
          .select('id')
          .eq('child_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        setHasAssessment(!!assessment);
      } else {
        setHasAssessment(false);
      }
    } catch (error: any) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>
            {selectedChild
              ? `Today’s support plan for ${childName}`
              : 'Set up your first child profile to begin'}
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutIcon} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.heroCard}
          onPress={() =>
            selectedChild
              ? hasAssessment
                ? router.push('/daily-lessons')
                : router.push('/onboarding/assessment')
              : router.push('/onboarding/add-child')
          }
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {!selectedChild ? 'SETUP' : hasAssessment ? 'TODAY’S LESSON' : 'ASSESSMENT'}
              </Text>
            </View>

            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>
            {!selectedChild
              ? 'Create a Child Profile'
              : hasAssessment
                ? `Ready for ${childName}'s Lesson?`
                : 'Complete Your Assessment'}
          </Text>

          <Text style={styles.heroDesc}>
            {!selectedChild
              ? 'Add a child profile to personalize lessons, routines, PECS tools, worksheets, and progress tracking.'
              : hasAssessment
                ? 'Open today’s personalized lesson and continue building communication, routines, and learning skills.'
                : 'Finish onboarding to personalize lessons, PECS tools, worksheets, and progress tracking.'}
          </Text>
        </TouchableOpacity>

        <View style={styles.snapshotRow}>
          <View style={[styles.snapshotCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.snapshotValue}>
              {selectedChild ? childName : 'None'}
            </Text>
            <Text style={styles.snapshotLabel}>Active Child</Text>
          </View>

          <View style={[styles.snapshotCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.snapshotValue}>{hasAssessment ? 'Ready' : 'Pending'}</Text>
            <Text style={styles.snapshotLabel}>Assessment</Text>
          </View>

          <View style={[styles.snapshotCard, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.snapshotValue}>PECS</Text>
            <Text style={styles.snapshotLabel}>Communication</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Start</Text>

        <View style={styles.grid}>
          <QuickAction
            icon="book"
            label="Lessons"
            subtitle="Today’s plan"
            bg="#EEF2FF"
            color="#4F46E5"
            onPress={() => router.push('/daily-lessons')}
          />

          <QuickAction
            icon="chatbubbles"
            label="Communication"
            subtitle="PECS board"
            bg="#ECFDF5"
            color="#059669"
            onPress={() => router.push('/communication')}
          />

          <QuickAction
            icon="grid"
            label="Dashboard"
            subtitle="Tools"
            bg="#FFF7ED"
            color="#EA580C"
            onPress={() => router.push('/dashboard')}
          />

          <QuickAction
            icon="calendar"
            label="Routine"
            subtitle="Daily supports"
            bg="#FDF2F8"
            color="#DB2777"
            onPress={() => router.push('/routines')}
          />
        </View>

        <View style={styles.tipBox}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={18} color="#F59E0B" />
            <Text style={styles.tipTitle}>Parent Tip</Text>
          </View>

          <Text style={styles.tipText}>
            Use short, successful learning moments throughout the day. A 5-minute lesson, a PECS prompt,
            and one worksheet can add up to strong progress over time.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  subtitle,
  bg,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  bg: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSubtext}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 56,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  logoutIcon: {
    width: 42,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },

  heroDesc: {
    color: '#E0E7FF',
    fontSize: 14,
    lineHeight: 21,
  },

  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },

  snapshotCard: {
    width: '31%',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  snapshotValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },

  snapshotLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  actionLabel: {
    fontWeight: '800',
    fontSize: 14,
    color: '#1E293B',
  },

  actionSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  tipBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 22,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 10,
  },

  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  tipTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#92400E',
    fontSize: 15,
  },

  tipText: {
    color: '#B45309',
    lineHeight: 21,
    fontSize: 14,
  },
});