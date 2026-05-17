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

          <Text style={styles.lockedTitle}>
            Parent Support is a Pro Feature
          </Text>

          <Text style={styles.lockedText}>
            Upgrade to Pro to access ABA parental guidance, behavior support,
            communication tools, routine support, social stories, and saved
            support plans.
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
          <View style={styles.heroIcon}>
            <Ionicons name="heart-circle" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>ABA Parental Guidance</Text>

          <Text style={styles.heroText}>
            Get parent-friendly support for behavior, communication, routines,
            and everyday challenges at home.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/parent-support/history')}
        >
          <Ionicons name="time-outline" size={20} color="#7C3AED" />
          <Text style={styles.historyButtonText}>
            View Saved Support Plans
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Support Tools</Text>

        <SupportToolCard
          icon="warning-outline"
          title="Behavior Support"
          subtitle="Tantrums, transitions, refusal, aggression, elopement, and more."
          color="#DC2626"
          bg="#FEF2F2"
          onPress={() => router.push('/parent-support/behavior')}
        />

        <SupportToolCard
          icon="chatbubbles-outline"
          title="Communication Help"
          subtitle="Support requesting, PECS, AAC, gestures, and frustration."
          color="#4F46E5"
          bg="#EEF2FF"
          onPress={() => router.push('/parent-support/communication')}
        />

        <SupportToolCard
          icon="calendar-outline"
          title="Routine Builder"
          subtitle="Create calm routines for bedtime, hygiene, meals, and outings."
          color="#EA580C"
          bg="#FFF7ED"
          onPress={() => router.push('/parent-support/routines')}
        />

        <SupportToolCard
          icon="book-outline"
          title="Social Story Generator"
          subtitle="Create simple social stories for new or difficult situations."
          color="#7C3AED"
          bg="#F3E8FF"
          onPress={() => router.push('/parent-support/social-story')}
        />

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#059669" />

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              Parent guidance, not medical advice
            </Text>

            <Text style={styles.infoText}>
              These tools are designed to support caregivers with practical
              ABA-style strategies. They do not replace clinical, medical,
              psychological, or emergency services.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportToolCard({
  icon,
  title,
  subtitle,
  color,
  bg,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toolCard} onPress={onPress}>
      <View style={[styles.toolIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <View style={styles.toolTextWrap}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
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
    fontWeight: '800',
    color: '#0F172A',
  },

  headerSpacer: {
    width: 42,
  },

  heroCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#EDE9FE',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  toolIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  toolTextWrap: {
    flex: 1,
  },

  toolTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },

  toolSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 22,
    padding: 16,
    marginTop: 8,
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
    fontWeight: '600',
  },

  historyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyButtonText: {
    flex: 1,
    marginLeft: 10,
    color: '#1E293B',
    fontWeight: '900',
    fontSize: 14,
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