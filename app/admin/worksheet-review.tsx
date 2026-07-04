import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

type WorksheetStatus = 'pending' | 'approved' | 'rejected' | 'draft';

type WorksheetQueueItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  age_range: string | null;
  difficulty: string | null;
  child_name: string | null;
  html: string | null;
  status: WorksheetStatus | string | null;
  source: string | null;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const STATUS_FILTERS: { id: 'all' | WorksheetStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'draft', label: 'Drafts' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

export default function WorksheetReviewScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [worksheets, setWorksheets] = useState<WorksheetQueueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | WorksheetStatus>('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(() => {
    const categories = worksheets
      .map((item) => item.category || 'Other')
      .filter(Boolean);

    return ['all', ...Array.from(new Set(categories))];
  }, [worksheets]);

  const filteredWorksheets = useMemo(() => {
    return worksheets.filter((worksheet) => {
      const matchesStatus =
        statusFilter === 'all' || (worksheet.status || 'pending') === statusFilter;

      const matchesCategory =
        categoryFilter === 'all' || worksheet.category === categoryFilter;

      return matchesStatus && matchesCategory;
    });
  }, [worksheets, statusFilter, categoryFilter]);

  const selectedCount = selectedIds.length;

  const pendingCount = useMemo(() => {
    return worksheets.filter((item) => (item.status || 'pending') === 'pending').length;
  }, [worksheets]);

  async function loadWorksheets() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('worksheet_queue')
        .select(
          'id,title,category,description,age_range,difficulty,child_name,html,status,source,admin_notes,created_at,updated_at'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorksheets((data || []) as WorksheetQueueItem[]);
    } catch (error: any) {
      Alert.alert('Load Error', error?.message || 'Could not load worksheet queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadWorksheets();
    }, [])
  );

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function updateStatus(ids: string[], status: WorksheetStatus) {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('worksheet_queue')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;

      setSelectedIds([]);
      await loadWorksheets();
    } catch (error: any) {
      Alert.alert('Update Error', error?.message || 'Could not update worksheets.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorksheets(ids: string[]) {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('worksheet_queue')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setSelectedIds([]);
      await loadWorksheets();
    } catch (error: any) {
      Alert.alert('Delete Error', error?.message || 'Could not delete worksheets.');
    } finally {
      setSaving(false);
    }
  }

  function confirmBulkStatus(status: WorksheetStatus) {
    Alert.alert(
      `${status === 'approved' ? 'Approve' : status === 'rejected' ? 'Reject' : 'Update'} Selected?`,
      `Update ${selectedCount} worksheet draft(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => void updateStatus(selectedIds, status),
        },
      ]
    );
  }

  function confirmDelete(ids: string[]) {
    Alert.alert(
      'Delete Worksheet?',
      'This permanently removes the selected worksheet draft(s).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteWorksheets(ids),
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading worksheet queue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadWorksheets();
            }}
            tintColor="#7C3AED"
          />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#29145F" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Worksheet Review</Text>
            <Text style={styles.subtitle}>
              {pendingCount} pending · {worksheets.length} total drafts
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/admin/worksheet-generator' as any)}
          >
            <Ionicons name="sparkles-outline" size={21} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Ionicons name="document-text-outline" size={26} color="#7C3AED" />
          <Text style={styles.heroTitle}>Approval Pipeline</Text>
          <Text style={styles.heroText}>
            Review worksheet drafts before making them approved for your content library.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.id;

            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => {
                  setStatusFilter(filter.id);
                  setSelectedIds([]);
                }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {categoryOptions.map((item) => {
            const active = categoryFilter === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryChip, active && styles.filterChipActive]}
                onPress={() => {
                  setCategoryFilter(item);
                  setSelectedIds([]);
                }}
              >
                <Text style={[styles.categoryText, active && styles.filterTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedCount > 0 ? (
          <View style={styles.bulkBar}>
            <Text style={styles.bulkText}>{selectedCount} selected</Text>

            <TouchableOpacity
              style={styles.bulkApprove}
              disabled={saving}
              onPress={() => confirmBulkStatus('approved')}
            >
              <Text style={styles.bulkApproveText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bulkReject}
              disabled={saving}
              onPress={() => confirmBulkStatus('rejected')}
            >
              <Text style={styles.bulkRejectText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bulkDelete}
              disabled={saving}
              onPress={() => confirmDelete(selectedIds)}
            >
              <Ionicons name="trash-outline" size={16} color="#991B1B" />
            </TouchableOpacity>
          </View>
        ) : null}

        {filteredWorksheets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={34} color="#10B981" />
            <Text style={styles.emptyTitle}>Nothing here</Text>
            <Text style={styles.emptyText}>
              Try another filter or generate new worksheet drafts.
            </Text>
          </View>
        ) : (
          filteredWorksheets.map((worksheet) => (
            <View key={worksheet.id} style={styles.worksheetCard}>
              <View style={styles.cardTopRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleSelected(worksheet.id)}
                >
                  <Ionicons
                    name={
                      selectedIds.includes(worksheet.id)
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={24}
                    color="#7C3AED"
                  />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text style={styles.worksheetTitle}>{worksheet.title}</Text>
                  <Text style={styles.worksheetMeta}>
                    {worksheet.category} · {worksheet.difficulty || 'beginner'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    worksheet.status === 'approved' && styles.statusApproved,
                    worksheet.status === 'rejected' && styles.statusRejected,
                    worksheet.status === 'draft' && styles.statusDraft,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      worksheet.status === 'approved' && styles.statusTextApproved,
                      worksheet.status === 'rejected' && styles.statusTextRejected,
                      worksheet.status === 'draft' && styles.statusTextDraft,
                    ]}
                  >
                    {worksheet.status || 'pending'}
                  </Text>
                </View>
              </View>

              {!!worksheet.description && (
                <Text style={styles.descriptionText}>{worksheet.description}</Text>
              )}

              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>{worksheet.age_range || 'Worksheet'}</Text>
                <Text style={styles.metaPill}>Child: {worksheet.child_name || 'Child'}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.approveButton}
                  disabled={saving}
                  onPress={() => void updateStatus([worksheet.id], 'approved')}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  disabled={saving}
                  onPress={() => void updateStatus([worksheet.id], 'rejected')}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  disabled={saving}
                  onPress={() => confirmDelete([worksheet.id])}
                >
                  <Ionicons name="trash-outline" size={17} color="#991B1B" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  content: { padding: 20, paddingBottom: 120 },
  centered: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
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
  headerButton: {
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
    fontSize: 28,
    fontWeight: '900',
    color: '#2E1065',
  },
  subtitle: {
    marginTop: 3,
    color: '#7C3AED',
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  heroTitle: {
    marginTop: 10,
    color: '#2E1065',
    fontSize: 20,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 20,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterText: {
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },
  categoryText: {
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  bulkBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulkText: {
    flex: 1,
    color: '#2E1065',
    fontWeight: '900',
  },
  bulkApprove: {
    backgroundColor: '#10B981',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  bulkApproveText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  bulkReject: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  bulkRejectText: {
    color: '#991B1B',
    fontWeight: '900',
    fontSize: 12,
  },
  bulkDelete: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  emptyTitle: {
    marginTop: 10,
    color: '#2E1065',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 7,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '700',
  },
  worksheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  worksheetTitle: {
    color: '#1E1B4B',
    fontSize: 17,
    fontWeight: '900',
  },
  worksheetMeta: {
    marginTop: 4,
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusDraft: {
    backgroundColor: '#E2E8F0',
  },
  statusText: {
    color: '#92400E',
    fontWeight: '900',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statusTextApproved: {
    color: '#166534',
  },
  statusTextRejected: {
    color: '#991B1B',
  },
  statusTextDraft: {
    color: '#475569',
  },
  descriptionText: {
    marginTop: 13,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 13,
  },
  metaPill: {
    backgroundColor: '#F5F3FF',
    color: '#6D28D9',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#991B1B',
    fontWeight: '900',
  },
  deleteButton: {
    width: 46,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});