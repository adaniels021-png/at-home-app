import { saveCalmToolkitLog } from '@/lib/calmToolkitInsights';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

export default function BreatheTogetherScreen() {
  const router = useRouter();

  const circleAnim = useRef(new Animated.Value(1)).current;
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

    return 'That is okay. This may not be the right strategy for this moment. Try Quiet Space or Sensory Reset next.';
  }, [beforeCalm, afterCalm]);

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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Calm Down Toolkit</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlowOne} />
          <View pointerEvents="none" style={styles.heroGlowTwo} />

          <View style={styles.heroTopRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="leaf-outline" size={30} color="#FFFFFF" />
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>CO-REGULATION</Text>
            </View>
          </View>

          <Text style={styles.title}>Breathe Together</Text>

          <Text style={styles.subtitle}>
            Slow your body first. Your calm voice, slower breathing, and steady presence can help your child feel safer.
          </Text>
        </View>

        <View style={styles.scriptCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#047857" />

          <View style={{ flex: 1 }}>
            <Text style={styles.scriptTitle}>Parent script</Text>
            <Text style={styles.scriptText}>
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

          <Pressable style={styles.circleWrap} onPress={isRunning ? stopBreathing : startBreathing}>
            <Animated.View style={[styles.breathCircle, { transform: [{ scale: circleAnim }] }]}>
              <View style={styles.innerCircle}>
                <Text style={styles.phaseText}>{phase}</Text>
                <Text style={styles.countText}>{isRunning ? count : 'Start'}</Text>
              </View>
            </Animated.View>
          </Pressable>

          <Text style={styles.coachText}>{coachText}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
  style={styles.primaryButton}
  onPress={startBreathing}
  disabled={isRunning}
>
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Start</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={stopBreathing}>
              <Ionicons name="stop" size={18} color="#047857" />
              <Text style={styles.secondaryButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{cycles}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{phase}</Text>
              <Text style={styles.statLabel}>Current step</Text>
            </View>
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
          onPress={async () => {
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
      }}
        >
          <Ionicons name={helped ? 'heart' : 'heart-outline'} size={20} color={helped ? '#FFFFFF' : '#047857'} />
          <Text style={[styles.helpedText, helped && styles.helpedTextSelected]}>
            This helped
          </Text>
        </TouchableOpacity>

        {!!resultMessage && (
          <View style={styles.resultCard}>
            <Ionicons name="sparkles-outline" size={24} color="#047857" />
            <Text style={styles.resultTitle}>Personal result</Text>
            <Text style={styles.resultText}>{resultMessage}</Text>
          </View>
        )}

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Parent tip</Text>
          <Text style={styles.tipText}>
            Do not force perfect breathing, eye contact, or talking. The goal is safety, connection, and slowing the moment down.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
      <Text style={styles.sectionTitle}>{title}</Text>
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
  safe: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 20, paddingBottom: 42 },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  backText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 4,
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#047857',
    borderRadius: 30,
    padding: 22,
    marginBottom: 14,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -90,
    right: -70,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(187,247,208,0.22)',
    bottom: -80,
    left: -55,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },

  subtitle: {
    color: '#D1FAE5',
    marginTop: 9,
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '700',
  },

  scriptCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    gap: 12,
  },

  scriptTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064E3B',
  },

  scriptText: {
    marginTop: 4,
    color: '#047857',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '800',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  levelRow: {
    flexDirection: 'row',
    gap: 8,
  },

  levelButton: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  levelButtonSelected: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },

  levelText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#334155',
  },

  levelTextSelected: {
    color: '#FFFFFF',
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

  breathingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
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

  circleWrap: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  breathCircle: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#DCFCE7',
    borderWidth: 8,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  innerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  phaseText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'center',
  },

  countText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#047857',
    marginTop: 4,
  },

  coachText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    fontWeight: '700',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },

  primaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 6,
  },

  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#86EFAC',
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
    gap: 12,
    marginTop: 16,
    width: '100%',
  },

  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },

  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 4,
    textAlign: 'center',
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
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
    marginBottom: 16,
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
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  resultTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#064E3B',
    marginTop: 10,
    marginBottom: 6,
  },

  resultText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '700',
  },

  tipCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
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
});