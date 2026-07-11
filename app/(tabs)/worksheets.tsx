import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSubscription } from '../../lib/SubscriptionContext';
import { supabase } from '../../lib/supabase';

type WorksheetCategory =
  | 'Visual Routines'
  | 'Communication & Social Skills'
  | 'Behavior & Regulation'
  | 'Learning & Life Skills';

type WorksheetCategoryFilter = WorksheetCategory | 'All';

type WorksheetLibraryItem = {
  id: string;
  title: string;
  category: WorksheetCategory;
  description: string;
  age_range: string;
  skill_focus: string;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  preview_image_url: string | null;
  preview_storage_path: string | null;
  thumbnail_storage_path: string | null;
  is_pro: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const WORKSHEET_TABLE = 'worksheet_library';
const WORKSHEET_BUCKET = 'worksheet-files';

const CATEGORIES: WorksheetCategoryFilter[] = [
  'All',
  'Visual Routines',
  'Communication & Social Skills',
  'Behavior & Regulation',
  'Learning & Life Skills',
];

function sanitizeFileName(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || `aba-at-home-worksheet-${Date.now()}`;
}

function getCategoryIcon(
  category?: WorksheetCategory
): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'Visual Routines':
      return 'list-outline';

    case 'Communication & Social Skills':
      return 'chatbubbles-outline';

    case 'Behavior & Regulation':
      return 'heart-outline';

    case 'Learning & Life Skills':
      return 'school-outline';

    default:
      return 'document-text-outline';
  }
}

function getCategoryColor(category?: WorksheetCategory) {
  switch (category) {
    case 'Visual Routines':
      return {
        background: '#EDE9FE',
        text: '#6D28D9',
      };

    case 'Communication & Social Skills':
      return {
        background: '#DBEAFE',
        text: '#1D4ED8',
      };

    case 'Behavior & Regulation':
      return {
        background: '#FCE7F3',
        text: '#BE185D',
      };

    case 'Learning & Life Skills':
      return {
        background: '#DCFCE7',
        text: '#15803D',
      };

    default:
      return {
        background: '#F1F5F9',
        text: '#475569',
      };
  }
}

function getWorksheetPublicUrl(storagePath?: string | null) {
  if (!storagePath) {
    return null;
  }

  const normalizedPath = storagePath.replace(/^\/+/, '');

  const { data } = supabase.storage
    .from(WORKSHEET_BUCKET)
    .getPublicUrl(normalizedPath);

  return data?.publicUrl || null;
}

function prepareWorksheetItem(
  worksheet: WorksheetLibraryItem
): WorksheetLibraryItem {
  const previewStoragePath =
    worksheet.preview_storage_path ||
    worksheet.thumbnail_storage_path;

  return {
    ...worksheet,

    // Build fresh URLs using the real Supabase bucket.
    pdf_url:
      getWorksheetPublicUrl(worksheet.pdf_storage_path) ||
      worksheet.pdf_url,

    preview_image_url:
      getWorksheetPublicUrl(previewStoragePath) ||
      worksheet.preview_image_url,
  };
}

export default function WorksheetsScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();

  const [worksheets, setWorksheets] = useState<WorksheetLibraryItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<WorksheetCategoryFilter>('All');
  const [selectedWorksheet, setSelectedWorksheet] =
    useState<WorksheetLibraryItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingAction, setExportingAction] = useState<
    'print' | 'share' | 'email' | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const filteredWorksheets = useMemo(() => {
    if (selectedCategory === 'All') {
      return worksheets;
    }

    return worksheets.filter(
      (worksheet) => worksheet.category === selectedCategory
    );
  }, [selectedCategory, worksheets]);

  useEffect(() => {
    void loadWorksheets();
  }, []);

  async function loadWorksheets(showRefreshSpinner = false) {
    try {
      if (showRefreshSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      const { data, error } = await supabase
        .from(WORKSHEET_TABLE)
        .select(
          `
            id,
            title,
            category,
            description,
            age_range,
            skill_focus,
            pdf_url,
            pdf_storage_path,
            preview_image_url,
            preview_storage_path,
            thumbnail_storage_path,
            is_pro,
            is_active,
            created_at,
            updated_at
          `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

     const preparedWorksheets = (
  (data || []) as WorksheetLibraryItem[]
).map(prepareWorksheetItem);

setWorksheets(preparedWorksheets);
    } catch (error: any) {
      console.error('Load worksheet library error:', error);

      const message =
        error?.message || 'The worksheet library could not be loaded.';

      setLoadError(message);

      Alert.alert('Worksheet Library Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function worksheetRequiresUpgrade(worksheet: WorksheetLibraryItem) {
    if (!worksheet.is_pro) {
      return false;
    }

    if (isPro) {
      return false;
    }

    setSelectedWorksheet(null);
    router.push('/subscription');

    return true;
  }

 async function downloadWorksheetPdf(
  worksheet: WorksheetLibraryItem
) {
  if (!FileSystem.cacheDirectory) {
    throw new Error('The app cache directory is unavailable.');
  }

  const freshPublicUrl =
    getWorksheetPublicUrl(worksheet.pdf_storage_path) ||
    worksheet.pdf_url;

  if (!freshPublicUrl) {
    throw new Error(
      'This worksheet does not have a valid PDF file.'
    );
  }

  const fileName = `${sanitizeFileName(
    worksheet.title
  )}.pdf`;

  const localUri = `${FileSystem.cacheDirectory}${fileName}`;

  const existingFile =
    await FileSystem.getInfoAsync(localUri);

  if (existingFile.exists) {
    await FileSystem.deleteAsync(localUri, {
      idempotent: true,
    });
  }

  console.log('Downloading worksheet PDF:', {
    title: worksheet.title,
    storagePath: worksheet.pdf_storage_path,
    publicUrl: freshPublicUrl,
  });

  const result = await FileSystem.downloadAsync(
    freshPublicUrl,
    localUri
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `The worksheet PDF could not be downloaded. Server status: ${result.status}.`
    );
  }

  const downloadedFile =
    await FileSystem.getInfoAsync(result.uri);

  if (!downloadedFile.exists) {
    throw new Error(
      'The worksheet PDF download did not create a local file.'
    );
  }

  return result.uri;
}

  async function handlePrintWorksheet(worksheet: WorksheetLibraryItem) {
    if (worksheetRequiresUpgrade(worksheet)) {
      return;
    }

    try {
      setExportingAction('print');

      const localUri = await downloadWorksheetPdf(worksheet);

      await Print.printAsync({
        uri: localUri,
      });
    } catch (error: any) {
      console.error('Print worksheet error:', error);

      Alert.alert(
        'Print Failed',
        error?.message || 'The worksheet could not be printed.'
      );
    } finally {
      setExportingAction(null);
    }
  }

  async function handleShareWorksheet(worksheet: WorksheetLibraryItem) {
    if (worksheetRequiresUpgrade(worksheet)) {
      return;
    }

    try {
      setExportingAction('share');

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          'Sharing Unavailable',
          'Sharing is not available on this device.'
        );
        return;
      }

      const localUri = await downloadWorksheetPdf(worksheet);

      await Sharing.shareAsync(localUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Share ${worksheet.title}`,
      });
    } catch (error: any) {
      console.error('Share worksheet error:', error);

      Alert.alert(
        'Share Failed',
        error?.message || 'The worksheet could not be shared.'
      );
    } finally {
      setExportingAction(null);
    }
  }

  async function handleEmailWorksheet(worksheet: WorksheetLibraryItem) {
    if (worksheetRequiresUpgrade(worksheet)) {
      return;
    }

    try {
      setExportingAction('email');

      const mailAvailable = await MailComposer.isAvailableAsync();

      if (!mailAvailable) {
        Alert.alert(
          'Email Unavailable',
          'No compatible email app is available on this device.'
        );
        return;
      }

      const localUri = await downloadWorksheetPdf(worksheet);

      await MailComposer.composeAsync({
        subject: `${worksheet.title} — ABA at Home`,
        body:
          `Hi,\n\n` +
          `I’m sending this printable ABA at Home worksheet.\n\n` +
          `Worksheet: ${worksheet.title}\n` +
          `Category: ${worksheet.category}\n\n` +
          `Sent from ABA at Home.`,
        attachments: [localUri],
      });
    } catch (error: any) {
      console.error('Email worksheet error:', error);

      Alert.alert(
        'Email Failed',
        error?.message || 'The worksheet could not be attached to an email.'
      );
    } finally {
      setExportingAction(null);
    }
  }

  function openWorksheet(worksheet: WorksheetLibraryItem) {
    setSelectedWorksheet(worksheet);
  }

  function closeWorksheet() {
    if (exportingAction) {
      return;
    }

    setSelectedWorksheet(null);
  }

  function renderWorksheetCard(worksheet: WorksheetLibraryItem) {
    const categoryColors = getCategoryColor(worksheet.category);
    const locked = worksheet.is_pro && !isPro;

    return (
      <TouchableOpacity
        key={worksheet.id}
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => openWorksheet(worksheet)}
      >
        <View style={styles.cardImageWrap}>
          {worksheet.preview_image_url ? (
            <Image
  source={{ uri: worksheet.preview_image_url }}
  style={styles.cardImage}
  resizeMode="contain"
/>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name={getCategoryIcon(worksheet.category)}
                size={42}
                color="#7C3AED"
              />
              <Text style={styles.imagePlaceholderText}>
                Worksheet Preview
              </Text>
            </View>
          )}

          {worksheet.is_pro ? (
            <View style={styles.imageProBadge}>
              <Ionicons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.imageProBadgeText}>PRO</Text>
            </View>
          ) : (
            <View style={styles.imageFreeBadge}>
              <Text style={styles.imageFreeBadgeText}>FREE</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.categoryPill,
                {
                  backgroundColor: categoryColors.background,
                },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(worksheet.category)}
                size={13}
                color={categoryColors.text}
              />

              <Text
                style={[
                  styles.categoryPillText,
                  {
                    color: categoryColors.text,
                  },
                ]}
              >
                {worksheet.category}
              </Text>
            </View>

            {locked ? (
              <View style={styles.lockedPill}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color="#7C3AED"
                />
                <Text style={styles.lockedPillText}>Preview</Text>
              </View>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#94A3B8"
              />
            )}
          </View>

          <Text style={styles.cardTitle}>{worksheet.title}</Text>

          <Text style={styles.cardDescription} numberOfLines={3}>
            {worksheet.description}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="people-outline"
                size={15}
                color="#64748B"
              />
              <Text style={styles.metaText}>
                {worksheet.age_range}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons
                name="document-text-outline"
                size={15}
                color="#64748B"
              />
              <Text style={styles.metaText}>Printable PDF</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const selectedCategoryColors = getCategoryColor(
    selectedWorksheet?.category
  );

  const selectedWorksheetLocked =
    Boolean(selectedWorksheet?.is_pro) && !isPro;

  const actionInProgress = Boolean(exportingAction);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#7C3AED"
            colors={['#7C3AED']}
            onRefresh={() => void loadWorksheets(true)}
          />
        }
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#29145F"
          />
        </TouchableOpacity>

        <Text style={styles.headerEyebrow}>ABA AT HOME</Text>
        <Text style={styles.headerTitle}>Worksheet Library</Text>

        <Text style={styles.headerSubtitle}>
          Premium printable worksheets for routines, communication,
          regulation, social skills, and everyday learning.
        </Text>

        {!isPro ? (
          <View style={styles.proPreviewBanner}>
            <View style={styles.proPreviewIcon}>
              <Ionicons
                name="star"
                size={21}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.proPreviewContent}>
              <Text style={styles.proPreviewTitle}>
                Explore the worksheet library
              </Text>

              <Text style={styles.proPreviewText}>
                Preview every worksheet. Pro worksheets can be printed,
                shared, and emailed with an active membership.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.proPreviewButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.proPreviewButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.readyBanner}>
            <Ionicons
              name="checkmark-circle"
              size={21}
              color="#047857"
            />

            <Text style={styles.readyBannerText}>
              Your printable worksheets are ready to preview, print,
              share, and email.
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.libraryHeadingRow}>
          <View>
            <Text style={styles.libraryHeading}>
              {selectedCategory === 'All'
                ? 'All Worksheets'
                : selectedCategory}
            </Text>

            {!loading ? (
              <Text style={styles.libraryCount}>
                {filteredWorksheets.length}{' '}
                {filteredWorksheets.length === 1
                  ? 'worksheet'
                  : 'worksheets'}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => void loadWorksheets(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color="#7C3AED"
              />
            ) : (
              <Ionicons
                name="refresh"
                size={19}
                color="#7C3AED"
              />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator
              size="large"
              color="#7C3AED"
            />

            <Text style={styles.stateTitle}>
              Loading worksheets...
            </Text>

            <Text style={styles.stateText}>
              Your worksheet library is being prepared.
            </Text>
          </View>
        ) : null}

        {!loading && loadError ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color="#B91C1C"
            />

            <Text style={styles.errorTitle}>
              Could not load worksheets
            </Text>

            <Text style={styles.errorText}>
              {loadError}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadWorksheets()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading &&
        !loadError &&
        filteredWorksheets.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons
              name="documents-outline"
              size={42}
              color="#94A3B8"
            />

            <Text style={styles.stateTitle}>
              No worksheets here yet
            </Text>

            <Text style={styles.stateText}>
              New worksheets uploaded through the admin uploader will
              appear here automatically.
            </Text>
          </View>
        ) : null}

        {!loading && !loadError ? (
          <View style={styles.cardList}>
            {filteredWorksheets.map(renderWorksheetCard)}
          </View>
        ) : null}

        <View style={styles.bottomInfoCard}>
          <View style={styles.bottomInfoHeader}>
            <Ionicons
              name="print-outline"
              size={20}
              color="#7C3AED"
            />

            <Text style={styles.bottomInfoTitle}>
              Designed for home practice
            </Text>
          </View>

          <Text style={styles.bottomInfoText}>
            Keep worksheet practice short, positive, and successful.
            Offer help when needed and praise effort instead of
            perfection.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selectedWorksheet)}
        transparent
        animationType="slide"
        onRequestClose={closeWorksheet}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.modalTopRow}>
                <View
                  style={[
                    styles.modalCategoryPill,
                    {
                      backgroundColor:
                        selectedCategoryColors.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={getCategoryIcon(
                      selectedWorksheet?.category
                    )}
                    size={14}
                    color={selectedCategoryColors.text}
                  />

                  <Text
                    style={[
                      styles.modalCategoryText,
                      {
                        color: selectedCategoryColors.text,
                      },
                    ]}
                  >
                    {selectedWorksheet?.category}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={closeWorksheet}
                  disabled={actionInProgress}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color="#29145F"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>
                {selectedWorksheet?.title}
              </Text>

              <Text style={styles.modalDescription}>
                {selectedWorksheet?.description}
              </Text>

              <View style={styles.previewCard}>
                {selectedWorksheet?.preview_image_url ? (
                  <Image
                    source={{
                      uri: selectedWorksheet.preview_image_url,
                    }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Ionicons
                      name="document-text-outline"
                      size={54}
                      color="#7C3AED"
                    />

                    <Text style={styles.previewPlaceholderTitle}>
                      Printable Worksheet
                    </Text>
                  </View>
                )}

                {selectedWorksheetLocked ? (
                  <View style={styles.previewLockedOverlay}>
                    <View style={styles.previewLockCircle}>
                      <Ionicons
                        name="lock-closed"
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>

                    <Text style={styles.previewLockedTitle}>
                      Pro Worksheet
                    </Text>

                    <Text style={styles.previewLockedText}>
                      Upgrade to print, share, or email this worksheet.
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <View style={styles.detailIcon}>
                    <Ionicons
                      name="people-outline"
                      size={19}
                      color="#4F46E5"
                    />
                  </View>

                  <Text style={styles.detailLabel}>Best For</Text>

                  <Text style={styles.detailValue}>
                    {selectedWorksheet?.age_range}
                  </Text>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.detailIcon}>
                    <Ionicons
                      name="star-outline"
                      size={19}
                      color="#4F46E5"
                    />
                  </View>

                  <Text style={styles.detailLabel}>Access</Text>

                  <Text style={styles.detailValue}>
                    {selectedWorksheet?.is_pro
                      ? 'Pro Membership'
                      : 'Free Worksheet'}
                  </Text>
                </View>
              </View>

              <View style={styles.skillFocusCard}>
                <View style={styles.skillFocusHeader}>
                  <Ionicons
                    name="sparkles-outline"
                    size={19}
                    color="#7C3AED"
                  />

                  <Text style={styles.skillFocusTitle}>
                    Skill Focus
                  </Text>
                </View>

                <Text style={styles.skillFocusText}>
                  {selectedWorksheet?.skill_focus ||
                    'Parent-supported skill practice and everyday learning.'}
                </Text>
              </View>

              {selectedWorksheetLocked ? (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => {
                    setSelectedWorksheet(null);
                    router.push('/subscription');
                  }}
                >
                  <Ionicons
                    name="star"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text style={styles.upgradeButtonText}>
                    Unlock with Pro
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.printButton}
                      disabled={actionInProgress}
                      onPress={() => {
                        if (selectedWorksheet) {
                          void handlePrintWorksheet(
                            selectedWorksheet
                          );
                        }
                      }}
                    >
                      {exportingAction === 'print' ? (
                        <ActivityIndicator color="#475569" />
                      ) : (
                        <>
                          <Ionicons
                            name="print-outline"
                            size={19}
                            color="#475569"
                          />

                          <Text style={styles.printButtonText}>
                            Print
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareButton}
                      disabled={actionInProgress}
                      onPress={() => {
                        if (selectedWorksheet) {
                          void handleShareWorksheet(
                            selectedWorksheet
                          );
                        }
                      }}
                    >
                      {exportingAction === 'share' ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="share-outline"
                            size={19}
                            color="#FFFFFF"
                          />

                          <Text style={styles.shareButtonText}>
                            Share PDF
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.emailButton}
                    disabled={actionInProgress}
                    onPress={() => {
                      if (selectedWorksheet) {
                        void handleEmailWorksheet(
                          selectedWorksheet
                        );
                      }
                    }}
                  >
                    {exportingAction === 'email' ? (
                      <ActivityIndicator color="#4F46E5" />
                    ) : (
                      <>
                        <Ionicons
                          name="mail-outline"
                          size={19}
                          color="#4F46E5"
                        />

                        <Text style={styles.emailButtonText}>
                          Email PDF
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.parentTipCard}>
                <View style={styles.parentTipHeader}>
                  <Ionicons
                    name="bulb"
                    size={19}
                    color="#D97706"
                  />

                  <Text style={styles.parentTipTitle}>
                    Parent Tip
                  </Text>
                </View>

                <Text style={styles.parentTipText}>
                  Let your child explore the worksheet at their own
                  pace. Model the activity, offer gentle prompts, and
                  celebrate participation.
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 50,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 19,
  },

  headerEyebrow: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 4,
  },

  headerTitle: {
    color: '#29145F',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },

  proPreviewBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  proPreviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  proPreviewContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  proPreviewTitle: {
    color: '#2E1065',
    fontSize: 14,
    fontWeight: '900',
  },

  proPreviewText: {
    marginTop: 3,
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },

  proPreviewButton: {
    borderRadius: 13,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  proPreviewButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  readyBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  readyBannerText: {
    flex: 1,
    marginLeft: 9,
    color: '#065F46',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },

  categoryRow: {
    paddingBottom: 8,
    marginBottom: 13,
  },

  categoryChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  categoryChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  categoryChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },

  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  libraryHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  libraryHeading: {
    color: '#29145F',
    fontSize: 20,
    fontWeight: '900',
  },

  libraryCount: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardList: {
    gap: 15,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9E5F0',
    shadowColor: '#29145F',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  cardImageWrap: {
  height: 310,
  backgroundColor: '#FFFFFF',
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
},

cardImage: {
  width: '100%',
  height: '100%',
  backgroundColor: '#FFFFFF',
},

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },

  imagePlaceholderText: {
    marginTop: 8,
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '900',
  },

  imageProBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  imageProBadgeText: {
    marginLeft: 4,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  imageFreeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#059669',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  imageFreeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  cardBody: {
    padding: 17,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  categoryPill: {
    maxWidth: '85%',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryPillText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '900',
  },

  lockedPill: {
    borderRadius: 999,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  lockedPillText: {
    marginLeft: 4,
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '900',
  },

  cardTitle: {
    marginTop: 13,
    color: '#1E293B',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },

  cardDescription: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },

  metaRow: {
    marginTop: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    marginLeft: 5,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  stateCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E5F0',
    padding: 30,
    alignItems: 'center',
  },

  stateTitle: {
    marginTop: 13,
    color: '#29145F',
    fontSize: 18,
    fontWeight: '900',
  },

  stateText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },

  errorCard: {
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 25,
    alignItems: 'center',
  },

  errorTitle: {
    marginTop: 10,
    color: '#991B1B',
    fontSize: 17,
    fontWeight: '900',
  },

  errorText: {
    marginTop: 6,
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },

  retryButton: {
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: '#B91C1C',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  bottomInfoCard: {
    marginTop: 20,
    backgroundColor: '#F5F3FF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 17,
  },

  bottomInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bottomInfoTitle: {
    marginLeft: 8,
    color: '#2E1065',
    fontSize: 15,
    fontWeight: '900',
  },

  bottomInfoText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    maxHeight: '94%',
    backgroundColor: '#FFF9F2',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  modalHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
  },

  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 35,
  },

  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalCategoryPill: {
    maxWidth: '82%',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalCategoryText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '900',
  },

  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    marginTop: 16,
    color: '#29145F',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },

  modalDescription: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },

  previewCard: {
    height: 430,
    marginTop: 16,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E5F0',
    overflow: 'hidden',
    position: 'relative',
  },

  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },

  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },

  previewPlaceholderTitle: {
    marginTop: 10,
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '900',
  },

  previewLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(46, 16, 101, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  previewLockCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewLockedTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  previewLockedText: {
    marginTop: 5,
    color: '#EDE9FE',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '700',
  },

  detailsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 11,
  },

  detailCard: {
    flex: 1,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E5F0',
    padding: 14,
  },

  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailLabel: {
    marginTop: 9,
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  detailValue: {
    marginTop: 4,
    color: '#1E293B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },

  skillFocusCard: {
    marginTop: 13,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E5F0',
    padding: 16,
  },

  skillFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  skillFocusTitle: {
    marginLeft: 7,
    color: '#2E1065',
    fontSize: 15,
    fontWeight: '900',
  },

  skillFocusText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },

  actionRow: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 11,
  },

  printButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  printButtonText: {
    marginLeft: 7,
    color: '#475569',
    fontSize: 14,
    fontWeight: '900',
  },

  shareButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shareButtonText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  emailButton: {
    minHeight: 52,
    marginTop: 11,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emailButtonText: {
    marginLeft: 7,
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '900',
  },

  upgradeButton: {
    minHeight: 54,
    marginTop: 15,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  upgradeButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  parentTipCard: {
    marginTop: 15,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 16,
  },

  parentTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  parentTipTitle: {
    marginLeft: 7,
    color: '#92400E',
    fontSize: 14,
    fontWeight: '900',
  },

  parentTipText: {
    marginTop: 7,
    color: '#B45309',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});