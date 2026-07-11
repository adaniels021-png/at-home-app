import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';


import { generateMissingWorksheetAssets } from '../../lib/aiAssetGenerator';
import { supabase } from '../../lib/supabase';
import { getWorksheetBrandAssets } from '../../lib/worksheetBrandAssets';
import {
  buildWorksheetLayout,
  WorksheetLayout,
} from '../../lib/worksheetLayoutBuilder';
import { renderWorksheetHtml } from '../../lib/worksheetRendererEngine';

type WorksheetItem = {
  id: string;
  template_id: string | null;
  title: string;
  category: string;
  description: string | null;
  age_range: string | null;
  difficulty: string | null;
  child_name: string | null;
  practice_note: string | null;
  html: string | null;
  status: string | null;
  layout_json: WorksheetLayout | null;
  worksheet_dna: any | null;
  full_page_art_prompt: string | null;
  full_page_art_url: string | null;
};

function makePreviewHtml(html: string) {
  return html.replace(
    '</head>',
    `
    <style>
      html, body {
        width: 100%;
        margin: 0;
        padding: 0;
        overflow-x: hidden !important;
        background: #fff7ed;
      }

      .worksheet-page {
        transform: scale(0.42);
        transform-origin: top left;
      }
    </style>
    </head>`
  );
}

export default function WorksheetPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [worksheet, setWorksheet] = useState<WorksheetItem | null>(null);

  async function loadWorksheet() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('worksheet_queue')
        .select(
          'id,template_id,title,category,description,age_range,difficulty,child_name,practice_note,html,status,layout_json,worksheet_dna,full_page_art_prompt,full_page_art_url'
        )
        .eq('id', String(id))
        .single();

      if (error) throw error;

      const item = data as WorksheetItem;
      setWorksheet(item);

      const brandAssets = await getWorksheetBrandAssets();

      let html: string | null = null;

      // IMPORTANT:
      // We intentionally do NOT render full_page_art_url here anymore.
      // Full-page AI worksheet images were causing lower-quality, incorrect worksheets.
      // The preview should always prefer the structured worksheet renderer so your
      // actual ABA at Home logo, layout, text, and asset cards stay consistent.
      if (item.layout_json) {
  const imageBlockKeys =
    item.layout_json.imageBlocks
      ?.map((block) => block.assetKey)
      .filter(Boolean) || [];

  const missingKeys =
    item.layout_json.missingAssetKeys?.filter(Boolean) || [];

  const requiredAssetKeys = Array.from(
    new Set([...imageBlockKeys, ...missingKeys])
  );

  let resolvedAssets: any[] = [];

  if (requiredAssetKeys.length) {
    const { data: assetRows, error: assetError } = await supabase
      .from('ai_assets')
      .select('*')
      .in('asset_key', requiredAssetKeys);

    if (assetError) {
      throw assetError;
    }

    resolvedAssets = assetRows || [];
  }

  const rebuiltLayout = buildWorksheetLayout({
    templateId:
      item.template_id ||
      item.layout_json.templateId ||
      item.id,
    title: item.title,
    category: item.category as any,
    difficulty: (item.difficulty || 'beginner') as any,
    childName: item.child_name || '',
    description: item.description,
    practiceNote: item.practice_note,
    requiredAssetKeys,
    resolvedAssets,
  });

  const updatedItem: WorksheetItem = {
    ...item,
    layout_json: rebuiltLayout,
  };

  setWorksheet(updatedItem);

  html = renderWorksheetHtml({
    layout: rebuiltLayout,
    worksheetDNA: item.worksheet_dna,
    brandAssets: {
      logoUrl: brandAssets?.logo || null,
      appName: 'ABA at Home',
    },
  });
} else if (item.html) {
  html = item.html;
}

      setPreviewHtml(html);
    } catch (error: any) {
      Alert.alert('Load Error', error?.message || 'Could not load worksheet.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void loadWorksheet();
  }, [id]);

  async function updateStatus(status: 'approved' | 'rejected' | 'draft') {
    if (!worksheet?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('worksheet_queue')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', worksheet.id);

      if (error) throw error;

      Alert.alert(
        status === 'approved' ? 'Approved' : 'Updated',
        `Worksheet marked as ${status}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Update Error', error?.message || 'Could not update worksheet.');
    } finally {
      setSaving(false);
    }
  }

  function confirmApprove() {
    Alert.alert('Approve Worksheet?', 'Approve this worksheet draft?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => void updateStatus('approved') },
    ]);
  }

  async function exportPdf() {
    if (!previewHtml) {
      Alert.alert('No Worksheet', 'There is no worksheet to export.');
      return;
    }

    try {
      setSaving(true);

      const { uri } = await Print.printToFileAsync({
        html: previewHtml,
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert('PDF Created', `PDF saved at: ${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: worksheet?.title || 'ABA at Home Worksheet',
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      Alert.alert('PDF Error', error?.message || 'Could not create PDF.');
    } finally {
      setSaving(false);
    }
  }

async function showAssetStatus() {
  if (!worksheet?.id || !worksheet.layout_json) {
    Alert.alert(
      'No Structured Layout',
      'This worksheet does not have layout_json yet, so assets cannot be generated.'
    );
    return;
  }

  const missing = worksheet.layout_json.missingAssetKeys || [];

  if (!missing.length) {
    Alert.alert(
      'Assets Ready',
      'This worksheet already has its structured layout assets connected.'
    );
    return;
  }

  try {
    setSaving(true);

    const result = await generateMissingWorksheetAssets({
      worksheetQueueId: worksheet.id,
      missingAssetKeys: missing,
    });

    Alert.alert(
      'Assets Generated',
      result.message || `Generated ${result.generated?.length || 0} asset(s).`
    );

    await loadWorksheet();
  } catch (error: any) {
    Alert.alert(
      'Generation Failed',
      error?.message || 'Could not generate missing worksheet assets.'
    );
  } finally {
    setSaving(false);
  }
}

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!worksheet || !previewHtml) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Preview Available</Text>
          <Text style={styles.emptyText}>
            This worksheet does not have saved HTML or structured layout data yet.
          </Text>

          <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
            <Text style={styles.backButtonLargeText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#29145F" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Worksheet Preview
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {worksheet.title}
          </Text>
        </View>

        <TouchableOpacity
  style={styles.promptButton}
  onPress={showAssetStatus}
  disabled={saving}
>
  {saving ? (
    <ActivityIndicator size="small" color="#7C3AED" />
  ) : (
    <Ionicons name="sparkles-outline" size={18} color="#7C3AED" />
  )}
</TouchableOpacity>
      </View>

      <View style={styles.previewWrap}>
        <WebView
          originWhitelist={['*']}
          source={{ html: makePreviewHtml(previewHtml) }}
          style={styles.webview}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.pdfButton} disabled={saving} onPress={exportPdf}>
          <Ionicons name="document-text-outline" size={17} color="#FFFFFF" />
          <Text style={styles.pdfButtonText}>PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rejectButton}
          disabled={saving}
          onPress={() => void updateStatus('rejected')}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.draftButton}
          disabled={saving}
          onPress={() => void updateStatus('draft')}
        >
          <Text style={styles.draftButtonText}>Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.approveButton} disabled={saving} onPress={confirmApprove}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.approveButtonText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '800',
  },
  emptyTitle: {
    marginTop: 12,
    color: '#2E1065',
    fontSize: 21,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 8,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
  backButtonLarge: {
    marginTop: 18,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButtonLargeText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFF7ED',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  promptButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  title: {
    color: '#2E1065',
    fontSize: 23,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
  },
  previewWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#FFF7ED',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#991B1B',
    fontWeight: '900',
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  draftButtonText: {
    color: '#92400E',
    fontWeight: '900',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  pdfButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 5,
  },
});
