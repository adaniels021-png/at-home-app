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
import { getRecommendedActivitiesFromLibrary } from '../../lib/activityLibrary';

import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import {
  DailyActivity,
  buildActivityId,
  getTimeGreeting,
  getTodayLocalDateString,
  normalizeActivities,
  safeStringArray,
} from '../../lib/activities';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

type AdventureCategory =
  | 'home'
  | 'outdoor'
  | 'community'
  | 'sensory'
  | 'creative'
  | 'calm'
  | 'movement'
  | 'surprise';

type AdventureFeedback = 'loved' | 'good' | 'not_today';

type DailyAdventure = DailyActivity & {
  title?: string;
  name: string;
  category?: AdventureCategory | string;
  location?: string;
  time?: string;
  description?: string;
  try_this?: string[];
  tryThis?: string[];
  why_it_helps?: string;
  whyItHelps?: string;
};

const FILTERS: {
  id: AdventureCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'surprise', label: 'Surprise Me', icon: 'sparkles-outline' },
  { id: 'home', label: 'At Home', icon: 'home-outline' },
  { id: 'outdoor', label: 'Outdoor', icon: 'leaf-outline' },
  { id: 'community', label: 'Community', icon: 'car-outline' },
  { id: 'calm', label: 'Calm', icon: 'moon-outline' },
  { id: 'movement', label: 'Active', icon: 'walk-outline' },
];

const LOCATION_MAP: Record<AdventureCategory, string> = {
  home: 'Home',
  outdoor: 'Outdoor',
  community: 'Community',
  sensory: 'Sensory play',
  creative: 'Creative play',
  calm: 'Calm and quiet play',
  movement: 'Movement and active play',
  surprise: 'Home, outdoor, or community',
};

function buildInstantActivities(childName: string): DailyAdventure[] {
  return normalizeActivities([
    {
      name: 'Bubble Chase',
      title: 'Bubble Chase',
      category: 'outdoor',
      location: 'Backyard, park, or sidewalk',
      time: '5–10 minutes',
      description:
        'Blow bubbles and turn it into a playful chase, pop, and laugh adventure.',
      try_this: [
        `Let ${childName} pop bubbles with hands, feet, or a wand.`,
        'Pause before blowing more bubbles to encourage communication.',
        'Try big bubbles, tiny bubbles, fast bubbles, and slow bubbles.',
      ],
      why_it_helps:
        'Supports movement, shared attention, communication, and joyful connection through play.',
      materials: [],
      instructions: [],
      success_criteria: '',
    },
    {
      name: 'Toy Rescue Mission',
      title: 'Toy Rescue Mission',
      category: 'home',
      location: 'Living room or play area',
      time: '5 minutes',
      description:
        'Pretend toys are stuck around the room and need help getting back home.',
      try_this: [
        'Pick 3–5 toys to “rescue.”',
        'Give each toy a silly voice or sound.',
        'Celebrate when each toy makes it back to its basket, shelf, or bed.',
      ],
      why_it_helps:
        'Builds pretend play, clean-up routines, following directions, and cooperation without feeling like a chore.',
      materials: [],
      instructions: [],
      success_criteria: '',
    },
    {
      name: 'Grocery Store Helper',
      title: 'Grocery Store Helper',
      category: 'community',
      location: 'Grocery store or quick errand',
      time: '10–15 minutes',
      description:
        'Let your child be your special helper during a simple shopping trip.',
      try_this: [
        'Ask your child to help find one color, one fruit, or one box.',
        'Let them place a safe item in the cart.',
        'Praise helping, waiting, looking, or staying nearby.',
      ],
      why_it_helps:
        'Supports real-world language, attention, patience, and community participation.',
      materials: [],
      instructions: [],
      success_criteria: '',
    },
  ]) as DailyAdventure[];
}

function isLibraryActivitySet(
  activityList: DailyAdventure[]
): boolean {
  if (!Array.isArray(activityList) || activityList.length === 0) {
    return false;
  }

  return activityList.some((activity: any) => {
    return (
      activity?.source === 'library' ||
      Boolean(activity?.library_activity_id)
    );
  });
}

function getAdventureAccent(index: number) {
  const accents = [
    {
      border: '#DDD6FE',
      icon: '#7C3AED',
      chipBg: '#F3E8FF',
      soft: '#FFFBFF',
      emoji: '🌈',
    },
    {
      border: '#BBF7D0',
      icon: '#16A34A',
      chipBg: '#DCFCE7',
      soft: '#F7FFFB',
      emoji: '🌿',
    },
    {
      border: '#FED7AA',
      icon: '#EA580C',
      chipBg: '#FFEDD5',
      soft: '#FFFDFC',
      emoji: '🎲',
    },
  ];

  return accents[index % accents.length];
}

function getAdventureTitle(activity: DailyAdventure) {
  return activity.title || activity.name || 'Daily Adventure';
}

function getAdventureLocation(activity: DailyAdventure) {
  return activity.location || 'Home, outside, or in the community';
}

function getAdventureTime(activity: DailyAdventure) {
  return activity.time || '5–10 minutes';
}

function getAdventureDescription(activity: DailyAdventure) {
  return (
    activity.description ||
    'Try this playful activity together in a relaxed, low-pressure way.'
  );
}

function getAdventureTryThis(activity: DailyAdventure) {
  const custom = activity.try_this || activity.tryThis;
  const fallback = activity.instructions;
  const items = safeStringArray(custom?.length ? custom : fallback);

  return items.length
    ? items
    : [
        'Keep it playful and flexible.',
        'Follow your child’s interest.',
        'Celebrate small moments of connection.',
      ];
}

function getAdventureWhy(activity: DailyAdventure) {
  return (
    activity.why_it_helps ||
    activity.whyItHelps ||
    activity.success_criteria ||
    'Supports communication, attention, confidence, and connection through everyday play.'
  );
}

function getAdventureCategory(activity: DailyAdventure) {
  return (activity.category || 'surprise') as AdventureCategory;
}

function getCategoryLabel(category: string) {
  const cleanCategory = String(category || 'surprise')
    .toLowerCase()
    .split('|')[0]
    .trim();

  const labels: Record<string, string> = {
    home: 'At Home',
    outdoor: 'Outdoor',
    community: 'Community',
    sensory: 'Sensory',
    creative: 'Creative',
    calm: 'Calm',
    movement: 'Active',
    surprise: 'Surprise',
  };

  return labels[cleanCategory] || 'Adventure';
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();

  const [activities, setActivities] = useState<DailyAdventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<AdventureCategory>('surprise');
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(
    null
  );
  const [filterLoading, setFilterLoading] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const isMountedRef = useRef(true);
  const preloadingFiltersRef = useRef(false);
  const preloadStartedRef = useRef(false);
  const lastPreloadChildRef = useRef<string | null>(null);
  const filterRequestIdRef = useRef(0);

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
    async (activityList: DailyAdventure[]) => {
      if (!selectedChild?.id || activityList.length === 0) {
        setSavedIds([]);
        setFavoriteIds([]);
        setCompletedIds([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('saved_activities')
          .select('activity_name, is_saved, is_favorite, completed')
          .eq('child_id', selectedChild.id)
          .eq('activity_date', getTodayLocalDateString());

        if (error) throw error;
        if (!isMountedRef.current) return;

        const saved: string[] = [];
        const favorites: string[] = [];
        const completed: string[] = [];

        (data || []).forEach((row: any) => {
          const matchingIndex = activityList.findIndex(
            (activity) => activity.name === row.activity_name
          );

          if (matchingIndex >= 0) {
            const id = buildActivityId(activityList[matchingIndex], matchingIndex);
            if (row.is_saved) saved.push(id);
            if (row.is_favorite) favorites.push(id);
            if (row.completed) completed.push(id);
          }
        });

        setSavedIds(saved);
        setFavoriteIds(favorites);
        setCompletedIds(completed);
      } catch (error) {
        console.error('Load saved activity state error:', error);
      }
    },
    [selectedChild?.id]
  );

  const saveActivitiesForToday = useCallback(
    async (
      activityList: DailyAdventure[],
      filter: AdventureCategory = 'surprise'
    ) => {
      if (!selectedChild?.id) return;

      const { error } = await supabase.from('daily_fun_activities').upsert(
        [
          {
            child_id: selectedChild.id,
            activity_date: getTodayLocalDateString(),
            activity_filter: filter,
            activities_json: activityList,
          },
        ],
        { onConflict: 'child_id,activity_date,activity_filter' }
      );

      if (error) {
        console.error('Daily adventures save error:', error);
      }
    },
    [selectedChild?.id]
  );

  const upsertSavedActivity = useCallback(
    async (
      activity: DailyAdventure,
      updates: {
        is_saved?: boolean;
        is_favorite?: boolean;
        completed?: boolean;
        feedback?: AdventureFeedback;
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
        { onConflict: 'child_id,activity_date,activity_name' }
      );

      if (error) throw error;
    },
    [selectedChild?.id]
  );

  const getRecentAdventureTitles = useCallback(async () => {
    if (!selectedChild?.id) return [];

    try {
      const { data, error } = await supabase
        .from('daily_fun_activities')
        .select('activities_json')
        .eq('child_id', selectedChild.id)
        .order('activity_date', { ascending: false })
        .limit(10);

      if (error) throw error;

      const titles: string[] = [];

      (data || []).forEach((row: any) => {
        if (Array.isArray(row.activities_json)) {
          row.activities_json.forEach((activity: any) => {
            const title = activity?.title || activity?.name;
            if (title && !titles.includes(title)) titles.push(title);
          });
        }
      });

      return titles.slice(0, 30);
    } catch (error) {
      console.error('Recent adventure title load error:', error);
      return [];
    }
  }, [selectedChild?.id]);

const loadSavedTodayActivities = useCallback(
  async (
    filter: AdventureCategory = 'surprise'
  ): Promise<DailyAdventure[]> => {
    if (!selectedChild?.id) {
      return [];
    }

    const { data, error } = await supabase
      .from('daily_fun_activities')
      .select('activities_json')
      .eq('child_id', selectedChild.id)
      .eq(
        'activity_date',
        getTodayLocalDateString()
      )
      .eq('activity_filter', filter)
      .maybeSingle();

    if (error) {
      console.error(
        'Load saved today adventures error:',
        error
      );

      return [];
    }

    const normalized = normalizeActivities(
      data?.activities_json || []
    ) as DailyAdventure[];

    /*
     * Ignore old generic cached activities.
     *
     * Only reuse today's cache when it contains activities
     * pulled from the approved activity library.
     */
    if (
      normalized.length > 0 &&
      !isLibraryActivitySet(normalized)
    ) {
      console.log(
        'Ignoring old non-library adventure cache:',
        {
          filter,
          titles: normalized.map((activity) =>
            getAdventureTitle(activity)
          ),
        }
      );

      return [];
    }

    return normalized;
  },
  [selectedChild?.id]
);

const generateActivitiesForFilter = useCallback(
  async (
    filter: AdventureCategory,
    count: number,
    extraRecentTitles: string[] = []
  ): Promise<DailyAdventure[]> => {
    if (!selectedChild?.id) {
      return [];
    }

    const recentTitles =
      await getRecentAdventureTitles();

    const allRecentTitles = Array.from(
      new Set([
        ...recentTitles,
        ...extraRecentTitles,
      ])
    );

    console.log(
      'Loading Daily Adventures from library:',
      {
        filter,
        count,
        excludedCount: allRecentTitles.length,
      }
    );

    const libraryActivities =
      await getRecommendedActivitiesFromLibrary({
        filter,
        count,
        excludeTitles: allRecentTitles,
      });

    if (libraryActivities.length > 0) {
      const selected =
        libraryActivities.slice(
          0,
          count
        ) as DailyAdventure[];

      console.log(
        'Daily Adventures library results:',
        selected.map((activity: any) => ({
          title:
            activity.title ||
            activity.name,
          category: activity.category,
          location: activity.location,
          source: activity.source,
          libraryActivityId:
            activity.library_activity_id,
        }))
      );

      return selected;
    }

    console.warn(
      'No approved library activities matched:',
      {
        filter,
        excludedTitles: allRecentTitles,
      }
    );

    /*
     * Emergency offline fallback only.
     *
     * This should not normally appear when the approved
     * activity library contains matching records.
     */
    const fallbackActivities =
      buildInstantActivities(childName).filter(
        (activity) => {
          if (filter === 'surprise') {
            return true;
          }

          const category =
            getAdventureCategory(activity);

          if (filter === 'home') {
            return (
              category === 'home' ||
              String(
                activity.location || ''
              )
                .toLowerCase()
                .includes('home') ||
              String(
                activity.location || ''
              )
                .toLowerCase()
                .includes('living room')
            );
          }

          if (filter === 'outdoor') {
            return (
              category === 'outdoor' ||
              String(
                activity.location || ''
              )
                .toLowerCase()
                .includes('park') ||
              String(
                activity.location || ''
              )
                .toLowerCase()
                .includes('backyard')
            );
          }

          if (filter === 'community') {
            return (
              category === 'community' ||
              String(
                activity.location || ''
              )
                .toLowerCase()
                .includes('store') ||
              String(
                activity.location || ''
              )
                .toLowerCase()
                .includes('errand')
            );
          }

          return category === filter;
        }
      );

    return fallbackActivities
      .slice(0, count)
      .map((activity) => ({
        ...activity,
        source: 'offline-fallback',
      })) as DailyAdventure[];
  },
  [
    childName,
    getRecentAdventureTitles,
    selectedChild?.id,
  ]
);
  
  const preloadTodayAdventureFilters = useCallback(async () => {
    if (!selectedChild?.id || !isPro || preloadingFiltersRef.current) {
      return;
    }

    preloadingFiltersRef.current = true;

    try {
      const filtersToPreload: AdventureCategory[] = [
        'surprise',
        'home',
        'outdoor',
        'community',
        'calm',
        'movement',
      ];

      for (const filter of filtersToPreload) {
        const saved = await loadSavedTodayActivities(filter);

        if (saved.length > 0) continue;

        const generated = await generateActivitiesForFilter(filter, 3);

        await saveActivitiesForToday(generated, filter);
      }
    } catch (error) {
      console.error('Preload adventure filters error:', error);
    } finally {
      preloadingFiltersRef.current = false;
    }
  }, [
    selectedChild?.id,
    isPro,
    loadSavedTodayActivities,
    saveActivitiesForToday,
    generateActivitiesForFilter,
  ]);

  const loadActivities = useCallback(
    async (
      forceRefresh = false,
      filter: AdventureCategory = activeFilter
    ) => {
      if (!selectedChild?.id) {
        setActivities([]);
        setSavedIds([]);
        setFavoriteIds([]);
        setCompletedIds([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const requestId = ++filterRequestIdRef.current;

      try {
        if (!forceRefresh) {
          const savedToday = await loadSavedTodayActivities(filter);

          if (
            savedToday.length > 0 &&
            requestId === filterRequestIdRef.current
          ) {
            setActivities(savedToday);
            setCurrentIndex(0);

            await loadSavedActivityState(savedToday);

            setLoading(false);
            setRefreshing(false);
            return;
          }
        }

        /*
 * Keep the loading state visible while the approved library
 * activities are retrieved.
 *
 * Do not briefly display generic fallback activities first.
 */
if (!forceRefresh && isMountedRef.current) {
  setLoading(true);
}

        const generated = await generateActivitiesForFilter(
          filter,
          isPro ? 3 : 1
        );

        if (
          !isMountedRef.current ||
          requestId !== filterRequestIdRef.current
        ) {
          return;
        }

        const finalActivities = isPro
          ? generated
          : generated.slice(0, 1);

        setActivities(finalActivities);
        setCurrentIndex(0);

        await saveActivitiesForToday(finalActivities, filter);
        await loadSavedActivityState(finalActivities);
      } catch (error: any) {
        console.error('Load daily adventures error:', error);

        Alert.alert(
          'Adventure Error',
          error?.message || 'Could not load daily adventures.'
        );
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      activeFilter,
      childName,
      isPro,
      selectedChild?.id,
      loadSavedTodayActivities,
      loadSavedActivityState,
      saveActivitiesForToday,
      generateActivitiesForFilter,
    ]
  );

  useFocusEffect(
  useCallback(() => {
    isMountedRef.current = true;

    void loadActivities(false, activeFilter);

    if (lastPreloadChildRef.current !== selectedChild?.id) {
      preloadStartedRef.current = false;
      lastPreloadChildRef.current = selectedChild?.id || null;
    }

    if (isPro && !preloadStartedRef.current) {
      preloadStartedRef.current = true;
      void preloadTodayAdventureFilters();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [selectedChild?.id, isPro])
);

  const handleRefresh = async () => {
    Alert.alert(
      'Get Fresh Adventures?',
      'This will replace today’s saved Daily Adventures with new ideas.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fresh Ideas',
          onPress: async () => {
            setRefreshing(true);
            await loadActivities(true, activeFilter);
          },
        },
      ]
    );
  };

  const handleFilterPress = async (filter: AdventureCategory) => {
    if (!selectedChild?.id || filterLoading) return;

    filterRequestIdRef.current += 1;

    if (!isPro && filter !== 'surprise') {
      router.push('/subscription');
      return;
    }

    setActiveFilter(filter);
    setFilterLoading(true);
    setRefreshing(true);

    try {
      const saved = await loadSavedTodayActivities(filter);

    if (
  saved.length > 0 &&
  isLibraryActivitySet(saved)
) {
  const visibleSaved = isPro
    ? saved
    : saved.slice(0, 1);

  setActivities(visibleSaved);
  setCurrentIndex(0);

  await loadSavedActivityState(
    visibleSaved
  );
} else {
  await loadActivities(true, filter);
}

      scrollRef.current?.scrollTo({
        x: 0,
        animated: false,
      });
    } finally {
      setFilterLoading(false);
      setRefreshing(false);
    }
  };

  const toggleSaved = async (
    activity: DailyAdventure,
    activityId: string
  ) => {
    const alreadySaved = savedIds.includes(activityId);
    const nextSaved = !alreadySaved;

    setSavedIds((prev) =>
      alreadySaved
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );

    try {
      await upsertSavedActivity(activity, {
        is_saved: nextSaved,
      });
    } catch (error) {
      console.error('Toggle saved error:', error);

      setSavedIds((prev) =>
        nextSaved
          ? prev.filter((id) => id !== activityId)
          : [...prev, activityId]
      );

      Alert.alert(
        'Save Error',
        'Could not update saved adventure.'
      );
    }
  };

  const toggleFavorite = async (
    activity: DailyAdventure,
    activityId: string
  ) => {
    const alreadyFavorite = favoriteIds.includes(activityId);
    const nextFavorite = !alreadyFavorite;

    setFavoriteIds((prev) =>
      alreadyFavorite
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );

    try {
      await upsertSavedActivity(activity, {
        is_saved: true,
        is_favorite: nextFavorite,
      });

      if (nextFavorite) {
        setSavedIds((prev) =>
          prev.includes(activityId)
            ? prev
            : [...prev, activityId]
        );
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);

      setFavoriteIds((prev) =>
        nextFavorite
          ? prev.filter((id) => id !== activityId)
          : [...prev, activityId]
      );

      Alert.alert(
        'Favorite Error',
        'Could not update favorite adventure.'
      );
    }
  };

  const markCompleted = async (
    activity: DailyAdventure,
    activityId: string,
    feedback: AdventureFeedback
  ) => {
    setCompletedIds((prev) =>
      prev.includes(activityId)
        ? prev
        : [...prev, activityId]
    );

    try {
      await upsertSavedActivity(activity, {
        completed: true,
        feedback,
        is_saved: true,
      });

      Alert.alert(
        'Adventure Saved',
        feedback === 'loved'
          ? 'Glad this was a hit! I saved it for later.'
          : feedback === 'good'
          ? 'Nice! I saved this adventure.'
          : 'Got it. I saved your feedback.'
      );
    } catch (error) {
      console.error('Complete adventure error:', error);

      Alert.alert(
        'Save Error',
        'Could not save this adventure feedback.'
      );
    }
  };

  const askCompletedFeedback = (
    activity: DailyAdventure,
    activityId: string
  ) => {
    Alert.alert(
      'How did it go?',
      'This helps make future adventures better.',
      [
        {
          text: 'Loved it',
          onPress: () =>
            void markCompleted(activity, activityId, 'loved'),
        },
        {
          text: 'Pretty good',
          onPress: () =>
            void markCompleted(activity, activityId, 'good'),
        },
        {
          text: 'Not today',
          onPress: () =>
            void markCompleted(activity, activityId, 'not_today'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const regenerateActivity = async (index: number) => {
    if (!selectedChild?.id) return;

    if (!isPro) {
      router.push('/subscription');
      return;
    }

    setRegeneratingIndex(index);

    try {
      const replacement = await generateActivitiesForFilter(
        activeFilter,
        1,
        activities.map((a) => getAdventureTitle(a))
      );

      const newActivity = replacement[0];

      if (!newActivity) {
        throw new Error('No activity generated');
      }

      const updated = [...activities];
      updated[index] = newActivity;

      setActivities(updated);

      await saveActivitiesForToday(updated, activeFilter);
      await loadSavedActivityState(updated);
    } catch (error: any) {
      console.error('Regenerate adventure error:', error);

      Alert.alert(
        'New Adventure Error',
        error?.message || 'Could not create a new adventure.'
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
    scrollRef.current?.scrollTo({
      x: index * CARD_WIDTH,
      animated: true,
    });

    setCurrentIndex(index);
  };

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="happy-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Child Selected</Text>
          <Text style={styles.emptyText}>
            Select or create a child profile to see Daily Adventures.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && activities.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading Daily Adventures...</Text>
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
              <Text style={styles.heroBadgeText}>PLAY • EXPLORE • CONNECT</Text>
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
          <Text style={styles.heroTitle}>Daily Adventures</Text>
          <Text style={styles.heroSubtitle}>
            Fun ideas for {childName} to play, explore, and learn together today.
          </Text>

          <View style={styles.heroIllustration}>
            <Text style={styles.heroEmoji}>🎲</Text>
            <View style={styles.heroMiniTextWrap}>
              <Text style={styles.heroMiniTitle}>Low-pressure family fun</Text>
              <Text style={styles.heroMiniText}>
                Not a lesson. Just simple moments that support development.
              </Text>
            </View>
          </View>

          <Text style={styles.heroDate}>{todayLabel}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.id;
            const locked = filter.id !== 'surprise' && !isPro;

            return (
              <TouchableOpacity
  key={filter.id}
  style={[
    styles.filterChip,
    active && styles.filterChipActive,
    filterLoading && styles.filterChipDisabled,
  ]}
  onPress={() => void handleFilterPress(filter.id)}
  disabled={filterLoading}
>
 {filterLoading && active ? (
  <ActivityIndicator size="small" color="#FFFFFF" />
) : (
  <Ionicons
    name={locked ? 'lock-closed-outline' : filter.icon}
    size={15}
    color={active ? '#FFFFFF' : '#7C3AED'}
  />
)}
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.feedHeaderRow}>
          <View>
            <Text style={styles.feedTitle}>Today&apos;s Adventures</Text>
            <Text style={styles.feedSubtitle}>
              Swipe through playful ideas for your family
            </Text>
          </View>

          <View style={styles.feedMetaChip}>
            <Ionicons name="albums-outline" size={14} color="#7C3AED" />
            <Text style={styles.feedMetaText}>
              {visibleActivities.length} ideas
            </Text>
          </View>
        </View>

        {visibleActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={30} color="#94A3B8" />
            <Text style={styles.emptyCardTitle}>No adventures yet</Text>
            <Text style={styles.emptyCardText}>
              Pull down to refresh and generate a fresh set of ideas.
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
                const accent = getAdventureAccent(index);
                const activityId = buildActivityId(activity, index);
                const isSaved = savedIds.includes(activityId);
                const isFavorite = favoriteIds.includes(activityId);
                const isCompleted = completedIds.includes(activityId);
                const category = getAdventureCategory(activity);

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
                        <Text style={styles.feedEmoji}>{accent.emoji}</Text>
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
                            color={isSaved ? '#7C3AED' : '#64748B'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.categoryRow}>
                      <View
                        style={[
                          styles.categoryChip,
                          { backgroundColor: accent.chipBg },
                        ]}
                      >
                        <Text
                          style={[styles.categoryChipText, { color: accent.icon }]}
                        >
                          {getCategoryLabel(category)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.feedCardTitle}>
                      {getAdventureTitle(activity)}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaPill}>
                        <Ionicons name="location-outline" size={14} color="#64748B" />
                        <Text style={styles.metaPillText}>
                          {getAdventureLocation(activity)}
                        </Text>
                      </View>

                      <View style={styles.metaPill}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.metaPillText}>
                          {getAdventureTime(activity)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.descriptionText}>
                      {getAdventureDescription(activity)}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.regenerateActivityBtn,
                        !isPro && styles.regenerateActivityBtnDisabled,
                      ]}
                      onPress={() => void regenerateActivity(index)}
                      disabled={regeneratingIndex === index}
                    >
                      {regeneratingIndex === index ? (
                        <ActivityIndicator size="small" color="#7C3AED" />
                      ) : (
                        <>
                          <Ionicons
                            name={isPro ? 'shuffle-outline' : 'lock-closed-outline'}
                            size={16}
                            color={isPro ? '#7C3AED' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.regenerateActivityText,
                              !isPro && styles.regenerateActivityTextDisabled,
                            ]}
                          >
                            {isPro ? 'New adventure' : 'New adventure with Pro'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <View style={styles.feedSection}>
                      <Text style={styles.feedSectionTitle}>Try this</Text>
                      {getAdventureTryThis(activity).map((step, idx) => (
                        <Text key={idx} style={styles.feedBullet}>
                          • {step}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.whyBox}>
                      <Ionicons name="heart-circle-outline" size={20} color="#7C3AED" />
                      <View style={styles.whyTextWrap}>
                        <Text style={styles.whyTitle}>Why it helps</Text>
                        <Text style={styles.whyText}>{getAdventureWhy(activity)}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.didThisBtn,
                        isCompleted && styles.didThisBtnCompleted,
                      ]}
                      onPress={() => askCompletedFeedback(activity, activityId)}
                    >
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={18}
                        color={isCompleted ? '#166534' : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.didThisBtnText,
                          isCompleted && styles.didThisBtnTextCompleted,
                        ]}
                      >
                        {isCompleted ? 'Adventure Completed' : 'We Did This'}
                      </Text>
                    </TouchableOpacity>
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
                <Text style={styles.lockedTitle}>Unlock More Adventures</Text>
                <Text style={styles.lockedText}>
                  Get all daily adventures, category filters, unlimited new ideas,
                  saved favorites, and smarter personalization with Pro.
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
                      askCompletedFeedback(
                        currentActivity,
                        buildActivityId(currentActivity, currentIndex)
                      )
                    }
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
                    <Text style={styles.quickActionText}>We Did This</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() =>
                      void toggleFavorite(
                        currentActivity,
                        buildActivityId(currentActivity, currentIndex)
                      )
                    }
                  >
                    <Ionicons name="heart-outline" size={18} color="#EF4444" />
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
                    <Ionicons name="bookmark-outline" size={18} color="#7C3AED" />
                    <Text style={styles.quickActionText}>Save</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickActionBtn} onPress={handleRefresh}>
                    <Ionicons name="shuffle-outline" size={18} color="#EA580C" />
                    <Text style={styles.quickActionText}>Fresh Ideas</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={18} color="#D97706" />
          <Text style={styles.tipText}>
            Daily Adventures are meant to feel fun and natural. No drills, no
            pressure, no data tracking — just playful moments that support growth.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
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
    backgroundColor: '#FFF7ED',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },

  heroCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  savedBtn: {
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },

  savedBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    marginLeft: 6,
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroGreeting: {
    marginTop: 14,
    color: '#E9D5FF',
    fontSize: 13,
    fontWeight: '800',
  },

  heroTitle: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  heroSubtitle: {
    marginTop: 8,
    color: '#F3E8FF',
    lineHeight: 21,
    fontWeight: '600',
  },

  heroIllustration: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroEmoji: {
    fontSize: 34,
    marginRight: 12,
  },

  heroMiniTextWrap: {
    flex: 1,
  },

  heroMiniTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  heroMiniText: {
    marginTop: 3,
    color: '#F3E8FF',
    fontWeight: '600',
    lineHeight: 18,
    fontSize: 12,
  },

  heroDate: {
    marginTop: 12,
    color: '#E9D5FF',
    fontWeight: '800',
    fontSize: 12,
  },

  filterRow: {
    paddingBottom: 16,
    gap: 10,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  filterChipText: {
    marginLeft: 6,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  feedTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  feedSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700',
  },

  feedMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  feedMetaText: {
    marginLeft: 6,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },

  horizontalFeed: {
    paddingRight: 0,
  },

  feedCard: {
    borderRadius: 26,
    padding: 18,
    marginRight: 12,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  feedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  feedIndexBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedEmoji: {
    fontSize: 22,
  },

  feedTopActions: {
    flexDirection: 'row',
    gap: 8,
  },

  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  categoryRow: {
    marginTop: 14,
    flexDirection: 'row',
  },

  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  categoryChipText: {
    fontSize: 11,
    fontWeight: '900',
  },

  feedCardTitle: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },

  metaRow: {
    marginTop: 12,
    gap: 8,
  },

  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  metaPillText: {
    flex: 1,
    marginLeft: 6,
    color: '#475569',
    fontWeight: '800',
    fontSize: 12,
  },

  descriptionText: {
    marginTop: 14,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '700',
  },

  regenerateActivityBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  regenerateActivityBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },

  regenerateActivityText: {
    marginLeft: 6,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },

  regenerateActivityTextDisabled: {
    color: '#94A3B8',
  },

  feedSection: {
    marginTop: 16,
  },

  feedSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 8,
  },

  feedBullet: {
    color: '#475569',
    lineHeight: 22,
    marginBottom: 6,
    fontWeight: '700',
  },

  whyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 13,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  whyTextWrap: {
    flex: 1,
    marginLeft: 8,
  },

  whyTitle: {
    color: '#5B21B6',
    fontWeight: '900',
    marginBottom: 3,
  },

  whyText: {
    color: '#6D28D9',
    lineHeight: 19,
    fontWeight: '700',
  },

  didThisBtn: {
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  didThisBtnCompleted: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  didThisBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 7,
  },

  didThisBtnTextCompleted: {
    color: '#166534',
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
    backgroundColor: '#7C3AED',
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
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  quickActionsTitle: {
    fontSize: 15,
    fontWeight: '900',
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
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  quickActionText: {
    marginLeft: 6,
    color: '#334155',
    fontWeight: '900',
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },

  emptyCardTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },

  emptyCardText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },

  tipCard: {
    marginTop: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  tipText: {
    flex: 1,
    marginLeft: 8,
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '700',
  },

  filterChipDisabled: {
  opacity: 0.6,
},
});