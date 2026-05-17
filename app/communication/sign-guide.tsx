import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { generateRecommendedSigns, RecommendedSign } from '../../lib/aiService';
import { useResponsiveLayout } from '../../lib/responsive';
import { speakWithSavedVoice } from '../../lib/speechSettings';
import { supabase } from '../../lib/supabase';

type Sign = {
  id: string;
  label: string;
  description: string;
  image: any;
  modelText: string;
  motionSteps: string[];
  bestTime: string;
};

type SignProgressStatus = 'practicing' | 'mastered';
type SignProgressMap = Record<string, SignProgressStatus | undefined>;

const SIGNS: Sign[] = [
  {
    id: 'more',
    label: 'More',
    description: 'Used to request more of something',
    image: require('../../assets/signs/more.jpg'),
    modelText:
      'Tap fingertips together and say “More” right before giving another turn, bite, or item.',
    motionSteps: [
      'Hold both hands up in front of the child.',
      'Bring fingertips together gently.',
      'Repeat slowly while saying “More.”',
    ],
    bestTime: 'Best during snacks, play, and favorite activities.',
  },
  {
    id: 'eat',
    label: 'Eat',
    description: 'Used during meals or snacks',
    image: require('../../assets/signs/eat.jpg'),
    modelText:
      'Bring fingertips toward the mouth and say “Eat” before giving food.',
    motionSteps: [
      'Start with open fingertips.',
      'Move fingertips toward the mouth.',
      'Say “Eat” at the same time.',
    ],
    bestTime: 'Best during meals, snacks, and kitchen routines.',
  },
  {
    id: 'drink',
    label: 'Drink',
    description: 'Used for juice, water, milk',
    image: require('../../assets/signs/drink.jpg'),
    modelText:
      'Pretend to tip a cup to the mouth and say “Drink” before handing the drink.',
    motionSteps: [
      'Shape the hand like you are holding a cup.',
      'Tilt the hand toward the mouth.',
      'Say “Drink” clearly.',
    ],
    bestTime: 'Best before handing a cup or bottle.',
  },
  {
    id: 'help',
    label: 'Help',
    description: 'Used when the child needs assistance',
    image: require('../../assets/signs/help.jpg'),
    modelText:
      'Place one hand on the other and lift slightly while calmly saying “Help.”',
    motionSteps: [
      'Put one hand flat.',
      'Place the other hand on top.',
      'Lift both slightly while saying “Help.”',
    ],
    bestTime: 'Best when something is hard, stuck, or frustrating.',
  },
  {
    id: 'all_done',
    label: 'All Done',
    description: 'Used to end an activity',
    image: require('../../assets/signs/all_done.jpg'),
    modelText:
      'Turn both hands outward and say “All done” when the activity ends.',
    motionSteps: [
      'Hold both hands up.',
      'Turn palms outward.',
      'Say “All done” as the activity ends.',
    ],
    bestTime: 'Best at the end of meals, games, table work, or routines.',
  },
  {
    id: 'play',
    label: 'Play',
    description: 'Used to start play',
    image: require('../../assets/signs/play.png'),
    modelText:
      'Model the play sign and say “Play” right before starting a fun activity.',
    motionSteps: [
      'Hold hands open with fingers spread.',
      'Shake both hands gently.',
      'Say “Play” with excitement.',
    ],
    bestTime: 'Best before toys, outdoor play, or movement activities.',
  },
  {
    id: 'mom',
    label: 'Mom',
    description: 'Used to request mom',
    image: require('../../assets/signs/mom.jpg'),
    modelText:
      'Use the sign for “Mom” during real moments when the child wants mom.',
    motionSteps: [
      'Touch thumb to chin area.',
      'Keep the hand open.',
      'Say “Mom” clearly.',
    ],
    bestTime: 'Best during separation, comfort, and transitions.',
  },
  {
    id: 'dad',
    label: 'Dad',
    description: 'Used to request dad',
    image: require('../../assets/signs/dad.jpg'),
    modelText:
      'Use the sign for “Dad” in real interactions when dad is present or requested.',
    motionSteps: [
      'Touch thumb to forehead area.',
      'Keep the hand open.',
      'Say “Dad” clearly.',
    ],
    bestTime: 'Best when greeting, requesting, or looking for dad.',
  },
];

export default function SignGuideScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { selectedChild } = useChild() as any;

  const [selectedSignId, setSelectedSignId] = useState(SIGNS[0].id);
  const [speaking, setSpeaking] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [recommendedSigns, setRecommendedSigns] = useState<RecommendedSign[]>([]);
  const [signProgress, setSignProgress] = useState<SignProgressMap>({});

  const selectedSign = useMemo(
    () => SIGNS.find((sign) => sign.id === selectedSignId) || SIGNS[0],
    [selectedSignId]
  );

  const childName = useMemo(
    () => selectedChild?.child_name || selectedChild?.name || 'your child',
    [selectedChild]
  );

  const masteredCount = useMemo(() => {
    return Object.values(signProgress).filter((status) => status === 'mastered')
      .length;
  }, [signProgress]);

  const practicingCount = useMemo(() => {
    return Object.values(signProgress).filter(
      (status) => status === 'practicing'
    ).length;
  }, [signProgress]);

  const progressPercent = useMemo(() => {
    return Math.round((masteredCount / SIGNS.length) * 100);
  }, [masteredCount]);

  const activeRecommendedLabels = useMemo(() => {
    return recommendedSigns
      .filter((item) => signProgress[item.label.toLowerCase()] !== 'mastered')
      .map((item) => item.label.toLowerCase());
  }, [recommendedSigns, signProgress]);

  const orderedSigns = useMemo(() => {
    const recommended = SIGNS.filter((sign) =>
      activeRecommendedLabels.includes(sign.label.toLowerCase())
    );

    const remaining = SIGNS.filter(
      (sign) => !activeRecommendedLabels.includes(sign.label.toLowerCase())
    );

    return [...recommended, ...remaining];
  }, [activeRecommendedLabels]);

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

  const speak = async (text: string) => {
    try {
      setSpeaking(true);
      await speakWithSavedVoice(text);
      setTimeout(() => setSpeaking(false), 1200);
    } catch (error) {
      console.error('Speech error:', error);
      setSpeaking(false);
    }
  };

  const loadRecommendationsAndProgress = useCallback(async () => {
    if (!selectedChild?.id) {
      setRecommendedSigns([]);
      setSignProgress({});
      setLoadingRecommendations(false);
      return;
    }

    try {
      setLoadingRecommendations(true);

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

      const mastered = Object.entries(progressMap)
        .filter(([, status]) => status === 'mastered')
        .map(([label]) => label);

      const aiRecommendations = await generateRecommendedSigns({
        childName,
        assessmentContext: assessmentRes.data?.responses || {},
        recentLessons: lessonsRes.data || [],
        excludedLabels: mastered,
      });

      setRecommendedSigns(aiRecommendations);
    } catch (error) {
      console.error('Load sign recommendations error:', error);

      setRecommendedSigns([
        {
          label: 'More',
          reason: 'Useful for motivating requests during daily routines.',
        },
        {
          label: 'Help',
          reason:
            'Supports functional communication when something is difficult.',
        },
        {
          label: 'All Done',
          reason: 'Helps with transitions and ending activities clearly.',
        },
      ]);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [selectedChild?.id, childName]);

  useFocusEffect(
    useCallback(() => {
      void loadRecommendationsAndProgress();
    }, [loadRecommendationsAndProgress])
  );

  const saveSignStatus = async (label: string, status: SignProgressStatus) => {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child profile first.');
      return;
    }

    try {
      setSavingStatus(label);

      const normalized = label.toLowerCase();

      const { error } = await supabase.from('communication_sign_progress').upsert(
        [
          {
            child_id: selectedChild.id,
            sign_label: normalized,
            status,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'child_id,sign_label' }
      );

      if (error) throw error;

      setSignProgress((prev) => ({
        ...prev,
        [normalized]: status,
      }));
    } catch (error: any) {
      console.error('Save sign status error:', error);
      Alert.alert(
        'Save Error',
        error?.message || 'Could not save sign progress.'
      );
    } finally {
      setSavingStatus(null);
    }
  };

  const clearSignStatus = async (label: string) => {
    if (!selectedChild?.id) return;

    try {
      setSavingStatus(label);

      const normalized = label.toLowerCase();

      const { error } = await supabase
        .from('communication_sign_progress')
        .delete()
        .eq('child_id', selectedChild.id)
        .eq('sign_label', normalized);

      if (error) throw error;

      setSignProgress((prev) => {
        const next = { ...prev };
        delete next[normalized];
        return next;
      });
    } catch (error: any) {
      console.error('Clear sign status error:', error);
      Alert.alert(
        'Update Error',
        error?.message || 'Could not clear sign progress.'
      );
    } finally {
      setSavingStatus(null);
    }
  };

  const getStatusLabel = (label: string) => {
    return signProgress[label.toLowerCase()];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            alignItems: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.contentInner,
            { maxWidth: layout.maxContentWidth },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Ionicons name="hand-left-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>BABY SIGN GUIDE</Text>
            </View>

            <Text style={styles.heroTitle}>Baby Sign Language</Text>

            <Text style={styles.heroSubtitle}>
              Teach first signs with bigger visuals, simple motion steps, and
              real-life parent modeling for {childName}.
            </Text>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              label="Mastered"
              value={masteredCount}
              icon="checkmark-circle"
              accent="#2563EB"
              bg="#EFF6FF"
            />

            <StatCard
              label="Practicing"
              value={practicingCount}
              icon="time-outline"
              accent="#F59E0B"
              bg="#FFFBEB"
            />

            <StatCard
              label="Total Signs"
              value={SIGNS.length}
              icon="hand-left-outline"
              accent="#10B981"
              bg="#ECFDF5"
            />
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressTitle}>Progress</Text>
              <Text style={styles.progressPercent}>
                {progressPercent}% mastered
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>

            <Text style={styles.progressSubtext}>
              Keep modeling the same small set of signs until they become
              familiar and useful.
            </Text>
          </View>

          <SectionCard
            title="Recommended First Signs"
            subtitle="Personalized starter signs based on your child's recent activity"
          >
            {loadingRecommendations ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.loadingText}>Loading recommendations...</Text>
              </View>
            ) : recommendedSigns.length > 0 ? (
              recommendedSigns.map((item) => {
                const status = getStatusLabel(item.label);
                if (status === 'mastered') return null;

                return (
                  <View key={item.label} style={styles.recommendationCard}>
                    <Text style={styles.recommendationLabel}>{item.label}</Text>
                    <Text style={styles.recommendationReason}>
                      {item.reason}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.fallbackText}>
                Start with functional first signs like More, Help, and All Done.
              </Text>
            )}
          </SectionCard>

          <SectionCard
            title="Choose a Sign"
            subtitle="Tap a sign below to open the full teaching card"
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.signChipRow}
            >
              {orderedSigns.map((sign) => {
                const isRecommended = activeRecommendedLabels.includes(
                  sign.label.toLowerCase()
                );
                const active = selectedSignId === sign.id;

                return (
                  <TouchableOpacity
                    key={sign.id}
                    style={[
                      styles.signChip,
                      active && styles.signChipActive,
                      isRecommended && styles.signChipRecommended,
                    ]}
                    onPress={() => setSelectedSignId(sign.id)}
                  >
                    <Text
                      style={[
                        styles.signChipText,
                        active && styles.signChipTextActive,
                      ]}
                    >
                      {sign.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SectionCard>

          <View style={styles.signCard}>
            <View style={styles.signCardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.signTitle}>{selectedSign.label}</Text>
                <Text style={styles.signDescription}>
                  {selectedSign.description}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.speakBtn}
                onPress={() => void speak(selectedSign.label)}
              >
                <Ionicons name="volume-high" size={18} color="#10B981" />
              </TouchableOpacity>
            </View>

            <Image
              source={selectedSign.image}
              style={styles.signImage}
              resizeMode="cover"
            />

            <View style={styles.tapHint}>
              <Ionicons name="volume-high-outline" size={14} color="#10B981" />
              <Text style={styles.tapHintText}>
                {speaking ? 'Speaking...' : 'Tap speaker to hear the sign'}
              </Text>
            </View>

            <View style={styles.teachBox}>
              <Text style={styles.teachBoxTitle}>
                Step-by-step motion teaching
              </Text>

              {selectedSign.motionSteps.map((step, index) => (
                <Text key={step} style={styles.teachStep}>
                  {index + 1}. {step}
                </Text>
              ))}
            </View>

            <View style={styles.modelBox}>
              <Text style={styles.modelTitle}>Parent model script</Text>
              <Text style={styles.modelText}>{selectedSign.modelText}</Text>
            </View>

            <View style={styles.bestTimeBox}>
              <Ionicons name="time-outline" size={16} color="#4F46E5" />
              <Text style={styles.bestTimeText}>{selectedSign.bestTime}</Text>
            </View>

            <View style={styles.progressRow}>
              <TouchableOpacity
                style={[
                  styles.progressBtn,
                  getStatusLabel(selectedSign.label) === 'practicing' &&
                    styles.progressBtnActive,
                ]}
                onPress={() =>
                  void saveSignStatus(selectedSign.label, 'practicing')
                }
                disabled={savingStatus === selectedSign.label}
              >
                <Text
                  style={[
                    styles.progressBtnText,
                    getStatusLabel(selectedSign.label) === 'practicing' &&
                      styles.progressBtnTextActive,
                  ]}
                >
                  Practicing
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.progressBtn,
                  getStatusLabel(selectedSign.label) === 'mastered' &&
                    styles.masteredBtnActive,
                ]}
                onPress={() =>
                  void saveSignStatus(selectedSign.label, 'mastered')
                }
                disabled={savingStatus === selectedSign.label}
              >
                <Text
                  style={[
                    styles.progressBtnText,
                    getStatusLabel(selectedSign.label) === 'mastered' &&
                      styles.masteredBtnTextActive,
                  ]}
                >
                  Mastered
                </Text>
              </TouchableOpacity>
            </View>

            {getStatusLabel(selectedSign.label) ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => void clearSignStatus(selectedSign.label)}
                disabled={savingStatus === selectedSign.label}
              >
                <Text style={styles.clearBtnText}>
                  {savingStatus === selectedSign.label
                    ? 'Saving...'
                    : 'Clear Status'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <SectionCard
            title="Practice Plan for This Week"
            subtitle="A simple plan parents can actually use"
          >
            <Text style={styles.tipText}>• Pick 2 signs only</Text>
            <Text style={styles.tipText}>• Use them during 2 daily routines</Text>
            <Text style={styles.tipText}>
              • Model each sign many times before expecting use
            </Text>
            <Text style={styles.tipText}>• Reinforce immediately after attempts</Text>
            <Text style={styles.tipText}>
              • Keep practice short, positive, and repeatable
            </Text>
          </SectionCard>

          <SectionCard
            title="How to Teach Signs at Home"
            subtitle="A simple routine parents can follow every day"
          >
            <Text style={styles.tipText}>
              • Say the word while showing the sign
            </Text>
            <Text style={styles.tipText}>
              • Use it during real moments, not only practice time
            </Text>
            <Text style={styles.tipText}>• Prompt gently if needed</Text>
            <Text style={styles.tipText}>• Accept early attempts</Text>
            <Text style={styles.tipText}>• Reinforce immediately</Text>
            <Text style={styles.tipText}>
              • Repeat the same sign many times across the week
            </Text>
          </SectionCard>

          <SectionCard
            title="Watch & Learn"
            subtitle="Open a parent-friendly sign teaching video"
          >
            <TouchableOpacity
              style={styles.videoBtn}
              onPress={() =>
                void openUrl('https://www.youtube.com/watch?v=227XglZPvZw')
              }
            >
              <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
              <Text style={styles.videoBtnText}>Watch Sign Video</Text>
            </TouchableOpacity>
          </SectionCard>

          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/communication/parent-training-hub')}
            >
              <Ionicons name="school-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Back to Parent Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/communication/pecs-guide')}
            >
              <Ionicons name="images-outline" size={18} color="#10B981" />
              <Text style={styles.secondaryBtnText}>Open PECS Guide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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

function StatCard({
  label,
  value,
  icon,
  accent,
  bg,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingTop: 20,
    paddingBottom: 42,
  },
  contentInner: {
    width: '100%',
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroCard: {
    backgroundColor: '#10B981',
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
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
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginTop: 8,
    color: '#D1FAE5',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981',
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  progressSubtext: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
  signChipRow: {
    paddingBottom: 2,
  },
  signChip: {
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    justifyContent: 'center',
  },
  signChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  signChipRecommended: {
    borderColor: '#34D399',
  },
  signChipText: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 12,
  },
  signChipTextActive: {
    color: '#FFFFFF',
  },
  signCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  signTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  signDescription: {
    marginTop: 4,
    color: '#64748B',
    lineHeight: 19,
    fontSize: 13,
    fontWeight: '600',
  },
  speakBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  signImage: {
    width: '100%',
    height: 280,
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
  },
  tapHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tapHintText: {
    marginLeft: 6,
    color: '#10B981',
    fontWeight: '700',
    fontSize: 12,
  },
  teachBox: {
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  teachBoxTitle: {
    fontWeight: '900',
    marginBottom: 8,
    color: '#065F46',
    fontSize: 14,
  },
  teachStep: {
    color: '#047857',
    marginBottom: 5,
    fontWeight: '600',
    lineHeight: 19,
    fontSize: 13,
  },
  modelBox: {
    backgroundColor: '#EEF2FF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  modelTitle: {
    fontWeight: '900',
    marginBottom: 8,
    color: '#3730A3',
    fontSize: 14,
  },
  modelText: {
    color: '#4338CA',
    lineHeight: 20,
    fontWeight: '600',
    fontSize: 13,
  },
  bestTimeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bestTimeText: {
    marginLeft: 8,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  progressBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  masteredBtnActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  progressBtnText: {
    color: '#475569',
    fontWeight: '900',
    fontSize: 12,
  },
  progressBtnTextActive: {
    color: '#92400E',
  },
  masteredBtnTextActive: {
    color: '#1D4ED8',
  },
  clearBtn: {
    marginTop: 12,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  clearBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  tipText: {
    color: '#334155',
    marginBottom: 6,
    fontWeight: '600',
    lineHeight: 20,
  },
  videoBtn: {
    minHeight: 52,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 6,
    fontSize: 14,
  },
  bottomActions: {
    marginTop: 4,
  },
  primaryBtn: {
    minHeight: 56,
    backgroundColor: '#10B981',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
    fontSize: 15,
  },
  secondaryBtn: {
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  secondaryBtnText: {
    color: '#10B981',
    fontWeight: '900',
    marginLeft: 8,
    fontSize: 15,
  },
});