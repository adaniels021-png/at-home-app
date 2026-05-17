import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useChild } from '../lib/SelectedChildContext';
import { generateRecommendedSigns, RecommendedSign } from '../lib/aiService';
import { supabase } from '../lib/supabase';

type SignProgressMap = Record<string, string | undefined>;

const SIGN_IMAGES: Record<string, any> = {
  more: require('../assets/signs/more.jpg'),
  eat: require('../assets/signs/eat.jpg'),
  drink: require('../assets/signs/drink.jpg'),
  help: require('../assets/signs/help.jpg'),
  'all done': require('../assets/signs/all_done.jpg'),
  play: require('../assets/signs/play.png'),
  mom: require('../assets/signs/mom.jpg'),
  dad: require('../assets/signs/dad.jpg'),
};

export default function TodayFocusSigns() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [loading, setLoading] = useState(true);
  const [recommendedSigns, setRecommendedSigns] = useState<RecommendedSign[]>([]);
  const [signProgress, setSignProgress] = useState<SignProgressMap>({});

  const childName = useMemo(
    () => selectedChild?.child_name || selectedChild?.name || 'your child',
    [selectedChild]
  );

  const loadFocusSigns = useCallback(async () => {
    if (!selectedChild?.id) {
      setRecommendedSigns([]);
      setSignProgress({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [assessmentRes, lessonsRes, progressRes] = await Promise.all([
        supabase
          .from('assessments')
          .select('responses, completed_at')
          .eq('child_id', selectedChild.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('lesson_logs')
          .select('category, lesson_name, completed_at')
          .eq('child_id', selectedChild.id)
          .order('completed_at', { ascending: false })
          .limit(10),

        supabase
          .from('communication_sign_progress')
          .select('sign_label, status')
          .eq('child_id', selectedChild.id),
      ]);

      if (assessmentRes.error) throw assessmentRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (progressRes.error) throw progressRes.error;

      const progressMap: SignProgressMap = {};
      (progressRes.data || []).forEach((row: any) => {
        progressMap[String(row.sign_label).toLowerCase()] = row.status;
      });
      setSignProgress(progressMap);

      const assessmentContext = assessmentRes.data?.responses || {};
      const recentLessons = lessonsRes.data || [];
      const mastered = Object.entries(progressMap)
        .filter(([, status]) => status === 'mastered')
        .map(([label]) => label);

      const aiRecommendations = await generateRecommendedSigns({
        childName,
        assessmentContext,
        recentLessons,
        excludedLabels: mastered,
      });

      setRecommendedSigns(aiRecommendations.slice(0, 3));
    } catch (error) {
      console.error('Load focus signs error:', error);
      setRecommendedSigns([
        { label: 'More', reason: 'Useful for motivated requesting.' },
        { label: 'Help', reason: 'Supports functional communication.' },
        { label: 'All Done', reason: 'Helps with transitions.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [selectedChild, childName]);

  useFocusEffect(
    useCallback(() => {
      void loadFocusSigns();
    }, [loadFocusSigns])
  );

  const visibleSigns = useMemo(() => {
    return recommendedSigns.filter(
      (item) => signProgress[item.label.toLowerCase()] !== 'mastered'
    );
  }, [recommendedSigns, signProgress]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>TODAY’S FOCUS</Text>
          <Text style={styles.title}>Baby Signs</Text>
        </View>

        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => router.push('/communication/sign-guide')}
        >
          <Ionicons name="arrow-forward" size={16} color="#10B981" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Practice 1–3 signs today during real routines.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.loadingText}>Loading signs...</Text>
        </View>
      ) : visibleSigns.length > 0 ? (
        <>
          {visibleSigns.map((item) => {
            const imageKey = item.label.toLowerCase();
            const imageSource = SIGN_IMAGES[imageKey];

            return (
              <View key={item.label} style={styles.signRow}>
                <View style={styles.leftRow}>
                  <View style={styles.thumbWrap}>
                    {imageSource ? (
                      <Image source={imageSource} style={styles.thumb} />
                    ) : (
                      <Ionicons
                        name="hand-left-outline"
                        size={20}
                        color="#10B981"
                      />
                    )}
                  </View>

                  <View style={styles.textWrap}>
                    <Text style={styles.signLabel}>{item.label}</Text>
                    <Text style={styles.signReason}>{item.reason}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/communication/sign-guide')}
          >
            <Ionicons name="hand-left-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Open Sign Guide</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.emptyText}>
            Great progress. Current focus signs may already be mastered.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.4,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  subtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 12,
  },

  openBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },

  loadingText: {
    marginLeft: 8,
    color: '#64748B',
    fontWeight: '700',
  },

  signRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  thumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },

  thumb: {
    width: '100%',
    height: '100%',
  },

  textWrap: {
    flex: 1,
  },

  signLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  signReason: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },

  primaryBtn: {
    marginTop: 4,
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  },

  emptyWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 12,
  },

  emptyText: {
    marginLeft: 8,
    flex: 1,
    color: '#065F46',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});