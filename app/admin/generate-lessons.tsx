import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

import { generatePremiumLesson } from '../../lib/aiService';
import { useAdminAccess } from '../../lib/adminAccess';
import { CURRICULUM, CURRICULUM_CATEGORIES } from '../../lib/curriculum';
import { supabase } from '../../lib/supabase';

const DIFFICULTY_OPTIONS = ['support', 'balanced', 'challenge'];

function toArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split('\n').map((x) => x.trim()).filter(Boolean);
  return [];
}

function cleanText(value: any) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function GenerateLessonsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
  category?: string;
  skill?: string;
  stage?: string;
  stageNumber?: string;
}>();

  const { loading: checkingAdmin, isAdmin } = useAdminAccess();

  const [category, setCategory] = useState('Communication');
  const [skillArea, setSkillArea] = useState('');
  const [countText, setCountText] = useState('5');
  const [stageStartText, setStageStartText] = useState('1');
  const [selectedStage, setSelectedStage] = useState('');
  const [difficulty, setDifficulty] = useState('balanced');
  const [theme, setTheme] = useState('');

  const [generating, setGenerating] = useState(false);
  const [previewLessons, setPreviewLessons] = useState<any[]>([]);

const skillOptions = useMemo(() => {
  const selectedCategory = CURRICULUM.find((item) => item.title === category);
  return selectedCategory?.skills.map((skill) => skill.title) ?? [];
}, [category]);

const stageOptions = useMemo(() => {
  const selectedCategory = CURRICULUM.find((item) => item.title === category);
  const selectedSkill = selectedCategory?.skills.find(
    (item) => item.title === skillArea
  );

  return selectedSkill?.stages ?? [];
}, [category, skillArea]);

useEffect(() => {
  if (!params.stage) {
    setSelectedStage(stageOptions[0] || '');
    setStageStartText('1');
  }
}, [stageOptions, params.stage]);

  const count = useMemo(() => {
    const parsed = Number(countText);
    if (Number.isNaN(parsed)) return 5;
    return Math.min(Math.max(parsed, 1), 20);
  }, [countText]);

  const stageStart = useMemo(() => {
    const parsed = Number(stageStartText);
    if (Number.isNaN(parsed)) return 1;
    return Math.max(parsed, 1);
  }, [stageStartText]);

  useEffect(() => {
  if (params.category) {
    setCategory(String(params.category));
  }

  if (params.skill) {
    setSkillArea(String(params.skill));
  }

  if (params.stage) {
    setSelectedStage(String(params.stage));
  }

  if (params.stageNumber) {
    setStageStartText(String(params.stageNumber));
  }
}, [params.category, params.skill, params.stage, params.stageNumber]);

  useEffect(() => {
  if (!params.skill) {
    setSkillArea(skillOptions[0] || '');
  }
}, [category, skillOptions, params.skill]);

  async function handleGenerate() {
    if (!category.trim()) {
      Alert.alert('Missing Category', 'Choose a lesson category first.');
      return;
    }

    if (!skillArea.trim()) {
      Alert.alert('Missing Skill Area', 'Choose or type a skill area first.');
      return;
    }

    try {
      setGenerating(true);
      setPreviewLessons([]);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const createdLessons: any[] = [];

      for (let index = 0; index < count; index += 1) {
        const stageNumber = stageStart + index;

        const result = await generatePremiumLesson({
          childName: 'your child',
          childId: 'admin-preview',
          skill: category,
          location: 'Home',
          lessonNumber: stageNumber,
          difficultyTrend:
            difficulty === 'challenge'
              ? 'increase'
              : difficulty === 'support'
                ? 'decrease'
                : 'maintain',
          skillTarget: skillArea,
          lessonVarietyGuidance:
            theme ||
            'Create a fresh parent-led lesson that feels different from the last lesson while staying simple and realistic.',
          avoidSkills: createdLessons.map((lesson) => lesson.title),
        });


        const lesson = result.lesson;

        const payload = {
          category: category.trim(),
          skill_area: cleanText(lesson.focus_skill) || skillArea.trim(),
          stage_number: stageNumber,
          stage_name: selectedStage || `Stage ${stageNumber}`,
          lesson_type: 'guided_practice',
          title: cleanText(lesson.lesson_name) || `${skillArea} Practice`,
          description: cleanText(lesson.objective) || null,
          goal: cleanText(lesson.objective) || null,
          materials: toArray(lesson.materials),
          steps: toArray(lesson.teaching_steps),
          caregiver_tips: toArray([
            lesson.parent_coaching_note,
            lesson.lesson_variation,
          ]),
          why_skill_matters:
            cleanText(lesson.difficulty_reason) ||
            `This lesson supports ${skillArea} through short parent-led practice.`,

         setup_instructions: toArray(lesson.setup),
          parent_script: null,
          prompting_tips: toArray(lesson.prompting_hierarchy),
          reinforcement_tips: toArray(lesson.reinforcement),
          if_child_struggles: toArray(lesson.error_correction),
          easy_version:
            difficulty === 'support'
              ? 'Use fewer steps, stronger modeling, and faster reinforcement.'
              : null,
          harder_version:
            difficulty === 'challenge'
              ? 'Increase wait time, fade prompts, or practice in a new routine.'
              : null,
          generalization_ideas: toArray(lesson.generalization),
          safety_notes: [],
          difficulty,
          estimated_minutes: 5,
          pro_only: true,
          is_active: false,
          admin_notes: `AI draft generated from admin tool. Source: ${result.source}.`,
          quality_status: 'draft',
          reviewed_by: user?.email || null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('lesson_library')
          .insert(payload)
          .select('*')
          .single();

        if (error) throw error;

        createdLessons.push(data);
        setPreviewLessons([...createdLessons]);
      }

      Alert.alert(
        'Draft Lessons Created',
        `${createdLessons.length} lesson draft(s) were saved for review.`,
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'Review Queue',
            onPress: () => router.replace('/admin/lesson-review' as any),
          },
        ]
      );
    } catch (error: any) {
      console.error('Generate lesson drafts error:', error);
      Alert.alert(
        'Generation Failed',
        error?.message || 'Could not generate lesson drafts.'
      );
    } finally {
      setGenerating(false);
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
          <Text style={styles.emptyText}>
            This page is only available to the app admin.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#7C3AED" />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>Admin AI Tool</Text>
          <Text style={styles.title}>Generate Lessons</Text>
          <Text style={styles.subtitle}>
            Create draft parent-led lessons, review them, then approve before they appear in the app.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="sparkles-outline" size={20} color="#7C3AED" />
          <Text style={styles.infoText}>
            These save as inactive drafts. Families will not see them until you approve them.
          </Text>
        </View>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CURRICULUM_CATEGORIES.map((item) => {
            const active = category === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Skill Area</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {skillOptions.map((item) => {
            const active = skillArea === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSkillArea(item)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TextInput
          value={skillArea}
          onChangeText={setSkillArea}
          style={styles.input}
          placeholder="Or type a custom skill area"
          placeholderTextColor="#94A3B8"
        />

        <View>
  <Text style={styles.label}>How many?</Text>
  <TextInput
    value={countText}
    onChangeText={setCountText}
    keyboardType="number-pad"
    style={styles.input}
    placeholder="5"
    placeholderTextColor="#94A3B8"
  />
</View>

<Text style={styles.label}>Stage</Text>
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.chipRow}
>
  {stageOptions.map((item, index) => {
    const active = selectedStage === item;

    return (
      <TouchableOpacity
        key={item}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => {
          setSelectedStage(item);
          setStageStartText(String(index + 1));
        }}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          Stage {index + 1}: {item}
        </Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.chipRowWrap}>
          {DIFFICULTY_OPTIONS.map((item) => {
            const active = difficulty === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDifficulty(item)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Optional theme or guidance</Text>
        <TextInput
          value={theme}
          onChangeText={setTheme}
          style={[styles.input, styles.themeInput]}
          multiline
          textAlignVertical="top"
          placeholder="Example: make these more play-based, use snack routines, focus on simple home materials..."
          placeholderTextColor="#94A3B8"
        />

        <TouchableOpacity
          style={[styles.generateButton, generating && styles.disabledButton]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Generate Draft Lessons</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/admin/lesson-review' as any)}
        >
          <Text style={styles.secondaryButtonText}>Go to Lesson Review Queue</Text>
        </TouchableOpacity>

        {previewLessons.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Recently Created Drafts</Text>

            {previewLessons.map((lesson) => (
              <TouchableOpacity
                key={lesson.id}
                style={styles.previewCard}
                onPress={() =>
                  router.push(`/admin/lesson-review/${lesson.id}` as any)
                }
              >
                <Text style={styles.previewCardTitle}>{lesson.title}</Text>
                <Text style={styles.previewMeta}>
                  {lesson.category} · {lesson.skill_area} · Stage {lesson.stage_number}
                </Text>
                {!!lesson.description && (
                  <Text style={styles.previewText} numberOfLines={3}>
                    {lesson.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF7ED',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#2E1065',
  },
  emptyText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 90,
  },
  headerCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: '#F3E8FF',
    lineHeight: 21,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#6D28D9',
    fontWeight: '700',
    lineHeight: 20,
  },
  label: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 6,
  },
  chipRow: {
    paddingBottom: 14,
    gap: 8,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  chipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  chipText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#FED7AA',
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 14,
  },
  themeInput: {
    minHeight: 115,
    lineHeight: 20,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  twoColumnItem: {
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  generateButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  secondaryButtonText: {
    color: '#7C3AED',
    fontWeight: '900',
  },
  previewSection: {
    marginTop: 10,
  },
  previewTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  previewCardTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },
  previewMeta: {
    marginTop: 4,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
  },
  previewText: {
    marginTop: 8,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '700',
  },
});
