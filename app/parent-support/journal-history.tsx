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
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sortEntriesNewestFirst(entries: ParentJournalEntry[]) {
  return [...entries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function JournalHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<ParentJournalEntry[]>([]);

  const loadEntries = useCallback(async () => {
    const saved = await getParentJournalEntries();
    setEntries(sortEntriesNewestFirst(saved || []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries])
  );

  function confirmDelete(id: string) {
    Alert.alert(
      'Delete Reflection?',
      'This reflection will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteParentJournalEntry(id);
            setEntries(sortEntriesNewestFirst(updated || []));
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundBase} />

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

          <Text style={styles.backText}>Parent Journal</Text>
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="book-outline" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>My Journal</Text>
            <Text style={styles.introText}>Your private reflections.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newEntryButton}
          activeOpacity={0.9}
          onPress={() => router.push('/parent-support/journal-entry' as any)}
        >
          <Ionicons name="create-outline" size={19} color="#FFFFFF" />
          <Text style={styles.newEntryText}>New Journal Entry</Text>
        </TouchableOpacity>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="journal-outline" size={38} color="#D63384" />
            </View>

            <Text style={styles.emptyTitle}>No reflections yet</Text>

            <Text style={styles.emptyText}>
              Every journal starts with one page. Create your first check-in.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              activeOpacity={0.9}
              onPress={() => router.push('/parent-support/journal-entry' as any)}
            >
              <Text style={styles.emptyButtonText}>Start a reflection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry) => {
              const stress = entry.stressLevel ?? 0;
              const moods = entry.moods || [];

              return (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.dateBadge}>
                      <Ionicons name="time-outline" size={15} color="#EA580C" />
                      <Text style={styles.dateText}>
                        {formatDateTime(entry.createdAt)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      activeOpacity={0.85}
                      onPress={() => confirmDelete(entry.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#D63384" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.promptTitle}>
                    {entry.promptTitle || 'Reflection'}
                  </Text>

                  <View style={styles.divider} />

                  <Text style={styles.entryText}>
                    {entry.text || entry.promptText || 'No reflection text saved.'}
                  </Text>

                  <View style={styles.metaBox}>
                    <View style={styles.metaSection}>
                      <Text style={styles.metaLabel}>Stress</Text>

                      <View style={styles.stressRow}>
                        {[1, 2, 3, 4, 5].map((level) => (
                          <View
                            key={level}
                            style={[
                              styles.stressDot,
                              level <= stress && styles.stressDotFilled,
                            ]}
                          />
                        ))}
                      </View>
                    </View>

                    <View style={styles.metaSection}>
                      <Text style={styles.metaLabel}>Feelings</Text>

                      {moods.length > 0 ? (
                        <View style={styles.moodPills}>
                          {moods.map((mood) => (
                            <View key={mood} style={styles.moodPill}>
                              <Text style={styles.moodPillText}>{mood}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noMoodText}>None selected</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.privateRow}>
                    <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
                    <Text style={styles.privateText}>Saved privately</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  safe: {
  flex: 1,
  backgroundColor: '#FFF7FA',
  overflow: 'hidden',
},

backgroundBase: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: '#FFF7FA',
  zIndex: -10,
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
  opacity: 0.22,
  zIndex: -9,
},

bgBlobLeft: {
  position: 'absolute',
  width: 300,
  height: 300,
  borderRadius: 150,
  backgroundColor: '#FCE7F3',
  top: 560,
  left: -175,
  opacity: 0.12,
  zIndex: -9,
},

bgBlobBottomRight: {
  position: 'absolute',
  width: 270,
  height: 270,
  borderRadius: 135,
  backgroundColor: '#DBEAFE',
  bottom: 80,
  right: -145,
  opacity: 0.1,
  zIndex: -9,
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

  introCard: {
    minHeight: 104,
    borderRadius: 28,
    backgroundColor: '#D63384',
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  introIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  introTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },

  introText: {
    marginTop: 3,
    color: '#FFE4E6',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },

newEntryButton: {
  height: 54,
  borderRadius: 18,
  backgroundColor: '#D63384',
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
  borderWidth: 1.5,
  borderColor: '#F9A8D4',
  shadowColor: '#D63384',
  shadowOpacity: 0.05,
  shadowRadius: 18,
  shadowOffset: {
    width: 0,
    height: 8,
  },
  elevation: 2,
},

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyButtonText: {
    color: '#D63384',
    fontSize: 14,
    fontWeight: '900',
  },

  entriesList: {
    gap: 15,
  },

  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },

  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  dateBadge: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  dateText: {
    marginLeft: 6,
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '900',
  },

  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  promptTitle: {
    color: '#D63384',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },

  entryText: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '700',
    marginBottom: 15,
  },

  metaBox: {
    backgroundColor: '#FFF7FA',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    gap: 12,
  },

  metaSection: {
    gap: 7,
  },

  metaLabel: {
    color: '#831843',
    fontSize: 12,
    fontWeight: '900',
  },

  stressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.4,
    borderColor: '#D63384',
    marginRight: 6,
    backgroundColor: 'transparent',
  },

  stressDotFilled: {
    backgroundColor: '#D63384',
  },

  moodPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  moodPill: {
    backgroundColor: '#FCE7F3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },

  moodPillText: {
    color: '#BE185D',
    fontSize: 12,
    fontWeight: '900',
  },

  noMoodText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },

  privateRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  privateText: {
    marginLeft: 5,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
});