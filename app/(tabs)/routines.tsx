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
import { withTimeout } from '../../lib/performance';
import { supabase } from '../../lib/supabase';

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

  const formatCompletedTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleToggleTask = async (taskName: string) => {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child profile first.');
      return;
    }

    const existingLog = getTaskLog(taskName);

    setSavingTask(taskName);

    try {
      if (existingLog) {
        setTodayLogs((prev) => prev.filter((log) => log.id !== existingLog.id));

        if (!existingLog.id.startsWith('local-')) {
          const { error } = await withTimeout(
            supabase.from('routine_logs').delete().eq('id', existingLog.id),
            8000,
            'Removing routine progress took too long.'
          );

          if (error) throw error;
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

      const { error } = await withTimeout(
        supabase.from('routine_logs').insert([payload]),
        8000,
        'Saving routine progress took too long.'
      );

      if (error) throw error;
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

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={34} color="#94A3B8" />
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
        <View style={styles.header}>
          <Text style={styles.title}>Daily Routines</Text>
          <Text style={styles.subtitle}>
            Track structured routines for {childName} and log when each task is completed.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#4F46E5" />
            <Text style={styles.summaryTitle}>Today’s Routine Progress</Text>
          </View>
          <Text style={styles.summaryText}>
            {completedCount} of {currentRoutine.length} tasks completed for the {selectedTime} routine.
          </Text>
          <Text style={styles.summarySubtext}>
            {customRoutineRows.length > 0
              ? 'Using your saved custom routine with your order and pictures.'
              : 'Using the default routine.'}
          </Text>
        </View>

        <View style={styles.timeRow}>
          {(['morning', 'afternoon', 'evening'] as TimePeriod[]).map((time) => {
            const active = selectedTime === time;

            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeBtn, active && styles.timeBtnActive]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[styles.timeText, active && styles.timeTextActive]}>
                  {time.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
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

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetRoutine}>
          <Ionicons name="refresh-outline" size={14} color="#DC2626" />
          <Text style={styles.resetBtnText}>Reset Today</Text>
        </TouchableOpacity>

        <View style={styles.cardContainer}>
          {currentRoutine.map((item, index) => {
            const completedLog = getTaskLog(item.label);
            const completed = !!completedLog;
            const saving = savingTask === item.label;

            return (
              <View key={`${item.label}-${index}`} style={styles.routineCard}>
                <View style={styles.routineTopRow}>
                  <View style={styles.routineLeft}>
                    <View style={styles.visualWrap}>
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.taskImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.iconWrap,
                            completed && styles.iconWrapCompleted,
                          ]}
                        >
                          <Ionicons
                            name={completed ? 'checkmark-circle' : item.icon}
                            size={26}
                            color={completed ? '#10B981' : '#4F46E5'}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.taskTextWrap}>
                      <Text style={styles.routineText}>{item.label}</Text>

                      {item.isCustomImage ? (
                        <Text style={styles.photoTag}>Custom photo</Text>
                      ) : null}

                      {completedLog ? (
                        <Text style={styles.completedTimeText}>
                          Completed at {formatCompletedTime(completedLog.completed_at)}
                        </Text>
                      ) : (
                        <Text style={styles.pendingText}>Not completed yet</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.checkBtn,
                      completed && styles.checkBtnCompleted,
                    ]}
                    onPress={() => handleToggleTask(item.label)}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : completed ? (
                      <Text style={styles.uncheckBtnText}>Undo</Text>
                    ) : (
                      <Text style={styles.checkBtnText}>Check Off</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {index !== currentRoutine.length - 1 && (
                  <View style={styles.arrowWrap}>
                    <Ionicons name="arrow-down" size={20} color="#CBD5F5" />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.topActionRow}>
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push('/routines/customize')}
          >
            <Ionicons name="create-outline" size={18} color="#4F46E5" />
            <Text style={styles.secondaryActionBtnText}>Customize Routine</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push('/routine-printables')}
          >
            <Ionicons name="print-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Print Routine</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="analytics-outline" size={18} color="#4F46E5" />
            <Text style={styles.infoTitle}>Routine Tracking</Text>
          </View>
          <Text style={styles.infoText}>
            Routine completion can now support progress summaries, printable charts, and parent-friendly daily structure.
          </Text>
        </View>

        <View style={styles.tipBox}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={18} color="#F59E0B" />
            <Text style={styles.tipTitle}>ABA Tip</Text>
          </View>

          <Text style={styles.tipText}>
            Use consistent routines daily. Pair each step with a visual cue or PECS-style picture
            to help your child anticipate transitions.
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

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
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

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 6,
    color: '#64748B',
    lineHeight: 20,
  },

  summaryCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  summaryTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#3730A3',
    fontSize: 15,
  },

  summaryText: {
    color: '#4338CA',
    lineHeight: 20,
    fontSize: 14,
  },

  summarySubtext: {
    marginTop: 6,
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  timeBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  timeBtnActive: {
    backgroundColor: '#4F46E5',
  },

  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },

  timeTextActive: {
    color: '#FFFFFF',
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
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },

  resetBtnText: {
    marginLeft: 6,
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
  },

  cardContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 25,
  },

  routineCard: {
    marginBottom: 14,
  },

  routineTopRow: {
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
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
  },

  iconWrapCompleted: {
    backgroundColor: '#ECFDF5',
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
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 15,
  },

  photoTag: {
    marginTop: 4,
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '800',
  },

  completedTimeText: {
    marginTop: 4,
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },

  pendingText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  checkBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    minWidth: 92,
    alignItems: 'center',
  },

  checkBtnCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },

  checkBtnText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },

  uncheckBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  arrowWrap: {
    marginTop: 10,
    alignItems: 'center',
  },

  topActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 14,
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
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  primaryActionBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  infoTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#1E293B',
  },

  infoText: {
    color: '#64748B',
    lineHeight: 20,
  },

  tipBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },

  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  tipTitle: {
    marginLeft: 8,
    fontWeight: '800',
    color: '#92400E',
  },

  tipText: {
    color: '#B45309',
    lineHeight: 20,
  },
});