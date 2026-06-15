import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProGate from '../../components/ProGate';
import { useChild } from '../../lib/SelectedChildContext';
import { supabase } from '../../lib/supabase';

type TimePeriod = 'morning' | 'afternoon' | 'evening';

type RoutineTask = {
  task_name: string;
  image_url?: string | null;
  default_icon?: keyof typeof Ionicons.glyphMap;
  sort_order?: number;
};

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

export default function PracticeModeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { selectedChild } = useChild();

  const initialTime =
  params.selectedTime === 'afternoon' || params.selectedTime === 'evening'
    ? params.selectedTime
    : 'morning';

  const [selectedTime, setSelectedTime] = useState<TimePeriod>(
  initialTime as TimePeriod
);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completedSession, setCompletedSession] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const currentTask = tasks[currentIndex];

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const nextTask = tasks[currentIndex + 1];

function getEncouragement(taskName?: string) {
  const name = taskName?.toLowerCase() || '';

  if (name.includes('wake')) return 'Good morning!';
  if (name.includes('brush')) return 'Keep those teeth clean!';
  if (name.includes('dress')) return 'Almost ready!';
  if (name.includes('breakfast')) return 'Fuel your body!';
  if (name.includes('bus')) return 'Have a great day!';
  if (name.includes('bath')) return 'Time to get clean!';
  if (name.includes('bed')) return 'Almost bedtime!';
  if (name.includes('pajama')) return 'Cozy time!';
  if (name.includes('dinner')) return 'Dinner time!';

  return 'You can do this.';
}

function goToNextStep() {
  if (!tasks.length) return;

  if (currentIndex < tasks.length - 1) {
    setCurrentIndex((prev) => prev + 1);
  } else {
    setCompletedSession(true);
  }
}

  useEffect(() => {
    void loadRoutine();
  }, [selectedChild, selectedTime]);

 useEffect(() => {
  if (!loading && currentTask && !completedSession) {
    const timer = setTimeout(() => {
      void speakTask();
    }, 400);

    return () => clearTimeout(timer);
  }
}, [currentIndex, loading, completedSession, currentTask?.task_name]);

useEffect(() => {
  return () => {
    Speech.stop();
  };
}, []);

  const loadRoutine = async () => {
    if (!selectedChild?.id) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setCompletedSession(false);
    setCurrentIndex(0);

    try {
      const { data, error } = await supabase
        .from('custom_routines')
        .select('task_name, image_url, default_icon, sort_order')
        .eq('child_id', selectedChild.id)
        .eq('routine_period', selectedTime)
        .order('sort_order', { ascending: true });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setTasks(data as RoutineTask[]);
      } else {
        setTasks(DEFAULT_ROUTINES[selectedTime]);
      }
    } catch (e) {
      console.error('Practice mode load error:', e);
      setTasks(DEFAULT_ROUTINES[selectedTime]);
      Alert.alert('Notice', 'Using default routine for this practice session.');
    } finally {
      setLoading(false);
    }
  };

  const speakTask = async () => {
    if (!currentTask) return;

    try {
      const alreadySpeaking = await Speech.isSpeakingAsync();
      if (alreadySpeaking) {
        Speech.stop();
      }

      setSpeaking(true);

      Speech.speak(currentTask.task_name, {
        rate: 0.8,
        pitch: 1,
        language: 'en-US',
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => {
          setSpeaking(false);
          Alert.alert('Voice Error', 'Could not play audio right now.');
        },
      });
    } catch (error) {
      console.error('Speak task error:', error);
      setSpeaking(false);
      Alert.alert('Voice Error', 'Could not play audio right now.');
    }
  };

  const handleNext = () => {
  if (!tasks.length) return;

  setShowCelebration(true);

  setTimeout(() => {
    setShowCelebration(false);
    goToNextStep();
  }, 750);
};

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setCompletedSession(false);
  };

  const getTimeLabel = (time: TimePeriod) => {
    return time.charAt(0).toUpperCase() + time.slice(1);
  };

  if (loading) {
    return (
      <ProGate>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading practice mode...</Text>
        </View>
      </ProGate>
    );
  }

  if (!selectedChild) {
    return (
      <ProGate>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Ionicons name="person-outline" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No child selected</Text>
            <Text style={styles.emptyText}>
              Please select a child profile before starting practice mode.
            </Text>
          </View>
        </SafeAreaView>
      </ProGate>
    );
  }

  if (!tasks.length) {
    return (
      <ProGate>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No routine found</Text>
            <Text style={styles.emptyText}>
              Add routine tasks first, then come back to practice mode.
            </Text>

            <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
              <Text style={styles.exitBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ProGate>
    );
  }

  if (completedSession) {
    return (
      <ProGate>
        <SafeAreaView style={styles.container}>
          <View style={styles.completedWrap}>
            <View style={styles.completedIcon}>
              <Ionicons name="trophy-outline" size={54} color="#F59E0B" />
            </View>

            <Text style={styles.completedTitle}>Amazing Job {childName}!</Text>
            <Text style={styles.completedText}>
              You completed your {getTimeLabel(selectedTime).toLowerCase()} routine!
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={restartSession}>
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Practice Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ProGate>
    );
  }

  return (
    <ProGate>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Child Mode</Text>

          <View style={styles.iconBtnPlaceholder} />
        </View>

        <Text style={styles.subtitle}>
           One step at a time for {childName}
       </Text>


        <View style={styles.progressWrap}>
          <Text style={styles.progressText}>
            Step {currentIndex + 1} of {tasks.length}
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentIndex + 1) / tasks.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.firstThenCard}>
  <View style={[styles.firstThenBlock, styles.firstBlock]}>
    <Text style={styles.firstThenLabel}>FIRST</Text>
    <Text style={styles.firstThenText}>
      {currentTask?.task_name}
    </Text>
  </View>

  <Ionicons name="arrow-forward" size={18} color="#64748B" />

  <View style={[styles.firstThenBlock, styles.thenBlock]}>
    <Text style={styles.firstThenLabel}>THEN</Text>
    <Text style={styles.firstThenText}>
      {nextTask?.task_name || 'All done'}
    </Text>
  </View>
</View>

        <View style={styles.card}>
         <TouchableOpacity
  style={styles.visualBox}
  activeOpacity={0.9}
  onPress={() => void speakTask()}
>
  {currentTask?.image_url ? (
    <Image
      source={{ uri: currentTask.image_url }}
      style={styles.image}
      resizeMode="cover"
    />
  ) : (
    <View style={styles.iconCircle}>
      <Ionicons
        name={currentTask?.default_icon || 'checkmark-circle'}
        size={120}
        color="#4F46E5"
      />
    </View>
  )}
</TouchableOpacity>

          <Text style={styles.taskText}>{currentTask?.task_name}</Text>
          <Text style={styles.taskHint}>
  {getEncouragement(currentTask?.task_name)}
</Text>

{showCelebration ? (
  <View style={styles.celebrationBubble}>
    <Text style={styles.celebrationText}>⭐ Great job!</Text>
  </View>
) : null}
        </View>

        

        <View style={styles.actions}>
          <TouchableOpacity style={styles.backActionBtn} onPress={handleBack} disabled={currentIndex === 0}>
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={currentIndex === 0 ? '#94A3B8' : '#475569'}
            />
            <Text
              style={[
                styles.backActionText,
                currentIndex === 0 && styles.disabledActionText,
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.speakBtn} onPress={() => void speakTask()}>
            {speaking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="volume-high" size={20} color="#FFFFFF" />
                <Text style={styles.btnText}>Say</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.btnText}>
              {currentIndex === tasks.length - 1 ? 'All Done!' : 'I Did It!'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.exitText}>Exit practice mode</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },

  center: {
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
    marginBottom: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  iconBtnPlaceholder: {
    width: 42,
    height: 42,
  },

  subtitle: {
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },

  progressWrap: {
    marginBottom: 18,
  },

  progressText: {
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },

  progressBarTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 999,
  },

  card: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  visualBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  image: {
  width: '100%',
  height: 330,
  borderRadius: 28,
  backgroundColor: '#FFFFFF',
},

 iconCircle: {
  width: '100%',
  height: 330,
  borderRadius: 36,
  backgroundColor: '#FFFFFF',
  justifyContent: 'center',
  alignItems: 'center',
},

  taskHint: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },

  backActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  backActionText: {
    color: '#475569',
    fontWeight: '800',
    marginLeft: 6,
  },

  disabledActionText: {
    color: '#94A3B8',
  },

  speakBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  nextBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 6,
    marginRight: 6,
  },

  exitText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#64748B',
    fontWeight: '700',
  },

  completedWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  completedIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  completedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  completedText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },

  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
    minWidth: 200,
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    marginLeft: 8,
  },

  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },

  secondaryBtnText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 15,
  },

  exitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },

  exitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

firstThenCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  padding: 14,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

firstThenBlock: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 10,
  borderRadius: 14,
},

firstBlock: {
  backgroundColor: '#EEF2FF',
},

thenBlock: {
  backgroundColor: '#F8FAFC',
},

firstThenLabel: {
  color: '#64748B',
  fontSize: 11,
  fontWeight: '900',
  marginBottom: 4,
},

firstThenText: {
  color: '#1E293B',
  fontSize: 15,
  fontWeight: '900',
  textAlign: 'center',
},

celebrationBubble: {
  marginTop: 18,
  backgroundColor: '#FFFBEB',
  borderRadius: 999,
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderWidth: 1,
  borderColor: '#FDE68A',
},

celebrationText: {
  color: '#92400E',
  fontSize: 16,
  fontWeight: '900',
},

taskText: {
  fontSize: 42,
  fontWeight: '900',
  textAlign: 'center',
  color: '#1E293B',
},
});