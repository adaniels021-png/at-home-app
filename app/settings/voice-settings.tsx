import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '../../lib/responsive';

export const COMMUNICATION_VOICE_KEY = 'communication:selectedVoice';

type SpeechVoice = {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
};

const FALLBACK_VOICE: SpeechVoice = {
  identifier: 'default',
  name: 'Default Device Voice',
  language: 'en-US',
  quality: 'System',
};

export default function VoiceSettingsScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();

  const [loading, setLoading] = useState(true);
  const [voices, setVoices] = useState<SpeechVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechVoice>(FALLBACK_VOICE);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  useEffect(() => {
    void loadVoices();

    return () => {
      void Speech.stop();
    };
  }, []);

  const loadVoices = async () => {
    setLoading(true);

    try {
      const stored = await AsyncStorage.getItem(COMMUNICATION_VOICE_KEY);
      const savedVoice = stored ? safeParseVoice(stored) : null;

      let availableVoices: any[] = [];

      try {
        availableVoices = await Speech.getAvailableVoicesAsync();
      } catch (voiceError) {
        console.log('Device voices unavailable:', voiceError);
      }

      const englishVoices = (availableVoices || [])
        .filter((voice: any) =>
          String(voice?.language || '').toLowerCase().startsWith('en')
        )
        .map((voice: any) => ({
          identifier: String(voice.identifier || voice.id || ''),
          name: String(voice.name || 'Voice'),
          language: String(voice.language || 'en-US'),
          quality: String(voice.quality || ''),
        }))
        .filter((voice) => !!voice.identifier)
        .sort((a, b) => {
          const aScore = getVoiceScore(a);
          const bScore = getVoiceScore(b);

          if (aScore !== bScore) return bScore - aScore;

          return a.name.localeCompare(b.name);
        });

      const finalVoices =
        englishVoices.length > 0 ? englishVoices : [FALLBACK_VOICE];

      setVoices(finalVoices);

      if (
        savedVoice?.identifier &&
        finalVoices.some((voice) => voice.identifier === savedVoice.identifier)
      ) {
        setSelectedVoice(savedVoice);
      } else {
        setSelectedVoice(finalVoices[0]);
        await AsyncStorage.setItem(
          COMMUNICATION_VOICE_KEY,
          JSON.stringify(finalVoices[0])
        );
      }
    } catch (error) {
      console.error('Load voices error:', error);
      setVoices([FALLBACK_VOICE]);
      setSelectedVoice(FALLBACK_VOICE);

      Alert.alert(
        'Voice Notice',
        'Device voices could not be loaded, so the default device voice will be used.'
      );
    } finally {
      setLoading(false);
    }
  };

  const recommendedVoices = useMemo(() => {
    return voices.filter((voice) => getVoiceScore(voice) >= 3).slice(0, 8);
  }, [voices]);

  const otherVoices = useMemo(() => {
    const recommendedIds = new Set(
      recommendedVoices.map((voice) => voice.identifier)
    );

    return voices.filter((voice) => !recommendedIds.has(voice.identifier));
  }, [voices, recommendedVoices]);

  const handlePreviewVoice = async (voice: SpeechVoice) => {
    try {
      setPreviewingId(voice.identifier);

      await Speech.stop();

      const speechOptions: Speech.SpeechOptions = {
        language: voice.language || 'en-US',
        rate: 0.82,
        pitch: 1.08,
        onDone: () => setPreviewingId(null),
        onStopped: () => setPreviewingId(null),
        onError: () => setPreviewingId(null),
      };

      if (voice.identifier !== FALLBACK_VOICE.identifier) {
        speechOptions.voice = voice.identifier;
      }

      Speech.speak(
        'Hi! I can help you talk. Tap a picture to say what you need.',
        speechOptions
      );
    } catch (error) {
      console.error('Preview voice error:', error);
      setPreviewingId(null);

      Alert.alert('Preview Error', 'Could not preview this voice.');
    }
  };

  const handleSaveVoice = async (voice: SpeechVoice) => {
    try {
      await AsyncStorage.setItem(COMMUNICATION_VOICE_KEY, JSON.stringify(voice));
      setSelectedVoice(voice);

      Alert.alert(
        'Voice Saved',
        `${voice.name} will now be used for communication speech.`
      );
    } catch (error) {
      console.error('Save voice error:', error);

      Alert.alert('Save Error', 'Could not save this voice.');
    }
  };

  const handleResetVoice = async () => {
    try {
      await Speech.stop();

      const defaultVoice = voices[0] || FALLBACK_VOICE;

      await AsyncStorage.setItem(
        COMMUNICATION_VOICE_KEY,
        JSON.stringify(defaultVoice)
      );

      setSelectedVoice(defaultVoice);

      Alert.alert(
        'Voice Reset',
        'The communication voice has been reset to the recommended default voice.'
      );
    } catch (error) {
      console.error('Reset voice error:', error);

      Alert.alert('Reset Error', 'Could not reset the communication voice.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading voices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            alignItems: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, { maxWidth: layout.maxContentWidth }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/settings');
                }
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Voice Settings</Text>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="volume-high" size={30} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>Communication Voice</Text>

            <Text style={styles.heroText}>
              Choose a clearer, more child-friendly voice for PECS cards,
              phrase building, and communication speech.
            </Text>

            <View style={styles.platformPill}>
              <Ionicons
                name={Platform.OS === 'ios' ? 'logo-apple' : 'phone-portrait-outline'}
                size={15}
                color="#4F46E5"
              />
              <Text style={styles.platformPillText}>
                Voices are based on this device
              </Text>
            </View>
          </View>

          <View style={styles.currentCard}>
            <View style={styles.currentTopRow}>
              <View style={styles.currentIconWrap}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.currentLabel}>Current Voice</Text>
                <Text style={styles.currentVoiceName}>
                  {selectedVoice?.name || 'Default Device Voice'}
                </Text>
                <Text style={styles.currentVoiceMeta}>
                  {selectedVoice?.language || 'System default'}
                  {selectedVoice?.quality ? ` • ${selectedVoice.quality}` : ''}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.previewCurrentButton}
              onPress={() => void handlePreviewVoice(selectedVoice)}
            >
              {previewingId === selectedVoice.identifier ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.previewCurrentText}>
                    Preview Current Voice
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {recommendedVoices.length > 0 ? (
            <>
              <SectionTitle
                title="Recommended Voices"
                subtitle="These usually sound clearer or more natural."
              />

              {recommendedVoices.map((voice) => (
                <VoiceCard
                  key={voice.identifier}
                  voice={voice}
                  selected={selectedVoice?.identifier === voice.identifier}
                  previewing={previewingId === voice.identifier}
                  recommended
                  onPreview={() => void handlePreviewVoice(voice)}
                  onSave={() => void handleSaveVoice(voice)}
                />
              ))}
            </>
          ) : null}

          <SectionTitle
            title="Other English Voices"
            subtitle="Available voices vary by device and installed voice packs."
          />

          {otherVoices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="mic-off-outline" size={34} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No additional voices found</Text>
              <Text style={styles.emptyText}>
                You may be able to add more voices in your device accessibility
                or spoken content settings.
              </Text>
            </View>
          ) : (
            otherVoices.map((voice) => (
              <VoiceCard
                key={voice.identifier}
                voice={voice}
                selected={selectedVoice?.identifier === voice.identifier}
                previewing={previewingId === voice.identifier}
                onPreview={() => void handlePreviewVoice(voice)}
                onSave={() => void handleSaveVoice(voice)}
              />
            ))
          )}

          <TouchableOpacity style={styles.resetButton} onPress={handleResetVoice}>
            <Ionicons name="refresh-outline" size={18} color="#475569" />
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#B45309" />

            <Text style={styles.infoText}>
              Voice quality depends on the voices installed on the device.
              For best results, parents can install enhanced voices in iPhone/iPad
              settings under Accessibility and Spoken Content.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function safeParseVoice(value: string): SpeechVoice | null {
  try {
    const parsed = JSON.parse(value);

    if (!parsed?.identifier) return null;

    return {
      identifier: String(parsed.identifier),
      name: String(parsed.name || 'Voice'),
      language: String(parsed.language || 'en-US'),
      quality: parsed.quality ? String(parsed.quality) : '',
    };
  } catch {
    return null;
  }
}

function getVoiceScore(voice: SpeechVoice) {
  const name = String(voice.name || '').toLowerCase();
  const quality = String(voice.quality || '').toLowerCase();

  let score = 0;

  if (quality.includes('enhanced') || quality.includes('premium')) score += 4;

  if (
    name.includes('samantha') ||
    name.includes('ava') ||
    name.includes('allison') ||
    name.includes('susan') ||
    name.includes('zoe') ||
    name.includes('tom') ||
    name.includes('daniel') ||
    name.includes('karen') ||
    name.includes('moira')
  ) {
    score += 3;
  }

  if (voice.language === 'en-US') score += 2;
  if (voice.language?.startsWith('en-')) score += 1;

  if (voice.identifier === FALLBACK_VOICE.identifier) score += 1;

  return score;
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function VoiceCard({
  voice,
  selected,
  previewing,
  recommended = false,
  onPreview,
  onSave,
}: {
  voice: SpeechVoice;
  selected: boolean;
  previewing: boolean;
  recommended?: boolean;
  onPreview: () => void;
  onSave: () => void;
}) {
  return (
    <View style={[styles.voiceCard, selected && styles.voiceCardSelected]}>
      <View style={styles.voiceTopRow}>
        <View
          style={[
            styles.voiceIconWrap,
            selected && styles.voiceIconWrapSelected,
          ]}
        >
          <Ionicons
            name={selected ? 'checkmark-circle' : 'person-circle-outline'}
            size={24}
            color={selected ? '#059669' : '#4F46E5'}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.voiceNameRow}>
            <Text style={styles.voiceName}>{voice.name}</Text>

            {recommended ? (
              <View style={styles.recommendedPill}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.voiceMeta}>
            {voice.language}
            {voice.quality ? ` • ${voice.quality}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.voiceActions}>
        <TouchableOpacity style={styles.previewButton} onPress={onPreview}>
          {previewing ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <>
              <Ionicons name="play-outline" size={17} color="#4F46E5" />
              <Text style={styles.previewButtonText}>Preview</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, selected && styles.savedButton]}
          onPress={onSave}
          disabled={selected}
        >
          <Ionicons
            name={selected ? 'checkmark-outline' : 'save-outline'}
            size={17}
            color="#FFFFFF"
          />
          <Text style={styles.saveButtonText}>
            {selected ? 'Selected' : 'Use Voice'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  content: {
    paddingTop: 20,
    paddingBottom: 44,
  },

  contentInner: {
    width: '100%',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  headerSpacer: {
    width: 48,
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    padding: 24,
    marginBottom: 18,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#E0E7FF',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  platformPill: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  platformPillText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '900',
  },

  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  currentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  currentIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  currentLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },

  currentVoiceName: {
    marginTop: 3,
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },

  currentVoiceMeta: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  previewCurrentButton: {
    marginTop: 16,
    minHeight: 52,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  previewCurrentText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
  },

  sectionTitleWrap: {
    marginBottom: 12,
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  sectionSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },

  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  voiceCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },

  voiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  voiceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  voiceIconWrapSelected: {
    backgroundColor: '#DCFCE7',
  },

  voiceNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },

  voiceName: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '900',
  },

  voiceMeta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  recommendedPill: {
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  recommendedText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '900',
  },

  voiceActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },

  previewButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  previewButtonText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontWeight: '900',
  },

  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  savedButton: {
    backgroundColor: '#10B981',
  },

  saveButtonText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyTitle: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyText: {
    marginTop: 6,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },

  resetButton: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  resetButtonText: {
    marginLeft: 8,
    color: '#475569',
    fontWeight: '900',
  },

  infoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#92400E',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});