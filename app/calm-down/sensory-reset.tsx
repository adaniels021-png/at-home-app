import { saveCalmStrategy } from '@/lib/calmStrategiesStorage';
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

type SensoryTool = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  shortText: string;
  instruction: string;
};

const regulationLevels = [1, 2, 3, 4, 5];

const sensoryTools: SensoryTool[] = [
  {
    id: 'deep-pressure',
    title: 'Deep Pressure',
    icon: 'hand-left-outline',
    shortText: 'Firm calming input',
    instruction:
      'Offer a firm hug, weighted blanket, or gentle pressure only if your child likes it.',
  },
  {
    id: 'wall-push',
    title: 'Wall Push-Ups',
    icon: 'body-outline',
    shortText: '5 slow pushes',
    instruction:
      'Have your child push both hands against the wall for 5 slow pushes.',
  },
  {
    id: 'stretch',
    title: 'Big Stretch',
    icon: 'accessibility-outline',
    shortText: 'Reach up and down',
    instruction:
      'Reach arms up high, then slowly down. Repeat 3 times together.',
  },
  {
    id: 'water',
    title: 'Water Break',
    icon: 'water-outline',
    shortText: 'Sip and pause',
    instruction:
      'Offer a sip of water and a quiet pause before speaking again.',
  },
  {
    id: 'fidget',
    title: 'Fidget Tool',
    icon: 'cube-outline',
    shortText: 'Calm hands',
    instruction:
      'Offer a safe fidget, soft toy, or textured item for calm hands.',
  },
  {
    id: 'movement',
    title: 'Heavy Work',
    icon: 'walk-outline',
    shortText: 'Safe body movement',
    instruction:
      'Try carrying a pillow, pushing a laundry basket, or animal walks.',
  },
];

export default function SensoryResetScreen() {
  const router = useRouter();

  const [beforeLevel, setBeforeLevel] = useState<number | null>(null);
  const [afterLevel, setAfterLevel] = useState<number | null>(null);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [helpfulStatus, setHelpfulStatus] = useState<
    'helpful' | 'not_helpful' | null
  >(null);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);

  const selectedTools = useMemo(() => {
    return sensoryTools.filter((tool) => selectedToolIds.includes(tool.id));
  }, [selectedToolIds]);

  const resultMessage = useMemo(() => {
    if (!beforeLevel || !afterLevel) return '';

    if (afterLevel > beforeLevel) {
      return 'Great job. This sensory reset helped your child become more regulated.';
    }

    if (afterLevel === beforeLevel) {
      return 'Good effort. Your child stayed about the same. Try one tool at a time and give each one a little more time.';
    }

    return 'That is okay. These tools may not be the best fit right now. Try Quiet Space or Breathe Together next.';
  }, [beforeLevel, afterLevel]);

  function toggleTool(id: string) {
    setCompleted(false);
    setSavedPlan(null);
    setHelpfulStatus(null);

    setSelectedToolIds((prev) =>
      prev.includes(id)
        ? prev.filter((toolId) => toolId !== id)
        : [...prev, id]
    );
  }

  async function savePlanAsHelpful() {
    if (selectedTools.length === 0) return;

    const planName = selectedTools.map((tool) => tool.title).join(' + ');

    setHelpfulStatus('helpful');
    setSavedPlan(planName);

    await saveCalmStrategy({
      type: 'sensory-reset',
      title: 'Sensory Reset',
      subtitle: planName,
      icon: 'sparkles-outline',
      color: '#B45309',
      bg: '#FFFBEB',
    });
  }

  function markNotHelpful() {
    setHelpfulStatus('not_helpful');
    setSavedPlan(null);
  }

  function resetTool() {
    setBeforeLevel(null);
    setAfterLevel(null);
    setSelectedToolIds([]);
    setCompleted(false);
    setHelpfulStatus(null);
    setSavedPlan(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Calm Down Toolkit</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles-outline" size={30} color="#B45309" />
          </View>

          <Text style={styles.title}>Sensory Reset</Text>

          <Text style={styles.subtitle}>
            Pick one or more calming tools to help your child reset their body.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 1</Text>
          <Text style={styles.sectionTitle}>Dysregulation level</Text>
          <Text style={styles.helperText}>
            How dysregulated does your child seem right now?
          </Text>

          <View style={styles.levelRow}>
            {regulationLevels.map((level) => (
              <Pressable
                key={level}
                onPress={() => setBeforeLevel(level)}
                style={[
                  styles.levelButton,
                  beforeLevel === level && styles.levelButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.levelText,
                    beforeLevel === level && styles.levelTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.levelLabels}>
            <Text style={styles.labelSmall}>Calm</Text>
            <Text style={styles.labelSmall}>Highly dysregulated</Text>
          </View>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.stepLabel}>Step 2</Text>
          <Text style={styles.sectionTitle}>Choose sensory tools</Text>
          <Text style={styles.helperText}>Select anything you want to try.</Text>

          {selectedTools.length > 0 && (
            <View style={styles.selectedSummary}>
              <Text style={styles.selectedSummaryTitle}>Your reset plan</Text>

              <Text style={styles.selectedSummaryText}>
                {selectedTools.map((tool) => tool.title).join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.toolGrid}>
            {sensoryTools.map((tool) => {
              const selected = selectedToolIds.includes(tool.id);

              return (
                <Pressable
                  key={tool.id}
                  onPress={() => toggleTool(tool.id)}
                  style={[styles.toolCard, selected && styles.toolCardSelected]}
                >
                  <View style={styles.toolTopRow}>
                    <View
                      style={[
                        styles.toolIcon,
                        selected && styles.toolIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={tool.icon}
                        size={22}
                        color={selected ? '#FFFFFF' : '#B45309'}
                      />
                    </View>

                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={24}
                      color={selected ? '#B45309' : '#94A3B8'}
                    />
                  </View>

                  <Text
                    style={[
                      styles.toolText,
                      selected && styles.toolTextSelected,
                    ]}
                  >
                    {tool.title}
                  </Text>

                  <Text style={styles.shortText}>{tool.shortText}</Text>

                  {selected && (
                    <View style={styles.inlineInstruction}>
                      <Text style={styles.instructionLabel}>Try this:</Text>
                      <Text style={styles.instructionText}>{tool.instruction}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.tryCard}>
          <Text style={styles.stepLabel}>Step 3</Text>
          <Text style={styles.sectionTitle}>Try your reset plan</Text>

          <Text style={styles.tryText}>
            Use one selected tool at a time. Keep your voice calm and give your
            child quiet time.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!beforeLevel || selectedTools.length === 0) && styles.disabledButton,
            ]}
            disabled={!beforeLevel || selectedTools.length === 0}
            onPress={() => setCompleted(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>We tried this</Text>
          </TouchableOpacity>

          {completed && (
            <View style={styles.completedBox}>
              <Ionicons name="checkmark-circle" size={22} color="#B45309" />

              <Text style={styles.completedText}>
                Nice work. Now rate how regulated your child seems after trying
                the reset.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 4</Text>
          <Text style={styles.sectionTitle}>Regulation level after reset</Text>

          <Text style={styles.helperText}>
            How regulated does your child seem after trying the reset?
          </Text>

          <View style={styles.levelRow}>
            {regulationLevels.map((level) => (
              <Pressable
                key={level}
                onPress={() => setAfterLevel(level)}
                style={[
                  styles.levelButton,
                  afterLevel === level && styles.levelButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.levelText,
                    afterLevel === level && styles.levelTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.levelLabels}>
            <Text style={styles.labelSmall}>Still dysregulated</Text>
            <Text style={styles.labelSmall}>More regulated</Text>
          </View>

          <View style={styles.feedbackRow}>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                helpfulStatus === 'helpful' && styles.feedbackButtonHelpful,
                selectedTools.length === 0 && styles.disabledButton,
              ]}
              disabled={selectedTools.length === 0}
              onPress={savePlanAsHelpful}
            >
              <Ionicons
                name="thumbs-up-outline"
                size={20}
                color={helpfulStatus === 'helpful' ? '#FFFFFF' : '#15803D'}
              />

              <Text
                style={[
                  styles.feedbackButtonText,
                  helpfulStatus === 'helpful' && styles.feedbackButtonTextActive,
                ]}
              >
                Yes, this helped
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.feedbackButton,
                helpfulStatus === 'not_helpful' && styles.feedbackButtonNotHelpful,
              ]}
              onPress={markNotHelpful}
            >
              <Ionicons
                name="thumbs-down-outline"
                size={20}
                color={helpfulStatus === 'not_helpful' ? '#FFFFFF' : '#B45309'}
              />

              <Text
                style={[
                  styles.feedbackButtonText,
                  helpfulStatus === 'not_helpful' &&
                    styles.feedbackButtonTextActive,
                ]}
              >
                Not this time
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!!resultMessage && (
          <View style={styles.resultCard}>
            <Ionicons name="sparkles-outline" size={24} color="#B45309" />

            <Text style={styles.resultTitle}>Personal result</Text>
            <Text style={styles.resultText}>{resultMessage}</Text>

            {savedPlan && (
              <View style={styles.savedPlanBox}>
                <Ionicons name="bookmark-outline" size={18} color="#92400E" />

                <View style={{ flex: 1 }}>
                  <Text style={styles.savedPlanTitle}>Saved to Quick Access</Text>
                  <Text style={styles.savedPlanText}>{savedPlan}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.resetButton} onPress={resetTool}>
          <Ionicons name="refresh-outline" size={18} color="#B45309" />
          <Text style={styles.resetText}>Reset this tool</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFBEB',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 4,
  },

  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#92400E',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  tryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    color: '#B45309',
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
    fontSize: 14,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 20,
  },

  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  labelSmall: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  levelButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  levelButtonSelected: {
    backgroundColor: '#B45309',
    borderColor: '#B45309',
  },

  levelText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#334155',
  },

  levelTextSelected: {
    color: '#FFFFFF',
  },

  selectedSummary: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },

  selectedSummaryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 4,
  },

  selectedSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },

  toolGrid: {
    gap: 12,
  },

  toolCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 22,
    padding: 15,
  },

  toolCardSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: '#B45309',
  },

  toolTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  toolIconSelected: {
    backgroundColor: '#B45309',
  },

  toolText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#334155',
  },

  toolTextSelected: {
    color: '#92400E',
  },

  shortText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 4,
  },

  inlineInstruction: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  instructionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#B45309',
    marginBottom: 4,
  },

  instructionText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 20,
  },

  tryText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#B45309',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.45,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 8,
  },

  completedBox: {
    marginTop: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  completedText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '800',
    marginLeft: 10,
    lineHeight: 20,
  },

  feedbackRow: {
    marginTop: 18,
    gap: 10,
  },

  feedbackButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedbackButtonHelpful: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },

  feedbackButtonNotHelpful: {
    backgroundColor: '#B45309',
    borderColor: '#B45309',
  },

  feedbackButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
  },

  feedbackButtonTextActive: {
    color: '#FFFFFF',
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#92400E',
    marginTop: 8,
    marginBottom: 6,
  },

  resultText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },

  savedPlanBox: {
    marginTop: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  savedPlanTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#92400E',
    marginLeft: 8,
  },

  savedPlanText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 4,
    marginLeft: 8,
  },

  resetButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '900',
    color: '#B45309',
  },
});