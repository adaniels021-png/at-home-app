import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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

type ActivityQueueItem = {
  id: string;
  title: string | null;
  category: string | null;
  location: string | null;
  time: string | null;
  description: string | null;
  try_this: string[] | null;
  why_it_helps: string | null;
  materials: string[] | null;
  status: ActivityStatus | string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
  pro_only: boolean;
};

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
  {
    id: 'archived',
    label: 'Archived',
    description: 'Hide from Daily Adventures without deleting',
  },
];

function cleanListText(value: string) {
  return value
    .split('\n')
    .map((item) => item.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}

function listToText(value: any) {
  if (!Array.isArray(value)) return '';
  return value.filter(Boolean).join('\n');
}

function normalizeCategory(value: any): ActivityCategory {
  const clean = String(value || 'home').toLowerCase().trim();

  if (
    clean === 'home' ||
    clean === 'outdoor' ||
    clean === 'community' ||
    clean === 'movement' ||
    clean === 'sensory' ||
    clean === 'creative' ||
    clean === 'calm' ||
    clean === 'surprise'
  ) {
    return clean;
  }

  return 'home';
}

function normalizeStatus(value: any): ActivityStatus {
  const clean = String(value || 'approved').toLowerCase().trim();

  if (
    clean === 'approved' ||
    clean === 'pending' ||
    clean === 'draft' ||
    clean === 'archived'
  ) {
    return clean;
  }

  return 'approved';
}

export default function EditActivityLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

const source = Array.isArray(params.source)
  ? params.source[0]
  : params.source
    ? String(params.source)
    : 'library';

const tableName = source === 'library' ? 'activity_library' : 'activity_queue';
  const activityId = useMemo(() => {
    const rawId = params.id;

    if (Array.isArray(rawId)) return rawId[0] || '';
    return rawId ? String(rawId) : '';
  }, [params.id]);

  const [originalActivity, setOriginalActivity] =
  useState<ActivityQueueItem | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('home');
  const [status, setStatus] = useState<ActivityStatus>('approved');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('5–10 minutes');
  const [description, setDescription] = useState('');
  const [tryThisText, setTryThisText] = useState('');
  const [whyItHelps, setWhyItHelps] = useState('');
  const [materialsText, setMaterialsText] = useState('');
  const [proOnly, setProOnly] = useState(true);

  const [loading, setLoading] = useState(true);
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

  const loadActivity = useCallback(async () => {
    if (!activityId) {
      setLoading(false);
      Alert.alert('Missing Activity', 'No activity ID was provided.', [
        { text: 'Back', onPress: () => router.back() },
      ]);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from(tableName)
        .select(
          'id,title,category,location,time,description,try_this,why_it_helps,materials,status,source,pro_only,created_at,updated_at'
        )
        .eq('id', activityId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        Alert.alert('Activity Not Found', 'This activity could not be found.', [
          { text: 'Back', onPress: () => router.back() },
        ]);
        return;
      }

      const activity = data as ActivityQueueItem;

      setOriginalActivity(activity);
      setTitle(activity.title || '');
      setCategory(normalizeCategory(activity.category));
      setStatus(normalizeStatus(activity.status));
      setLocation(activity.location || '');
      setTime(activity.time || '5–10 minutes');
      setDescription(activity.description || '');
      setTryThisText(listToText(activity.try_this));
      setWhyItHelps(activity.why_it_helps || '');
      setMaterialsText(listToText(activity.materials));
      setProOnly(activity.pro_only !== false);
    } catch (error: any) {
      console.log('Load edit activity error:', error);
      Alert.alert(
        'Activity Error',
        error?.message || 'Could not load this activity.',
        [{ text: 'Back', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  }, [activityId, router, tableName]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const hasChanges = useMemo(() => {
    if (!originalActivity) return false;

    return (
      title.trim() !== String(originalActivity.title || '').trim() ||
      category !== normalizeCategory(originalActivity.category) ||
      status !== normalizeStatus(originalActivity.status) ||
      location.trim() !== String(originalActivity.location || '').trim() ||
      time.trim() !== String(originalActivity.time || '5–10 minutes').trim() ||
      description.trim() !== String(originalActivity.description || '').trim() ||
      tryThisText.trim() !== listToText(originalActivity.try_this).trim() ||
      whyItHelps.trim() !== String(originalActivity.why_it_helps || '').trim() ||
      materialsText.trim() !== listToText(originalActivity.materials).trim() ||
      proOnly !== (originalActivity.pro_only !== false)
    );
  }, [
    originalActivity,
    title,
    category,
    status,
    location,
    time,
    description,
    tryThisText,
    whyItHelps,
    materialsText,
    proOnly,
  ]);

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
    if (!activityId) return;
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
        pro_only: proOnly,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', activityId)
        .select(
          'id,title,category,location,time,description,try_this,why_it_helps,materials,status,source,pro_only,created_at,updated_at'
        )
        .single();

      if (error) throw error;

      const updatedActivity = data as ActivityQueueItem;
      setOriginalActivity(updatedActivity);
      setProOnly(updatedActivity.pro_only !== false);

      const editingPublishedActivity = source === 'library';

      Alert.alert(
        editingPublishedActivity ? 'Activity Updated' : 'Draft Updated',
        editingPublishedActivity
          ? 'The published activity and its availability have been updated.'
          : 'Your review draft has been updated.',
        [
          {
            text: editingPublishedActivity
              ? 'Back to Activity Library'
              : 'Back to Review Queue',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.log('Update activity library error:', error);
      Alert.alert(
        'Save Error',
        error?.message || 'Could not update this activity.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!originalActivity || saving) return;

    try {
      setSaving(true);

      const duplicatePayload = {
        title: `${title.trim() || originalActivity.title || 'Activity'} Copy`,
        category,
        location: location.trim(),
        time: time.trim() || '5–10 minutes',
        description: description.trim(),
        try_this: tryThisList,
        why_it_helps: whyItHelps.trim(),
        materials: materialsList,
        status: 'draft',
        source: 'admin_duplicate',
        pro_only: true,
      };

      const { error } = await supabase
        .from(tableName)
        .insert(duplicatePayload);

      if (error) throw error;

      Alert.alert(
        'Activity Duplicated',
        'A draft copy was created so you can safely edit it later.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.log('Duplicate activity error:', error);
      Alert.alert(
        'Duplicate Error',
        error?.message || 'Could not duplicate this activity.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!activityId || saving) return;

    Alert.alert(
      'Archive Activity?',
      'This will hide the activity from Daily Adventures, but it will stay in your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);

              const { error } = await supabase
                .from(tableName)
                .update({
                  status: 'archived',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', activityId);

              if (error) throw error;

              setStatus('archived');

              Alert.alert('Activity Archived', 'This activity is now archived.');
            } catch (error: any) {
              console.log('Archive activity error:', error);
              Alert.alert(
                'Archive Error',
                error?.message || 'Could not archive this activity.'
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };



  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved edits on this activity.',
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!originalActivity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Activity not found</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={20} color="#7C3AED" />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.headerEyebrow}>Admin</Text>
                <Text style={styles.headerTitle}>Review Activity</Text>
                <Text style={styles.headerSubtitle}>
                  Update this Daily Adventure while keeping it playful and not
                  lesson-style.
                </Text>
              </View>
            </View>

            <View style={styles.headerMetaRow}>
              <View style={styles.headerMetaChip}>
                <Ionicons name="pricetag-outline" size={14} color="#FFFFFF" />
                <Text style={styles.headerMetaText}>
                  {selectedCategoryLabel}
                </Text>
              </View>

              <View style={styles.headerMetaChip}>
                <Ionicons name="radio-button-on-outline" size={14} color="#FFFFFF" />
                <Text style={styles.headerMetaText}>{status}</Text>
              </View>
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

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Availability</Text>

            <View style={styles.availabilityRow}>
              <View style={styles.availabilityTextWrap}>
                <Text style={styles.availabilityTitle}>Pro Activity</Text>
                <Text style={styles.sectionHelper}>
                  Require an active Pro subscription to access this activity.
                </Text>
              </View>

              <Switch
                value={proOnly}
                onValueChange={setProOnly}
                disabled={saving}
                trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                thumbColor={proOnly ? '#7C3AED' : '#FFFFFF'}
              />
            </View>
          </View>

          <View style={styles.adminActionsCard}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            <Text style={styles.sectionHelper}>
              Duplicate creates a draft copy. Archive hides this activity from
              Daily Adventures.
            </Text>

            <View style={styles.adminActionRow}>
              <TouchableOpacity
                style={styles.duplicateButton}
                onPress={handleDuplicate}
                disabled={saving}
              >
                <Ionicons name="copy-outline" size={17} color="#7C3AED" />
                <Text style={styles.duplicateButtonText}>Duplicate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.archiveButton}
                onPress={handleArchive}
                disabled={saving || status === 'archived'}
              >
                <Ionicons name="archive-outline" size={17} color="#B45309" />
                <Text style={styles.archiveButtonText}>
                  {status === 'archived' ? 'Archived' : 'Archive'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.saveCard}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBack}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (saving || !hasChanges) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
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
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  emptyTitle: {
    marginTop: 12,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
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
  headerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 18,
  },
  headerMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  headerMetaText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'capitalize',
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
  availabilityRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  availabilityTextWrap: {
    flex: 1,
  },
  availabilityTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  adminActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  adminActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  duplicateButton: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  duplicateButtonText: {
    marginLeft: 7,
    color: '#7C3AED',
    fontWeight: '900',
  },
  archiveButton: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  archiveButtonText: {
    marginLeft: 7,
    color: '#B45309',
    fontWeight: '900',
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
    opacity: 0.5,
  },
  saveButtonText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
