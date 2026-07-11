import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AiAssetGenerationDraft,
  buildPremiumAssetPrompt,
  createAiAssetGenerationDraft,
  deleteAiAssetGenerationDraft,
  generateImageForAiAssetDraft,
  listAiAssetGenerationDrafts,
  saveGeneratedAssetToLibrary,
} from '../../../lib/aiAssetGenerator';
import {
  AiAssetType,
  AiAssetUsageScope,
} from '../../../lib/aiAssetLibrary';

const ASSET_TYPES: AiAssetType[] = [
  'object',
  'character',
  'person',
  'action',
  'emotion',
  'background',
  'decoration',
  'icon',
  'reward',
  'pecs',
  'other',
];

const USAGE_OPTIONS: AiAssetUsageScope[] = [
  'worksheets',
  'lessons',
  'activities',
  'routine_defaults',
  'pecs_defaults',
  'calm_tools',
  'app_visuals',
];

const STYLE_OPTIONS = [
  'Premium Cartoon',
  'Bun Bun',
  '3D',
  'Minimal',
  'Watercolor',
  'Realistic',
];

const SKILL_OPTIONS = [
  'Communication',
  'Sequencing',
  'Matching',
  'Sorting',
  'Colors',
  'Counting',
  'Emotions',
  'Fine Motor',
  'Gross Motor',
  'Daily Living',
  'Social Skills',
  'Safety',
  'Toileting',
  'Independent Living',
];

function label(value: string) {
  return value.replace(/_/g, ' ');
}

function getStatusLabel(status: string | null) {
  if (status === 'generated') return 'Ready';
  if (status === 'generating') return 'Generating';
  if (status === 'saved') return 'Saved';
  if (status === 'failed') return 'Failed';
  return 'Draft';
}

function getStatusStyle(status: string | null) {
  if (status === 'generated') {
    return { badge: styles.statusReady, text: styles.statusReadyText };
  }

  if (status === 'generating') {
    return { badge: styles.statusGenerating, text: styles.statusGeneratingText };
  }

  if (status === 'saved') {
    return { badge: styles.statusSaved, text: styles.statusSavedText };
  }

  if (status === 'failed') {
    return { badge: styles.statusFailed, text: styles.statusFailedText };
  }

  return { badge: styles.statusDraft, text: styles.statusDraftText };
}

export default function AiAssetGeneratorScreen() {
  const router = useRouter();

  const [items, setItems] = useState<AiAssetGenerationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingDraftId, setWorkingDraftId] = useState<string | null>(null);

  const [assetKey, setAssetKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetType, setAssetType] = useState<AiAssetType>('object');
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [secondaryCategory, setSecondaryCategory] = useState('');
  const [primarySkill, setPrimarySkill] = useState('');
  const [style, setStyle] = useState('Premium Cartoon');
  const [ageRange, setAgeRange] = useState('Ages 3–8');
  const [tagsText, setTagsText] = useState('');
  const [usageScope, setUsageScope] = useState<AiAssetUsageScope[]>([
    'worksheets',
  ]);
  const [transparent, setTransparent] = useState(true);
  const [bunBunReady, setBunBunReady] = useState(false);
  const [premium, setPremium] = useState(true);

  const [selectedDraft, setSelectedDraft] =
    useState<AiAssetGenerationDraft | null>(null);

      const tags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    [tagsText]
  );

  const generatedPrompt = useMemo(() => {
    return buildPremiumAssetPrompt({
      title,
      description,
      assetType,
      primaryCategory,
      primarySkill,
      style,
      ageRange,
      transparent,
    });
  }, [
    title,
    description,
    assetType,
    primaryCategory,
    primarySkill,
    style,
    ageRange,
    transparent,
  ]);

  useEffect(() => {
    loadDrafts();
  }, []);

async function loadDrafts() {
  try {
    const drafts = await listAiAssetGenerationDrafts();

    setItems(drafts);

    setSelectedDraft((currentDraft) => {
      if (!currentDraft) return null;

      return (
        drafts.find((draft) => draft.id === currentDraft.id) || null
      );
    });
  } catch (err: any) {
    Alert.alert(
      'Error',
      err?.message || 'Unable to load generation drafts.'
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}

  function toggleUsage(scope: AiAssetUsageScope) {
    setUsageScope((current) => {
      if (current.includes(scope)) {
        const next = current.filter((s) => s !== scope);
        return next.length ? next : ['worksheets'];
      }

      return [...current, scope];
    });
  }

  async function createDraft() {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title.');
      return;
    }

    try {
      setSaving(true);

      await createAiAssetGenerationDraft({
        prompt: generatedPrompt,
        assetKey,
        title,
        description,
        assetType,
        primaryCategory,
        secondaryCategory,
        primarySkill,
        style,
        usageScope,
        ageRange,
        tags,
        transparent,
        bunBunReady,
        premium,
      });

      Alert.alert(
        'Draft Created',
        'Your AI asset draft has been created.'
      );

      setAssetKey('');
      setTitle('');
      setDescription('');
      setPrimaryCategory('');
      setSecondaryCategory('');
      setPrimarySkill('');
      setTagsText('');

      await loadDrafts();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Unable to create draft.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function generateImage(draft: AiAssetGenerationDraft) {
    try {
      setWorkingDraftId(draft.id);

      await generateImageForAiAssetDraft(draft.id);

      await loadDrafts();

      Alert.alert(
        'Finished',
        'The image was successfully generated.'
      );
    } catch (err: any) {
      Alert.alert(
        'Generation Failed',
        err?.message || 'Unable to generate image.'
      );
    } finally {
      setWorkingDraftId(null);
    }
  }

  async function saveToLibrary(draft: AiAssetGenerationDraft) {
    if (!draft.generated_image_url) {
      Alert.alert(
        'No Image',
        'Generate an image first.'
      );
      return;
    }

    try {
      setWorkingDraftId(draft.id);

      await saveGeneratedAssetToLibrary({
        draft,
      });

      await loadDrafts();

      Alert.alert(
        'Saved',
        'Asset saved to the AI Asset Library.'
      );
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.message || 'Unable to save asset.'
      );
    } finally {
      setWorkingDraftId(null);
    }
  }

  function confirmDelete(draft: AiAssetGenerationDraft) {
    Alert.alert(
      'Delete Draft?',
      `Delete "${draft.title || draft.asset_key}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAiAssetGenerationDraft(draft.id);

setSelectedDraft((currentDraft) =>
  currentDraft?.id === draft.id ? null : currentDraft
);

await loadDrafts();
            } catch (err: any) {
              Alert.alert(
                'Delete Failed',
                err?.message || 'Unable to delete.'
              );
            }
          },
        },
      ]
    );
  }

  function OptionPill({
    active,
    text,
    onPress,
  }: {
    active: boolean;
    text: string;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.optionPill,
          active && styles.optionPillActive,
        ]}
      >
        <Ionicons
          name={
            active
              ? 'checkmark-circle'
              : 'ellipse-outline'
          }
          size={16}
          color={active ? '#fff' : '#7C3AED'}
        />

        <Text
          style={[
            styles.optionPillText,
            active && styles.optionPillTextActive,
          ]}
        >
          {text}
        </Text>
      </TouchableOpacity>
    );
  }
    function renderDraft({ item }: { item: AiAssetGenerationDraft }) {
    const statusStyle = getStatusStyle(item.status);
    const isWorking = workingDraftId === item.id;
    const hasImage = Boolean(item.generated_image_url);
    const isSaved = item.status === 'saved';

    return (
      <TouchableOpacity
        style={styles.draftCard}
        activeOpacity={0.9}
        onPress={() => setSelectedDraft(item)}
      >
        <View style={styles.draftImageWrap}>
          {hasImage ? (
            <Image
              source={{ uri: item.generated_image_url || '' }}
              style={styles.draftImage}
            />
          ) : (
            <View style={styles.draftImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#7C3AED" />
              <Text style={styles.placeholderText}>No image yet</Text>
            </View>
          )}
        </View>

        <View style={styles.draftInfo}>
          <View style={styles.draftTopRow}>
            <Text style={styles.draftTitle} numberOfLines={1}>
              {item.title || item.asset_key || 'Untitled Asset'}
            </Text>

            <View style={[styles.statusBadge, statusStyle.badge]}>
              <Text style={[styles.statusBadgeText, statusStyle.text]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.draftMeta}>Key: {item.asset_key || '—'}</Text>
          <Text style={styles.draftMeta}>
            Type: {label(item.asset_type || 'object')}
          </Text>

          {item.primary_category ? (
            <Text style={styles.draftMeta}>Category: {item.primary_category}</Text>
          ) : null}

          {item.primary_skill ? (
            <Text style={styles.draftMeta}>Skill: {item.primary_skill}</Text>
          ) : null}

          <Text style={styles.promptPreview} numberOfLines={2}>
            {item.prompt}
          </Text>

          {isWorking ? (
            <View style={styles.workingRow}>
              <ActivityIndicator color="#7C3AED" size="small" />
              <Text style={styles.workingText}>Working...</Text>
            </View>
          ) : (
            <View style={styles.draftActions}>
              <TouchableOpacity
                style={styles.generateSmallButton}
                disabled={saving || item.status === 'generating'}
                onPress={() => generateImage(item)}
              >
                <Text style={styles.smallActionText}>
                  {hasImage ? 'Regenerate' : 'Generate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.smallActionButton,
                  isSaved && styles.savedSmallButton,
                ]}
                disabled={saving || isSaved}
                onPress={() => saveToLibrary(item)}
              >
                <Text style={styles.smallActionText}>
                  {isSaved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteSmallButton}
                disabled={saving}
                onPress={() => confirmDelete(item)}
              >
                <Ionicons name="trash-outline" size={17} color="#991B1B" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  const selectedStatusStyle = selectedDraft
    ? getStatusStyle(selectedDraft.status)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#7C3AED" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>AI CONTENT STUDIO</Text>
          <Text style={styles.title}>AI Image Generator</Text>
          <Text style={styles.subtitle}>
            Create image prompts and save approved visuals into the AI Asset Library.
          </Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderDraft}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadDrafts();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Create Asset Draft</Text>

              <TextInput
                value={assetKey}
                onChangeText={setAssetKey}
                style={styles.input}
                placeholder="Asset key: toothbrush-blue"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              <TextInput
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                placeholder="Title: Blue Toothbrush"
                placeholderTextColor="#94A3B8"
              />

              <TextInput
                value={description}
                onChangeText={setDescription}
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                placeholder="Description: blue toothbrush, rounded handle, clean children’s illustration..."
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.smallLabel}>Asset Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {ASSET_TYPES.map((type) => {
                  const active = assetType === type;

                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setAssetType(type)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {label(type)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

                            <TextInput
                value={primaryCategory}
                onChangeText={setPrimaryCategory}
                style={styles.input}
                placeholder="Primary Category: Bathroom"
                placeholderTextColor="#94A3B8"
              />

              <TextInput
                value={secondaryCategory}
                onChangeText={setSecondaryCategory}
                style={styles.input}
                placeholder="Secondary Category: Morning Routine"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.smallLabel}>Primary Skill</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {SKILL_OPTIONS.map((skill) => {
                  const active = primarySkill === skill;

                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setPrimarySkill(skill)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.smallLabel}>Art Style</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {STYLE_OPTIONS.map((styleOption) => {
                  const active = style === styleOption;

                  return (
                    <TouchableOpacity
                      key={styleOption}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setStyle(styleOption)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {styleOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                value={ageRange}
                onChangeText={setAgeRange}
                style={styles.input}
                placeholder="Age Range: Ages 3–8"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.smallLabel}>Usage Scope</Text>
              <View style={styles.wrapRow}>
                {USAGE_OPTIONS.map((scope) => {
                  const active = usageScope.includes(scope);

                  return (
                    <TouchableOpacity
                      key={scope}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleUsage(scope)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {label(scope)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                value={tagsText}
                onChangeText={setTagsText}
                style={styles.input}
                placeholder="Tags: brush, teeth, bathroom, morning"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.smallLabel}>Options</Text>
              <View style={styles.wrapRow}>
                <OptionPill
                  active={transparent}
                  text="Transparent"
                  onPress={() => setTransparent((value) => !value)}
                />

                <OptionPill
                  active={bunBunReady}
                  text="Bun Bun Ready"
                  onPress={() => setBunBunReady((value) => !value)}
                />

                <OptionPill
                  active={premium}
                  text="Premium"
                  onPress={() => setPremium((value) => !value)}
                />
              </View>

              <View style={styles.promptCard}>
                <Text style={styles.promptTitle}>Generated Prompt</Text>
                <Text style={styles.promptText}>{generatedPrompt}</Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={createDraft}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={19} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Create Draft</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.libraryTitle}>Generation Drafts</Text>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={styles.loadingText}>Loading drafts...</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No drafts yet</Text>
              <Text style={styles.emptyText}>
                Create your first AI asset generation draft.
              </Text>
            </View>
          ) : null
        }
      />
            <Modal
        visible={Boolean(selectedDraft)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDraft(null)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedDraft?.title || selectedDraft?.asset_key || 'Asset Preview'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedDraft?.asset_key || 'No asset key'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedDraft(null)}
              >
                <Ionicons name="close" size={22} color="#2E1065" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageCard}>
              {selectedDraft?.generated_image_url ? (
                <Image
                  source={{ uri: selectedDraft.generated_image_url }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="sparkles-outline" size={42} color="#7C3AED" />
                  <Text style={styles.previewPlaceholderTitle}>No image yet</Text>
                  <Text style={styles.previewPlaceholderText}>
                    Generate an image to preview it here.
                  </Text>
                </View>
              )}
            </View>

            {selectedDraft && selectedStatusStyle ? (
              <ScrollView style={styles.modalDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, selectedStatusStyle.badge]}>
                    <Text style={[styles.statusBadgeText, selectedStatusStyle.text]}>
                      {getStatusLabel(selectedDraft.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {label(selectedDraft.asset_type || 'object')}
                  </Text>
                </View>

                {selectedDraft.primary_category ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>
                      {selectedDraft.primary_category}
                    </Text>
                  </View>
                ) : null}

                {selectedDraft.primary_skill ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Skill</Text>
                    <Text style={styles.detailValue}>
                      {selectedDraft.primary_skill}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.promptCard}>
                  <Text style={styles.promptTitle}>Prompt</Text>
                  <Text style={styles.promptText}>{selectedDraft.prompt}</Text>
                </View>
              </ScrollView>
            ) : null}

            {selectedDraft ? (
  <View style={styles.modalActions}>
    <TouchableOpacity
      style={[
        styles.modalGenerateButton,
        workingDraftId === selectedDraft.id && styles.disabledButton,
      ]}
      onPress={() => void generateImage(selectedDraft)}
      disabled={
        saving ||
        workingDraftId === selectedDraft.id ||
        selectedDraft.status === 'generating'
      }
    >
      {workingDraftId === selectedDraft.id ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.modalButtonText}>
          {selectedDraft.generated_image_url
            ? 'Regenerate'
            : 'Generate'}
        </Text>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.modalSaveButton,
        selectedDraft.status === 'saved' &&
          styles.savedSmallButton,
        workingDraftId === selectedDraft.id &&
          styles.disabledButton,
      ]}
      onPress={() => void saveToLibrary(selectedDraft)}
      disabled={
        saving ||
        workingDraftId === selectedDraft.id ||
        selectedDraft.status === 'saved' ||
        !selectedDraft.generated_image_url
      }
    >
      {workingDraftId === selectedDraft.id ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.modalButtonText}>
          {selectedDraft.status === 'saved' ? 'Saved' : 'Save'}
        </Text>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.modalDeleteButton}
      onPress={() => confirmDelete(selectedDraft)}
      disabled={
        saving || workingDraftId === selectedDraft.id
      }
    >
      <Ionicons
        name="trash-outline"
        size={20}
        color="#991B1B"
      />
    </TouchableOpacity>
  </View>
) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },

  content: {
    padding: 18,
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  eyebrow: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  title: {
    color: '#2E1065',
    fontSize: 26,
    fontWeight: '900',
  },

  subtitle: {
    color: '#64748B',
    marginTop: 3,
    fontWeight: '700',
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 16,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 10,
  },

  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  smallLabel: {
    color: '#2E1065',
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 4,
  },

  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },

  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  chipActive: {
    backgroundColor: '#7C3AED',
  },

  chipText: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 12,
  },

  chipTextActive: {
    color: '#fff',
  },

  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },

  optionPillActive: {
    backgroundColor: '#7C3AED',
  },

  optionPillText: {
    marginLeft: 5,
    color: '#7C3AED',
    fontWeight: '800',
  },

  optionPillTextActive: {
    color: '#fff',
  },

  promptCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginVertical: 14,
  },

  promptTitle: {
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 6,
  },

  promptText: {
    color: '#475569',
    lineHeight: 20,
    fontWeight: '700',
  },

  saveButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  libraryTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2E1065',
    marginBottom: 14,
    marginTop: 8,
  },

  loadingBox: {
    padding: 30,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  emptyTitle: {
    fontWeight: '900',
    fontSize: 18,
    color: '#2E1065',
    marginTop: 10,
  },

  emptyText: {
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },

  draftCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 14,
    marginBottom: 14,
  },

  draftImageWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },

  draftImage: {
    width: 170,
    height: 170,
    resizeMode: 'contain',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },

  draftImagePlaceholder: {
    width: 170,
    height: 170,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    marginTop: 8,
    color: '#7C3AED',
    fontWeight: '700',
  },

  draftInfo: {
    flex: 1,
  },

  draftTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  draftTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#1E1B4B',
    marginRight: 8,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontWeight: '900',
    fontSize: 10,
  },

  statusDraft: {
    backgroundColor: '#EDE9FE',
  },

  statusDraftText: {
    color: '#6D28D9',
  },

  statusGenerating: {
    backgroundColor: '#FEF3C7',
  },

  statusGeneratingText: {
    color: '#92400E',
  },

  statusReady: {
    backgroundColor: '#DCFCE7',
  },

  statusReadyText: {
    color: '#166534',
  },

  statusSaved: {
    backgroundColor: '#DBEAFE',
  },

  statusSavedText: {
    color: '#1D4ED8',
  },

  statusFailed: {
    backgroundColor: '#FEE2E2',
  },

  statusFailedText: {
    color: '#991B1B',
  },

  draftMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },

  promptPreview: {
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
    fontSize: 12,
  },

  workingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  workingText: {
    marginLeft: 8,
    color: '#7C3AED',
    fontWeight: '800',
  },

  draftActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  generateSmallButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  smallActionButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  smallActionText: {
    color: '#fff',
    fontWeight: '900',
  },

  deleteSmallButton: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
  },

  modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  justifyContent: 'flex-end',
},
modalSheet: {
  maxHeight: '92%',
  backgroundColor: '#FFF7ED',
  borderTopLeftRadius: 32,
  borderTopRightRadius: 32,
  paddingHorizontal: 18,
  paddingTop: 16,
},
modalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 14,
},
modalTitle: {
  color: '#2E1065',
  fontSize: 22,
  fontWeight: '900',
},
modalSubtitle: {
  marginTop: 2,
  color: '#64748B',
  fontSize: 12,
  fontWeight: '800',
},
modalClose: {
  width: 42,
  height: 42,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E9D5FF',
},
previewImageCard: {
  height: 330,
  backgroundColor: '#FFFFFF',
  borderRadius: 26,
  borderWidth: 1,
  borderColor: '#E9D5FF',
  overflow: 'hidden',
  marginBottom: 14,
},
previewImage: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
},
previewPlaceholder: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  backgroundColor: '#F5F3FF',
},
previewPlaceholderTitle: {
  marginTop: 10,
  color: '#2E1065',
  fontSize: 18,
  fontWeight: '900',
},
previewPlaceholderText: {
  marginTop: 5,
  color: '#64748B',
  textAlign: 'center',
  fontWeight: '700',
},
modalDetails: {
  maxHeight: 210,
},
detailRow: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E9D5FF',
  marginBottom: 8,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
detailLabel: {
  color: '#64748B',
  fontSize: 12,
  fontWeight: '900',
},
detailValue: {
  color: '#2E1065',
  fontSize: 12,
  fontWeight: '900',
},
modalActions: {
  flexDirection: 'row',
  gap: 10,
  paddingVertical: 14,
},
modalGenerateButton: {
  flex: 1,
  backgroundColor: '#10B981',
  borderRadius: 18,
  paddingVertical: 14,
  alignItems: 'center',
},
modalSaveButton: {
  flex: 1,
  backgroundColor: '#7C3AED',
  borderRadius: 18,
  paddingVertical: 14,
  alignItems: 'center',
},
modalButtonText: {
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 14,
},
modalDeleteButton: {
  width: 50,
  borderRadius: 18,
  backgroundColor: '#FEE2E2',
  alignItems: 'center',
  justifyContent: 'center',
},
savedSmallButton: {
  backgroundColor: '#2563EB',
},
});