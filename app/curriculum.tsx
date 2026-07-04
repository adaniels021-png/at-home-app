import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CURRICULUM_AREAS = [
  {
    title: 'Communication',
    icon: 'chatbubbles-outline',
    stages: [
      'Requesting',
      'Following Directions',
      'Answering Questions',
      'Commenting',
    ],
  },
  {
    title: 'Social Skills',
    icon: 'people-outline',
    stages: ['Turn Taking', 'Joint Attention', 'Peer Play', 'Conversation'],
  },
  {
    title: 'Play Skills',
    icon: 'game-controller-outline',
    stages: ['Functional Play', 'Imitation', 'Pretend Play', 'Independent Play'],
  },
  {
    title: 'Self-Help',
    icon: 'home-outline',
    stages: ['Hand Washing', 'Dressing', 'Toileting', 'Daily Routines'],
  },
  {
    title: 'Motor Skills',
    icon: 'walk-outline',
    stages: ['Gross Motor', 'Fine Motor', 'Movement Imitation', 'Coordination'],
  },
];

export default function CurriculumBuilderScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#29145F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Curriculum Builder</Text>
            <Text style={styles.subtitle}>
              Organize ABA at Home lessons by skill area, stage, and progression.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Ionicons name="map-outline" size={30} color="#7C3AED" />
          <Text style={styles.heroTitle}>Build the learning path</Text>
          <Text style={styles.heroText}>
            Use this admin tool to plan curriculum areas, review lesson coverage, and generate new lessons where gaps exist.
          </Text>
        </View>

        {CURRICULUM_AREAS.map((area) => (
          <View key={area.title} style={styles.areaCard}>
            <View style={styles.areaHeader}>
              <View style={styles.areaIcon}>
                <Ionicons name={area.icon as any} size={22} color="#7C3AED" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.areaTitle}>{area.title}</Text>
                <Text style={styles.areaSub}>
                  {area.stages.length} curriculum stages
                </Text>
              </View>

              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => router.push('/admin/generate-lessons' as any)}
              >
                <Text style={styles.generateButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stageWrap}>
              {area.stages.map((stage, index) => (
                <TouchableOpacity
                  key={stage}
                  style={styles.stageCard}
                  onPress={() => router.push('/admin/lesson-library' as any)}
                >
                  <View>
                    <Text style={styles.stageLabel}>Stage {index + 1}</Text>
                    <Text style={styles.stageTitle}>{stage}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  content: { padding: 20, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  title: { fontSize: 30, fontWeight: '900', color: '#2E1065' },
  subtitle: { marginTop: 3, color: '#7C6F92', fontWeight: '700', lineHeight: 20 },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 21,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  heroText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 21,
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  areaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  areaIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  areaTitle: { fontSize: 18, fontWeight: '900', color: '#1E1B4B' },
  areaSub: { marginTop: 3, color: '#64748B', fontWeight: '700', fontSize: 12 },
  generateButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  generateButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  stageWrap: { gap: 10 },
  stageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageLabel: {
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 11,
    marginBottom: 3,
  },
  stageTitle: { color: '#1E293B', fontWeight: '900', fontSize: 15 },
});