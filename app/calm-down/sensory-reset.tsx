import { saveCalmStrategy } from '@/lib/calmStrategiesStorage';
import { saveCalmToolkitLog } from '@/lib/calmToolkitInsights';
import { useChild } from '@/lib/SelectedChildContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

type HelpfulStatus = 'helpful' | 'not_helpful' | null;

const regulationLevels = [1, 2, 3, 4, 5];
const RESET_TIMER_SECONDS = 120;

const sensoryTools: SensoryTool[] = [
  {
    id: 'deep-pressure',
    title: 'Deep Pressure',
    icon: 'hand-left-outline',
    shortText: 'Firm hug, weighted blanket, or calming pressure if tolerated.',
    instruction:
      'Offer firm calming pressure only if your child likes it. Keep your voice quiet and stop if they pull away.',
  },
  {
    id: 'wall-push',
    title: 'Wall Push-Ups',
    icon: 'body-outline',
    shortText: 'Push both hands into a wall for 5 slow pushes.',
    instruction:
      'Stand beside your child and model 5 slow wall pushes. Count softly and pause after.',
  },
  {
    id: 'stretch',
    title: 'Big Stretch',
    icon: 'accessibility-outline',
    shortText: 'Reach up high, then slowly down. Repeat 3 times.',
    instruction:
      'Model a slow reach up, then fold down gently. Keep it playful and low pressure.',
  },
  {
    id: 'water',
    title: 'Water Break',
    icon: 'water-outline',
    shortText: 'Offer a sip of water and a quiet pause.',
    instruction:
      'Offer water without demanding language. Let the pause be the reset.',
  },
  {
    id: 'fidget',
    title: 'Fidget Tool',
    icon: 'cube-outline',
    shortText: 'Offer a safe fidget, soft toy, or textured item.',
    instruction:
      'Place one safe item nearby and let your child use it without extra talking.',
  },
  {
    id: 'movement',
    title: 'Heavy Work',
    icon: 'walk-outline',
    shortText: 'Carry a pillow, push a laundry basket, or try animal walks.',
    instruction:
      'Choose safe body movement. Keep it short, simple, and supervised.',
  },
];

const sensorySections = [
  {
    id: 'pressure',
    title: 'Pressure & Comfort',
    subtitle: 'Best when your child needs firm calming input.',
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

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SensoryResetScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [beforeLevel, setBeforeLevel] = useState<number | null>(null);
  const [afterLevel, setAfterLevel] = useState<number | null>(null);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [helpfulStatus, setHelpfulStatus] = useState<HelpfulStatus>(null);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>('pressure');
  const [showWhy, setShowWhy] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(RESET_TIMER_SECONDS);

  const childName =
    selectedChild?.child_name ||
    selectedChild?.name ||
    selectedChild?.first_name ||
    'your child';

  const selectedTools = useMemo(() => {
    return sensoryTools.filter((tool) => selectedToolIds.includes(tool.id));
  }, [selectedToolIds]);

  const planName = useMemo(() => {
    return selectedTools.map((tool) => tool.title).join(' + ');
  }, [selectedTools]);

  const sensoryRecommendations = useMemo(() => {
    if (!beforeLevel) {
      return {
        title: 'Recommended after rating',
        text: `Rate how regulated ${childName} seems, then ABA at Home will suggest a starting tool.`,
        why:
          'The app uses the regulation level to decide whether to start with calming pressure, organized movement, or a lighter reset.',
        recommendedToolIds: [],
      };
    }

    if (beforeLevel <= 2) {
      return {
        title: 'Recommended first: Deep Pressure',
        text: `Because ${childName} seems highly dysregulated, start with calming input before adding movement.`,
        why:
          'When a child is very dysregulated, too much movement or talking can add more stimulation. Firm calming input may help the body settle first.',
        recommendedToolIds: ['deep-pressure', 'fidget'],
      };
    }

    if (beforeLevel === 3) {
      return {
        title: 'Recommended first: Wall Push-Ups',
        text: `${childName} may need organized body input. Try one movement or pressure tool and keep it short.`,
        why:
          'Mid-level dysregulation often responds well to simple, predictable body input like pushing, stretching, or deep pressure.',
        recommendedToolIds: ['wall-push', 'deep-pressure', 'movement'],
      };
    }

    return {
      title: 'Recommended first: Water Break',
      text: `${childName} seems closer to regulated. A light reset may be enough.`,
      why:
        'When a child is already somewhat regulated, a small pause can support calm without adding extra demands.',
      recommendedToolIds: ['water', 'stretch'],
    };
  }, [beforeLevel, childName]);

  const recommendedTools = useMemo(() => {
    return sensoryTools.filter((tool) =>
      sensoryRecommendations.recommendedToolIds.includes(tool.id)
    );
  }, [sensoryRecommendations]);

  const activeStep = useMemo(() => {
    if (!beforeLevel) return 1;
    if (selectedTools.length === 0) return 2;
    if (!completed) return 3;
    if (!afterLevel) return 4;
    return 4;
  }, [beforeLevel, selectedTools.length, completed, afterLevel]);

  const resultMessage = useMemo(() => {
    if (!beforeLevel || !afterLevel) return '';

    if (afterLevel > beforeLevel) {
      return `${childName} improved from ${beforeLevel} → ${afterLevel}. This sensory plan may be worth saving.`;
    }

    if (afterLevel === beforeLevel) {
      return `${childName} stayed about the same. Try one tool at a time, wait a little longer, or reduce talking next time.`;
    }

    return `That is okay. This may not be the right strategy for this moment. Try Quiet Space, Breathe Together, or fewer tools next time.`;
  }, [beforeLevel, afterLevel, childName]);

  const nextSuggestion = useMemo(() => {
    if (helpfulStatus === 'helpful') {
      return {
        icon: 'bookmark-outline' as keyof typeof Ionicons.glyphMap,
        title: 'Saved as a helpful reset',
        text: `Usually helpful: ${planName}. You can use this again from calming strategies.`,
      };
    }

    if (helpfulStatus === 'not_helpful' || (beforeLevel && afterLevel && afterLevel <= beforeLevel)) {
      return {
        icon: 'compass-outline' as keyof typeof Ionicons.glyphMap,
        title: 'Try a different next step',
        text: 'Try Quiet Space, Breathe Together, or use just one tool next time.',
      };
    }

    return null;
  }, [helpfulStatus, beforeLevel, afterLevel, planName]);

  useEffect(() => {
  if (!timerRunning) return;

  clearResetTimer();

  timerRef.current = setInterval(() => {
    setTimerSeconds((current) => {
      if (current <= 1) {
        clearResetTimer();
        setTimerRunning(false);
        setCompleted(true);
        return 0;
      }

      return current - 1;
    });
  }, 1000);

  return () => {
    clearResetTimer();
  };
}, [timerRunning]);

function clearResetTimer() {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function handleBeforeLevel(value: number) {
  clearResetTimer();

  setBeforeLevel(value);
  setAfterLevel(null);
  setSelectedToolIds([]);
  setCompleted(false);
  setHelpfulStatus(null);
  setSavedPlan(null);
  setTimerRunning(false);
  setTimerSeconds(RESET_TIMER_SECONDS);
}

function toggleTool(id: string) {
  clearResetTimer();

  setCompleted(false);
  setAfterLevel(null);
  setSavedPlan(null);
  setHelpfulStatus(null);
  setTimerRunning(false);
  setTimerSeconds(RESET_TIMER_SECONDS);

  setSelectedToolIds((prev) =>
    prev.includes(id)
      ? prev.filter((toolId) => toolId !== id)
      : [...prev, id]
  );
}

function startTimer() {
  if (!beforeLevel || selectedTools.length === 0) return;

  clearResetTimer();

  setCompleted(false);
  setTimerSeconds(RESET_TIMER_SECONDS);
  setTimerRunning(true);
}

function markTried() {
  clearResetTimer();

  setTimerRunning(false);
  setCompleted(true);
}

function resetTool() {
  clearResetTimer();

  setBeforeLevel(null);
  setAfterLevel(null);
  setSelectedToolIds([]);
  setCompleted(false);
  setHelpfulStatus(null);
  setSavedPlan(null);
  setOpenSection('pressure');
  setShowWhy(false);
  setTimerRunning(false);
  setTimerSeconds(RESET_TIMER_SECONDS);
}

  function handleAfterLevel(value: number) {
    setAfterLevel(value);
    setHelpfulStatus(null);
    setSavedPlan(null);
  }

  async function savePlanAsHelpful() {
    if (selectedTools.length === 0) return;

    setHelpfulStatus('helpful');
    setSavedPlan(planName);

    await saveCalmStrategy({
      type: 'sensory-reset',
      title: 'Sensory Reset',
      subtitle: planName,
      icon: 'sparkles-outline',
      color: '#B45309',
      bg: '#FFF7ED',
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

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.backgroundOrbTop} />
      <View pointerEvents="none" style={styles.backgroundOrbBottom} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Calm Down Toolkit</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={23} color="#A16207" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Smart Reset Plan</Text>
              <Text style={styles.title}>Let’s build a quick reset plan</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            ABA at Home will suggest calming tools based on how regulated {childName} seems right now.
          </Text>

          <View style={styles.flowTracker}>
            {[
              { id: 1, label: 'Rate' },
              { id: 2, label: 'Tools' },
              { id: 3, label: 'Try' },
              { id: 4, label: 'After' },
            ].map((step, index) => {
              const active = activeStep >= step.id;

              return (
                <React.Fragment key={step.id}>
                  <View style={styles.flowStep}>
                    <View style={[styles.flowDot, active && styles.flowDotActive]}>
                      <Text
                        style={[
                          styles.flowDotText,
                          active && styles.flowDotTextActive,
                        ]}
                      >
                        {step.id}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.flowLabel,
                        active && styles.flowLabelActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>

                  {index < 3 ? (
                    <View
                      style={[
                        styles.flowLine,
                        activeStep > step.id && styles.flowLineActive,
                      ]}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        <View style={styles.compactCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.stepLabel}>Step 1</Text>
              <Text style={styles.sectionTitle}>How regulated right now?</Text>
            </View>

            {beforeLevel ? (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{beforeLevel}/5</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.helperText}>
            1 means very dysregulated. 5 means more regulated.
          </Text>

          <CompactScale selected={beforeLevel} onSelect={handleBeforeLevel} />

          <View style={styles.levelLabels}>
            <Text style={styles.labelSmall}>Highly dysregulated</Text>
            <Text style={styles.labelSmall}>More regulated</Text>
          </View>
        </View>

        <View style={styles.recommendationCard}>
          <View style={styles.recommendationIcon}>
            <Ionicons name="bulb-outline" size={22} color="#A16207" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.recommendationTitle}>
              {sensoryRecommendations.title}
            </Text>

            <Text style={styles.recommendationText}>
              {sensoryRecommendations.text}
            </Text>

            <TouchableOpacity
              style={styles.whyButton}
              onPress={() => setShowWhy((current) => !current)}
            >
              <Text style={styles.whyButtonText}>
                {showWhy ? 'Hide why' : 'Why?'}
              </Text>
              <Ionicons
                name={showWhy ? 'chevron-up' : 'chevron-down'}
                size={15}
                color="#A16207"
              />
            </TouchableOpacity>

            {showWhy ? (
              <Text style={styles.whyText}>{sensoryRecommendations.why}</Text>
            ) : null}
          </View>
        </View>

        {beforeLevel ? (
          <View style={styles.compactCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.stepLabel}>Step 2</Text>
                <Text style={styles.sectionTitle}>Choose sensory tools</Text>
              </View>

              {selectedTools.length > 0 ? (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>
                    {selectedTools.length} selected
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.helperText}>
              Start with one recommended tool. Add more only if it helps.
            </Text>

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
                        size={16}
                        color={selected ? '#FFFFFF' : '#A16207'}
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
                <Ionicons name="checkmark-circle" size={18} color="#047857" />
                <Text style={styles.selectedSummaryText}>
                  Your plan: {planName}
                </Text>
              </View>
            ) : null}

            <View style={styles.toolSectionWrap}>
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
                        <Text style={styles.accordionSubtitle}>
                          {section.subtitle}
                        </Text>
                      </View>

                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#A16207"
                      />
                    </TouchableOpacity>

                    {open ? (
                      <View style={styles.accordionBody}>
                        {sectionTools.map((tool) => (
                          <ToolRow
                            key={tool.id}
                            tool={tool}
                            selected={selectedToolIds.includes(tool.id)}
                            onPress={() => toggleTool(tool.id)}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {selectedTools.length > 0 ? (
          <View style={styles.tryCard}>
            <Text style={styles.stepLabel}>Step 3</Text>
            <Text style={styles.sectionTitle}>Try your reset plan</Text>

            <Text style={styles.helperText}>
              Use one selected tool at a time. Keep your voice calm and give {childName} quiet time.
            </Text>

            <View style={styles.tryPlanBox}>
              {selectedTools.map((tool) => (
                <View key={tool.id} style={styles.tryPlanRow}>
                  <Ionicons name={tool.icon} size={18} color="#A16207" />
                  <Text style={styles.tryPlanText}>{tool.instruction}</Text>
                </View>
              ))}
            </View>

            <View style={styles.timerBox}>
              <View>
                <Text style={styles.timerLabel}>2-minute reset timer</Text>
                <Text style={styles.timerValue}>{formatTimer(timerSeconds)}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.timerButton,
                  timerRunning && styles.timerButtonActive,
                ]}
                onPress={timerRunning ? markTried : startTimer}
              >
                <Ionicons
                  name={timerRunning ? 'checkmark-circle-outline' : 'timer-outline'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.timerButtonText}>
                  {timerRunning ? 'Done' : 'Start timer'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={markTried}
              activeOpacity={0.9}
            >
              <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>We tried this</Text>
            </TouchableOpacity>

            {completed ? (
              <View style={styles.completedBox}>
                <Ionicons name="arrow-down-circle-outline" size={21} color="#047857" />
                <Text style={styles.completedText}>
                  Now check how regulated {childName} seems after the reset.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {completed ? (
          <View style={styles.compactCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.stepLabel}>Step 4</Text>
                <Text style={styles.sectionTitle}>How regulated after?</Text>
              </View>

              {afterLevel ? (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{afterLevel}/5</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.helperText}>
              Rate after giving the reset time to work.
            </Text>

            <CompactScale selected={afterLevel} onSelect={handleAfterLevel} />

            <View style={styles.levelLabels}>
              <Text style={styles.labelSmall}>Still dysregulated</Text>
              <Text style={styles.labelSmall}>More regulated</Text>
            </View>

            {afterLevel ? (
              <View style={styles.feedbackRow}>
                <TouchableOpacity
                  style={[
                    styles.feedbackButton,
                    helpfulStatus === 'helpful' && styles.feedbackButtonHelpful,
                  ]}
                  onPress={savePlanAsHelpful}
                >
                  <Ionicons
                    name="thumbs-up-outline"
                    size={18}
                    color={helpfulStatus === 'helpful' ? '#FFFFFF' : '#047857'}
                  />

                  <Text
                    style={[
                      styles.feedbackButtonText,
                      helpfulStatus === 'helpful' &&
                        styles.feedbackButtonTextHelpful,
                    ]}
                  >
                    Yes, this helped
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.feedbackButton,
                    helpfulStatus === 'not_helpful' &&
                      styles.feedbackButtonNotHelpful,
                  ]}
                  onPress={markNotHelpful}
                >
                  <Ionicons
                    name="thumbs-down-outline"
                    size={18}
                    color={
                      helpfulStatus === 'not_helpful' ? '#FFFFFF' : '#A16207'
                    }
                  />

                  <Text
                    style={[
                      styles.feedbackButtonText,
                      helpfulStatus === 'not_helpful' &&
                        styles.feedbackButtonTextNotHelpful,
                    ]}
                  >
                    Not this time
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {!!resultMessage && beforeLevel && afterLevel ? (
          <View
            style={[
              styles.resultCard,
              afterLevel > beforeLevel && styles.resultCardPositive,
            ]}
          >
            <View
              style={[
                styles.resultIcon,
                afterLevel > beforeLevel && styles.resultIconPositive,
              ]}
            >
              <Ionicons
                name={afterLevel > beforeLevel ? 'checkmark-circle' : 'sparkles-outline'}
                size={23}
                color={afterLevel > beforeLevel ? '#047857' : '#A16207'}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>
                {afterLevel > beforeLevel ? 'Nice work' : 'Personal result'}
              </Text>

              <Text style={styles.resultText}>{resultMessage}</Text>
            </View>
          </View>
        ) : null}

        {savedPlan ? (
          <View style={styles.savedPlanBox}>
            <Ionicons name="bookmark-outline" size={18} color="#047857" />

            <View style={{ flex: 1 }}>
              <Text style={styles.savedPlanTitle}>Saved to Quick Access</Text>
              <Text style={styles.savedPlanText}>{savedPlan}</Text>
            </View>
          </View>
        ) : null}

        {nextSuggestion ? (
          <View style={styles.nextSuggestionCard}>
            <View style={styles.nextSuggestionIcon}>
              <Ionicons name={nextSuggestion.icon} size={21} color="#4F46E5" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.nextSuggestionTitle}>
                {nextSuggestion.title}
              </Text>
              <Text style={styles.nextSuggestionText}>{nextSuggestion.text}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.resetButton} onPress={resetTool}>
          <Ionicons name="refresh-outline" size={17} color="#A16207" />
          <Text style={styles.resetText}>Reset this tool</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function CompactScale({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.scaleWrap}>
      <View style={styles.scaleLine} />

      {regulationLevels.map((level) => {
        const active = selected === level;
        const filled = selected ? level <= selected : false;

        return (
          <Pressable
            key={level}
            onPress={() => onSelect(level)}
            style={[styles.scaleCircle, filled && styles.scaleCircleFilled]}
          >
            <Text
              style={[
                styles.scaleCircleText,
                active && styles.scaleCircleTextActive,
              ]}
            >
              {level}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToolRow({
  tool,
  selected,
  onPress,
}: {
  tool: SensoryTool;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.toolRow, selected && styles.toolRowSelected]}
      onPress={onPress}
    >
      <View style={[styles.toolIcon, selected && styles.toolIconSelected]}>
        <Ionicons
          name={tool.icon}
          size={18}
          color={selected ? '#FFFFFF' : '#A16207'}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.toolTitle, selected && styles.toolTitleSelected]}>
          {tool.title}
        </Text>
        <Text style={styles.toolInstruction}>{tool.shortText}</Text>
      </View>

      <Ionicons
        name={selected ? 'checkmark-circle' : 'add-circle-outline'}
        size={23}
        color={selected ? '#047857' : '#94A3B8'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8ED',
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 42,
  },

  backgroundOrbTop: {
    position: 'absolute',
    top: -110,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
  },

  backgroundOrbBottom: {
    position: 'absolute',
    bottom: -125,
    left: -115,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  backText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 4,
  },

  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  eyebrow: {
    color: '#A16207',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },

  title: {
    color: '#0F172A',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: 10,
    color: '#475569',
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '700',
  },

  flowTracker: {
    marginTop: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  flowStep: {
    alignItems: 'center',
    minWidth: 48,
  },

  flowDot: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  flowDotActive: {
    backgroundColor: '#A16207',
  },

  flowDotText: {
    color: '#A16207',
    fontSize: 12,
    fontWeight: '900',
  },

  flowDotTextActive: {
    color: '#FFFFFF',
  },

  flowLabel: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '900',
  },

  flowLabelActive: {
    color: '#0F172A',
  },

  flowLine: {
    flex: 1,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#FDE68A',
    marginBottom: 17,
  },

  flowLineActive: {
    backgroundColor: '#A16207',
  },

  compactCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    color: '#A16207',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 7,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 5,
  },

  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  levelBadge: {
    backgroundColor: '#F5F3FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  levelBadgeText: {
    color: '#5B21B6',
    fontSize: 11,
    fontWeight: '900',
  },

  scaleWrap: {
    height: 48,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  scaleLine: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FDE68A',
  },

  scaleCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scaleCircleFilled: {
    backgroundColor: '#A16207',
    borderColor: '#A16207',
  },

  scaleCircleText: {
    color: '#A16207',
    fontSize: 14,
    fontWeight: '900',
  },

  scaleCircleTextActive: {
    color: '#FFFFFF',
  },

  levelLabels: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  labelSmall: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '800',
  },

  recommendationCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 24,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FDBA74',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  recommendationIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  recommendationTitle: {
    color: '#92400E',
    fontSize: 16,
    fontWeight: '900',
  },

  recommendationText: {
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  whyButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  whyButtonText: {
    color: '#A16207',
    fontSize: 12,
    fontWeight: '900',
  },

  whyText: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
  },

  recommendedToolWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  recommendedToolChip: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  recommendedToolChipSelected: {
    backgroundColor: '#A16207',
    borderColor: '#A16207',
  },

  recommendedToolChipText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '900',
  },

  recommendedToolChipTextSelected: {
    color: '#FFFFFF',
  },

  selectedSummary: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedSummaryText: {
    flex: 1,
    marginLeft: 8,
    color: '#047857',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
  },

  toolSectionWrap: {
    gap: 10,
  },

  accordionSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    overflow: 'hidden',
  },

  accordionHeader: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  accordionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
  },

  accordionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 17,
  },

  accordionBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },

  toolRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  toolRowSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },

  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  toolIconSelected: {
    backgroundColor: '#047857',
  },

  toolTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  toolTitleSelected: {
    color: '#047857',
  },

  toolInstruction: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 2,
  },

  tryCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  tryPlanBox: {
    gap: 9,
    marginBottom: 13,
  },

  tryPlanRow: {
    backgroundColor: '#FFFBEB',
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  tryPlanText: {
    flex: 1,
    color: '#475569',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '800',
  },

  timerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  timerLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },

  timerValue: {
    marginTop: 3,
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },

  timerButton: {
    backgroundColor: '#A16207',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  timerButtonActive: {
    backgroundColor: '#047857',
  },

  timerButtonText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
  },

  primaryButton: {
    minHeight: 46,
    borderRadius: 17,
    backgroundColor: '#A16207',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 7,
  },

  completedBox: {
    marginTop: 11,
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  completedText: {
    flex: 1,
    color: '#047857',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
    marginLeft: 8,
  },

  feedbackRow: {
    marginTop: 13,
    gap: 9,
  },

  feedbackButton: {
    minHeight: 46,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedbackButtonHelpful: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },

  feedbackButtonNotHelpful: {
    backgroundColor: '#A16207',
    borderColor: '#A16207',
  },

  feedbackButtonText: {
    marginLeft: 7,
    fontSize: 13.5,
    fontWeight: '900',
    color: '#92400E',
  },

  feedbackButtonTextHelpful: {
    color: '#FFFFFF',
  },

  feedbackButtonTextNotHelpful: {
    color: '#FFFFFF',
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
  },

  resultCardPositive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },

  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultIconPositive: {
    backgroundColor: '#DCFCE7',
  },

  resultTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  resultText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  savedPlanBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 22,
    padding: 14,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  savedPlanTitle: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '900',
  },

  savedPlanText: {
    color: '#064E3B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 3,
  },

  nextSuggestionCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  nextSuggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextSuggestionTitle: {
    color: '#4C1D95',
    fontSize: 15,
    fontWeight: '900',
  },

  nextSuggestionText: {
    marginTop: 3,
    color: '#6D28D9',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '800',
  },

  resetButton: {
    height: 46,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetText: {
    marginLeft: 7,
    fontSize: 13.5,
    fontWeight: '900',
    color: '#A16207',
  },
});
