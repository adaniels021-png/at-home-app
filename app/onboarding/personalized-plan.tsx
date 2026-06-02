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

import { useChild } from '../../lib/SelectedChildContext';

export default function PersonalizedPlanScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const childName =
    selectedChild?.child_name ||
    selectedChild?.name ||
    'Your Child';

  const finishOnboarding = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PERSONALIZED STARTING PLAN</Text>
        </View>

        <Text style={styles.title}>
          Welcome to ABA at Home
        </Text>

        <Text style={styles.subtitle}>
          Based on your onboarding responses, here is a suggested starting plan
          for {childName}.
        </Text>

        <View style={styles.heroCard}>
          <Ionicons
            name="sparkles"
            size={30}
            color="#FFFFFF"
          />

          <Text style={styles.heroTitle}>
            Week 1 Focus Areas
          </Text>

          <Text style={styles.heroText}>
            Start with communication, routines, and daily learning activities
            to build consistency and confidence at home.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Recommended Priorities
        </Text>

        <PlanCard
          icon="chatbubble-ellipses"
          title="Communication Practice"
          description="Use communication activities and PECS tools daily."
        />

        <PlanCard
          icon="calendar"
          title="Routine Building"
          description="Create predictable morning, meal, and bedtime routines."
        />

        <PlanCard
          icon="school"
          title="Daily Lessons"
          description="Complete at least one lesson each day."
        />

        <PlanCard
          icon="heart"
          title="Parent Support"
          description="Explore parent support tools during challenging moments."
        />

        <View style={styles.tipCard}>
          <Ionicons
            name="bulb-outline"
            size={20}
            color="#F59E0B"
          />

          <Text style={styles.tipText}>
            Small, consistent practice is usually more effective than long
            sessions. Aim for 10–15 minutes at a time.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={finishOnboarding}
        >
          <Text style={styles.buttonText}>
            Start Using ABA at Home
          </Text>

          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.planCard}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={22}
          color="#4F46E5"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.planTitle}>
          {title}
        </Text>

        <Text style={styles.planDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 22,
    paddingBottom: 50,
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },

  badgeText: {
    color: '#4338CA',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    marginBottom: 20,
    fontWeight: '600',
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 6,
  },

  heroText: {
    color: '#E0E7FF',
    lineHeight: 22,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  planCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  planTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },

  planDescription: {
    color: '#64748B',
    lineHeight: 20,
    fontWeight: '600',
  },

  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  tipText: {
    flex: 1,
    marginLeft: 10,
    color: '#92400E',
    fontWeight: '700',
    lineHeight: 20,
  },

  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginRight: 8,
  },
});