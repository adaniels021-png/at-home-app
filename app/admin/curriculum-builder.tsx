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
import { CURRICULUM } from '../../lib/curriculum';

export default function CurriculumBuilderScreen() {
  const router = useRouter();

  const openLessonLibrary = () => {
    router.push('/admin/lesson-library' as any);
  };

  const openGenerateLessons = () => {
    router.push('/admin/generate-lessons' as any);
  };

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
              Organize lessons by skill area, stage, and progression.
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="map-outline" size={30} color="#7C3AED" />
          </View>

          <Text style={styles.heroTitle}>Primary lesson management hub</Text>
          <Text style={styles.heroText}>
            Start here to plan curriculum coverage, review skill stages, and generate new lessons where gaps exist.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={openGenerateLessons}>
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Generate Lessons</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={openLessonLibrary}>
              <Ionicons name="library-outline" size={18} color="#7C3AED" />
              <Text style={styles.secondaryButtonText}>All Lessons</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Curriculum Areas</Text>

        {CURRICULUM.map((area) => (
          <View key={area.title} style={styles.areaCard}>
            <View style={styles.areaHeader}>
              <View style={styles.areaIcon}>
                <Ionicons name={area.icon} size={22} color="#7C3AED" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.areaTitle}>{area.title}</Text>
                <Text style={styles.areaSub}>{area.skills.length} stages planned</Text>
              </View>

              <TouchableOpacity style={styles.areaGenerateButton} onPress={openGenerateLessons}>
                <Text style={styles.areaGenerateText}>Generate</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stageWrap}>
              {area.skills.map((skill, index) => (
            <TouchableOpacity
              key={`${area.title}-${skill.id}`}
                  style={styles.stageCard}
                  onPress={openLessonLibrary}
                  activeOpacity={0.85}
                >
                  <View style={styles.stageNumber}>
                    <Text style={styles.stageNumberText}>{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.stageLabel}>
                  {skill.stages.length} stages
                </Text>
                <Text style={styles.stageTitle}>{skill.title}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footerCard}>
          <Ionicons name="information-circle-outline" size={22} color="#7C3AED" />
          <Text style={styles.footerText}>
            Next upgrade: each stage will open filtered lessons, lesson counts, and batch generation tools.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
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
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#2E1065',
  },
  subtitle: {
    marginTop: 3,
    color: '#7C6F92',
    fontWeight: '700',
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
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
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  secondaryButtonText: {
    marginLeft: 7,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 12,
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  areaIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  areaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  areaSub: {
    marginTop: 3,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  areaGenerateButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  areaGenerateText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  stageWrap: {
    gap: 10,
  },
  stageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageNumber: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stageNumberText: {
    color: '#6D28D9',
    fontWeight: '900',
    fontSize: 13,
  },
  stageLabel: {
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 11,
    marginBottom: 3,
  },
  stageTitle: {
    color: '#1E293B',
    fontWeight: '900',
    fontSize: 15,
  },
  footerCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footerText: {
    flex: 1,
    marginLeft: 10,
    color: '#6D28D9',
    fontWeight: '800',
    lineHeight: 19,
    fontSize: 13,
  },
});