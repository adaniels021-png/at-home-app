import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { supabase } from '../../lib/supabase';
import {
  buildWorksheetHtml,
  CATEGORIES,
  DifficultyLevel,
  getSkillFocus,
  WorksheetCategory,
  WorksheetItem,
  WORKSHEETS,
} from '../../lib/worksheetTemplates';

const DEFAULT_DIFFICULTY: DifficultyLevel = 'beginner';

type DisplayCategory = WorksheetCategory | 'All';
type WorksheetOrientation = 'portrait' | 'landscape';
type WorksheetWithPrintOptions = WorksheetItem & {
  orientation?: WorksheetOrientation;
  printImage?: any;
  previewImageUrl?: string;
  pdfUrl?: string;
  skillFocus?: string;
  isUploaded?: boolean;
  isProWorksheet?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
};

type UploadedWorksheetRow = {
  id: string;
  title: string;
  category: WorksheetCategory;
  description: string | null;
  age_range: string | null;
  difficulty?: DifficultyLevel | null;
  skill_focus?: string | null;
  orientation?: WorksheetOrientation | null;

  pdf_url: string | null;
  preview_image_url: string | null;

  page_count?: number | null;
  is_pro?: boolean | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  status?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};


function getCategoryLabel(category: DisplayCategory) {
  const shortLabels: Record<string, string> = {
    All: 'All',
    'Visual Routines': 'Routines',
    'Communication & Social': 'Communication',
    Regulation: 'Regulation',
    Behavior: 'Behavior',
    'Behavior & Regulation': 'Behavior',
    'Life Skills': 'Life Skills',
    'Learning & Life Skills': 'Life Skills',
  };

  return shortLabels[category] || category;
}

function getWorksheetOrientation(worksheet: WorksheetItem): WorksheetOrientation {
  return (worksheet as WorksheetWithPrintOptions).orientation || 'landscape';
}

function getPrintableImageSource(worksheet: WorksheetItem) {
  const item = worksheet as WorksheetWithPrintOptions;
  return item.printImage || item.image;
}

function mapUploadedWorksheet(
  row: UploadedWorksheetRow
): WorksheetWithPrintOptions {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description:
  row.description ||
  'Printable ABA at Home worksheet.',
    ageRange: row.age_range || 'All ages',

    orientation:
      row.orientation === 'landscape'
        ? 'landscape'
        : 'portrait',

    previewImageUrl:
      row.preview_image_url || undefined,

    pdfUrl:
      row.pdf_url || undefined,

    skillFocus:
      row.skill_focus || undefined,

    isUploaded: true,
    isProWorksheet: row.is_pro !== false,
    isFeatured: row.is_featured === true,
    sortOrder: row.sort_order || 0,
  };
}

function getWorksheetPreviewSource(
  worksheet: WorksheetWithPrintOptions
) {
  if (worksheet.previewImageUrl) {
    return {
      uri: worksheet.previewImageUrl,
    };
  }

  return worksheet.image || null;
}

export default function WorksheetsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();

  const scrollRef = useRef<ScrollView | null>(null);

   const [uploadedWorksheets, setUploadedWorksheets] =
  useState<WorksheetWithPrintOptions[]>([]);

  const [loadingUploadedWorksheets, setLoadingUploadedWorksheets] =
  useState(true);
  const [selectedCategory, setSelectedCategory] = useState<DisplayCategory>('All');
  const [selectedWorksheet, setSelectedWorksheet] = useState<WorksheetItem | null>(null);
  const [childName, setChildName] = useState('');
  const [exporting, setExporting] = useState(false);
const [showPersonalize, setShowPersonalize] = useState(false);

useEffect(() => {
    const profileName = selectedChild?.child_name || selectedChild?.name || '';

    if (profileName && !childName.trim()) {
      setChildName(profileName);
    }
  }, [selectedChild, childName]);

 useFocusEffect(
  useCallback(() => {
    let mounted = true;

    async function loadUploadedWorksheets() {
      try {
        setLoadingUploadedWorksheets(true);

        const { data, error } = await supabase
          .from('worksheet_library')
          .select(
            `
            id,
            title,
            category,
            description,
            age_range,
            difficulty,
            skill_focus,
            orientation,
            pdf_url,
            preview_image_url,
            page_count,
            is_pro,
            is_featured,
            is_active,
            status,
            sort_order,
            created_at
            `
          )
          .eq('status', 'approved')
          .eq('is_active', true)
          .order('is_featured', {
            ascending: false,
          })
          .order('sort_order', {
            ascending: true,
          })
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        console.log(
          'Approved uploaded worksheets:',
          data?.length ?? 0,
          data
        );

        const mapped = (
          (data ?? []) as UploadedWorksheetRow[]
        )
          .filter(
            (row) =>
              Boolean(
                row.title &&
                  row.category &&
                  row.pdf_url &&
                  row.preview_image_url
              )
          )
          .map(mapUploadedWorksheet);

        setUploadedWorksheets(mapped);
      } catch (error: any) {
        console.error(
          'Uploaded worksheet load error:',
          error
        );

        if (mounted) {
          setUploadedWorksheets([]);

          Alert.alert(
            'Worksheet Library Error',
            error?.message ||
              'Uploaded worksheets could not be loaded.'
          );
        }
      } finally {
        if (mounted) {
          setLoadingUploadedWorksheets(false);
        }
      }
    }

    void loadUploadedWorksheets();

    return () => {
      mounted = false;
    };
  }, [])
);

  const categoryOptions = useMemo<DisplayCategory[]>(() => {
    const baseCategories = CATEGORIES as DisplayCategory[];

    return baseCategories.includes('All' as DisplayCategory)
      ? baseCategories
      : ['All', ...baseCategories];
  }, []);

const allWorksheets = useMemo<
  WorksheetWithPrintOptions[]
>(() => {
  const builtInWorksheets =
    WORKSHEETS as WorksheetWithPrintOptions[];

  return [
    ...uploadedWorksheets,
    ...builtInWorksheets,
  ];
}, [uploadedWorksheets]);

 const filteredWorksheets = useMemo(() => {
  if (selectedCategory === 'All') {
    return allWorksheets;
  }

  return allWorksheets.filter(
    (item) =>
      item.category === selectedCategory
  );
}, [
  allWorksheets,
  selectedCategory,
]);

  const selectedChildName =
    childName.trim() ||
    selectedChild?.child_name ||
    selectedChild?.name ||
    'Child';

  const requireProForWorksheet = () => {
    if (!isPro) {
      router.push('/subscription');
      return true;
    }

    return false;
  };

  const getWorksheetImageDataUri = async (imageSource: any) => {
    const asset = Asset.fromModule(imageSource);
    await asset.downloadAsync();

    const imageUri = asset.localUri || asset.uri;

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/jpeg;base64,${base64}`;
  };

  const buildPrintableWorksheetHtml = async (worksheet: WorksheetItem) => {
    const printableImage = getPrintableImageSource(worksheet);

    if (!printableImage) {
      return buildWorksheetHtml({
        worksheet,
        childName: selectedChildName,
        difficulty: DEFAULT_DIFFICULTY,
      });
    }

    const imageDataUri = await getWorksheetImageDataUri(printableImage);
    const orientation = getWorksheetOrientation(worksheet);
    const pageWidth = orientation === 'landscape' ? '11in' : '8.5in';
    const pageHeight = orientation === 'landscape' ? '8.5in' : '11in';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${pageWidth} ${pageHeight};
              margin: 0;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: ${pageWidth};
              height: ${pageHeight};
              background: white;
              overflow: hidden;
            }

            .page {
              width: ${pageWidth};
              height: ${pageHeight};
              margin: 0;
              padding: 0;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }

            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>

        <body>
          <div class="page">
            <img src="${imageDataUri}" />
          </div>
        </body>
      </html>
    `;
  };

  const createWorksheetPdf = async (worksheet: WorksheetItem) => {
    const html = await buildPrintableWorksheetHtml(worksheet);
    const orientation = getWorksheetOrientation(worksheet);

    const file = await Print.printToFileAsync({
      html,
      width: orientation === 'landscape' ? 792 : 612,
      height: orientation === 'landscape' ? 612 : 792,
    });

    return file.uri;
  };

  const getWorksheetPdfUri = async (
  worksheet: WorksheetItem
) => {
  const item =
    worksheet as WorksheetWithPrintOptions;

  if (!item.pdfUrl) {
    return createWorksheetPdf(worksheet);
  }

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
      item.pdfUrl,
      destination
    );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      'The worksheet PDF could not be downloaded.'
    );
  }

  return result.uri;
};

  const handleShareWorksheet = async (worksheet: WorksheetItem) => {
    if (requireProForWorksheet()) return;

    setExporting(true);

    try {
      const uri = await getWorksheetPdfUri(worksheet);
      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          'PDF Created',
          'The worksheet PDF was created, but sharing is not available on this device.'
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${worksheet.title}`,
      });
    } catch (error: any) {
      console.error('Share worksheet error:', error);
      Alert.alert('Share Failed', error?.message || 'Could not share this worksheet.');
    } finally {
      setExporting(false);
    }
  };

  const handleEmailWorksheet = async (worksheet: WorksheetItem) => {
    if (requireProForWorksheet()) return;

    setExporting(true);

    try {
      const uri = await getWorksheetPdfUri(worksheet);

      await MailComposer.composeAsync({
        subject: `${worksheet.title} - ABA at Home`,
        body: `Hi,\n\nI’m sending this printable worksheet.\n\nWorksheet: ${worksheet.title}\nChild: ${selectedChildName}\n\nSent from ABA at Home.`,
        attachments: [uri],
      });
    } catch (error: any) {
      console.error('Email worksheet error:', error);
      Alert.alert('Email Failed', error?.message || 'Could not open email for this worksheet.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintWorksheet = async (
  worksheet: WorksheetItem
) => {
  if (requireProForWorksheet()) return;

  setExporting(true);

  try {
    const item =
      worksheet as WorksheetWithPrintOptions;

    /*
     * Uploaded worksheets already have a completed PDF.
     * Open the system PDF actions so the parent can choose Print.
     */
    if (item.pdfUrl) {
      const uri =
        await getWorksheetPdfUri(worksheet);

      const canShare =
        await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          'PDF Ready',
          'The worksheet PDF was downloaded, but the system print and sharing menu is not available on this device.'
        );

        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle:
          `Print ${worksheet.title}`,
        UTI: 'com.adobe.pdf',
      });

      return;
    }

    /*
     * Existing built-in worksheets continue using
     * the current direct HTML print workflow.
     */
    const html =
      await buildPrintableWorksheetHtml(
        worksheet
      );

    const orientation =
      getWorksheetOrientation(worksheet);

    await Print.printAsync({
      html,
      orientation,
    });
  } catch (error: any) {
    console.error(
      'Print worksheet error:',
      error
    );

    Alert.alert(
      'Print Failed',
      error?.message ||
        'Could not open the print dialog.'
    );
  } finally {
    setExporting(false);
  }
};

  const nameWorksheet = WORKSHEETS.find((item) => item.id === 'paths-to-objects');

  const previewHtml = selectedWorksheet
    ? buildWorksheetHtml({
        worksheet: selectedWorksheet,
        childName: selectedChildName,
        difficulty: DEFAULT_DIFFICULTY,
      })
    : '';

  function scrollToWorksheetList() {
    scrollRef.current?.scrollTo({ y: 520, animated: true });
  }

  function handleHeroPdfPress() {
    if (!isPro) {
      router.push('/subscription');
      return;
    }

    const firstWorksheet = filteredWorksheets[0];

    if (firstWorksheet) {
      void handleShareWorksheet(firstWorksheet);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundBase} />
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobBottomLeft} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={23} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Worksheets</Text>
        </View>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <View pointerEvents="none" style={styles.heroGlowSmall} />

          <View style={styles.heroTextColumn}>
            <View style={styles.heroIcon}>
              <Ionicons name="document-text-outline" size={30} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>Printable Worksheets</Text>

            <View style={styles.heroBadge}>
  <Ionicons
    name="document-text-outline"
    size={13}
    color="#2563EB"
  />

  <Text style={styles.heroBadgeText}>
    {loadingUploadedWorksheets
      ? `${WORKSHEETS.length} printables`
      : `${allWorksheets.length} printables`}
  </Text>
</View>

<Text style={styles.heroSubtitle}>
              Evidence-based printables for routines, behavior, regulation, and home learning.
            </Text>

            <View style={styles.heroFooterRow}>
              <TouchableOpacity
                style={styles.heroPill}
                onPress={scrollToWorksheetList}
                activeOpacity={0.9}
              >
                <Ionicons name="eye-outline" size={14} color="#3730A3" />
                <Text style={styles.heroPillText}>Preview ready</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroPill}
                onPress={handleHeroPdfPress}
                activeOpacity={0.9}
              >
                <Ionicons
                  name={isPro ? 'download-outline' : 'lock-closed-outline'}
                  size={14}
                  color="#3730A3"
                />
                <Text style={styles.heroPillText}>{isPro ? 'PDF unlocked' : 'Pro PDF'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View pointerEvents="none" style={styles.heroArtwork}>
            <View style={styles.paperBack} />
            <View style={styles.paperFront}>
              <Text style={styles.paperTitle}>MATCH</Text>
              <View style={styles.paperGridRow}>
                <View style={styles.paperBox} />
                <View style={styles.paperBoxFilled} />
              </View>
              <View style={styles.paperGridRow}>
                <View style={styles.paperBoxFilledAlt} />
                <View style={styles.paperBox} />
              </View>
            </View>
            <View style={styles.pencil} />
            <View style={styles.crayonOne} />
            <View style={styles.crayonTwo} />
          </View>
        </View>

        {!isPro ? (
          <View style={styles.lockedBanner}>
            <View style={styles.lockedIconWrap}>
              <Ionicons name="lock-closed" size={18} color="#7C2D12" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.lockedTitle}>Pro Feature Preview</Text>
              <Text style={styles.lockedText}>
                You can preview worksheet options here. Printing, PDF sharing, email export, and personalized worksheets are unlocked with Pro.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.lockedButton}
              onPress={() => router.push('/subscription')}
              activeOpacity={0.9}
            >
              <Ionicons name="star" size={14} color="#FFFFFF" />
              <Text style={styles.lockedButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.personalizeCard}>
          <TouchableOpacity
            style={styles.personalizeHeader}
            onPress={() => setShowPersonalize((prev) => !prev)}
            activeOpacity={0.85}
          >
            <View style={styles.personalizeTitleRow}>
              <View style={styles.personalizeIconWrap}>
                <Ionicons name="create-outline" size={20} color="#4F46E5" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.personalizeTitle}>Personalize worksheets</Text>
                <Text style={styles.personalizeSubtitle}>Using name: {selectedChildName}</Text>
              </View>
            </View>

            <Ionicons
              name={showPersonalize ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#64748B"
            />
          </TouchableOpacity>

          {showPersonalize ? (
            <View style={styles.personalizeBody}>
              <Text style={styles.nameDescription}>
                Enter your child’s name so personalized worksheets use their real name.
              </Text>

              <TextInput
                value={childName}
                onChangeText={setChildName}
                placeholder="Enter child name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              <TouchableOpacity
                style={[styles.generateBtn, !isPro && styles.disabledBtn]}
                onPress={() => {
                  if (nameWorksheet) {
                    void handleShareWorksheet(nameWorksheet);
                  }
                }}
                disabled={exporting}
                activeOpacity={0.9}
              >
                {exporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={isPro ? 'document-text-outline' : 'lock-closed-outline'}
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text style={styles.generateBtnText}>
                      {isPro
                        ? 'Create Personalized Tracing PDF'
                        : 'Pro Required for PDF'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categoryOptions.map((category) => {
            const active = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.86}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {getCategoryLabel(category)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.listHeaderRow}>
          <View>
            <Text style={styles.listTitle}>{getCategoryLabel(selectedCategory)}</Text>
            <Text style={styles.listSubtitle}>{filteredWorksheets.length} worksheet options</Text>
          </View>
        </View>

        <View style={styles.cardList}>
          {filteredWorksheets.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => setSelectedWorksheet(item)}
              activeOpacity={0.9}
            >
             {getWorksheetPreviewSource(
  item as WorksheetWithPrintOptions
) ? (
  <View style={styles.cardImageFrame}>
    <Image
      source={
        getWorksheetPreviewSource(
          item as WorksheetWithPrintOptions
        )!
      }
      style={styles.cardImage}
      resizeMode="contain"
    />
  </View>
) : null}

              <View style={styles.cardTopRow}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{getCategoryLabel(item.category)}</Text>
                </View>

                <View style={[styles.proPill, isPro && styles.proPillUnlocked]}>
                  <Ionicons
                    name={isPro ? 'checkmark-circle' : 'lock-closed'}
                    size={12}
                    color={isPro ? '#047857' : '#7C3AED'}
                  />
                  <Text style={[styles.proPillText, isPro && styles.proPillTextUnlocked]}>
                    {isPro ? 'PDF Ready' : 'Pro PDF'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>

              <View style={styles.metaActionRow}>
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={15} color="#64748B" />
                  <Text style={styles.metaText}>{item.ageRange}</Text>
                </View>

                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.previewMiniBtn}
                    onPress={(event: GestureResponderEvent) => {
                      event.stopPropagation();
                      setSelectedWorksheet(item);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="eye-outline" size={15} color="#4F46E5" />
                    <Text style={styles.previewMiniText}>Preview</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pdfMiniBtn, !isPro && styles.pdfMiniBtnLocked]}
                    onPress={(event: GestureResponderEvent) => {
                      event.stopPropagation();
                      void handleShareWorksheet(item);
                    }}
                    disabled={exporting}
                    activeOpacity={0.88}
                  >
                    <Ionicons
                      name={isPro ? 'download-outline' : 'lock-closed-outline'}
                      size={15}
                      color="#FFFFFF"
                    />
                    <Text style={styles.pdfMiniText}>PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.proCard}>
          <View style={styles.proHeader}>
            <Ionicons name="star" size={19} color="#F59E0B" />
            <Text style={styles.proTitle}>Premium Printable Worksheets</Text>
          </View>

          <Text style={styles.proText}>
            Pro unlocks colorful printable PDFs, worksheet previews, email export, sharing, and parent-friendly ABA tools.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedWorksheet}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedWorksheet(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalCategoryPill}>
                  <Text style={styles.modalCategoryPillText}>
                    {selectedWorksheet?.category ? getCategoryLabel(selectedWorksheet.category) : ''}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setSelectedWorksheet(null)} activeOpacity={0.85}>
                  <Ionicons name="close-circle" size={31} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>{selectedWorksheet?.title}</Text>
              <Text style={styles.modalSubtitle}>{selectedWorksheet?.description}</Text>

              <View style={styles.previewBox}>
                {selectedWorksheet &&
getWorksheetPreviewSource(
  selectedWorksheet as WorksheetWithPrintOptions
) ? (
  <Image
    source={
      getWorksheetPreviewSource(
        selectedWorksheet as WorksheetWithPrintOptions
      )!
    }
    style={styles.previewImage}
    resizeMode="contain"
  />
) : selectedWorksheet ? (
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: previewHtml }}
                    style={styles.previewWebView}
                    showsVerticalScrollIndicator={false}
                  />
                ) : null}
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailSectionHalf}>
                  <Text style={styles.detailTitle}>Best For</Text>
                  <Text style={styles.detailText}>{selectedWorksheet?.ageRange}</Text>
                </View>

                <View style={styles.detailSectionHalf}>
                  <Text style={styles.detailTitle}>Access</Text>
                  <Text style={styles.detailText}>{isPro ? 'PDF unlocked' : 'Preview only'}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Skill Focus</Text>
                <Text style={styles.detailText}>
  {(
    selectedWorksheet as
      | WorksheetWithPrintOptions
      | null
  )?.skillFocus ||
    getSkillFocus(
      selectedWorksheet?.category
    )}
</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, !isPro && styles.disabledLightBtn]}
                  onPress={() =>
                    selectedWorksheet && void handlePrintWorksheet(selectedWorksheet)
                  }
                  disabled={exporting}
                  activeOpacity={0.9}
                >
                  {exporting ? (
                    <ActivityIndicator color="#475569" />
                  ) : (
                    <>
                      <Ionicons
                        name={isPro ? 'print-outline' : 'lock-closed-outline'}
                        size={18}
                        color="#475569"
                      />
                      <Text style={styles.secondaryBtnText}>Print</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, !isPro && styles.disabledBtn]}
                  onPress={() =>
                    selectedWorksheet && void handleShareWorksheet(selectedWorksheet)
                  }
                  disabled={exporting}
                  activeOpacity={0.9}
                >
                  {exporting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name={isPro ? 'download-outline' : 'lock-closed-outline'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.primaryBtnText}>Share PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.emailBtn, !isPro && styles.disabledLightBtn]}
                onPress={() =>
                  selectedWorksheet && void handleEmailWorksheet(selectedWorksheet)
                }
                disabled={exporting}
                activeOpacity={0.9}
              >
                {exporting ? (
                  <ActivityIndicator color="#4F46E5" />
                ) : (
                  <>
                    <Ionicons
                      name={isPro ? 'mail-outline' : 'lock-closed-outline'}
                      size={18}
                      color="#4F46E5"
                    />
                    <Text style={styles.emailBtnText}>Email PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              {!isPro ? (
                <TouchableOpacity
                  style={styles.upgradeModalBtn}
                  onPress={() => router.push('/subscription')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="star" size={18} color="#FFFFFF" />
                  <Text style={styles.upgradeModalText}>Upgrade to Pro</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.tipBox}>
                <View style={styles.tipHeader}>
                  <Ionicons name="bulb" size={18} color="#F59E0B" />
                  <Text style={styles.tipTitle}>Parent Tip</Text>
                </View>

                <Text style={styles.tipText}>
                  Keep worksheet practice short and successful. Pair written tasks with praise, breaks, and visual supports when needed.
                </Text>
              </View>
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
    backgroundColor: '#F8FAFC',
  },

  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },

  bgBlobTopRight: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#EEF2FF',
    top: -130,
    right: -145,
    opacity: 0.85,
  },

  bgBlobBottomLeft: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#F5F3FF',
    bottom: 190,
    left: -160,
    opacity: 0.65,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 130,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  topBarTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#DBEAFE',
    borderRadius: 28,
    padding: 14,
    marginBottom: 12,
    minHeight: 168,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  heroTextColumn: {
    width: '64%',
    zIndex: 2,
  },

  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  heroTitle: {
    color: '#0F172A',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    marginBottom: 5,
    letterSpacing: -0.35,
  },

  heroSubtitle: {
    color: '#334155',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '800',
  },

  heroFooterRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 9,
    flexWrap: 'wrap',
  },

  heroGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.38)',
    top: -82,
    right: -72,
  },

  heroGlowSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(79,70,229,0.08)',
    bottom: -54,
    left: -45,
  },

  heroPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroPillText: {
    marginLeft: 5,
    color: '#3730A3',
    fontSize: 11.5,
    fontWeight: '900',
  },

  heroArtwork: {
    position: 'absolute',
    width: 104,
    height: 108,
    right: 10,
    bottom: 10,
  },

  paperBack: {
    position: 'absolute',
    width: 74,
    height: 96,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    right: 8,
    top: 2,
    transform: [{ rotate: '8deg' }],
    opacity: 0.9,
  },

  paperFront: {
    position: 'absolute',
    width: 80,
    height: 102,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    right: 24,
    top: 11,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  paperTitle: {
    color: '#1E3A8A',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
  },

  paperGridRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },

  paperBox: {
    width: 27,
    height: 27,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFC',
  },

  paperBoxFilled: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  paperBoxFilledAlt: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  pencil: {
    position: 'absolute',
    width: 16,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    right: 7,
    bottom: 9,
    transform: [{ rotate: '23deg' }],
  },

  crayonOne: {
    position: 'absolute',
    width: 13,
    height: 44,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    right: 0,
    bottom: 4,
    transform: [{ rotate: '59deg' }],
  },

  crayonTwo: {
    position: 'absolute',
    width: 13,
    height: 52,
    borderRadius: 7,
    backgroundColor: '#F97316',
    right: 43,
    bottom: -2,
    transform: [{ rotate: '77deg' }],
  },

  lockedBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  lockedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockedTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#9A3412',
    marginBottom: 4,
  },

  lockedText: {
    color: '#9A3412',
    lineHeight: 19,
    fontSize: 13,
    fontWeight: '700',
  },

  lockedButton: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  lockedButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    marginLeft: 5,
  },

  personalizeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  personalizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  personalizeTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  personalizeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  personalizeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 2,
  },

  personalizeSubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },

  personalizeBody: {
    paddingTop: 14,
  },

  nameDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '700',
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 12,
  },

  generateBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  disabledBtn: {
    opacity: 0.72,
  },

  disabledLightBtn: {
    opacity: 0.75,
  },

  generateBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 8,
  },

  categoryRow: {
    paddingBottom: 6,
    marginBottom: 0,
  },

  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  categoryChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  categoryChipText: {
    color: '#475569',
    fontWeight: '900',
    fontSize: 13,
  },

  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: 10,
  },

  listTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },

  listSubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  cardList: {
    marginTop: 0,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },

cardImageFrame: {
  width: '100%',
  aspectRatio: 1.55,
  borderRadius: 20,
  marginBottom: 13,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
},

cardImage: {
  width: '100%',
  height: '100%',
},

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  categoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  categoryPillText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '900',
  },

  proPill: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  proPillUnlocked: {
    backgroundColor: '#ECFDF5',
  },

  proPillText: {
    marginLeft: 4,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },

  proPillTextUnlocked: {
    color: '#047857',
  },

  cardTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 13,
    marginBottom: 6,
    letterSpacing: -0.2,
  },

  cardDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '700',
  },

  metaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    marginLeft: 6,
    color: '#64748B',
    fontWeight: '800',
    fontSize: 13,
  },

  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  previewMiniBtn: {
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewMiniText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },

  pdfMiniBtn: {
    borderRadius: 999,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pdfMiniBtnLocked: {
    backgroundColor: '#7C3AED',
  },

  pdfMiniText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 5,
  },

  proCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  proTitle: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '900',
    color: '#1E293B',
  },

  proText: {
    color: '#64748B',
    lineHeight: 21,
    fontSize: 14,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    backgroundColor: '#F8FAFC',
    maxHeight: '92%',
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

  modalScrollContent: {
    paddingBottom: 34,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalCategoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },

  modalCategoryPillText: {
    color: '#4F46E5',
    fontWeight: '900',
    fontSize: 12,
  },

  modalTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.25,
  },

  modalSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 22,
    fontWeight: '700',
  },

  previewBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 360,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  previewWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },

  detailGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  detailSectionHalf: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  detailTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },

  detailText: {
    color: '#475569',
    lineHeight: 21,
    fontSize: 14,
    fontWeight: '700',
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },

  secondaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  secondaryBtnText: {
    marginLeft: 8,
    color: '#475569',
    fontWeight: '900',
    fontSize: 14,
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  primaryBtnText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  emailBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },

  emailBtnText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '900',
    fontSize: 14,
  },

  upgradeModalBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },

  upgradeModalText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },

  tipBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 24,
  },

  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  tipTitle: {
    marginLeft: 8,
    fontWeight: '900',
    color: '#92400E',
  },

  tipText: {
    color: '#B45309',
    lineHeight: 21,
    fontSize: 14,
    fontWeight: '700',
  },

  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  heroBadgeText: {
    marginLeft: 5,
    color: '#2563EB',
    fontSize: 11.5,
    fontWeight: '900',
  },
});
