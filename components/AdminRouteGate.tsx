import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminAccess } from '../lib/adminAccess';

export default function AdminRouteGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loading, isAdmin } = useAdminAccess();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.message}>Checking Admin access…</Text>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <Ionicons name="lock-closed-outline" size={42} color="#94A3B8" />
        <Text style={styles.title}>Admin Access Required</Text>
        <Text style={styles.message}>This area is available only to authorized app administrators.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)/settings')}>
          <Text style={styles.buttonText}>Return to Settings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F1',
    padding: 28,
  },
  title: { marginTop: 14, color: '#2E1065', fontSize: 22, fontWeight: '900' },
  message: { marginTop: 8, color: '#64748B', textAlign: 'center', fontWeight: '700' },
  button: { marginTop: 20, borderRadius: 16, backgroundColor: '#7C3AED', paddingHorizontal: 18, paddingVertical: 13 },
  buttonText: { color: '#FFFFFF', fontWeight: '900' },
});
