import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    deleteParentJournalEntry,
    getParentJournalEntries,
    ParentJournalEntry,
} from '@/lib/parentJournalStorage';

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function JournalHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<ParentJournalEntry[]>([]);

  async function loadEntries() {
    const saved = await getParentJournalEntries();
    setEntries(saved);
  }

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [])
  );

  function confirmDelete(id: string) {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteParentJournalEntry(id);
            setEntries(updated);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Parent Journal</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="book-outline" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>My Journal</Text>

          <Text style={styles.heroText}>
            Your saved check-ins appear here by date and time so you can look
            back whenever you need.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newEntryButton}
          onPress={() => router.push('/parent-support/journal-entry')}
        >
          <Ionicons name="create-outline" size={19} color="#FFFFFF" />
          <Text style={styles.newEntryText}>New Journal Entry</Text>
        </TouchableOpacity>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="journal-outline" size={42} color="#94A3B8" />

            <Text style={styles.emptyTitle}>No journal entries yet</Text>

            <Text style={styles.emptyText}>
              When you save a check-in, it will appear here like a real private
              journal.
            </Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="time-outline" size={15} color="#0F766E" />
                    <Text style={styles.dateText}>
                      {formatDateTime(entry.createdAt)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(entry.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.promptTitle}>{entry.promptTitle}</Text>

                <Text style={styles.promptText}>{entry.promptText}</Text>

                <Text style={styles.entryText}>{entry.text}</Text>

                <View style={styles.metaBox}>
                  <Text style={styles.metaText}>
                    Stress: {entry.stressLevel || 'Not selected'}
                  </Text>

                  <Text style={styles.metaText}>
                    Feelings:{' '}
                    {entry.moods?.length ? entry.moods.join(', ') : 'None selected'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    marginBottom: 16,
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

  newEntryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#0F766E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  newEntryText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },

  entriesList: {
    gap: 14,
  },

  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  dateBadge: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },

  dateText: {
    marginLeft: 5,
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
  },

  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  promptTitle: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  promptText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginBottom: 12,
  },

  entryText: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 14,
  },

  metaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  metaText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
  },
});