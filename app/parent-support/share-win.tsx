import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getTodayParentWinPrompt,
  submitParentWinPost,
  validateParentWinContent,
} from '@/lib/parentWinsService';

export default function ShareWinScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const prompt = getTodayParentWinPrompt();

  const validation = useMemo(() => validateParentWinContent(content), [content]);
  const characterCount = content.trim().length;

  function focusForTalkToText() {
    inputRef.current?.focus();

    Alert.alert(
      'Talk-to-Text',
      Platform.OS === 'ios'
        ? 'Tap the microphone on your iPhone keyboard and speak your Parent Win.'
        : 'Tap the microphone on your keyboard and speak your Parent Win.'
    );
  }

  async function handleSubmit() {
    try {
      const currentValidation = validateParentWinContent(content);

      if (!currentValidation.valid) {
        Alert.alert(
          'Edit Your Win',
          currentValidation.message || 'Please edit your Parent Win.'
        );
        return;
      }

      setSubmitting(true);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Request timed out. Please try again.')),
          12000
        )
      );

      await Promise.race([
        submitParentWinPost({
          content,
        }),
        timeoutPromise,
      ]);

      setContent('');

      Alert.alert(
        'Submitted for Review',
        'Your Parent Win was submitted. If approved, it may appear on the board after review.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.log('Parent Win submit error:', error);

      Alert.alert('Could Not Submit', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={22} color="#5B21B6" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Share a Win</Text>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroIcon}>
              <Ionicons name="sparkles-outline" size={32} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>A Small Win Counts</Text>

            <Text style={styles.heroText}>
              Share one short, positive moment that may encourage another
              caregiver today.
            </Text>
          </View>

          <View style={styles.promptCard}>
            <View style={styles.promptTopRow}>
              <View style={styles.promptIcon}>
                <Ionicons name="heart-circle-outline" size={22} color="#7C3AED" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.promptLabel}>Today’s Prompt</Text>
                <Text style={styles.promptText}>{prompt}</Text>
              </View>
            </View>
          </View>

          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Write your win</Text>
                <Text style={styles.helperText}>
                  Keep it short, kind, and safe for the community.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.micButton}
                onPress={focusForTalkToText}
              >
                <Ionicons name="mic-outline" size={18} color="#7C3AED" />
                <Text style={styles.micButtonText}>Talk</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              ref={inputRef}
              value={content}
              onChangeText={setContent}
              style={styles.textInput}
              placeholder="No win is too small. Share something positive from today."
              placeholderTextColor="#A78BFA"
              multiline
              maxLength={500}
              textAlignVertical="top"
              returnKeyType="default"
            />

            <View style={styles.inputFooter}>
              <Text
                style={[
                  styles.validationText,
                  content.length > 0 &&
                    !validation.valid &&
                    styles.validationError,
                ]}
              >
                {content.length > 0 && !validation.valid
                  ? validation.message
                  : 'Avoid names, photos, medical advice, schools, addresses, or private details.'}
              </Text>

              <Text style={styles.characterCount}>{characterCount}/500</Text>
            </View>
          </View>

          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#0F766E" />

            <View style={{ flex: 1 }}>
              <Text style={styles.safetyTitle}>Reviewed before posting</Text>

              <Text style={styles.safetyText}>
                Parent Wins are text-only and reviewed before appearing on the
                board to help keep the community safe and supportive.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!validation.valid || submitting) && styles.disabledButton,
            ]}
            disabled={!validation.valid || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit for Review</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },

  keyboardWrap: {
    flex: 1,
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#3B0764',
  },

  headerSpacer: {
    width: 42,
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
    borderRadius: 34,
    padding: 24,
    marginBottom: 16,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -80,
    right: -60,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(254, 243, 199, 0.2)',
    bottom: -70,
    left: -40,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#EDE9FE',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  promptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  promptTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  promptIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  promptLabel: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },

  promptText: {
    color: '#3B0764',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 25,
  },

  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3B0764',
    marginBottom: 8,
  },

  helperText: {
    color: '#7E22CE',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 12,
  },

  micButton: {
    borderRadius: 999,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  micButtonText: {
    marginLeft: 5,
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '900',
  },

  textInput: {
    minHeight: 170,
    borderRadius: 24,
    backgroundColor: '#FDF4FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 16,
    color: '#3B0764',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },

  inputFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  validationText: {
    flex: 1,
    color: '#7E22CE',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },

  validationError: {
    color: '#DC2626',
  },

  characterCount: {
    color: '#7E22CE',
    fontSize: 12,
    fontWeight: '900',
  },

  safetyCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  safetyTitle: {
    marginLeft: 10,
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '900',
  },

  safetyText: {
    marginLeft: 10,
    marginTop: 4,
    color: '#115E59',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  submitButton: {
    height: 58,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },

  submitButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.45,
  },
});