import { Ionicons } from '@expo/vector-icons';
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

export default function WorksheetsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();

  const [selectedCategory, setSelectedCategory] = useState<
    WorksheetCategory | 'All'
  >('All');

  const [selectedWorksheet, setSelectedWorksheet] =
    useState<WorksheetItem | null>(null);

  const [childName, setChildName] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const profileName = selectedChild?.child_name || selectedChild?.name || '';

    if (profileName && !childName.trim()) {
      setChildName(profileName);
    }
  }, [selectedChild, childName]);

  const filteredWorksheets = useMemo(() => {
    if (selectedCategory === 'All') return WORKSHEETS;
    return WORKSHEETS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const selectedChildName =
    childName.trim() ||
    selectedChild?.child_name ||
    selectedChild?.name ||
    'Child';

  const requireProForWorksheet = (worksheet: WorksheetItem) => {
    if (!isPro) {
      Alert.alert(
        'Pro Feature',
        `${worksheet.title} is available with ABA at Home Pro.`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );

      return true;
    }

    return false;
  };

  const createWorksheetPdf = async (worksheet: WorksheetItem) => {
    const html = buildWorksheetHtml({
      worksheet,
      childName: selectedChildName,
      difficulty: DEFAULT_DIFFICULTY,
    });

    const file = await Print.printToFileAsync({ html });
    return file.uri;
  };

  const handleShareWorksheet = async (worksheet: WorksheetItem) => {
    if (requireProForWorksheet(worksheet)) return;

    setExporting(true);

    try {
      const uri = await createWorksheetPdf(worksheet);
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
      Alert.alert(
        'Share Failed',
        error?.message || 'Could not share this worksheet.'
      );
    } finally {
      setExporting(false);
    }
  };

  const handleEmailWorksheet = async (worksheet: WorksheetItem) => {
    if (requireProForWorksheet(worksheet)) return;

    setExporting(true);

    try {
      const uri = await createWorksheetPdf(worksheet);

      await MailComposer.composeAsync({
        subject: `${worksheet.title} - ABA at Home`,
        body: `Hi,\n\nI’m sending this printable worksheet.\n\nWorksheet: ${worksheet.title}\nChild: ${selectedChildName}\n\nSent from ABA at Home.`,
        attachments: [uri],
      });
    } catch (error: any) {
      console.error('Email worksheet error:', error);
      Alert.alert(
        'Email Failed',
        error?.message || 'Could not open email for this worksheet.'
      );
    } finally {
      setExporting(false);
    }
  };

  const handlePrintWorksheet = async (worksheet: WorksheetItem) => {
    if (requireProForWorksheet(worksheet)) return;

    setExporting(true);

    try {
      const html = buildWorksheetHtml({
        worksheet,
        childName: selectedChildName,
        difficulty: DEFAULT_DIFFICULTY,
      });

      await Print.printAsync({ html });
    } catch (error: any) {
      console.error('Print worksheet error:', error);
      Alert.alert(
        'Print Failed',
        error?.message || 'Could not open the print dialog.'
      );
    } finally {
      setExporting(false);
    }
  };

  const nameWorksheet = WORKSHEETS.find(
  (item) => item.id === 'paths-to-objects'
);

  const previewHtml = selectedWorksheet
    ? buildWorksheetHtml({
        worksheet: selectedWorksheet,
        childName: selectedChildName,
        difficulty: DEFAULT_DIFFICULTY,
      })
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Worksheets</Text>

        <Text style={styles.headerSubtitle}>
          Colorful printable ABA-style worksheets for visual routines,
          communication, regulation, behavior support, and life skills.
        </Text>

        {!isPro ? (
          <View style={styles.lockedBanner}>
            <View style={styles.lockedHeader}>
              <Ionicons name="lock-closed" size={18} color="#7C2D12" />
              <Text style={styles.lockedTitle}>Pro Feature Preview</Text>
            </View>

            <Text style={styles.lockedText}>
              You can preview worksheet options here. Printing, PDF sharing,
              email export, and personalized worksheets are unlocked with Pro.
            </Text>

            <TouchableOpacity
              style={styles.lockedButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.lockedButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.accessCard}>
          <Ionicons name="document-text-outline" size={18} color="#4F46E5" />
          <Text style={styles.accessText}>
            {isPro
              ? 'Printable PDFs are ready to preview, print, share, and email.'
              : 'Preview worksheet packs now. Upgrade to create printable PDFs.'}
          </Text>
        </View>

        <View style={styles.nameBox}>
          <View style={styles.nameHeader}>
            <Ionicons name="create-outline" size={20} color="#4F46E5" />
            <Text style={styles.nameTitle}>Personalized Child Name</Text>
          </View>

          <Text style={styles.nameDescription}>
            Enter your child’s name so personalized worksheets use their real
            name.
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
                style={[styles.categoryChip, active && styles.categoryChipActive]}
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

        <View style={styles.cardList}>
  {filteredWorksheets.map((item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => setSelectedWorksheet(item)}
      activeOpacity={0.88}
    >
      {item.image ? (
        <Image
          source={item.image}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.cardTopRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{item.category}</Text>
        </View>

        {!isPro ? (
          <View style={styles.proPill}>
            <Ionicons name="lock-closed" size={12} color="#7C3AED" />
            <Text style={styles.proPillText}>Preview</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        )}
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="people-outline" size={15} color="#64748B" />
        <Text style={styles.metaText}>{item.ageRange}</Text>
      </View>
    </TouchableOpacity>
  ))}
</View>

        <View style={styles.proCard}>
          <View style={styles.proHeader}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.proTitle}>Premium Printable Worksheets</Text>
          </View>

          <Text style={styles.proText}>
            Pro unlocks colorful printable PDFs, worksheet previews, email
            export, sharing, and parent-friendly ABA tools.
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
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={styles.modalCategoryPill}>
                  <Text style={styles.modalCategoryPillText}>
                    {selectedWorksheet?.category}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setSelectedWorksheet(null)}>
                  <Ionicons name="close-circle" size={30} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>{selectedWorksheet?.title}</Text>

              <Text style={styles.modalSubtitle}>
                {selectedWorksheet?.description}
              </Text>

              <View style={styles.previewBox}>
  {selectedWorksheet?.image ? (
    <Image
      source={selectedWorksheet.image}
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

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Best For</Text>
                <Text style={styles.detailText}>
                  {selectedWorksheet?.ageRange}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Skill Focus</Text>
                <Text style={styles.detailText}>
                  {getSkillFocus(selectedWorksheet?.category)}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, !isPro && styles.disabledLightBtn]}
                  onPress={() =>
                    selectedWorksheet && void handlePrintWorksheet(selectedWorksheet)
                  }
                  disabled={exporting}
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
                  Keep worksheet practice short and successful. Pair written
                  tasks with praise, breaks, and visual supports when needed.
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '600',
  },
  lockedBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#9A3412',
  },
  lockedText: {
    color: '#9A3412',
    lineHeight: 20,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  lockedButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  lockedButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  accessCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  accessText: {
    marginLeft: 8,
    color: '#3730A3',
    fontWeight: '800',
    flex: 1,
    lineHeight: 20,
  },
  nameBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameTitle: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '900',
    color: '#1E293B',
  },
  nameDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 14,
    fontWeight: '600',
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
    paddingBottom: 10,
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  categoryChipText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  cardList: {
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryPillText: {
    color: '#4F46E5',
    fontSize: 12,
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
  proPillText: {
    marginLeft: 4,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 14,
    marginBottom: 6,
  },
  cardDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 6,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
  proCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
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
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  proText: {
    color: '#64748B',
    lineHeight: 21,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F8FAFC',
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
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
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 430,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 10,
  },
  detailText: {
    color: '#475569',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 16,
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
    fontWeight: '600',
  },
  cardImage: {
  width: '100%',
  height: 190,
  borderRadius: 18,
  marginBottom: 14,
  backgroundColor: '#F8FAFC',
},

previewImage: {
  width: '100%',
  height: '100%',
  backgroundColor: '#FFFFFF',
},
});