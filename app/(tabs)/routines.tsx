import { Ionicons } from '@expo/vector-icons';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../lib/SelectedChildContext';
import { useChildSubscription as useSubscription } from '../../lib/ChildSubscriptionContext';
import { hasEntitlement } from '../../lib/entitlements';
import { withTimeout } from '../../lib/performance';
import { supabase } from '../../lib/supabase';

import {
  canCustomizeRoutines,
  canLogProgress,
} from '../../lib/caregiverPermissions';

type TimePeriod = 'morning' | 'afternoon' | 'evening';
type DayType =
  | 'everyday'
  | 'school_days'
  | 'weekends'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type RoutineItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  imageUrl?: string | null;
  isCustomImage?: boolean;
};

type RoutineLogRow = {
  id: string;
  child_id: string;
  routine_period: string;
  day_type?: string;
  routine_name: string;
  task_name: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
};

type CustomRoutineRow = {
  id: string;
  child_id: string;
  routine_period: string;
  day_type?: DayType;
  task_name: string;
  sort_order: number;
  image_url?: string | null;
  default_icon?: keyof typeof Ionicons.glyphMap | null;
  is_custom_image?: boolean;
  created_at: string;
};

const DAY_OPTIONS: { label: string; value: DayType }[] = [
  { label: 'Every Day', value: 'everyday' },
  { label: 'School Days', value: 'school_days' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

const DEFAULT_ROUTINES: Record<TimePeriod, RoutineItem[]> = {
  morning: [
    { label: 'Wake Up', icon: 'sunny' },
    { label: 'Brush Teeth', icon: 'sparkles' },
    { label: 'Get Dressed', icon: 'shirt' },
    { label: 'Breakfast', icon: 'restaurant' },
  ],
  afternoon: [
    { label: 'Lunch', icon: 'pizza' },
    { label: 'Play Time', icon: 'game-controller' },
    { label: 'Learning Time', icon: 'book' },
    { label: 'Quiet Time', icon: 'moon' },
  ],
  evening: [
    { label: 'Dinner', icon: 'restaurant-outline' },
    { label: 'Bath', icon: 'water' },
    { label: 'Pajamas', icon: 'bed' },
    { label: 'Bedtime', icon: 'moon' },
  ],
};

const ROUTINE_THEME: Record<
  TimePeriod,
  {
    hero: string;
    soft: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    tip: string;
  }
> = {
  morning: {
  hero: '#F59E0B',
  soft: '#FEF3C7',
  icon: 'sunny-outline',
  title: 'Good Morning',
  tip: 'Try showing the first routine step before giving a verbal direction. Visual first, words second.',
},
afternoon: {
  hero: '#0EA5E9',
  soft: '#E0F2FE',
  icon: 'partly-sunny-outline',
  title: 'Good Afternoon',
  tip: 'Before switching activities, give a simple warning like “First cleanup, then play.”',
},
evening: {
  hero: '#8B5CF6',
  soft: '#F3E8FF',
  icon: 'moon-outline',
  title: 'Good Evening',
  tip: 'Keep bedtime language short and predictable. Repeating the same calm phrase can help transitions.',
},
};

function getFallbackDayType(dayType: DayType): DayType {
  return dayType === 'saturday' || dayType === 'sunday'
    ? 'weekends'
    : 'school_days';
}

function getDayLabel(dayType: DayType) {
  return DAY_OPTIONS.find((day) => day.value === dayType)?.label || 'Every Day';
}

function getIconForTask(taskName: string): keyof typeof Ionicons.glyphMap {
  const normalized = taskName.toLowerCase();

  if (normalized.includes('wake')) return 'sunny';
  if (normalized.includes('brush')) return 'sparkles';
  if (normalized.includes('dress') || normalized.includes('shirt')) return 'shirt';
  if (normalized.includes('breakfast')) return 'restaurant';
  if (normalized.includes('lunch')) return 'pizza';
  if (normalized.includes('dinner')) return 'restaurant-outline';
  if (normalized.includes('play')) return 'game-controller';
  if (normalized.includes('learn') || normalized.includes('school')) return 'book';
  if (normalized.includes('quiet') || normalized.includes('rest')) return 'moon';
  if (normalized.includes('bath') || normalized.includes('wash')) return 'water';
  if (normalized.includes('pajama')) return 'bed';
  if (normalized.includes('bed')) return 'moon';
  if (normalized.includes('tooth')) return 'sparkles';
  if (normalized.includes('snack')) return 'fast-food';
  if (normalized.includes('potty') || normalized.includes('toilet')) return 'body';
  if (normalized.includes('car')) return 'car';
  if (normalized.includes('home')) return 'home';

  return 'checkmark-circle-outline';
}

export default function RoutinesScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const role = selectedChild?.caregiver_access_role;
  const canCustomize = canCustomizeRoutines(role);
  const canTrack = canLogProgress(role);

  const { isPro } = useSubscription();
  const hasProAccess = hasEntitlement(
    { isPro },
    'routines_customize'
  );

const openProRoute = (path: string) => {
  if (!hasProAccess || !canCustomize) {
    router.push('/subscription');
    return;
  }

  router.push(path as any);
};


const openPracticeMode = () => {
  if (!hasProAccess) {
    router.push('/subscription');
    return;
  }

  router.push({
    pathname: '/routines/practice',
    params: {
      selectedTime,
      selectedDayType,
    },
  });
};

  const [selectedTime, setSelectedTime] = useState<TimePeriod>('morning');
  const [selectedDayType, setSelectedDayType] = useState<DayType>('everyday');
  const [showDayDropdown, setShowDayDropdown] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [todayLogs, setTodayLogs] = useState<RoutineLogRow[]>([]);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [customRoutineRows, setCustomRoutineRows] = useState<CustomRoutineRow[]>([]);

  useEffect(() => {
    if (selectedChild?.id) {
      void loadRoutineData();
    } else {
      setLoading(false);
    }
  }, [selectedChild, selectedTime, selectedDayType]);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

const theme = ROUTINE_THEME[selectedTime];

const routineTitle = `${childName}'s ${
  selectedTime.charAt(0).toUpperCase() + selectedTime.slice(1)
}`;

  const currentRoutine: RoutineItem[] = useMemo(() => {
    if (customRoutineRows.length > 0) {
      return customRoutineRows.map((row) => ({
        label: row.task_name,
        icon: row.default_icon || getIconForTask(row.task_name),
        imageUrl: row.image_url || null,
        isCustomImage: !!row.is_custom_image,
      }));
    }

    return DEFAULT_ROUTINES[selectedTime];
  }, [customRoutineRows, selectedTime]);

  const loadRoutineData = async () => {
    if (!selectedChild?.id) return;

    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const todayDayType = selectedDayType;
      const fallbackDayType =
        selectedDayType === 'everyday'
          ? null
          : getFallbackDayType(selectedDayType);

      const dayTypesToLoad = [todayDayType, fallbackDayType, 'everyday'].filter(
        Boolean
      ) as string[];

      const [logResponse, customRoutineResponse] = await Promise.all([
        supabase
          .from('routine_logs')
          .select('*')
          .eq('child_id', selectedChild.id)
          .eq('routine_period', selectedTime)
          .in('day_type', dayTypesToLoad)
          .gte('completed_at', `${today}T00:00:00Z`)
          .order('completed_at', { ascending: false }),

        supabase
          .from('custom_routines')
          .select(
            'id, child_id, routine_period, day_type, task_name, sort_order, image_url, default_icon, is_custom_image, created_at'
          )
          .eq('child_id', selectedChild.id)
          .eq('routine_period', selectedTime)
          .in('day_type', dayTypesToLoad)
          .order('sort_order', { ascending: true }),
      ]);

      if (logResponse.error) throw logResponse.error;
      if (customRoutineResponse.error) throw customRoutineResponse.error;

      const rows = (customRoutineResponse.data || []) as CustomRoutineRow[];

      const exactRows = rows.filter((row) => row.day_type === todayDayType);
      const fallbackRows = rows.filter((row) => row.day_type === fallbackDayType);
      const everydayRows = rows.filter(
        (row) => !row.day_type || row.day_type === 'everyday'
      );

      const bestRows =
        exactRows.length > 0
          ? exactRows
          : fallbackRows.length > 0
            ? fallbackRows
            : everydayRows.length > 0
              ? everydayRows
              : [];

      setCustomRoutineRows(bestRows);
      setTodayLogs((logResponse.data || []) as RoutineLogRow[]);
    } catch (error) {
      console.error('Routine data load error:', error);
      Alert.alert('Routine Error', 'Could not load routine progress.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoutineData();
  };

  const getTaskLog = (taskName: string) => {
    return todayLogs.find((log) => log.task_name === taskName);
  };

  const isTaskCompleted = (taskName: string) => {
    return !!getTaskLog(taskName);
  };

  const handleToggleTask = async (taskName: string) => {
  if (!selectedChild?.id) {
    Alert.alert('No Child Selected', 'Please select a child profile first.');
    return;
  }

  if (!canTrack) {
  Alert.alert(
    'Permission Needed',
    'This caregiver does not have permission to log routine progress.'
  );
  return;
}

  const existingLog = getTaskLog(taskName);
  setSavingTask(taskName);

  try {
    if (existingLog) {
      setTodayLogs((prev) => prev.filter((log) => log.id !== existingLog.id));

      if (!existingLog.id.startsWith('local-')) {
        const deleteResult = (await withTimeout(
          supabase
            .from('routine_logs')
            .delete()
            .eq('id', existingLog.id)
            .then((res) => res)
        )) as any;

        if (deleteResult.error) throw deleteResult.error;
      }

      return;
    }

    const now = new Date().toISOString();

    const payload = {
      child_id: selectedChild.id,
      routine_period: selectedTime,
      day_type: selectedDayType,
      routine_name: `${selectedTime} routine`,
      task_name: taskName,
      completed: true,
      completed_at: now,
    };

    const optimisticLog: RoutineLogRow = {
      id: `local-${Date.now()}`,
      child_id: selectedChild.id,
      routine_period: selectedTime,
      day_type: selectedDayType,
      routine_name: `${selectedTime} routine`,
      task_name: taskName,
      completed: true,
      completed_at: now,
      created_at: now,
    };

    setTodayLogs((prev) => [optimisticLog, ...prev]);

    const insertResult = (await withTimeout(
      supabase
        .from('routine_logs')
        .insert([payload])
        .then((res) => res)
    )) as any;

    if (insertResult.error) throw insertResult.error;
  } catch (error: any) {
    console.error('Routine toggle error:', error);
    Alert.alert(
      'Routine Error',
      error?.message || 'Could not update task completion.'
    );

    await loadRoutineData();
  } finally {
    setSavingTask(null);
  }
};

  const handleResetRoutine = async () => {
    if (!selectedChild?.id) return;

    Alert.alert(
      'Reset Routine',
      `Are you sure you want to reset all completed tasks for this ${selectedTime} routine?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const logsToDelete = todayLogs.filter(
                (log) => log.routine_period === selectedTime
              );

              const idsToDelete = logsToDelete
                .map((log) => log.id)
                .filter((id) => !id.startsWith('local-'));

              setTodayLogs((prev) =>
                prev.filter((log) => log.routine_period !== selectedTime)
              );

              if (idsToDelete.length > 0) {
                const { error } = await supabase
                  .from('routine_logs')
                  .delete()
                  .in('id', idsToDelete);

                if (error) throw error;
              }
            } catch (error) {
              console.error('Reset routine error:', error);

              Alert.alert('Reset Error', 'Could not reset the routine.');

              await loadRoutineData();
            }
          },
        },
      ]
    );
  };

 const completedCount = currentRoutine.filter((item) =>
  isTaskCompleted(item.label)
).length;

const currentStepIndex = currentRoutine.findIndex(
  (item) => !isTaskCompleted(item.label)
);

const routineComplete =
  currentRoutine.length > 0 && completedCount === currentRoutine.length;

const firstTask =
  routineComplete
    ? null
    : currentStepIndex >= 0
      ? currentRoutine[currentStepIndex]
      : null;

const secondTask =
  routineComplete
    ? null
    : currentStepIndex >= 0
      ? currentRoutine[currentStepIndex + 1] || null
      : null;

const getStepLabel = (index: number) => {
  return `${index + 1}`;
};;

const getStepCircleStyle = (index: number, completed: boolean) => {
  if (completed) return styles.timelineCircleCompleted;
  if (index === 0) return styles.timelineCircleFirst;
  if (index === 1) return styles.timelineCircleThen;
  return null;
};

const getStepTextStyle = (index: number, completed: boolean) => {
  if (completed) return styles.timelineNumberCompleted;
  if (index === 0) return styles.timelineNumberFirst;
  if (index === 1) return styles.timelineNumberThen;
  return null;
};

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backgroundBlobOne} />
        <View style={styles.backgroundBlobTwo} />
        <View style={styles.backgroundBlobThree} />     
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select or create a child profile to track routines.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading routine...</Text>
      </View>
    );
  }

 const getPreviewVisual = (task?: RoutineItem, completed = false) => {
  if (completed) {
    return (
      <View style={styles.firstThenIconBox}>
        <Ionicons name="trophy-outline" size={32} color="#F59E0B" />
      </View>
    );
  }
  if (!task) return null;

  if (task.imageUrl) {
    return <Image source={{ uri: task.imageUrl }} style={styles.firstThenImage} />;
  }

  return (
    <View style={styles.firstThenIconBox}>
      <Ionicons name={task.icon} size={28} color="#4F46E5" />
    </View>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routineHeroCard}>
  <View style={styles.routineHeroTopRow}>
    <View>
      <View style={[styles.routineHeroBadge, { backgroundColor: theme.soft }]}>
        <Ionicons name={theme.icon} size={15} color={theme.hero} />
        <Text style={[styles.routineHeroBadgeText, { color: theme.hero }]}>
          DAILY ROUTINE
        </Text>
      </View>

      <Text style={styles.routineHeroTitle}>{routineTitle}</Text>

      <Text style={styles.routineHeroSubtitle}>
        {theme.title}. {currentRoutine.length} visual steps are ready for {childName}.
      </Text>
    </View>

    <View style={[styles.routineHeroIllustration, { backgroundColor: theme.soft }]}>
      <Ionicons name={theme.icon} size={40} color={theme.hero} />
    </View>
  </View>

  <View style={styles.routineProgressRow}>
    <View style={styles.routineProgressPill}>
      <Ionicons name="checkmark-done-circle-outline" size={17} color="#4F46E5" />
      <Text style={styles.routineProgressText}>
        {completedCount} of {currentRoutine.length} completed
      </Text>
    </View>
  </View>

  <View style={styles.progressTrackLight}>
    <View
      style={[
        styles.progressFillLight,
        {
          width: `${
            currentRoutine.length
              ? Math.round((completedCount / currentRoutine.length) * 100)
              : 0
          }%`,
        },
      ]}
    />
  </View>
</View>

        <View style={styles.segmentedWrap}>
  {(['morning', 'afternoon', 'evening'] as TimePeriod[]).map((time) => {
    const active = selectedTime === time;

    return (
      <TouchableOpacity
        key={time}
        style={[styles.segmentBtn, active && styles.segmentBtnActive]}
        onPress={() => setSelectedTime(time)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={
            time === 'morning'
              ? 'sunny-outline'
              : time === 'afternoon'
                ? 'partly-sunny-outline'
                : 'moon-outline'
          }
          size={16}
          color={active ? '#FFFFFF' : '#4F46E5'}
        />
        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
          {time.charAt(0).toUpperCase() + time.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

<View style={[styles.parentTipCard, { backgroundColor: theme.soft }]}>
  <View style={styles.parentTipHeader}>
    <Ionicons name="bulb-outline" size={14} color={theme.hero} />
    <Text style={[styles.parentTipTitle, { color: theme.hero }]}>
      Parent Support Tip
    </Text>
  </View>

  <Text style={styles.parentTipText}>{theme.tip}</Text>
</View>

        <View style={styles.dayDropdownWrap}>
          <TouchableOpacity
            style={styles.dayDropdownButton}
            onPress={() => setShowDayDropdown((prev) => !prev)}
          >
            <View>
              <Text style={styles.dayDropdownLabel}>Routine Schedule</Text>
              <Text style={styles.dayDropdownValue}>
                {getDayLabel(selectedDayType)}
              </Text>
            </View>

            <Ionicons
              name={showDayDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#4F46E5"
            />
          </TouchableOpacity>

          {showDayDropdown ? (
            <View style={styles.dayDropdownMenu}>
              {DAY_OPTIONS.map((day) => {
                const active = selectedDayType === day.value;

                return (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayDropdownItem,
                      active && styles.dayDropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedDayType(day.value);
                      setShowDayDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayDropdownItemText,
                        active && styles.dayDropdownItemTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>

                    {active ? (
                      <Ionicons name="checkmark" size={18} color="#4F46E5" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <TouchableOpacity
  style={styles.childModeStartCard}
  onPress={openPracticeMode}
  activeOpacity={0.88}
>
  <View style={styles.childModeIcon}>
    <Ionicons
      name={hasProAccess ? 'play-circle' : 'lock-closed-outline'}
      size={30}
      color="#4F46E5"
    />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.childModeTitle}>
      {hasProAccess ? 'Start Child Mode' : 'Child Mode Pro'}
    </Text>

    <Text style={styles.childModeSubtitle}>
      Large pictures, spoken steps, and first/then support.
    </Text>
  </View>

  <Ionicons name="chevron-forward" size={22} color="#4F46E5" />
</TouchableOpacity>

         <View style={styles.topActionRow}>
  <TouchableOpacity
    style={styles.secondaryActionBtn}
    onPress={() => openProRoute('/routines/customize')}
  >
    <Ionicons
      name={hasProAccess ? 'create-outline' : 'lock-closed-outline'}
      size={18}
      color="#4F46E5"
    />
    <Text style={styles.secondaryActionBtnText}>
      {hasProAccess ? 'Customize' : 'Customize Pro'}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.primaryActionBtn}
    onPress={() => openProRoute('/routine-printables')}
  >
    <Ionicons
      name={hasProAccess ? 'print-outline' : 'lock-closed-outline'}
      size={18}
      color="#FFFFFF"
    />
    <Text style={styles.primaryActionBtnText}>
      {hasProAccess ? 'Print' : 'Print Pro'}
    </Text>
  </TouchableOpacity>
</View>

{routineComplete ? (
  <View style={styles.routineCompleteCard}>
    <View style={styles.routineCompleteIcon}>
      <Ionicons name="trophy-outline" size={28} color="#F59E0B" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.routineCompleteTitle}>Routine Complete!</Text>
      <Text style={styles.routineCompleteText}>
        Amazing job, {childName}! Today’s routine is finished.
      </Text>
    </View>
  </View>
) : null}

       <View style={styles.timelineContainer}>
  <Text style={styles.flowSectionTitle}>Today’s Visual Routine</Text>

  {currentRoutine.map((item, index) => {
    const completedLog = getTaskLog(item.label);
    const completed = !!completedLog;
    const saving = savingTask === item.label;
    const isLast = index === currentRoutine.length - 1;
    const isCurrentStep = index === currentStepIndex;

    return (
      <View key={`${item.label}-${index}`} style={styles.timelineItem}>
        <View style={styles.timelineRail}>
          <View
            style={[
              styles.timelineCircle,
              getStepCircleStyle(index, completed),
              ]}
          >
            <Text
              style={[
                styles.timelineNumber,
                getStepTextStyle(index, completed),
                ]}
            >
              {getStepLabel(index)}
            </Text>
          </View>

          {!isLast ? (
            <View
              style={[
                styles.timelineLine,
                completed && styles.timelineLineCompleted,
              ]}
            />
          ) : null}
        </View>

       <View
  style={[
    styles.timelineCard,
    completed && styles.timelineCardCompleted,
    isCurrentStep && [
      styles.timelineCardCurrent,
      {
        borderColor: theme.hero,
        shadowColor: theme.hero,
      },
    ],
  ]}
>
          <View style={styles.timelineImageWrap}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.timelineImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.timelineIconWrap,
                  completed && styles.timelineIconWrapCompleted,
                ]}
              >
                <Ionicons
                  name={completed ? 'checkmark-circle' : item.icon}
                  size={40}
                  color={completed ? '#10B981' : '#4F46E5'}
                />
              </View>
            )}
          </View>

         <View style={styles.timelineTextWrap}>
  {isCurrentStep && (
    <View style={styles.currentStepIndicator}>
      <View style={styles.pulseDot} />
      <Text style={styles.currentStepIndicatorText}>CURRENT STEP</Text>
    </View>
  )}

  <Text style={styles.timelineTitle}>{item.label}</Text>

  {item.isCustomImage ? (
    <Text style={styles.photoTag}>Custom photo</Text>
  ) : null}

  {completed ? (
    <Text style={styles.completedTimeText}>Done</Text>
  ) : (
    <Text style={styles.pendingText}>Ready</Text>
  )}
</View>

          <TouchableOpacity
            style={[
              styles.timelineCheckBtn,
              completed && styles.timelineCheckBtnCompleted,
            ]}
            onPress={() => handleToggleTask(item.label)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Ionicons
                name={completed ? 'checkmark' : 'add'}
                size={24}
                color={completed ? '#FFFFFF' : '#4F46E5'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  })}
</View>
<TouchableOpacity
  style={[
    styles.resetBtn,
    {
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 20,
    },
  ]}
  onPress={handleResetRoutine}
>
  <Ionicons name="refresh-outline" size={14} color="#DC2626" />
  <Text style={styles.resetBtnText}>Reset Today’s Routine</Text>
</TouchableOpacity>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: '#F6F8FC',
  overflow: 'hidden',
},

scrollContent: {
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 220,
},

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F1F5F9',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },

  dayDropdownWrap: {
    marginBottom: 12,
  },

  dayDropdownButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dayDropdownLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },

  dayDropdownValue: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '800',
  },

  dayDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  dayDropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

 dayDropdownItemActive: {
  backgroundColor: '#EEF2FF',
},

  dayDropdownItemText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },

  dayDropdownItemTextActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },

 resetBtn: {
  alignSelf: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 999,
  paddingVertical: 10,
  paddingHorizontal: 18,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  borderWidth: 1,
  borderColor: '#FCA5A5',
  marginBottom: 14,
},

  resetBtnText: {
    marginLeft: 6,
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
  },

  cardContainer: {
  marginBottom: 25,
},

routineCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 26,
  padding: 16,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 7 },
  elevation: 3,
},

  routineTopRow: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

  routineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },

  visualWrap: {
    marginRight: 12,
  },

  iconWrap: {
  width: 58,
  height: 58,
  borderRadius: 20,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
},

  iconWrapCompleted: {
  backgroundColor: '#DCFCE7',
},

  taskImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },

  taskTextWrap: {
    flex: 1,
  },

  routineText: {
  fontWeight: '900',
  color: '#0F172A',
  fontSize: 16,
  letterSpacing: -0.2,
},

  photoTag: {
    marginTop: 4,
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '800',
  },

  completedTimeText: {
  marginTop: 6,
  alignSelf: 'flex-start',
  backgroundColor: '#DCFCE7',
  color: '#15803D',
  fontSize: 12,
  fontWeight: '800',
  paddingVertical: 4,
  paddingHorizontal: 9,
  borderRadius: 999,
},

  pendingText: {
  marginTop: 6,
  alignSelf: 'flex-start',
  backgroundColor: '#F1F5F9',
  color: '#64748B',
  fontSize: 12,
  fontWeight: '800',
  paddingVertical: 4,
  paddingHorizontal: 9,
  borderRadius: 999,
},

  checkBtnCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },

  topActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  secondaryActionBtnText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '800',
  },

  primaryActionBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  primaryActionBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  heroCard: {
  backgroundColor: '#4F46E5',
  borderRadius: 32,
  padding: 22,
  marginBottom: 18,
  shadowColor: '#4F46E5',
  shadowOpacity: 0.24,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
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
  fontWeight: '900',
  marginLeft: 6,
  letterSpacing: 0.4,
},

heroTitle: {
  fontSize: 30,
  fontWeight: '900',
  color: '#FFFFFF',
  letterSpacing: -0.4,
},

heroSubtitle: {
  marginTop: 8,
  color: '#E0E7FF',
  fontSize: 14,
  lineHeight: 21,
  fontWeight: '700',
},

heroProgressPill: {
  marginTop: 16,
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 999,
  paddingVertical: 9,
  paddingHorizontal: 13,
},

heroProgressText: {
  marginLeft: 7,
  color: '#4F46E5',
  fontWeight: '900',
  fontSize: 13,
},

progressTrack: {
  marginTop: 14,
  height: 9,
  backgroundColor: 'rgba(255,255,255,0.24)',
  borderRadius: 999,
  overflow: 'hidden',
},

progressFill: {
  height: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: 999,
},

segmentedWrap: {
  flexDirection: 'row',
  backgroundColor: '#E2E8F0',
  borderRadius: 20,
  padding: 5,
  marginBottom: 16,
},

segmentBtn: {
  flex: 1,
  borderRadius: 16,
  paddingVertical: 11,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
},

segmentBtnActive: {
  backgroundColor: '#4F46E5',
},

segmentText: {
  marginLeft: 6,
  fontSize: 12,
  fontWeight: '900',
  color: '#4F46E5',
},

segmentTextActive: {
  color: '#FFFFFF',
},

routineCardCompleted: {
  borderColor: '#BBF7D0',
  backgroundColor: '#F0FDF4',
  shadowColor: '#10B981',
  shadowOpacity: 0.08,
},

checkBtn: {
  width: 48,
  height: 48,
  borderRadius: 18,
  backgroundColor: '#EEF2FF',
  borderWidth: 1,
  borderColor: '#C7D2FE',
  alignItems: 'center',
  justifyContent: 'center',
},

parentTipCard: {
  borderRadius: 16,
  paddingVertical: 10,
  paddingHorizontal: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: 'rgba(15,23,42,0.05)',
},

parentTipHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 4,
},

parentTipTitle: {
  marginLeft: 6,
  fontSize: 12,
  fontWeight: '900',
},

parentTipText: {
  color: '#334155',
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '700',
},

flowSectionTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#0F172A',
  marginBottom: 12,
  letterSpacing: -0.2,
},

flowRow: {
  flexDirection: 'row',
  alignItems: 'stretch',
},

stepRail: {
  width: 34,
  alignItems: 'center',
  marginRight: 10,
},

stepCircle: {
  width: 30,
  height: 30,
  borderRadius: 999,
  backgroundColor: '#EEF2FF',
  borderWidth: 1,
  borderColor: '#C7D2FE',
  alignItems: 'center',
  justifyContent: 'center',
},

stepCircleCompleted: {
  backgroundColor: '#10B981',
  borderColor: '#10B981',
},

stepNumber: {
  color: '#4F46E5',
  fontSize: 13,
  fontWeight: '900',
},

stepNumberCompleted: {
  color: '#FFFFFF',
},

stepLine: {
  flex: 1,
  width: 2,
  backgroundColor: '#CBD5E1',
  marginTop: 6,
  borderRadius: 999,
},

routineHeroCard: {
  backgroundColor: 'rgba(255,255,255,0.96)',
  borderRadius: 26,
  padding: 16,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  shadowColor: '#0F172A',
  shadowOpacity: 0.045,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
},

routineHeroIllustration: {
  width: 64,
  height: 64,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
},

routineHeroTitle: {
  fontSize: 25,
  fontWeight: '900',
  color: '#0F172A',
  letterSpacing: -0.4,
},

routineHeroTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
},

routineHeroBadge: {
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 999,
  paddingHorizontal: 11,
  paddingVertical: 7,
  marginBottom: 12,
},

routineHeroBadgeText: {
  fontSize: 11,
  fontWeight: '900',
  marginLeft: 6,
  letterSpacing: 0.4,
},


routineHeroSubtitle: {
  marginTop: 8,
  color: '#64748B',
  fontSize: 14,
  lineHeight: 21,
  fontWeight: '700',
  maxWidth: 240,
},

routineProgressRow: {
  marginTop: 18,
  flexDirection: 'row',
},

routineProgressPill: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#EEF2FF',
  borderRadius: 999,
  paddingVertical: 9,
  paddingHorizontal: 13,
},

routineProgressText: {
  marginLeft: 7,
  color: '#4F46E5',
  fontWeight: '900',
  fontSize: 13,
},

progressTrackLight: {
  marginTop: 14,
  height: 9,
  backgroundColor: '#E2E8F0',
  borderRadius: 999,
  overflow: 'hidden',
},

progressFillLight: {
  height: '100%',
  backgroundColor: '#4F46E5',
  borderRadius: 999,
},

childModeStartCard: {
  backgroundColor: '#4F46E5',
  borderRadius: 26,
  padding: 18,
  marginBottom: 16,
  flexDirection: 'row',
  alignItems: 'center',
  shadowColor: '#4F46E5',
  shadowOpacity: 0.18,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
},

childModeIcon: {
  width: 56,
  height: 56,
  borderRadius: 20,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

childModeTitle: {
  color: '#FFFFFF',
  fontSize: 19,
  fontWeight: '900',
},

childModeSubtitle: {
  marginTop: 4,
  color: '#E0E7FF',
  fontSize: 12.5,
  lineHeight: 18,
  fontWeight: '700',
},

timelineContainer: {
  marginBottom: 40,
},

timelineItem: {
  flexDirection: 'row',
  alignItems: 'stretch',
  marginBottom: 14,
},

timelineRail: {
  width: 34,
  alignItems: 'center',
  marginRight: 10,
},

timelineCircle: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: '#FFFFFF',
  borderWidth: 1.5,
  borderColor: '#C7D2FE',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
},

timelineNumber: {
  color: '#4F46E5',
  fontSize: 17,
  fontWeight: '900',
},

timelineCard: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E6EAF5',
  flexDirection: 'row',
  alignItems: 'center',
  shadowColor: '#0F172A',
  shadowOpacity: 0.055,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
  minHeight: 84,
},

timelineImage: {
  width: 54,
  height: 54,
  borderRadius: 16,
  backgroundColor: '#F1F5F9'
},

timelineIconWrap: {
  width: 54,
  height: 54,
  borderRadius: 16,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
},

timelineTitle: {
  color: '#0F172A',
  fontSize: 19,
  fontWeight: '900',
  letterSpacing: -0.25,
},

timelineCircleCompleted: {
  backgroundColor: '#10B981',
  borderColor: '#10B981',
},

timelineNumberCompleted: {
  color: '#FFFFFF',
},

timelineLine: {
  flex: 1,
  width: 3,
  backgroundColor: '#CBD5E1',
  marginTop: 8,
  borderRadius: 999,
},

timelineLineCompleted: {
  backgroundColor: '#10B981',
},

timelineCardCompleted: {
  backgroundColor: '#F0FDF4',
  borderColor: '#10B981',
  transform: [{ scale: 0.98 }]
},

timelineImageWrap: {
  marginRight: 14,
},

timelineIconWrapCompleted: {
  backgroundColor: '#DCFCE7',
},

timelineTextWrap: {
  flex: 1,
  paddingRight: 8,
},

timelineCheckBtn: {
  width: 46,
  height: 46,
  borderRadius: 17,
  backgroundColor: '#F8FAFF',
  borderWidth: 1,
  borderColor: '#C7D2FE',
  alignItems: 'center',
  justifyContent: 'center',
},

timelineCheckBtnCompleted: {
  backgroundColor: '#10B981',
  borderColor: '#10B981',
},

timelineCardCurrent: {
  borderWidth: 1.5,
  backgroundColor: '#FFFBEB',
  shadowOpacity: 0.12,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 7 },
  elevation: 4,
},

firstThenPreviewCard: {
  backgroundColor: '#FFFBEB',
  borderRadius: 30,
  padding: 16,
  marginBottom: 18,
  borderWidth: 1.5,
  borderColor: '#C7D2FE',
  shadowColor: '#4F46E5',
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
},

firstThenHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},

firstThenHeaderText: {
  marginLeft: 8,
  color: '#4F46E5',
  fontSize: 15,
  fontWeight: '900',
},

firstThenContentRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

firstThenPreviewBlock: {
  flex: 1,
  backgroundColor: '#F8FAFC',
  borderRadius: 24,
  paddingVertical: 14,
  paddingHorizontal: 10,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

firstThenPreviewLabel: {
  color: '#4F46E5',
  fontSize: 12,
  fontWeight: '900',
  marginBottom: 8,
},

firstThenPreviewText: {
  color: '#0F172A',
  fontSize: 15,
  fontWeight: '900',
  textAlign: 'center',
  marginTop: 8,
},

routineCompleteCard: {
  backgroundColor: '#FFFBEB',
  borderRadius: 26,
  padding: 16,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#FDE68A',
  flexDirection: 'row',
  alignItems: 'center',
},

routineCompleteIcon: {
  width: 58,
  height: 58,
  borderRadius: 22,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

routineCompleteTitle: {
  color: '#92400E',
  fontSize: 18,
  fontWeight: '900',
},

routineCompleteText: {
  marginTop: 4,
  color: '#78350F',
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',
},

timelineCircleFirst: {
  backgroundColor: '#DBEAFE',
  borderColor: '#60A5FA',
},

timelineCircleThen: {
  backgroundColor: '#EDE9FE',
  borderColor: '#8B5CF6',
},

timelineNumberFirst: {
  color: '#2563EB',
  fontSize: 12,
  fontWeight: '900',
},

timelineNumberThen: {
  color: '#7C3AED',
  fontSize: 12,
  fontWeight: '900',
},

firstThenImage: {
  width: 62,
  height: 62,
  borderRadius: 18,
  backgroundColor: '#E2E8F0',
},

firstThenIconBox: {
  width: 62,
  height: 62,
  borderRadius: 18,
  backgroundColor: '#EEF2FF',
  alignItems: 'center',
  justifyContent: 'center',
},

firstThenArrowCircle: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: '#4F46E5',
  alignItems: 'center',
  justifyContent: 'center',
  marginHorizontal: 10,
},

backgroundBlobOne: {
  position: 'absolute',
  top: -90,
  right: -80,
  width: 230,
  height: 230,
  borderRadius: 115,
  backgroundColor: '#F3E8FF',
  opacity: 0.9,
},

backgroundBlobTwo: {
  position: 'absolute',
  top: 260,
  left: -100,
  width: 200,
  height: 200,
  borderRadius: 100,
  backgroundColor: '#E0F2FE',
  opacity: 0.65,
},

backgroundBlobThree: {
  position: 'absolute',
  bottom: 120,
  right: -90,
  width: 220,
  height: 220,
  borderRadius: 110,
  backgroundColor: '#FEF3C7',
  opacity: 0.65,
},

currentStepIndicator: {
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#EEF2FF',
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 999,
  marginBottom: 6,
},

pulseDot: {
  width: 7,
  height: 7,
  borderRadius: 999,
  backgroundColor: '#F59E0B',
  marginRight: 6,
},

currentStepIndicatorText: {
  color: '#4F46E5',
  fontSize: 10,
  fontWeight: '900',
},
});
