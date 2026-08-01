import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../lib/supabase';

type WorksheetStatusFilter =
  | 'all'
  | 'draft'
  | 'approved';

type WorksheetOrientation =
  | 'portrait'
  | 'landscape';

type WorksheetLibraryRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  age_range: string | null;
  difficulty: string | null;
  skill_focus: string | null;
  orientation: WorksheetOrientation | null;

  pdf_url: string | null;
  preview_image_url: string | null;

  pdf_storage_path: string | null;
  preview_storage_path: string | null;
  thumbnail_storage_path: string | null;

  file_name: string | null;
  page_count: number | null;

  is_pro: boolean | null;
  is_featured: boolean | null;
  is_active: boolean | null;

  status: string | null;
  sort_order: number | null;

  created_at: string | null;
  updated_at: string | null;
};

const WORKSHEET_BUCKET = 'worksheet-files';

const FILTERS: {
  value: WorksheetStatusFilter;
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'draft',
    label: 'Drafts',
  },
  {
    value: 'approved',
    label: 'Approved',
  },
];

function getStatusLabel(
  worksheet: WorksheetLibraryRow
) {
  if (
    worksheet.status === 'approved' &&
    worksheet.is_active
  ) {
    return 'Approved';
  }

  return 'Draft';
}

function getStatusColors(
  worksheet: WorksheetLibraryRow
) {
  const approved =
    worksheet.status === 'approved' &&
    worksheet.is_active;

  return approved
    ? {
        background: '#ECFDF5',
        text: '#047857',
        icon: '#059669',
      }
    : {
        background: '#FFF7ED',
        text: '#C2410C',
        icon: '#EA580C',
      };
}

function formatDate(value?: string | null) {
  if (!value) return 'Unknown date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStoragePaths(
  worksheet: WorksheetLibraryRow
) {
  return Array.from(
    new Set(
      [
        worksheet.pdf_storage_path,
        worksheet.preview_storage_path,
        worksheet.thumbnail_storage_path,
      ].filter(
        (value): value is string =>
          Boolean(value)
      )
    )
  );
}

function getPublicFileUrl(path: string | null) {
  if (!path) return null;

  const { data } = supabase.storage
    .from(WORKSHEET_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl || null;
}

function getPreviewUrl(worksheet: WorksheetLibraryRow) {
  return (
    getPublicFileUrl(worksheet.preview_storage_path) ||
    getPublicFileUrl(worksheet.thumbnail_storage_path) ||
    worksheet.preview_image_url
  );
}

function getPdfUrl(worksheet: WorksheetLibraryRow) {
  return (
    worksheet.pdf_url ||
    getPublicFileUrl(worksheet.pdf_storage_path)
  );
}

export default function AdminWorksheetLibraryScreen() {
  const router = useRouter();

  const [worksheets, setWorksheets] = useState<
    WorksheetLibraryRow[]
  >([]);

  const [selectedWorksheet, setSelectedWorksheet] =
    useState<WorksheetLibraryRow | null>(null);

  const [activeFilter, setActiveFilter] =
    useState<WorksheetStatusFilter>('all');

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
  useState<string | null>(null);

const selectedPreviewUrl = selectedWorksheet
  ? getPreviewUrl(selectedWorksheet)
  : null;

  async function updateWorksheetAvailability(
    worksheet: WorksheetLibraryRow,
    isProWorksheet: boolean
  ) {
    try {
      setProcessingId(worksheet.id);

      const { data, error } = await supabase
        .from('worksheet_library')
        .update({
          is_pro: isProWorksheet,
          updated_at: new Date().toISOString(),
        })
        .eq('id', worksheet.id)
        .select('*')
        .single();

      if (error) throw error;

      const updatedWorksheet = data as WorksheetLibraryRow;

      setWorksheets((current) =>
        current.map((item) =>
          item.id === updatedWorksheet.id ? updatedWorksheet : item
        )
      );
      setSelectedWorksheet(updatedWorksheet);
    } catch (error: any) {
      Alert.alert(
        'Availability Update Failed',
        error?.message || 'Could not update worksheet availability.'
      );
    } finally {
      setProcessingId(null);
    }
  }

  const loadWorksheets = useCallback(
  async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      /*
       * Admin library must load every worksheet:
       * drafts, approved worksheets, and inactive worksheets.
       *
       * Do not filter by status or is_active here.
       */
      const { data, error } = await supabase
        .from('worksheet_library')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      console.log(
        'Admin worksheet library rows:',
        data?.length ?? 0,
        data
      );

      setWorksheets(
        (data ?? []) as WorksheetLibraryRow[]
      );
    } catch (error: any) {
      console.error(
        'Worksheet library load error:',
        error
      );

      Alert.alert(
        'Library Error',
        error?.message ||
          'Could not load the worksheet library.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  []
);

  useFocusEffect(
    useCallback(() => {
      void loadWorksheets();
    }, [loadWorksheets])
  );

  const filteredWorksheets = useMemo(() => {
    if (activeFilter === 'all') {
      return worksheets;
    }

    if (activeFilter === 'approved') {
      return worksheets.filter(
        (worksheet) =>
          worksheet.status === 'approved' &&
          worksheet.is_active
      );
    }

    return worksheets.filter(
      (worksheet) =>
        worksheet.status !== 'approved' ||
        !worksheet.is_active
    );
  }, [activeFilter, worksheets]);

  const counts = useMemo(() => {
    const approved = worksheets.filter(
      (worksheet) =>
        worksheet.status === 'approved' &&
        worksheet.is_active
    ).length;

    return {
      all: worksheets.length,
      approved,
      draft: worksheets.length - approved,
    };
  }, [worksheets]);

 async function publishWorksheet(
  worksheet: WorksheetLibraryRow
) {
  try {
    setProcessingId(worksheet.id);

    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('worksheet_library')
      .update({
        status: 'approved',
        is_active: true,
        updated_at: updatedAt,
      })
      .eq('id', worksheet.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        'The worksheet was not updated. Check the worksheet_library update policy.'
      );
    }

    const updatedWorksheet =
      data as WorksheetLibraryRow;

    setWorksheets((current) =>
      current.map((item) =>
        item.id === worksheet.id
          ? updatedWorksheet
          : item
      )
    );

    setSelectedWorksheet((current) =>
      current?.id === worksheet.id
        ? updatedWorksheet
        : current
    );

    Alert.alert(
      'Worksheet Approved',
      'This worksheet is now visible in the parent Worksheet tab.'
    );
  } catch (error: any) {
    console.error(
      'Publish worksheet error:',
      error
    );

    Alert.alert(
      'Publish Failed',
      error?.message ||
        'Could not publish this worksheet.'
    );
  } finally {
    setProcessingId(null);
  }
}

 async function unpublishWorksheet(
  worksheet: WorksheetLibraryRow
) {
  try {
    setProcessingId(worksheet.id);

    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('worksheet_library')
      .update({
        status: 'draft',
        is_active: false,
        updated_at: updatedAt,
      })
      .eq('id', worksheet.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        'The worksheet was not updated. Check the worksheet_library update policy.'
      );
    }

    const updatedWorksheet =
      data as WorksheetLibraryRow;

    setWorksheets((current) =>
      current.map((item) =>
        item.id === worksheet.id
          ? updatedWorksheet
          : item
      )
    );

    setSelectedWorksheet((current) =>
      current?.id === worksheet.id
        ? updatedWorksheet
        : current
    );

    Alert.alert(
      'Worksheet Unpublished',
      'This worksheet is no longer visible to parents.'
    );
  } catch (error: any) {
    console.error(
      'Unpublish worksheet error:',
      error
    );

    Alert.alert(
      'Update Failed',
      error?.message ||
        'Could not unpublish this worksheet.'
    );
  } finally {
    setProcessingId(null);
  }
}

 function confirmPublish(
  worksheet: WorksheetLibraryRow
) {
  Alert.alert(
    'Approve & Publish Worksheet?',
    `“${worksheet.title}” will become visible to families in the Worksheet tab.`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Approve & Publish',
        onPress: () =>
          void publishWorksheet(worksheet),
      },
    ]
  );
}

  function confirmUnpublish(
    worksheet: WorksheetLibraryRow
  ) {
    Alert.alert(
      'Unpublish Worksheet?',
      `“${worksheet.title}” will be removed from the parent Worksheet tab but will remain saved in your admin library.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unpublish',
          style: 'destructive',
          onPress: () =>
            void unpublishWorksheet(worksheet),
        },
      ]
    );
  }

 async function openPdf(
  worksheet: WorksheetLibraryRow
) {
  const pdfUrl = getPdfUrl(worksheet);

  if (!pdfUrl) {
    Alert.alert(
      'PDF Missing',
      'This worksheet does not have an uploaded PDF.'
    );
    return;
  }

  try {
    setProcessingId(worksheet.id);

    const safeName =
      worksheet.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      'worksheet';

    const destination =
      `${FileSystem.cacheDirectory}` +
      `${safeName}-${Date.now()}.pdf`;

    const result =
      await FileSystem.downloadAsync(
        pdfUrl,
        destination
      );

    if (
      result.status < 200 ||
      result.status >= 300
    ) {
      throw new Error(
        'The worksheet PDF could not be downloaded.'
      );
    }

    const canShare =
      await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert(
        'PDF Downloaded',
        'The PDF was downloaded, but the system preview menu is unavailable.'
      );
      return;
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle:
        `Preview ${worksheet.title}`,
    });
  } catch (error: any) {
    console.error(
      'Worksheet PDF preview error:',
      error
    );

    Alert.alert(
      'Preview Failed',
      error?.message ||
        'Could not open the worksheet PDF.'
    );
  } finally {
    setProcessingId(null);
  }
}

  async function deleteWorksheet(
    worksheet: WorksheetLibraryRow
  ) {
    try {
      setProcessingId(worksheet.id);

      const storagePaths =
        getStoragePaths(worksheet);

      if (storagePaths.length > 0) {
        const { error: storageError } =
          await supabase.storage
            .from(WORKSHEET_BUCKET)
            .remove(storagePaths);

        if (storageError) {
          throw new Error(
            `Worksheet files could not be removed: ${storageError.message}`
          );
        }
      }

      const { error: deleteError } =
        await supabase
          .from('worksheet_library')
          .delete()
          .eq('id', worksheet.id);

      if (deleteError) {
        throw deleteError;
      }

      setWorksheets((current) =>
        current.filter(
          (item) => item.id !== worksheet.id
        )
      );

      setSelectedWorksheet(null);

      Alert.alert(
        'Worksheet Deleted',
        'The worksheet and its uploaded files were permanently deleted.'
      );
    } catch (error: any) {
      console.error(
        'Delete worksheet error:',
        error
      );

      Alert.alert(
        'Delete Failed',
        error?.message ||
          'Could not delete this worksheet.'
      );
    } finally {
      setProcessingId(null);
    }
  }

  function confirmDelete(
    worksheet: WorksheetLibraryRow
  ) {
    Alert.alert(
      'Delete Worksheet Permanently?',
      `This will permanently delete “${worksheet.title},” its PDF, and its preview image. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () =>
            void deleteWorksheet(worksheet),
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color="#7C3AED"
          />

          <Text style={styles.loadingText}>
            Loading Worksheet Library...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color="#6D28D9"
          />
        </TouchableOpacity>

        <View style={styles.topBarText}>
          <Text style={styles.eyebrow}>
            ADMIN TOOLS
          </Text>

          <Text style={styles.screenTitle}>
            Worksheet Library
          </Text>
        </View>

        <TouchableOpacity
          style={styles.uploadShortcut}
          onPress={() =>
            router.push(
  '/admin/worksheets/upload' as any
)
          }
        >
          <Ionicons
            name="cloud-upload-outline"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void loadWorksheets(true)
            }
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="documents-outline"
              size={27}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>
              Review Before Publishing
            </Text>

            <Text style={styles.heroText}>
              Preview uploaded worksheets, review
              their information, publish them for
              families, or remove them when needed.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {counts.all}
            </Text>

            <Text style={styles.summaryLabel}>
              Total
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {counts.draft}
            </Text>

            <Text style={styles.summaryLabel}>
              Drafts
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {counts.approved}
            </Text>

            <Text style={styles.summaryLabel}>
              Approved
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active =
              activeFilter === filter.value;

            const count =
              filter.value === 'all'
                ? counts.all
                : filter.value === 'draft'
                ? counts.draft
                : counts.approved;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  active &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setActiveFilter(filter.value)
                }
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    active &&
                      styles.filterButtonTextActive,
                  ]}
                >
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredWorksheets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="documents-outline"
              size={34}
              color="#A78BFA"
            />

            <Text style={styles.emptyTitle}>
              No worksheets here yet
            </Text>

            <Text style={styles.emptyText}>
              Upload a finished worksheet PDF and
              preview image to begin your library.
            </Text>

            <TouchableOpacity
  style={styles.emptyButton}
  onPress={() =>
    router.push(
      '/admin/worksheets/upload' as any
    )
  }
>
              <Text style={styles.emptyButtonText}>
                Upload Worksheet
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredWorksheets.map((worksheet) => {
  const statusColors = getStatusColors(worksheet);
  const previewUrl = getPreviewUrl(worksheet);

  const processing = processingId === worksheet.id;

  const approved =
    worksheet.status === 'approved' &&
    worksheet.is_active === true;
            return (
              <TouchableOpacity
                key={worksheet.id}
                style={styles.worksheetCard}
                activeOpacity={0.9}
                onPress={() =>
                  setSelectedWorksheet(worksheet)
                }
              >
                <View style={styles.previewFrame}>
  {previewUrl ? (
    <Image
      source={{ uri: previewUrl }}
      style={styles.previewImage}
      resizeMode="cover"
    />
  ) : (
    <View style={styles.previewPlaceholder}>
      <Ionicons
        name="image-outline"
        size={32}
        color="#94A3B8"
      />

      <Text style={styles.previewPlaceholderText}>
        No preview image
      </Text>
    </View>
  )}
</View>

                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          statusColors.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        approved
                          ? 'checkmark-circle'
                          : 'time-outline'
                      }
                      size={13}
                      color={statusColors.icon}
                    />

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            statusColors.text,
                        },
                      ]}
                    >
                      {getStatusLabel(
                        worksheet
                      )}
                    </Text>
                  </View>

                  <View style={styles.cardBadgeRow}>
                    <View
                      style={[
                        styles.accessBadge,
                        worksheet.is_pro === false && styles.accessBadgeFree,
                      ]}
                    >
                      <Ionicons
                        name={worksheet.is_pro === false ? 'checkmark-circle' : 'lock-closed'}
                        size={12}
                        color={worksheet.is_pro === false ? '#047857' : '#7C3AED'}
                      />
                      <Text
                        style={[
                          styles.accessBadgeText,
                          worksheet.is_pro === false && styles.accessBadgeTextFree,
                        ]}
                      >
                        {worksheet.is_pro === false ? 'FREE' : 'PRO'}
                      </Text>
                    </View>

                  {worksheet.is_featured ? (
                    <View
                      style={
                        styles.featuredPill
                      }
                    >
                      <Ionicons
                        name="star"
                        size={12}
                        color="#D97706"
                      />

                      <Text
                        style={
                          styles.featuredText
                        }
                      >
                        Featured
                      </Text>
                    </View>
                  ) : null}
                  </View>
                </View>

                <Text style={styles.cardTitle}>
                  {worksheet.title}
                </Text>

                <Text
                  style={styles.cardDescription}
                  numberOfLines={3}
                >
                  {worksheet.description ||
  'No description has been provided.'}
                </Text>

                <View style={styles.metaWrap}>
                  <View style={styles.metaPill}>
                    <Ionicons
                      name="folder-outline"
                      size={14}
                      color="#64748B"
                    />

                    <Text
                      style={styles.metaText}
                      numberOfLines={1}
                    >
                      {worksheet.category}
                    </Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color="#64748B"
                    />

                    <Text style={styles.metaText}>
                      {worksheet.age_range ||
                        'All ages'}
                    </Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Ionicons
                      name={
                        worksheet.orientation ===
                        'landscape'
                          ? 'phone-landscape-outline'
                          : 'phone-portrait-outline'
                      }
                      size={14}
                      color="#64748B"
                    />

                    <Text style={styles.metaText}>
                      {worksheet.orientation ||
                        'portrait'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.uploadedDate}>
                  Uploaded{' '}
                  {formatDate(
                    worksheet.created_at
                  )}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() =>
                      setSelectedWorksheet(
                        worksheet
                      )
                    }
                  >
                    <Ionicons
                      name="eye-outline"
                      size={16}
                      color="#6D28D9"
                    />

                    <Text
                      style={
                        styles.previewButtonText
                      }
                    >
                      Review
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.publishButton,
                      approved &&
                        styles.unpublishButton,
                    ]}
                    disabled={processing}
                    onPress={() =>
                      approved
                        ? confirmUnpublish(
                            worksheet
                          )
                        : confirmPublish(
                            worksheet
                          )
                    }
                  >
                    {processing ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            approved
                              ? 'eye-off-outline'
                              : 'checkmark-circle-outline'
                          }
                          size={16}
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.publishButtonText
                          }
                        >
                          {approved
                            ? 'Unpublish'
                            : 'Publish'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={Boolean(selectedWorksheet)}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedWorksheet(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.modalContent
              }
            >
              <View style={styles.modalTopRow}>
  <Text style={styles.modalEyebrow}>
    WORKSHEET REVIEW
  </Text>

  <TouchableOpacity
    onPress={() => setSelectedWorksheet(null)}
  >
    <Ionicons
      name="close-circle"
      size={31}
      color="#64748B"
    />
  </TouchableOpacity>
</View>

<View style={styles.modalPreview}>
  {selectedPreviewUrl ? (
    <Image
      source={{ uri: selectedPreviewUrl }}
      style={styles.modalPreviewImage}
      resizeMode="contain"
    />
  ) : (
    <View style={styles.modalPreviewPlaceholder}>
      <Ionicons
        name="image-outline"
        size={36}
        color="#94A3B8"
      />

      <Text style={styles.modalPreviewPlaceholderText}>
        No preview image was uploaded
      </Text>
    </View>
  )}
</View>

<Text style={styles.modalTitle}>
  {selectedWorksheet?.title}
</Text>

<Text style={styles.modalDescription}>
  {selectedWorksheet?.description ||
    'No description has been provided.'}
</Text>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>
                  Category
                </Text>

                <Text style={styles.detailValue}>
                  {selectedWorksheet?.category}
                </Text>
              </View>

              {selectedWorksheet ? (
                <View style={styles.availabilityCard}>
                  <View style={styles.availabilityTextWrap}>
                    <Text style={styles.availabilityHeading}>Availability</Text>
                    <Text style={styles.availabilityTitle}>Pro Worksheet</Text>
                    <Text style={styles.availabilityDescription}>
                      Require an active Pro subscription.
                    </Text>
                  </View>

                  <Switch
                    value={selectedWorksheet.is_pro !== false}
                    onValueChange={(value) =>
                      void updateWorksheetAvailability(selectedWorksheet, value)
                    }
                    disabled={processingId === selectedWorksheet.id}
                    trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                    thumbColor={selectedWorksheet.is_pro !== false ? '#7C3AED' : '#FFFFFF'}
                  />
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>
                    Best For
                  </Text>

                  <Text style={styles.detailValue}>
                    {selectedWorksheet?.age_range ||
                      'All ages'}
                  </Text>
                </View>

                <View style={styles.detailHalf}>
                  <Text style={styles.detailLabel}>
                    Orientation
                  </Text>

                  <Text style={styles.detailValue}>
                    {selectedWorksheet?.orientation ||
                      'portrait'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>
                  Skill Focus
                </Text>

                <Text style={styles.detailValue}>
                  {selectedWorksheet?.skill_focus ||
                    'Not provided'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.openPdfButton}
                disabled={
                  !selectedWorksheet ||
                  processingId ===
                    selectedWorksheet.id
                }
                onPress={() =>
                  selectedWorksheet &&
                  void openPdf(
                    selectedWorksheet
                  )
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={19}
                  color="#4F46E5"
                />

                <Text
                  style={
                    styles.openPdfButtonText
                  }
                >
                  Open Actual Worksheet PDF
                </Text>
              </TouchableOpacity>

              {selectedWorksheet ? (
                selectedWorksheet.status ===
                  'approved' &&
                selectedWorksheet.is_active ? (
                  <TouchableOpacity
                    style={styles.modalUnpublishButton}
                    disabled={
                      processingId ===
                      selectedWorksheet.id
                    }
                    onPress={() =>
                      confirmUnpublish(
                        selectedWorksheet
                      )
                    }
                  >
                    <Ionicons
                      name="eye-off-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalActionText
                      }
                    >
                      Unpublish Worksheet
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalPublishButton}
                    disabled={
                      processingId ===
                      selectedWorksheet.id
                    }
                    onPress={() =>
                      confirmPublish(
                        selectedWorksheet
                      )
                    }
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalActionText
                      }
                    >
                      Approve & Publish
                    </Text>
                  </TouchableOpacity>
                )
              ) : null}

              {selectedWorksheet ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  disabled={
                    processingId ===
                    selectedWorksheet.id
                  }
                  onPress={() =>
                    confirmDelete(
                      selectedWorksheet
                    )
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#B91C1C"
                  />

                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    Delete Worksheet Permanently
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
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

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '800',
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

  uploadShortcut: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 18,
    paddingBottom: 80,
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTextWrap: {
    flex: 1,
    marginLeft: 13,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  heroText: {
    marginTop: 5,
    color: '#F5F3FF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },

  summaryCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  summaryNumber: {
    color: '#5B21B6',
    fontSize: 22,
    fontWeight: '900',
  },

  summaryLabel: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },

  filterRow: {
    gap: 9,
    paddingBottom: 15,
  },

  filterButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  filterButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  filterButtonText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '900',
  },

  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  worksheetCard: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 15,
  },

  previewPlaceholder: {
  flex: 1,
  backgroundColor: '#F8FAFC',
  alignItems: 'center',
  justifyContent: 'center',
},

previewPlaceholderText: {
  marginTop: 8,
  color: '#94A3B8',
  fontSize: 12,
  fontWeight: '800',
},

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#F3E8FF',
  },

  accessBadgeFree: {
    backgroundColor: '#D1FAE5',
  },

  accessBadgeText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '900',
  },

  accessBadgeTextFree: {
    color: '#047857',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '900',
  },

  featuredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#FFFBEB',
  },

  featuredText: {
    marginLeft: 4,
    color: '#D97706',
    fontSize: 11,
    fontWeight: '900',
  },

  cardTitle: {
    marginTop: 12,
    color: '#1E293B',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },

  cardDescription: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  metaWrap: {
    marginTop: 12,
    gap: 7,
  },

  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  metaText: {
    flex: 1,
    marginLeft: 6,
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  uploadedDate: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },

  cardActions: {
    marginTop: 13,
    flexDirection: 'row',
    gap: 10,
  },

  previewButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 15,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewButtonText: {
    marginLeft: 6,
    color: '#6D28D9',
    fontWeight: '900',
  },

  publishButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 15,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  unpublishButton: {
    backgroundColor: '#EA580C',
  },

  publishButtonText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  emptyCard: {
    borderRadius: 24,
    padding: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 11,
    color: '#2E1065',
    fontSize: 19,
    fontWeight: '900',
  },

  emptyText: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '700',
  },

  emptyButton: {
    marginTop: 15,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#7C3AED',
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    maxHeight: '94%',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },

  modalContent: {
    paddingBottom: 40,
  },

  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalEyebrow: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  modalPreview: {
    marginTop: 14,
    height: 330,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  modalPreviewImage: {
    width: '100%',
    height: '100%',
  },

  modalTitle: {
    marginTop: 16,
    color: '#0F172A',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },

  modalDescription: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },

  detailRow: {
    flexDirection: 'row',
    gap: 10,
  },

  detailCard: {
    marginTop: 12,
    borderRadius: 17,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  detailHalf: {
    flex: 1,
    marginTop: 12,
    borderRadius: 17,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  detailLabel: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '900',
  },

  detailValue: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  availabilityCard: {
    marginTop: 12,
    borderRadius: 17,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },

  availabilityTextWrap: {
    flex: 1,
  },

  availabilityHeading: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  availabilityTitle: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },

  availabilityDescription: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  openPdfButton: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  openPdfButtonText: {
    marginLeft: 7,
    color: '#4F46E5',
    fontWeight: '900',
  },

  modalPublishButton: {
    marginTop: 12,
    minHeight: 51,
    borderRadius: 16,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalUnpublishButton: {
    marginTop: 12,
    minHeight: 51,
    borderRadius: 16,
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalActionText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  deleteButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: {
    marginLeft: 7,
    color: '#B91C1C',
    fontWeight: '900',
  },

 previewFrame: {
  width: '100%',
  aspectRatio: 1.55,
  borderRadius: 22,
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  overflow: 'hidden',
  marginBottom: 13,
  alignItems: 'center',
  justifyContent: 'center',
},

previewImage: {
  width: '100%',
  height: '100%',
},

modalPreviewPlaceholder: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
},

modalPreviewPlaceholderText: {
  marginTop: 8,
  color: '#94A3B8',
  fontSize: 13,
  fontWeight: '800',
  textAlign: 'center',
},
});
