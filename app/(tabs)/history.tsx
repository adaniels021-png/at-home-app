import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';
import ProGuard from '../../components/ProGuard';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const { data } = await supabase.from('pairing_sessions').select('*').order('created_at', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchSessions(); }, []));

  return (
    <ProGuard>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              <Text>Duration: {Math.floor(item.duration_seconds / 60)}m</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No sessions recorded yet.</Text>}
        />
      </SafeAreaView>
    </ProGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10 },
  date: { fontWeight: 'bold', fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});
