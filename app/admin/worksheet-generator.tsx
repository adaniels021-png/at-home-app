import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { supabase } from '../../lib/supabase';
import {
    buildWorksheetHtml,
    CATEGORIES,
    DifficultyLevel,
    WorksheetCategory,
    WORKSHEETS,
} from '../../lib/worksheetTemplates';

const DIFFICULTY_OPTIONS: DifficultyLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
];

export default function WorksheetGeneratorScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<WorksheetCategory>('Visual Routines');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [childName, setChildName] = useState('Child');
  const [theme, setTheme] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const worksheetOptions = useMemo(() => {
    return WORKSHEETS.filter((worksheet) => worksheet.category === category);
  }, [category]);

  async function createDrafts() {
    try {
      setSaving(true);
      setCreatedCount(0);

      const drafts = worksheetOptions.map((worksheet) => {
        const customWorksheet = {
          ...worksheet,
          title: theme.trim() ? `${worksheet.title}: ${theme.trim()}` : worksheet.title,
          description: theme.trim()
            ? `${worksheet.description} Theme/focus: ${theme.trim()}`
            : worksheet.description,
        };

        return {
          title: customWorksheet.title,
          category: customWorksheet.category,
          description: customWorksheet.description,
          age_range: customWorksheet.ageRange,
          difficulty,
          child_name: childName.trim() || 'Child',
          html: buildWorksheetHtml({
            worksheet: customWorksheet,
            childName: childName.trim() || 'Child',
            difficulty,
          }),
          status: 'pending',
          source: 'template_draft',
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase.from('worksheet_queue').insert(drafts);

      if (error) throw error;

      setCreatedCount(drafts.length);

      Alert.alert(
        'Worksheet Drafts Created',
        `${drafts.length} worksheet draft(s) were saved for review.`,
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'Review Queue',
            onPress: () => router.push('/admin/worksheet-review' as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Save Error',
        error?.message || 'Could not create worksheet drafts.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#7C3AED" />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>Admin Generator</Text>
          <Text style={styles.title}>Worksheet Generator</Text>
          <Text style={styles.subtitle}>
            Create printable worksheet drafts, then approve them before adding them to the app.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="document-text-outline" size={20} color="#7C3AED" />
          <Text style={styles.infoText}>
            These save to the worksheet review queue as pending drafts.
          </Text>
        </View>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.filter((item) => item !== 'All').map((item) => {
            const active = category === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(item as WorksheetCategory)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item}
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

        <Text style={styles.label}>Child Name</Text>
        <TextInput
          value={childName}
          onChangeText={setChildName}
          style={styles.input}
          placeholder="Child"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Optional Theme / Focus</Text>
        <TextInput
          value={theme}
          onChangeText={setTheme}
          style={[styles.input, styles.themeInput]}
          multiline
          textAlignVertical="top"
          placeholder="Example: bedtime routine, grocery store, handwashing, asking for help..."
          placeholderTextColor="#94A3B8"
        />

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Drafts to Create</Text>
          <Text style={styles.previewText}>
            {worksheetOptions.length} worksheet template(s) in {category}
          </Text>

          {worksheetOptions.slice(0, 4).map((worksheet) => (
            <View key={worksheet.id} style={styles.previewRow}>
              <Ionicons name="document-outline" size={18} color="#7C3AED" />
              <Text style={styles.previewRowText}>{worksheet.title}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.generateButton, saving && styles.disabledButton]}
          onPress={createDrafts}
          disabled={saving || worksheetOptions.length === 0}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Create Worksheet Drafts</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/admin/worksheet-review' as any)}
        >
          <Text style={styles.secondaryButtonText}>Go to Worksheet Review Queue</Text>
        </TouchableOpacity>

        {createdCount > 0 ? (
          <Text style={styles.createdText}>
            {createdCount} worksheet draft(s) created.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  content: {
    padding: 20,
    paddingBottom: 100,
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
    minHeight: 110,
    lineHeight: 20,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  previewTitle: {
    color: '#2E1065',
    fontSize: 17,
    fontWeight: '900',
  },
  previewText: {
    marginTop: 5,
    color: '#64748B',
    fontWeight: '800',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  previewRowText: {
    marginLeft: 8,
    color: '#1E1B4B',
    fontWeight: '800',
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
  createdText: {
    textAlign: 'center',
    color: '#047857',
    fontWeight: '900',
    marginTop: 6,
  },
});