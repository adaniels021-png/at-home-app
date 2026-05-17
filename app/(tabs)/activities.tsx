import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import {
  DailyActivity,
  buildActivityId,
  getTimeGreeting,
  getTodayLocalDateString,
  normalizeActivities,
  safePregenerateActivityQueue,
  safeStringArray
} from '../../lib/activities';
import { generateDailyABAActivities } from '../../lib/aiService';
import { supabase } from '../../lib/supabase';

import {
  getNextActivitiesFromQueue
} from '../../lib/aiService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

function buildInstantActivities(childName: string): DailyActivity[] {
  return normalizeActivities([
    {
      name: 'Requesting Practice',
      materials: ['Preferred toy or snack', 'PECS card or gesture support'],
      instructions: [
        `Place a preferred item near ${childName}.`,
        'Pause and wait for your child to request it.',
        'Accept pointing, words, signs, or PECS.',
        'Give the item right away and praise the request.',
      ],
      success_criteria: 'Child requests an item 3 times with support.',
    },
    {
      name: 'Clean-Up Match',
      materials: ['Toys', 'Toy bin'],
      instructions: [
        'Place 2 or 3 toys on the floor.',
        'Give the direction, “Put in.”',
        'Model placing one toy in the bin.',
        'Praise each attempt, even with help.',
      ],
      success_criteria: 'Child helps clean up 2 items with support.',
    },
    {
      name: 'Follow One-Step Directions',
      materials: ['Favorite item', 'Simple household objects'],
      instructions: [
        'Choose one simple direction like “give me,” “sit down,” or “come here.”',
        'Say the direction one time.',
        'Wait 3 to 5 seconds.',
        'Prompt if needed and praise success.',
      ],
      success_criteria: 'Child follows 3 one-step directions with support.',
    },
  ]);
}

function getActivityAccent(index: number) {
  const accents = [
    {
      border: '#C7D2FE',
      icon: '#4F46E5',
      chipBg: '#E0E7FF',
      soft: '#F8FAFF',
    },
    {
      border: '#A7F3D0',
      icon: '#10B981',
      chipBg: '#D1FAE5',
      soft: '#F7FFFB',
    },
    {
      border: '#FED7AA',
      icon: '#EA580C',
      chipBg: '#FFEDD5',
      soft: '#FFFDFC',
    },
  ];

  return accents[index % accents.length];
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();

  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  const todayLabel = useMemo(() => getTodayLocalDateString(), []);
  const greeting = useMemo(() => getTimeGreeting(), []);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const visibleActivities = useMemo(() => {
    return isPro ? activities : activities.slice(0, 1);
  }, [activities, isPro]);

  const lockedActivities = !isPro && activities.length > 1;

  const loadSavedActivityState = useCallback(
    async (activityList: DailyActivity[]) => {
      if (!selectedChild?.id || activityList.length === 0) {
        setSavedIds([]);
        setFavoriteIds([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('saved_activities')
          .select('activity_name, is_saved, is_favorite')
          .eq('child_id', selectedChild.id)
          .eq('activity_date', getTodayLocalDateString());

        if (error) throw error;

        const saved: string[] = [];
        const favorites: string[] = [];

        (data || []).forEach((row: any) => {
          const matchingIndex = activityList.findIndex(
            (activity) => activity.name === row.activity_name
          );

          if (matchingIndex >= 0) {
            const id = buildActivityId(activityList[matchingIndex], matchingIndex);
            if (row.is_saved) saved.push(id);
            if (row.is_favorite) favorites.push(id);
          }
        });

        setSavedIds(saved);
        setFavoriteIds(favorites);
      } catch (error) {
        console.error('Load saved activity state error:', error);
      }
    },
    [selectedChild?.id]
  );

  const saveActivitiesForToday = useCallback(
    async (activityList: DailyActivity[]) => {
      if (!selectedChild?.id) return;

      const { error } = await supabase.from('daily_fun_activities').upsert(
        [
          {
            child_id: selectedChild.id,
            activity_date: getTodayLocalDateString(),
            activities_json: activityList,
          },
        ],
        { onConflict: 'child_id,activity_date' }
      );

      if (error) {
        console.error('Daily activities save error:', error);
      }
    },
    [selectedChild?.id]
  );

  const upsertSavedActivity = useCallback(
    async (
      activity: DailyActivity,
      updates: {
        is_saved?: boolean;
        is_favorite?: boolean;
      }
    ) => {
      if (!selectedChild?.id) return;

      const { error } = await supabase.from('saved_activities').upsert(
        [
          {
            child_id: selectedChild.id,
            activity_date: getTodayLocalDateString(),
            activity_name: activity.name,
            activity_json: activity,
            ...updates,
          },
        ],
        {
          onConflict: 'child_id,activity_date,activity_name',
        }
      );

      if (error) throw error;
    },
    [selectedChild?.id]
  );

  const loadActivities = useCallback(
    async (forceRefresh = false) => {
      if (!selectedChild?.id) {
        setActivities([]);
        setSavedIds([]);
        setFavoriteIds([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
  const instantActivities = buildInstantActivities(childName);

  if (!forceRefresh) {
    setActivities(instantActivities);
    setCurrentIndex(0);
    setLoading(false);
  }

  const today = getTodayLocalDateString();

        if (!forceRefresh) {
          const { data: existing, error: existingError } = await supabase
            .from('daily_fun_activities')
            .select('activities_json')
            .eq('child_id', selectedChild.id)
            .eq('activity_date', today)
            .maybeSingle();

          if (existingError) throw existingError;

          if (Array.isArray(existing?.activities_json)) {
            const existingActivities = normalizeActivities(existing.activities_json);
            setActivities(existingActivities);
            setCurrentIndex(0);
            await loadSavedActivityState(existingActivities);
            return;
          }
        }

        const queuedActivities = await getNextActivitiesFromQueue({
          childId: selectedChild.id,
        });

        if (queuedActivities?.length) {
          setActivities(queuedActivities);
          setCurrentIndex(0);
          await saveActivitiesForToday(queuedActivities);
          await loadSavedActivityState(queuedActivities);

          void safePregenerateActivityQueue({
            childId: selectedChild.id,
            childName,
          });

          return;
        }

        const [assessmentRes, lessonsRes, routinesRes] = await Promise.all([
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
            .from('routine_logs')
            .select('routine_name, routine_period, completed_at, completed')
            .eq('child_id', selectedChild.id)
            .order('completed_at', { ascending: false })
            .limit(10),
        ]);

        if (assessmentRes.error) throw assessmentRes.error;
        if (lessonsRes.error) throw lessonsRes.error;
        if (routinesRes.error) throw routinesRes.error;

        const activitiesFromAI = await generateDailyABAActivities({
          childName,
          location: 'Home',
          skillFocus: 'Communication, play, routines, and daily living',
          assessmentContext: assessmentRes.data?.responses || {},
          recentLessons: lessonsRes.data || [],
          recentRoutines: routinesRes.data || [],
          count: 3,
        });

        const safeActivities = normalizeActivities(activitiesFromAI);

        setActivities(safeActivities);
        setCurrentIndex(0);

        await saveActivitiesForToday(safeActivities);
        await loadSavedActivityState(safeActivities);

        void safePregenerateActivityQueue({
          childId: selectedChild.id,
          childName,
        });
      } catch (error: any) {
        console.error('Load suggested activities error:', error);
        Alert.alert(
          'Activity Error',
          error?.message || 'Could not load suggested activities.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      childName,
      selectedChild?.id,
      loadSavedActivityState,
      saveActivitiesForToday,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      void loadActivities(false);
    }, [loadActivities])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities(true);
  };

  const toggleSaved = async (activity: DailyActivity, activityId: string) => {
    const alreadySaved = savedIds.includes(activityId);
    const nextSaved = !alreadySaved;

    setSavedIds((prev) =>
      alreadySaved ? prev.filter((id) => id !== activityId) : [...prev, activityId]
    );

    try {
      await upsertSavedActivity(activity, { is_saved: nextSaved });
    } catch (error) {
      console.error('Toggle saved error:', error);
      setSavedIds((prev) =>
        nextSaved ? prev.filter((id) => id !== activityId) : [...prev, activityId]
      );
      Alert.alert('Save Error', 'Could not update saved activity.');
    }
  };

  const toggleFavorite = async (activity: DailyActivity, activityId: string) => {
    const alreadyFavorite = favoriteIds.includes(activityId);
    const nextFavorite = !alreadyFavorite;

    setFavoriteIds((prev) =>
      alreadyFavorite ? prev.filter((id) => id !== activityId) : [...prev, activityId]
    );

    try {
      await upsertSavedActivity(activity, {
        is_saved: true,
        is_favorite: nextFavorite,
      });

      if (nextFavorite) {
        setSavedIds((prev) =>
          prev.includes(activityId) ? prev : [...prev, activityId]
        );
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      setFavoriteIds((prev) =>
        nextFavorite ? prev.filter((id) => id !== activityId) : [...prev, activityId]
      );
      Alert.alert('Favorite Error', 'Could not update favorite activity.');
    }
  };

  const regenerateActivity = async (index: number) => {
    if (!selectedChild?.id) return;

    if (!isPro) {
      router.push('/subscription');
      return;
    }

    setRegeneratingIndex(index);

    try {
      const generated = await generateDailyABAActivities({
        childName,
        location: 'Home',
        skillFocus:
          'Create one fresh ABA activity with clear parent instructions, home materials, and a short success goal.',
        count: 1,
      });

      const newActivity = normalizeActivities(generated)[0];

      if (!newActivity) {
        Alert.alert('Regenerate Error', 'Could not create a new activity.');
        return;
      }

      const updatedActivities = [...activities];
      updatedActivities[index] = newActivity;

      setActivities(updatedActivities);
      await saveActivitiesForToday(updatedActivities);
      await loadSavedActivityState(updatedActivities);
    } catch (error: any) {
      console.error('Regenerate activity error:', error);
      Alert.alert(
        'Regenerate Error',
        error?.message || 'Could not regenerate this activity.'
      );
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleHorizontalScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / CARD_WIDTH);
    setCurrentIndex(index);
  };

  const scrollToCard = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * CARD_WIDTH, animated: true });
    setCurrentIndex(index);
  };

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="happy-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Child Selected</Text>
          <Text style={styles.emptyText}>
            Select or create a child profile to see personalized suggested activities.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && activities.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading suggested activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentActivity = visibleActivities[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>PERSONALIZED DAILY IDEAS</Text>
            </View>

            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={styles.savedBtn}
                onPress={() => router.push('/(tabs)/saved')}
              >
                <Ionicons name="bookmark-outline" size={16} color="#FFFFFF" />
                <Text style={styles.savedBtnText}>Saved</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.heroGreeting}>{greeting}</Text>
          <Text style={styles.heroTitle}>Suggested Activities</Text>
          <Text style={styles.heroSubtitle}>
            Fresh ideas for {childName}, based on recent progress, routines, and
            support needs.
          </Text>
          <Text style={styles.heroDate}>{todayLabel}</Text>
        </View>

        <View style={styles.feedHeaderRow}>
          <View>
            <Text style={styles.feedTitle}>Today&apos;s feed</Text>
            <Text style={styles.feedSubtitle}>
              Swipe through activity cards for today
            </Text>
          </View>

          <View style={styles.feedMetaChip}>
            <Ionicons name="albums-outline" size={14} color="#4F46E5" />
            <Text style={styles.feedMetaText}>{visibleActivities.length} cards</Text>
          </View>
        </View>

        {visibleActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={30} color="#94A3B8" />
            <Text style={styles.emptyCardTitle}>No suggested activities yet</Text>
            <Text style={styles.emptyCardText}>
              Pull down to refresh and generate a fresh set of personalized ideas.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={(ref) => {
                scrollRef.current = ref;
              }}
              horizontal
              pagingEnabled
              snapToInterval={CARD_WIDTH}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleHorizontalScroll}
              contentContainerStyle={styles.horizontalFeed}
            >
              {visibleActivities.map((activity, index) => {
                const accent = getActivityAccent(index);
                const activityId = buildActivityId(activity, index);
                const isSaved = savedIds.includes(activityId);
                const isFavorite = favoriteIds.includes(activityId);

                return (
                  <View
                    key={activityId}
                    style={[
                      styles.feedCard,
                      {
                        width: CARD_WIDTH,
                        backgroundColor: accent.soft,
                        borderColor: accent.border,
                      },
                    ]}
                  >
                    <View style={styles.feedCardTop}>
                      <View
                        style={[
                          styles.feedIndexBadge,
                          { backgroundColor: accent.chipBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.feedIndexBadgeText,
                            { color: accent.icon },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View style={styles.feedTopActions}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => void toggleFavorite(activity, activityId)}
                        >
                          <Ionicons
                            name={isFavorite ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isFavorite ? '#EF4444' : '#64748B'}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => void toggleSaved(activity, activityId)}
                        >
                          <Ionicons
                            name={isSaved ? 'bookmark' : 'bookmark-outline'}
                            size={20}
                            color={isSaved ? '#4F46E5' : '#64748B'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.feedCardTitle}>{activity.name}</Text>
                    <Text style={styles.feedCardSubTitle}>Suggested for today</Text>

                    <TouchableOpacity
                      style={[
                        styles.regenerateActivityBtn,
                        !isPro && styles.regenerateActivityBtnDisabled,
                      ]}
                      onPress={() => void regenerateActivity(index)}
                      disabled={regeneratingIndex === index}
                    >
                      {regeneratingIndex === index ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                      ) : (
                        <>
                          <Ionicons
                            name={isPro ? 'refresh-outline' : 'lock-closed-outline'}
                            size={16}
                            color={isPro ? '#4F46E5' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.regenerateActivityText,
                              !isPro && styles.regenerateActivityTextDisabled,
                            ]}
                          >
                            {isPro ? 'Regenerate activity' : 'Regenerate with Pro'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <View style={styles.feedSection}>
                      <Text style={styles.feedSectionTitle}>Materials</Text>
                      {safeStringArray(activity.materials).map((item, idx) => (
                        <Text key={idx} style={styles.feedBullet}>
                          • {item}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.feedSection}>
                      <Text style={styles.feedSectionTitle}>Instructions</Text>
                      {safeStringArray(activity.instructions).map((step, idx) => (
                        <Text key={idx} style={styles.feedBullet}>
                          {idx + 1}. {step}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.successBox}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#16A34A"
                      />
                      <Text style={styles.successText}>
                        {activity.success_criteria ||
                          'Complete the activity with support.'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.paginationRow}>
              {visibleActivities.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => scrollToCard(index)}
                  style={[
                    styles.paginationDot,
                    currentIndex === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>

            {lockedActivities && (
              <TouchableOpacity
                style={styles.lockedCard}
                onPress={() => router.push('/subscription')}
              >
                <Ionicons name="lock-closed-outline" size={28} color="#7C3AED" />
                <Text style={styles.lockedTitle}>Unlock More Activities</Text>
                <Text style={styles.lockedText}>
                  Get full daily activities, unlimited regenerations, saved favorites,
                  and smarter personalization with Pro.
                </Text>
              </TouchableOpacity>
            )}

            {currentActivity ? (
              <View style={styles.quickActionsCard}>
                <Text style={styles.quickActionsTitle}>Quick actions</Text>

                <View style={styles.quickActionsRow}>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() =>
                      void toggleFavorite(
                        currentActivity,
                        buildActivityId(currentActivity, currentIndex)
                      )
                    }
                  >
                    <Ionicons
                      name={
                        favoriteIds.includes(
                          buildActivityId(currentActivity, currentIndex)
                        )
                          ? 'heart'
                          : 'heart-outline'
                      }
                      size={18}
                      color="#EF4444"
                    />
                    <Text style={styles.quickActionText}>Favorite</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() =>
                      void toggleSaved(
                        currentActivity,
                        buildActivityId(currentActivity, currentIndex)
                      )
                    }
                  >
                    <Ionicons
                      name={
                        savedIds.includes(buildActivityId(currentActivity, currentIndex))
                          ? 'bookmark'
                          : 'bookmark-outline'
                      }
                      size={18}
                      color="#4F46E5"
                    />
                    <Text style={styles.quickActionText}>Save</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => router.push('/(tabs)/saved')}
                  >
                    <Ionicons name="albums-outline" size={18} color="#4F46E5" />
                    <Text style={styles.quickActionText}>Open Saved</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickActionBtn} onPress={handleRefresh}>
                    <Ionicons name="refresh-outline" size={18} color="#10B981" />
                    <Text style={styles.quickActionText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={18} color="#D97706" />
          <Text style={styles.tipText}>
            These suggested activities are refreshed using your child&apos;s latest
            assessment, lesson history, and routine patterns to stay relevant and
            supportive.
          </Text>
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

  pageContent: {
    padding: 20,
    paddingBottom: 40,
  },

  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.4,
  },

  savedBtn: {
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },

  savedBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroGreeting: {
    marginTop: 14,
    color: '#C7D2FE',
    fontSize: 13,
    fontWeight: '700',
  },

  heroTitle: {
    marginTop: 4,
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  heroSubtitle: {
    marginTop: 8,
    color: '#E0E7FF',
    lineHeight: 20,
  },

  heroDate: {
    marginTop: 10,
    color: '#C7D2FE',
    fontWeight: '700',
    fontSize: 12,
  },

  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  feedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  feedSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '600',
  },

  feedMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  feedMetaText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },

  horizontalFeed: {
    paddingRight: 0,
  },

  feedCard: {
    borderRadius: 24,
    padding: 18,
    marginRight: 12,
    borderWidth: 1.5,
  },

  feedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  feedIndexBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedIndexBadgeText: {
    fontWeight: '800',
  },

  feedTopActions: {
    flexDirection: 'row',
    gap: 8,
  },

  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  feedCardTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },

  feedCardSubTitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  regenerateActivityBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  regenerateActivityBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },

  regenerateActivityText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },

  regenerateActivityTextDisabled: {
    color: '#94A3B8',
  },

  feedSection: {
    marginTop: 16,
  },

  feedSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },

  feedBullet: {
    color: '#475569',
    lineHeight: 22,
    marginBottom: 5,
    fontWeight: '600',
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
  },

  successText: {
    flex: 1,
    marginLeft: 8,
    color: '#166534',
    lineHeight: 20,
    fontWeight: '700',
  },

  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
    gap: 8,
  },

  paginationDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#CBD5E1',
  },

  paginationDotActive: {
    width: 24,
    backgroundColor: '#4F46E5',
  },

  lockedCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },

  lockedTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#5B21B6',
    textAlign: 'center',
  },

  lockedText: {
    marginTop: 8,
    color: '#6D28D9',
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },

  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  quickActionsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  quickActionText: {
    marginLeft: 6,
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },

  emptyCardTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },

  emptyCardText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },

  tipCard: {
    marginTop: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  tipText: {
    flex: 1,
    marginLeft: 8,
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '700',
  },
});