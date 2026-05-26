import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getParentJournalEntries,
  ParentJournalEntry,
} from '@/lib/parentJournalStorage';

export default function ParentJournalHomeScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<ParentJournalEntry[]>([]);

  async function loadEntries() {
    const savedEntries = await getParentJournalEntries();
    setEntries(savedEntries);
  }

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Parent Support</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="journal-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Parent Journal</Text>

          <Text style={styles.heroText}>
            A private space to write, save, and look back at your caregiver
            reflections over time.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryCard}
          onPress={() => router.push('/parent-support/journal-entry')}
        >
          <View style={styles.primaryIcon}>
            <Ionicons name="create-outline" size={26} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.primaryTitle}>New Journal Entry</Text>
            <Text style={styles.primaryText}>
              Check in with your stress level, feelings, and a short reflection.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#0F766E" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.secondaryCard}
          onPress={() => router.push('/parent-support/journal-history')}
        >
          <View style={styles.secondaryIcon}>
            <Ionicons name="book-outline" size={25} color="#0F766E" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.secondaryTitle}>View My Journal</Text>
            <Text style={styles.secondaryText}>
              {entries.length > 0
                ? `${entries.length} saved ${
                    entries.length === 1 ? 'entry' : 'entries'
                  }`
                : 'No journal entries yet'}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#0F766E" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="lock-closed-outline" size={21} color="#0F766E" />

          <Text style={styles.infoText}>
            Your journal entries are saved privately on this device unless you
            later choose to sync them.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ECFDF5',
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backText: {
    marginLeft: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  heroCard: {
    overflow: 'hidden',
    backgroundColor: '#0F766E',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
  },

  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -70,
    right: -55,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },

  heroText: {
    color: '#CCFBF1',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },

  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  primaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  primaryTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },

  primaryText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  secondaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  secondaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  secondaryTitle: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  secondaryText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    marginLeft: 9,
    color: '#115E59',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});