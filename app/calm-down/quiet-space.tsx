import { saveCalmStrategy } from '@/lib/calmStrategiesStorage';
import { saveCalmToolkitLog } from '@/lib/calmToolkitInsights';
import { useChild } from '@/lib/SelectedChildContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Trigger = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type QuietSupport = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tip: string;
};

const quietSpaceImage = require('../../assets/images/calm-toolkit/quiet-space.png');

const triggers: Trigger[] = [
  { id: 'sounds', title: 'Loud sounds', icon: 'volume-high-outline' },
  { id: 'lights', title: 'Bright lights', icon: 'sunny-outline' },
  { id: 'people', title: 'Too many people', icon: 'people-outline' },
  { id: 'demands', title: 'Demands/questions', icon: 'chatbubbles-outline' },
  { id: 'busy', title: 'Busy environment', icon: 'grid-outline' },
  { id: 'screen', title: 'Screen/audio overload', icon: 'tablet-landscape-outline' },
];

const quietSupports: QuietSupport[] = [
  {
    id: 'dim-lights',
    title: 'Dim lights',
    icon: 'bulb-outline',
    tip: 'Turn off bright lights or move to softer lighting.',
  },
  {
    id: 'less-talking',
    title: 'Reduce talking',
    icon: 'chatbubble-ellipses-outline',
    tip: 'Use fewer words and pause before speaking again.',
  },
  {
    id: 'lower-sound',
    title: 'Lower sound',
    icon: 'volume-low-outline',
    tip: 'Turn down music, TV, voices, or background noise.',
  },
  {
    id: 'comfort-item',
    title: 'Comfort item',
    icon: 'heart-outline',
    tip: 'Offer a favorite blanket, stuffed animal, pillow, or safe item.',
  },
  {
    id: 'cozy-space',
    title: 'Cozy space',
    icon: 'home-outline',
    tip: 'Create a small calm area with a chair, blanket, or quiet corner.',
  },
  {
    id: 'physical-space',
    title: 'Give space',
    icon: 'person-outline',
    tip: 'Stay nearby, but avoid crowding or too much touch.',
  },
];

const supportMatchesByTrigger: Record<string, string[]> = {
  sounds: ['lower-sound', 'less-talking'],
  lights: ['dim-lights'],
  people: ['physical-space', 'cozy-space'],
  demands: ['less-talking', 'physical-space'],
  busy: ['cozy-space', 'lower-sound', 'less-talking'],
  screen: ['lower-sound', 'dim-lights'],
};

function getQuietPreviewText(selectedTriggerIds: string[]) {
  if (selectedTriggerIds.length === 0) {
    return 'Choose what feels overwhelming, and ABA at Home will build a simple quiet space plan.';
  }

  if (selectedTriggerIds.includes('sounds')) {
    return 'Start by lowering sound, reducing talking, and creating a softer listening space.';
  }

  if (selectedTriggerIds.includes('lights')) {
    return 'Start by dimming lights, moving away from brightness, and using softer surroundings.';
  }

  if (selectedTriggerIds.includes('people')) {
    return 'Start by giving space and moving to a quieter area with fewer people nearby.';
  }

  if (selectedTriggerIds.includes('demands')) {
    return 'Start by reducing questions, using fewer words, and allowing quiet waiting.';
  }

  return 'Start by creating a calmer space with less sound, fewer words, and lower stimulation.';
}

export default function QuietSpaceScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
  const [selectedSupportIds, setSelectedSupportIds] = useState<string[]>([]);
  const [mostHelpfulIds, setMostHelpfulIds] = useState<string[]>([]);
  const [savedPreference, setSavedPreference] = useState<string | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120);

  const { selectedChild } = useChild() as any;

  const selectedSupports = useMemo(() => {
    return quietSupports.filter((support) => selectedSupportIds.includes(support.id));
  }, [selectedSupportIds]);

const suggestedSupports = useMemo(() => {
  const supportIds = selectedTriggerIds.flatMap(
    (triggerId) => supportMatchesByTrigger[triggerId] || []
  );

  const uniqueSupportIds = Array.from(new Set(supportIds));

  return quietSupports.filter((support) =>
    uniqueSupportIds.includes(support.id)
  );
}, [selectedTriggerIds]);

const quietPreviewText = useMemo(() => {
  return getQuietPreviewText(selectedTriggerIds);
}, [selectedTriggerIds]);
  const timerDisplay = useMemo(() => {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timerSeconds]);

  const timerComplete = timerSeconds === 0;

const completedSteps = useMemo(() => {
  let count = 0;

  if (selectedTriggerIds.length > 0) count += 1;
  if (suggestedSupports.length > 0) count += 1;
  if (selectedSupportIds.length > 0) count += 1;
  if (timerComplete) count += 1;
  if (savedPreference) count += 1;

  return count;
}, [
  selectedTriggerIds.length,
  suggestedSupports.length,
  selectedSupportIds.length,
  timerComplete,
  savedPreference,
]);

  function toggleTrigger(id: string) {
    setSelectedTriggerIds((prev) =>
      prev.includes(id)
        ? prev.filter((triggerId) => triggerId !== id)
        : [...prev, id]
    );
  }

  function toggleSupport(id: string) {
    setSavedPreference(null);

    setSelectedSupportIds((prev) =>
      prev.includes(id)
        ? prev.filter((supportId) => supportId !== id)
        : [...prev, id]
    );
  }

  function toggleHelpful(id: string) {
    setMostHelpfulIds((prev) =>
      prev.includes(id)
        ? prev.filter((supportId) => supportId !== id)
        : [...prev, id]
    );
  }

  function startQuietTimer() {
    if (timerStarted) return;

    setTimerStarted(true);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    intervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setTimerStarted(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }

  function resetQuietTimer() {
  setTimerStarted(false);
  setTimerSeconds(120);

  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  pulseAnim.stopAnimation();
  pulseAnim.setValue(1);
}

  async function saveQuietPreferences() {
  const helpfulSupports = quietSupports.filter((support) =>
    mostHelpfulIds.includes(support.id)
  );

  const supportsToSave =
    helpfulSupports.length > 0 ? helpfulSupports : selectedSupports;

  const preferenceText = supportsToSave
    .map((support) => support.title)
    .join(' + ');

  if (!preferenceText) return;

  setSavedPreference(preferenceText);

  await saveCalmStrategy({
    type: 'quiet-space',
    title: 'Quiet Space',
    subtitle: preferenceText,
    icon: 'moon-outline',
    color: '#4338CA',
    bg: '#EEF2FF',
  });

  await saveCalmToolkitLog({
    childId: selectedChild?.id,
    toolType: 'quiet-space',
    strategyName: preferenceText,
    helped: true,
    toolsUsed: supportsToSave.map((support) => support.title),
    trigger: selectedTriggerIds.join(', '),
  });
}

async function markQuietSpaceNotHelpful() {
  const preferenceText = selectedSupports
    .map((support) => support.title)
    .join(' + ');

  await saveCalmToolkitLog({
    childId: selectedChild?.id,
    toolType: 'quiet-space',
    strategyName: preferenceText || 'Quiet Space',
    helped: false,
    toolsUsed: selectedSupports.map((support) => support.title),
    trigger: selectedTriggerIds.join(', '),
  });
}

function resetTool() {
  setSelectedTriggerIds([]);
  setSelectedSupportIds([]);
  setMostHelpfulIds([]);
  setSavedPreference(null);
  resetQuietTimer();
}

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Calm Down Toolkit</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
  <Image
    source={quietSpaceImage}
    style={styles.heroImage}
    resizeMode="cover"
  />

  <View style={styles.headerTextRow}>
    <View style={styles.iconCircleSmall}>
      <Ionicons name="moon-outline" size={28} color="#4338CA" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Quiet Space</Text>

      <Text style={styles.subtitle}>
        Build a low-stimulation space with fewer words, softer surroundings,
        and quiet waiting.
      </Text>
    </View>
  </View>
</View>
<View style={styles.progressTracker}>
  {[1, 2, 3, 4, 5].map((step) => {
    const active = completedSteps >= step;

    return (
      <View key={step} style={styles.progressStepWrap}>
        <View style={[styles.progressDot, active && styles.progressDotActive]}>
          <Text style={[styles.progressDotText, active && styles.progressDotTextActive]}>
            {step}
          </Text>
        </View>

        {step < 5 ? (
          <View style={[styles.progressLine, active && styles.progressLineActive]} />
        ) : null}
      </View>
    );
  })}
</View>



        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 1</Text>
          <Text style={styles.sectionTitle}>What may be overwhelming?</Text>
          <Text style={styles.helperText}>
            Select anything that may be making the moment harder right now.
          </Text>

          <View style={styles.optionGrid}>
            {triggers.map((trigger) => {
              const selected = selectedTriggerIds.includes(trigger.id);

              return (
                <Pressable
                  key={trigger.id}
                  onPress={() => toggleTrigger(trigger.id)}
                  style={[
                    styles.optionCard,
                    selected && styles.optionCardSelected,
                  ]}
                >
                  <Ionicons
                    name={trigger.icon}
                    size={21}
                    color={selected ? '#FFFFFF' : '#4338CA'}
                  />

                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {trigger.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

       <View style={styles.suggestedPlanCard}>
  <View style={styles.stepHeaderRow}>
    <Text style={styles.stepLabel}>Step 2</Text>

    <View style={styles.autoPlanPill}>
      <Ionicons name="sparkles-outline" size={14} color="#4338CA" />
      <Text style={styles.autoPlanText}>Auto plan</Text>
    </View>
  </View>

  <Text style={styles.sectionTitle}>Your quiet space plan</Text>

  <View style={styles.previewBox}>
    <View style={styles.previewIcon}>
      <Ionicons name="moon-outline" size={24} color="#4338CA" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.previewTitle}>
        {selectedTriggerIds.length > 0 ? 'Plan created' : 'Ready to build'}
      </Text>

      <Text style={styles.previewText}>{quietPreviewText}</Text>
    </View>
  </View>

  {suggestedSupports.length > 0 ? (
    <>
      <Text style={styles.planMiniTitle}>Suggested first supports</Text>

      <View style={styles.suggestedChipWrap}>
        {suggestedSupports.map((support) => (
          <Pressable
            key={support.id}
            onPress={() => toggleSupport(support.id)}
            style={[
              styles.suggestedChip,
              selectedSupportIds.includes(support.id) &&
                styles.suggestedChipSelected,
            ]}
          >
            <Ionicons
              name={support.icon}
              size={17}
              color={
                selectedSupportIds.includes(support.id)
                  ? '#FFFFFF'
                  : '#4338CA'
              }
            />

            <Text
              style={[
                styles.suggestedChipText,
                selectedSupportIds.includes(support.id) &&
                  styles.suggestedChipTextSelected,
              ]}
            >
              {support.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  ) : (
    <Text style={styles.emptyText}>
      Select what may be overwhelming first, then suggested supports will appear here.
    </Text>
  )}
</View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 3</Text>
          <Text style={styles.sectionTitle}>Build the quiet space</Text>
          <Text style={styles.helperText}>
            Tap supports you can use. Each support gives you a quick parent tip.
          </Text>

          <View style={styles.supportList}>
            {quietSupports.map((support) => {
              const selected = selectedSupportIds.includes(support.id);

              return (
                <Pressable
                  key={support.id}
                  onPress={() => toggleSupport(support.id)}
                  style={[
                    styles.supportCard,
                    selected && styles.supportCardSelected,
                  ]}
                >
                  <View style={styles.supportTopRow}>
                    <View
                      style={[
                        styles.supportIcon,
                        selected && styles.supportIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={support.icon}
                        size={22}
                        color={selected ? '#FFFFFF' : '#4338CA'}
                      />
                    </View>

                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={24}
                      color={selected ? '#4338CA' : '#94A3B8'}
                    />
                  </View>

                  <Text
                    style={[
                      styles.supportTitle,
                      selected && styles.supportTitleSelected,
                    ]}
                  >
                    {support.title}
                  </Text>

                  {selected && (
                    <View style={styles.supportTipBox}>
                      <Text style={styles.supportTipLabel}>Parent tip:</Text>
                      <Text style={styles.supportTipText}>{support.tip}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.stepLabel}>Step 4</Text>
          <Text style={styles.sectionTitle}>Quiet waiting timer</Text>
          <Text style={styles.helperText}>
            Start a 2-minute quiet reset. Try not to over-talk during this time.
          </Text>

          <Animated.View style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.timerLabel}>
              {timerStarted ? 'Quiet time' : 'Ready'}
            </Text>
            <Text style={styles.timerText}>{timerDisplay}</Text>
          </Animated.View>

          <View style={styles.timerButtons}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                selectedSupportIds.length === 0 && styles.disabledButton,
              ]}
              disabled={selectedSupportIds.length === 0}
              onPress={startQuietTimer}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Start quiet time</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={resetQuietTimer}>
              <Ionicons name="refresh-outline" size={18} color="#4338CA" />
              <Text style={styles.secondaryButtonText}>Reset timer</Text>
            </TouchableOpacity>

            {timerComplete ? (
  <View style={styles.completeBox}>
    <Ionicons name="checkmark-circle" size={24} color="#4338CA" />

    <View style={{ flex: 1 }}>
      <Text style={styles.completeTitle}>Quiet time complete</Text>
      <Text style={styles.completeText}>
        Great job. Notice if breathing, body tension, or talking feels a little calmer.
      </Text>
    </View>
  </View>
) : null}
          </View>
        </View>

        <View style={[styles.card, styles.stepFiveCard]}>
          <Text style={styles.stepLabel}>Step 5</Text>
<Text style={styles.sectionTitle}>What helped most today?</Text>

{timerComplete ? (
  <>
    <Text style={styles.helperText}>
      Select what helped lower stimulation so you can save it for next time.
    </Text>

    <View style={styles.supportList}>
      {selectedSupports.length > 0 ? (
        selectedSupports.map((support) => {
          const selected = mostHelpfulIds.includes(support.id);

          return (
            <Pressable
              key={support.id}
              onPress={() => toggleHelpful(support.id)}
              style={[
                styles.helpfulCard,
                selected && styles.helpfulCardSelected,
              ]}
            >
              <Ionicons
                name={selected ? 'heart' : 'heart-outline'}
                size={21}
                color={selected ? '#FFFFFF' : '#4338CA'}
              />

              <Text
                style={[
                  styles.helpfulText,
                  selected && styles.helpfulTextSelected,
                ]}
              >
                {support.title}
              </Text>
            </Pressable>
          );
        })
      ) : (
        <Text style={styles.emptyText}>
          Choose quiet space supports first, then come back here.
        </Text>
      )}
    </View>

    <TouchableOpacity
      style={[
        styles.saveButton,
        selectedSupports.length === 0 && styles.disabledButton,
      ]}
      disabled={selectedSupports.length === 0}
      onPress={saveQuietPreferences}
    >
      <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
      <Text style={styles.saveButtonText}>Save quiet space preferences</Text>
    </TouchableOpacity>

    {savedPreference && (
      <View style={styles.savedBox}>
        <Ionicons name="bookmark" size={20} color="#4338CA" />
        <View style={{ flex: 1 }}>
          <Text style={styles.savedTitle}>Saved to Quick Access</Text>
          <Text style={styles.savedText}>{savedPreference}</Text>
        </View>
      </View>
    )}
  </>
) : (
  <View style={styles.lockedBox}>
    <Ionicons name="lock-closed-outline" size={22} color="#64748B" />
    <Text style={styles.lockedText}>
      Complete quiet time first, then you can save what helped most.
    </Text>
  </View>
)}
        </View>

        <TouchableOpacity
  style={[
    styles.notHelpfulButton,
    selectedSupports.length === 0 && styles.disabledButton,
  ]}
  disabled={selectedSupports.length === 0}
  onPress={markQuietSpaceNotHelpful}
>
  <Ionicons name="thumbs-down-outline" size={18} color="#4338CA" />
  <Text style={styles.notHelpfulButtonText}>Not helpful this time</Text>
</TouchableOpacity>

        <View style={styles.parentTipCard}>
          <Text style={styles.parentTipTitle}>Quiet Space reminder</Text>
          <Text style={styles.parentTipText}>
            A quiet space is not a punishment. It should feel safe, calm, and
            supportive. Stay nearby without crowding.
          </Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetTool}>
          <Ionicons name="refresh-outline" size={18} color="#4338CA" />
          <Text style={styles.resetText}>Reset this tool</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EEF2FF',
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
  backgroundColor: '#F8FAFF',
  borderRadius: 30,
  padding: 14,
  marginBottom: 18,
  borderWidth: 1.5,
  borderColor: '#C7D2FE',
  shadowColor: '#4338CA',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
},
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

title: {
  fontSize: 28,
  fontWeight: '900',
  color: '#312E81',
},

subtitle: {
  fontSize: 14,
  color: '#475569',
  marginTop: 5,
  lineHeight: 20,
  fontWeight: '700',
},
  card: {
    backgroundColor: '#F8FAFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  suggestedPlanCard: {
  backgroundColor: '#FAF8FF',
  borderRadius: 28,
  padding: 18,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#C7D2FE',

  shadowColor: '#4338CA',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 6,
  },

  elevation: 4,
},
  timerCard: {
    backgroundColor: '#FDFBFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
  },
  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF',
    color: '#4338CA',
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
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    width: '48%',
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCardSelected: {
  backgroundColor: '#4338CA',
  borderColor: '#4338CA',
},

optionTextSelected: {
  color: '#FFFFFF',
},
  optionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '900',
    color: '#312E81',
  },
  suggestedList: {
    gap: 12,
  },
  suggestedItem: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestedTitle: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '900',
    color: '#312E81',
  },
  suggestedTip: {
    marginLeft: 10,
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    lineHeight: 19,
  },
  supportList: {
    gap: 12,
  },
  supportCard: {
    backgroundColor: '#FFF9F5',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 22,
    padding: 15,
  },
  supportCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4338CA',
  },
  supportTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  supportIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportIconSelected: {
    backgroundColor: '#4338CA',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#334155',
  },
  supportTitleSelected: {
    color: '#312E81',
  },
  supportTipBox: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  supportTipLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4338CA',
    marginBottom: 4,
  },
  supportTipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 20,
  },
  timerCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#EEF2FF',
    borderWidth: 8,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  timerLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4338CA',
  },
  timerText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#312E81',
    marginTop: 4,
  },
  timerButtons: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#4338CA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 8,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#4338CA',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 8,
  },
  helpfulCard: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulCardSelected: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  helpfulText: {
    marginLeft: 8,
    color: '#312E81',
    fontWeight: '900',
    fontSize: 14,
  },
  helpfulTextSelected: {
    color: '#FFFFFF',
  },
  emptyText: {
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 20,
  },
  saveButton: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#4338CA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.45,
  },
  savedBox: {
    marginTop: 14,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  savedTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#312E81',
    marginLeft: 8,
  },
  savedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
    marginTop: 4,
    marginLeft: 8,
  },
  parentTipCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 14,
  },
  parentTipTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#312E81',
    marginBottom: 6,
  },
  parentTipText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    fontWeight: '700',
  },
  resetButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '900',
    color: '#4338CA',
  },

  notHelpfulButton: {
  marginTop: 10,
  minHeight: 52,
  borderRadius: 18,
  backgroundColor: '#EEF2FF',
  borderWidth: 1,
  borderColor: '#C7D2FE',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

notHelpfulButtonText: {
  marginLeft: 8,
  color: '#4338CA',
  fontWeight: '900',
  fontSize: 15,
},

heroImage: {
  width: '100%',
  height: 155,
  borderRadius: 24,
  marginBottom: 16,
},

headerTextRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

iconCircleSmall: {
  width: 58,
  height: 58,
  borderRadius: 22,
  backgroundColor: '#E0E7FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

progressTracker: {
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  paddingVertical: 14,
  paddingHorizontal: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#C7D2FE',
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
  backgroundColor: '#E0E7FF',
  alignItems: 'center',
  justifyContent: 'center',
},

progressDotActive: {
  backgroundColor: '#4338CA',
},

progressDotText: {
  color: '#4338CA',
  fontSize: 12,
  fontWeight: '900',
},

progressDotTextActive: {
  color: '#FFFFFF',
},

progressLine: {
  width: 26,
  height: 3,
  borderRadius: 999,
  backgroundColor: '#C7D2FE',
  marginHorizontal: 4,
},

progressLineActive: {
  backgroundColor: '#4338CA',
},

stepFiveCard: {
  backgroundColor: '#FFF9F5',
},

completeBox: {
  marginTop: 16,
  backgroundColor: '#EEF2FF',
  borderRadius: 18,
  padding: 14,
  borderWidth: 1,
  borderColor: '#C7D2FE',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
},

completeTitle: {
  color: '#312E81',
  fontSize: 15,
  fontWeight: '900',
},

completeText: {
  marginTop: 3,
  color: '#475569',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
},

lockedBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 18,
  padding: 16,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  flexDirection: 'row',
  alignItems: 'center',
},

lockedText: {
  flex: 1,
  marginLeft: 10,
  color: '#64748B',
  fontSize: 14,
  lineHeight: 20,
  fontWeight: '800',
},

stepHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},

autoPlanPill: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#E0E7FF',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
},

autoPlanText: {
  marginLeft: 4,
  color: '#4338CA',
  fontSize: 11,
  fontWeight: '900',
},

previewBox: {
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  padding: 14,
  borderWidth: 1,
  borderColor: '#C7D2FE',
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 14,
},

previewIcon: {
  width: 46,
  height: 46,
  borderRadius: 17,
  backgroundColor: '#E0E7FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

previewTitle: {
  fontSize: 15,
  fontWeight: '900',
  color: '#312E81',
},

previewText: {
  marginTop: 4,
  color: '#475569',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
},

planMiniTitle: {
  fontSize: 13,
  fontWeight: '900',
  color: '#312E81',
  marginBottom: 10,
},

suggestedChipWrap: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

suggestedChip: {
  minHeight: 42,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderWidth: 1,
  borderColor: '#C7D2FE',
  backgroundColor: '#EEF2FF',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

suggestedChipSelected: {
  backgroundColor: '#4338CA',
  borderColor: '#4338CA',
},

suggestedChipText: {
  color: '#312E81',
  fontSize: 12.5,
  fontWeight: '900',
},

suggestedChipTextSelected: {
  color: '#FFFFFF',
},
});