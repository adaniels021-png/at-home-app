import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'adaniels021@gmail.com';

export default function CreateLessonScreen() {
  const router = useRouter();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState('Communication');
  const [skillArea, setSkillArea] = useState('');
  const [stageNumber, setStageNumber] = useState('1');
  const [stageName, setStageName] = useState('');
  const [lessonType, setLessonType] = useState('guided_practice');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [materials, setMaterials] = useState('');
  const [steps, setSteps] = useState('');
  const [caregiverTips, setCaregiverTips] = useState('');
  const [whySkillMatters, setWhySkillMatters] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');
  const [parentScript, setParentScript] = useState('');
  const [expectedChildResponse, setExpectedChildResponse] = useState('');
  const [promptingTips, setPromptingTips] = useState('');
  const [reinforcementTips, setReinforcementTips] = useState('');
  const [ifChildStruggles, setIfChildStruggles] = useState('');
  const [easyVersion, setEasyVersion] = useState('');
  const [harderVersion, setHarderVersion] = useState('');
  const [generalizationIdeas, setGeneralizationIdeas] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [difficulty, setDifficulty] = useState('balanced');
  const [estimatedMinutes, setEstimatedMinutes] = useState('5');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const allowed = user?.email === ADMIN_EMAIL;
      setIsAdmin(allowed);
      setCheckingAdmin(false);
    }

    void checkAdmin();
  }, []);

  function toArray(value: string) {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function saveLesson() {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please add a lesson title.');
      return;
    }

    if (!skillArea.trim()) {
      Alert.alert('Missing Skill Area', 'Please add a skill area.');
      return;
    }

    if (!category.trim()) {
      Alert.alert('Missing Category', 'Please add a category.');
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from('lesson_library').insert({
        category: category.trim(),
        skill_area: skillArea.trim(),
        stage_number: Number(stageNumber) || 1,
        stage_name: stageName.trim() || `Stage ${Number(stageNumber) || 1}`,
        lesson_type: lessonType.trim() || 'guided_practice',
        title: title.trim(),
        description: description.trim() || null,
        goal: goal.trim() || null,
        materials: toArray(materials),
        steps: toArray(steps),
        caregiver_tips: toArray(caregiverTips),
        why_skill_matters: whySkillMatters.trim() || null,
        setup_instructions: setupInstructions.trim() || null,
        parent_script: parentScript.trim() || null,
        expected_child_response: expectedChildResponse.trim() || null,
        prompting_tips: toArray(promptingTips),
        reinforcement_tips: toArray(reinforcementTips),
        if_child_struggles: toArray(ifChildStruggles),
        easy_version: easyVersion.trim() || null,
        harder_version: harderVersion.trim() || null,
        generalization_ideas: toArray(generalizationIdeas),
        safety_notes: toArray(safetyNotes),
        difficulty: difficulty.trim() || 'balanced',
        estimated_minutes: Number(estimatedMinutes) || 5,
        pro_only: false,
        is_active: true,
        admin_notes: adminNotes.trim() || null,
        quality_status: 'draft',
        reviewed_by: user?.email || null,
        reviewed_at: null,
      });

      if (error) throw error;

      Alert.alert('Lesson Saved', 'This lesson was saved as a draft.', [
        {
          text: 'View Queue',
          onPress: () => router.replace('/admin/lesson-review' as any),
        },
      ]);
    } catch (error: any) {
      console.error('Create lesson error:', error);
      Alert.alert('Save Error', error?.message || 'Could not save lesson.');
    } finally {
      setSaving(false);
    }
  }

  if (checkingAdmin) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Admin Only</Text>
          <Text style={styles.emptyText}>This page is only available to the app admin.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2E1065" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Create Lesson</Text>
          <Text style={styles.headerSubtitle}>Save a draft for review</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Input label="Category" value={category} onChangeText={setCategory} />
        <Input label="Skill Area" value={skillArea} onChangeText={setSkillArea} />
        <Input label="Stage Number" value={stageNumber} onChangeText={setStageNumber} keyboardType="numeric" />
        <Input label="Stage Name" value={stageName} onChangeText={setStageName} />
        <Input label="Lesson Type" value={lessonType} onChangeText={setLessonType} />
        <Input label="Lesson Title" value={title} onChangeText={setTitle} />
        <Input label="Description" value={description} onChangeText={setDescription} multiline />
        <Input label="Goal" value={goal} onChangeText={setGoal} multiline />
        <Input label="Materials - one per line" value={materials} onChangeText={setMaterials} multiline />
        <Input label="Teaching Steps - one per line" value={steps} onChangeText={setSteps} multiline />
        <Input label="Caregiver Tips - one per line" value={caregiverTips} onChangeText={setCaregiverTips} multiline />
        <Input label="Why This Skill Matters" value={whySkillMatters} onChangeText={setWhySkillMatters} multiline />
        <Input label="Setup Instructions" value={setupInstructions} onChangeText={setSetupInstructions} multiline />
        <Input label="Parent Script" value={parentScript} onChangeText={setParentScript} multiline />
        <Input label="Expected Child Response" value={expectedChildResponse} onChangeText={setExpectedChildResponse} multiline />
        <Input label="Prompting Tips - one per line" value={promptingTips} onChangeText={setPromptingTips} multiline />
        <Input label="Reinforcement Tips - one per line" value={reinforcementTips} onChangeText={setReinforcementTips} multiline />
        <Input label="If Child Struggles - one per line" value={ifChildStruggles} onChangeText={setIfChildStruggles} multiline />
        <Input label="Easy Version" value={easyVersion} onChangeText={setEasyVersion} multiline />
        <Input label="Harder Version" value={harderVersion} onChangeText={setHarderVersion} multiline />
        <Input label="Generalization Ideas - one per line" value={generalizationIdeas} onChangeText={setGeneralizationIdeas} multiline />
        <Input label="Safety Notes - one per line" value={safetyNotes} onChangeText={setSafetyNotes} multiline />
        <Input label="Difficulty" value={difficulty} onChangeText={setDifficulty} />
        <Input label="Estimated Minutes" value={estimatedMinutes} onChangeText={setEstimatedMinutes} keyboardType="numeric" />
        <Input label="Admin Notes" value={adminNotes} onChangeText={setAdminNotes} multiline />

        <TouchableOpacity style={styles.saveButton} onPress={saveLesson} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Draft Lesson</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Input({ label, multiline, ...props }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput]}
        placeholderTextColor="#A8A29E"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 12, fontSize: 22, fontWeight: '900', color: '#2E1065' },
  emptyText: { marginTop: 8, color: '#64748B', textAlign: 'center', fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
    backgroundColor: '#FFF7ED',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#2E1065' },
  headerSubtitle: { marginTop: 2, color: '#7C3AED', fontWeight: '800' },
  content: { padding: 18, paddingBottom: 140 },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    marginBottom: 7,
    color: '#2E1065',
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  multilineInput: {
    minHeight: 92,
    lineHeight: 20,
  },
  saveButton: {
    marginTop: 12,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#5B3FF4',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});