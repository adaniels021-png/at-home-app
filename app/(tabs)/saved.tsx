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
import { useChild } from '../../lib/SelectedChildContext';
import { setMyActivityState } from '../../lib/dailyAdventuresApi';
import { supabase } from '../../lib/supabase';

type SavedActivityRow = {
  id: string;
  library_activity_id: string | null;
  activity_name: string;
  activity_json: {
    id?: string;
    library_activity_id?: string;
    name: string;
    title?: string;
    materials: string[];
    instructions: string[];
    success_criteria: string;
  };
  is_saved: boolean;
  is_favorite: boolean;
  activity_date: string;
};

export default function SavedActivitiesScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedActivities, setSavedActivities] = useState<SavedActivityRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'saved' | 'favorites'>('all');

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const loadSavedActivities = useCallback(async () => {
    if (!selectedChild?.id) {
      setSavedActivities([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('saved_activities')
        .select('id, library_activity_id, activity_name, activity_json, is_saved, is_favorite, activity_date')
        .eq('child_id', selectedChild.id)
        .order('activity_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedActivities((data || []) as SavedActivityRow[]);
    } catch (error: any) {
      console.error('Load saved activities error:', error);
      Alert.alert('Load Error', error?.message || 'Could not load saved activities.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      void loadSavedActivities();
    }, [loadSavedActivities])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSavedActivities();
  };

  const toggleSaved = async (item: SavedActivityRow) => {
    const nextValue = !item.is_saved;

    try {
      const activityId =
        item.library_activity_id ||
        item.activity_json.library_activity_id ||
        item.activity_json.id;

      if (!selectedChild?.id || !activityId) {
        throw new Error('This legacy activity does not have a stable library reference.');
      }

      await setMyActivityState(selectedChild.id, activityId, { saved: nextValue });

      setSavedActivities((prev) =>
        prev.map((activity) =>
          activity.id === item.id
            ? {
                ...activity,
                is_saved: nextValue,
              }
            : activity
        )
      );
    } catch (error: any) {
      console.error('Toggle saved error:', error);
      Alert.alert('Update Error', error?.message || 'Could not update saved status.');
    }
  };

  const toggleFavorite = async (item: SavedActivityRow) => {
    const nextValue = !item.is_favorite;

    try {
      const activityId =
        item.library_activity_id ||
        item.activity_json.library_activity_id ||
        item.activity_json.id;

      if (!selectedChild?.id || !activityId) {
        throw new Error('This legacy activity does not have a stable library reference.');
      }

      await setMyActivityState(selectedChild.id, activityId, {
        favorite: nextValue,
      });

      setSavedActivities((prev) =>
        prev.map((activity) =>
          activity.id === item.id
            ? {
                ...activity,
                is_favorite: nextValue,
              }
            : activity
        )
      );
    } catch (error: any) {
      console.error('Toggle favorite error:', error);
      Alert.alert('Update Error', error?.message || 'Could not update favorite status.');
    }
  };

  const visibleActivities = useMemo(() => {
    if (filter === 'saved') {
      return savedActivities.filter((item) => item.is_saved);
    }

    if (filter === 'favorites') {
      return savedActivities.filter((item) => item.is_favorite);
    }

    return savedActivities.filter((item) => item.is_saved || item.is_favorite);
  }, [savedActivities, filter]);

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <Ionicons name="bookmark-outline" size={34} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Child Selected</Text>
          <Text style={styles.emptyText}>
            Select or create a child profile to view saved activities.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading saved activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="bookmark" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>YOUR ACTIVITY LIBRARY</Text>
          </View>

          <Text style={styles.heroTitle}>Saved Activities</Text>
          <Text style={styles.heroSubtitle}>
            Keep track of the ideas you want to come back to for {childName}.
          </Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'saved' && styles.filterChipActive]}
            onPress={() => setFilter('saved')}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'saved' && styles.filterChipTextActive,
              ]}
            >
              Saved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'favorites' && styles.filterChipActive]}
            onPress={() => setFilter('favorites')}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'favorites' && styles.filterChipTextActive,
              ]}
            >
              Favorites
            </Text>
          </TouchableOpacity>
        </View>

        {visibleActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="albums-outline" size={30} color="#94A3B8" />
            <Text style={styles.emptyCardTitle}>Nothing here yet</Text>
            <Text style={styles.emptyCardText}>
              Save or favorite a Suggested Activity and it will show up here.
            </Text>
          </View>
        ) : (
          visibleActivities.map((item) => {
            const activity = item.activity_json;
            const stableActivityId =
              item.library_activity_id ||
              activity.library_activity_id ||
              activity.id;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>{activity.name}</Text>
                    <Text style={styles.cardDate}>{item.activity_date}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => void toggleFavorite(item)}
                    >
                      <Ionicons
                        name={item.is_favorite ? 'heart' : 'heart-outline'}
                        size={20}
                        color={item.is_favorite ? '#EF4444' : '#64748B'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => void toggleSaved(item)}
                    >
                      <Ionicons
                        name={item.is_saved ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={item.is_saved ? '#4F46E5' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Materials</Text>
                  {activity.materials?.map((material, index) => (
                    <Text key={index} style={styles.bulletText}>
                      • {material}
                    </Text>
                  ))}
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {activity.instructions?.map((step, index) => (
                    <Text key={index} style={styles.bulletText}>
                      {index + 1}. {step}
                    </Text>
                  ))}
                </View>

                <View style={styles.successBox}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#16A34A"
                  />
                  <Text style={styles.successText}>
                    {activity.success_criteria}
                  </Text>
                </View>

                {stableActivityId ? (
                  <TouchableOpacity
                    accessibilityLabel={`Open ${activity.title || activity.name} details`}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/activities/[activityId]',
                        params: {
                          activityId: stableActivityId,
                          savedActivityId: item.id,
                        },
                      })
                    }
                    style={styles.openDetailButton}
                  >
                    <Text style={styles.openDetailText}>Open activity</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.legacyNote}>
                    This older saved activity remains available here as a snapshot.
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  openDetailButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#7138DF',
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  openDetailText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  legacyNote: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 14,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
  },

  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.4,
  },

  heroTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  heroSubtitle: {
    marginTop: 8,
    color: '#E0E7FF',
    lineHeight: 20,
  },

  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },

  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },

  filterChipText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 13,
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },

  emptyCardTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },

  emptyCardText: {
    marginTop: 8,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
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
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  cardTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },

  cardDate: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionBlock: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },

  bulletText: {
    color: '#475569',
    lineHeight: 21,
    marginBottom: 5,
    fontWeight: '600',
  },

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 12,
  },

  successText: {
    flex: 1,
    marginLeft: 8,
    color: '#166534',
    lineHeight: 20,
    fontWeight: '700',
  },
});
