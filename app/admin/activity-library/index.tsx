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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../../lib/supabase';

type ActivityStatus = 'approved' | 'pending' | 'draft' | 'archived';

type ActivityLibraryItem = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  time: string | null;
  description: string | null;
  try_this: string[] | null;
  why_it_helps: string | null;
  status: ActivityStatus | string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
  pro_only: boolean;
};

const CATEGORY_FILTERS = [
  'All',
  'Home',
  'Outdoor',
  'Community',
  'Movement',
  'Sensory',
  'Creative',
  'Calm',
];

export default function AdminActivityLibraryScreen() {
  const router = useRouter();

  const [activities, setActivities] = useState<ActivityLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_library')
        .select(
          'id,title,category,location,time,description,try_this,why_it_helps,status,source,pro_only,created_at,updated_at'
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setActivities((data || []) as ActivityLibraryItem[]);
    } catch (error: any) {
      console.log('Load activity library error:', error);
      Alert.alert(
        'Activity Library Error',
        error?.message || 'Could not load activity library.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadActivities();
    }, [loadActivities])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
  };

  async function deleteActivity(activity: ActivityLibraryItem) {
  Alert.alert(
    'Delete Activity?',
    `This will permanently delete "${activity.title}".`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('activity_library')
              .delete()
              .eq('id', activity.id);

            if (error) throw error;

            setActivities((prev) =>
              prev.filter((item) => item.id !== activity.id)
            );
          } catch (error: any) {
            console.log('Delete activity error:', error);
            Alert.alert(
              'Delete Error',
              error?.message || 'Could not delete this activity.'
            );
          }
        },
      },
    ]
  );
}

  const filteredActivities = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return activities.filter((activity) => {
      const category = String(activity.category || '').toLowerCase();

      const matchesCategory =
        selectedCategory === 'All' ||
        category === selectedCategory.toLowerCase();

      const searchableText = [
        activity.title,
        activity.category,
        activity.location,
        activity.time,
        activity.description,
        activity.why_it_helps,
        ...(Array.isArray(activity.try_this) ? activity.try_this : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [activities, searchText, selectedCategory]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading activity library...</Text>
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
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={20} color="#7C3AED" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>Admin</Text>
              <Text style={styles.headerTitle}>Activity Library</Text>
              <Text style={styles.headerSubtitle}>
                Review, edit, approve, or archive fun activities for Daily Adventures.
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{activities.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{filteredActivities.length}</Text>
              <Text style={styles.statLabel}>Showing</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search activities..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />

          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORY_FILTERS.map((category) => {
            const active = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>Activity Library</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/admin/activity-library/new' as any)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.createButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {filteredActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No activities found</Text>
            <Text style={styles.emptyText}>
              Try a different search or category filter.
            </Text>
          </View>
        ) : (
          filteredActivities.map((activity) => (
            <ActivityAdminCard
  key={activity.id}
  activity={activity}
  onPreview={() =>
    Alert.alert('Preview Coming Next', activity.title)
  }
  onEdit={() =>
    router.push({
      pathname: '/admin/activity-library/edit',
      params: {
        id: activity.id,
        source: 'library',
      },
    })
  }
  onDelete={() => deleteActivity(activity)}
/>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityAdminCard({
  activity,
  onPreview,
  onEdit,
  onDelete,
}: {
  activity: ActivityLibraryItem;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tryThis = Array.isArray(activity.try_this) ? activity.try_this : [];

  return (
    <View style={styles.activityCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardIcon}>
          <Ionicons name="happy-outline" size={22} color="#7C3AED" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{activity.title}</Text>

          <Text style={styles.cardMeta}>
            {activity.category || 'Uncategorized'} · {activity.time || '5–10 min'}
          </Text>
        </View>

        <View style={styles.badgeColumn}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {activity.status || 'approved'}
            </Text>
          </View>

          <View
            style={[
              styles.accessBadge,
              !activity.pro_only && styles.accessBadgeFree,
            ]}
          >
            <Ionicons
              name={activity.pro_only ? 'lock-closed' : 'checkmark-circle'}
              size={12}
              color={activity.pro_only ? '#7C3AED' : '#047857'}
            />
            <Text
              style={[
                styles.accessText,
                !activity.pro_only && styles.accessTextFree,
              ]}
            >
              {activity.pro_only ? 'PRO' : 'FREE'}
            </Text>
          </View>
        </View>
      </View>

      {!!activity.location && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.locationText}>{activity.location}</Text>
        </View>
      )}

      {!!activity.description && (
        <Text style={styles.descriptionText} numberOfLines={3}>
          {activity.description}
        </Text>
      )}

      {tryThis.length > 0 && (
        <View style={styles.tryBox}>
          <Text style={styles.tryTitle}>Try this</Text>

          {tryThis.slice(0, 3).map((item, index) => (
            <Text key={`${activity.id}-${index}`} style={styles.tryText}>
              • {item}
            </Text>
          ))}
        </View>
      )}

      {!!activity.why_it_helps && (
        <View style={styles.whyBox}>
          <Ionicons name="heart-circle-outline" size={18} color="#7C3AED" />
          <Text style={styles.whyText} numberOfLines={3}>
            {activity.why_it_helps}
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryAction} onPress={onPreview}>
          <Ionicons name="eye-outline" size={16} color="#475569" />
          <Text style={styles.secondaryActionText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryAction} onPress={onEdit}>
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
  <Text style={styles.deleteActionText}>Delete</Text>
</TouchableOpacity>
      </View>
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
    paddingBottom: 50,
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
  headerCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    padding: 20,
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerEyebrow: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  headerTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 6,
    color: '#F3E8FF',
    lineHeight: 20,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    padding: 13,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 3,
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#0F172A',
    fontWeight: '700',
  },
  filterRow: {
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterChipText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  emptyTitle: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  cardMeta: {
    marginTop: 3,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginLeft: 8,
  },
  statusText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  accessBadgeFree: {
    backgroundColor: '#D1FAE5',
  },
  accessText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '900',
  },
  accessTextFree: {
    color: '#047857',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  locationText: {
    marginLeft: 6,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  descriptionText: {
    marginTop: 12,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '700',
  },
  tryBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 13,
    marginTop: 13,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tryTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  tryText: {
    color: '#92400E',
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  whyBox: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 13,
  },
  whyText: {
    flex: 1,
    marginLeft: 8,
    color: '#6D28D9',
    lineHeight: 19,
    fontWeight: '700',
  },
 actionRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 14,
},
  secondaryAction: {
  flex: 1,
  minWidth: 95,
  backgroundColor: '#F8FAFC',
  borderRadius: 16,
  paddingVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  borderWidth: 1,
  borderColor: '#CBD5E1',
},
  secondaryActionText: {
    marginLeft: 6,
    color: '#475569',
    fontWeight: '900',
    fontSize: 13,
  },
  primaryAction: {
  flex: 1,
  minWidth: 95,
  backgroundColor: '#7C3AED',
  borderRadius: 16,
  paddingVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
},
  primaryActionText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  deleteAction: {
  flex: 1,
  minWidth: 95,
  backgroundColor: '#DC2626',
  borderRadius: 16,
  paddingVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
},

deleteActionText: {
  marginLeft: 6,
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 13,
},
});
