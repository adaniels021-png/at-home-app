import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSubscription } from '../lib/SubscriptionContext';

type SupportSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  iconBg?: string;
  border: string;
  proOnly?: boolean;
  route:
    | '/parent-support/emotional-reset'
    | '/parent-support/journal'
    | '/parent-support/daily-permission'
    | '/parent-support/parent-wins';
};

const SUPPORT_SECTIONS: SupportSection[] = [
  {
    id: 'parent-wins',
    title: 'Parent Wins',
    subtitle: 'Positive wins from caregivers navigating autism support at home.',
    icon: 'people-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
    iconBg: '#FFFFFF',
    border: '#DDD6FE',
    route: '/parent-support/parent-wins',
  },
  {
    id: 'emotional-reset',
    title: 'Emotional Reset',
    subtitle:
      'A quick parent reset that helps you calm your body and know what to do next.',
    icon: 'leaf-outline',
    color: '#EA580C',
    bg: '#FFF7ED',
    iconBg: '#FFEDD5',
    border: '#FED7AA',
    proOnly: true,
    route: '/parent-support/emotional-reset',
  },
  {
    id: 'journal',
    title: 'Parent Journal',
    subtitle:
      'Quick check-ins with options to type, reflect, or use voice-to-text.',
    icon: 'journal-outline',
    color: '#0F766E',
    bg: '#ECFDF5',
    iconBg: '#D1FAE5',
    border: '#A7F3D0',
    proOnly: true,
    route: '/parent-support/journal',
  },
  {
    id: 'daily-permission',
    title: 'Daily Permission',
    subtitle:
      'Encouragement, hard-day support, burnout reminders, and parent sensory overload tips.',
    icon: 'sparkles-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    iconBg: '#FFE4E6',
    border: '#FECDD3',
    proOnly: true,
    route: '/parent-support/daily-permission',
  },
];

export default function ParentSupportScreen() {
  const router = useRouter();
  const { isPro, adminMode, loading } = useSubscription();

  const hasProAccess = isPro || adminMode;

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  function handleSectionPress(section: SupportSection) {
    if (section.proOnly && !hasProAccess) {
      Alert.alert(
        'Pro Parent Support',
        `${section.title} is included with ABA at Home Pro.`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/subscription'),
          },
        ]
      );
      return;
    }

    router.push(section.route);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Checking access...</Text>
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Parent Support</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="heart-circle" size={36} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Support for You</Text>

          <Text style={styles.heroText}>
            A calm caregiver space for hard moments, reflection, encouragement,
            and emotional reset tools.
          </Text>
        </View>

        {!hasProAccess ? (
          <View style={styles.freeBanner}>
            <Ionicons name="gift-outline" size={20} color="#7C3AED" />

            <View style={{ flex: 1 }}>
              <Text style={styles.freeBannerTitle}>Parent Wins is free</Text>
              <Text style={styles.freeBannerText}>
                Pro unlocks emotional reset, journaling, saved reflections, and
                Daily Permission.
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Parent Support Tools</Text>

        <View style={styles.sectionList}>
          {SUPPORT_SECTIONS.map((section) => {
            const locked = !!section.proOnly && !hasProAccess;

            return (
              <TouchableOpacity
                key={section.id}
                activeOpacity={0.88}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: section.bg,
                    borderColor: section.border,
                  },
                  locked && styles.lockedCard,
                ]}
                onPress={() => handleSectionPress(section)}
              >
                <View style={styles.sectionLeft}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: section.iconBg || '#FFFFFF' },
                    ]}
                  >
                    <Ionicons
                      name={locked ? 'lock-closed-outline' : section.icon}
                      size={26}
                      color={section.color}
                    />
                  </View>

                  <View style={styles.sectionTextWrap}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.sectionCardTitle,
                          { color: section.color },
                        ]}
                      >
                        {section.title}
                      </Text>

                      {locked ? (
                        <View style={styles.proPill}>
                          <Text style={styles.proPillText}>PRO</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.sectionSubtitle}>
                      {section.subtitle}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={section.color}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.savedReflectionButton,
            !hasProAccess && styles.lockedSavedButton,
          ]}
          onPress={() => {
            if (!hasProAccess) {
              router.push('/subscription');
              return;
            }

            router.push('/parent-support/saved-reflections');
          }}
        >
          <View style={styles.savedReflectionLeft}>
            <Ionicons
              name={hasProAccess ? 'bookmark-outline' : 'lock-closed-outline'}
              size={18}
              color="#2563EB"
            />

            <Text style={styles.savedReflectionText}>
              {hasProAccess ? 'Saved Reflections' : 'Saved Reflections Pro'}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#2563EB" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color="#059669"
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              Caregiver support, not medical advice
            </Text>

            <Text style={styles.infoText}>
              These tools support caregiver wellness and daily coping. They do
              not replace therapy, medical care, crisis support, or emergency
              services.
            </Text>
          </View>
        </View>
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
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '800',
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
    backgroundColor: '#7C3AED',
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
    color: '#EDE9FE',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  freeBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  freeBannerTitle: {
    color: '#5B21B6',
    fontWeight: '900',
    fontSize: 14,
  },

  freeBannerText: {
    marginTop: 4,
    color: '#6D28D9',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  sectionList: {
    gap: 14,
    marginBottom: 18,
  },

  sectionCard: {
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  lockedCard: {
    opacity: 0.92,
  },

  sectionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  sectionTextWrap: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },

  sectionCardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  proPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  proPillText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  savedReflectionButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  lockedSavedButton: {
    backgroundColor: '#EFF6FF',
  },

  savedReflectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  savedReflectionText: {
    marginLeft: 8,
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 22,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  infoTitle: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
  },

  infoText: {
    marginLeft: 10,
    marginTop: 4,
    color: '#047857',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});