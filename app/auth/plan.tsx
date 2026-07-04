import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSubscription } from '../../lib/SubscriptionContext';
export default function Plan() {
  const { isPro } = useSubscription();

  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Pro Feature</Text>
        <Text style={styles.subtitle}>Unlock your 30-day coaching plan.</Text>
        <Link href="/subscription" style={styles.link}>Upgrade Now</Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>30-Day Curriculum</Text>
      
      <Link href="/logger" asChild>
        <TouchableOpacity style={styles.dayCard}>
          <Text style={styles.dayTitle}>Day 1: Eye Contact</Text>
          <Text style={styles.daySub}>Goal: 5 Independent Responses</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
  lockIcon: { fontSize: 50, textAlign: 'center', marginTop: 100 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginVertical: 10, color: '#666' },
  link: { color: '#007AFF', textAlign: 'center', fontWeight: 'bold' },
  dayCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dayTitle: { fontSize: 18, fontWeight: 'bold' },
  daySub: { color: '#666', marginTop: 4 }
});
