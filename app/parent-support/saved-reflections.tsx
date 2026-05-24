import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getSavedParentReflections,
  SavedParentReflection,
} from '@/lib/parentReflectionsStorage';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function SavedReflectionsScreen() {
  const router = useRouter();

  const [savedReflections, setSavedReflections] = useState<
    SavedParentReflection[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadSavedReflections() {
        const saved = await getSavedParentReflections();

        if (active) {
          setSavedReflections(saved);
        }
      }

      void loadSavedReflections();

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Saved Reflections</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="bookmark-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Saved Reflections</Text>

          <Text style={styles.heroText}>
            Return to emotional resets, journal check-ins, and supportive
            reminders that helped before.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Reflections</Text>

        {savedReflections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={42} color="#94A3B8" />

            <Text style={styles.emptyTitle}>No saved reflections yet</Text>

            <Text style={styles.emptyText}>
              Save an Emotional Reset or Journal Check-In, and it will appear
              here for quick access.
            </Text>
          </View>
        ) : (
          <View style={styles.reflectionList}>
            {savedReflections.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                style={[
                  styles.reflectionCard,
                  { backgroundColor: item.bg },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/parent-support/reflection-detail',
                    params: { id: item.id },
                  })
                }
              >
                <View style={styles.reflectionLeft}>
                  <View style={styles.reflectionIcon}>
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={item.color}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.reflectionTitle,
                        { color: item.color },
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.reflectionSubtitle}>
                      {item.subtitle}
                    </Text>

                    <Text style={styles.reflectionDate}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={item.color}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="leaf-outline" size={22} color="#0F766E" />

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Built for short reflections</Text>

            <Text style={styles.infoText}>
              This section helps parents notice patterns, remember what helped,
              and return to supportive reminders without feeling overwhelmed.
            </Text>
          </View>
        </View>
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
    backgroundColor: '#334155',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
  },

  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  reflectionList: {
    gap: 14,
    marginBottom: 18,
  },

  reflectionCard: {
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  reflectionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  reflectionIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  reflectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  reflectionSubtitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  reflectionDate: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoTitle: {
    marginLeft: 10,
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '900',
  },

  infoText: {
    marginLeft: 10,
    marginTop: 4,
    color: '#115E59',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});