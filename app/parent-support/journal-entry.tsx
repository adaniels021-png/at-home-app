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

    if (selected.length === 0) return 'No feeling selected yet';

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
      <View style={styles.backgroundWash} />

      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobBottomRight} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.backText}>Parent Support</Text>
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="journal-outline" size={27} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Quick Check-In</Text>
            <Text style={styles.introText}>One sentence is enough.</Text>
          </View>
        </View>

        <View style={styles.writeCard}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepLabel}>Step 1</Text>
            <Text style={styles.sectionTitle}>Short journal entry</Text>
          </View>

          <View style={styles.promptStarterBox}>
            <Ionicons name={selectedPrompt.icon} size={20} color="#DB2777" />
            <Text style={styles.promptStarter}>{selectedPrompt.prompt}</Text>
          </View>

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

          <Text style={styles.voiceTipText}>
            You can also use your keyboard microphone.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 2</Text>
          <Text style={styles.sectionTitle}>Stress level today</Text>
          <Text style={styles.helperText}>Choose how heavy today feels.</Text>

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
            <Text style={styles.labelSmall}>Low</Text>
            <Text style={styles.labelSmall}>High</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 3</Text>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>

          <View style={styles.moodGrid}>
            {moodOptions.map((mood) => {
              const selected = selectedMoodIds.includes(mood.id);

              return (
                <Pressable
                  key={mood.id}
                  onPress={() => toggleMood(mood.id)}
                  style={[styles.moodChip, selected && styles.moodChipSelected]}
                >
                  <Ionicons
                    name={mood.icon}
                    size={17}
                    color={selected ? '#FFFFFF' : '#DB2777'}
                  />

                  <Text
                    style={[
                      styles.moodChipText,
                      selected && styles.moodChipTextSelected,
                    ]}
                  >
                    {mood.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepLabel}>Step 4</Text>
          <Text style={styles.sectionTitle}>Choose a prompt</Text>

          <View style={styles.promptGrid}>
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
                      size={18}
                      color={selected ? '#FFFFFF' : '#DB2777'}
                    />
                  </View>

                  <Text
                    style={[
                      styles.promptTitle,
                      selected && styles.promptTitleSelected,
                    ]}
                  >
                    {prompt.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Today’s check-in</Text>
          <Text style={styles.summaryText}>
            Stress: {stressLevel || 'Not selected'} • Feelings:{' '}
            {selectedMoodsText}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveJournalEntry}
          activeOpacity={0.88}
        >
          <Ionicons name="bookmark-outline" size={19} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save journal check-in</Text>
        </TouchableOpacity>

        {savedEntry ? (
          <View style={styles.savedBox}>
            <Ionicons name="checkmark-circle" size={20} color="#0F766E" />
            <Text style={styles.savedText}>Saved for reflection.</Text>
          </View>
        ) : null}

        <View style={styles.reminderCard}>
          <Ionicons name="heart-outline" size={22} color="#DB2777" />

          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Keep it short</Text>
            <Text style={styles.reminderText}>
              This journal is not meant to be another task. Even one sentence counts.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetJournal}
          activeOpacity={0.88}
        >
          <Ionicons name="refresh-outline" size={18} color="#DB2777" />
          <Text style={styles.resetText}>Reset journal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF7FA',
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
    backgroundColor: '#FFE4E6',
    top: -110,
    right: -110,
    opacity: 0.68,
  },

  bgBlobLeft: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FCE7F3',
    top: 560,
    left: -175,
    opacity: 0.3,
  },

  bgBlobBottomRight: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#DBEAFE',
    bottom: 80,
    right: -145,
    opacity: 0.22,
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
    borderColor: '#FDE2E7',
  },

  backText: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  introCard: {
    backgroundColor: '#DB2777',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DB2777',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },

  introIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  introTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 3,
  },

  introText: {
    color: '#FFE4E6',
    fontSize: 15,
    fontWeight: '800',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },

  writeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    shadowColor: '#DB2777',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },

  stepHeader: {
    marginBottom: 4,
  },

  stepLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#FCE7F3',
    color: '#DB2777',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },

  helperText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 12,
  },

  promptStarterBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  promptStarter: {
    flex: 1,
    marginLeft: 9,
    color: '#9F1239',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },

  textInput: {
    minHeight: 122,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },

  voiceTipText: {
    marginTop: 9,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  levelRow: {
    flexDirection: 'row',
    gap: 8,
  },

  levelButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  levelButtonSelected: {
    backgroundColor: '#DB2777',
    borderColor: '#DB2777',
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
    marginTop: 7,
  },

  labelSmall: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  moodChip: {
    width: '48.5%',
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  moodChipSelected: {
    backgroundColor: '#DB2777',
    borderColor: '#DB2777',
  },

  moodChipText: {
    flex: 1,
    marginLeft: 7,
    color: '#9F1239',
    fontWeight: '900',
    fontSize: 12,
  },

  moodChipTextSelected: {
    color: '#FFFFFF',
  },

  promptGrid: {
    gap: 9,
  },

  promptCard: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  promptCardSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#DB2777',
  },

  promptIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  promptIconSelected: {
    backgroundColor: '#DB2777',
  },

  promptTitle: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '900',
  },

  promptTitleSelected: {
    color: '#DB2777',
  },

  summaryBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    marginBottom: 14,
  },

  summaryLabel: {
    color: '#9F1239',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },

  summaryText: {
    color: '#831843',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },

  saveButton: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: '#DB2777',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  saveButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  savedBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  savedText: {
    marginLeft: 8,
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '900',
  },

  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  reminderTitle: {
    marginLeft: 10,
    color: '#DB2777',
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
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetText: {
    marginLeft: 8,
    color: '#DB2777',
    fontWeight: '900',
    fontSize: 14,
  },

  backgroundWash: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: '#FFA6AE',
},
});