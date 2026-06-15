import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '../../lib/SelectedChildContext';
import { canManageLessonReminders } from '../../lib/caregiverPermissions';
import {
  cancelDailyLessonReminder,
  scheduleDailyLessonReminder,
} from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

type ReminderTimeOption = {
  label: string;
  hour: number;
  minute: number;
};

const TIME_OPTIONS: ReminderTimeOption[] = [
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '3:00 PM', hour: 15, minute: 0 },
  { label: '5:00 PM', hour: 17, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '7:00 PM', hour: 19, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
];

export default function DailyRemindersScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const role = selectedChild?.caregiver_access_role;
  const canEditReminders = canManageLessonReminders(role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);

  const childName = useMemo(
    () => selectedChild?.child_name || selectedChild?.name || 'your child',
    [selectedChild]
  );

  const selectedLabel = useMemo(() => {
    const found = TIME_OPTIONS.find(
      (item) => item.hour === hour && item.minute === minute
    );

    return found?.label || `${hour}:${String(minute).padStart(2, '0')}`;
  }, [hour, minute]);

  const getUserId = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.id) {
      throw new Error('No authenticated user found.');
    }

    return data.user.id;
  };

  const loadPreferences = useCallback(async () => {
    if (!selectedChild?.id) {
      setEnabled(false);
      setHour(18);
      setMinute(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const userId = await getUserId();

    const { data, error } = await supabase
  .from('notification_preferences')
  .select('daily_lesson_enabled, daily_lesson_hour, daily_lesson_minute')
  .eq('user_id', userId)
  .eq('child_id', selectedChild.id)
  .maybeSingle();

if (error) throw error;

      setEnabled(data?.daily_lesson_enabled ?? false);
      setHour(data?.daily_lesson_hour ?? 18);
      setMinute(data?.daily_lesson_minute ?? 0);
    } catch (error) {
      console.error('Load reminder preferences error:', error);
      setEnabled(false);
      setHour(18);
      setMinute(0);
    } finally {
      setLoading(false);
    }
  }, [selectedChild?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences])
  );

  const savePreferences = async (
    nextEnabled: boolean,
    nextHour: number,
    nextMinute: number
  ) => {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child first.');
      return;
    }

    try {
      setSaving(true);

      const userId = await getUserId();
      const now = new Date().toISOString();

     const existing = await supabase
  .from('notification_preferences')
  .select('id')
  .eq('user_id', userId)
  .eq('child_id', selectedChild.id)
  .maybeSingle();

if (existing.error) throw existing.error;

const payload = {
  user_id: userId,
  child_id: selectedChild.id,
  daily_lesson_enabled: nextEnabled,
  daily_lesson_hour: nextHour,
  daily_lesson_minute: nextMinute,
  updated_at: now,
};

const { error } = existing.data?.id
  ? await supabase
      .from('notification_preferences')
      .update(payload)
      .eq('id', existing.data.id)
  : await supabase.from('notification_preferences').insert(payload);

if (error) throw error;

      if (nextEnabled) {
        await scheduleDailyLessonReminder({
          hour: nextHour,
          minute: nextMinute,
          childName,
        });
      } else {
        await cancelDailyLessonReminder();
      }

      setEnabled(nextEnabled);
      setHour(nextHour);
      setMinute(nextMinute);

      Alert.alert(
        'Saved',
        nextEnabled
          ? `Daily reminder set for ${
              TIME_OPTIONS.find(
                (item) => item.hour === nextHour && item.minute === nextMinute
              )?.label || 'your selected time'
            }.`
          : 'Daily lesson reminders turned off.'
      );
    } catch (error: any) {
      console.error('Save reminder preferences error:', error);
      Alert.alert(
        'Save Error',
        error?.message || 'Could not save reminder settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    await savePreferences(value, hour, minute);
  };

  const handleSelectTime = async (option: ReminderTimeOption) => {
    await savePreferences(enabled, option.hour, option.minute);
  };

  if (!canEditReminders) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.restrictedCard}>
        <Ionicons name="lock-closed-outline" size={42} color="#94A3B8" />

        <Text style={styles.restrictedTitle}>Parent Access Only</Text>

        <Text style={styles.restrictedText}>
          Only the child profile owner or second parent can manage daily lesson reminders.
        </Text>

        <TouchableOpacity
          style={styles.restrictedButton}
          onPress={() => router.back()}
        >
          <Text style={styles.restrictedButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
            <Ionicons name="notifications-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>DAILY LESSON REMINDERS</Text>
          </View>

          <Text style={styles.heroTitle}>Daily Lesson Reminders</Text>

          <Text style={styles.heroSubtitle}>
            Help parents stay consistent with a daily reminder to complete a
            lesson with {childName}.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading reminder settings...</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.sectionTitle}>
                    Enable daily reminders
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Send one reminder every day to complete a lesson.
                  </Text>
                </View>

                <Switch
                  value={enabled}
                  onValueChange={(value) => void handleToggle(value)}
                  trackColor={{ false: '#CBD5E1', true: '#A5B4FC' }}
                  thumbColor={enabled ? '#4F46E5' : '#FFFFFF'}
                  disabled={saving}
                />
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Reminder time</Text>
              <Text style={styles.sectionSubtitle}>
                Current time: {selectedLabel}
              </Text>

              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map((option) => {
                  const active =
                    option.hour === hour && option.minute === minute;

                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.timeChip,
                        active && styles.timeChipActive,
                      ]}
                      onPress={() => void handleSelectTime(option)}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          active && styles.timeChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>How it works</Text>

              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />
                <Text style={styles.tipText}>One reminder per day</Text>
              </View>

              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />
                <Text style={styles.tipText}>
                  Uses your selected child’s name
                </Text>
              </View>

              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />
                <Text style={styles.tipText}>Can be turned off anytime</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={() => void savePreferences(enabled, hour, minute)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    Save Reminder Settings
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
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

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    marginLeft: 8,
    color: '#64748B',
    fontWeight: '700',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },

  sectionSubtitle: {
    color: '#64748B',
    lineHeight: 19,
    fontSize: 13,
    fontWeight: '600',
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },

  timeChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  timeChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },

  timeChipText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 12,
  },

  timeChipTextActive: {
    color: '#4F46E5',
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  tipText: {
    flex: 1,
    marginLeft: 10,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '600',
  },

  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },

  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },

  restrictedCard: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
},

restrictedTitle: {
  marginTop: 14,
  fontSize: 22,
  fontWeight: '900',
  color: '#0F172A',
},

restrictedText: {
  marginTop: 8,
  color: '#64748B',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
  lineHeight: 21,
},

restrictedButton: {
  marginTop: 22,
  backgroundColor: '#4F46E5',
  borderRadius: 18,
  paddingVertical: 13,
  paddingHorizontal: 22,
},

restrictedButtonText: {
  color: '#FFFFFF',
  fontWeight: '900',
},
});