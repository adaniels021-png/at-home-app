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

import {
  ACTIVITY_CATEGORIES,
  ActivityCategory,
  requireActivityCategory,
} from '../../../lib/activityCategories';
import { normalizeActivities } from '../../../lib/activities';
import { generateDailyABAActivities } from '../../../lib/aiService';
import { supabase } from '../../../lib/supabase';

type ActivityGenerationMode = ActivityCategory | 'surprise';

const CATEGORY_OPTIONS: ActivityGenerationMode[] = [
  'surprise',
  ...ACTIVITY_CATEGORIES,
];

const LOCATION_MAP: Record<ActivityGenerationMode, string> = {
  home: 'Home',
  outdoor: 'Outdoor',
  community: 'Community',
  sensory: 'Sensory play',
  creative: 'Creative play',
  calm: 'Calm and quiet play',
  movement: 'Movement and active play',
  surprise: 'Home, outdoor, or community',
};

function normalizeCategory(category?: string): ActivityCategory {
  const value = String(category || 'surprise').toLowerCase().trim();
  return requireActivityCategory(value);
}

function buildPrompt({
  category,
  theme,
  avoidTitles,
}: {
  category: ActivityGenerationMode;
  theme: string;
  avoidTitles: string[];
}) {
  const categoryText =
    category === 'surprise'
      ? 'Mix home, outdoor, community, sensory, creative, calm, and movement ideas.'
      : `Only create activities in the "${category}" category.`;

  return `
Generate fun Daily Adventures for ABA at Home.

These are NOT lessons.
They should feel like playful family activity suggestions.

${categoryText}

Theme or focus:
${theme || 'Simple playful activities for parents and children ages 3–7.'}

Each activity must include:
- title
- category
- location
- time
- description
- try_this: 3 short playful ideas
- why_it_helps

Tone:
- warm
- parent-friendly
- simple
- playful
- low-pressure

Avoid:
- lesson language
- therapy plan language
- measurable goals
- "child will"
- trials
- prompting hierarchy
- data collection language
- clinical wording
- worksheets
- formal teaching

Do not repeat or closely copy these existing activity titles:
${
  avoidTitles.length
    ? avoidTitles.map((title) => `- ${title}`).join('\n')
    : '- None'
}
`;
}

function cleanGeneratedActivity(activity: any, category: ActivityGenerationMode) {
  const title = String(activity?.title || activity?.name || '').trim();

  return {
    title,
    category:
      category === 'surprise'
        ? normalizeCategory(activity?.category)
        : category,
    location: String(
      activity?.location || LOCATION_MAP[category] || LOCATION_MAP.surprise
    ).trim(),
    time: String(activity?.time || '5–10 minutes').trim(),
    description: String(activity?.description || '').trim(),
    try_this: Array.isArray(activity?.try_this)
      ? activity.try_this.map((item: any) => String(item).trim()).filter(Boolean)
      : Array.isArray(activity?.instructions)
      ? activity.instructions
          .map((item: any) => String(item).trim())
          .filter(Boolean)
      : [],
    why_it_helps: String(
      activity?.why_it_helps ||
        activity?.whyItHelps ||
        activity?.success_criteria ||
        ''
    ).trim(),
    status: 'pending',
    source: 'ai_draft',
    updated_at: new Date().toISOString(),
  };
}

export default function AIGenerateActivitiesScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<ActivityGenerationMode>('surprise');
  const [countText, setCountText] = useState('10');
  const [theme, setTheme] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewActivities, setPreviewActivities] = useState<any[]>([]);

  const count = useMemo(() => {
    const parsed = Number(countText);
    if (Number.isNaN(parsed)) return 10;
    return Math.min(Math.max(parsed, 1), 25);
  }, [countText]);

  const loadExistingTitles = async () => {
    const { data, error } = await supabase
      .from('activity_queue')
      .select('title')
      .order('updated_at', { ascending: false })
      .limit(300);

    if (error) {
      console.log('Load existing activity titles error:', error);
      return [];
    }

    return (data || [])
      .map((item: any) => String(item.title || '').trim())
      .filter(Boolean);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setPreviewActivities([]);

      const existingTitles = await loadExistingTitles();

      const generated = await generateDailyABAActivities({
        childName: 'your child',
        location: LOCATION_MAP[category],
        skillFocus: buildPrompt({
          category,
          theme,
          avoidTitles: existingTitles,
        }),
        assessmentContext: {},
        recentLessons: [],
        recentRoutines: [],
        count,
      });

      const normalized = normalizeActivities(generated);

      const cleaned = normalized
        .map((activity: any) => cleanGeneratedActivity(activity, category))
        .map((activity: any) => ({ ...activity, pro_only: true }))
        .filter((activity: any) => activity.title && activity.description);

      if (cleaned.length === 0) {
        Alert.alert(
          'No Activities Created',
          'AI did not return usable activities. Try again with a clearer theme.'
        );
        return;
      }

      const { error } = await supabase
        .from('activity_queue')
        .insert(cleaned);

      if (error) throw error;

      setPreviewActivities(cleaned);

      Alert.alert(
        'Drafts Created',
        `${cleaned.length} AI activity drafts were saved as pending review.`,
        [
          {
            text: 'Stay Here',
            style: 'cancel',
          },
          {
            text: 'Review Library',
            onPress: () => router.replace('/admin/activity-review'),
          },
        ]
      );
    } catch (error: any) {
      console.log('AI generate activities error:', error);

      Alert.alert(
        'Generation Failed',
        error?.message || 'Could not generate activity drafts.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#7C3AED" />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>Admin AI Tool</Text>
          <Text style={styles.title}>Generate Activities</Text>
          <Text style={styles.subtitle}>
            Let AI draft playful Daily Adventures, then review and approve them
            before families see them.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="sparkles-outline" size={20} color="#7C3AED" />
          <Text style={styles.infoText}>
            These save as pending drafts. They will not show in the real app
            until you approve them.
          </Text>
        </View>

        <Text style={styles.label}>Category</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORY_OPTIONS.map((item) => {
            const active = category === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>How many?</Text>

        <TextInput
          value={countText}
          onChangeText={setCountText}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="10"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.label}>Optional theme or focus</Text>

        <TextInput
          value={theme}
          onChangeText={setTheme}
          style={[styles.input, styles.themeInput]}
          multiline
          textAlignVertical="top"
          placeholder="Example: rainy day activities, grocery store activities, calm bedtime activities..."
          placeholderTextColor="#94A3B8"
        />

        <TouchableOpacity
          style={[styles.generateButton, generating && styles.disabledButton]}
          onPress={handleGenerate}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>
                Generate Pending Drafts
              </Text>
            </>
          )}
        </TouchableOpacity>

        {previewActivities.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Recently Created Drafts</Text>

            {previewActivities.map((activity, index) => (
              <View key={`${activity.title}-${index}`} style={styles.previewCard}>
                <Text style={styles.previewCardTitle}>{activity.title}</Text>
                <Text style={styles.previewMeta}>
                  {activity.category} · {activity.time}
                </Text>
                <Text style={styles.previewText}>{activity.description}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
  style={styles.secondaryButton}
  onPress={() => router.push('/admin/activity-review')}
>
  <Text style={styles.secondaryButtonText}>Go to Review Queue</Text>
</TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  pageContent: {
    padding: 20,
    paddingBottom: 70,
  },
  headerCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
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
    fontSize: 28,
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
  categoryRow: {
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  categoryChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  categoryChipText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
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
  previewSection: {
    marginTop: 20,
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
    textTransform: 'capitalize',
  },
  previewText: {
    marginTop: 8,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  secondaryButtonText: {
    color: '#7C3AED',
    fontWeight: '900',
  },
});
