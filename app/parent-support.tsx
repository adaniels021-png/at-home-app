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

import { useSubscription } from '../lib/SubscriptionContext';

type SupportSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
  route:
    | '/parent-support/emotional-reset'
    | '/parent-support/journal'
    | '/parent-support/support-feed';
};

const SUPPORT_SECTIONS: SupportSection[] = [
  {
    id: 'emotional-reset',
    title: 'Emotional Reset',
    subtitle:
      'A quick parent reset that helps you calm your body and know what to do next.',
    icon: 'heart-circle-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    route: '/parent-support/emotional-reset',
  },
  {
    id: 'journal',
    title: 'Parent Journal',
    subtitle:
      'Quick check-ins with options to type, text-style journal, or use voice-to-text.',
    icon: 'journal-outline',
    color: '#0F766E',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    route: '/parent-support/journal',
  },
  {
    id: 'support-feed',
    title: 'Support Feed',
    subtitle:
      'Encouragement, hard-day support, burnout reminders, and parent sensory overload tips.',
    icon: 'sparkles-outline',
    color: '#BE123C',
    bg: '#FFF1F2',
    border: '#FECDD3',
    route: '/parent-support/support-feed',
  },
];

export default function ParentSupportScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();

  if (!isPro) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedContainer}>
          <View style={styles.lockedIcon}>
            <Ionicons name="lock-closed" size={34} color="#7C3AED" />
          </View>

          <Text style={styles.lockedTitle}>Parent Support is a Pro Feature</Text>

          <Text style={styles.lockedText}>
            Upgrade to Pro to access parent emotional reset tools, journaling,
            encouragement, hard-day support, and caregiver wellness features.
          </Text>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.lockedBackButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
          >
            <Text style={styles.lockedBackButtonText}>Go Back</Text>
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
          >
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
            A calm space for caregivers to reset, reflect, and feel supported
            through hard moments.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Parent Support Tools</Text>

        <View style={styles.sectionList}>
          {SUPPORT_SECTIONS.map((section) => (
            <TouchableOpacity
              key={section.id}
              activeOpacity={0.88}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: section.bg,
                  borderColor: section.border,
                },
              ]}
              onPress={() => router.push(section.route)}
            >
              <View style={styles.sectionLeft}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name={section.icon}
                    size={26}
                    color={section.color}
                  />
                </View>

                <View style={styles.sectionTextWrap}>
                  <Text style={[styles.sectionCardTitle, { color: section.color }]}>
                    {section.title}
                  </Text>

                  <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={22} color={section.color} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#059669" />

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Caregiver support, not medical advice</Text>

            <Text style={styles.infoText}>
              These tools are designed to support caregiver wellness and daily
              coping. They do not replace therapy, medical care, crisis support,
              or emergency services.
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
    marginBottom: 24,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  sectionTextWrap: {
    flex: 1,
  },

  sectionCardTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },

  sectionSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
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

  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  lockedIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockedTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  lockedText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },

  upgradeButton: {
    marginTop: 22,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },

  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  lockedBackButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },

  lockedBackButtonText: {
    color: '#64748B',
    fontWeight: '900',
    fontSize: 14,
  },
});