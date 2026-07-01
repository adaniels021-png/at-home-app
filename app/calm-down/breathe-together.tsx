import { saveCalmToolkitLog } from '@/lib/calmToolkitInsights';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Phase = 'Ready' | 'Breathe in' | 'Hold' | 'Breathe out';

const calmLevels = [1, 2, 3, 4, 5];

// Add this image to assets/images/ or change this require path to your actual file name.
const HERO_IMAGE = require('@/assets/images/breathe-together-hero.png');

export default function BreatheTogetherScreen() {
  const router = useRouter();

  const circleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('Ready');
  const [count, setCount] = useState(4);
  const [cycles, setCycles] = useState(0);
  const [beforeCalm, setBeforeCalm] = useState<number | null>(null);
  const [afterCalm, setAfterCalm] = useState<number | null>(null);
  const [helped, setHelped] = useState(false);

  const coachText = useMemo(() => {
    if (phase === 'Ready') return 'Start by calming your own body first.';
    if (phase === 'Breathe in') return 'Breathe in slowly. Let your child copy you if they can.';
    if (phase === 'Hold') return 'Pause softly. No pressure. Just stay calm nearby.';
    return 'Breathe out slowly, like blowing bubbles.';
  }, [phase]);

  const resultMessage = useMemo(() => {
    if (!beforeCalm || !afterCalm) return '';

    if (afterCalm > beforeCalm) {
      return 'This helped. Your child seemed more regulated after trying it.';
    }

    if (afterCalm === beforeCalm) {
      return 'Good try. This may need more time, or your child may need a quieter space first.';
    }

    return 'That is okay. This may not be the right strategy for this moment.';
  }, [beforeCalm, afterCalm]);

  const showNextToolSuggestion = helped || !!resultMessage || !!afterCalm;

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setTimeout(() => {
      if (count > 1) {
        setCount((prev) => prev - 1);
      } else {
        moveToNextPhase();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, count, phase]);

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: isRunning ? 1 : 0,
      duration: 350,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isRunning, glowAnim]);

  function animateCircle(toValue: number, duration: number) {
    Animated.timing(circleAnim, {
      toValue,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }

  function moveToNextPhase() {
    if (phase === 'Ready') {
      setPhase('Breathe in');
      setCount(4);
      animateCircle(1.45, 4000);
      return;
    }

    if (phase === 'Breathe in') {
      setPhase('Hold');
      setCount(2);
      return;
    }

    if (phase === 'Hold') {
      setPhase('Breathe out');
      setCount(4);
      animateCircle(1, 4000);
      return;
    }

    setCycles((prev) => prev + 1);
    setPhase('Breathe in');
    setCount(4);
    animateCircle(1.45, 4000);
  }

  function startBreathing() {
    setIsRunning(true);
    setPhase('Breathe in');
    setCount(4);
    setCycles(0);
    setAfterCalm(null);
    setHelped(false);
    animateCircle(1.45, 4000);
  }

  function stopBreathing() {
    setIsRunning(false);
    setPhase('Ready');
    setCount(4);

    if (timerRef.current) clearTimeout(timerRef.current);

    circleAnim.stopAnimation();

    Animated.timing(circleAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  async function toggleHelped() {
    const nextHelped = !helped;
    setHelped(nextHelped);

    if (nextHelped) {
      await saveCalmToolkitLog({
        toolType: 'breathe-together',
        trigger: 'big-emotions',
        toolsUsed: ['Breathe Together'],
        helped: true,
      });
    }
  }

 const glowOpacity = glowAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0.25, 1],
});

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundBase} />
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobBottomRight} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.backText}>Calm Down Toolkit</Text>
        </View>

        <View style={styles.heroBlendWrap}>
          <View style={styles.heroGlowBehind} />

          <View style={styles.heroCard}>
            <Image source={HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />

            <View style={styles.heroOverlay} />

            <View style={styles.heroCopy}>
              <View style={styles.iconCircle}>
                <Ionicons name="leaf-outline" size={28} color="#FFFFFF" />
              </View>

              <Text style={styles.title}>Breathe Together</Text>

              <Text style={styles.subtitle}>
                Slow your body first. Stay close, calm, and steady.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressStrip}>
          <View style={styles.progressStep}>
            <View style={styles.progressDot}>
              <Text style={styles.progressNumber}>1</Text>
            </View>
            <Text style={styles.progressText}>Check calm</Text>
          </View>

          <View style={styles.progressLine} />

          <View style={styles.progressStep}>
            <View style={styles.progressDot}>
              <Text style={styles.progressNumber}>2</Text>
            </View>
            <Text style={styles.progressText}>Breathe</Text>
          </View>

          <View style={styles.progressLine} />

          <View style={styles.progressStep}>
            <View style={styles.progressDot}>
              <Text style={styles.progressNumber}>3</Text>
            </View>
            <Text style={styles.progressText}>Check again</Text>
          </View>
        </View>

        <View style={styles.scriptCard}>
          <View style={styles.scriptIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#047857" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.scriptTitle}>Parent script</Text>
            <Text style={styles.scriptQuote}>
              “You’re safe. I’m right here. Let’s breathe together.”
            </Text>
          </View>
        </View>

        <CalmLevelCard
          title="Before calm level"
          helper="How calm does your child seem right now?"
          selected={beforeCalm}
          onSelect={setBeforeCalm}
        />

        <View style={styles.breathingCard}>
  <View style={styles.liveBadge}>
    <View style={[styles.liveDot, isRunning && styles.liveDotActive]} />
    <Text style={styles.liveText}>
      {isRunning ? 'Breathing in progress' : 'Ready when you are'}
    </Text>
  </View>

  <Pressable
    style={styles.circleWrap}
    onPress={isRunning ? stopBreathing : startBreathing}
  >
    <Animated.View style={[styles.circleGlow, { opacity: glowOpacity }]} />

    <Animated.View
      style={[styles.breathCircle, { transform: [{ scale: circleAnim }] }]}
    >
      <View style={styles.innerCircle}>
        <Text style={styles.phaseText}>{isRunning ? phase : 'Tap to'}</Text>
        <Text style={styles.countText}>{isRunning ? count : 'Start'}</Text>
      </View>
    </Animated.View>
  </Pressable>

  <View style={styles.phaseLabelsRow}>
    <PhaseLabel label="Breathe in" active={phase === 'Breathe in'} />
    <PhaseLabel label="Hold" active={phase === 'Hold'} />
    <PhaseLabel label="Breathe out" active={phase === 'Breathe out'} />
  </View>

  <Text style={styles.coachText}>{coachText}</Text>

  <View style={styles.buttonRow}>
    <TouchableOpacity
      style={[styles.primaryButton, isRunning && styles.primaryButtonDisabled]}
      onPress={startBreathing}
      disabled={isRunning}
      activeOpacity={0.9}
    >
      <Ionicons name="play" size={18} color="#FFFFFF" />
      <Text style={styles.primaryButtonText}>Start</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.secondaryButton}
      onPress={stopBreathing}
      activeOpacity={0.9}
    >
      <Ionicons name="stop" size={18} color="#047857" />
      <Text style={styles.secondaryButtonText}>Stop</Text>
    </TouchableOpacity>
  </View>

  <View style={styles.roundsCard}>
    <Ionicons name="repeat-outline" size={16} color="#047857" />
    <Text style={styles.roundsText}>{cycles} rounds</Text>
  </View>
</View>
   
        <CalmLevelCard
          title="After calm level"
          helper="How calm does your child seem after trying this?"
          selected={afterCalm}
          onSelect={setAfterCalm}
        />

        <TouchableOpacity
          style={[styles.helpedButton, helped && styles.helpedButtonSelected]}
          onPress={toggleHelped}
          activeOpacity={0.9}
        >
          <Ionicons
            name={helped ? 'heart' : 'heart-outline'}
            size={20}
            color={helped ? '#FFFFFF' : '#047857'}
          />
          <Text style={[styles.helpedText, helped && styles.helpedTextSelected]}>
            This helped
          </Text>
        </TouchableOpacity>

        {!!resultMessage && (
          <View style={styles.resultCard}>
            <View style={styles.resultIcon}>
              <Ionicons name="sparkles-outline" size={22} color="#047857" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>Personal result</Text>
              <Text style={styles.resultText}>{resultMessage}</Text>
            </View>
          </View>
        )}

        {showNextToolSuggestion && (
          <View style={styles.nextToolCard}>
            <View style={styles.nextToolIcon}>
              <Ionicons name="compass-outline" size={23} color="#047857" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.nextToolTitle}>Need more support?</Text>
              <Text style={styles.nextToolText}>
                Try Quiet Space or Sensory Reset next.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.tipCard}>
  <Ionicons name="bulb-outline" size={22} color="#047857" />

  <View style={{ flex: 1 }}>
    <Text style={styles.tipTitle}>Parent tip</Text>
    <Text style={styles.tipText}>
      Do not force perfect breathing, eye contact, or talking. The goal is safety, connection, and slowing the moment down.
    </Text>
  </View>
</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PhaseLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.phaseLabel, active && styles.phaseLabelActive]}>
      <Text style={[styles.phaseLabelText, active && styles.phaseLabelTextActive]}>
        {label}
      </Text>
    </View>
  );
}

function CalmLevelCard({
  title,
  helper,
  selected,
  onSelect,
}: {
  title: string;
  helper: string;
  selected: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {selected ? (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>{selected}/5</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.helperText}>{helper}</Text>

      <View style={styles.levelRow}>
        {calmLevels.map((level) => (
          <Pressable
            key={level}
            onPress={() => onSelect(level)}
            style={[styles.levelButton, selected === level && styles.levelButtonSelected]}
          >
            <Text style={[styles.levelText, selected === level && styles.levelTextSelected]}>
              {level}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.levelLabels}>
        <Text style={styles.labelSmall}>Not calm</Text>
        <Text style={styles.labelSmall}>Very calm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
  flex: 1,
  backgroundColor: '#F7FFF9',
},

  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 46,
  },

  bgBlobTopRight: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#D1FAE5',
    top: -118,
    right: -130,
    opacity: 0.75,
  },

  bgBlobLeft: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FEF3C7',
    top: 620,
    left: -170,
    opacity: 0.34,
  },

  bgBlobBottomRight: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#BBF7D0',
    bottom: 80,
    right: -145,
    opacity: 0.28,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  backText: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  heroBlendWrap: {
    marginBottom: 16,
  },

  heroGlowBehind: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: -10,
    height: 46,
    borderRadius: 28,
    backgroundColor: '#D1FAE5',
    opacity: 0.7,
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

heroOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(4,120,87,0.52)',
},

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressStep: {
    flex: 1,
    alignItems: 'center',
  },

  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  progressNumber: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '900',
  },

  progressText: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  progressLine: {
    width: 22,
    height: 1,
    backgroundColor: '#A7F3D0',
    marginBottom: 20,
  },

  scriptCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  scriptIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scriptTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#7C2D12',
  },

  scriptQuote: {
    marginTop: 4,
    color: '#064E3B',
    lineHeight: 22,
    fontSize: 15,
    fontWeight: '900',
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  selectedBadge: {
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  selectedBadgeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '900',
  },

  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  levelRow: {
    flexDirection: 'row',
    gap: 8,
  },

heroCard: {
  height: 210,
  borderRadius: 32,
  overflow: 'hidden',
  backgroundColor: '#047857',
  shadowColor: '#047857',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
},

heroCopy: {
  position: 'absolute',
  left: 22,
  top: 22,
  bottom: 22,
  width: '52%',
  justifyContent: 'space-between',
},

title: {
  color: '#FFFFFF',
  fontSize: 28,
  lineHeight: 33,
  fontWeight: '900',
  letterSpacing: -0.5,
},

subtitle: {
  color: '#ECFDF5',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '800',
},

progressStrip: {
  backgroundColor: 'rgba(255,255,255,0.72)',
  borderRadius: 24,
  borderWidth: 1,
  borderColor: 'rgba(167,243,208,0.75)',
  padding: 12,
  marginBottom: 14,
  flexDirection: 'row',
  alignItems: 'center',
},

breathingCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 30,
  paddingVertical: 18,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#A7F3D0',
  alignItems: 'center',
  overflow: 'hidden',
},

circleWrap: {
  height: 205,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: -12,
  marginBottom: 6,
},

circleGlow: {
  position: 'absolute',
  width: 165,
  height: 165,
  borderRadius: 82,
  backgroundColor: 'rgba(16,185,129,0.14)',
},

breathCircle: {
  width: 148,
  height: 148,
  borderRadius: 74,
  backgroundColor: '#DCFCE7',
  borderWidth: 7,
  borderColor: '#86EFAC',
  alignItems: 'center',
  justifyContent: 'center',
},

innerCircle: {
  width: 114,
  height: 114,
  borderRadius: 57,
  backgroundColor: '#F0FDF4',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 6,
},

card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 15,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#D1FAE5',
},

levelButton: {
  flex: 1,
  height: 42,
  borderRadius: 15,
  backgroundColor: '#F8FAFC',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#CBD5E1',
},

  levelButtonSelected: {
    backgroundColor: '#047857',
    borderColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },

  levelText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#334155',
  },

  levelTextSelected: {
    color: '#FFFFFF',
  },

  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  labelSmall: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },


  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginRight: 8,
  },

  liveDotActive: {
    backgroundColor: '#10B981',
  },

  liveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#047857',
  },

phaseText: {
  fontSize: 16,
  fontWeight: '800',
  color: '#064E3B',
},

countText: {
  fontSize: 28,
  fontWeight: '900',
  color: '#047857',
},

coachText: {
  fontSize: 14,
  color: '#475569',
  textAlign: 'center',
  lineHeight: 21,
  marginBottom: 14,
  fontWeight: '700',
},

  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 19,
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonDisabled: {
    opacity: 0.55,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 6,
  },

  secondaryButton: {
  flex: 1,
  height: 52,
  borderRadius: 19,
  backgroundColor: '#F0FDF4',
  borderWidth: 1,
  borderColor: '#BBF7D0',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

  secondaryButtonText: {
    color: '#047857',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 6,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    width: '100%',
  },


  helpedButton: {
    height: 54,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  helpedButtonSelected: {
    backgroundColor: '#047857',
  },

  helpedText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#047857',
  },

  helpedTextSelected: {
    color: '#FFFFFF',
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },

  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 5,
  },

  resultText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '700',
  },

  nextToolCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },

  nextToolIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextToolTitle: {
    color: '#7C2D12',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  nextToolText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },

 tipCard: {
  backgroundColor: '#ECFDF5',
  borderRadius: 24,
  padding: 17,
  borderWidth: 1,
  borderColor: '#BBF7D0',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
},

  tipTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 6,
  },

  tipText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    fontWeight: '700',
  },

  backgroundBase: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: '#F7FFF9',
},

phaseLabelsRow: {
  width: '100%',
  flexDirection: 'row',
  gap: 8,
  marginTop: 0,
  marginBottom: 10,
},

phaseLabel: {
  flex: 1,
  minHeight: 38,
  borderRadius: 999,
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 6,
},

phaseLabelText: {
  color: '#64748B',
  fontSize: 12,
  fontWeight: '900',
  textAlign: 'center',
},

phaseLabelActive: {
  backgroundColor: '#047857',
  borderColor: '#047857',
},

phaseLabelTextActive: {
  color: '#FFFFFF',
},

buttonRow: {
  flexDirection: 'row',
  gap: 10,
  width: '100%',
  marginTop: 4,
},

roundsCard: {
  marginTop: 10,
  minHeight: 40,
  borderRadius: 15,
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
},

roundsText: {
  marginLeft: 6,
  color: '#064E3B',
  fontSize: 12,
  fontWeight: '900',
},
});
