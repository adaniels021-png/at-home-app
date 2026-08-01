import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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


type WorksheetCategory =
  | 'Visual Routines'
  | 'Communication & Social Skills'
  | 'Behavior & Regulation'
  | 'Learning & Life Skills';

type WorksheetDifficulty = 'beginner' | 'intermediate' | 'advanced';

type PickedFile = {
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
};

type UploadedFile = {
  url: string;
  storagePath: string;
};

type WorksheetOrientation = 'portrait' | 'landscape';

const WORKSHEET_TABLE = 'worksheet_library';
const WORKSHEET_BUCKET = 'worksheet-files';

const CATEGORIES: WorksheetCategory[] = [
  'Visual Routines',
  'Communication & Social Skills',
  'Behavior & Regulation',
  'Learning & Life Skills',
];

const DIFFICULTIES: Array<{
  value: WorksheetDifficulty;
  label: string;
}> = [
  {
    value: 'beginner',
    label: 'Beginner',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
  },
  {
    value: 'advanced',
    label: 'Advanced',
  },
];

const ORIENTATIONS: Array<{
  value: WorksheetOrientation;
  label: string;
}> = [
  {
    value: 'portrait',
    label: 'Portrait',
  },
  {
    value: 'landscape',
    label: 'Landscape',
  },
];

function normalizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getFileExtension(fileName: string, fallback: string) {
  const parts = fileName.split('.');
  const extension =
    parts.length > 1 ? parts.pop()?.toLowerCase().trim() : null;

  return extension || fallback;
}

function removeFileExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '');
}

function formatFileSize(size?: number) {
  if (!size) return '';

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

async function uriToArrayBuffer(uri: string) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Could not read the selected file.');
  }

  return response.arrayBuffer();
}

async function uploadFile(input: {
  file: PickedFile;
  folder: 'pdfs' | 'previews';
  worksheetSlug: string;
}): Promise<UploadedFile> {
  const fallbackExtension = input.folder === 'pdfs' ? 'pdf' : 'jpg';

  const extension = getFileExtension(
    input.file.name,
    fallbackExtension
  );

  const safeOriginalName =
    normalizeFileName(removeFileExtension(input.file.name)) ||
    input.folder;

  const storagePath = [
    input.folder,
    input.worksheetSlug,
    `${Date.now()}-${safeOriginalName}.${extension}`,
  ].join('/');

  const fileBuffer = await uriToArrayBuffer(input.file.uri);

  const { error: uploadError } = await supabase.storage
    .from(WORKSHEET_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: input.file.mimeType,
      upsert: false,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(
      `Storage upload failed: ${uploadError.message}`
    );
  }

  const { data } = supabase.storage
    .from(WORKSHEET_BUCKET)
    .getPublicUrl(storagePath);

  if (!data.publicUrl) {
    throw new Error('The uploaded file did not receive a public URL.');
  }

  return {
    url: data.publicUrl,
    storagePath,
  };
}

async function safelyRemoveUploadedFiles(paths: string[]) {
  const validPaths = paths.filter(Boolean);

  if (!validPaths.length) return;

  const { error } = await supabase.storage
    .from(WORKSHEET_BUCKET)
    .remove(validPaths);

  if (error) {
    console.warn(
      'Could not clean up uploaded worksheet files:',
      error.message
    );
  }
}

function FilePickerCard({
  title,
  description,
  file,
  icon,
  buttonText,
  disabled,
  onPress,
  onClear,
}: {
  title: string;
  description: string;
  file: PickedFile | null;
  icon: keyof typeof Ionicons.glyphMap;
  buttonText: string;
  disabled?: boolean;
  onPress: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.fileCard}>
      <View style={styles.fileCardHeader}>
        <View style={styles.fileIconWrap}>
          <Ionicons name={icon} size={22} color="#7C3AED" />
        </View>

        <View style={styles.fileHeaderText}>
          <Text style={styles.fileTitle}>{title}</Text>

          <Text style={styles.fileDescription}>
            {description}
          </Text>
        </View>
      </View>

      {file ? (
        <View style={styles.selectedFile}>
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#059669"
          />

          <View style={styles.selectedFileText}>
            <Text
              style={styles.selectedFileName}
              numberOfLines={1}
            >
              {file.name}
            </Text>

            <Text style={styles.selectedFileMeta}>
              {file.mimeType}
              {file.size
                ? ` • ${formatFileSize(file.size)}`
                : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.clearFileButton}
            onPress={onClear}
            disabled={disabled}
          >
            <Ionicons
              name="close"
              size={19}
              color="#991B1B"
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pickFileButton}
          onPress={onPress}
          disabled={disabled}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color="#7C3AED"
          />

          <Text style={styles.pickFileButtonText}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AdminWorksheetUploadScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ageRange, setAgeRange] = useState('Ages 3–8');
  const [skillFocus, setSkillFocus] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [pageCount, setPageCount] = useState('1');
  const [sortOrder, setSortOrder] = useState('0');
  const [orientation, setOrientation] =
  useState<WorksheetOrientation>('portrait');

  const [category, setCategory] =
    useState<WorksheetCategory>('Visual Routines');

  const [difficulty, setDifficulty] =
    useState<WorksheetDifficulty>('beginner');


  const [pdfFile, setPdfFile] =
    useState<PickedFile | null>(null);

  const [previewFile, setPreviewFile] =
    useState<PickedFile | null>(null);

  const [isPro, setIsPro] = useState(true);

  const [isFeatured, setIsFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);

  const normalizedPageCount = Math.max(
    1,
    Number.parseInt(pageCount, 10) || 1
  );

  const normalizedSortOrder =
    Number.parseInt(sortOrder, 10) || 0;

  const tags = useMemo(
    () => normalizeTags(tagsText),
    [tagsText]
  );

  const canSubmit = useMemo(() => {
    return Boolean(
      title.trim() &&
        description.trim() &&
        ageRange.trim() &&
        skillFocus.trim() &&
        pdfFile &&
        previewFile
    );
  }, [
    title,
    description,
    ageRange,
    skillFocus,
    pdfFile,
    previewFile,
  ]);

  async function choosePdf() {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled) return;

      const asset = result.assets?.[0];

      if (!asset) {
        throw new Error('No PDF was selected.');
      }

      setPdfFile({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType || 'application/pdf',
        size: asset.size,
      });
    } catch (error: any) {
      Alert.alert(
        'PDF Selection Error',
        error?.message || 'Could not select the PDF.'
      );
    }
  }

  async function choosePreviewFromFiles() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];

    if (!asset) {
      throw new Error('No preview image was selected.');
    }

    setPreviewFile({
      name: asset.name || `worksheet-preview-${Date.now()}.png`,
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/png',
      size: asset.size,
    });
  } catch (error: any) {
    Alert.alert(
      'Image Selection Error',
      error?.message || 'Could not select the preview image.'
    );
  }
}

async function choosePreviewFromPhotos() {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo Access Needed',
        'Please allow photo access so you can select a worksheet preview image.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    setPreviewFile({
      name:
        asset.fileName ||
        `worksheet-preview-${Date.now()}.jpg`,
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
    });
  } catch (error: any) {
    console.error(
      'Preview photo selection error:',
      error
    );

    Alert.alert(
      'Photo Selection Error',
      error?.message ||
        'Could not select the preview image from Photos.'
    );
  }
}

function choosePreviewImage() {
  Alert.alert(
    'Select Preview Image',
    'Choose where you want to select the preview image.',
    [
      {
        text: 'Photos',
        onPress: () =>
          void choosePreviewFromPhotos(),
      },
      {
        text: 'Files',
        onPress: () =>
          void choosePreviewFromFiles(),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]
  );
}

  function resetForm() {
    setTitle('');
    setDescription('');
    setAgeRange('Ages 3–8');
    setSkillFocus('');
    setTagsText('');
    setPageCount('1');
    setSortOrder('0');
    setCategory('Visual Routines');
    setDifficulty('beginner');
    setPdfFile(null);
    setPreviewFile(null);
    setIsPro(true);
    setIsFeatured(false);
    setOrientation('portrait');
  }

  async function uploadWorksheet() {
    if (!canSubmit || !pdfFile || !previewFile) {
      Alert.alert(
        'Missing Information',
        'Complete every required field and select both a worksheet PDF and preview image.'
      );

      return;
    }

    let uploadedPdf: UploadedFile | null = null;
    let uploadedPreview: UploadedFile | null = null;

    try {
      setUploading(true);

      const worksheetSlug =
        normalizeFileName(title) ||
        `worksheet-${Date.now()}`;

      uploadedPdf = await uploadFile({
        file: pdfFile,
        folder: 'pdfs',
        worksheetSlug,
      });

      uploadedPreview = await uploadFile({
        file: previewFile,
        folder: 'previews',
        worksheetSlug,
      });

      const now = new Date().toISOString();

     const record = {
  title: title.trim(),
  category,
  description: description.trim(),
  age_range: ageRange.trim(),
  difficulty,
  skill_focus: skillFocus.trim(),
  orientation,

  pdf_storage_path: uploadedPdf.storagePath,
  thumbnail_storage_path: uploadedPreview.storagePath,

  file_name: pdfFile.name,
  page_count: normalizedPageCount,

  is_pro: isPro,
  is_featured: isFeatured,
  is_active: false,

  status: 'draft',
  sort_order: normalizedSortOrder,
  tags,

  pdf_url: uploadedPdf.url,
  preview_image_url: uploadedPreview.url,
  preview_storage_path: uploadedPreview.storagePath,

  created_at: now,
  updated_at: now,
};


    const { data: insertedWorksheet, error: insertError } = await supabase
  .from(WORKSHEET_TABLE)
  .insert(record)
  .select('id, title, status, is_active')
  .single();

if (insertError) {
  throw new Error(
    `Worksheet record could not be saved: ${insertError.message}`
  );
}

if (!insertedWorksheet) {
  throw new Error(
    'The worksheet files uploaded, but the worksheet database record was not created.'
  );
}

console.log('Worksheet draft created:', insertedWorksheet);

      Alert.alert(
  'Worksheet Uploaded',
  'The worksheet was uploaded as a draft. Review and publish it from the Worksheet Library.',
  [
    {
      text: 'Upload Another',
      onPress: resetForm,
    },
    {
      text: 'Review Library',
      onPress: () =>
        router.replace('/admin/worksheet-library' as any)
    },
  ]
);
    } catch (error: any) {
      console.error('Worksheet upload error:', error);

      await safelyRemoveUploadedFiles([
        uploadedPreview?.storagePath || '',
        uploadedPdf?.storagePath || '',
      ]);

      Alert.alert(
        'Upload Failed',
        error?.message ||
          'The worksheet could not be uploaded. Check the worksheet table, storage bucket, and Supabase policies.'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={uploading}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color="#6D28D9"
          />
        </TouchableOpacity>

        <View style={styles.topBarText}>
          <Text style={styles.eyebrow}>ADMIN TOOLS</Text>
          <Text style={styles.screenTitle}>
            Upload Worksheet
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="documents-outline"
              size={23}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.introTextWrap}>
            <Text style={styles.introTitle}>
              Add a finished worksheet
            </Text>

            <Text style={styles.introText}>
  Upload your completed worksheet PDF and preview image. The worksheet
  will be saved as a draft so you can preview it before publishing it
  for families.
</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Worksheet Details
          </Text>

          <Text style={styles.fieldLabel}>Title *</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="Example: Task Analysis Strip: Washing Hands"
            placeholderTextColor="#94A3B8"
            editable={!uploading}
          />

          <Text style={styles.fieldLabel}>
            Description *
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            placeholder="Describe what the worksheet teaches and how it is used."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            editable={!uploading}
          />

          <Text style={styles.fieldLabel}>
            Age Range *
          </Text>

          <TextInput
            value={ageRange}
            onChangeText={setAgeRange}
            style={styles.input}
            placeholder="Ages 3–8"
            placeholderTextColor="#94A3B8"
            editable={!uploading}
          />

          <Text style={styles.fieldLabel}>
            Skill Focus *
          </Text>

          <TextInput
            value={skillFocus}
            onChangeText={setSkillFocus}
            style={[
              styles.input,
              styles.textAreaSmall,
            ]}
            placeholder="Example: Sequencing, independence, hygiene, and task completion."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            editable={!uploading}
          />

          <Text style={styles.fieldLabel}>
  Page Orientation
</Text>

<View style={styles.categoryWrap}>
  {ORIENTATIONS.map((item) => {
    const active =
      item.value === orientation;

    return (
      <TouchableOpacity
        key={item.value}
        style={[
          styles.categoryButton,
          active &&
            styles.categoryButtonActive,
        ]}
        onPress={() =>
          setOrientation(item.value)
        }
        disabled={uploading}
      >
        <Text
          style={[
            styles.categoryButtonText,
            active &&
              styles.categoryButtonTextActive,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

          <Text style={styles.fieldLabel}>
            Category
          </Text>

          <View style={styles.categoryWrap}>
            {CATEGORIES.map((item) => {
              const active = item === category;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.categoryButton,
                    active &&
                      styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(item)}
                  disabled={uploading}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      active &&
                        styles.categoryButtonTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>
  Difficulty
</Text>

<View style={styles.categoryWrap}>
  {DIFFICULTIES.map((item) => {
    const active =
      item.value === difficulty;

    return (
      <TouchableOpacity
        key={item.value}
        style={[
          styles.categoryButton,
          active &&
            styles.categoryButtonActive,
        ]}
        onPress={() =>
          setDifficulty(item.value)
        }
        disabled={uploading}
      >
        <Text
          style={[
            styles.categoryButtonText,
            active &&
              styles.categoryButtonTextActive,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>


          <Text style={styles.fieldLabel}>
            Tags
          </Text>

          <TextInput
            value={tagsText}
            onChangeText={setTagsText}
            style={styles.input}
            placeholder="washing hands, hygiene, routine, sequencing"
            placeholderTextColor="#94A3B8"
            editable={!uploading}
            autoCapitalize="none"
          />

          <View style={styles.numberRow}>
            <View style={styles.numberField}>
              <Text style={styles.fieldLabel}>
                Page Count
              </Text>

              <TextInput
                value={pageCount}
                onChangeText={setPageCount}
                style={styles.input}
                placeholder="1"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                editable={!uploading}
              />
            </View>

            <View style={styles.numberField}>
              <Text style={styles.fieldLabel}>
                Sort Order
              </Text>

              <TextInput
                value={sortOrder}
                onChangeText={setSortOrder}
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                editable={!uploading}
              />
            </View>
          </View>
        </View>

        <FilePickerCard
          title="Worksheet PDF"
          description="Select the finished, print-ready PDF families will print, share, or email."
          file={pdfFile}
          icon="document-text-outline"
          buttonText="Select Worksheet PDF"
          disabled={uploading}
          onPress={choosePdf}
          onClear={() => setPdfFile(null)}
        />

        <FilePickerCard
  title="Preview Image"
  description="Select a clear PNG, JPEG, or WebP image to display on the worksheet card and preview screen."
  file={previewFile}
  icon="image-outline"
  buttonText="Select Preview Image"
  disabled={uploading}
  onPress={choosePreviewImage}
  onClear={() => setPreviewFile(null)}
/>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Availability
          </Text>

          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>
                Pro Worksheet
              </Text>

              <Text style={styles.switchDescription}>
                Require an active Pro subscription to
                print, share, or email this worksheet.
              </Text>
            </View>

            <Switch
              value={isPro}
              onValueChange={setIsPro}
              disabled={uploading}
              trackColor={{
                false: '#CBD5E1',
                true: '#C4B5FD',
              }}
              thumbColor={
                isPro ? '#7C3AED' : '#FFFFFF'
              }
            />
          </View>

          <View style={styles.divider} />

<View style={styles.reviewNotice}>
  <Ionicons
    name="shield-checkmark-outline"
    size={20}
    color="#7C3AED"
  />

  <View style={styles.reviewNoticeText}>
    <Text style={styles.reviewNoticeTitle}>
      Review required
    </Text>

    <Text style={styles.reviewNoticeDescription}>
      Every worksheet is uploaded as a draft. It will not appear for
      families until you preview and publish it from the Worksheet Library.
    </Text>
  </View>
</View>

        </View>

        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#1D4ED8"
          />

          <Text style={styles.noteText}>
            Files are uploaded to the public Supabase
            Storage bucket “{WORKSHEET_BUCKET}” and the
            worksheet information is saved in “
            {WORKSHEET_TABLE}”.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!canSubmit || uploading) &&
              styles.uploadButtonDisabled,
          ]}
          onPress={uploadWorksheet}
          disabled={!canSubmit || uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#FFFFFF" />

              <Text style={styles.uploadButtonText}>
                Uploading...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="cloud-upload"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.uploadButtonText}>
                Upload Worksheet
              </Text>
            </>
          )}
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

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
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

  topBarText: {
    flex: 1,
  },

  eyebrow: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  screenTitle: {
    marginTop: 2,
    color: '#2E1065',
    fontSize: 25,
    fontWeight: '900',
  },

  content: {
    paddingHorizontal: 18,
    paddingBottom: 70,
  },

  introCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  introTextWrap: {
    flex: 1,
    marginLeft: 13,
  },

  introTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  introText: {
    marginTop: 5,
    color: '#F5F3FF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  sectionTitle: {
    color: '#2E1065',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 15,
  },

  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 7,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 13,
  },

  textArea: {
    minHeight: 100,
  },

  textAreaSmall: {
    minHeight: 75,
  },

  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },

  categoryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  categoryButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  categoryButtonText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '900',
  },

  categoryButtonTextActive: {
    color: '#FFFFFF',
  },

  numberRow: {
    flexDirection: 'row',
    gap: 12,
  },

  numberField: {
    flex: 1,
  },

  fileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  fileCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fileHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  fileTitle: {
    color: '#2E1065',
    fontSize: 16,
    fontWeight: '900',
  },

  fileDescription: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  pickFileButton: {
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C4B5FD',
    backgroundColor: '#FAF5FF',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  pickFileButtonText: {
    marginLeft: 7,
    color: '#6D28D9',
    fontWeight: '900',
  },

  selectedFile: {
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedFileText: {
    flex: 1,
    marginLeft: 9,
  },

  selectedFileName: {
    color: '#065F46',
    fontWeight: '900',
    fontSize: 13,
  },

  selectedFileMeta: {
    marginTop: 3,
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },

  clearFileButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  switchTextWrap: {
    flex: 1,
    marginRight: 14,
  },

  switchTitle: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '900',
  },

  switchDescription: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  noteText: {
    flex: 1,
    marginLeft: 9,
    color: '#1E40AF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  uploadButton: {
    minHeight: 56,
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  uploadButtonDisabled: {
    opacity: 0.5,
  },

  uploadButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  reviewNotice: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: '#FAF5FF',
  borderRadius: 16,
  padding: 13,
  borderWidth: 1,
  borderColor: '#E9D5FF',
},

reviewNoticeText: {
  flex: 1,
  marginLeft: 9,
},

reviewNoticeTitle: {
  color: '#5B21B6',
  fontSize: 14,
  fontWeight: '900',
},

reviewNoticeDescription: {
  marginTop: 4,
  color: '#6D28D9',
  fontSize: 12,
  lineHeight: 18,
  fontWeight: '700',
},
});
