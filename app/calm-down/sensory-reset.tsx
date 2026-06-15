import { saveCalmStrategy } from '@/lib/calmStrategiesStorage';
import { saveCalmToolkitLog } from '@/lib/calmToolkitInsights';
import { useChild } from '@/lib/SelectedChildContext';
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

  const sensorySections = [
  {
    id: 'pressure',
    title: 'Pressure & Comfort',
    subtitle: 'Best when your child seeks firm calming input.',
    tools: ['deep-pressure', 'fidget'],
  },
  {
    id: 'movement',
    title: 'Movement Reset',
    subtitle: 'Best when your child needs safe body movement.',
    tools: ['wall-push', 'stretch', 'movement'],
  },
  {
    id: 'quiet',
    title: 'Simple Body Reset',
    subtitle: 'Best when your child needs a gentle pause.',
    tools: ['water'],
  },
];

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

  const [openSection, setOpenSection] = useState<string | null>('pressure');

  const { selectedChild } = useChild() as any;

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

  const sensoryRecommendations = useMemo(() => {
  if (!beforeLevel) {
    return {
      title: 'Choose a regulation level first',
      text: 'Tell us how regulated your child feels, then ABA at Home will suggest the best sensory starting point.',
      recommendedToolIds: [],
    };
  }

  if (beforeLevel <= 2) {
    return {
      title: 'Start with firm calming input',
      text: 'Your child seems highly dysregulated. Start with 1 calming pressure or comfort tool before adding movement.',
      recommendedToolIds: ['deep-pressure', 'fidget'],
    };
  }

  if (beforeLevel === 3) {
    return {
      title: 'Try gentle movement or pressure',
      text: 'Your child may need organized body input. Pick 1–2 tools and give each one time to work.',
      recommendedToolIds: ['wall-push', 'deep-pressure', 'movement'],
    };
  }

  return {
    title: 'Use a light sensory reset',
    text: 'Your child seems closer to regulated. A simple pause, water break, or stretch may be enough.',
    recommendedToolIds: ['water', 'stretch'],
  };
}, [beforeLevel]);

const recommendedTools = useMemo(() => {
  return sensoryTools.filter((tool) =>
    sensoryRecommendations.recommendedToolIds.includes(tool.id)
  );
}, [sensoryRecommendations]);

const completedSteps = useMemo(() => {
  let count = 0;

  if (beforeLevel) count += 1;
  if (selectedTools.length > 0) count += 1;
  if (completed) count += 1;
  if (afterLevel) count += 1;

  return count;
}, [beforeLevel, selectedTools.length, completed, afterLevel]);

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

  await saveCalmToolkitLog({
    childId: selectedChild?.id,
    toolType: 'sensory-reset',
    strategyName: planName,
    helped: true,
    beforeLevel,
    afterLevel,
    toolsUsed: selectedTools.map((tool) => tool.title),
  });
}

async function markNotHelpful() {
  const planName = selectedTools.map((tool) => tool.title).join(' + ');

  setHelpfulStatus('not_helpful');
  setSavedPlan(null);

  await saveCalmToolkitLog({
    childId: selectedChild?.id,
    toolType: 'sensory-reset',
    strategyName: planName || 'Sensory Reset',
    helped: false,
    beforeLevel,
    afterLevel,
    toolsUsed: selectedTools.map((tool) => tool.title),
  });
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
            How regulated does your child seem right now?
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

           <View style={styles.progressTracker}>
  {[1, 2, 3, 4].map((step) => {
    const active = completedSteps >= step;

    return (
      <View key={step} style={styles.progressStepWrap}>
        <View style={[styles.progressDot, active && styles.progressDotActive]}>
          <Text
            style={[
              styles.progressDotText,
              active && styles.progressDotTextActive,
            ]}
          >
            {step}
          </Text>
        </View>

        {step < 4 ? (
          <View
            style={[
              styles.progressLine,
              active && styles.progressLineActive,
            ]}
          />
        ) : null}
      </View>
    );
  })}
</View>

          <View style={styles.levelLabels}>
            <Text style={styles.labelSmall}>Highly dysregulated</Text>
            <Text style={styles.labelSmall}>More regulated</Text>
          </View>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.stepLabel}>Step 2</Text>
          <Text style={styles.sectionTitle}>Choose sensory tools</Text>
          <Text style={styles.helperText}>Select anything you want to try.</Text>
          

          <View style={styles.resetPlanPreview}>
  <View style={styles.resetPlanIcon}>
    <Ionicons name="sparkles-outline" size={24} color="#B45309" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.resetPlanPreviewTitle}>
      {sensoryRecommendations.title}
    </Text>

    <Text style={styles.resetPlanPreviewText}>
      {sensoryRecommendations.text}
    </Text>
  </View>
</View>

{recommendedTools.length > 0 ? (
  <View style={styles.recommendedToolWrap}>
    {recommendedTools.map((tool) => {
      const selected = selectedToolIds.includes(tool.id);

      return (
        <Pressable
          key={tool.id}
          onPress={() => toggleTool(tool.id)}
          style={[
            styles.recommendedToolChip,
            selected && styles.recommendedToolChipSelected,
          ]}
        >
          <Ionicons
            name={tool.icon}
            size={17}
            color={selected ? '#FFFFFF' : '#B45309'}
          />

          <Text
            style={[
              styles.recommendedToolChipText,
              selected && styles.recommendedToolChipTextSelected,
            ]}
          >
            {tool.title}
          </Text>
        </Pressable>
      );
    })}
  </View>
) : null}

{selectedTools.length > 0 ? (
  <View style={styles.selectedSummary}>
    <Text style={styles.selectedSummaryTitle}>Your reset plan</Text>

    <Text style={styles.selectedSummaryText}>
      {selectedTools.map((tool) => tool.title).join(', ')}
    </Text>
  </View>
) : null}

          <View style={styles.toolGrid}>
  {sensorySections.map((section) => {
    const open = openSection === section.id;

    const sectionTools = sensoryTools.filter((tool) =>
      section.tools.includes(tool.id)
    );

    return (
      <View key={section.id} style={styles.accordionSection}>
        <TouchableOpacity
          style={styles.accordionHeader}
          activeOpacity={0.9}
          onPress={() => setOpenSection(open ? null : section.id)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.accordionTitle}>{section.title}</Text>
            <Text style={styles.accordionSubtitle}>{section.subtitle}</Text>
          </View>

          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={21}
            color="#B45309"
          />
        </TouchableOpacity>

        {open ? (
          <View style={styles.accordionBody}>
            {sectionTools.map((tool) => {
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
        ) : null}
      </View>
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
          <View style={styles.levelLabels}>
            <Text style={styles.labelSmall}>Still dysregulated</Text>
            <Text style={styles.labelSmall}>More regulated</Text>
          </View>

<View style={styles.feedbackRow}>
  <TouchableOpacity
    style={[
      styles.feedbackButton,
      helpfulStatus === 'helpful' && styles.feedbackButtonHelpful,
      (!afterLevel || selectedTools.length === 0) && styles.disabledButton,
    ]}
    disabled={!afterLevel || selectedTools.length === 0}
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
      (!afterLevel || selectedTools.length === 0) && styles.disabledButton,
    ]}
    disabled={!afterLevel || selectedTools.length === 0}
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
        helpfulStatus === 'not_helpful' && styles.feedbackButtonTextActive,
      ]}
    >
      Not this time
    </Text>
  </TouchableOpacity>
</View>

</View>

        {!!resultMessage && beforeLevel && afterLevel ? (
  <View
    style={[
      styles.resultCard,
      afterLevel > beforeLevel && styles.resultCardPositive,
    ]}
  >
    <Ionicons
      name={afterLevel > beforeLevel ? 'checkmark-circle' : 'sparkles-outline'}
      size={26}
      color={afterLevel > beforeLevel ? '#15803D' : '#B45309'}
    />

    <Text style={styles.resultTitle}>
      {afterLevel > beforeLevel ? 'Nice work!' : 'Personal result'}
    </Text>

    <Text style={styles.resultText}>
      {afterLevel > beforeLevel
        ? `Your child improved from ${beforeLevel} → ${afterLevel}. This sensory plan may be worth saving.`
        : resultMessage}
    </Text>

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
) : null}

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

  accordionSection: {
  backgroundColor: '#FFFBEB',
  borderRadius: 22,
  borderWidth: 1,
  borderColor: '#FDE68A',
  overflow: 'hidden',
},

accordionHeader: {
  padding: 15,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

accordionTitle: {
  fontSize: 16,
  fontWeight: '900',
  color: '#92400E',
},

accordionSubtitle: {
  marginTop: 4,
  fontSize: 12.5,
  color: '#64748B',
  fontWeight: '700',
  lineHeight: 18,
},

accordionBody: {
  padding: 12,
  paddingTop: 0,
  gap: 12,
},

resetPlanPreview: {
  backgroundColor: '#FFF7ED',
  borderRadius: 22,
  padding: 14,
  borderWidth: 1,
  borderColor: '#FDBA74',
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 14,
},

resetPlanIcon: {
  width: 46,
  height: 46,
  borderRadius: 17,
  backgroundColor: '#FEF3C7',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

resetPlanPreviewTitle: {
  fontSize: 15,
  fontWeight: '900',
  color: '#92400E',
},

resetPlanPreviewText: {
  marginTop: 4,
  color: '#475569',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
},

progressTracker: {
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  paddingVertical: 14,
  paddingHorizontal: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#FDE68A',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

progressStepWrap: {
  flexDirection: 'row',
  alignItems: 'center',
},

progressDot: {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#FEF3C7',
  alignItems: 'center',
  justifyContent: 'center',
},

progressDotActive: {
  backgroundColor: '#B45309',
},

progressDotText: {
  color: '#B45309',
  fontSize: 12,
  fontWeight: '900',
},

progressDotTextActive: {
  color: '#FFFFFF',
},

progressLine: {
  width: 34,
  height: 3,
  borderRadius: 999,
  backgroundColor: '#FDE68A',
  marginHorizontal: 5,
},

progressLineActive: {
  backgroundColor: '#B45309',
},

recommendedToolWrap: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 14,
},

recommendedToolChip: {
  minHeight: 42,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderWidth: 1,
  borderColor: '#FDBA74',
  backgroundColor: '#FFF7ED',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

recommendedToolChipSelected: {
  backgroundColor: '#B45309',
  borderColor: '#B45309',
},

recommendedToolChipText: {
  color: '#92400E',
  fontSize: 12.5,
  fontWeight: '900',
},

recommendedToolChipTextSelected: {
  color: '#FFFFFF',
},

resultCardPositive: {
  backgroundColor: '#F0FDF4',
  borderColor: '#BBF7D0',
},
});