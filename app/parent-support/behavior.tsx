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

import {
  generateBehaviorSupportPlan,
  saveParentSupportPlan,
} from '../../lib/aiService';
import { useResponsiveLayout } from '../../lib/responsive';
import { useChild } from '../../lib/SelectedChildContext';

export default function BehaviorSupportScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { selectedChild } = useChild();

  const [behavior, setBehavior] = useState('');
  const [beforeBehavior, setBeforeBehavior] = useState('');
  const [afterBehavior, setAfterBehavior] = useState('');
  const [location, setLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<any>(null);

  const canGenerate = useMemo(() => {
    return behavior.trim().length > 2 && beforeBehavior.trim().length > 2;
  }, [behavior, beforeBehavior]);

  const handleGenerate = async () => {
    if (!selectedChild?.id) {
      Alert.alert('No child selected', 'Please select a child profile first.');
      return;
    }

    if (!canGenerate) {
      Alert.alert(
        'More information needed',
        'Please describe the behavior and what usually happens before it.'
      );
      return;
    }

    try {
      setLoading(true);
      setSaved(false);

      const response = await generateBehaviorSupportPlan({
        childId: selectedChild.id,
        childName:
          selectedChild?.child_name ||
          selectedChild?.name ||
          'the child',
        behavior,
        beforeBehavior,
        afterBehavior,
        location,
      });

      setResult(response);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not generate support guidance right now.');
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
        toolType: 'behavior_support',
        title: behavior || 'Behavior Support Plan',
        inputData: {
          behavior,
          beforeBehavior,
          afterBehavior,
          location,
        },
        aiResponse: result,
      });

      setSaved(true);
      Alert.alert('Saved', 'This behavior support plan has been saved.');
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
      const html = `
        <html>
          <body style="font-family: Arial; padding: 24px;">
            <h1>Behavior Support Plan</h1>

            <h2>Behavior</h2>
            <p>${behavior || ''}</p>

            <h2>What Happens Before</h2>
            <p>${beforeBehavior || ''}</p>

            <h2>What Happens After</h2>
            <p>${afterBehavior || ''}</p>

            <h2>Location</h2>
            <p>${location || ''}</p>

            <h2>Possible Reason</h2>
            <p>${result.possible_reason || ''}</p>

            <h2>Prevention Strategies</h2>
            <ul>${(result.prevention_strategies || [])
              .map((item: string) => `<li>${item}</li>`)
              .join('')}</ul>

            <h2>Replacement Skills</h2>
            <ul>${(result.replacement_skills || [])
              .map((item: string) => `<li>${item}</li>`)
              .join('')}</ul>

            <h2>Calming Supports</h2>
            <ul>${(result.calming_supports || [])
              .map((item: string) => `<li>${item}</li>`)
              .join('')}</ul>

            <h2>Parent Tips</h2>
            <ul>${(result.parent_tips || [])
              .map((item: string) => `<li>${item}</li>`)
              .join('')}</ul>

            <h2>Encouragement</h2>
            <p>${result.encouragement || ''}</p>
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

          <Text style={styles.headerTitle}>Behavior Support</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-outline" size={30} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>AI-powered behavior coaching</Text>

          <Text style={styles.heroText}>
            Get calm, parent-friendly ABA-style support strategies for difficult
            behaviors, transitions, routines, and emotional regulation.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>What behavior is happening?</Text>

          <TextInput
            style={styles.input}
            placeholder="Example: screaming, throwing toys, refusing transitions"
            placeholderTextColor="#94A3B8"
            value={behavior}
            onChangeText={setBehavior}
            multiline
          />

          <Text style={styles.label}>
            What usually happens BEFORE the behavior?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: tablet removed, asked to clean up, transition warning"
            placeholderTextColor="#94A3B8"
            value={beforeBehavior}
            onChangeText={setBeforeBehavior}
            multiline
          />

          <Text style={styles.label}>
            What usually happens AFTER the behavior?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: parent gives attention, escape from task, gets preferred item"
            placeholderTextColor="#94A3B8"
            value={afterBehavior}
            onChangeText={setAfterBehavior}
            multiline
          />

          <Text style={styles.label}>Where does this happen most often?</Text>

          <TextInput
            style={styles.input}
            placeholder="Example: bedtime, grocery store, meals, schoolwork"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
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
                  Generate Support Plan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Suggested Support Plan</Text>

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

              <TouchableOpacity
                style={styles.printButton}
                onPress={handlePrint}
              >
                <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Print / Export</Text>
              </TouchableOpacity>
            </View>

            <ResultSection
              title="Possible Reason"
              items={[result.possible_reason]}
            />

            <ResultSection
              title="Prevention Strategies"
              items={result.prevention_strategies}
            />

            <ResultSection
              title="Replacement Skills"
              items={result.replacement_skills}
            />

            <ResultSection
              title="Calming Supports"
              items={result.calming_supports}
            />

            <ResultSection title="Parent Tips" items={result.parent_tips} />

            {!!result.encouragement && (
              <View style={styles.encouragementBox}>
                <Ionicons name="heart" size={18} color="#7C3AED" />

                <Text style={styles.encouragementText}>
                  {result.encouragement}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={18} color="#7C3AED" />

            <Text style={styles.tipTitle}>Better details = better support</Text>
          </View>

          <Text style={styles.tipText}>
            Include triggers, transitions, sensory issues, communication
            struggles, or situations that commonly lead to the behavior.
          </Text>
        </View>

        <View style={styles.noticeCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#B45309"
          />

          <Text style={styles.noticeText}>
            This tool provides educational behavioral support guidance only and
            does not replace medical, psychological, crisis, or emergency
            services.
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
    <View style={{ marginTop: 18 }}>
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
    backgroundColor: '#7C3AED',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 10,
  },

  heroText: {
    color: '#E9D5FF',
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
    minHeight: 90,
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
    backgroundColor: '#7C3AED',
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
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
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
    backgroundColor: '#7C3AED',
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

  encouragementBox: {
    marginTop: 24,
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  encouragementText: {
    flex: 1,
    marginLeft: 10,
    color: '#6D28D9',
    fontWeight: '700',
    lineHeight: 20,
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

  tipCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },

  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  tipTitle: {
    marginLeft: 8,
    fontWeight: '900',
    color: '#6D28D9',
    fontSize: 14,
  },

  tipText: {
    color: '#6B21A8',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '600',
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