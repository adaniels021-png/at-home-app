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
  View,
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

  const currentPlan = useMemo(() => {
    return plans[selectedSituation] || plans.crying;
  }, [selectedSituation]);

  const selectedImage = useMemo(() => {
    return situationImages[selectedSituation] || situationImages.crying;
  }, [selectedSituation]);

  const selectedTitle =
    situations.find((item) => item.id === selectedSituation)?.title || 'Crying';

  function resetTool() {
    setSelectedSituation('crying');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Calm Down Toolkit</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Image
  source={selectedImage}
  style={styles.headerImage}
  resizeMode="cover"
/>

          <Text style={styles.title}>What To Say</Text>

          <Text style={styles.subtitle}>
            Quick scripts for stressful moments. Pick what is happening and use short, calm words.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What’s happening?</Text>

          <View style={styles.situationGrid}>
            {situations.map((situation) => {
              const selected = selectedSituation === situation.id;

              return (
                <Pressable
                  key={situation.id}
                  onPress={() => setSelectedSituation(situation.id)}
                  style={[styles.situationCard, selected && styles.situationCardSelected]}
                >
                  <Ionicons
                    name={situation.icon}
                    size={20}
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
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.focusLabel}>Focus now</Text>
          <Text style={styles.focusTitle}>{selectedTitle}</Text>

          <View style={styles.goalCard}>
            <Ionicons name="bulb-outline" size={18} color="#7C3AED" />
            <Text style={styles.goalText}>{goals[selectedSituation]}</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.goodTitle}>Say this</Text>

            {currentPlan.say.map((item) => (
              <View key={item} style={styles.quoteBubble}>
                <Ionicons name="chatbubble" size={18} color="#15803D" />
                <Text style={styles.quoteText}>“{item}”</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.doTitle}>Do this</Text>

            {currentPlan.doThis.map((item) => (
              <View key={item} style={styles.row}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#2563EB" />
                <Text style={styles.rowText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.avoidTitle}>Avoid</Text>

            {currentPlan.avoid.map((item) => (
              <View key={item} style={styles.row}>
                <Ionicons name="close-circle-outline" size={20} color="#BE123C" />
                <Text style={styles.rowText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetTool}>
          <Ionicons name="refresh-outline" size={18} color="#BE123C" />
          <Text style={styles.resetText}>Reset</Text>
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
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 4,
  },
 headerCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  padding: 18,
  alignItems: 'center',
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#FECDD3',
},
  headerImage: {
  width: '100%',
  height: 210,
  borderRadius: 24,
  marginBottom: 16,
  backgroundColor: '#F8FAFC',
},
  title: {
    fontSize: 30,
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
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
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
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  focusLabel: {
    color: '#BE123C',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  focusTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  goalText: {
    flex: 1,
    marginLeft: 8,
    color: '#5B21B6',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  sectionBlock: {
    backgroundColor: '#FFF1F2',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 13,
  },
  goodTitle: {
    color: '#15803D',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  doTitle: {
    color: '#2563EB',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  avoidTitle: {
    color: '#BE123C',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  quoteBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteText: {
    flex: 1,
    marginLeft: 9,
    color: '#166534',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  rowText: {
    flex: 1,
    marginLeft: 9,
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  resetButton: {
    height: 52,
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