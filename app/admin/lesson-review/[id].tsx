// app/admin/lesson-review/[id].tsx

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

import { supabase } from '../../../lib/supabase';

type LessonQualityStatus = 'draft' | 'reviewed' | 'approved' | 'needs_revision';

type LessonLibraryItem = {
  id: string;
  category: string;
  skill_area: string;
  stage_number: number;
  stage_name: string;
  lesson_type: string | null;
  title: string;
  description: string | null;
  goal: string | null;
  materials: string[] | null;
  steps: string[] | null;
  caregiver_tips: string[] | null;
  why_skill_matters: string | null;
  mastery_criteria: string | null;
  next_lesson_preview: string | null;
  setup_instructions: string | null;
  parent_script: string | null;
  expected_child_response: string | null;
  prompting_tips: string[] | null;
  reinforcement_tips: string[] | null;
  if_child_struggles: string[] | null;
  easy_version: string | null;
  harder_version: string | null;
  generalization_ideas: string[] | null;
  safety_notes: string[] | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  pro_only: boolean;
  is_active: boolean;
  admin_notes: string | null;
  quality_status: LessonQualityStatus | string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export default function LessonReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lesson, setLesson] = useState<LessonLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [goal, setGoal] = useState('');
const [whySkillMatters, setWhySkillMatters] = useState('');
const [masteryCriteria, setMasteryCriteria] = useState('');
const [nextLessonPreview, setNextLessonPreview] = useState('');
const [materialsText, setMaterialsText] = useState('');
const [stepsText, setStepsText] = useState('');
const [caregiverTipsText, setCaregiverTipsText] = useState('');
const [setupInstructions, setSetupInstructions] = useState('');
const [parentScript, setParentScript] = useState('');
const [expectedChildResponse, setExpectedChildResponse] = useState('');
const [promptingTipsText, setPromptingTipsText] = useState('');
const [reinforcementTipsText, setReinforcementTipsText] = useState('');
const [ifChildStrugglesText, setIfChildStrugglesText] = useState('');
const [easyVersion, setEasyVersion] = useState('');
const [harderVersion, setHarderVersion] = useState('');
const [generalizationIdeasText, setGeneralizationIdeasText] = useState('');
const [safetyNotesText, setSafetyNotesText] = useState('');
const [difficulty, setDifficulty] = useState('');
const [estimatedMinutes, setEstimatedMinutes] = useState('');

  const [adminNotes, setAdminNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [proOnly, setProOnly] = useState(false);
  const [qualityStatus, setQualityStatus] =
    useState<LessonQualityStatus>('draft');

  const isApproved = qualityStatus === 'approved';

  useEffect(() => {
    if (id) void loadLesson();
  }, [id]);

  async function loadLesson() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('lesson_library')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        Alert.alert('Lesson Not Found', 'This lesson could not be found.');
        router.back();
        return;
      }

      syncLessonState(data as LessonLibraryItem);
    } catch (error: any) {
      console.error('Load lesson review error:', error);
      Alert.alert('Error', error?.message || 'Could not load lesson.');
    } finally {
      setLoading(false);
    }
  }

  function syncLessonState(item: LessonLibraryItem) {
  setLesson(item);
  setTitle(item.title || '');
  setDescription(item.description || '');
  setGoal(item.goal || '');
  setWhySkillMatters(item.why_skill_matters || '');
  setMasteryCriteria(item.mastery_criteria || '');
  setNextLessonPreview(item.next_lesson_preview || '');
  setMaterialsText(arrayToText(item.materials));
  setStepsText(arrayToText(item.steps));
  setCaregiverTipsText(arrayToText(item.caregiver_tips));
  setSetupInstructions(item.setup_instructions || '');
setParentScript(item.parent_script || '');
setExpectedChildResponse(item.expected_child_response || '');
setPromptingTipsText(arrayToText(item.prompting_tips));
setReinforcementTipsText(arrayToText(item.reinforcement_tips));
setIfChildStrugglesText(arrayToText(item.if_child_struggles));
setEasyVersion(item.easy_version || '');
setHarderVersion(item.harder_version || '');
setGeneralizationIdeasText(arrayToText(item.generalization_ideas));
setSafetyNotesText(arrayToText(item.safety_notes));
setDifficulty(item.difficulty || '');
setEstimatedMinutes(
  item.estimated_minutes ? String(item.estimated_minutes) : ''
);
  setAdminNotes(item.admin_notes || '');
  setIsActive(Boolean(item.is_active));
  setProOnly(Boolean(item.pro_only));
  setQualityStatus((item.quality_status as LessonQualityStatus) || 'draft');
}

 async function saveLesson(statusOverride?: LessonQualityStatus) {
  if (!lesson?.id) return;

  try {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const nextStatus = statusOverride || qualityStatus;
    const now = new Date().toISOString();

    const updatePayload = {
  title: title.trim(),
  description: description.trim() || null,
  goal: goal.trim() || null,
  why_skill_matters: whySkillMatters.trim() || null,
  materials: textToArray(materialsText),
  steps: textToArray(stepsText),
  caregiver_tips: textToArray(caregiverTipsText),
  setup_instructions: setupInstructions.trim() || null,
parent_script: parentScript.trim() || null,
expected_child_response: expectedChildResponse.trim() || null,
prompting_tips: textToArray(promptingTipsText),
reinforcement_tips: textToArray(reinforcementTipsText),
if_child_struggles: textToArray(ifChildStrugglesText),
easy_version: easyVersion.trim() || null,
harder_version: harderVersion.trim() || null,
generalization_ideas: textToArray(generalizationIdeasText),
safety_notes: textToArray(safetyNotesText),
difficulty: difficulty.trim() || null,
estimated_minutes: estimatedMinutes.trim()
  ? Number(estimatedMinutes.trim())
  : null,

  quality_status: nextStatus,
  admin_notes: adminNotes.trim() || null,
  is_active: nextStatus === 'approved' ? true : isActive,
  pro_only: proOnly,
  reviewed_by: user?.email || null,
  reviewed_at:
    nextStatus === 'approved' || nextStatus === 'reviewed'
      ? now
      : lesson.reviewed_at,
  updated_at: now,
};

    const { error } = await supabase
      .from('lesson_library')
      .update(updatePayload)
      .eq('id', lesson.id);

    if (error) throw error;

    const updatedLesson: LessonLibraryItem = {
      ...lesson,
      ...updatePayload,
    };

    syncLessonState(updatedLesson);

    Alert.alert(
      'Saved',
      nextStatus === 'approved'
        ? 'This lesson is now approved and active in the library.'
        : 'Your review changes were saved.'
    );
  } catch (error: any) {
    console.error('Save lesson review error:', error);
    Alert.alert('Save Error', error?.message || 'Could not save lesson.');
  } finally {
    setSaving(false);
  }
}

  function confirmArchive() {
  Alert.alert(
    'Archive Lesson?',
    'This will hide the lesson from the app but keep it saved in your library.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => void archiveLesson(),
      },
    ]
  );
}

async function archiveLesson() {
  if (!lesson?.id) return;

  try {
    setSaving(true);

    const now = new Date().toISOString();

    const updatePayload = {
      quality_status: 'needs_revision' as LessonQualityStatus,
      is_active: false,
      admin_notes: adminNotes.trim() || null,
      updated_at: now,
    };

    const { error } = await supabase
      .from('lesson_library')
      .update(updatePayload)
      .eq('id', lesson.id);

    if (error) throw error;

    syncLessonState({
      ...lesson,
      ...updatePayload,
    });

    Alert.alert('Archived', 'This lesson is now hidden from the app.');
  } catch (error: any) {
    console.error('Archive lesson error:', error);
    Alert.alert('Archive Error', error?.message || 'Could not archive lesson.');
  } finally {
    setSaving(false);
  }
}

function confirmDelete() {
  Alert.alert(
    'Delete Lesson?',
    'This permanently deletes this lesson from the library.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteLesson(),
      },
    ]
  );
}

async function deleteLesson() {
  if (!lesson?.id) return;

  try {
    setSaving(true);

    const { error } = await supabase
      .from('lesson_library')
      .delete()
      .eq('id', lesson.id);

    if (error) throw error;

    Alert.alert('Deleted', 'This lesson was deleted.', [
      {
        text: 'OK',
        onPress: () => router.replace('/admin/lesson-library' as any),
      },
    ]);
  } catch (error: any) {
    console.error('Delete lesson error:', error);
    Alert.alert('Delete Error', error?.message || 'Could not delete lesson.');
  } finally {
    setSaving(false);
  }
}

function confirmApprove() {
  Alert.alert(
    'Approve Lesson?',
    'This will mark the lesson as approved and active in the library.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => void saveLesson('approved'),
      },
    ]
  );
}

  function arrayToText(items?: string[] | null) {
  return (items || []).join('\n');
}

function textToArray(text: string) {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2E1065" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Review Lesson</Text>
          <Text style={styles.headerSubtitle}>Admin-approved library</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, isApproved && styles.heroCardApproved]}>
          <Text style={styles.statusLabel}>{qualityStatus.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.lessonTitle}>{title || lesson.title}</Text>
          <Text style={styles.lessonMeta}>
            {lesson.category} • {lesson.skill_area} • Stage {lesson.stage_number}
          </Text>
        </View>

        <EditField label="Title" value={title} onChangeText={setTitle} />

<EditField
  label="Description"
  value={description}
  onChangeText={setDescription}
  multiline
/>

<EditField
  label="Goal"
  value={goal}
  onChangeText={setGoal}
  multiline
/>

<EditField
  label="Why This Skill Matters"
  value={whySkillMatters}
  onChangeText={setWhySkillMatters}
  multiline
/>

<EditField
  label="Materials - one per line"
  value={materialsText}
  onChangeText={setMaterialsText}
  multiline
/>

<EditField
  label="Mastery Criteria"
  value={masteryCriteria}
  onChangeText={setMasteryCriteria}
  multiline
/>

<EditField
  label="Next Lesson Preview"
  value={nextLessonPreview}
  onChangeText={setNextLessonPreview}
  multiline
/>

<EditField
  label="Teaching Steps - one per line"
  value={stepsText}
  onChangeText={setStepsText}
  multiline
/>

<EditField
  label="Caregiver Tips - one per line"
  value={caregiverTipsText}
  onChangeText={setCaregiverTipsText}
  multiline
/>
        <EditField
  label="Setup Instructions"
  value={setupInstructions}
  onChangeText={setSetupInstructions}
  multiline
/>

<EditField
  label="Parent Script"
  value={parentScript}
  onChangeText={setParentScript}
  multiline
/>

<EditField
  label="Expected Child Response"
  value={expectedChildResponse}
  onChangeText={setExpectedChildResponse}
  multiline
/>

<EditField
  label="Prompting Tips - one per line"
  value={promptingTipsText}
  onChangeText={setPromptingTipsText}
  multiline
/>

<EditField
  label="Reinforcement Tips - one per line"
  value={reinforcementTipsText}
  onChangeText={setReinforcementTipsText}
  multiline
/>

<EditField
  label="If Child Struggles - one per line"
  value={ifChildStrugglesText}
  onChangeText={setIfChildStrugglesText}
  multiline
/>

<EditField
  label="Easy Version"
  value={easyVersion}
  onChangeText={setEasyVersion}
  multiline
/>

<EditField
  label="Harder Version"
  value={harderVersion}
  onChangeText={setHarderVersion}
  multiline
/>

<EditField
  label="Generalization Ideas - one per line"
  value={generalizationIdeasText}
  onChangeText={setGeneralizationIdeasText}
  multiline
/>

<EditField
  label="Safety Notes - one per line"
  value={safetyNotesText}
  onChangeText={setSafetyNotesText}
  multiline
/>

<EditField
  label="Difficulty"
  value={difficulty}
  onChangeText={setDifficulty}
/>

<EditField
  label="Estimated Minutes"
  value={estimatedMinutes}
  onChangeText={setEstimatedMinutes}
  keyboardType="number-pad"
/>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Admin Review</Text>

          <Text style={styles.inputLabel}>Quality Status</Text>

          <View style={styles.statusRow}>
            {(['draft', 'reviewed', 'approved', 'needs_revision'] as LessonQualityStatus[]).map(
              (status) => {
                const active = qualityStatus === status;

                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                    onPress={() => setQualityStatus(status)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        active && styles.statusChipTextActive,
                      ]}
                    >
                      {status.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <ToggleRow label="Active in app" value={isActive} onPress={() => setIsActive((p) => !p)} />
          <ToggleRow label="Pro only" value={proOnly} onPress={() => setProOnly((p) => !p)} />

          <Text style={styles.inputLabel}>Admin Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            value={adminNotes}
            onChangeText={setAdminNotes}
            placeholder="Add review notes, edits needed, or approval comments..."
            placeholderTextColor="#94A3B8"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={() => void saveLesson()}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={19} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Review</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
  style={[styles.archiveButton, saving && { opacity: 0.6 }]}
  disabled={saving}
  onPress={confirmArchive}
>
  <Ionicons name="archive-outline" size={19} color="#FFFFFF" />
  <Text style={styles.archiveButtonText}>Deactivate / Archive Lesson</Text>
</TouchableOpacity>

<TouchableOpacity
  style={[styles.deleteButton, saving && { opacity: 0.6 }]}
  disabled={saving}
  onPress={confirmDelete}
>
  <Ionicons name="trash-outline" size={19} color="#FFFFFF" />
  <Text style={styles.deleteButtonText}>Delete Lesson Permanently</Text>
</TouchableOpacity>

        {!isApproved ? (
          <TouchableOpacity
            style={[styles.approveButton, saving && { opacity: 0.6 }]}
            disabled={saving}
            onPress={confirmApprove}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>Approve Lesson</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.approvedNotice}>
            <Ionicons name="checkmark-circle" size={20} color="#047857" />
            <Text style={styles.approvedNoticeText}>
              Approved and active lessons can be selected by the lesson library.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.editCard}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholder="Add content..."
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}


function ToggleRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.toggleLabel}>{label}</Text>

      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '700',
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextWrap: { flex: 1, marginLeft: 12 },

  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2E1065',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },

  content: {
    padding: 20,
    paddingBottom: 120,
  },

  heroCard: {
    backgroundColor: '#5B3FF4',
    borderRadius: 30,
    padding: 22,
    marginBottom: 16,
  },

  heroCardApproved: {
    backgroundColor: '#059669',
  },

  statusLabel: {
    color: '#DDD6FE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },

  lessonTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },

  lessonMeta: {
    marginTop: 10,
    color: '#EDE9FE',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },

  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  reviewTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 8,
  },

  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  statusChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  statusChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  statusChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  statusChipTextActive: { color: '#FFFFFF' },

  toggleRow: {
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#F1E7FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  toggleLabel: {
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '900',
  },

  toggle: {
    width: 50,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    padding: 3,
  },

  toggleActive: { backgroundColor: '#7C3AED' },

  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },

  notesInput: {
    minHeight: 110,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    textAlignVertical: 'top',
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },

  saveButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },

  saveButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  approveButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  approveButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  approvedNotice: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  approvedNoticeText: {
    flex: 1,
    marginLeft: 8,
    color: '#047857',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },

  editCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 16,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E9D5FF',
},

editLabel: {
  fontSize: 14,
  fontWeight: '900',
  color: '#2E1065',
  marginBottom: 8,
},

editInput: {
  minHeight: 52,
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  borderRadius: 16,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: '#0F172A',
  fontSize: 14,
  fontWeight: '700',
},

editInputMultiline: {
  minHeight: 130,
  lineHeight: 21,
},

archiveButton: {
  height: 56,
  borderRadius: 20,
  backgroundColor: '#DC2626',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  marginBottom: 12,
},

archiveButtonText: {
  marginLeft: 8,
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
},

deleteButton: {
  height: 56,
  borderRadius: 20,
  backgroundColor: '#991B1B',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  marginBottom: 12,
},

deleteButtonText: {
  marginLeft: 8,
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
},
});