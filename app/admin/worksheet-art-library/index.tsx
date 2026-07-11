import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  deleteWorksheetArt,
  listWorksheetArt,
  searchWorksheetArt,
  uploadFullPageWorksheetArt,
  uploadWorksheetArt,
  WorksheetArtItem,
} from '../../../lib/worksheetArtLibrary';

type UploadMode = 'reusable' | 'fullPage';

export default function WorksheetArtLibraryScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    worksheetQueueId?: string;
    worksheetId?: string;
    title?: string;
    category?: string;
  }>();

  const worksheetQueueId = String(
    params.worksheetQueueId || params.worksheetId || ''
  ).trim();

  const incomingTitle = String(params.title || '').trim();
  const incomingCategory = String(params.category || '').trim();

  const isFullPageUpload = Boolean(worksheetQueueId);

  const [items, setItems] = useState<WorksheetArtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [uploadMode, setUploadMode] = useState<UploadMode>(
    isFullPageUpload ? 'fullPage' : 'reusable'
  );

  const [localUri, setLocalUri] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [title, setTitle] = useState(incomingTitle);
  const [category, setCategory] = useState(incomingCategory);
  const [tagsText, setTagsText] = useState('');
  const [searchText, setSearchText] = useState('');

  const headerSubtitle = useMemo(() => {
    if (isFullPageUpload) {
      return 'Upload the final full-page AI worksheet image for this draft.';
    }

    return 'Upload reusable illustrations for premium worksheet PDFs.';
  }, [isFullPageUpload]);

  async function loadArt(query = '') {
    try {
      const data = query.trim()
        ? await searchWorksheetArt(query)
        : await listWorksheetArt();

      setItems(data);
    } catch (error: any) {
      Alert.alert('Load Error', error?.message || 'Could not load art library.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadArt();
  }, []);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Needed',
        'Please allow photo access so you can upload worksheet images.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];

    if (!asset?.uri) return;

    setLocalUri(asset.uri);
  }

  async function saveReusableImage() {
    if (!localUri) {
      Alert.alert('Image Required', 'Please choose an image first.');
      return;
    }

    if (!imageKey.trim()) {
      Alert.alert(
        'Image Key Required',
        'Add a key like toothbrush, sink, bed, or backpack.'
      );
      return;
    }

    try {
      setSaving(true);

      const tags = tagsText
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

      await uploadWorksheetArt({
        localUri,
        imageKey,
        title: title.trim() || imageKey.trim(),
        category: category.trim() || undefined,
        tags,
      });

      setLocalUri('');
      setImageKey('');
      setTitle(isFullPageUpload ? incomingTitle : '');
      setCategory(isFullPageUpload ? incomingCategory : '');
      setTagsText('');

      Alert.alert('Saved', 'Worksheet image saved to the art library.');

      await loadArt(searchText);
    } catch (error: any) {
      Alert.alert('Save Error', error?.message || 'Could not save worksheet image.');
    } finally {
      setSaving(false);
    }
  }

  async function saveFullPageArtwork() {
    if (!worksheetQueueId) {
      Alert.alert(
        'Missing Worksheet',
        'This page was not opened with a worksheet draft ID.'
      );
      return;
    }

    if (!localUri) {
      Alert.alert('Image Required', 'Please choose the full-page worksheet image first.');
      return;
    }

    try {
      setSaving(true);

      await uploadFullPageWorksheetArt({
        localUri,
        worksheetQueueId,
        title: title.trim() || incomingTitle || 'worksheet',
        category: category.trim() || incomingCategory || null,
      });

      setLocalUri('');

      Alert.alert(
        'Artwork Uploaded',
        'The full-page worksheet artwork was attached to this draft.',
        [
          {
            text: 'Preview Worksheet',
            onPress: () =>
              router.replace({
                pathname: '/admin/worksheet-preview',
                params: { id: worksheetQueueId },
              } as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Upload Error',
        error?.message || 'Could not upload the full-page worksheet artwork.'
      );
    } finally {
      setSaving(false);
    }
  }

  function saveImage() {
    if (uploadMode === 'fullPage') {
      void saveFullPageArtwork();
      return;
    }

    void saveReusableImage();
  }

  async function confirmDelete(item: WorksheetArtItem) {
    Alert.alert(
      'Delete Image?',
      `Delete "${item.title}" from the worksheet art library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorksheetArt(item);
              await loadArt(searchText);
            } catch (error: any) {
              Alert.alert('Delete Error', error?.message || 'Could not delete image.');
            }
          },
        },
      ]
    );
  }

  function renderItem({ item }: { item: WorksheetArtItem }) {
    return (
      <View style={styles.artCard}>
        <Image source={{ uri: item.image_url }} style={styles.artImage} />

        <View style={styles.artInfo}>
          <Text style={styles.artTitle}>{item.title}</Text>
          <Text style={styles.artKey}>Key: {item.image_key}</Text>

          {item.category ? (
            <Text style={styles.artMeta}>Category: {item.category}</Text>
          ) : null}

          {item.tags?.length ? (
            <Text style={styles.artMeta}>Tags: {item.tags.join(', ')}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => void confirmDelete(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#991B1B" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#7C3AED" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Admin Library</Text>
          <Text style={styles.title}>Worksheet Art Library</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
        </View>
      </View>

      <FlatList
        data={uploadMode === 'fullPage' ? [] : items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View>
            {isFullPageUpload ? (
              <View style={styles.modeCard}>
                <Text style={styles.modeTitle}>Artwork for Worksheet Draft</Text>
                <Text style={styles.modeText}>
                  Upload the single finished worksheet image here. This should be the
                  premium full-page kid worksheet image you generated.
                </Text>

                <View style={styles.modeToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.modeChip,
                      uploadMode === 'fullPage' && styles.modeChipActive,
                    ]}
                    onPress={() => setUploadMode('fullPage')}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
                        uploadMode === 'fullPage' && styles.modeChipTextActive,
                      ]}
                    >
                      Full-page artwork
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeChip,
                      uploadMode === 'reusable' && styles.modeChipActive,
                    ]}
                    onPress={() => setUploadMode('reusable')}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
                        uploadMode === 'reusable' && styles.modeChipTextActive,
                      ]}
                    >
                      Reusable image
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={styles.uploadCard}>
              <Text style={styles.sectionTitle}>
                {uploadMode === 'fullPage'
                  ? 'Upload Full-page Worksheet Art'
                  : 'Add New Reusable Image'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.imagePicker,
                  uploadMode === 'fullPage' && styles.fullPagePicker,
                ]}
                onPress={pickImage}
              >
                {localUri ? (
                  <Image source={{ uri: localUri }} style={styles.previewImage} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={34} color="#7C3AED" />
                    <Text style={styles.imagePickerText}>
                      {uploadMode === 'fullPage'
                        ? 'Choose Final Worksheet PNG/JPG'
                        : 'Choose PNG/JPG Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {uploadMode === 'fullPage' ? (
                <>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                    placeholder="Worksheet title"
                    placeholderTextColor="#94A3B8"
                  />

                  <TextInput
                    value={category}
                    onChangeText={setCategory}
                    style={styles.input}
                    placeholder="Worksheet category"
                    placeholderTextColor="#94A3B8"
                  />

                  <View style={styles.noteBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#7C3AED" />
                    <Text style={styles.noteText}>
                      This saves the image URL to full_page_art_url and the storage path
                      to full_page_art_storage_path on this worksheet draft.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    value={imageKey}
                    onChangeText={setImageKey}
                    style={styles.input}
                    placeholder="Image key: toothbrush, sink, backpack..."
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />

                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                    placeholder="Title: Toothbrush"
                    placeholderTextColor="#94A3B8"
                  />

                  <TextInput
                    value={category}
                    onChangeText={setCategory}
                    style={styles.input}
                    placeholder="Category: Morning Routine, Feelings, Food..."
                    placeholderTextColor="#94A3B8"
                  />

                  <TextInput
                    value={tagsText}
                    onChangeText={setTagsText}
                    style={styles.input}
                    placeholder="Tags: bathroom, morning, hygiene"
                    placeholderTextColor="#94A3B8"
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={saveImage}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={19} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {uploadMode === 'fullPage'
                        ? 'Attach Artwork to Draft'
                        : 'Save Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {uploadMode === 'reusable' ? (
              <>
                <View style={styles.searchCard}>
                  <Ionicons name="search" size={18} color="#7C3AED" />
                  <TextInput
                    value={searchText}
                    onChangeText={(text) => {
                      setSearchText(text);
                      void loadArt(text);
                    }}
                    style={styles.searchInput}
                    placeholder="Search art library..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <Text style={styles.libraryTitle}>Saved Images</Text>

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color="#7C3AED" />
                    <Text style={styles.loadingText}>Loading images...</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading && uploadMode === 'reusable' ? (
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No images yet</Text>
              <Text style={styles.emptyText}>
                Upload your first reusable worksheet illustration.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadArt(searchText);
            }}
          />
        }
      />
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
    paddingBottom: 100,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  eyebrow: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    color: '#2E1065',
    fontSize: 25,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  modeCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 14,
  },
  modeTitle: {
    color: '#2E1065',
    fontSize: 17,
    fontWeight: '900',
  },
  modeText: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 20,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },
  modeChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  modeChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  modeChipText: {
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#2E1065',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  imagePicker: {
    height: 170,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  fullPagePicker: {
    height: 290,
    backgroundColor: '#FFF7ED',
  },
  imagePickerText: {
    marginTop: 8,
    color: '#7C3AED',
    fontWeight: '900',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
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
  noteBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  noteText: {
    flex: 1,
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 7,
  },
  disabledButton: {
    opacity: 0.7,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  libraryTitle: {
    color: '#2E1065',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '800',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  emptyTitle: {
    marginTop: 10,
    color: '#2E1065',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 5,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
  },
  artCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  artImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  artInfo: {
    flex: 1,
    marginLeft: 12,
  },
  artTitle: {
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '900',
  },
  artKey: {
    marginTop: 3,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
  },
  artMeta: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
