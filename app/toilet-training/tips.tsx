import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type Tip = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  problem: string;
  script: string;
  tryThis: string[];
};

const tips: Tip[] = [
  {
    id: 'refusal',
    title: 'Refusing to Sit',
    icon: 'hand-left-outline',
    color: '#DC2626',
    bg: '#FEF2F2',
    problem: 'Your child refuses, cries, runs away, or says no when it is potty time.',
    script: '“Let’s sit for one minute, then all done.”',
    tryThis: [
      'Keep the sit short.',
      'Use a calm voice.',
      'Offer a simple choice: “Potty now or after one more block?”',
      'Praise cooperation, even if your child does not go.',
    ],
  },
  {
    id: 'flushing',
    title: 'Fear of Flushing',
    icon: 'volume-mute-outline',
    color: '#7C3AED',
    bg: '#FAF5FF',
    problem: 'Your child covers their ears, cries, or avoids the bathroom because of the flush.',
    script: '“You can cover your ears while we flush.”',
    tryThis: [
      'Let your child stand farther away.',
      'Flush after they leave the bathroom at first.',
      'Warn before flushing: “Ready, flush.”',
      'Practice flushing when no potty pressure is happening.',
    ],
  },
  {
    id: 'play',
    title: 'Won’t Stop Playing',
    icon: 'game-controller-outline',
    color: '#2563EB',
    bg: '#EFF6FF',
    problem: 'Your child avoids potty because they do not want to leave toys, tablet, or play.',
    script: '“Potty first, then back to toys.”',
    tryThis: [
      'Use first/then language.',
      'Keep the toy waiting in sight.',
      'Use a short timer before potty time.',
      'Return to the activity after the potty sit.',
    ],
  },
  {
    id: 'accidents',
    title: 'Frequent Accidents',
    icon: 'alert-circle-outline',
    color: '#D97706',
    bg: '#FFFBEB',
    problem: 'Accidents are happening often, even when you are reminding your child.',
    script: '“Accidents happen. Let’s clean up and try again later.”',
    tryThis: [
      'Avoid punishment or shaming.',
      'Look for patterns like after meals or before bedtime.',
      'Try shorter intervals between potty sits.',
      'Praise dry checks and successful transitions.',
    ],
  },
  {
    id: 'public',
    title: 'Public Bathrooms',
    icon: 'business-outline',
    color: '#0891B2',
    bg: '#ECFEFF',
    problem: 'Public bathrooms feel too loud, busy, or unfamiliar.',
    script: '“We’ll go together. You are safe.”',
    tryThis: [
      'Bring headphones if sounds are hard.',
      'Visit the bathroom before it becomes urgent.',
      'Use the same short routine each time.',
      'Praise entering the bathroom, even before sitting.',
    ],
  },
  {
    id: 'regression',
    title: 'Regression',
    icon: 'refresh-outline',
    color: '#059669',
    bg: '#ECFDF5',
    problem: 'Your child was doing well, but accidents or refusal started again.',
    script: '“Your body is learning. We can try again.”',
    tryThis: [
      'Return to a simple schedule.',
      'Check for changes in sleep, routine, illness, or stress.',
      'Celebrate small wins again.',
      'Stay calm and consistent for a few days.',
    ],
  },
];

export default function PottyCoachScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>('refusal');

  function toggleTip(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Potty Coach</Text>
            <Text style={styles.subtitle}>
              Parent scripts and calm strategies for common potty-training challenges.
            </Text>
          </View>
        </View>

        <View style={styles.proHero}>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={13} color="#FFFFFF" />
            <Text style={styles.lockBadgeText}>Pro</Text>
          </View>

          <View style={styles.proHeroRow}>
            <View style={styles.proIcon}>
              <Ionicons name="bulb-outline" size={30} color="#7C3AED" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>Help for Real Potty Moments</Text>
              <Text style={styles.proText}>
                Use simple words, predictable steps, and gentle support during tough potty moments.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="heart-outline" size={23} color="#7C3AED" />
          <Text style={styles.noteText}>
            Keep potty practice calm. The goal is cooperation, comfort, and progress over time.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
         <Text style={styles.sectionTitle}>What’s happening?</Text>
          <Text style={styles.sectionSubtext}>
            Tap a card to see what to say and what to try.
          </Text>
        </View>

        {tips.map((tip) => {
          const expanded = expandedId === tip.id;

          return (
            <TouchableOpacity
              key={tip.id}
              activeOpacity={0.9}
              style={styles.tipCard}
              onPress={() => toggleTip(tip.id)}
            >
              <View style={styles.tipTopRow}>
                <View style={[styles.tipIcon, { backgroundColor: tip.bg }]}>
                  <Ionicons name={tip.icon} size={24} color={tip.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipProblem}>{tip.problem}</Text>
                </View>

                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={21}
                  color="#94A3B8"
                />
              </View>

              {expanded ? (
                <View style={styles.expandedContent}>
                  <View style={styles.scriptBox}>
                    <Text style={styles.scriptLabel}>Parent Script</Text>
                    <Text style={styles.scriptText}>{tip.script}</Text>
                  </View>

                  <Text style={styles.tryTitle}>Try this:</Text>

                  {tip.tryThis.map((item) => (
                    <View key={item} style={styles.tryRow}>
                      <Ionicons name="checkmark-circle-outline" size={19} color="#059669" />
                      <Text style={styles.tryText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}

        <View style={styles.footerCard}>
          <Ionicons name="information-circle-outline" size={24} color="#2563EB" />
          <Text style={styles.footerText}>
            These tips are general parent supports and are not a substitute for medical advice. If
            toileting concerns are severe, painful, or ongoing, talk with your child’s pediatrician.
          </Text>
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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 19,
  },
  proHero: {
    backgroundColor: '#FAF5FF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 14,
  },
  proHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4C1D95',
  },
  proText: {
    fontSize: 13,
    color: '#6D28D9',
    marginTop: 4,
    lineHeight: 19,
  },
  lockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  lockBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  tipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  tipProblem: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  expandedContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  scriptBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  scriptLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scriptText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 23,
  },
  tryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  tryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  tryText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    fontWeight: '600',
  },
  footerCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 18,
    fontWeight: '600',
  },
});