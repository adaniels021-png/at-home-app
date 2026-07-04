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

import { supabase } from '../../lib/supabase';

type WorksheetItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  age_range: string | null;
  difficulty: string | null;
  child_name: string | null;
  html: string | null;
  status: string | null;
};

export default function WorksheetPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [worksheet, setWorksheet] = useState<WorksheetItem | null>(null);

  useEffect(() => {
    async function loadWorksheet() {
      try {
        const { data, error } = await supabase
          .from('worksheet_queue')
          .select('id,title,category,description,age_range,difficulty,child_name,html,status')
          .eq('id', String(id))
          .single();

        if (error) throw error;

        setWorksheet(data as WorksheetItem);
      } catch (error: any) {
        Alert.alert('Load Error', error?.message || 'Could not load worksheet.');
      } finally {
        setLoading(false);
      }
    }

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

  async function exportPdf() {
  if (!worksheet?.html) {
    Alert.alert('No Worksheet', 'There is no worksheet HTML to export.');
    return;
  }

  try {
    setSaving(true);

    const { uri } = await Print.printToFileAsync({
      html: worksheet.html,
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert('PDF Created', `PDF saved at: ${uri}`);
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: worksheet.title || 'ABA at Home Worksheet',
      UTI: 'com.adobe.pdf',
    });
  } catch (error: any) {
    Alert.alert('PDF Error', error?.message || 'Could not create PDF.');
  } finally {
    setSaving(false);
  }
}

  if (!worksheet || !worksheet.html) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={38} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Preview Available</Text>
          <Text style={styles.emptyText}>This worksheet does not have saved HTML.</Text>

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
      </View>

      <View style={styles.previewWrap}>
        <WebView
          originWhitelist={['*']}
          source={{ html: worksheet.html }}
          style={styles.webview}
        />
      </View>

      <View style={styles.footer}>
  <TouchableOpacity
    style={styles.pdfButton}
    disabled={saving}
    onPress={exportPdf}
  >
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

  <TouchableOpacity
    style={styles.approveButton}
    disabled={saving}
    onPress={confirmApprove}
  >
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