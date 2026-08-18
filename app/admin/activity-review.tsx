import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useAdminAccess } from '../../lib/adminAccess';

type ActivityStatus = 'draft' | 'pending' | 'approved' | 'rejected';

type ActivityQueueItem = {
  id: string;
  title: string;
  name?: string | null;
  category: string | null;
  location: string | null;
  time: string | null;
  description: string | null;
  try_this: string[] | null;
  why_it_helps: string | null;
  status: ActivityStatus | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  pro_only: boolean;
};

const STATUS_FILTERS: {
  id: 'all' | ActivityStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'pending', label: 'Pending', icon: 'time-outline' },
  { id: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
  { id: 'draft', label: 'Drafts', icon: 'create-outline' },
  { id: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
  { id: 'all', label: 'All', icon: 'albums-outline' },
];

function normalizeTryThis(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean);
  }

  return [];
}

export default function AdminActivityListScreen() {
  const router = useRouter();

  const { loading: checkingAdmin, isAdmin, refresh: checkAdmin } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [statusFilter, setStatusFilter] = useState<'all' | ActivityStatus>(
    'pending'
  );

  const [activities, setActivities] = useState<ActivityQueueItem[]>([]);

  const [saving, setSaving] = useState(false);

 const filteredActivities = useMemo(() => {
  return activities.filter((activity) => {
    const matchesStatus =
      statusFilter === 'all' || (activity.status || 'pending') === statusFilter;

    const matchesCategory =
      categoryFilter === 'all' || activity.category === categoryFilter;

    return matchesStatus && matchesCategory;
  });
}, [activities, statusFilter, categoryFilter]);

  const categoryOptions = useMemo(() => {
  const categories = activities
    .map((activity) => activity.category || 'surprise')
    .filter(Boolean);

  return ['all', ...Array.from(new Set(categories))];
}, [activities]);

const selectedCount = selectedIds.length;

function toggleSelected(id: string) {
  setSelectedIds((current) =>
    current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]
  );
}

  const pendingCount = useMemo(() => {
    return activities.filter((activity) => activity.status === 'pending')
      .length;
  }, [activities]);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('activity_queue')
        .select(
          'id,title,name,category,location,time,description,try_this,why_it_helps,status,pro_only,created_at,updated_at'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActivities((data || []) as ActivityQueueItem[]);
    } catch (error: any) {
      console.log('Load activity library error:', error);

      Alert.alert(
        'Could not load activities',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void checkAdmin();
      void loadActivities();
    }, [checkAdmin, loadActivities])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
  };


  const updateStatus = async (
  activity: ActivityQueueItem,
  status: ActivityStatus
) => {
  try {
    setSaving(true);

    if (status === 'approved') {
      const { error: insertError } = await supabase
        .from('activity_library')
        .insert([
          {
            title: activity.title || activity.name || 'Untitled Activity',
            category: activity.category || 'surprise',
            location: activity.location,
            time: activity.time,
            description: activity.description,
            try_this: normalizeTryThis(activity.try_this),
            why_it_helps: activity.why_it_helps,
            status: 'approved',
            source: 'approved_from_queue',
            pro_only: activity.pro_only !== false,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('activity_queue')
        .delete()
        .eq('id', activity.id);

      if (deleteError) throw deleteError;

      setActivities((prev) => prev.filter((item) => item.id !== activity.id));
      return;
    }

    const { error } = await supabase
      .from('activity_queue')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activity.id);

    if (error) throw error;

    setActivities((prev) =>
      prev.map((item) =>
        item.id === activity.id ? { ...item, status } : item
      )
    );
  } catch (error: any) {
    console.log('Update activity status error:', error);

    Alert.alert(
      'Update Error',
      error?.message || 'Could not update activity status.'
    );
  } finally {
    setSaving(false);
  }
};

  const updateAvailability = async (
    activity: ActivityQueueItem,
    proOnly: boolean
  ) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('activity_queue')
        .update({
          pro_only: proOnly,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activity.id);

      if (error) throw error;

      setActivities((current) =>
        current.map((item) =>
          item.id === activity.id
            ? { ...item, pro_only: proOnly }
            : item
        )
      );
    } catch (error: any) {
      Alert.alert(
        'Availability Update Failed',
        error?.message || 'Could not update activity availability.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (activity: ActivityQueueItem) => {
    Alert.alert(
      'Delete Activity?',
      'This will permanently remove this activity from the review queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteActivity(activity),
        },
      ]
    );
  };

  const deleteActivity = async (activity: ActivityQueueItem) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('activity_queue')
        .delete()
        .eq('id', activity.id);

      if (error) throw error;

      setActivities((prev) => prev.filter((item) => item.id !== activity.id));
    } catch (error: any) {
      console.log('Delete activity error:', error);

      Alert.alert('Delete Error', error?.message || 'Could not delete.');
    } finally {
      setSaving(false);
    }
  };

  if (checkingAdmin || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading activity admin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="lock-closed-outline" size={36} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Admin only</Text>
          <Text style={styles.emptyText}>
            You do not have access to the activity review area.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <ScrollView
  contentContainerStyle={styles.pageContent}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  }
>
  <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
    <Ionicons name="chevron-back" size={22} color="#7C3AED" />
  </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles-outline" size={24} color="#7C3AED" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Activity Library Admin</Text>
              <Text style={styles.headerSubtitle}>
                Review, edit, approve, or reject Daily Adventures.
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{activities.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.id;

            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter.id)}
              >
                <Ionicons
                  name={filter.icon}
                  size={15}
                  color={active ? '#FFFFFF' : '#7C3AED'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.filterRow}
>
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
        <Text
          style={[
            styles.categoryChipText,
            active && styles.filterChipTextActive,
          ]}
        >
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
  onPress={() => {
    Alert.alert(
      'Approve Selected?',
      `Approve ${selectedCount} selected activity draft(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const selectedActivities = activities.filter((activity) =>
              selectedIds.includes(activity.id)
            );

            const approvedPayload = selectedActivities.map((activity) => ({
              title: activity.title || activity.name || 'Untitled Activity',
              category: activity.category || 'surprise',
              location: activity.location,
              time: activity.time,
              description: activity.description,
              try_this: normalizeTryThis(activity.try_this),
              why_it_helps: activity.why_it_helps,
              status: 'approved',
              source: 'approved_from_queue',
              pro_only: activity.pro_only !== false,
              updated_at: new Date().toISOString(),
            }));

            const { error: insertError } = await supabase
              .from('activity_library')
              .insert(approvedPayload);

            if (insertError) {
              Alert.alert('Approve Error', insertError.message);
              return;
            }

            const { error: deleteError } = await supabase
              .from('activity_queue')
              .delete()
              .in('id', selectedIds);

            if (deleteError) {
              Alert.alert('Cleanup Error', deleteError.message);
              return;
            }

            setSelectedIds([]);
            await loadActivities();
          },
        },
      ]
    );
  }}
>
  <Text style={styles.bulkApproveText}>Approve</Text>
</TouchableOpacity>

    <TouchableOpacity
      style={styles.bulkReject}
      onPress={() => {
        Alert.alert(
          'Reject Selected?',
          `Reject ${selectedCount} selected activity draft(s)?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('activity_queue')
                  .update({
                    status: 'rejected',
                    updated_at: new Date().toISOString(),
                  })
                  .in('id', selectedIds);

                if (error) {
                  Alert.alert('Update Error', error.message);
                  return;
                }

                setSelectedIds([]);
                await loadActivities();
              },
            },
          ]
        );
      }}
    >
      <Text style={styles.bulkRejectText}>Reject</Text>
    </TouchableOpacity>
  </View>
) : null}

        {filteredActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="happy-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyCardTitle}>No activities here</Text>
            <Text style={styles.emptyCardText}>
              Pull down to refresh or choose another status.
            </Text>
          </View>
        ) : (
          filteredActivities.map((activity) => (
            <ActivityReviewCard
  key={activity.id}
  activity={activity}
  selected={selectedIds.includes(activity.id)}
  onToggle={() => toggleSelected(activity.id)}
              onEdit={() =>
  router.push({
    pathname: '/admin/activity-library/edit',
    params: {
      id: activity.id,
      source: 'queue',
    },
  } as any)
}
              onApprove={() => void updateStatus(activity, 'approved')}
              onReject={() => void updateStatus(activity, 'rejected')}
              onDraft={() => void updateStatus(activity, 'draft')}
              onDelete={() => confirmDelete(activity)}
              onAvailabilityChange={(value) =>
                void updateAvailability(activity, value)
              }
              availabilityDisabled={saving}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityReviewCard({
  activity,
  selected,
  onToggle,
  onEdit,
  onApprove,
  onReject,
  onDraft,
  onDelete,
  onAvailabilityChange,
  availabilityDisabled,
}: {
  activity: ActivityQueueItem;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDraft: () => void;
  onDelete: () => void;
  onAvailabilityChange: (value: boolean) => void;
  availabilityDisabled: boolean;
}) {
  const tryThis = normalizeTryThis(activity.try_this);
  const status = activity.status || 'pending';

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityTopRow}>
        <TouchableOpacity
  style={styles.checkbox}
  onPress={onToggle}
>
  <Ionicons
    name={selected ? 'checkbox' : 'square-outline'}
    size={24}
    color="#7C3AED"
  />
</TouchableOpacity>
        <View style={styles.activityIcon}>
          <Ionicons name="color-wand-outline" size={20} color="#7C3AED" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.activityTitle}>
            {activity.title || activity.name || 'Untitled Activity'}
          </Text>

          <Text style={styles.activityMeta}>
            {activity.category || 'surprise'} · {activity.time || '5–10 min'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            status === 'approved' && styles.statusApproved,
            status === 'rejected' && styles.statusRejected,
            status === 'draft' && styles.statusDraft,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              status === 'approved' && styles.statusTextApproved,
              status === 'rejected' && styles.statusTextRejected,
              status === 'draft' && styles.statusTextDraft,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {!!activity.location && (
        <View style={styles.metaPill}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.metaPillText}>{activity.location}</Text>
        </View>
      )}

      {!!activity.description && (
        <Text style={styles.descriptionText}>{activity.description}</Text>
      )}

      {tryThis.length > 0 && (
        <View style={styles.tryBox}>
          <Text style={styles.tryTitle}>Try this</Text>
          {tryThis.slice(0, 3).map((item, index) => (
            <Text key={index} style={styles.tryText}>
              • {item}
            </Text>
          ))}
        </View>
      )}

      {!!activity.why_it_helps && (
        <View style={styles.whyBox}>
          <Ionicons name="heart-circle-outline" size={19} color="#7C3AED" />
          <Text style={styles.whyText}>{activity.why_it_helps}</Text>
        </View>
      )}

      <View style={styles.availabilityCard}>
        <View style={styles.availabilityTextWrap}>
          <Text style={styles.availabilityHeading}>Availability</Text>
          <Text style={styles.availabilityTitle}>Pro Activity</Text>
          <Text style={styles.availabilityDescription}>
            Require an active Pro subscription.
          </Text>
        </View>

        <Switch
          value={activity.pro_only !== false}
          onValueChange={onAvailabilityChange}
          disabled={availabilityDisabled}
          trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
          thumbColor={activity.pro_only !== false ? '#7C3AED' : '#FFFFFF'}
        />
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={17} color="#475569" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
          <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.draftBtn} onPress={onDraft}>
          <Ionicons name="document-outline" size={17} color="#92400E" />
          <Text style={styles.draftBtnText}>Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <Ionicons name="close-circle-outline" size={17} color="#991B1B" />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
        <Text style={styles.deleteBtnText}>Delete Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },

  pageContent: {
    padding: 20,
    paddingBottom: 48,
  },

  availabilityCard: {
    marginTop: 14,
    borderRadius: 18,
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

  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '700',
  },

  backButton: {
  alignSelf: 'flex-start',
  marginBottom: 12,
  backgroundColor: '#FFFFFF',
  width: 42,
  height: 42,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
},

  headerCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  headerSubtitle: {
    marginTop: 4,
    color: '#F3E8FF',
    fontWeight: '700',
    lineHeight: 19,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    padding: 12,
  },

  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  statLabel: {
    marginTop: 2,
    color: '#F3E8FF',
    fontWeight: '800',
    fontSize: 12,
  },

  filterRow: {
    gap: 10,
    paddingBottom: 16,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },

  filterChipText: {
    marginLeft: 6,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },

  emptyCardTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },

  emptyCardText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  activityIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  activityTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  activityMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
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

  metaPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  metaPillText: {
    flex: 1,
    marginLeft: 6,
    color: '#475569',
    fontWeight: '800',
    fontSize: 12,
  },

  descriptionText: {
    marginTop: 14,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '700',
  },

  tryBox: {
    marginTop: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  tryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9A3412',
    marginBottom: 7,
  },

  tryText: {
    color: '#7C2D12',
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 5,
  },

  whyBox: {
    marginTop: 14,
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  whyText: {
    flex: 1,
    marginLeft: 8,
    color: '#6D28D9',
    lineHeight: 19,
    fontWeight: '700',
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },

  editBtn: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  editBtnText: {
    marginLeft: 6,
    color: '#475569',
    fontWeight: '900',
  },

  approveBtn: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: '#16A34A',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  approveBtnText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  draftBtn: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  draftBtnText: {
    marginLeft: 6,
    color: '#92400E',
    fontWeight: '900',
  },

  rejectBtn: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  rejectBtnText: {
    marginLeft: 6,
    color: '#991B1B',
    fontWeight: '900',
  },

  deleteBtn: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  deleteBtnText: {
    marginLeft: 6,
    color: '#EF4444',
    fontWeight: '900',
    fontSize: 12,
  },

  backButtonText: {
  color: '#7C3AED',
  fontWeight: '900',
},

categoryChip: {
  backgroundColor: '#FFFFFF',
  borderRadius: 999,
  paddingHorizontal: 13,
  paddingVertical: 9,
  borderWidth: 1,
  borderColor: '#FED7AA',
},

categoryChipText: {
  color: '#7C3AED',
  fontWeight: '900',
  fontSize: 12,
  textTransform: 'capitalize',
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
checkbox: {
  marginRight: 10,
  justifyContent: 'center',
  alignItems: 'center',
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
});
