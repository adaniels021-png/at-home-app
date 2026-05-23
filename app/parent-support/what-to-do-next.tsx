import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Situation = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type NextPlan = {
  title: string;
  message: string;
  immediateSteps: string[];
  nextHour: string[];
  later: string[];
  avoid: string[];
};

const situations: Situation[] = [
  { id: 'meltdown', title: 'Meltdown ended', icon: 'rainy-outline' },
  { id: 'aggression', title: 'Aggression happened', icon: 'warning-outline' },
  { id: 'refusal', title: 'Refusal / shutdown', icon: 'hand-left-outline' },
  { id: 'public', title: 'Public incident', icon: 'people-outline' },
  { id: 'transition', title: 'Transition struggle', icon: 'swap-horizontal-outline' },
  { id: 'overstimulated', title: 'Overstimulated', icon: 'flash-outline' },
];

const plans: Record<string, NextPlan> = {
  meltdown: {
    title: 'Recovery comes first',
    message:
      'After a meltdown, your child’s nervous system may still be recovering. This is the time for calm, not correction.',
    immediateSteps: [
      'Lower your voice.',
      'Reduce talking.',
      'Offer water, comfort, or quiet space.',
      'Give your child time before asking questions.',
    ],
    nextHour: [
      'Keep demands light.',
      'Return to routine slowly.',
      'Watch for hunger, tiredness, or sensory overload.',
    ],
    later: [
      'Think about what may have triggered the meltdown.',
      'Plan one support to try next time.',
      'Reconnect with something simple and positive.',
    ],
    avoid: [
      'Lecturing right away.',
      'Asking “Why did you do that?” during recovery.',
      'Adding new demands too soon.',
    ],
  },

  aggression: {
    title: 'Safety first, teaching later',
    message:
      'Aggression can feel scary. Focus on safety and space first. Teaching works better after everyone is calm.',
    immediateSteps: [
      'Create safe space between people.',
      'Move unsafe objects if needed.',
      'Use very few words.',
      'Keep your body calm and neutral.',
    ],
    nextHour: [
      'Check for injury.',
      'Lower demands temporarily.',
      'Offer a calming activity or quiet area.',
    ],
    later: [
      'Write down what happened before the aggression.',
      'Look for patterns like transitions, denied access, or sensory overload.',
      'Consider what replacement communication could help next time.',
    ],
    avoid: [
      'Yelling back.',
      'Crowding your child.',
      'Trying to reason during peak intensity.',
    ],
  },

  refusal: {
    title: 'Reduce pressure',
    message:
      'Refusal often means the task feels too hard, too sudden, or too overwhelming. Lower the demand and rebuild momentum.',
    immediateSteps: [
      'Pause the demand briefly.',
      'Offer one small choice.',
      'Break the task into one tiny step.',
      'Use simple words like “first this, then break.”',
    ],
    nextHour: [
      'Try again with less pressure.',
      'Praise any small cooperation.',
      'Use visuals or modeling if helpful.',
    ],
    later: [
      'Ask yourself what made the task hard.',
      'Adjust the routine or expectation next time.',
      'Plan a small reinforcement after effort.',
    ],
    avoid: [
      'Repeating the demand quickly.',
      'Turning it into a power struggle.',
      'Giving too many choices at once.',
    ],
  },

  public: {
    title: 'You do not need to perform for others',
    message:
      'Public moments can feel stressful and embarrassing. Your job is safety and support, not proving anything to strangers.',
    immediateSteps: [
      'Move to a quieter area if possible.',
      'Use short calm phrases.',
      'Reduce attention from others if you can.',
      'Leave the situation if that helps everyone recover.',
    ],
    nextHour: [
      'Give yourself time to decompress.',
      'Keep the next activity simple.',
      'Avoid replaying the moment repeatedly.',
    ],
    later: [
      'Think about what made the environment hard.',
      'Pack a support item next time if needed.',
      'Consider shorter outings or planned breaks.',
    ],
    avoid: [
      'Over-apologizing.',
      'Trying to force calm quickly.',
      'Letting strangers’ reactions guide your parenting.',
    ],
  },

  transition: {
    title: 'Slow the transition',
    message:
      'Transitions are hard when the brain and body need more time to shift. Use predictability, fewer words, and patience.',
    immediateSteps: [
      'Pause before repeating the direction.',
      'Use first/then language.',
      'Give extra processing time.',
      'Offer one simple transition support.',
    ],
    nextHour: [
      'Return to routine calmly.',
      'Use a visual or timer next time.',
      'Celebrate any small movement toward the transition.',
    ],
    later: [
      'Identify which transition was hardest.',
      'Plan a warning cue before that transition.',
      'Use the same phrase consistently next time.',
    ],
    avoid: [
      'Rushing.',
      'Repeating directions over and over.',
      'Adding long explanations.',
    ],
  },

  overstimulated: {
    title: 'Lower stimulation',
    message:
      'When the environment is too much, behavior can escalate quickly. Reduce input before expecting cooperation.',
    immediateSteps: [
      'Lower sound if possible.',
      'Dim lights or move away from bright areas.',
      'Reduce talking.',
      'Offer a quiet space or sensory reset.',
    ],
    nextHour: [
      'Keep expectations simple.',
      'Avoid busy environments if possible.',
      'Watch for signs of fatigue or overload.',
    ],
    later: [
      'Notice which sensory input was hardest.',
      'Plan breaks before overload builds.',
      'Save the calming strategy that worked best.',
    ],
    avoid: [
      'Adding more choices.',
      'Talking more to calm the moment.',
      'Pushing through without a break.',
    ],
  },
};

export default function WhatToDoNextScreen() {
  const router = useRouter();

  const [selectedSituationId, setSelectedSituationId] =
    useState<string>('meltdown');

  const selectedPlan = useMemo(() => {
    return plans[selectedSituationId] || plans.meltdown;
  }, [selectedSituationId]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Parent Support</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="compass-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>What To Do Next</Text>

          <Text style={styles.heroText}>
            Gentle next-step guidance after hard moments, meltdowns, shutdowns,
            or stressful parenting situations.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 1</Text>

          <Text style={styles.sectionTitle}>What happened?</Text>

          <Text style={styles.helperText}>
            Choose the closest fit. Your recovery plan will update automatically.
          </Text>

          <View style={styles.situationGrid}>
            {situations.map((situation) => {
              const selected = selectedSituationId === situation.id;

              return (
                <Pressable
                  key={situation.id}
                  onPress={() => setSelectedSituationId(situation.id)}
                  style={[
                    styles.situationCard,
                    selected && styles.situationCardSelected,
                  ]}
                >
                  <Ionicons
                    name={situation.icon}
                    size={21}
                    color={selected ? '#FFFFFF' : '#2563EB'}
                  />

                  <Text
                    style={[
                      styles.situationText,
                      selected && styles.situationTextSelected,
                    ]}
                  >
                    {situation.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.stepLabel}>Step 2</Text>

          <Text style={styles.sectionTitle}>{selectedPlan.title}</Text>

          <Text style={styles.planMessage}>{selectedPlan.message}</Text>
        </View>

        <SupportBlock
          label="Do now"
          title="Immediate next steps"
          icon="flash-outline"
          color="#2563EB"
          bg="#EFF6FF"
          items={selectedPlan.immediateSteps}
        />

        <SupportBlock
          label="Next"
          title="For the next hour"
          icon="time-outline"
          color="#7C3AED"
          bg="#F5F3FF"
          items={selectedPlan.nextHour}
        />

        <SupportBlock
          label="Later"
          title="When everyone is calm"
          icon="bulb-outline"
          color="#0F766E"
          bg="#ECFDF5"
          items={selectedPlan.later}
        />

        <View style={styles.avoidCard}>
          <Text style={styles.sectionTitle}>Try not to do this right now</Text>

          {selectedPlan.avoid.map((item) => (
            <View key={item} style={styles.avoidRow}>
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
              <Text style={styles.avoidText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.reassuranceCard}>
          <Ionicons name="heart-outline" size={24} color="#2563EB" />

          <Text style={styles.reassuranceTitle}>One moment at a time.</Text>

          <Text style={styles.reassuranceText}>
            You do not need the perfect response. A calm, safe next step is
            enough for right now.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportBlock({
  label,
  title,
  icon,
  color,
  bg,
  items,
}: {
  label: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  items: string[];
}) {
  return (
    <View style={styles.supportCard}>
      <View style={[styles.supportIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <Text style={[styles.supportLabel, { color }]}>{label}</Text>

      <Text style={styles.sectionTitle}>{title}</Text>

      {items.map((item) => (
        <View key={item} style={styles.supportRow}>
          <Ionicons name="checkmark-circle-outline" size={20} color={color} />
          <Text style={styles.supportText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backText: {
    marginLeft: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#2563EB',
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
    color: '#DBEAFE',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },

  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  avoidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  helperText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 14,
  },

  situationGrid: {
    gap: 10,
  },

  situationCard: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  situationCardSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  situationText: {
    flex: 1,
    marginLeft: 10,
    color: '#1D4ED8',
    fontWeight: '900',
    fontSize: 14,
  },

  situationTextSelected: {
    color: '#FFFFFF',
  },

  planMessage: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },

  supportIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  supportLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  supportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },

  supportText: {
    flex: 1,
    marginLeft: 9,
    color: '#334155',
    fontWeight: '800',
    lineHeight: 20,
  },

  avoidRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },

  avoidText: {
    flex: 1,
    marginLeft: 9,
    color: '#991B1B',
    fontWeight: '800',
    lineHeight: 20,
  },

  reassuranceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  reassuranceTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D4ED8',
    marginTop: 8,
    marginBottom: 6,
  },

  reassuranceText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
});