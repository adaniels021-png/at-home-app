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

  const resultMessage = useMemo(() => {
    if (!beforeCalm || !afterCalm) return '';

    if (afterCalm > beforeCalm) {
      return 'Great job. Your child seems more calm than before. This may be a helpful strategy to try again.';
    }

    if (afterCalm === beforeCalm) {
      return 'Good effort. Calm strategies can take practice. Try another round or switch to a quiet space.';
    }

    return 'That is okay. This strategy may not be the best fit right now. Try Sensory Reset or Quiet Space next.';
  }, [beforeCalm, afterCalm]);

  useEffect(() => {
    if (!isRunning) return;

    if (count > 1) {
      timerRef.current = setTimeout(() => {
        setCount((prev) => prev - 1);
      }, 1000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    timerRef.current = setTimeout(() => {
      moveToNextPhase();
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

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    circleAnim.stopAnimation();

    Animated.timing(circleAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  function handleCirclePress() {
    if (isRunning) {
      stopBreathing();
    } else {
      startBreathing();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color="#0F172A"
          />

          <Text style={styles.backText}>
            Calm Down Toolkit
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.headerGlow} />

          <View style={styles.iconCircle}>
            <Ionicons
              name="leaf-outline"
              size={30}
              color="#047857"
            />
          </View>

          <Text style={styles.title}>
            Breathe Together
          </Text>

          <Text style={styles.subtitle}>
            Sit close, keep your voice soft, and breathe slowly together.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Before calm level
          </Text>

          <Text style={styles.helperText}>
            How calm does your child seem right now?
          </Text>

          <View style={styles.levelRow}>
            {calmLevels.map((level) => (
              <Pressable
                key={level}
                onPress={() => setBeforeCalm(level)}
                style={[
                  styles.levelButton,
                  beforeCalm === level &&
                    styles.levelButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.levelText,
                    beforeCalm === level &&
                      styles.levelTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.levelLabels}>
            <Text style={styles.labelSmall}>
              Not calm
            </Text>

            <Text style={styles.labelSmall}>
              Very calm
            </Text>
          </View>
        </View>

        <View style={styles.breathingCard}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              Guided Regulation
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            Guided breathing
          </Text>

          <Pressable
            style={styles.circleWrap}
            onPress={handleCirclePress}
          >
            <Animated.View
              style={[
                styles.breathCircle,
                {
                  transform: [
                    { scale: circleAnim },
                  ],
                },
              ]}
            >
              <View style={styles.innerCircle}>
                <Text style={styles.phaseText}>
                  {phase}
                </Text>

                <Text style={styles.countText}>
                  {isRunning
                    ? count
                    : 'Tap start'}
                </Text>
              </View>
            </Animated.View>
          </Pressable>

          <Text style={styles.coachText}>
            {phase === 'Ready'
              ? 'Tap the circle or press Start when you are ready.'
              : phase === 'Breathe in'
                ? 'Slowly breathe in through your nose.'
                : phase === 'Hold'
                  ? 'Pause softly. No pressure.'
                  : 'Slowly breathe out like you are blowing bubbles.'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startBreathing}
            >
              <Ionicons
                name="play"
                size={18}
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonText}>
                Start
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={stopBreathing}
            >
              <Ionicons
                name="stop"
                size={18}
                color="#047857"
              />

              <Text style={styles.secondaryButtonText}>
                Stop
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {cycles}
              </Text>

              <Text style={styles.statLabel}>
                Completed rounds
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {phase}
              </Text>

              <Text style={styles.statLabel}>
                Current phase
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            After calm level
          </Text>

          <Text style={styles.helperText}>
            How calm does your child seem after trying this?
          </Text>

          <View style={styles.levelRow}>
            {calmLevels.map((level) => (
              <Pressable
                key={level}
                onPress={() => setAfterCalm(level)}
                style={[
                  styles.levelButton,
                  afterCalm === level &&
                    styles.levelButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.levelText,
                    afterCalm === level &&
                      styles.levelTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.helpedButton,
              helped &&
                styles.helpedButtonSelected,
            ]}
            onPress={() => setHelped(!helped)}
          >
            <Ionicons
              name={
                helped
                  ? 'heart'
                  : 'heart-outline'
              }
              size={20}
              color={
                helped
                  ? '#FFFFFF'
                  : '#047857'
              }
            />

            <Text
              style={[
                styles.helpedText,
                helped &&
                  styles.helpedTextSelected,
              ]}
            >
              This helped
            </Text>
          </TouchableOpacity>
        </View>

        {!!resultMessage && (
          <View style={styles.resultCard}>
            <View style={styles.resultIconWrap}>
              <Ionicons
                name="sparkles-outline"
                size={24}
                color="#047857"
              />
            </View>

            <Text style={styles.resultTitle}>
              Personal result
            </Text>

            <Text style={styles.resultText}>
              {resultMessage}
            </Text>

            {helped && (
              <View style={styles.successBox}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#047857"
                />

                <Text style={styles.savedText}>
                  Marked as helpful. This can become one of your go-to calming tools.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>
            Parent tip
          </Text>

          <Text style={styles.tipText}>
            Do not force eye contact or perfect breathing. The goal is connection,
            safety, and slowing the moment down.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
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
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    overflow: 'hidden',
  },

  headerGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#DCFCE7',
    opacity: 0.55,
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },

  breathingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 22,
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
    backgroundColor: '#10B981',
    marginRight: 8,
  },

  liveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#047857',
  },

  sectionTitle: {
    fontSize: 20,
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

  circleWrap: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    width: '100%',
  },

  breathCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#DCFCE7',
    borderWidth: 8,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },

  innerCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
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
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
    marginTop: 4,
  },

  coachText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
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
    marginTop: 18,
    width: '100%',
  },

  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
  },

  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
  },

  helpedButton: {
    marginTop: 16,
    height: 54,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },

  resultIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 8,
  },

  resultText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '700',
  },

  successBox: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  savedText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
    lineHeight: 19,
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