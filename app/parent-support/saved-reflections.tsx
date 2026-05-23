import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SavedReflectionPreview = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

const SAMPLE_REFLECTIONS: SavedReflectionPreview[] = [
  {
    id: 'sample-1',
    title: 'Journal Check-In',
    subtitle: 'Stress level: 4 • Feeling overwhelmed, tired',
    date: 'Today',
    icon: 'journal-outline',
    color: '#0F766E',
    bg: '#ECFDF5',
  },
  {
    id: 'sample-2',
    title: 'Emotional Reset',
    subtitle: 'Lower the pressure first',
    date: 'Recently',
    icon: 'heart-circle-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    id: 'sample-3',
    title: 'Saved Reminder',
    subtitle: 'You are doing enough.',
    date: 'Recently',
    icon: 'sparkles-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
  },
];

export default function SavedReflectionsScreen() {
  const router = useRouter();

  const savedReflections: SavedReflectionPreview[] = [];

  const displayItems =
    savedReflections.length > 0 ? savedReflections : SAMPLE_REFLECTIONS;

  const usingSamples = savedReflections.length === 0;

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
            A place for journal check-ins, emotional reset notes, and helpful
            reminders you want to return to later.
          </Text>
        </View>

        {usingSamples && (
          <View style={styles.previewNotice}>
            <Ionicons name="information-circle-outline" size={20} color="#2563EB" />

            <Text style={styles.previewNoticeText}>
              Preview shown. Once journal saving is connected, your real saved
              reflections will appear here.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Recent Reflections</Text>

        <View style={styles.reflectionList}>
          {displayItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.88}
              style={[styles.reflectionCard, { backgroundColor: item.bg }]}
              onPress={() =>
                router.push({
                  pathname: '/parent-support/reflection-detail',
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.reflectionLeft}>
                <View style={styles.reflectionIcon}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.reflectionTitle, { color: item.color }]}>
                    {item.title}
                  </Text>

                  <Text style={styles.reflectionSubtitle}>
                    {item.subtitle}
                  </Text>

                  <Text style={styles.reflectionDate}>
                    {item.date}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={item.color} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="leaf-outline" size={22} color="#0F766E" />

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Built for short reflections</Text>

            <Text style={styles.infoText}>
              This section should stay simple. The goal is to help parents
              notice patterns, remember what helped, and come back to supportive
              reminders without feeling overwhelmed.
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

  previewNotice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  previewNoticeText: {
    flex: 1,
    marginLeft: 8,
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
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