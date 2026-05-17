import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase'; // Adjust path if needed

interface ActivityLog {
  id: string;
  child_id: string;
  activity_name: string;
  focus_skill: string;
  created_at: string;
}

export default function HistoryScreen() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      /**
       * FIX: Changed 'completed_at' to 'created_at' to resolve 
       * the "column does not exist" error from your logs.
       */
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, child_id, activity_name, focus_skill, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error("Error loading history:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const renderItem = ({ item }: { item: ActivityLog }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.activityTitle}>{item.activity_name}</Text>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.skillBadge}>
        <Ionicons name="sparkles-outline" size={14} color="#6366f1" />
        <Text style={styles.skillText}>{item.focus_skill}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No activities logged yet.</Text>
            <Text style={styles.emptySubtext}>Complete an AI activity to see it here.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: '#64748b',
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});