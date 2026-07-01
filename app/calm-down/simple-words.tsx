import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Situation = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type CrisisPlan = {
  say: string[];
  doThis: string[];
  avoid: string[];
};

const situations: Situation[] = [
  { id: 'crying', title: 'Crying', icon: 'sad-outline' },
  { id: 'yelling', title: 'Yelling', icon: 'volume-high-outline' },
  { id: 'refusing', title: 'Refusing', icon: 'hand-left-outline' },
  { id: 'hiding', title: 'Hiding', icon: 'eye-off-outline' },
  { id: 'aggressive', title: 'Aggressive', icon: 'alert-circle-outline' },
  { id: 'overstimulated', title: 'Overstimulated', icon: 'flash-outline' },
  { id: 'transition', title: 'Transition', icon: 'swap-horizontal-outline' },
];

const situationImages: Record<string, any> = {
  crying: require('../../assets/images/simple-words-crying.png'),
  yelling: require('../../assets/images/simple-words-yelling.png'),
  refusing: require('../../assets/images/simple-words-refusing.png'),
  hiding: require('../../assets/images/simple-words-hiding.png'),
  aggressive: require('../../assets/images/simple-words-aggressive.png'),
  overstimulated: require('../../assets/images/simple-words-overstimulated.png'),
  transition: require('../../assets/images/simple-words-transition.png'),
};

const goals: Record<string, string> = {
  crying: 'Help your child feel safe before talking.',
  yelling: 'Lower intensity before solving the problem.',
  refusing: 'Reduce pressure and encourage one small success.',
  hiding: 'Create safety and allow regulation.',
  aggressive: 'Focus on safety and calm first.',
  overstimulated: 'Reduce sensory input and create relief.',
  transition: 'Make the next step feel predictable.',
};

const smartNotes: Record<string, string> = {
  crying: 'Start with safety words. Do not ask questions yet.',
  yelling: 'Match calm, not volume. Speak softer than your child.',
  refusing: 'Make the next step tiny. One choice is enough.',
  hiding: 'Give space while staying nearby and predictable.',
  aggressive: 'Safety first. Move items, reduce words, and stay calm.',
  overstimulated: 'Lower noise, light, touch, and talking first.',
  transition: 'Show what comes next. Keep it short and visual if possible.',
};

const plans: Record<string, CrisisPlan> = {
  crying: {
    say: ['You are safe.', 'I am here.', 'Take your time.'],
    doThis: ['Lower your voice.', 'Use fewer words.', 'Stay nearby.'],
    avoid: ['Stop crying.', 'What is wrong?', 'Too many questions.'],
  },
  yelling: {
    say: ['I hear you.', 'Quiet voice.', 'Break please.'],
    doThis: ['Lower your own voice.', 'Pause before talking.', 'Reduce demands.'],
    avoid: ['Stop yelling.', 'Arguing back.', 'Long explanations.'],
  },
  refusing: {
    say: ['One small step.', 'Help please.', 'First this, then break.'],
    doThis: ['Offer one choice.', 'Wait quietly.', 'Praise cooperation.'],
    avoid: ['You have to.', 'Because I said so.', 'Repeating directions fast.'],
  },
  hiding: {
    say: ['I am here.', 'You are safe.', 'Take your time.'],
    doThis: ['Give space.', 'Stay calm.', 'Wait without crowding.'],
    avoid: ['Come out now.', 'Why are you hiding?', 'Too much talking.'],
  },
  aggressive: {
    say: ['Safe body.', 'I am here.', 'Break please.'],
    doThis: ['Focus on safety.', 'Move unsafe items.', 'Use very few words.'],
    avoid: ['Yelling back.', 'Touching too quickly.', 'Long lectures.'],
  },
  overstimulated: {
    say: ['Too loud.', 'Break please.', 'Lights off.'],
    doThis: ['Lower noise.', 'Dim lights if possible.', 'Reduce talking.'],
    avoid: ['More choices.', 'Extra questions.', 'Busy spaces.'],
  },
  transition: {
    say: ['Almost done.', 'First this, then break.', 'Take your time.'],
    doThis: ['Show the next step.', 'Give a short warning.', 'Use first/then language.'],
    avoid: ['Hurry up.', 'Leaving suddenly.', 'Long explanations.'],
  },
};

export default function SimpleWordsScreen() {
  const router = useRouter();
  const [selectedSituation, setSelectedSituation] = useState('crying');
  const [highlightedPhrase, setHighlightedPhrase] = useState<string | null>(null);
  const [showDoThis, setShowDoThis] = useState(true);
  const [showAvoid, setShowAvoid] = useState(false);

  const currentPlan = useMemo(() => {
    return plans[selectedSituation] || plans.crying;
  }, [selectedSituation]);

  const selectedImage = useMemo(() => {
    return situationImages[selectedSituation] || situationImages.crying;
  }, [selectedSituation]);

  const selectedTitle =
    situations.find((item) => item.id === selectedSituation)?.title || 'Crying';

  function chooseSituation(id: string) {
    setSelectedSituation(id);
    setHighlightedPhrase(null);
    setShowDoThis(true);
    setShowAvoid(false);
  }

  function resetTool() {
    setSelectedSituation('crying');
    setHighlightedPhrase(null);
    setShowDoThis(true);
    setShowAvoid(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.bgOrbTop} />
      <View pointerEvents="none" style={styles.bgOrbBottom} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Calm Down Toolkit</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.headerImageFrame}>
  <Image
    source={selectedImage}
    style={styles.headerImage}
    resizeMode="cover"
  />
</View>

          <View style={styles.headerCopy}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#BE123C" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Calm scripts</Text>
              <Text style={styles.title}>Simple Words</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Pick what is happening and use short, calm words in the moment.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>What’s happening?</Text>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedTitle}</Text>
            </View>
          </View>

          <View style={styles.situationChipWrap}>
            {situations.map((situation) => {
              const selected = selectedSituation === situation.id;

              return (
                <Pressable
                  key={situation.id}
                  onPress={() => chooseSituation(situation.id)}
                  style={[styles.situationChip, selected && styles.situationChipSelected]}
                >
                  <Ionicons
                    name={situation.icon}
                    size={16}
                    color={selected ? '#FFFFFF' : '#BE123C'}
                  />

                  <Text
                    style={[
                      styles.situationChipText,
                      selected && styles.situationChipTextSelected,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {situation.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.focusLabel}>Focus now</Text>
          <Text style={styles.focusTitle}>{selectedTitle}</Text>

          <View style={styles.smartNoteCard}>
            <Ionicons name="bulb-outline" size={18} color="#6D28D9" />
            <Text style={styles.smartNoteText}>{smartNotes[selectedSituation]}</Text>
          </View>

          <View style={styles.goalCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#BE123C" />
            <Text style={styles.goalText}>{goals[selectedSituation]}</Text>
          </View>

          <View style={styles.sayCard}>
            <Text style={styles.goodTitle}>Say this now</Text>
            <Text style={styles.sayHelper}>Tap a phrase to focus on it.</Text>

            {currentPlan.say.map((item) => {
              const active = highlightedPhrase === item;

              return (
                <Pressable
                  key={item}
                  style={[styles.quoteBubble, active && styles.quoteBubbleActive]}
                  onPress={() => setHighlightedPhrase(active ? null : item)}
                >
                  <View style={[styles.quoteIcon, active && styles.quoteIconActive]}>
                    <Ionicons
                      name="chatbubble"
                      size={15}
                      color={active ? '#FFFFFF' : '#15803D'}
                    />
                  </View>

                  <Text style={[styles.quoteText, active && styles.quoteTextActive]}>
                    “{item}”
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <MiniSection
            title="Do this"
            icon="checkmark-circle-outline"
            color="#2563EB"
            open={showDoThis}
            onPress={() => setShowDoThis((current) => !current)}
          >
            {currentPlan.doThis.map((item) => (
              <ActionRow
                key={item}
                icon="checkmark-circle-outline"
                iconColor="#2563EB"
                text={item}
              />
            ))}
          </MiniSection>

          <MiniSection
            title="Avoid"
            icon="close-circle-outline"
            color="#BE123C"
            open={showAvoid}
            onPress={() => setShowAvoid((current) => !current)}
          >
            {currentPlan.avoid.map((item) => (
              <ActionRow
                key={item}
                icon="close-circle-outline"
                iconColor="#BE123C"
                text={item}
              />
            ))}
          </MiniSection>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetTool}>
          <Ionicons name="refresh-outline" size={17} color="#BE123C" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniSection({
  title,
  icon,
  color,
  open,
  onPress,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.miniSection}>
      <TouchableOpacity style={styles.miniSectionHeader} onPress={onPress}>
        <View style={styles.miniSectionTitleRow}>
          <Ionicons name={icon} size={18} color={color} />
          <Text style={[styles.miniSectionTitle, { color }]}>{title}</Text>
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#64748B"
        />
      </TouchableOpacity>

      {open ? <View style={styles.miniSectionBody}>{children}</View> : null}
    </View>
  );
}

function ActionRow({
  icon,
  iconColor,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF7F8',
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 42,
  },

  bgOrbTop: {
    position: 'absolute',
    top: -110,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(244, 114, 182, 0.12)',
  },

  bgOrbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -115,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124, 58, 237, 0.07)',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FECDD3',
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },

  headerImageFrame: {
    width: '100%',
    height: 210,
    borderRadius: 23,
    marginBottom: 13,
    backgroundColor: '#FFF1F2',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },

  headerCopy: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  eyebrow: {
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },

  subtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 10,
    lineHeight: 19,
    fontWeight: '700',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  selectedBadge: {
    backgroundColor: '#FFF1F2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  selectedBadgeText: {
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '900',
  },

  situationChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  situationChip: {
    minHeight: 40,
    maxWidth: '100%',
    borderRadius: 999,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  situationChipSelected: {
    backgroundColor: '#BE123C',
    borderColor: '#BE123C',
  },

  situationChipText: {
    marginLeft: 6,
    fontSize: 12.5,
    fontWeight: '900',
    color: '#9F1239',
  },

  situationChipTextSelected: {
    color: '#FFFFFF',
  },

  planCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 28,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  focusLabel: {
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },

  focusTitle: {
    color: '#0F172A',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 11,
  },

  smartNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 17,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  smartNoteText: {
    flex: 1,
    marginLeft: 8,
    color: '#5B21B6',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },

  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 17,
    padding: 12,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  goalText: {
    flex: 1,
    marginLeft: 8,
    color: '#9F1239',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  sayCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 21,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 11,
  },

  goodTitle: {
    color: '#15803D',
    fontSize: 18,
    fontWeight: '900',
  },

  sayHelper: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },

  quoteBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  quoteBubbleActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },

  quoteIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  quoteIconActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  quoteText: {
    flex: 1,
    color: '#166534',
    fontSize: 15.5,
    fontWeight: '900',
    lineHeight: 21,
  },

  quoteTextActive: {
    color: '#FFFFFF',
  },

  miniSection: {
    backgroundColor: '#FFF7F8',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginTop: 10,
    overflow: 'hidden',
  },

  miniSectionHeader: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  miniSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  miniSectionTitle: {
    marginLeft: 7,
    fontSize: 15,
    fontWeight: '900',
  },

  miniSectionBody: {
    paddingHorizontal: 13,
    paddingBottom: 11,
    gap: 7,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowText: {
    flex: 1,
    marginLeft: 8,
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 19,
  },

  resetButton: {
    height: 46,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetText: {
    marginLeft: 7,
    fontSize: 13.5,
    fontWeight: '900',
    color: '#BE123C',
  },
});

