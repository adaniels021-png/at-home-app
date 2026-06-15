import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const scheduleOptions = [
  { label: 'Every 30 min', minutes: 30 },
  { label: 'Every 45 min', minutes: 45 },
  { label: 'Every 1 hour', minutes: 60 },
  { label: 'Every 90 min', minutes: 90 },
  { label: 'Every 2 hours', minutes: 120 },
];

export default function ToiletTrainingScheduleScreen() {
  const router = useRouter();

  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [lastPottyTime, setLastPottyTime] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!lastPottyTime) {
        setLastPottyTime(new Date());
      }
    }, [lastPottyTime])
  );

  const nextPottyTime = useMemo(() => {
    if (!lastPottyTime) return null;

    const next = new Date(lastPottyTime);
    next.setMinutes(next.getMinutes() + selectedMinutes);
    return next;
  }, [lastPottyTime, selectedMinutes]);

  const minutesUntilNext = useMemo(() => {
    if (!nextPottyTime) return null;

    const diff = nextPottyTime.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / 60000));
  }, [nextPottyTime]);

  function resetTimer() {
    setLastPottyTime(new Date());
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Potty Schedule</Text>
            <Text style={styles.subtitle}>
              Use predictable reminders to make potty practice easier.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="time-outline" size={30} color="#2563EB" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Next Potty Visit</Text>
            <Text style={styles.nextTime}>
              {nextPottyTime
                ? nextPottyTime.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Not started'}
            </Text>
            <Text style={styles.heroText}>
              {minutesUntilNext !== null
                ? minutesUntilNext === 0
                  ? 'It is time to try the potty.'
                  : `In about ${minutesUntilNext} minute${minutesUntilNext === 1 ? '' : 's'}.`
                : 'Start the timer to begin potty practice.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={resetTimer}>
          <Ionicons name="refresh-outline" size={21} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Start / Reset Potty Timer</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose Reminder Interval</Text>
          <Text style={styles.sectionSubtext}>
            Pick a starting schedule. You can adjust it as your child improves.
          </Text>
        </View>

        <View style={styles.optionsCard}>
          {scheduleOptions.map((option) => {
            const selected = selectedMinutes === option.minutes;

            return (
              <TouchableOpacity
                key={option.minutes}
                style={[styles.optionRow, selected && styles.optionRowSelected]}
                onPress={() => setSelectedMinutes(option.minutes)}
              >
                <View style={[styles.optionCircle, selected && styles.optionCircleSelected]}>
                  {selected ? (
                    <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{option.label}</Text>
                  <Text style={styles.optionText}>
                    Good for {option.minutes <= 45 ? 'early training' : 'building independence'}.
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggested Potty Times</Text>
          <Text style={styles.sectionSubtext}>
            These moments often work well for practice.
          </Text>
        </View>

        <View style={styles.tipsCard}>
          <ScheduleTip icon="sunny-outline" title="After waking up" />
          <ScheduleTip icon="restaurant-outline" title="After meals or drinks" />
          <ScheduleTip icon="bed-outline" title="Before nap or bedtime" />
          <ScheduleTip icon="car-outline" title="Before leaving the house" />
          <ScheduleTip icon="home-outline" title="When arriving home" />
        </View>

        <View style={styles.parentCard}>
          <View style={styles.parentIcon}>
            <Ionicons name="heart-outline" size={24} color="#7C3AED" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.parentTitle}>Parent Reminder</Text>
            <Text style={styles.parentText}>
              Keep potty sits short and calm. Praise cooperation first, even if your child does not go.
            </Text>
          </View>
        </View>

        <View style={styles.proCard}>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={13} color="#FFFFFF" />
            <Text style={styles.lockBadgeText}>Pro</Text>
          </View>

          <Ionicons name="notifications-outline" size={26} color="#7C3AED" />
          <Text style={styles.proTitle}>Custom Reminders Coming Next</Text>
          <Text style={styles.proText}>
            Later, Pro users can save custom schedules, reminder windows, and caregiver-shared potty plans.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScheduleTip({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={21} color="#2563EB" />
      </View>
      <Text style={styles.tipText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 19,
  },
  heroCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  nextTime: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  heroText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  optionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 17,
    marginBottom: 6,
  },
  optionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionCircleSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  optionText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  parentCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  parentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  parentTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4C1D95',
  },
  parentText: {
    fontSize: 13,
    color: '#5B21B6',
    marginTop: 4,
    lineHeight: 19,
  },
  proCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  lockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  lockBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  proTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 8,
  },
  proText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
    lineHeight: 19,
  },
});