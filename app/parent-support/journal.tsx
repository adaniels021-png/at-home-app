import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Image,
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

const TODAY_PROMPT = 'What felt heavy today, and what helped even a little?';

const HERO_IMAGE = require('@/assets/images/parent-journal-hero.png');
const NEW_ENTRY_IMAGE = require('@/assets/images/parent-journal-new-entry.png');
const JOURNAL_HISTORY_IMAGE = require('@/assets/images/parent-journal-history.png');

function getEntryDate(entry?: ParentJournalEntry) {
  const rawDate =
    (entry as any)?.createdAt ||
    (entry as any)?.created_at ||
    (entry as any)?.date ||
    (entry as any)?.timestamp ||
    null;

  if (!rawDate) return null;

  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortEntriesNewestFirst(entries: ParentJournalEntry[]) {
  return [...entries].sort((a, b) => {
    const dateA = getEntryDate(a)?.getTime() ?? 0;
    const dateB = getEntryDate(b)?.getTime() ?? 0;
    return dateB - dateA;
  });
}

export default function ParentJournalHomeScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<ParentJournalEntry[]>([]);

  const loadEntries = useCallback(async () => {
    const savedEntries = await getParentJournalEntries();
    setEntries(sortEntriesNewestFirst(savedEntries || []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries])
  );

  const entryCountText = entries.length
    ? `${entries.length} ${entries.length === 1 ? 'reflection' : 'reflections'} saved`
    : 'No reflections saved yet';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundWash} />

      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobBottomRight} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.backText}>Parent Support</Text>
        </View>

        <View style={styles.heroBlendWrap}>
          <View style={styles.heroGlowBehind} />
          <View style={styles.heroCard}>
            <Image source={HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.promptCard}
          onPress={() => router.push('/parent-support/journal-entry' as any)}
        >
          <View style={styles.promptIcon}>
            <Ionicons name="bulb-outline" size={42} color="#F59E0B" />
          </View>

          <View style={styles.cardTextWrap}>
            <Text style={styles.promptEyebrow}>Today's Reflection</Text>
            <Text style={styles.promptText}>{TODAY_PROMPT}</Text>
          </View>

          <Ionicons name="chevron-forward" size={30} color="#EA580C" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.actionCard}
          onPress={() => router.push('/parent-support/journal-entry' as any)}
        >
          <View style={styles.imageIconWrap}>
            <Image source={NEW_ENTRY_IMAGE} style={styles.cardImageIcon} resizeMode="cover" />
          </View>

          <View style={styles.cardTextWrap}>
            <Text style={styles.actionTitle}>New Journal Entry</Text>
            <Text style={styles.actionText}>
              Check in with your stress level, feelings, and a short reflection.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={26} color="#DB2777" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.actionCard, styles.historyCard]}
          onPress={() => router.push('/parent-support/journal-history' as any)}
        >
          <View style={styles.imageIconWrap}>
            <Image source={JOURNAL_HISTORY_IMAGE} style={styles.cardImageIcon} resizeMode="cover" />
          </View>

          <View style={styles.cardTextWrap}>
            <Text style={styles.actionTitle}>View My Journal</Text>
            <Text style={styles.actionText}>{entryCountText}</Text>
          </View>

          <Ionicons name="chevron-forward" size={26} color="#DB2777" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={30} color="#9F1239" />

          <Text style={styles.infoText}>
            Your journal entries are saved privately on this device unless you later choose to sync them.
          </Text>

          <View style={styles.infoLock}>
            <Ionicons name="lock-closed" size={21} color="#FFFFFF" />
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 56,
  },

  bgBlobTopRight: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#FFE4E6',
    top: -110,
    right: -110,
    opacity: 0.68,
  },

  bgBlobLeft: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FCE7F3',
    top: 560,
    left: -175,
    opacity: 0.3,
  },

  bgBlobBottomRight: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#DBEAFE',
    bottom: 80,
    right: -145,
    opacity: 0.22,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE2E7',
  },

  backText: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  heroBlendWrap: {
    marginBottom: 20,
  },

 heroGlowBehind: {
  position: 'absolute',
  left: 18,
  right: 18,
  bottom: -10,
  height: 46,
  borderRadius: 28,
  backgroundColor: '#FBCFE8',
  opacity: 0.48,
},

 heroCard: {
  height: 225,
  borderRadius: 34,
  overflow: 'hidden',
  backgroundColor: 'transparent',
  shadowColor: '#DB2777',
  shadowOpacity: 0.04,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 1,
},

  heroImage: {
    width: '100%',
    height: '100%',
  },

  promptCard: {
  minHeight: 182,
  backgroundColor: '#FFFBEB',
  borderRadius: 34,
  padding: 22,
  borderWidth: 1.5,
  borderColor: '#FED7AA',
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 22,
  shadowColor: '#F59E0B',
  shadowOpacity: 0.07,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
},

  promptIcon: {
    width: 92,
    height: 92,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  promptEyebrow: {
    color: '#0F172A',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    marginBottom: 7,
  },

  promptText: {
    color: '#334155',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '800',
  },

  actionCard: {
    minHeight: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 13,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyCard: {
    marginBottom: 24,
    borderColor: 'rgba(255,255,255,0.95)',
  },

  imageIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 21,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },

  cardImageIcon: {
    width: '100%',
    height: '100%',
  },

 actionTitle: {
  color: '#DB2777',
  fontSize: 19,
  lineHeight: 23,
  fontWeight: '900',
  marginBottom: 3,
},

  actionText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 26,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoText: {
    flex: 1,
    color: '#831843',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
    marginLeft: 12,
  },

  infoLock: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  backgroundWash: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: '#FFF7FA',
},
});