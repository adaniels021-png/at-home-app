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

type PhraseCard = {
  id: string;
  phrase: string;
  icon: keyof typeof Ionicons.glyphMap;
  whenToUse: string;
  parentAction: string;
};

type CoachingPlan = {
  coach: string;
  say: string[];
  avoid: string[];
};

const situations: Situation[] = [
  { id: 'crying', title: 'Crying', icon: 'sad-outline' },
  { id: 'yelling', title: 'Yelling', icon: 'volume-high-outline' },
  { id: 'refusing', title: 'Refusing', icon: 'hand-left-outline' },
  { id: 'hiding', title: 'Hiding', icon: 'eye-off-outline' },
  { id: 'aggressive', title: 'Aggressive', icon: 'alert-circle-outline' },
  { id: 'overstimulated', title: 'Overstimulated', icon: 'flash-outline' },
  { id: 'transition', title: 'Transition hard', icon: 'swap-horizontal-outline' },
];

const behaviorPriority = [
  'aggressive',
  'overstimulated',
  'transition',
  'refusing',
  'hiding',
  'yelling',
  'crying',
];

const coachingBySituation: Record<string, CoachingPlan> = {
  crying: {
    coach: 'Use comfort language. Keep your voice low and avoid too many questions.',
    say: ['You are safe.', 'I am here.', 'Take your time.'],
    avoid: ['Stop crying.', 'You are okay.', 'What is wrong?'],
  },
  yelling: {
    coach: 'Lower your own voice. Use fewer words and avoid arguing back.',
    say: ['I hear you.', 'Quiet voice.', 'Break please.'],
    avoid: ['Stop yelling.', 'Lower your voice right now.', 'Do not talk like that.'],
  },
  refusing: {
    coach: 'Reduce pressure. Offer one small step and pause.',
    say: ['One small step.', 'Help please.', 'First this, then break.'],
    avoid: ['You have to.', 'Because I said so.', 'Repeating the demand quickly.'],
  },
  hiding: {
    coach: 'Stay nearby without crowding. Give time and reassurance.',
    say: ['I am here.', 'You are safe.', 'Take your time.'],
    avoid: ['Come out right now.', 'Why are you hiding?', 'Too many questions.'],
  },
  aggressive: {
    coach: 'Focus on safety first. Use very few words and give space.',
    say: ['Safe body.', 'I am here.', 'Break please.'],
    avoid: ['Yelling back.', 'Long explanations.', 'Too many directions.'],
  },
  overstimulated: {
    coach: 'Reduce talking and lower stimulation immediately.',
    say: ['Too loud.', 'Break please.', 'Lights off.'],
    avoid: ['More questions.', 'Extra choices.', 'More talking.'],
  },
  transition: {
    coach: 'Use short preview language and avoid rushing.',
    say: ['Almost done.', 'First this, then break.', 'Take your time.'],
    avoid: ['Hurry up.', 'We are leaving now.', 'Long explanations.'],
  },
};

const phraseCards: PhraseCard[] = [
  {
    id: 'safe',
    phrase: 'You are safe.',
    icon: 'shield-checkmark-outline',
    whenToUse: 'Use when your child seems scared or overwhelmed.',
    parentAction: 'Say once, then pause quietly for 5 seconds.',
  },
  {
    id: 'here',
    phrase: 'I am here.',
    icon: 'heart-outline',
    whenToUse: 'Use when your child needs reassurance.',
    parentAction: 'Stay nearby without over-talking.',
  },
  {
    id: 'break',
    phrase: 'Break please.',
    icon: 'pause-circle-outline',
    whenToUse: 'Use when your child needs space.',
    parentAction: 'Reduce demands and allow quiet time.',
  },
  {
    id: 'help',
    phrase: 'Help please.',
    icon: 'hand-left-outline',
    whenToUse: 'Use when your child seems stuck or frustrated.',
    parentAction: 'Offer one small support, not many instructions.',
  },
  {
    id: 'all-done',
    phrase: 'All done.',
    icon: 'checkmark-circle-outline',
    whenToUse: 'Use when an activity needs to end.',
    parentAction: 'Keep your tone calm and neutral.',
  },
  {
    id: 'wait',
    phrase: 'Take your time.',
    icon: 'hourglass-outline',
    whenToUse: 'Use when your child needs processing time.',
    parentAction: 'Pause before repeating directions.',
  },
  {
    id: 'too-loud',
    phrase: 'Too loud.',
    icon: 'volume-mute-outline',
    whenToUse: 'Use when sound or activity feels overwhelming.',
    parentAction: 'Reduce noise, lower stimulation, and pause.',
  },
  {
    id: 'first-then',
    phrase: 'First this, then break.',
    icon: 'swap-horizontal-outline',
    whenToUse: 'Use during transitions or refusal.',
    parentAction: 'Say it once, show the next step, then pause.',
  },
];

const recommendedPhrasesBySituation: Record<string, string[]> = {
  crying: ['safe', 'here', 'wait'],
  yelling: ['break', 'here', 'wait'],
  refusing: ['first-then', 'help', 'break'],
  hiding: ['here', 'safe', 'wait'],
  aggressive: ['break', 'here', 'safe'],
  overstimulated: ['too-loud', 'break', 'wait'],
  transition: ['first-then', 'wait', 'all-done'],
};

const toneTips = [
  'Use fewer words.',
  'Lower your voice.',
  'Pause after speaking.',
  'Avoid repeating directions quickly.',
  'Stand nearby without crowding.',
];

function uniqueList(items: string[]) {
  return Array.from(new Set(items));
}

export default function SimpleWordsScreen() {
  const router = useRouter();

  const [selectedSituationIds, setSelectedSituationIds] = useState<string[]>(['crying']);
  const [selectedPhrase, setSelectedPhrase] = useState<PhraseCard | null>(null);
  const [favoritePhrase, setFavoritePhrase] = useState<string | null>(null);
  const [helpfulStatus, setHelpfulStatus] = useState<'helpful' | 'not_helpful' | null>(null);

  const prioritySituationId = useMemo(() => {
    return (
      behaviorPriority.find((id) => selectedSituationIds.includes(id)) ||
      selectedSituationIds[0] ||
      'crying'
    );
  }, [selectedSituationIds]);

  const prioritySituation = useMemo(() => {
    return situations.find((item) => item.id === prioritySituationId);
  }, [prioritySituationId]);

  const selectedSituationTitles = useMemo(() => {
    return situations
      .filter((item) => selectedSituationIds.includes(item.id))
      .map((item) => item.title);
  }, [selectedSituationIds]);

  const coaching = useMemo(() => {
    return coachingBySituation[prioritySituationId] || coachingBySituation.crying;
  }, [prioritySituationId]);

  const secondaryCoaching = useMemo(() => {
    return selectedSituationIds
      .filter((id) => id !== prioritySituationId)
      .map((id) => {
        const situation = situations.find((item) => item.id === id);
        return {
          id,
          title: situation?.title || id,
          coach: coachingBySituation[id]?.coach || '',
        };
      });
  }, [prioritySituationId, selectedSituationIds]);

  const recommendedPhraseCards = useMemo(() => {
    const phraseIds = uniqueList(
      selectedSituationIds.flatMap((id) => recommendedPhrasesBySituation[id] || [])
    );

    return phraseCards.filter((card) => phraseIds.includes(card.id));
  }, [selectedSituationIds]);

  const otherPhraseCards = useMemo(() => {
    return phraseCards.filter(
      (card) => !recommendedPhraseCards.some((recommended) => recommended.id === card.id)
    );
  }, [recommendedPhraseCards]);

  function toggleSituation(id: string) {
    setSelectedSituationIds((prev) => {
      if (prev.includes(id)) {
        const updated = prev.filter((situationId) => situationId !== id);
        return updated.length > 0 ? updated : prev;
      }

      return [...prev, id];
    });

    setHelpfulStatus(null);
    setFavoritePhrase(null);
  }

  function saveFavoritePhrase() {
    if (!selectedPhrase) return;

    setFavoritePhrase(selectedPhrase.phrase);
    setHelpfulStatus('helpful');
  }

  function markNotHelpful() {
    setHelpfulStatus('not_helpful');
  }

  function resetTool() {
    setSelectedPhrase(null);
    setFavoritePhrase(null);
    setHelpfulStatus(null);
    setSelectedSituationIds(['crying']);
  }

  function renderPhraseCard(card: PhraseCard, recommended = false) {
    const selected = selectedPhrase?.id === card.id;

    return (
      <Pressable
        key={card.id}
        onPress={() => {
          setSelectedPhrase(card);
          setHelpfulStatus(null);
          setFavoritePhrase(null);
        }}
        style={[styles.phraseCard, selected && styles.phraseCardSelected]}
      >
        <View style={styles.phraseTopRow}>
          <View style={[styles.phraseIcon, selected && styles.phraseIconSelected]}>
            <Ionicons
              name={card.icon}
              size={22}
              color={selected ? '#FFFFFF' : '#BE123C'}
            />
          </View>

          {recommended && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>Recommended</Text>
            </View>
          )}
        </View>

        <Text style={[styles.phraseText, selected && styles.phraseTextSelected]}>
          {card.phrase}
        </Text>

        {selected && (
          <>
            <Text style={styles.whenText}>{card.whenToUse}</Text>

            <View style={styles.parentActionBox}>
              <Text style={styles.parentActionLabel}>Parent action</Text>
              <Text style={styles.parentActionText}>{card.parentAction}</Text>
            </View>
          </>
        )}
      </Pressable>
    );
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
            <Ionicons name="chatbubble-ellipses-outline" size={30} color="#BE123C" />
          </View>

          <Text style={styles.title}>Use Simple Words</Text>

          <Text style={styles.subtitle}>
            A parent coaching tool for calmer communication during dysregulation.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 1</Text>

          <Text style={styles.sectionTitle}>What is happening right now?</Text>

          <Text style={styles.helperText}>
            Select all behaviors you are seeing. The app will prioritize the most urgent one first.
          </Text>

          <View style={styles.situationGrid}>
            {situations.map((situation) => {
              const selected = selectedSituationIds.includes(situation.id);

              return (
                <Pressable
                  key={situation.id}
                  onPress={() => toggleSituation(situation.id)}
                  style={[styles.situationCard, selected && styles.situationCardSelected]}
                >
                  <Ionicons
                    name={situation.icon}
                    size={21}
                    color={selected ? '#FFFFFF' : '#BE123C'}
                  />

                  <Text
                    style={[
                      styles.situationText,
                      selected && styles.situationTextSelected,
                    ]}
                  >
                    {situation.title}
                  </Text>

                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={19}
                    color={selected ? '#FFFFFF' : '#BE123C'}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.selectedSummary}>
            <Text style={styles.selectedSummaryLabel}>Selected</Text>
            <Text style={styles.selectedSummaryText}>
              {selectedSituationTitles.join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.coachCard}>
          <Text style={styles.stepLabel}>Step 2</Text>

          <Text style={styles.sectionTitle}>Priority coaching plan</Text>

          <View style={styles.priorityBox}>
            <Text style={styles.priorityLabel}>Focus first</Text>
            <Text style={styles.priorityText}>{prioritySituation?.title}</Text>
          </View>

          <Text style={styles.coachText}>{coaching.coach}</Text>

          {secondaryCoaching.length > 0 && (
            <View style={styles.alsoWatchBox}>
              <Text style={styles.alsoWatchTitle}>Also watch for</Text>

              {secondaryCoaching.map((item) => (
                <Text key={item.id} style={styles.alsoWatchText}>
                  • {item.title}: {item.coach}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.coachColumns}>
            <View style={styles.coachColumn}>
              <Text style={styles.sayTitle}>Say this</Text>

              {coaching.say.map((phrase) => (
                <Text key={phrase} style={styles.goodPhrase}>
                  • {phrase}
                </Text>
              ))}
            </View>

            <View style={styles.coachColumn}>
              <Text style={styles.avoidTitle}>Avoid</Text>

              {coaching.avoid.map((phrase) => (
                <Text key={phrase} style={styles.avoidPhrase}>
                  • {phrase}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 3</Text>

          <Text style={styles.sectionTitle}>Voice and body reminders</Text>

          <Text style={styles.helperText}>
            How you say it matters as much as what you say.
          </Text>

          {toneTips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#BE123C" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.practiceCard}>
          <Text style={styles.stepLabel}>Step 4</Text>

          <Text style={styles.sectionTitle}>Recommended phrase cards</Text>

          <Text style={styles.helperText}>
            These are based on what you selected in Step 1.
          </Text>

          <View style={styles.phraseGrid}>
            {recommendedPhraseCards.map((card) => renderPhraseCard(card, true))}
          </View>

          <Text style={styles.otherPhraseTitle}>Other helpful phrases</Text>

          <View style={styles.phraseGrid}>
            {otherPhraseCards.map((card) => renderPhraseCard(card))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 5</Text>

          <Text style={styles.sectionTitle}>Did this phrase help?</Text>

          <Text style={styles.helperText}>
            Save helpful phrases for future quick access.
          </Text>

          <View style={styles.feedbackRow}>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                helpfulStatus === 'helpful' && styles.feedbackButtonHelpful,
                !selectedPhrase && styles.disabledButton,
              ]}
              disabled={!selectedPhrase}
              onPress={saveFavoritePhrase}
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
                !selectedPhrase && styles.disabledButton,
              ]}
              disabled={!selectedPhrase}
              onPress={markNotHelpful}
            >
              <Ionicons
                name="thumbs-down-outline"
                size={20}
                color={helpfulStatus === 'not_helpful' ? '#FFFFFF' : '#BE123C'}
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

          {favoritePhrase && (
            <View style={styles.savedBox}>
              <Ionicons name="bookmark-outline" size={18} color="#9F1239" />

              <View style={{ flex: 1 }}>
                <Text style={styles.savedTitle}>Saved to Quick Access</Text>
                <Text style={styles.savedText}>{favoritePhrase}</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetTool}>
          <Ionicons name="refresh-outline" size={18} color="#BE123C" />
          <Text style={styles.resetText}>Reset this tool</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF1F2',
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
    borderColor: '#FECDD3',
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#9F1239',
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
    borderColor: '#FFE4E6',
  },

  coachCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  practiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE4E6',
    color: '#BE123C',
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

  situationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  situationCard: {
    width: '48%',
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  situationCardSelected: {
    backgroundColor: '#BE123C',
    borderColor: '#BE123C',
  },

  situationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '900',
    color: '#9F1239',
  },

  situationTextSelected: {
    color: '#FFFFFF',
  },

  selectedSummary: {
    marginTop: 14,
    backgroundColor: '#FFF1F2',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  selectedSummaryLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BE123C',
    marginBottom: 4,
  },

  selectedSummaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9F1239',
    lineHeight: 20,
  },

  priorityBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 12,
  },

  priorityLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BE123C',
    marginBottom: 4,
  },

  priorityText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9F1239',
  },

  coachText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 14,
  },

  alsoWatchBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },

  alsoWatchTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#C2410C',
    marginBottom: 6,
  },

  alsoWatchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
    lineHeight: 19,
    marginBottom: 4,
  },

  coachColumns: {
    gap: 12,
  },

  coachColumn: {
    backgroundColor: '#FFF1F2',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  sayTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#15803D',
    marginBottom: 8,
  },

  avoidTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#BE123C',
    marginBottom: 8,
  },

  goodPhrase: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    lineHeight: 22,
  },

  avoidPhrase: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9F1239',
    lineHeight: 22,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },

  tipText: {
    flex: 1,
    marginLeft: 9,
    color: '#475569',
    fontWeight: '800',
    lineHeight: 20,
  },

  phraseGrid: {
    gap: 12,
  },

  phraseCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 22,
    padding: 15,
  },

  phraseCardSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#BE123C',
  },

  phraseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  phraseIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  phraseIconSelected: {
    backgroundColor: '#BE123C',
  },

  recommendedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#166534',
  },

  phraseText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#334155',
  },

  phraseTextSelected: {
    color: '#9F1239',
  },

  whenText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 19,
  },

  parentActionBox: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },

  parentActionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BE123C',
    marginBottom: 4,
  },

  parentActionText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 20,
  },

  otherPhraseTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#9F1239',
    marginTop: 18,
    marginBottom: 10,
  },

  feedbackRow: {
    gap: 10,
  },

  feedbackButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedbackButtonHelpful: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },

  feedbackButtonNotHelpful: {
    backgroundColor: '#BE123C',
    borderColor: '#BE123C',
  },

  feedbackButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#9F1239',
  },

  feedbackButtonTextActive: {
    color: '#FFFFFF',
  },

  disabledButton: {
    opacity: 0.45,
  },

  savedBox: {
    marginTop: 14,
    backgroundColor: '#FFF1F2',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  savedTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9F1239',
    marginLeft: 8,
  },

  savedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BE123C',
    marginTop: 4,
    marginLeft: 8,
  },

  resetButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '900',
    color: '#BE123C',
  },
});