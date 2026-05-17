import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveParentSupportPlan } from '../../lib/aiService';
import { useChild } from '../../lib/SelectedChildContext';

import { useResponsiveLayout } from '../../lib/responsive';

export default function CommunicationScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { selectedChild } = useChild();

  const [communicationNeed, setCommunicationNeed] = useState('');
  const [currentCommunication, setCurrentCommunication] = useState('');
  const [frustrationMoments, setFrustrationMoments] = useState('');
  const [supportsUsed, setSupportsUsed] = useState('');
  const [goal, setGoal] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<any>(null);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const canGenerate = useMemo(() => {
    return communicationNeed.trim().length > 2;
  }, [communicationNeed]);

  const handleGenerate = async () => {
    if (!selectedChild?.id) {
      Alert.alert('No child selected', 'Please select a child profile first.');
      return;
    }

    if (!canGenerate) {
      Alert.alert(
        'More information needed',
        'Please describe the communication challenge.'
      );
      return;
    }

    try {
      setLoading(true);
      setSaved(false);

      const plan = {
        title: 'Communication Support Plan',

        summary: `This communication support plan is designed to help ${childName} build functional communication skills with reduced frustration and increased independence.`,

        communication_focus: communicationNeed,

        strategies: [
          'Model simple language consistently.',
          'Pause and wait before prompting.',
          'Reinforce all communication attempts immediately.',
          'Pair words with visuals, gestures, or PECS when possible.',
          'Keep language short, clear, and repetitive.',
        ],

        replacement_skills: [
          'Requesting help',
          'Requesting a break',
          'Requesting preferred items',
          'Using gestures, visuals, or PECS',
          'Making simple choices',
        ],

        home_practice: [
          'Practice requesting during meals and play.',
          'Create simple communication opportunities throughout the day.',
          'Offer choices instead of anticipating needs immediately.',
          'Use motivating items to encourage communication.',
        ],

        frustration_supports: [
          frustrationMoments ||
            'Watch for signs of frustration and prompt communication before escalation.',
          'Stay calm and reduce language demands during dysregulation.',
          'Model the desired communication response.',
        ],

        visual_supports: [
          supportsUsed ||
            'PECS cards, first/then board, visuals, communication board, gestures',
        ],

        reinforcement_plan: [
          'Praise all communication attempts.',
          'Provide fast access to requested items when appropriate.',
          'Use excitement, attention, and preferred activities as reinforcement.',
        ],

        caregiver_note:
          'Communication growth takes repetition and consistency. Focus on progress, not perfection.',
      };

      setResult(plan);
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'Could not generate communication support right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedChild?.id || !result) {
      Alert.alert('Nothing to save', 'Please generate a support plan first.');
      return;
    }

    try {
      setSaving(true);

      await saveParentSupportPlan({
        childId: selectedChild.id,
        toolType: 'communication_support',
        title: communicationNeed || 'Communication Support Plan',
        inputData: {
          communicationNeed,
          currentCommunication,
          frustrationMoments,
          supportsUsed,
          goal,
        },
        aiResponse: result,
      });

      setSaved(true);

      Alert.alert('Saved', 'This communication support plan has been saved.');
    } catch (error) {
      console.error(error);
      Alert.alert('Save Error', 'Could not save this support plan.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!result) {
      Alert.alert('Nothing to print', 'Please generate a support plan first.');
      return;
    }

    try {
      const list = (items: string[] = []) =>
        items.map((item) => `<li>${item}</li>`).join('');

      const html = `
        <html>
          <body style="font-family: Arial; padding: 24px;">
            <h1>${result.title}</h1>

            <p>${result.summary}</p>

            <h2>Communication Need</h2>
            <p>${communicationNeed}</p>

            <h2>Current Communication</h2>
            <p>${currentCommunication}</p>

            <h2>Communication Strategies</h2>
            <ul>${list(result.strategies)}</ul>

            <h2>Replacement Skills</h2>
            <ul>${list(result.replacement_skills)}</ul>

            <h2>Home Practice</h2>
            <ul>${list(result.home_practice)}</ul>

            <h2>Frustration Supports</h2>
            <ul>${list(result.frustration_supports)}</ul>

            <h2>Visual Supports</h2>
            <ul>${list(result.visual_supports)}</ul>

            <h2>Reinforcement Plan</h2>
            <ul>${list(result.reinforcement_plan)}</ul>

            <h2>Caregiver Note</h2>
            <p>${result.caregiver_note}</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Print Error', 'Could not export this plan.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/parent-support');
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Communication Support</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <Ionicons
            name="chatbubbles-outline"
            size={34}
            color="#FFFFFF"
          />

          <Text style={styles.heroTitle}>
            Support communication growth
          </Text>

          <Text style={styles.heroText}>
            Get caregiver-friendly support for communication, requesting,
            PECS, visuals, AAC, frustration, and language development.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>
            What communication challenge needs support?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: requesting help, frustration, limited speech"
            placeholderTextColor="#94A3B8"
            value={communicationNeed}
            onChangeText={setCommunicationNeed}
            multiline
          />

          <Text style={styles.label}>
            How does your child currently communicate?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: gestures, PECS, AAC, pointing, single words"
            placeholderTextColor="#94A3B8"
            value={currentCommunication}
            onChangeText={setCurrentCommunication}
            multiline
          />

          <Text style={styles.label}>
            When does frustration usually happen?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: denied items, transitions, not understood"
            placeholderTextColor="#94A3B8"
            value={frustrationMoments}
            onChangeText={setFrustrationMoments}
            multiline
          />

          <Text style={styles.label}>
            Supports already used or needed
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: PECS, visuals, AAC, gestures"
            placeholderTextColor="#94A3B8"
            value={supportsUsed}
            onChangeText={setSupportsUsed}
            multiline
          />

          <Text style={styles.label}>
            Goal for communication growth
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: request needs without frustration"
            placeholderTextColor="#94A3B8"
            value={goal}
            onChangeText={setGoal}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.generateButton,
              !canGenerate && styles.disabledButton,
            ]}
            onPress={handleGenerate}
            disabled={!canGenerate || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.generateButtonText}>
                  Generate Communication Plan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>
              {result.title}
            </Text>

            <Text style={styles.summaryText}>
              {result.summary}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.saveButton, saved && styles.savedButton]}
                onPress={handleSave}
                disabled={saving || saved}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        saved
                          ? 'checkmark-circle-outline'
                          : 'save-outline'
                      }
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text style={styles.actionButtonText}>
                      {saved ? 'Saved' : 'Save'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.printButton}
                onPress={handlePrint}
              >
                <Ionicons
                  name="print-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.actionButtonText}>
                  Print / Export
                </Text>
              </TouchableOpacity>
            </View>

            <ResultSection
              title="Communication Strategies"
              items={result.strategies}
            />

            <ResultSection
              title="Replacement Skills"
              items={result.replacement_skills}
            />

            <ResultSection
              title="Home Practice"
              items={result.home_practice}
            />

            <ResultSection
              title="Frustration Supports"
              items={result.frustration_supports}
            />

            <ResultSection
              title="Visual Supports"
              items={result.visual_supports}
            />

            <ResultSection
              title="Reinforcement Plan"
              items={result.reinforcement_plan}
            />

            {!!result.caregiver_note && (
              <View style={styles.noteBox}>
                <Ionicons
                  name="heart-outline"
                  size={18}
                  color="#4F46E5"
                />

                <Text style={styles.noteText}>
                  {result.caregiver_note}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.noticeCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#B45309"
          />

          <Text style={styles.noticeText}>
            Communication support tools are educational caregiver supports
            and do not replace individualized speech, behavioral, or
            clinical services.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultSection({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  const safeItems = (items || []).filter(Boolean);

  if (!safeItems.length) return null;

  return (
    <View style={styles.resultSection}>
      <Text style={styles.resultSectionTitle}>
        {title}
      </Text>

      {safeItems.map((item, index) => (
        <View key={index} style={styles.resultBulletRow}>
          <View style={styles.resultBullet} />

          <Text style={styles.resultText}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

   content: {
  paddingTop: 20,
  paddingBottom: 40,
},

contentInner: {
  width: '100%',
},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  headerSpacer: {
    width: 42,
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 10,
  },

  heroText: {
    color: '#E0E7FF',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '600',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    minHeight: 86,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 21,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
  },

  generateButton: {
    minHeight: 52,
    marginTop: 22,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  disabledButton: {
    opacity: 0.5,
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },

  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  resultsTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },

  summaryText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 16,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  saveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  savedButton: {
    opacity: 0.75,
  },

  printButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 8,
  },

  resultSection: {
    marginTop: 18,
  },

  resultSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 10,
  },

  resultBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  resultBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    marginTop: 7,
    marginRight: 10,
  },

  resultText: {
    flex: 1,
    color: '#475569',
    lineHeight: 21,
    fontSize: 14,
    fontWeight: '600',
  },

  noteBox: {
    marginTop: 22,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  noteText: {
    flex: 1,
    marginLeft: 10,
    color: '#4338CA',
    fontWeight: '700',
    lineHeight: 20,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
  },

  noticeText: {
    flex: 1,
    marginLeft: 10,
    color: '#92400E',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});