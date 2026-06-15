import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '../../components/AnimatedPressable';
import FadeInView from '../../components/FadeInView';
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';



const WEEKLY_PROGRESS_LAST_SEEN_KEY = 'weekly_progress_last_seen';
export default function HomeScreen() {
  const router = useRouter();
  const childContext = useChild() as any;
  const selectedChild = childContext?.selectedChild;
  const children = childContext?.children || [];

const [showChildSelector, setShowChildSelector] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showWeeklyProgress, setShowWeeklyProgress] = useState(false);

  const childName = useMemo(() => {
    return (
      selectedChild?.child_name ||
      selectedChild?.name ||
      selectedChild?.first_name ||
      'your child'
    );
  }, [selectedChild]);

  const childAge = useMemo(() => {
  return selectedChild?.age || selectedChild?.child_age || null;
}, [selectedChild]);

const showToiletTraining =
  selectedChild?.show_toilet_training !== false;

function getHomeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return {
      title: 'Good morning ☀️',
      message: 'Every new day is a chance to grow.',
      image: require('../../assets/images/home-morning.png'),
    };
  }

  if (hour < 17) {
    return {
      title: 'Good afternoon 💜',
      message: 'Small steps still count.',
      image: require('../../assets/images/home-afternoon.png'),
    };
  }

  if (hour < 21) {
    return {
      title: 'Good evening 🌙',
      message: 'You showed up today. That matters.',
      image: require('../../assets/images/home-evening.png'),
    };
  }

  return {
    title: 'Good night ⭐',
    message: 'Progress happens one day at a time.',
    image: require('../../assets/images/home-night.png'),
  };
}

const greetingCopy = useMemo(() => getHomeGreeting(), []);

useEffect(() => {
  void fetchHomeData();
}, [selectedChild?.id]);


  async function checkWeeklyProgressVisibility() {
    const lastViewed = await AsyncStorage.getItem(
      WEEKLY_PROGRESS_LAST_SEEN_KEY
    );

    if (!lastViewed) {
      setShowWeeklyProgress(true);
      return;
    }

    const now = Date.now();
    const diffDays = (now - Number(lastViewed)) / (1000 * 60 * 60 * 24);

    setShowWeeklyProgress(diffDays >= 7);
  }

  async function fetchHomeData() {
    try {
      setLoading(true);

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

      await checkWeeklyProgressVisibility();
    } catch (error: any) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function dismissWeeklyProgress() {
    await AsyncStorage.setItem(
      WEEKLY_PROGRESS_LAST_SEEN_KEY,
      String(Date.now())
    );

    setShowWeeklyProgress(false);
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

  const hideToiletTrainingFromHome = () => {
  if (!selectedChild?.id) return;

  Alert.alert(
    'Hide Toilet Training?',
    'You can turn it back on later from the child profile/settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hide',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('children')
            .update({ show_toilet_training: false })
            .eq('id', selectedChild.id);

          if (error) {
            Alert.alert('Error', error.message);
            return;
          }

          await childContext?.refreshChildren?.();
        },
      },
    ]
  );
};

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your home screen...</Text>
      </View>
    );
  }

  
    return (
      <SafeAreaView style={styles.container}>
       <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowMiddle} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />

      <View
  pointerEvents="none"
  style={styles.floatingBackgroundOrb}
/>

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
        <FadeInView delay={0}>
  <View style={styles.topHeroCard}>
    <View pointerEvents="none" style={styles.topHeroGlowOne} />
    <View pointerEvents="none" style={styles.topHeroGlowTwo} />

    <View style={styles.topHeroHeader}>
      <View style={styles.topHeroIcon}>
        <Ionicons name="sparkles" size={20} color="#6D28D9" />
      </View>

      <AnimatedPressable
        style={styles.logoutGlassButton}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={22} color="#0F172A" />
      </AnimatedPressable>
    </View>

    <AnimatedPressable
  style={styles.heroBadge}
  onPress={() => setShowChildSelector(!showChildSelector)}
>
  <Text style={styles.heroBadgeText}>
    ✨ {childName}
    {childAge ? ` • ${childAge} yrs` : ''}
    {'  ▾'}
  </Text>
</AnimatedPressable>

{showChildSelector && (
  <View style={styles.childSelectorCard}>
    {children.map((child: any) => (
      <AnimatedPressable
        key={child.id}
        style={styles.childSelectorItem}
        onPress={() => {
          childContext?.setSelectedChild?.(child);
          setShowChildSelector(false);
        }}
      >
        <Text style={styles.childSelectorName}>
          {child.child_name || child.name}
        </Text>

        {selectedChild?.id === child.id && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#5B3FF4"
          />
        )}
      </AnimatedPressable>
    ))}

    <AnimatedPressable
      style={styles.addChildButton}
      onPress={() => router.push('/onboarding/add-child')}
    >
      <Ionicons
        name="add-circle-outline"
        size={18}
        color="#5B3FF4"
      />

      <Text style={styles.addChildText}>
        Add Child
      </Text>
    </AnimatedPressable>
  </View>
)}

    <Text style={styles.topHeroTitle}>{greetingCopy.title}</Text>

    <Text style={styles.topHeroMessage}>
  {selectedChild
    ? `${greetingCopy.message} Today’s plan is ready for ${childName}.`
    : 'Set up your first child profile to begin.'}
</Text>

    <Image
  source={greetingCopy.image}
  style={styles.heroImage}
  resizeMode="cover"
/>
  </View>
</FadeInView>

        <FadeInView delay={130}>
          <AnimatedPressable
            style={styles.lessonCard}
            onPress={() =>
              selectedChild
                ? hasAssessment
                  ? router.push('/daily-lessons')
                  : router.push('/onboarding/assessment')
                : router.push('/onboarding/add-child')
            }
          >
            <View style={styles.lessonGlow} />

            <View style={styles.lessonTopRow}>
              <View style={styles.lessonIcon}>
                <Ionicons name="sparkles" size={20} color="#5B3FF4" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.lessonLabel}>
                  {!selectedChild
                    ? 'Start Here'
                    : hasAssessment
                      ? 'Today’s Lesson'
                      : 'Assessment Needed'}
                </Text>

                <Text style={styles.lessonTitle}>
                  {!selectedChild
                    ? 'Create a Child Profile'
                    : hasAssessment
                      ? `Start ${childName}'s Lesson`
                      : 'Complete Your Assessment'}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </View>

            <Text style={styles.lessonText}>
              {!selectedChild
                ? 'Add a child profile so lessons, PECS tools, worksheets, and supports can be personalized.'
                : hasAssessment
                  ? 'Open today’s personalized lesson and keep progress moving in a simple, guided way.'
                  : 'Finish the assessment so ABA at Home can personalize recommendations.'}
            </Text>
          </AnimatedPressable>
        </FadeInView>

        {selectedChild && showToiletTraining ? (
  <FadeInView delay={175}>
    <AnimatedPressable
      style={styles.toiletTrainingMiniCard}
      onPress={() => router.push('/toilet-training')}
    >
      <View style={styles.toiletMiniIconWrap}>
        <Ionicons name="water-outline" size={22} color="#2563EB" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.toiletMiniTitle}>Toilet Training</Text>
        <Text style={styles.toiletMiniSubtitle}>
          Potty logs, visual steps, and schedules
        </Text>
      </View>

      <AnimatedPressable
        style={styles.hideToiletButton}
        onPress={(event: any) => {
          event?.stopPropagation?.();
          hideToiletTrainingFromHome();
        }}
      >
        <Ionicons name="close" size={17} color="#2563EB" />
      </AnimatedPressable>

      <Ionicons name="chevron-forward" size={21} color="#2563EB" />
    </AnimatedPressable>
  </FadeInView>
) : null}

        <FadeInView delay={230}>
          <Text style={styles.sectionTitle}>Parent & Learning Tools</Text>

          <View style={styles.toolList}>
            <ToolCard
              icon="heart-circle-outline"
              title="Parent Support"
              subtitle="Caregiver tools, Parent Wins, journaling, and encouragement."
              color="#7C3AED"
              bg="#F5F3FF"
              border="#DDD6FE"
              onPress={() => router.push('/parent-support')}
            />

            <ToolCard
              icon="leaf-outline"
              title="Calm Down Toolkit"
              subtitle="Quick regulation supports for stressful moments."
              color="#0F766E"
              bg="#ECFDF5"
              border="#A7F3D0"
              onPress={() => router.push('/calm-down')}
            />

            <ToolCard
              icon="color-palette-outline"
              title="Activities"
              subtitle="Fun at-home learning ideas for daily practice."
              color="#EA580C"
              bg="#FFF7ED"
              border="#FED7AA"
              onPress={() => router.push('/activities')}
            />

            <ToolCard
              icon="document-text-outline"
              title="Worksheets"
              subtitle="Printable practice pages for learning and routines."
              color="#DB2777"
              bg="#FDF2F8"
              border="#FBCFE8"
              onPress={() => router.push('/worksheets')}
            />

            <ToolCard
              icon="play-circle-outline"
              title="Videos"
              subtitle="Watch-and-learn supports for caregivers and children."
              color="#2563EB"
              bg="#EFF6FF"
              border="#BFDBFE"
              onPress={() => router.push('/videos')}
            />
          </View>
        </FadeInView>
           <FadeInView delay={230}>
  <DropdownSection
    title="Family Tools"
    subtitle="Caregiver tools and shortcuts"
    open={quickAccessOpen}
    onPress={() => setQuickAccessOpen((current) => !current)}
  >
    <DropdownItem
      icon="book-outline"
      label="Daily Lessons"
      onPress={() => router.push('/daily-lessons')}
    />

    <DropdownItem
      icon="calendar-outline"
      label="Routine"
      onPress={() => router.push('/routines')}
    />

    <DropdownItem
      icon="chatbubbles-outline"
      label="Communication"
      onPress={() => router.push('/communication')}
    />

    <DropdownItem
      icon="people-outline"
      label="Parent Wins"
      onPress={() => router.push('/parent-support/parent-wins')}
    />
  </DropdownSection>
</FadeInView>

        <FadeInView delay={280}>
          <DropdownSection
            title="Resource Library"
            subtitle="Guides and extra support"
            open={libraryOpen}
            onPress={() => setLibraryOpen((current) => !current)}
          >
            <DropdownItem
              icon="library-outline"
              label="Resource Library"
              onPress={() => router.push('/resources')}
            />
          </DropdownSection>
        </FadeInView>

        {showWeeklyProgress ? (
          <FadeInView delay={330}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
               <Ionicons
  name="trending-up-outline"
  size={18}
  color="#0F766E"
/>
                <Text style={styles.progressTitle}>Weekly Check-In</Text>
              </View>

              <Text style={styles.progressText}>
                Small steps count. One lesson, one calming moment, or one successful communication is progress.
              </Text>

              <AnimatedPressable
                style={styles.progressDismiss}
                onPress={dismissWeeklyProgress}
              >
                <Text style={styles.progressDismissText}>Got it</Text>
              </AnimatedPressable>
            </View>
          </FadeInView>
        ) : null}
            </ScrollView>
    </SafeAreaView>
  );
}

function ToolCard({
  icon,
  title,
  subtitle,
  bg,
  color,
  border,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  bg: string;
  color: string;
  border: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      style={[styles.toolCard, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
    >
      <View style={styles.toolLeft}>
        <View style={styles.toolIconWrap}>
          <Ionicons name={icon} size={26} color={color} />
        </View>

        <View style={styles.toolTextWrap}>
          <Text style={[styles.toolTitle, { color }]}>{title}</Text>
          <Text style={styles.toolSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color={color} />
    </AnimatedPressable>
  );
}

function DropdownSection({
  title,
  subtitle,
  open,
  onPress,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.dropdownCard}>
      <AnimatedPressable style={styles.dropdownHeader} onPress={onPress}>
        <View>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <Text style={styles.dropdownSubtitle}>{subtitle}</Text>
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#4F46E5"
        />
      </AnimatedPressable>

      {open ? <View style={styles.dropdownBody}>{children}</View> : null}
    </View>
  );
}

function DropdownItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable style={styles.dropdownItem} onPress={onPress}>
      <Ionicons name={icon} size={19} color="#4F46E5" />
      <Text style={styles.dropdownItemText}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: '#F7F8FC',
},

  scrollContent: {
  paddingHorizontal: 20,
  paddingBottom: 190,
},

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

 childSummaryCard: {
  backgroundColor: 'rgba(255,255,255,0.94)',
  borderRadius: 26,
  padding: 14,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.9)',
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
},

 lessonCard: {
  overflow: 'hidden',
  backgroundColor: '#5B3FF4',
  borderRadius: 28,
  padding: 22,
  marginBottom: 20,
  shadowColor: '#5B3FF4',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.2,
  shadowRadius: 16,
  elevation: 4,
},

lessonTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 9,
},

lessonIcon: {
  width: 46,
  height: 46,
  borderRadius: 17,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 11,
},

lessonLabel: {
  color: '#DDD6FE',
  fontSize: 11,
  fontWeight: '900',
  marginBottom: 3,
},

lessonTitle: {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: '900',
},

lessonText: {
  color: '#EDE9FE',
  fontSize: 12,
  lineHeight: 18,
  fontWeight: '700',
},

  lessonGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -70,
    right: -50,
},

  sectionTitle: {
  fontSize: 19,
  fontWeight: '900',
  color: '#0F172A',
  marginBottom: 12,
},

  toolList: {
    gap: 14,
    marginBottom: 20,
  },

 toolCard: {
  borderRadius: 30,
  padding: 16,
  borderWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.04,
  shadowRadius: 14,
  elevation: 2,
},

toolIconWrap: {
  width: 76,
  height: 76,
  borderRadius: 26,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

  toolLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  toolTextWrap: {
    flex: 1,
  },

 toolTitle: {
  fontSize: 16,
  fontWeight: '900',
  marginBottom: 3,
},

toolSubtitle: {
  color: '#475569',
  fontSize: 12.5,
  lineHeight: 18,
  fontWeight: '700',
},

  dropdownCard: {
  backgroundColor: 'rgba(255,255,255,0.94)',
  borderRadius: 30,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.9)',
  marginBottom: 16,
  overflow: 'hidden',

  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.05,
  shadowRadius: 16,
  elevation: 3,
},

  dropdownHeader: {
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  dropdownSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  dropdownBody: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },

  dropdownItemText: {
    flex: 1,
    marginLeft: 10,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },

 progressCard: {
  backgroundColor: '#ECFDF5',
  borderRadius: 28,
  padding: 16,
  borderWidth: 1,
  borderColor: '#A7F3D0',

  shadowColor: '#10B981',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
},

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressTitle: {
    marginLeft: 8,
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '900',
  },

  progressText: {
  color: '#115E59',
  fontSize: 12,
  lineHeight: 18,
  fontWeight: '700',
},

  progressDismiss: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },

  progressDismissText: {
    color: '#0F766E',
    fontWeight: '900',
    fontSize: 12,
  },

  screenGlowTop: {
  position: 'absolute',
  width: 260,
  height: 260,
  borderRadius: 130,
  backgroundColor: 'rgba(99,102,241,0.07)',
  top: -120,
  right: -80,
},

screenGlowMiddle: {
  position: 'absolute',
  width: 220,
  height: 220,
  borderRadius: 110,
  backgroundColor: 'rgba(14,165,233,0.05)',
  top: 320,
  left: -120,
},

screenGlowBottom: {
  position: 'absolute',
  width: 260,
  height: 260,
  borderRadius: 130,
  backgroundColor: 'rgba(168,85,247,0.05)',
  bottom: -120,
  right: -100,
},

floatingBackgroundOrb: {
  position: 'absolute',
  width: 320,
  height: 320,
  borderRadius: 160,
  backgroundColor: 'rgba(91,63,244,0.06)',
  top: -140,
  left: -120,
},
topHeroHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 18,
  zIndex: 2,
},

topHeroGlowOne: {
  position: 'absolute',
  width: 190,
  height: 190,
  borderRadius: 95,
  backgroundColor: 'rgba(124,58,237,0.10)',
  right: -70,
  top: -60,
},

topHeroGlowTwo: {
  position: 'absolute',
  width: 150,
  height: 150,
  borderRadius: 75,
  backgroundColor: 'rgba(96,165,250,0.12)',
  left: -55,
  bottom: -70,
},


topHeroCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#F3EEFF',
  borderRadius: 34,
  padding: 20,
  minHeight: 365,
  marginTop: 2,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#E9D5FF',
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 22,
  elevation: 4,
  paddingBottom: 14,
},

topHeroIcon: {
  width: 42,
  height: 42,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
},

topHeroTitle: {
  fontSize: 32,
  lineHeight: 36,
  fontWeight: '900',
  color: '#0F172A',
  letterSpacing: -1,
},

topHeroMessage: {
  marginTop: 7,
  fontSize: 14,
  lineHeight: 21,
  fontWeight: '800',
  color: '#4F46E5',
},

heroImage: {
  width: '100%',
  height: 180,
  borderRadius: 24,
  marginTop: 10,
},

logoutGlassButton: {
  width: 44,
  height: 44,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 2,
},

featuredCalmCard: {
  backgroundColor: '#ECFDF5',
  borderRadius: 32,
  padding: 18,
  borderWidth: 1,
  borderColor: '#A7F3D0',
  marginBottom: 20,
  flexDirection: 'row',
  alignItems: 'center',
  shadowColor: '#10B981',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 4,
},

featuredCalmText: {
  flex: 1,
},

featuredEyebrow: {
  color: '#047857',
  fontSize: 12,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 5,
},

featuredCalmTitle: {
  color: '#064E3B',
  fontSize: 23,
  fontWeight: '900',
  marginBottom: 6,
},

featuredCalmSubtitle: {
  color: '#047857',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '800',
},

featuredCalmIllustration: {
  width: 86,
  height: 86,
  borderRadius: 28,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginHorizontal: 12,
},

heroBadge: {
  alignSelf: 'flex-start',
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 999,
  marginBottom: 12,
  zIndex: 3,
},

heroBadgeText: {
  color: '#6D28D9',
  fontWeight: '800',
  fontSize: 14,
},

childSelectorCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  paddingVertical: 6,
  marginBottom: 14,

  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 6,
  },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
},

childSelectorItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',

  paddingHorizontal: 16,
  paddingVertical: 12,
},

childSelectorName: {
  fontSize: 15,
  fontWeight: '700',
  color: '#0F172A',
},

addChildButton: {
  flexDirection: 'row',
  alignItems: 'center',

  paddingHorizontal: 16,
  paddingVertical: 12,

  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
},

addChildText: {
  marginLeft: 8,
  color: '#5B3FF4',
  fontWeight: '800',
},

toiletTrainingCard: {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#EFF6FF',
  borderRadius: 30,
  padding: 18,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  marginBottom: 22,
  shadowColor: '#2563EB',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 18,
  elevation: 4,
},

toiletGlow: {
  position: 'absolute',
  width: 160,
  height: 160,
  borderRadius: 80,
  backgroundColor: 'rgba(37,99,235,0.08)',
  right: -50,
  top: -55,
},

toiletCardTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},

toiletIconWrap: {
  width: 62,
  height: 62,
  borderRadius: 23,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 13,
},

toiletEyebrow: {
  color: '#1D4ED8',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 0.5,
  marginBottom: 3,
},
toiletTitle: {
  color: '#0F172A',
  fontSize: 23,
  fontWeight: '900',
},

toiletSubtitle: {
  color: '#334155',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
  marginBottom: 13,
},

toiletChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

toiletChip: {
  backgroundColor: '#FFFFFF',
  borderRadius: 999,
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderWidth: 1,
  borderColor: '#DBEAFE',
},

toiletChipText: {
  color: '#2563EB',
  fontSize: 11,
  fontWeight: '900',
},

hideToiletButton: {
  width: 34,
  height: 34,
  borderRadius: 14,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 8,
  borderWidth: 1,
  borderColor: '#DBEAFE',
},

toiletTrainingMiniCard: {
  backgroundColor: '#EFF6FF',
  borderRadius: 24,
  padding: 14,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  marginBottom: 18,
  flexDirection: 'row',
  alignItems: 'center',
  shadowColor: '#2563EB',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 3,
},

toiletMiniIconWrap: {
  width: 52,
  height: 52,
  borderRadius: 18,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

toiletMiniTitle: {
  color: '#0F172A',
  fontSize: 16,
  fontWeight: '900',
},

toiletMiniSubtitle: {
  color: '#475569',
  fontSize: 12.5,
  fontWeight: '700',
  marginTop: 3,
  lineHeight: 17,
},
});