import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { useChild } from '../../lib/SelectedChildContext';
import { generateRecommendedSigns } from '../../lib/aiService';
import { supabase } from '../../lib/supabase';

type RecommendedSign = {
  label: string;
  reason: string;
};

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  accent = '#4F46E5',
  background = '#EEF2FF',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: string;
  background?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionTile, { backgroundColor: background }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: `${accent}20` }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>

      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#64748B" />
    </TouchableOpacity>
  );
}

export default function ParentTrainingHubScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [loading, setLoading] = useState(true);
  const [recommendedSigns, setRecommendedSigns] = useState<RecommendedSign[]>([]);
  const [masteredLabels, setMasteredLabels] = useState<string[]>([]);

  const childName = useMemo(
    () => selectedChild?.child_name || selectedChild?.name || 'your child',
    [selectedChild]
  );

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Link Error', 'Could not open the link.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Open URL error:', error);
      Alert.alert('Link Error', 'Could not open the link.');
    }
  };

  const loadRecommendations = useCallback(async () => {
    if (!selectedChild?.id) {
      setRecommendedSigns([]);
      setMasteredLabels([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [assessmentRes, lessonsRes, signProgressRes] = await Promise.all([
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
      if (signProgressRes.error) throw signProgressRes.error;

      const assessmentContext = assessmentRes.data?.responses || {};
      const recentLessons = lessonsRes.data || [];

      const mastered =
        signProgressRes.data
          ?.filter((row: any) => row.status === 'mastered')
          .map((row: any) => String(row.sign_label).trim().toLowerCase()) || [];

      setMasteredLabels(mastered);

      const recs = await generateRecommendedSigns({
        childName,
        assessmentContext,
        recentLessons,
        excludedLabels: mastered,
      });

      setRecommendedSigns(recs);
    } catch (error) {
      console.error('Parent Training Hub load error:', error);
      setRecommendedSigns([
        {
          label: 'More',
          reason: 'Useful for motivating requests during favorite activities.',
        },
        {
          label: 'Help',
          reason: 'Supports functional communication when something is hard.',
        },
        {
          label: 'All Done',
          reason: 'Helps with transitions and ending activities clearly.',
        },
      ]);
      setMasteredLabels([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChild, childName]);

  useFocusEffect(
    useCallback(() => {
      void loadRecommendations();
    }, [loadRecommendations])
  );

  const visibleRecommendedSigns = useMemo(() => {
    return recommendedSigns.filter(
      (item) => !masteredLabels.includes(item.label.toLowerCase())
    );
  }, [recommendedSigns, masteredLabels]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="school-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>PARENT TRAINING HUB</Text>
          </View>

          <Text style={styles.heroTitle}>Parent Training Hub</Text>
          <Text style={styles.heroSubtitle}>
            Learn how to teach communication skills, use PECS and baby signs,
            and build simple daily practice at home for {childName}.
          </Text>
        </View>

        <SectionCard
          title="Start Here"
          subtitle="The fastest way to begin using this section at home"
        >
          <BulletRow text="Choose 1 to 3 communication targets only at first." />
          <BulletRow text="Use highly motivating items, activities, or routines." />
          <BulletRow text="Model the communication method calmly and consistently." />
          <BulletRow text="Reward communication attempts right away." />
          <BulletRow text="Keep practice short, positive, and part of real daily life." />
        </SectionCard>

        <SectionCard
          title="Training Paths"
          subtitle="Open a guide, watch a video, and practice what you learn"
        >
          <ActionTile
            icon="images-outline"
            title="PECS Parent Guide"
            subtitle="Learn what PECS is, why it helps, and how to teach it at home."
            onPress={() => router.push('/communication/pecs-guide')}
            accent="#4F46E5"
            background="#EEF2FF"
          />

          <ActionTile
            icon="hand-left-outline"
            title="Baby Sign Guide"
            subtitle="See first signs to teach and how to model them clearly."
            onPress={() => router.push('/communication/sign-guide')}
            accent="#10B981"
            background="#ECFDF5"
          />

          <ActionTile
            icon="play-circle-outline"
            title="Watch PECS Training Video"
            subtitle="Open a PECS teaching video for parents."
            onPress={() =>
              openUrl(
                'https://www.youtube.com/results?search_query=how+to+teach+PECS+to+children'
              )
            }
            accent="#7C3AED"
            background="#F5F3FF"
          />

          <ActionTile
            icon="play-circle-outline"
            title="Watch Baby Sign Video"
            subtitle="Watch a sign-language video parents and children can use together."
            onPress={() => openUrl('https://www.youtube.com/watch?v=227XglZPvZw')}
            accent="#EA580C"
            background="#FFF7ED"
          />
        </SectionCard>

        <SectionCard
          title="Recommended First Signs"
          subtitle={`Based on ${childName}'s recent activity and communication needs`}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading recommendations...</Text>
            </View>
          ) : visibleRecommendedSigns.length > 0 ? (
            visibleRecommendedSigns.map((item) => (
              <View key={item.label} style={styles.recommendationCard}>
                <Text style={styles.recommendationLabel}>{item.label}</Text>
                <Text style={styles.recommendationReason}>{item.reason}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.fallbackText}>
              Great progress. Your child may already have mastered the main
              starter signs. Open the Baby Sign Guide to keep building new
              communication targets.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="Best Home Teaching Tips"
          subtitle="These tips work for both PECS and baby signs"
        >
          <BulletRow text="Teach during real routines like meals, play, bath, and transitions." />
          <BulletRow text="Say the word every time you show the card or sign." />
          <BulletRow text="Prompt only as much as needed." />
          <BulletRow text="Accept early approximations and build from success." />
          <BulletRow text="Keep sessions brief so the child stays motivated." />
        </SectionCard>

        <SectionCard
          title="Good First Communication Targets"
          subtitle="Start with highly useful words and concepts"
        >
          <View style={styles.targetsWrap}>
            {[
              'More',
              'Help',
              'Eat',
              'Drink',
              'All Done',
              'Open',
              'Play',
              'Mom',
              'Dad',
            ].map((item) => (
              <View key={item} style={styles.targetChip}>
                <Text style={styles.targetChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="Practice Plan for This Week"
          subtitle="A simple routine parents can actually follow"
        >
          <BulletRow text="Pick 2 communication targets." />
          <BulletRow text="Practice them during 2 daily routines." />
          <BulletRow text="Repeat the same targets for several days before adding more." />
          <BulletRow text="Track what works best and what the child responds to most." />
        </SectionCard>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/communication/pecs-guide')}
          >
            <Ionicons name="images-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Open PECS Guide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/communication/sign-guide')}
          >
            <Ionicons name="hand-left-outline" size={18} color="#4F46E5" />
            <Text style={styles.secondaryBtnText}>Open Baby Sign Guide</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    paddingBottom: 42,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
  },

  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.4,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  heroSubtitle: {
    marginTop: 8,
    color: '#E0E7FF',
    lineHeight: 21,
    fontSize: 14,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },

  sectionSubtitle: {
    color: '#64748B',
    lineHeight: 19,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bulletText: {
    flex: 1,
    marginLeft: 10,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '600',
  },

  actionTile: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  actionSubtitle: {
    marginTop: 4,
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '600',
  },

  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    marginLeft: 8,
    color: '#64748B',
    fontWeight: '700',
  },

  recommendationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  recommendationLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  recommendationReason: {
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '600',
  },

  fallbackText: {
    color: '#475569',
    lineHeight: 20,
    fontWeight: '600',
  },

  targetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  targetChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },

  targetChipText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },

  bottomActions: {
    marginTop: 4,
  },

  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },

  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  secondaryBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },
});