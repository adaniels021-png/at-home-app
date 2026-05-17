import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

/**
 * 📈 PRACTICE HISTORY
 * This screen pulls live data from the Supabase 'skill_logs' table.
 */
export default function History() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data when the screen loads
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("M5 Bridge Error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const renderLogItem = ({ item }: { item: any }) => (
    <View style={styles.logCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.skillTitle}>{item.skill_name}</Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-done" size={14} color="#059669" />
          <Text style={styles.statusText}>LOGGED</Text>
        </View>
      </View>

      {item.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>History</Text>
        <Text style={styles.subTitle}>Review your recent practice sessions.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#2563EB" 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptySub}>Logs will appear here after you complete a lesson.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerSection: { 
    paddingHorizontal: 24, 
    paddingVertical: 20, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#111827' },
  subTitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPadding: { padding: 20 },
  logCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  skillTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  dateText: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ECFDF5', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  statusText: { fontSize: 11, fontWeight: '800', color: '#059669', marginLeft: 4 },
  notesBox: { 
    marginTop: 12, 
    padding: 12, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12 
  },
  notesText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#4B5563', marginTop: 16 },
  emptySub: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 22 }
});