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
import { planWorksheetAssets } from '../../lib/worksheetAssetPlanner';
import { buildWorksheetDNA } from '../../lib/worksheetDNA';
import { buildWorksheetLayout } from '../../lib/worksheetLayoutBuilder';
import { findBestMatchingWorksheets } from '../../lib/worksheetMatcher';
import { interpretWorksheetPrompt } from '../../lib/worksheetSkillInterpreter';
import {
  CATEGORIES,
  DifficultyLevel,
  WorksheetCategory,
} from '../../lib/worksheetTemplates';

const DIFFICULTY_OPTIONS: DifficultyLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
];

function buildFullPageWorksheetArtPrompt({
  worksheet,
  interpretation,
  assetPlan,
  category,
  difficulty,
  childName,
  focus,
}: any) {
  const skill = interpretation?.targetSkill || worksheet.title;
  const worksheetStyle = interpretation?.worksheetStyle || worksheet.id;

  return `
Create ONE complete premium printable children's worksheet page.

APP / BRAND:
ABA at Home

PAGE:
US Letter worksheet, portrait orientation, print-ready, full-page design.

STYLE:
Premium children's activity worksheet.
Bright, colorful, kid-friendly, polished, professional.
Use beautiful cartoon illustrations, not icons.
Use playful educational worksheet design similar to a premium preschool activity book.
Clean white background with colorful accents.
Rounded borders, cheerful section headers, large child-friendly activity areas.
No clutter. No tiny text.

IMPORTANT:
The entire worksheet should be one complete illustrated page.
Do not create a phone screen.
Do not create app UI.
Do not create separate icons floating randomly.
Do not make it look clinical.
Do not make it look like a plain template.
Do not mention autism on the worksheet.
Do not use stock-photo style.
Use high-quality cartoon illustrations.

WORKSHEET IDEA:
${focus || worksheet.title}

TARGET SKILL:
${skill}

CATEGORY:
${category}

DIFFICULTY:
${difficulty}

CHILD NAME:
${childName}

WORKSHEET TYPE / STYLE:
${worksheetStyle}

TITLE TO DISPLAY:
${worksheet.title}

DESCRIPTION:
${worksheet.description}

CREATE:
A kid-friendly ABA-based worksheet that teaches or practices this skill using:
- large cartoon illustrations
- simple child directions
- clear activity spaces
- coloring, tracing, matching, sequencing, circling, cut/paste, or drawing depending on the skill
- a small ABA parent guide box at the bottom

IF THIS IS A ROUTINE OR TASK ANALYSIS:
Show the steps in order with big colorful illustrated step cards.
Each step should have a cute cartoon picture.
Use simple step labels.

IF THIS IS MATCHING OR SORTING:
Use large cartoon pictures and clear spaces for matching/sorting.

IF THIS IS TRACING OR PRE-WRITING:
Use dashed tracing paths, big cartoon characters, and fun destination objects.

IF THIS IS BEHAVIOR OR REGULATION:
Use calm cartoon visuals, feeling faces, simple coping choices, and child-friendly language.

SUGGESTED ILLUSTRATION SUBJECTS:
${assetPlan?.assets?.map((asset: any) => `- ${asset.title || asset.key}: ${asset.prompt || ''}`).join('\n') || '- Use illustrations that directly match the worksheet idea.'}

BOTTOM PARENT GUIDE:
Include a small clean parent/caregiver guide box at the bottom with:
Goal:
How to help:

Make the worksheet feel like something a parent would gladly print and a child would want to complete.
`;
}

export default function WorksheetGeneratorScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<WorksheetCategory>('Visual Routines');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [childName, setChildName] = useState('Child');
  const [theme, setTheme] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const worksheetOptions = useMemo(() => {
    return findBestMatchingWorksheets({
      prompt: theme || category,
      category,
      difficulty,
      maxResults: 1,
    });
  }, [theme, category, difficulty]);

  async function createDrafts() {
    try {
      setSaving(true);
      setCreatedCount(0);

      const focus = theme.trim();
      const safeChildName = childName.trim() || 'Child';

      const drafts = await Promise.all(
        worksheetOptions.map(async (worksheet) => {
          const interpretation = interpretWorksheetPrompt(focus || worksheet.title, {
            category,
            difficulty,
          });

          const assetPlan = planWorksheetAssets({
            interpretation,
            category,
            difficulty,
            childName: safeChildName,
            customization: focus || null,
          });

          const requiredAssetKeys = assetPlan.requiredAssetKeys || [];

          const layout = buildWorksheetLayout({
            templateId: worksheet.id,
            title: worksheet.title,
            category: worksheet.category,
            difficulty,
            childName: safeChildName,
            description: worksheet.description,
            practiceNote: focus || null,
            requiredAssetKeys,
            resolvedAssets: [],
          });

          const dna = buildWorksheetDNA({
            templateId: worksheet.id,
            title: worksheet.title,
            category: worksheet.category,
            difficulty,
            ageRange: worksheet.ageRange,
            childName: safeChildName,
            description: worksheet.description,
            customization: focus || null,
            requiredAssetKeys,
          });

          const fullPageArtPrompt = buildFullPageWorksheetArtPrompt({
            worksheet,
            interpretation,
            assetPlan,
            category,
            difficulty,
            childName: safeChildName,
            focus,
          });

          return {
            template_id: worksheet.id,
            worksheet_dna: dna,
            title: worksheet.title,
            category: worksheet.category,
            description: worksheet.description,
            age_range: worksheet.ageRange,
            difficulty,
            child_name: safeChildName,
            practice_note: focus || null,

            required_asset_keys: requiredAssetKeys,
            resolved_asset_urls: {},
            missing_asset_keys: requiredAssetKeys,

            asset_plan: assetPlan,
            asset_prompts: assetPlan.assets,

            full_page_art_prompt: fullPageArtPrompt,
            full_page_art_url: null,

            layout_json: layout,
            layout_type: layout.layoutType,

            status: 'pending',
            source: 'full_page_ai_art_draft',
            updated_at: new Date().toISOString(),
          };
        })
      );

      const { error } = await supabase.from('worksheet_queue').insert(drafts);

      if (error) throw error;

      setCreatedCount(drafts.length);

      Alert.alert(
        'Worksheet Draft Created',
        `"${drafts[0].title}" was created.\n\nNext: generate the full-page worksheet artwork using the saved full-page prompt.`,
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'Review Queue',
            onPress: () => router.push('/admin/worksheet-review' as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Save Error', error?.message || 'Could not create worksheet draft.');
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
            Create full-page premium worksheet art prompts for admin review.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="image-outline" size={20} color="#7C3AED" />
          <Text style={styles.infoText}>
            This now creates a full-page worksheet art prompt, not a plain box layout.
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

        <Text style={styles.label}>Worksheet Idea</Text>
        <Text style={styles.helperText}>
          Type the worksheet you want. The engine will turn it into a full illustrated printable page prompt.
        </Text>

        <View style={styles.quickIdeaWrap}>
          {[
            'Bedtime routine',
            'Morning routine',
            'Tooth brushing',
            'Washing hands',
            'Potty training',
            'Dinosaurs',
            'Vehicles',
            'Favorite foods',
          ].map((idea) => {
            const active = theme === idea;

            return (
              <TouchableOpacity
                key={idea}
                style={[styles.quickIdeaChip, active && styles.quickIdeaChipActive]}
                onPress={() => setTheme(idea)}
              >
                <Text style={[styles.quickIdeaText, active && styles.quickIdeaTextActive]}>
                  {idea}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          value={theme}
          onChangeText={setTheme}
          style={[styles.input, styles.themeInput]}
          multiline
          textAlignVertical="top"
          placeholder="Example: washing hands worksheet with cute cartoon bathroom illustrations and 6 step cards..."
          placeholderTextColor="#94A3B8"
        />

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

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Best Worksheet Match</Text>
          <Text style={styles.previewText}>
            This template guides the worksheet structure, but the final goal is a full-page illustrated worksheet.
          </Text>

          {worksheetOptions.map((worksheet) => (
            <View key={worksheet.id} style={styles.previewRow}>
              <Ionicons name="document-outline" size={18} color="#7C3AED" />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewRowText}>{worksheet.title}</Text>
                <Text style={styles.previewDescription}>{worksheet.description}</Text>
              </View>
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
              <Text style={styles.generateButtonText}>Create Premium Worksheet Draft</Text>
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
  previewDescription: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 8,
    marginTop: 3,
    fontWeight: '600',
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
  helperText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: -3,
    marginBottom: 10,
  },
  quickIdeaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickIdeaChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  quickIdeaChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  quickIdeaText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
  },
  quickIdeaTextActive: {
    color: '#FFFFFF',
  },
});