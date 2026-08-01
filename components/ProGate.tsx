import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSubscription } from '../lib/SubscriptionContext';
import { hasEntitlement } from '../lib/entitlements';

export default function ProGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isPro, loading } = useSubscription();

  const hasProAccess = hasEntitlement(
    { isPro },
    'premium_tool'
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.title}>Checking access...</Text>
          <Text style={styles.subtitle}>
            Confirming your ABA at Home Pro access.
          </Text>
        </View>
      </View>
    );
  }

  if (hasProAccess) {
    return <>{children}</>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={14} color="#7C3AED" />
          <Text style={styles.badgeText}>ABA AT HOME PRO</Text>
        </View>

        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={38} color="#4F46E5" />
        </View>

        <Text style={styles.title}>Unlock This Tool</Text>

        <Text style={styles.subtitle}>
          Pro gives families access to premium routines, printables,
          personalized tools, and expanded support features.
        </Text>

        <View style={styles.featureList}>
          <Feature text="Custom visual routines" />
          <Feature text="Printable routine charts" />
          <Feature text="Expanded parent support tools" />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/subscription')}
          activeOpacity={0.9}
        >
          <Ionicons name="star" size={17} color="#FFFFFF" />
          <Text style={styles.buttonText}>Upgrade to Pro</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
      <Text style={styles.featureText}>{text}</Text>
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
    borderRadius: 30,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  badgeText: {
    marginLeft: 6,
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  iconWrap: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 18,
    fontWeight: '600',
  },

  featureList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  featureText: {
    marginLeft: 8,
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },

  button: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 190,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
    fontSize: 15,
  },

  backText: {
    marginTop: 15,
    color: '#64748B',
    fontWeight: '800',
  },
});
