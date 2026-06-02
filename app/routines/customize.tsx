import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
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

type RoutineRow = {
  id: string;
  child_id: string;
  routine_period: string;
  day_type?: string | null;
  task_name: string;
  sort_order: number;
  image_url?: string | null;
  default_icon?: keyof typeof Ionicons.glyphMap | null;
  is_custom_image?: boolean;
  created_at: string;
};

type EditableTask = {
  id: string;
  task_name: string;
  sort_order: number;
  image_url?: string | null;
  default_icon: keyof typeof Ionicons.glyphMap;
  is_custom_image: boolean;
};

const DAY_TYPES: Array<{ label: string; value: DayType; helper: string }> = [
  { label: 'Every Day', value: 'everyday', helper: 'Use this routine daily' },
  { label: 'School Days', value: 'school_days', helper: 'Monday through Friday' },
  { label: 'Weekends', value: 'weekends', helper: 'Saturday and Sunday' },
  { label: 'Monday', value: 'monday', helper: 'Monday only' },
  { label: 'Tuesday', value: 'tuesday', helper: 'Tuesday only' },
  { label: 'Wednesday', value: 'wednesday', helper: 'Wednesday only' },
  { label: 'Thursday', value: 'thursday', helper: 'Thursday only' },
  { label: 'Friday', value: 'friday', helper: 'Friday only' },
  { label: 'Saturday', value: 'saturday', helper: 'Saturday only' },
  { label: 'Sunday', value: 'sunday', helper: 'Sunday only' },
];

const DEFAULT_ROUTINES: Record<
  TimePeriod,
  Array<{ task_name: string; default_icon: keyof typeof Ionicons.glyphMap }>
> = {
  morning: [
    { task_name: 'Wake Up', default_icon: 'sunny' },
    { task_name: 'Brush Teeth', default_icon: 'sparkles' },
    { task_name: 'Get Dressed', default_icon: 'shirt' },
    { task_name: 'Breakfast', default_icon: 'restaurant' },
  ],
  afternoon: [
    { task_name: 'Lunch', default_icon: 'pizza' },
    { task_name: 'Play Time', default_icon: 'game-controller' },
    { task_name: 'Learning Time', default_icon: 'book' },
    { task_name: 'Quiet Time', default_icon: 'moon' },
  ],
  evening: [
    { task_name: 'Dinner', default_icon: 'restaurant-outline' },
    { task_name: 'Bath', default_icon: 'water' },
    { task_name: 'Pajamas', default_icon: 'bed' },
    { task_name: 'Bedtime', default_icon: 'moon' },
  ],
};

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

function normalizeTasks(tasks: EditableTask[]): EditableTask[] {
  return tasks.map((task, index) => ({
    ...task,
    sort_order: index + 1,
  }));
}

function buildDefaultTasks(selectedTime: TimePeriod): EditableTask[] {
  return DEFAULT_ROUTINES[selectedTime].map((item, index) => ({
    id: `default-${selectedTime}-${index}-${Date.now()}`,
    task_name: item.task_name,
    sort_order: index + 1,
    image_url: null,
    default_icon: item.default_icon,
    is_custom_image: false,
  }));
}

function formatPeriod(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayType(value: DayType) {
  return DAY_TYPES.find((item) => item.value === value)?.label || 'Every Day';
}

export default function CustomizeRoutineScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const { isPro, adminMode, loading: subscriptionLoading } = useSubscription();
  const hasProAccess = isPro || adminMode;

  const [selectedTime, setSelectedTime] = useState<TimePeriod>('morning');
  const [selectedDayType, setSelectedDayType] = useState<DayType>('everyday');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [routineSource, setRoutineSource] = useState<'saved' | 'default'>('default');

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const selectedDayLabel = useMemo(() => {
    return formatDayType(selectedDayType);
  }, [selectedDayType]);

  useEffect(() => {
  if (subscriptionLoading) return;

  if (!hasProAccess) {
    router.replace('/subscription');
  }
}, [hasProAccess, subscriptionLoading, router]);

  useEffect(() => {
    if (selectedChild?.id) {
      void loadCustomRoutine();
    } else {
      setLoading(false);
    }
  }, [selectedChild?.id, selectedTime, selectedDayType]);

  const loadCustomRoutine = async () => {
    if (!selectedChild?.id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('custom_routines')
        .select(
          'id, child_id, routine_period, day_type, task_name, sort_order, image_url, default_icon, is_custom_image, created_at'
        )
        .eq('child_id', selectedChild.id)
        .eq('routine_period', selectedTime)
        .eq('day_type', selectedDayType)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as RoutineRow[];

      if (rows.length > 0) {
        setRoutineSource('saved');
        setTasks(
          normalizeTasks(
            rows.map((row, index) => ({
              id: row.id || `saved-${index}`,
              task_name: row.task_name,
              sort_order: row.sort_order || index + 1,
              image_url: row.image_url || null,
              default_icon:
                (row.default_icon as keyof typeof Ionicons.glyphMap) ||
                getIconForTask(row.task_name),
              is_custom_image: !!row.is_custom_image,
            }))
          )
        );
      } else {
        setRoutineSource('default');
        setTasks(buildDefaultTasks(selectedTime));
      }
    } catch (error) {
      console.error('Load custom routine error:', error);

      setRoutineSource('default');
      setTasks(buildDefaultTasks(selectedTime));
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    const trimmed = taskInput.trim();

    if (!trimmed) {
      Alert.alert('Missing Task', 'Please type a task name.');
      return;
    }

    if (tasks.some((task) => task.task_name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already Added', 'That task is already in this routine.');
      return;
    }

    const nextTask: EditableTask = {
      id: `new-${Date.now()}`,
      task_name: trimmed,
      sort_order: tasks.length + 1,
      image_url: null,
      default_icon: getIconForTask(trimmed),
      is_custom_image: false,
    };

    setTasks((prev) => normalizeTasks([...prev, nextTask]));
    setTaskInput('');
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => normalizeTasks(prev.filter((task) => task.id !== taskId)));
  };

  const resetToDefault = () => {
    Alert.alert(
      'Reset Routine',
      `Replace this ${formatPeriod(selectedTime)} routine for ${selectedDayLabel} with the default tasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setRoutineSource('default');
            setTasks(buildDefaultTasks(selectedTime));
          },
        },
      ]
    );
  };

  const uploadTaskPhoto = async (taskId: string) => {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child first.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow photo access to upload a routine image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        Alert.alert('Upload Failed', 'Could not read the selected photo.');
        return;
      }

      setUploadingTaskId(taskId);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const user = authData.user;
      if (!user) {
        Alert.alert('Not Signed In', 'Please sign in again.');
        return;
      }

      const ext = asset.mimeType?.includes('png') ? 'png' : 'jpg';
      const filePath = `routine-images/${user.id}/${selectedChild.id}/${selectedTime}/${selectedDayType}/${taskId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('pecs-images')
        .upload(filePath, decode(asset.base64), {
          contentType: asset.mimeType || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('pecs-images')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error('Could not generate public image URL.');
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                image_url: publicUrl,
                is_custom_image: true,
              }
            : task
        )
      );
    } catch (error: any) {
      console.error('Routine image upload error:', error);
      Alert.alert('Upload Failed', error?.message || 'Could not upload routine photo.');
    } finally {
      setUploadingTaskId(null);
    }
  };

  const removeTaskPhoto = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              image_url: null,
              is_custom_image: false,
            }
          : task
      )
    );
  };

  const saveRoutine = async () => {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child profile first.');
      return;
    }

    if (tasks.length === 0) {
      Alert.alert('No Tasks', 'Add at least one task before saving.');
      return;
    }

    setSaving(true);

    try {
      const { error: deleteError } = await withTimeout(
         supabase
        .from('custom_routines')
        .delete()
        .eq('child_id', selectedChild.id)
        .eq('routine_period', selectedTime)
        .eq('day_type', selectedDayType),
        10000,
      );

      if (deleteError) throw deleteError;

      const payload = normalizeTasks(tasks).map((task, index) => ({
        child_id: selectedChild.id,
        routine_period: selectedTime,
        day_type: selectedDayType,
        task_name: task.task_name,
        sort_order: index + 1,
        image_url: task.image_url || null,
        default_icon: task.default_icon,
        is_custom_image: !!task.is_custom_image,
      }));

      const { error: insertError } = await withTimeout(
        supabase.from('custom_routines').insert(payload),
        10000,
        );

      if (insertError) {
        const fallbackPayload = normalizeTasks(tasks).map((task, index) => ({
          child_id: selectedChild.id,
          routine_period: selectedTime,
          day_type: selectedDayType,
          task_name: task.task_name,
          sort_order: index + 1,
        }));

        const { error: fallbackInsertError } = await supabase
          .from('custom_routines')
          .insert(fallbackPayload);

        if (fallbackInsertError) throw fallbackInsertError;
      }

      setRoutineSource('saved');

      Alert.alert(
  'Routine Saved',
  `${formatPeriod(selectedTime)} routine for ${selectedDayLabel} updated for ${childName}.`,
  [
    {
      text: 'OK',
      onPress: () => router.back(),
    },
  ]
);
    } catch (error: any) {
      console.error('Save custom routine error:', error);
      Alert.alert('Save Error', error?.message || 'Could not save routine.');
    } finally {
      setSaving(false);
    }
  };

  const renderTaskItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<EditableTask>) => {
    const index = getIndex() ?? 0;
    const uploading = uploadingTaskId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.98}
        onLongPress={drag}
        delayLongPress={150}
        style={[styles.taskCard, isActive && styles.taskCardDragging]}
      >
        <View style={styles.taskTopRow}>
          <View style={styles.taskLeft}>
            <View style={styles.taskNumberBubble}>
              <Text style={styles.taskNumberText}>{index + 1}</Text>
            </View>

            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.taskPhoto} resizeMode="cover" />
            ) : (
              <View style={styles.defaultIconWrap}>
                <Ionicons name={item.default_icon} size={22} color="#4F46E5" />
              </View>
            )}

            <View style={styles.taskNameWrap}>
              <Text style={styles.taskName}>{item.task_name}</Text>
              <Text style={styles.taskMeta}>
                {item.image_url ? 'Custom photo added' : 'Using default icon'}
              </Text>
            </View>
          </View>

          <View style={styles.taskRight}>
            <TouchableOpacity style={styles.dragHandle} onLongPress={drag}>
              <Ionicons name="menu" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.removeBtn} onPress={() => removeTask(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.photoActionRow}>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => void uploadTaskPhoto(item.id)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <>
                <Ionicons name="image-outline" size={16} color="#4F46E5" />
                <Text style={styles.photoBtnText}>
                  {item.image_url ? 'Replace Photo' : 'Add Photo'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {item.image_url ? (
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeTaskPhoto(item.id)}>
              <Ionicons name="close-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.removePhotoBtnText}>Remove Photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="create-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>
            Please select or create a child profile to customize routines.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || subscriptionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading routine editor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.screenInner}>
          <ScrollView
            contentContainerStyle={styles.topContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Customize Routine</Text>
              <Text style={styles.subtitle}>
                Create routines for school days, weekends, or specific days of the week.
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

            <View style={styles.daySelectorCard}>
              <View style={styles.daySelectorHeader}>
                <Text style={styles.cardTitle}>Schedule</Text>
                <View style={styles.sourcePill}>
                  <Text style={styles.sourcePillText}>
                    {routineSource === 'saved' ? 'Saved Routine' : 'Default Routine'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardHint}>
                Choose when this routine should be used.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayChipScroll}
              >
                {DAY_TYPES.map((day) => {
                  const active = selectedDayType === day.value;

                  return (
                    <TouchableOpacity
                      key={day.value}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => setSelectedDayType(day.value)}
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.dayHelperText}>
                {DAY_TYPES.find((item) => item.value === selectedDayType)?.helper}
              </Text>
            </View>

            <View style={styles.editorCard}>
              <Text style={styles.cardTitle}>Add Task</Text>

              <View style={styles.addRow}>
                <TextInput
                  value={taskInput}
                  onChangeText={setTaskInput}
                  placeholder="Enter routine task"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />

                <TouchableOpacity style={styles.addTaskBtn} onPress={addTask}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.cardHint}>
                Example: Wash hands, Put shoes on, Pack backpack
              </Text>
            </View>

            <View style={styles.taskListCard}>
              <View style={styles.taskListHeader}>
                <Text style={styles.cardTitle}>
                  {formatPeriod(selectedTime)} Tasks • {selectedDayLabel}
                </Text>

                <TouchableOpacity onPress={resetToDefault}>
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.dragHint}>
                Press and hold a task, then drag it to reorder.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.listWrap}>
            {tasks.length === 0 ? (
              <View style={styles.emptyListState}>
                <Text style={styles.emptyTasksText}>No tasks added yet.</Text>
              </View>
            ) : (
              <DraggableFlatList
                data={tasks}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => setTasks(normalizeTasks(data))}
                renderItem={renderTaskItem}
                contentContainerStyle={styles.draggableContent}
                showsVerticalScrollIndicator={false}
                activationDistance={10}
              />
            )}
          </View>

          <View style={styles.bottomContent}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={() => void saveRoutine()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save {selectedDayLabel} Routine</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle-outline" size={18} color="#4F46E5" />
                <Text style={styles.infoTitle}>How this works</Text>
              </View>
              <Text style={styles.infoText}>
                Save different routines for school days, weekends, or specific days.
                The routine screen can use the best match for the current day.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  screenInner: { flex: 1 },
  topContent: { padding: 20, paddingBottom: 12 },
  bottomContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: '#F8FAFC',
  },
  listWrap: { flex: 1, minHeight: 180 },
  draggableContent: { paddingHorizontal: 20, paddingBottom: 10 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },
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
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { marginTop: 6, color: '#64748B', lineHeight: 20 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  timeBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  timeText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  timeTextActive: { color: '#FFFFFF' },

  daySelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  daySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayChipScroll: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  dayChip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  dayChipText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 12,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  dayHelperText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  sourcePill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sourcePillText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '900',
  },

  editorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cardHint: { fontSize: 12, color: '#64748B', marginTop: 10 },
  dragHint: { marginTop: 10, color: '#64748B', fontSize: 12, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0F172A',
  },
  addTaskBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  emptyListState: { paddingHorizontal: 20, paddingTop: 10 },
  emptyTasksText: {
    color: '#64748B',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskCard: {
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  taskCardDragging: { opacity: 0.9, transform: [{ scale: 1.01 }] },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskNumberBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskNumberText: { color: '#4F46E5', fontWeight: '800', fontSize: 12 },
  defaultIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskPhoto: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  taskNameWrap: { flex: 1 },
  taskName: { color: '#1E293B', fontWeight: '700', fontSize: 14, flex: 1 },
  taskMeta: { marginTop: 4, color: '#64748B', fontSize: 12, fontWeight: '600' },
  dragHandle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActionRow: { flexDirection: 'row', marginTop: 12, gap: 10, flexWrap: 'wrap' },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  photoBtnText: { marginLeft: 6, color: '#4F46E5', fontWeight: '800', fontSize: 12 },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  removePhotoBtnText: {
    marginLeft: 6,
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginLeft: 8 },
  infoCard: { backgroundColor: '#EEF2FF', borderRadius: 20, padding: 16 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoTitle: { marginLeft: 8, fontWeight: '800', color: '#3730A3' },
  infoText: { color: '#4338CA', lineHeight: 20, fontSize: 14 },
});