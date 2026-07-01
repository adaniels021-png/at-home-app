import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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

import { supabase } from '../../../lib/supabase';

type ActivityStatus = 'approved' | 'pending' | 'draft' | 'archived';

type ActivityCategory =
  | 'home'
  | 'outdoor'
  | 'community'
  | 'movement'
  | 'sensory'
  | 'creative'
  | 'calm'
  | 'surprise';

const CATEGORY_OPTIONS: {
  id: ActivityCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'home', label: 'At Home', icon: 'home-outline' },
  { id: 'outdoor', label: 'Outdoor', icon: 'leaf-outline' },
  { id: 'community', label: 'Community', icon: 'car-outline' },
  { id: 'movement', label: 'Movement', icon: 'walk-outline' },
  { id: 'sensory', label: 'Sensory', icon: 'color-palette-outline' },
  { id: 'creative', label: 'Creative', icon: 'brush-outline' },
  { id: 'calm', label: 'Calm', icon: 'moon-outline' },
  { id: 'surprise', label: 'Surprise', icon: 'sparkles-outline' },
];

const STATUS_OPTIONS: {
  id: ActivityStatus;
  label: string;
  description: string;
}[] = [
  {
    id: 'approved',
    label: 'Approved',
    description: 'Can appear in Daily Adventures',
  },
  {
    id: 'pending',
    label: 'Pending',
    description: 'Needs review before appearing',
  },
  {
    id: 'draft',
    label: 'Draft',
    description: 'Save privately for later editing',
  },
];

function cleanListText(value: string) {
  return value
    .split('\n')
    .map((item) => item.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}

function defaultTryThisText() {
  return [
    'Keep it playful and flexible.',
    'Follow your child’s interest.',
    'Celebrate small moments of connection.',
  ].join('\n');
}

export default function NewActivityLibraryScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('home');
  const [status, setStatus] = useState<ActivityStatus>('approved');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('5–10 minutes');
  const [description, setDescription] = useState('');
  const [tryThisText, setTryThisText] = useState(defaultTryThisText());
  const [whyItHelps, setWhyItHelps] = useState('');
  const [materialsText, setMaterialsText] = useState('');
  const [saving, setSaving] = useState(false);

  const tryThisList = useMemo(() => cleanListText(tryThisText), [tryThisText]);
  const materialsList = useMemo(
    () => cleanListText(materialsText),
    [materialsText]
  );

  const selectedCategoryLabel = useMemo(() => {
    return (
      CATEGORY_OPTIONS.find((item) => item.id === category)?.label ||
      'Activity'
    );
  }, [category]);

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Add a short, parent-friendly activity title.');
      return false;
    }

    if (!description.trim()) {
      Alert.alert(
        'Missing Description',
        'Add a short description that makes this feel fun and easy to try.'
      );
      return false;
    }

    if (tryThisList.length < 2) {
      Alert.alert(
        'Add Try This Ideas',
        'Add at least 2 simple playful ideas in the Try This section.'
      );
      return false;
    }

    if (!whyItHelps.trim()) {
      Alert.alert(
        'Missing Why It Helps',
        'Add a short parent-friendly note about why this activity supports growth.'
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        title: title.trim(),
        category,
        location:
          location.trim() ||
          (category === 'home'
            ? 'Home'
            : category === 'outdoor'
            ? 'Outside, backyard, park, or sidewalk'
            : category === 'community'
            ? 'Community outing'
            : selectedCategoryLabel),
        time: time.trim() || '5–10 minutes',
        description: description.trim(),
        try_this: tryThisList,
        why_it_helps: whyItHelps.trim(),
        materials: materialsList,
        status,
        source: 'admin',
      };

      const { error } = await supabase.from('activity_library').insert(payload);

      if (error) throw error;

      Alert.alert(
        'Activity Saved',
        status === 'approved'
          ? 'This activity is approved and can now appear in Daily Adventures.'
          : 'This activity has been saved.',
        [
          {
            text: 'Add Another',
            onPress: () => {
              setTitle('');
              setCategory('home');
              setStatus('approved');
              setLocation('');
              setTime('5–10 minutes');
              setDescription('');
              setTryThisText(defaultTryThisText());
              setWhyItHelps('');
              setMaterialsText('');
            },
          },
          {
            text: 'Back to Library',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.log('Create activity library error:', error);
      Alert.alert(
        'Save Error',
        error?.message || 'Could not save this activity.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      title.trim() ||
      description.trim() ||
      whyItHelps.trim() ||
      materialsText.trim()
    ) {
      Alert.alert(
        'Discard Activity?',
        'Your new activity has not been saved yet.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
                <Ionicons name="chevron-back" size={20} color="#7C3AED" />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.headerEyebrow}>Admin</Text>
                <Text style={styles.headerTitle}>New Activity</Text>
                <Text style={styles.headerSubtitle}>
                  Add a fun Daily Adventure. Keep it playful, parent-friendly,
                  and not lesson-style.
                </Text>
              </View>
            </View>

            <View style={styles.headerHintBox}>
              <Ionicons name="happy-outline" size={18} color="#FFFFFF" />
              <Text style={styles.headerHintText}>
                Think “simple family fun” — no trials, drills, goals, or data
                language.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Activity Details</Text>

            <FieldLabel label="Title" required />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Bubble Chase"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <FieldLabel label="Short Description" required />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the activity in a fun, low-pressure way."
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.twoColumnRow}>
              <View style={styles.twoColumnItem}>
                <FieldLabel label="Location" />
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Home, park, store..."
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>

              <View style={styles.twoColumnItem}>
                <FieldLabel label="Time" />
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="5–10 minutes"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.sectionHelper}>
              Choose where this activity fits best.
            </Text>

            <View style={styles.optionGrid}>
              {CATEGORY_OPTIONS.map((item) => {
                const active = category === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.categoryOption,
                      active && styles.categoryOptionActive,
                    ]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={17}
                      color={active ? '#FFFFFF' : '#7C3AED'}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        active && styles.categoryOptionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Try This</Text>
            <Text style={styles.sectionHelper}>
              Add each playful idea on its own line.
            </Text>

            <TextInput
              value={tryThisText}
              onChangeText={setTryThisText}
              placeholder={'Blow bubbles slowly\nPause and wait for a gesture\nTry silly bubble sounds'}
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.largeTextArea]}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Preview</Text>
              {tryThisList.length === 0 ? (
                <Text style={styles.previewEmpty}>No ideas added yet.</Text>
              ) : (
                tryThisList.map((item, index) => (
                  <Text key={`${item}-${index}`} style={styles.previewBullet}>
                    • {item}
                  </Text>
                ))
              )}
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Why It Helps</Text>

            <TextInput
              value={whyItHelps}
              onChangeText={setWhyItHelps}
              placeholder="Example: Supports movement, shared attention, communication, and joyful connection through play."
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Optional Materials</Text>
            <Text style={styles.sectionHelper}>
              Only add materials if they are truly needed. One per line.
            </Text>

            <TextInput
              value={materialsText}
              onChangeText={setMaterialsText}
              placeholder={'Bubbles\nBubble wand'}
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Status</Text>

            {STATUS_OPTIONS.map((item) => {
              const active = status === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.statusOption, active && styles.statusOptionActive]}
                  onPress={() => setStatus(item.id)}
                >
                  <View
                    style={[
                      styles.statusRadio,
                      active && styles.statusRadioActive,
                    ]}
                  >
                    {active && <View style={styles.statusRadioDot} />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.statusOptionTitle,
                        active && styles.statusOptionTitleActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.statusOptionText,
                        active && styles.statusOptionTextActive,
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.saveCard}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Activity</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  keyboardWrap: {
    flex: 1,
  },
  pageContent: {
    padding: 20,
    paddingBottom: 50,
  },
  headerCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerEyebrow: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  headerTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 6,
    color: '#F3E8FF',
    lineHeight: 20,
    fontWeight: '700',
  },
  headerHintBox: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerHintText: {
    flex: 1,
    marginLeft: 8,
    color: '#FFFFFF',
    lineHeight: 19,
    fontWeight: '700',
    fontSize: 13,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  sectionHelper: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 7,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    minHeight: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  textArea: {
    minHeight: 100,
    lineHeight: 20,
  },
  largeTextArea: {
    minHeight: 150,
    lineHeight: 21,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  twoColumnItem: {
    flex: 1,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  categoryOptionActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  categoryOptionText: {
    marginLeft: 6,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  previewBox: {
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  previewTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 7,
  },
  previewEmpty: {
    color: '#92400E',
    fontWeight: '700',
  },
  previewBullet: {
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  statusOptionActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
  },
  statusRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  statusRadioActive: {
    borderColor: '#7C3AED',
  },
  statusRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },
  statusOptionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  statusOptionTitleActive: {
    color: '#5B21B6',
  },
  statusOptionText: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  statusOptionTextActive: {
    color: '#6D28D9',
  },
  saveCard: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '900',
  },
  saveButton: {
    flex: 1.4,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
