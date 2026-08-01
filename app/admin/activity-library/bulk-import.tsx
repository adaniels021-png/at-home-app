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

import { supabase } from '../../../lib/supabase';

type ImportActivity = {
  title: string;
  category?: string;
  location?: string;
  time?: string;
  description?: string;
  try_this?: string[];
  why_it_helps?: string;
  status?: string;
  source?: string;
};

const SAMPLE_JSON = `[
  {
    "title": "Bubble Chase",
    "category": "outdoor",
    "location": "Backyard, park, or sidewalk",
    "time": "5–10 minutes",
    "description": "Blow bubbles and turn it into a playful chase, pop, and laugh adventure.",
    "try_this": [
      "Let your child pop bubbles with hands, feet, or a bubble wand.",
      "Pause before blowing more bubbles and see how your child asks for more.",
      "Try big bubbles, tiny bubbles, fast bubbles, and slow bubbles."
    ],
    "why_it_helps": "Supports movement, shared attention, communication, and joyful connection through play.",
    "status": "approved",
    "source": "bulk_import"
  }
]`;

function normalizeCategory(category?: string) {
  const value = String(category || 'surprise').toLowerCase().trim();

  const allowed = [
    'home',
    'outdoor',
    'community',
    'sensory',
    'creative',
    'calm',
    'movement',
    'surprise',
  ];

  return allowed.includes(value) ? value : 'surprise';
}

function cleanActivity(item: ImportActivity) {
  return {
    title: String(item.title || '').trim(),
    category: normalizeCategory(item.category),
    location: String(item.location || 'Home, outside, or community').trim(),
    time: String(item.time || '5–10 minutes').trim(),
    description: String(item.description || '').trim(),
    try_this: Array.isArray(item.try_this)
      ? item.try_this.map((step) => String(step).trim()).filter(Boolean)
      : [],
    why_it_helps: String(item.why_it_helps || '').trim(),
    status: item.status || 'approved',
    source: item.source || 'bulk_import',
    pro_only: true,
    updated_at: new Date().toISOString(),
  };
}

export default function BulkImportActivitiesScreen() {
  const router = useRouter();

  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [importing, setImporting] = useState(false);

  const parsedActivities = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map(cleanActivity)
        .filter((activity) => activity.title.length > 0);
    } catch {
      return [];
    }
  }, [jsonText]);

  const handleImport = async () => {
  if (parsedActivities.length === 0) {
    Alert.alert(
      'Nothing to import',
      'Paste a valid JSON array with at least one activity title.'
    );
    return;
  }

  Alert.alert(
    'Import Activities?',
    `This will add new activities and skip duplicates by title.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        onPress: async () => {
          try {
            setImporting(true);

            const titles = parsedActivities.map((item) => item.title);

            const { data: existing, error: existingError } = await supabase
              .from('activity_library')
              .select('title')
              .in('title', titles);

            if (existingError) throw existingError;

            const existingTitles = new Set(
              (existing || []).map((item: any) =>
                String(item.title || '').toLowerCase().trim()
              )
            );

            const newActivities = parsedActivities.filter(
              (activity) =>
                !existingTitles.has(activity.title.toLowerCase().trim())
            );

            if (newActivities.length === 0) {
              Alert.alert(
                'No New Activities',
                'All of these activities already exist in the library.'
              );
              return;
            }

            const { error } = await supabase
              .from('activity_library')
              .insert(newActivities);

            if (error) throw error;

            Alert.alert(
              'Import Complete',
              `${newActivities.length} new activities were added. ${
                parsedActivities.length - newActivities.length
              } duplicates were skipped.`,
              [
                {
                  text: 'View Library',
                  onPress: () => router.replace('/admin/activity-library'),
                },
              ]
            );
          } catch (error: any) {
            console.log('Bulk import activities error:', error);

            Alert.alert(
              'Import Failed',
              error?.message || 'Could not import activities.'
            );
          } finally {
            setImporting(false);
          }
        },
      },
    ]
  );
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

          <Text style={styles.eyebrow}>Admin Tool</Text>
          <Text style={styles.title}>Bulk Import Activities</Text>
          <Text style={styles.subtitle}>
            Paste a JSON list of Daily Adventures and add them to the activity
            library.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#7C3AED" />
          <Text style={styles.infoText}>
            Keep these fun and playful. Avoid lesson language, goals, trials,
            prompting, and clinical wording.
          </Text>
        </View>

        <View style={styles.countCard}>
          <Text style={styles.countLabel}>Ready to import</Text>
          <Text style={styles.countValue}>{parsedActivities.length}</Text>
        </View>

        <Text style={styles.inputLabel}>Activities JSON</Text>

        <TextInput
          value={jsonText}
          onChangeText={setJsonText}
          style={styles.jsonInput}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.importButton, importing && styles.disabledButton]}
          onPress={handleImport}
          disabled={importing}
          activeOpacity={0.85}
        >
          {importing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.importButtonText}>Import Activities</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sampleButton}
          onPress={() => setJsonText(SAMPLE_JSON)}
        >
          <Text style={styles.sampleButtonText}>Load Sample</Text>
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
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#6D28D9',
    fontWeight: '700',
    lineHeight: 20,
  },
  countCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  countLabel: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countValue: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '900',
  },
  inputLabel: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  jsonInput: {
    minHeight: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 16,
  },
  importButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  importButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
  sampleButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  sampleButtonText: {
    color: '#7C3AED',
    fontWeight: '900',
  },
});
