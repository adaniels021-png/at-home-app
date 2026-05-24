import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  deleteParentReflection,
  getParentReflectionById,
  SavedParentReflection,
} from '@/lib/parentReflectionsStorage';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReflectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [reflection, setReflection] = useState<SavedParentReflection | null>(
    null
  );

  useEffect(() => {
    async function loadReflection() {
      if (!id) return;

      const saved = await getParentReflectionById(id);
      setReflection(saved);
    }

    void loadReflection();
  }, [id]);

  async function handleDelete() {
    if (!reflection) return;

    Alert.alert(
      'Delete Reflection',
      'Are you sure you want to delete this saved reflection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteParentReflection(reflection.id);
            router.back();
          },
        },
      ]
    );
  }

  if (!reflection) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={44} color="#94A3B8" />

          <Text style={styles.emptyTitle}>Reflection not found</Text>

          <Text style={styles.emptyText}>
            This reflection may have been deleted or is no longer available.
          </Text>

          <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
            <Text style={styles.backHomeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Reflection</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: reflection.color }]}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons
              name={reflection.icon as keyof typeof Ionicons.glyphMap}
              size={34}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>{reflection.title}</Text>

          <Text style={styles.heroText}>{reflection.subtitle}</Text>

          <Text style={styles.heroDate}>{formatDate(reflection.createdAt)}</Text>
        </View>

        {!!reflection.body && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reflection Note</Text>
            <Text style={styles.bodyText}>{reflection.body}</Text>
          </View>
        )}

        {reflection.mood && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mood</Text>
            <Text style={styles.bodyText}>{reflection.mood}</Text>
          </View>
        )}

        {typeof reflection.stressLevel === 'number' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stress Level</Text>
            <Text style={styles.bodyText}>{reflection.stressLevel} / 5</Text>
          </View>
        )}

        {!!reflection.completedSteps?.length && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Completed Steps</Text>

            {reflection.completedSteps.map((step) => (
              <View key={step} style={styles.stepRow}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="sparkles-outline" size={22} color="#7C3AED" />

          <Text style={styles.infoText}>
            Return to this reflection when a similar moment happens again. What
            helped before can help guide the next hard moment.
          </Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete Reflection</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  headerSpacer: {
    width: 42,
  },

  heroCard: {
    overflow: 'hidden',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
  },

  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -70,
    right: -55,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#FFFFFF',
    opacity: 0.9,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  heroDate: {
    marginTop: 12,
    color: '#FFFFFF',
    opacity: 0.85,
    fontSize: 13,
    fontWeight: '900',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },

  bodyText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },

  stepText: {
    flex: 1,
    marginLeft: 9,
    color: '#047857',
    fontWeight: '800',
    lineHeight: 20,
  },

  infoCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#5B21B6',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
  },

  deleteButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  emptyWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '700',
  },

  backHomeButton: {
    marginTop: 20,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },

  backHomeButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});