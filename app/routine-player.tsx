import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RoutineStep = {
  id: string;
  title: string;
  icon?: string;
  photoUrl?: string | null;
};

export default function RoutinePlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const steps = useMemo(() => {
    try {
      return JSON.parse(String(params.steps || '[]')) as RoutineStep[];
    } catch {
      return [];
    }
  }, [params.steps]);

  const childName = String(params.childName || 'your child');
  const routineName = String(params.routineName || 'Routine');

  const [currentIndex, setCurrentIndex] = useState(0);

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  function handleDone() {
    if (isLastStep) {
      router.back();
      return;
    }

    setCurrentIndex((current) => current + 1);
  }

  if (!currentStep) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No routine steps found</Text>

          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerText}>
          {currentIndex + 1} of {steps.length}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.routineLabel}>{routineName}</Text>

        <Text style={styles.stepTitle}>{currentStep.title}</Text>

        <View style={styles.imageWrap}>
          {currentStep.photoUrl ? (
            <Image
              source={{ uri: currentStep.photoUrl }}
              style={styles.stepImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name={(currentStep.icon as any) || 'sparkles-outline'}
              size={96}
              color="#5B3FF4"
            />
          )}
        </View>

        <Text style={styles.promptText}>
          {childName}, it’s time to {currentStep.title.toLowerCase()}.
        </Text>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Ionicons name="checkmark-circle" size={26} color="#FFFFFF" />
          <Text style={styles.doneButtonText}>
            {isLastStep ? 'Finish Routine' : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  headerText: {
    flex: 1,
    textAlign: 'center',
    marginRight: 48,
    color: '#64748B',
    fontSize: 16,
    fontWeight: '900',
  },

  card: {
    flex: 1,
    backgroundColor: '#F3EEFF',
    borderRadius: 36,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  routineLabel: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12,
  },

  stepTitle: {
    color: '#0F172A',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
  },

  imageWrap: {
    width: '100%',
    height: 260,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 28,
  },

  stepImage: {
    width: '100%',
    height: '100%',
  },

  promptText: {
    color: '#4F46E5',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 28,
  },

  doneButton: {
    width: '100%',
    height: 64,
    borderRadius: 24,
    backgroundColor: '#5B3FF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
  },
});