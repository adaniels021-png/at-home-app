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
import { useResponsiveLayout } from '../../lib/responsive';
import { useChild } from '../../lib/SelectedChildContext';

export default function RoutinesScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { selectedChild } = useChild();

  const [routineName, setRoutineName] = useState('');
  const [routineProblem, setRoutineProblem] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [supports, setSupports] = useState('');
  const [goal, setGoal] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<any>(null);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const canGenerate = useMemo(() => {
    return routineName.trim().length > 2 && routineProblem.trim().length > 2;
  }, [routineName, routineProblem]);

  const handleGenerate = async () => {
    if (!selectedChild?.id) {
      Alert.alert('No child selected', 'Please select a child profile first.');
      return;
    }

    if (!canGenerate) {
      Alert.alert(
        'More information needed',
        'Please describe the routine and what part is difficult.'
      );
      return;
    }

    try {
      setLoading(true);
      setSaved(false);

      const plan = {
        title: `${routineName} Routine Support Plan`,
        summary: `This plan helps support ${childName} during ${routineName.toLowerCase()} by making expectations clear, reducing stress, and reinforcing successful participation.`,
        routine_steps: [
          `Prepare the routine area before starting ${routineName.toLowerCase()}.`,
          `Show or explain what will happen first, next, and last.`,
          `Give ${childName} one simple direction at a time.`,
          'Use calm prompting and allow extra response time.',
          'Praise small steps of cooperation immediately.',
          'End with a clear completion cue and a preferred reward or activity.',
        ],
        prevention_strategies: [
          'Use a visual schedule or first/then board.',
          'Give a short warning before the routine begins.',
          'Reduce distractions when possible.',
          'Offer simple choices when appropriate.',
          'Keep language short and consistent.',
        ],
        support_tools: [
          supports || 'Visual timer, first/then board, choice card, calm voice, and preferred reinforcement.',
        ],
        reinforcement_plan: [
          `Praise ${childName} for each successful step.`,
          'Use a small reward, preferred item, or preferred activity after the routine.',
          'Reinforce effort, not just perfect completion.',
        ],
        if_challenging_behavior_happens: [
          'Pause and stay calm.',
          'Reduce the demand if needed.',
          'Prompt one small next step.',
          'Offer help or a break if appropriate.',
          'Return to the routine when calm.',
        ],
        goal:
          goal ||
          `Help ${childName} participate in ${routineName.toLowerCase()} with less stress and more independence.`,
        caregiver_note:
          'Start with a short version of the routine. Build success first, then slowly increase expectations.',
      };

      setResult(plan);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not generate routine support right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedChild?.id || !result) {
      Alert.alert('Nothing to save', 'Please generate a routine plan first.');
      return;
    }

    try {
      setSaving(true);

      await saveParentSupportPlan({
        childId: selectedChild.id,
        toolType: 'routine_support',
        title: result.title || routineName || 'Routine Support Plan',
        inputData: {
          routineName,
          routineProblem,
          timeOfDay,
          supports,
          goal,
        },
        aiResponse: result,
      });

      setSaved(true);
      Alert.alert('Saved', 'This routine support plan has been saved.');
    } catch (error) {
      console.error(error);
      Alert.alert('Save Error', 'Could not save this routine plan.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!result) {
      Alert.alert('Nothing to print', 'Please generate a routine plan first.');
      return;
    }

    try {
      const list = (items: string[] = []) =>
        items.map((item) => `<li>${item}</li>`).join('');

      const html = `
        <html>
          <body style="font-family: Arial; padding: 24px;">
            <h1>${result.title}</h1>
            <p>${result.summary || ''}</p>

            <h2>Routine</h2>
            <p>${routineName}</p>

            <h2>Difficult Part</h2>
            <p>${routineProblem}</p>

            <h2>Time of Day</h2>
            <p>${timeOfDay || ''}</p>

            <h2>Goal</h2>
            <p>${result.goal || ''}</p>

            <h2>Routine Steps</h2>
            <ul>${list(result.routine_steps)}</ul>

            <h2>Prevention Strategies</h2>
            <ul>${list(result.prevention_strategies)}</ul>

            <h2>Support Tools</h2>
            <ul>${list(result.support_tools)}</ul>

            <h2>Reinforcement Plan</h2>
            <ul>${list(result.reinforcement_plan)}</ul>

            <h2>If Challenging Behavior Happens</h2>
            <ul>${list(result.if_challenging_behavior_happens)}</ul>

            <h2>Caregiver Note</h2>
            <p>${result.caregiver_note || ''}</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Created', uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Print Error', 'Could not create the printable file.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/parent-support');
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Routine Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <Ionicons name="calendar-outline" size={34} color="#FFFFFF" />

          <Text style={styles.heroTitle}>Build a calmer daily routine</Text>

          <Text style={styles.heroText}>
            Create parent-friendly support plans for bedtime, meals, hygiene,
            transitions, school mornings, community outings, and more.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>What routine do you want help with?</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: bedtime, brushing teeth, morning routine"
            placeholderTextColor="#94A3B8"
            value={routineName}
            onChangeText={setRoutineName}
            multiline
          />

          <Text style={styles.label}>What part is difficult?</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: refusing, crying, running away, getting stuck"
            placeholderTextColor="#94A3B8"
            value={routineProblem}
            onChangeText={setRoutineProblem}
            multiline
          />

          <Text style={styles.label}>When does this usually happen?</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: morning, after school, bedtime"
            placeholderTextColor="#94A3B8"
            value={timeOfDay}
            onChangeText={setTimeOfDay}
            multiline
          />

          <Text style={styles.label}>Supports already used or needed</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: visual timer, first/then board, PECS card"
            placeholderTextColor="#94A3B8"
            value={supports}
            onChangeText={setSupports}
            multiline
          />

          <Text style={styles.label}>Goal for this routine</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: complete bedtime with fewer meltdowns"
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
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>
                  Generate Routine Plan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>{result.title}</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>

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
                      name={saved ? 'checkmark-circle-outline' : 'save-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>
                      {saved ? 'Saved' : 'Save'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Print / Export</Text>
              </TouchableOpacity>
            </View>

            <ResultSection title="Routine Steps" items={result.routine_steps} />
            <ResultSection
              title="Prevention Strategies"
              items={result.prevention_strategies}
            />
            <ResultSection title="Support Tools" items={result.support_tools} />
            <ResultSection
              title="Reinforcement Plan"
              items={result.reinforcement_plan}
            />
            <ResultSection
              title="If Challenging Behavior Happens"
              items={result.if_challenging_behavior_happens}
            />

            {!!result.caregiver_note && (
              <View style={styles.noteBox}>
                <Ionicons name="heart-outline" size={18} color="#047857" />
                <Text style={styles.noteText}>{result.caregiver_note}</Text>
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
            Routine support plans are educational caregiver tools and do not
            replace individualized clinical care.
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
      <Text style={styles.resultSectionTitle}>{title}</Text>

      {safeItems.map((item, index) => (
        <View key={index} style={styles.resultBulletRow}>
          <View style={styles.resultBullet} />
          <Text style={styles.resultText}>{item}</Text>
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
    backgroundColor: '#047857',
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
    color: '#D1FAE5',
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
    backgroundColor: '#047857',
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
    backgroundColor: '#047857',
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
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    color: '#047857',
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