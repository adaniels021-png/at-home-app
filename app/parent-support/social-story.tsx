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
  generateSocialStory,
  saveParentSupportPlan,
} from '../../lib/aiService';
import { useResponsiveLayout } from '../../lib/responsive';
import { useChild } from '../../lib/SelectedChildContext';

export default function SocialStoryScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { selectedChild } = useChild();

  const [situation, setSituation] = useState('');
  const [goal, setGoal] = useState('');
  const [location, setLocation] = useState('');
  const [supportNeeds, setSupportNeeds] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<any>(null);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'the child';
  }, [selectedChild]);

  const canGenerate = useMemo(() => {
    return situation.trim().length > 2;
  }, [situation]);

  const handleGenerate = async () => {
    if (!selectedChild?.id) {
      Alert.alert('No child selected', 'Please select a child profile first.');
      return;
    }

    if (!canGenerate) {
      Alert.alert(
        'More information needed',
        'Please describe the situation for the social story.'
      );
      return;
    }

    try {
      setLoading(true);
      setSaved(false);

      const response = await generateSocialStory({
        childId: selectedChild.id,
        childName,
        situation,
        goal,
        location,
        supportNeeds,
      });

      setResult(response);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not generate the social story right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedChild?.id || !result) {
      Alert.alert('Nothing to save', 'Please generate a social story first.');
      return;
    }

    try {
      setSaving(true);

      await saveParentSupportPlan({
        childId: selectedChild.id,
        toolType: 'social_story',
        title: result?.title || situation || 'Social Story',
        inputData: {
          situation,
          goal,
          location,
          supportNeeds,
        },
        aiResponse: result,
      });

      setSaved(true);
      Alert.alert('Saved', 'This social story has been saved.');
    } catch (error) {
      console.error(error);
      Alert.alert('Save Error', 'Could not save this social story.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!result) {
      Alert.alert('Nothing to print', 'Please generate a social story first.');
      return;
    }

    try {
      const pagesHtml = Array.isArray(result.story_pages)
        ? result.story_pages
            .map(
              (page: any, index: number) => `
                <div style="page-break-after: always; padding: 24px;">
                  <h2>Page ${index + 1}: ${page.page_title || 'Story Page'}</h2>
                  <p style="font-size: 20px; line-height: 1.5;">${page.text || ''}</p>
                  <p><strong>Visual idea:</strong> ${page.visual_suggestion || ''}</p>
                </div>
              `
            )
            .join('')
        : '';

      const html = `
        <html>
          <body style="font-family: Arial; padding: 24px;">
            <h1>${result.title || 'Social Story'}</h1>
            <p>${result.introduction || ''}</p>

            ${pagesHtml}

            <h2>Practice Tips</h2>
            <ul>${(result.practice_tips || [])
              .map((item: string) => `<li>${item}</li>`)
              .join('')}</ul>

            <h2>Caregiver Note</h2>
            <p>${result.caregiver_note || ''}</p>

            <h2>Calming Phrase</h2>
            <p>${result.calming_phrase || ''}</p>
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
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/parent-support');
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Social Story Generator</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <Ionicons name="book-outline" size={34} color="#FFFFFF" />

          <Text style={styles.heroTitle}>
            Create a personalized social story
          </Text>

          <Text style={styles.heroText}>
            Build simple, positive stories for routines, emotions, transitions,
            school, bedtime, outings, and new situations.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>What is the story about?</Text>

          <TextInput
            style={styles.input}
            placeholder="Example: going to the doctor, bedtime, sharing toys, grocery store"
            placeholderTextColor="#94A3B8"
            value={situation}
            onChangeText={setSituation}
            multiline
          />

          <Text style={styles.label}>What should the story help with?</Text>

          <TextInput
            style={styles.input}
            placeholder="Example: staying calm, knowing what to expect, asking for help"
            placeholderTextColor="#94A3B8"
            value={goal}
            onChangeText={setGoal}
            multiline
          />

          <Text style={styles.label}>Where does this happen?</Text>

          <TextInput
            style={styles.input}
            placeholder="Example: home, school, car, store, clinic"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
            multiline
          />

          <Text style={styles.label}>Any supports to include?</Text>

          <TextInput
            style={styles.input}
            placeholder="Example: headphones, visual timer, first/then board, break card"
            placeholderTextColor="#94A3B8"
            value={supportNeeds}
            onChangeText={setSupportNeeds}
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
                  Generate Social Story
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>
              {result.title || 'Social Story'}
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

            {!!result.introduction && (
              <Text style={styles.introduction}>
                {result.introduction}
              </Text>
            )}

            {Array.isArray(result.story_pages) &&
              result.story_pages.map((page: any, index: number) => (
                <View key={index} style={styles.pageCard}>
                  <Text style={styles.pageNumber}>Page {index + 1}</Text>

                  <Text style={styles.pageTitle}>
                    {page.page_title || 'Story Page'}
                  </Text>

                  <Text style={styles.pageText}>
                    {page.text || ''}
                  </Text>

                  {!!page.visual_suggestion && (
                    <View style={styles.visualBox}>
                      <Ionicons
                        name="image-outline"
                        size={17}
                        color="#2563EB"
                      />

                      <Text style={styles.visualText}>
                        Visual idea: {page.visual_suggestion}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

            <ResultSection title="Practice Tips" items={result.practice_tips} />

            {!!result.caregiver_note && (
              <View style={styles.noteBox}>
                <Ionicons name="heart-outline" size={18} color="#7C3AED" />
                <Text style={styles.noteText}>{result.caregiver_note}</Text>
              </View>
            )}

            {!!result.calming_phrase && (
              <View style={styles.phraseBox}>
                <Text style={styles.phraseLabel}>Calming Phrase</Text>
                <Text style={styles.phraseText}>
                  “{result.calming_phrase}”
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
            Social stories are educational supports and should be reviewed by a
            caregiver before use.
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
  if (!items?.length) return null;

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.resultSectionTitle}>{title}</Text>

      {items.map((item, index) => (
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
    backgroundColor: '#2563EB',
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
    color: '#DBEAFE',
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
    backgroundColor: '#2563EB',
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
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },
  introduction: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 18,
  },
  pageCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  pageNumber: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
  },
  pageTitle: {
    color: '#1E3A8A',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 8,
  },
  pageText: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  visualBox: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  visualText: {
    flex: 1,
    marginLeft: 8,
    color: '#2563EB',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
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
    backgroundColor: '#2563EB',
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
    marginTop: 20,
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    color: '#6D28D9',
    fontWeight: '700',
    lineHeight: 20,
  },
  phraseBox: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 16,
  },
  phraseLabel: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  phraseText: {
    color: '#065F46',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 23,
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
});