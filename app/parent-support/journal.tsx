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
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobBottom} />
      <View style={styles.bgBlobBottomRight} />

      <Ionicons name="sparkles" size={18} color="#FDBA74" style={styles.sparkleOne} />
      <Ionicons name="heart" size={20} color="#F0ABFC" style={styles.heartOne} />
      <Ionicons name="sparkles" size={16} color="#F9A8D4" style={styles.sparkleTwo} />

      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Parent Support</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroIcon}>
            <Ionicons name="journal-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Parent Journal</Text>

          <Text style={styles.heroText}>
            A private space to write, save, and look back at your caregiver
            reflections over time.
          </Text>

          <View style={styles.heroIllustration}>
            <Ionicons name="cafe-outline" size={36} color="#BE185D" />
            <Ionicons name="book-outline" size={34} color="#BE185D" />
            <Ionicons name="leaf-outline" size={30} color="#84A98C" />
          </View>
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

          <Ionicons name="chevron-forward" size={22} color="#DB2777" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.secondaryCard}
          onPress={() => router.push('/parent-support/journal-history')}
        >
          <View style={styles.secondaryIcon}>
            <Ionicons name="book-outline" size={25} color="#DB2777" />
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

          <Ionicons name="chevron-forward" size={22} color="#DB2777" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="lock-closed-outline" size={21} color="#DB2777" />

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
    backgroundColor: '#FFF7FA',
  },

  container: {
    padding: 20,
    paddingBottom: 42,
  },

  bgBlobTopRight: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFE4E6',
    top: -70,
    right: -80,
    opacity: 0.75,
  },

  bgBlobLeft: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#F5D0FE',
    top: 620,
    left: -150,
    opacity: 0.35,
  },

  bgBlobBottom: {
    position: 'absolute',
    width: 360,
    height: 220,
    borderRadius: 180,
    backgroundColor: '#FFE4E6',
    bottom: -90,
    left: -40,
    opacity: 0.5,
  },

  bgBlobBottomRight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DBEAFE',
    bottom: 80,
    right: -120,
    opacity: 0.35,
  },

  sparkleOne: {
    position: 'absolute',
    top: 152,
    right: 82,
  },

  sparkleTwo: {
    position: 'absolute',
    bottom: 210,
    left: 70,
  },

  heartOne: {
    position: 'absolute',
    bottom: 280,
    right: 90,
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
    backgroundColor: '#DB2777',
    borderRadius: 32,
    padding: 24,
    minHeight: 250,
    marginBottom: 18,
  },

  heroGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -75,
    right: -60,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 190,
    height: 120,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.13)',
    bottom: -30,
    right: 10,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
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
    color: '#FFE4E6',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
    maxWidth: '92%',
  },

  heroIllustration: {
    position: 'absolute',
    right: 22,
    bottom: 18,
    width: 132,
    height: 76,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },

  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  primaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: '#DB2777',
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
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  secondaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  secondaryTitle: {
    color: '#BE185D',
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
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    marginLeft: 9,
    color: '#831843',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});