import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

export const VOICE_KEY = 'communication:selectedVoice';

export type SavedSpeechVoice = {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
};

function safeParseVoice(raw: string | null): SavedSpeechVoice | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (!parsed?.identifier || parsed.identifier === 'default') {
      return null;
    }

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

export async function getAvailableKidFriendlyVoices() {
  try {
    const voices = await Speech.getAvailableVoicesAsync();

    return voices
      .filter((voice) =>
        String(voice.language || '').toLowerCase().startsWith('en')
      )
      .sort((a, b) => {
        const aEnhanced = String(a.quality || '')
          .toLowerCase()
          .includes('enhanced');
        const bEnhanced = String(b.quality || '')
          .toLowerCase()
          .includes('enhanced');

        if (aEnhanced && !bEnhanced) return -1;
        if (!aEnhanced && bEnhanced) return 1;

        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  } catch (error) {
    console.log('Get voices error:', error);
    return [];
  }
}

export async function saveSelectedSpeechVoice(voice: SavedSpeechVoice) {
  await AsyncStorage.setItem(VOICE_KEY, JSON.stringify(voice));
}

export async function loadSelectedSpeechVoice(): Promise<SavedSpeechVoice | null> {
  const raw = await AsyncStorage.getItem(VOICE_KEY);
  return safeParseVoice(raw);
}

export async function speakWithSavedVoice(text: string) {
  const cleanText = String(text || '').trim();

  if (!cleanText) return;

  try {
    const selectedVoice = await loadSelectedSpeechVoice();

    await Speech.stop();

    const options: Speech.SpeechOptions = {
      language: selectedVoice?.language || 'en-US',
      rate: 0.82,
      pitch: 1.08,
    };

    if (selectedVoice?.identifier) {
      options.voice = selectedVoice.identifier;
    }

    Speech.speak(cleanText, options);
  } catch (error) {
    console.log('Speak with saved voice error:', error);

    try {
      Speech.speak(cleanText, {
        language: 'en-US',
        rate: 0.82,
        pitch: 1.08,
      });
    } catch {}
  }
}