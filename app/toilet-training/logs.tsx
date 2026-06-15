import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChild } from '@/lib/SelectedChildContext';
import {
  deletePottyEntryForChild,
  getPottyEntriesForChild,
  PottyEntry,
} from '@/lib/toiletTrainingStorage';

export default function PottyLogsScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [entries, setEntries] = useState<PottyEntry[]>([]);

  async function loadLogs() {
    if (!selectedChild?.id) {
      setEntries([]);
      return;
    }

    const saved = await getPottyEntriesForChild(selectedChild.id);
    setEntries(saved);
  }

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [selectedChild?.id])
  );

  const counts = useMemo(() => {
    return {
      success: entries.filter((entry) => entry.result === 'success').length,
      attempt: entries.filter((entry) => entry.result === 'attempt').length,
      accident: entries.filter((entry) => entry.result === 'accident').length,
    };
  }, [entries]);

  function deleteLog(entryId: string) {
    if (!selectedChild?.id) return;

    Alert.alert('Delete Log', 'Remove this potty log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePottyEntryForChild(selectedChild.id, entryId);
          await loadLogs();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.screenGlowTop} />
      <View pointerEvents="none" style={styles.screenGlowMiddle} />
      <View pointerEvents="none" style={styles.screenGlowBottom} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Potty Log History</Text>
            <Text style={styles.subtitle}>Review saved potty visits in one place.</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />

          <View style={styles.heroIcon}>
            <Ionicons name="file-tray-full-outline" size={30} color="#2563EB" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>SAVED LOGS</Text>
            <Text style={styles.heroTitle}>{entries.length} Total Logs</Text>
            <Text style={styles.heroText}>
              Successes, attempts, accidents, dates, and notes are saved here.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat
            value={counts.success}
            label="Success"
            icon="checkmark-circle-outline"
            color="#059669"
            bg="#ECFDF5"
            border="#A7F3D0"
          />

          <MiniStat
            value={counts.attempt}
            label="Attempt"
            icon="ellipse-outline"
            color="#D97706"
            bg="#FFFBEB"
            border="#FDE68A"
          />

          <MiniStat
            value={counts.accident}
            label="Accident"
            icon="alert-circle-outline"
            color="#DC2626"
            bg="#FEF2F2"
            border="#FECACA"
          />
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={34} color="#94A3B8" />
            </View>

            <Text style={styles.emptyTitle}>No Logs Yet</Text>

            <Text style={styles.emptyText}>
              Go back to Toilet Training and log a potty visit to start building history.
            </Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {entries.map((entry) => (
              <LogCard key={entry.id} entry={entry} onDelete={() => deleteLog(entry.id)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({
  value,
  label,
  icon,
  color,
  bg,
  border,
}: {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <View style={[styles.miniStat, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon} size={19} color={color} />
      <Text style={styles.miniStatNumber}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function LogCard({ entry, onDelete }: { entry: PottyEntry; onDelete: () => void }) {
  const isSuccess = entry.result === 'success';
  const isAttempt = entry.result === 'attempt';

  const color = isSuccess ? '#059669' : isAttempt ? '#D97706' : '#DC2626';
  const bg = isSuccess ? '#ECFDF5' : isAttempt ? '#FFFBEB' : '#FEF2F2';
  const border = isSuccess ? '#A7F3D0' : isAttempt ? '#FDE68A' : '#FECACA';

  const icon = isSuccess
    ? 'checkmark-circle-outline'
    : isAttempt
      ? 'ellipse-outline'
      : 'alert-circle-outline';

  const label = isSuccess ? 'Used Potty' : isAttempt ? 'Sat / Tried' : 'Accident';

  return (
    <View style={[styles.logCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.logIcon}>
        <Ionicons name={icon} size={23} color={color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.logTitle}>{label}</Text>

        <Text style={styles.logDate}>
          {new Date(entry.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>

        {entry.notes ? <Text style={styles.logNote}>{entry.notes}</Text> : null}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },

  container: {
    padding: 20,
    paddingBottom: 48,
  },

  screenGlowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(99,102,241,0.08)',
    top: -130,
    right: -90,
  },

  screenGlowMiddle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(37,99,235,0.05)',
    top: 350,
    left: -130,
  },

  screenGlowBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168,85,247,0.05)',
    bottom: -140,
    right: -130,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },

  heroGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37,99,235,0.08)',
    right: -55,
    top: -60,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroEyebrow: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#1E3A8A',
  },

  heroText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  miniStat: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },

  miniStatNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 3,
  },

  miniStatLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '900',
    marginTop: 1,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 12,
  },

  emptyText: {
    color: '#64748B',
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },

  logsList: {
    gap: 12,
  },

  logCard: {
    borderRadius: 24,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },

  logIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  logDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
    marginTop: 2,
  },

  logNote: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },

  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});