import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Problem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
  steps: string[];
  sayThis: string[];
  avoid: string[];
};

const problems: Problem[] = [
  {
    id: 'refuses_bathroom',
    title: 'Refuses Bathroom',
    subtitle: 'Cries, runs away, or avoids going near the bathroom.',
    icon: 'walk-outline',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    steps: [
      'Pause potty demands for now. Start with bathroom comfort only.',
      'Walk to the bathroom, stand near it, then leave before distress increases.',
      'Repeat short visits several times a day with no sitting required.',
      'Once bathroom entry is calm, add a 5–10 second sit.',
    ],
    sayThis: [
      'First bathroom, then all done.',
      'You are safe.',
      'Just look, then we leave.',
    ],
    avoid: [
      'Do not force sitting.',
      'Do not keep your child in the bathroom while upset.',
      'Avoid long explanations during distress.',
    ],
  },
  {
    id: 'wont_sit',
    title: 'Won’t Sit',
    subtitle: 'Child enters bathroom but refuses the toilet or potty seat.',
    icon: 'body-outline',
    color: '#7C3AED',
    bg: '#FAF5FF',
    border: '#E9D5FF',
    steps: [
      'Start with sitting fully clothed for 5 seconds.',
      'Use a timer or count down: “5, 4, 3, 2, 1, all done.”',
      'Praise sitting, even if nothing happens.',
      'Slowly increase sitting time only when your child is calm.',
    ],
    sayThis: [
      'Sit, then all done.',
      'Good sitting.',
      'Feet down. Body calm.',
    ],
    avoid: [
      'Avoid making the sit too long at first.',
      'Avoid restarting the timer if your child is distressed.',
      'Avoid turning potty practice into a power struggle.',
    ],
  },
  {
    id: 'fear_flushing',
    title: 'Fear of Flushing',
    subtitle: 'Covers ears, cries, or runs away when toilet flushes.',
    icon: 'water-outline',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    steps: [
      'Do not require flushing right away.',
      'Let your child leave the bathroom before flushing.',
      'Practice flushing when your child is far away, then slowly move closer over time.',
      'Offer headphones or allow ear covering.',
    ],
    sayThis: [
      'Flush is loud. You can cover ears.',
      'You can stand back.',
      'Flush, then all done.',
    ],
    avoid: [
      'Do not surprise flush.',
      'Do not force your child to stay near the toilet.',
      'Avoid saying “it’s not scary” if they are scared.',
    ],
  },
  {
    id: 'accidents',
    title: 'Frequent Accidents',
    subtitle: 'Accidents happen often or shortly after sitting.',
    icon: 'alert-circle-outline',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    steps: [
      'Increase scheduled sits for a short period.',
      'Try sitting 10–20 minutes after drinks or meals.',
      'Keep accidents neutral and calm.',
      'Log the time so patterns can become clearer.',
    ],
    sayThis: [
      'Accident. Bathroom next.',
      'Clean up, then all done.',
      'We try again later.',
    ],
    avoid: [
      'Avoid punishment or shame.',
      'Avoid big emotional reactions.',
      'Avoid making clean-up feel like a long lecture.',
    ],
  },
  {
    id: 'nonverbal',
    title: 'Nonverbal Communication',
    subtitle: 'Child does not use words to ask for the bathroom.',
    icon: 'chatbubbles-outline',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    steps: [
      'Choose one simple bathroom signal: picture card, sign, pointing, AAC, or gesture.',
      'Show the signal before every potty routine.',
      'Help your child touch, point to, or hand you the bathroom card.',
      'Immediately honor the communication by going to the bathroom.',
    ],
    sayThis: [
      'Bathroom.',
      'Show me bathroom.',
      'You told me. Let’s go.',
    ],
    avoid: [
      'Do not require spoken words.',
      'Do not ignore gestures or body language.',
      'Avoid using too many different communication prompts at once.',
    ],
  },
  {
    id: 'regression',
    title: 'Regression',
    subtitle: 'Child was doing well but started having more accidents.',
    icon: 'refresh-outline',
    color: '#7C3AED',
    bg: '#FAF5FF',
    border: '#E9D5FF',
    steps: [
      'Return to the last step that worked.',
      'Use more scheduled sits temporarily.',
      'Check for routine changes, illness, stress, constipation, or new environments.',
      'Praise effort and rebuild confidence slowly.',
    ],
    sayThis: [
      'We are practicing again.',
      'You can try.',
      'Small steps count.',
    ],
    avoid: [
      'Avoid saying “you know better.”',
      'Avoid removing support too quickly.',
      'Avoid comparing your child to previous progress.',
    ],
  },
];

export default function PottyProblemSolverScreen() {
  const router = useRouter();
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowMiddle} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Problem Solver</Text>
            <Text style={styles.subtitle}>Autism-friendly potty support for hard moments.</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="bulb-outline" size={30} color="#D97706" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>PARENT COACH</Text>
            <Text style={styles.heroTitle}>Choose what’s happening</Text>
            <Text style={styles.heroText}>
              Get simple steps, short scripts, and what to avoid.
            </Text>
          </View>
        </View>

        <View style={styles.problemList}>
          {problems.map((problem) => (
            <TouchableOpacity
              key={problem.id}
              style={[
                styles.problemCard,
                { backgroundColor: problem.bg, borderColor: problem.border },
              ]}
              onPress={() => setSelectedProblem(problem)}
              activeOpacity={0.9}
            >
              <View style={styles.problemIcon}>
                <Ionicons name={problem.icon} size={24} color={problem.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.problemTitle}>{problem.title}</Text>
                <Text style={styles.problemSubtitle}>{problem.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={problem.color} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selectedProblem} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedProblem(null)}>
          <Pressable style={styles.modalCard}>
            {selectedProblem ? (
              <>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <View style={styles.modalIcon}>
                    <Ionicons
                      name={selectedProblem.icon}
                      size={26}
                      color={selectedProblem.color}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedProblem.title}</Text>
                    <Text style={styles.modalSubtitle}>{selectedProblem.subtitle}</Text>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalSectionTitle}>Try This</Text>

                  {selectedProblem.steps.map((step, index) => (
                    <View key={step} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}

                  <Text style={styles.modalSectionTitle}>Say This</Text>

                  {selectedProblem.sayThis.map((script) => (
                    <View key={script} style={styles.scriptBubble}>
                      <Text style={styles.scriptText}>“{script}”</Text>
                    </View>
                  ))}

                  <Text style={styles.modalSectionTitle}>Avoid</Text>

                  {selectedProblem.avoid.map((item) => (
                    <View key={item} style={styles.avoidRow}>
                      <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                      <Text style={styles.avoidText}>{item}</Text>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setSelectedProblem(null)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 20, paddingBottom: 48 },

  screenGlowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(245,158,11,0.08)',
    top: -130,
    right: -90,
  },
  screenGlowMiddle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(124,58,237,0.05)',
    top: 370,
    left: -140,
  },
  screenGlowBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(37,99,235,0.05)',
    bottom: -140,
    right: -130,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFBEB',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  heroGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(217,119,6,0.10)',
    right: -55,
    top: -60,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroTitle: {
    color: '#92400E',
    fontSize: 23,
    fontWeight: '900',
  },
  heroText: {
    color: '#78350F',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  problemList: { gap: 12 },
  problemCard: {
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  problemIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },
  problemSubtitle: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '86%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },
  modalSectionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  scriptBubble: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  scriptText: {
    color: '#1E3A8A',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  avoidRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  avoidText: {
    flex: 1,
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  doneButton: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});