import { upsertParentJournalEntry } from '@/lib/parentJournalStorage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MoodOption = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type PromptOption = {
  id: string;
  title: string;
  prompt: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const stressLevels = [1, 2, 3, 4, 5];

const moodOptions: MoodOption[] = [
  { id: 'overwhelmed', title: 'Overwhelmed', icon: 'pulse-outline' },
  { id: 'tired', title: 'Tired', icon: 'battery-dead-outline' },
  { id: 'hopeful', title: 'Hopeful', icon: 'sunny-outline' },
  { id: 'frustrated', title: 'Frustrated', icon: 'thunderstorm-outline' },
  { id: 'proud', title: 'Proud', icon: 'sparkles-outline' },
  { id: 'numb', title: 'Shut down', icon: 'remove-circle-outline' },
];

const promptOptions: PromptOption[] = [
  {
    id: 'hardest',
    title: 'Hardest part',
    prompt: 'The hardest part today was...',
    icon: 'rainy-outline',
  },
  {
    id: 'win',
    title: 'Small win',
    prompt: 'One small win today was...',
    icon: 'trophy-outline',
  },
  {
    id: 'worked',
    title: 'What helped',
    prompt: 'Something that helped today was...',
    icon: 'checkmark-circle-outline',
  },
  {
    id: 'need',
    title: 'What I need',
    prompt: 'Right now, I need...',
    icon: 'heart-outline',
  },
];

export default function ParentJournalScreen() {
  const router = useRouter();

  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [selectedMoodIds, setSelectedMoodIds] = useState<string[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('hardest');
  const [entryText, setEntryText] = useState('');
  const [savedEntry, setSavedEntry] = useState(false);

  const selectedPrompt = useMemo(() => {
    return (
      promptOptions.find((prompt) => prompt.id === selectedPromptId) ||
      promptOptions[0]
    );
  }, [selectedPromptId]);

  const selectedMoodsText = useMemo(() => {
    const selected = moodOptions.filter((mood) =>
      selectedMoodIds.includes(mood.id)
    );

    if (selected.length === 0) return 'No feeling selected yet.';

    return selected.map((mood) => mood.title).join(', ');
  }, [selectedMoodIds]);

  function toggleMood(id: string) {
    setSavedEntry(false);

    setSelectedMoodIds((prev) =>
      prev.includes(id)
        ? prev.filter((moodId) => moodId !== id)
        : [...prev, id]
    );
  }

 async function saveJournalEntry() {
  if (!stressLevel && selectedMoodIds.length === 0 && !entryText.trim()) {
    return;
  }

  const selectedMoodTitles = moodOptions
    .filter((mood) => selectedMoodIds.includes(mood.id))
    .map((mood) => mood.title);

  await upsertParentJournalEntry({
    text: entryText.trim() || selectedPrompt.prompt,
    promptTitle: selectedPrompt.title,
    promptText: selectedPrompt.prompt,
    moods: selectedMoodTitles,
    stressLevel,
  });

  setSavedEntry(true);

  setTimeout(() => {
    router.replace('/parent-support/journal-history');
  }, 700);
}

  function resetJournal() {
    setStressLevel(null);
    setSelectedMoodIds([]);
    setSelectedPromptId('hardest');
    setEntryText('');
    setSavedEntry(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Parent Support</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="journal-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Parent Journal</Text>

          <Text style={styles.heroText}>
            A quick check-in space for short reflections, small wins, and hard
            moments. Keep it simple.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 1</Text>
          <Text style={styles.sectionTitle}>Stress level today</Text>
          <Text style={styles.helperText}>
             You can type or use your keyboard microphone to talk-to-text.
              This space is for honest check-ins, hard days, small wins, and emotional resets.
              </Text>

          <View style={styles.levelRow}>
            {stressLevels.map((level) => (
              <Pressable
                key={level}
                onPress={() => {
                  setStressLevel(level);
                  setSavedEntry(false);
                }}
                style={[
                  styles.levelButton,
                  stressLevel === level && styles.levelButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.levelText,
                    stressLevel === level && styles.levelTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.levelLabels}>
            <Text style={styles.labelSmall}>Low stress</Text>
            <Text style={styles.labelSmall}>High stress</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 2</Text>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <Text style={styles.helperText}>
            Select anything that fits. More than one is okay.
          </Text>

          <View style={styles.moodGrid}>
            {moodOptions.map((mood) => {
              const selected = selectedMoodIds.includes(mood.id);

              return (
                <Pressable
                  key={mood.id}
                  onPress={() => toggleMood(mood.id)}
                  style={[styles.moodCard, selected && styles.moodCardSelected]}
                >
                  <Ionicons
                    name={mood.icon}
                    size={20}
                    color={selected ? '#FFFFFF' : '#0F766E'}
                  />

                  <Text
                    style={[
                      styles.moodText,
                      selected && styles.moodTextSelected,
                    ]}
                  >
                    {mood.title}
                  </Text>

                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={18}
                    color={selected ? '#FFFFFF' : '#0F766E'}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 3</Text>
          <Text style={styles.sectionTitle}>Choose a quick prompt</Text>
          <Text style={styles.helperText}>
            Pick one prompt, then type a short note. You can also use your
            keyboard microphone for talk-to-text.
          </Text>

          <View style={styles.promptList}>
            {promptOptions.map((prompt) => {
              const selected = selectedPromptId === prompt.id;

              return (
                <Pressable
                  key={prompt.id}
                  onPress={() => {
                    setSelectedPromptId(prompt.id);
                    setSavedEntry(false);
                  }}
                  style={[
                    styles.promptCard,
                    selected && styles.promptCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.promptIcon,
                      selected && styles.promptIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={prompt.icon}
                      size={20}
                      color={selected ? '#FFFFFF' : '#0F766E'}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.promptTitle,
                        selected && styles.promptTitleSelected,
                      ]}
                    >
                      {prompt.title}
                    </Text>

                    <Text style={styles.promptText}>{prompt.prompt}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.writeCard}>
          <Text style={styles.stepLabel}>Step 4</Text>
          <Text style={styles.sectionTitle}>Short journal entry</Text>

          <View style={styles.voiceTipBox}>
            <Ionicons name="mic-outline" size={20} color="#0F766E" />

            <Text style={styles.voiceTipText}>
              To talk instead of type, tap inside the box and use the microphone
              on your keyboard.
            </Text>
          </View>

          <Text style={styles.promptStarter}>{selectedPrompt.prompt}</Text>

          <TextInput
            style={styles.textInput}
            multiline
            textAlignVertical="top"
            placeholder="Write one or two sentences..."
            placeholderTextColor="#94A3B8"
            value={entryText}
            onChangeText={(text) => {
              setEntryText(text);
              setSavedEntry(false);
            }}
          />

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Today’s check-in</Text>
            <Text style={styles.summaryText}>
              Stress: {stressLevel || 'Not selected'} • Feelings:{' '}
              {selectedMoodsText}
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveJournalEntry}>
            <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save journal check-in</Text>
          </TouchableOpacity>

          {savedEntry && (
            <View style={styles.savedBox}>
              <Ionicons name="checkmark-circle" size={20} color="#0F766E" />

              <View style={{ flex: 1 }}>
                <Text style={styles.savedTitle}>Saved</Text>
                <Text style={styles.savedText}>
                  Your check-in was saved for reflection.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.reminderCard}>
          <Ionicons name="heart-outline" size={22} color="#0F766E" />

          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Keep it short</Text>
            <Text style={styles.reminderText}>
              This journal is not meant to be another task. Even one sentence
              counts.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetJournal}>
          <Ionicons name="refresh-outline" size={18} color="#0F766E" />
          <Text style={styles.resetText}>Reset journal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ECFDF5',
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
    marginLeft: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#0F766E',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
  },

  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -70,
    right: -55,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#CCFBF1',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  writeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },

  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    color: '#0F766E',
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
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 14,
  },

  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
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

  moodGrid: {
    gap: 10,
  },

  moodCard: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  moodCardSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },

  moodText: {
    flex: 1,
    marginLeft: 10,
    color: '#0F766E',
    fontWeight: '900',
    fontSize: 14,
  },

  moodTextSelected: {
    color: '#FFFFFF',
  },

  promptList: {
    gap: 10,
  },

  promptCard: {
    minHeight: 70,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  promptCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#0F766E',
  },

  promptIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  promptIconSelected: {
    backgroundColor: '#0F766E',
  },

  promptTitle: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  promptTitleSelected: {
    color: '#0F766E',
  },

  promptText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  voiceTipBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  voiceTipText: {
    flex: 1,
    marginLeft: 9,
    color: '#0F766E',
    fontWeight: '800',
    lineHeight: 20,
  },

  promptStarter: {
    color: '#0F766E',
    fontWeight: '900',
    marginBottom: 8,
  },

  textInput: {
    minHeight: 130,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },

  summaryBox: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  summaryLabel: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },

  summaryText: {
    color: '#115E59',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },

  saveButton: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#0F766E',
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

  savedBox: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  savedTitle: {
    marginLeft: 8,
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '900',
  },

  savedText: {
    marginLeft: 8,
    marginTop: 3,
    color: '#115E59',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  reminderTitle: {
    marginLeft: 10,
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '900',
  },

  reminderText: {
    marginLeft: 10,
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  resetButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetText: {
    marginLeft: 8,
    color: '#0F766E',
    fontWeight: '900',
    fontSize: 14,
  },
});