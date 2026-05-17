import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSubscription } from '../lib/SubscriptionContext';

export default function ProGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isPro, loading } = useSubscription();

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Ionicons name="hourglass-outline" size={34} color="#4F46E5" />
          <Text style={styles.title}>Checking access...</Text>
          <Text style={styles.subtitle}>
            Please wait while we confirm your subscription.
          </Text>
        </View>
      </View>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={38} color="#4F46E5" />
        </View>

        <Text style={styles.title}>Pro Feature</Text>

        <Text style={styles.subtitle}>
          Upgrade to unlock this feature and support your child’s communication,
          routines, and daily progress.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/subscription')}
        >
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          <Text style={styles.buttonText}>Unlock Pro</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  iconWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },

  subtitle: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 18,
  },

  button: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 170,
  },

  buttonText: {
    color: '#FFF',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },

  backText: {
    marginTop: 14,
    color: '#64748B',
    fontWeight: '700',
  },
});