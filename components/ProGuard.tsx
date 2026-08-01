import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSubscription } from '../lib/SubscriptionContext';
import { hasEntitlement } from '../lib/entitlements';

export default function ProGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isPro, loading } = useSubscription();
  const hasProAccess = hasEntitlement(
    { isPro },
    'premium_tool'
  );

  if (loading) return null;

  if (!hasProAccess) {
    return (
      <View style={styles.overlay}>
        <Ionicons name="lock-closed" size={80} color="#007AFF" />
        <Text style={styles.title}>Pro Feature</Text>
        <Text style={styles.subtitle}>
          Unlock the 30-Day Curriculum and Advanced Analytics to track your child&apos;s progress.
        </Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/subscription')}
        >
          <Text style={styles.buttonText}>View Subscription Plans</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
