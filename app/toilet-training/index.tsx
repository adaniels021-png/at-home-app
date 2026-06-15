import { useChild } from '@/lib/SelectedChildContext';
import {
  getPottyEntriesForChild,
  getPottyReadinessResult,
  getTodaysPottyStats,
  PottyReadinessResult,
  savePottyEntry,
} from '@/lib/toiletTrainingStorage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type PottyResult = 'success' | 'attempt' | 'accident';

type PottyEntry = {
  id: string;
  result: PottyResult;
  timestamp: string;
  notes?: string;
};

export default function ToiletTrainingScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();

  const [entries, setEntries] = useState<PottyEntry[]>([]);
  const [allEntries, setAllEntries] = useState<PottyEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<PottyResult | null>(null);
  const [note, setNote] = useState('');
  const [readinessResult, setReadinessResult] =
  useState<PottyReadinessResult | null>(null);

  const pottyRoutinePreview = require('../../assets/images/potty-routine/boy/bathroom.png');

  useFocusEffect(
  React.useCallback(() => {
    void loadTodayStats();
  }, [selectedChild?.id])
);

async function loadTodayStats() {
  if (!selectedChild?.id) return;

  const stats = await getTodaysPottyStats(selectedChild.id);
  const savedEntries = await getPottyEntriesForChild(selectedChild.id);
  const savedReadiness = await getPottyReadinessResult(selectedChild.id);
  setReadinessResult(savedReadiness); 

  setAllEntries(savedEntries);

  setEntries([
    ...Array.from({ length: stats.successes }).map((_, index) => ({
      id: `success-${index}`,
      result: 'success' as PottyResult,
      timestamp: new Date().toISOString(),
    })),
    ...Array.from({ length: stats.attempts }).map((_, index) => ({
      id: `attempt-${index}`,
      result: 'attempt' as PottyResult,
      timestamp: new Date().toISOString(),
    })),
    ...Array.from({ length: stats.accidents }).map((_, index) => ({
      id: `accident-${index}`,
      result: 'accident' as PottyResult,
      timestamp: new Date().toISOString(),
    })),
  ]);
}

  const todayStats = useMemo(() => {
    return {
      success: entries.filter((entry) => entry.result === 'success').length,
      attempt: entries.filter((entry) => entry.result === 'attempt').length,
      accident: entries.filter((entry) => entry.result === 'accident').length,
    };
  }, [entries]);


  function openLogModal(result?: PottyResult) {
    setSelectedResult(result ?? null);
    setNote('');
    setModalVisible(true);
  }

 async function saveEntry() {
  if (!selectedResult || !selectedChild?.id) return;

  await savePottyEntry({
    id: `${Date.now()}`,
    childId: selectedChild.id,
    result: selectedResult,
    timestamp: new Date().toISOString(),
    notes: note.trim() || undefined,
  });

  await loadTodayStats();

  setModalVisible(false);
  setSelectedResult(null);
  setNote('');
}

  function getResultLabel(result: PottyResult) {
    if (result === 'success') return 'Used Potty';
    if (result === 'attempt') return 'Sat / Tried';
    return 'Accident';
  }

  function getResultIcon(result: PottyResult) {
    if (result === 'success') return 'checkmark-circle-outline';
    if (result === 'attempt') return 'ellipse-outline';
    return 'alert-circle-outline';
  }

  function getResultColor(result: PottyResult) {
    if (result === 'success') return '#059669';
    if (result === 'attempt') return '#D97706';
    return '#DC2626';
  }

  function getResultSoftBg(result: PottyResult) {
    if (result === 'success') return '#ECFDF5';
    if (result === 'attempt') return '#FFFBEB';
    return '#FEF2F2';
  }

  function getReadinessPreview() {
  if (!readinessResult) {
    return {
      title: 'Readiness',
      text: 'Find your child’s starting point.',
      subtext: 'Take assessment',
      color: '#7C3AED',
    };
  }

  if (readinessResult.level === 'not_ready') {
    return {
      title: 'Bathroom Comfort',
      text: `Score ${readinessResult.score}/8`,
      subtext: 'Start with comfort first',
      color: '#D97706',
    };
  }

  if (readinessResult.level === 'building_skills') {
    return {
      title: 'Building Skills',
      text: `Score ${readinessResult.score}/8`,
      subtext: 'Practice short potty steps',
      color: '#7C3AED',
    };
  }

  if (readinessResult.level === 'ready_to_start') {
    return {
      title: 'Ready to Begin',
      text: `Score ${readinessResult.score}/8`,
      subtext: 'Start scheduled practice',
      color: '#2563EB',
    };
  }

  return {
    title: 'Ready for Routine',
    text: `Score ${readinessResult.score}/8`,
    subtext: 'Use a consistent plan',
    color: '#059669',
  };
}

function getPlanPreview() {
  if (!readinessResult) {
    return 'Complete readiness first';
  }

  if (readinessResult.level === 'not_ready') {
    return 'Focus on bathroom comfort';
  }

  if (readinessResult.level === 'building_skills') {
    return 'Try 2–4 calm potty sits';
  }

  if (readinessResult.level === 'ready_to_start') {
    return 'Try every 60–90 minutes';
  }

  return 'Use scheduled potty sits';
}

function getProblemSolverPreview() {
  if (todayStats.accident >= 2) {
    return 'Frequent accidents?';
  }

  if (todayStats.attempt > todayStats.success) {
    return 'Child sitting but not going?';
  }

  if (!readinessResult) {
    return 'Refusal, accidents, flushing, or communication';
  }

  if (readinessResult.level === 'not_ready') {
    return 'Bathroom refusal or fear?';
  }

  return 'Need help with a potty challenge?';
}

const readinessPreview = getReadinessPreview();
const planPreview = getPlanPreview();
const problemPreview = getProblemSolverPreview();

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

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Toilet Training</Text>
            <Text style={styles.subtitle}>Support potty practice without pressure.</Text>
          </View>
        </View>

        <View style={styles.practiceCard}>
          <View pointerEvents="none" style={styles.practiceGlow} />

          <View style={styles.practiceTopRow}>
            <View style={styles.practiceIconCircle}>
              <Ionicons name="water-outline" size={28} color="#2563EB" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.practiceEyebrow}>POTTY SUPPORT</Text>
              <Text style={styles.practiceTitle}>Today’s Practice</Text>
              <Text style={styles.practiceText}>
                Track visits, celebrate effort, and keep routines predictable.
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatMini
              value={todayStats.success}
              label="Success"
              color="#059669"
              bg="#ECFDF5"
              icon="checkmark-circle-outline"
            />

            <StatMini
              value={todayStats.attempt}
              label="Attempt"
              color="#D97706"
              bg="#FFFBEB"
              icon="ellipse-outline"
            />

            <StatMini
              value={todayStats.accident}
              label="Accident"
              color="#DC2626"
              bg="#FEF2F2"
              icon="alert-circle-outline"
            />
          </View>

          <TouchableOpacity style={styles.mainLogButton} onPress={() => openLogModal()}>
  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
  <Text style={styles.mainLogButtonText}>Log Potty Visit</Text>
</TouchableOpacity>
</View> 

<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>Potty Training Coach</Text>
  <Text style={styles.sectionSubtext}>
    Guidance that adjusts based on readiness and today’s logs.
  </Text>
</View>

<View style={styles.coachSummaryCard}>
  <View style={styles.coachSummaryIcon}>
    <Ionicons name="sparkles-outline" size={24} color="#2563EB" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.coachSummaryTitle}>Today’s Coaching Tip</Text>
    <Text style={styles.coachSummaryText}>
      {readinessResult
        ? `${readinessPreview.subtext}. ${planPreview}.`
        : 'Start with the readiness assessment so the app can guide today’s potty plan.'}
    </Text>
  </View>
</View>

<View style={styles.coachGrid}>
  <TouchableOpacity
    style={styles.coachCard}
    onPress={() => router.push('/toilet-training/readiness')}
  >
    <Ionicons name="clipboard-outline" size={24} color={readinessPreview.color} />
    <Text style={styles.coachTitle}>{readinessPreview.title}</Text>
    <Text style={styles.coachText}>{readinessPreview.text}</Text>
    <Text style={[styles.coachMiniText, { color: readinessPreview.color }]}>
      {readinessPreview.subtext}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.coachCard}
    onPress={() => router.push('/toilet-training/plan')}
  >
    <Ionicons name="calendar-outline" size={24} color="#2563EB" />
    <Text style={styles.coachTitle}>Today’s Plan</Text>
    <Text style={styles.coachText}>{planPreview}</Text>
    <Text style={styles.coachMiniText}>View plan</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.coachCardFull}
    onPress={() => router.push('/toilet-training/problem-solver')}
  >
    <View style={styles.coachFullIcon}>
      <Ionicons name="bulb-outline" size={24} color="#D97706" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.coachTitle}>Problem Solver</Text>
      <Text style={styles.coachText}>{problemPreview}</Text>
    </View>

    <Ionicons name="chevron-forward" size={20} color="#D97706" />
  </TouchableOpacity>
</View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visual Potty Routine</Text>
          <Text style={styles.sectionSubtext}>
            Step-by-step pictures and simple parent words.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.visualRoutineCard}
          onPress={() => router.push('/toilet-training/visual-steps')}
          activeOpacity={0.9}
        >
          <Image source={pottyRoutinePreview} style={styles.visualPreviewImage} resizeMode="cover" />

          <View style={{ flex: 1 }}>
            <Text style={styles.visualRoutineTitle}>Open visual potty routine</Text>
            <Text style={styles.visualRoutineText}>
              Picture steps for bathroom, pants down, sit, try, wipe, flush, and wash hands.
            </Text>

            <View style={styles.visualMiniRow}>
              <View style={styles.visualMiniPill}>
                <Ionicons name="images-outline" size={13} color="#2563EB" />
                <Text style={styles.visualMiniText}>7 visual steps</Text>
              </View>

              <View style={styles.visualMiniPill}>
                <Ionicons name="person-outline" size={13} color="#2563EB" />
                <Text style={styles.visualMiniText}>Boy/Girl options</Text>
              </View>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#2563EB" />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parent Tools</Text>
          <Text style={styles.sectionSubtext}>Helpful supports for real-life potty moments.</Text>
        </View>

        <View style={styles.toolGrid}>
          <ToolCard
            title="Progress"
            text="Weekly totals"
            icon="bar-chart-outline"
            color="#10B981"
            bg="#ECFDF5"
            border="#A7F3D0"
            onPress={() => router.push('/toilet-training/progress')}
          />

          <ToolCard
            title="Schedule"
            text="Reminder times"
            icon="time-outline"
            color="#2563EB"
            bg="#EFF6FF"
            border="#BFDBFE"
            onPress={() => router.push('/toilet-training/schedule')}
          />

          <ToolCard
            title="Smart Tips"
            text="Refusal support"
            icon="bulb-outline"
            color="#7C3AED"
            bg="#FAF5FF"
            border="#E9D5FF"
            pro
            onPress={() => router.push('/toilet-training/tips')}
          />

          <ToolCard
            title="Insights"
            text="Best windows"
            icon="sparkles-outline"
            color="#7C3AED"
            bg="#FAF5FF"
            border="#E9D5FF"
            pro
            onPress={() => router.push('/toilet-training/insights')}
          />
        </View>

        <TouchableOpacity
  style={styles.logsShortcutCard}
  onPress={() => router.push('/toilet-training/logs')}
  activeOpacity={0.9}
>
  <View style={styles.logsShortcutIcon}>
    <Ionicons name="file-tray-full-outline" size={24} color="#2563EB" />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={styles.logsShortcutTitle}>Potty Log History</Text>
    <Text style={styles.logsShortcutText}>
      View, review, or delete saved potty logs.
    </Text>
  </View>

  <View style={styles.logsCountPill}>
    <Text style={styles.logsCountText}>{allEntries.length}</Text>
  </View>

  <Ionicons name="chevron-forward" size={21} color="#2563EB" />
</TouchableOpacity>

      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Potty Visit</Text>
            <Text style={styles.modalSubtitle}>What happened this time?</Text>

            <View style={styles.modalOptions}>
              {(['success', 'attempt', 'accident'] as PottyResult[]).map((result) => (
                <TouchableOpacity
                  key={result}
                  style={[
                    styles.modalOption,
                    selectedResult === result && styles.modalOptionSelected,
                  ]}
                  onPress={() => setSelectedResult(result)}
                >
                  <Ionicons name={getResultIcon(result)} size={24} color={getResultColor(result)} />
                  <Text style={styles.modalOptionText}>{getResultLabel(result)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="Optional note, like: sat for 2 minutes"
              placeholderTextColor="#94A3B8"
              value={note}
              onChangeText={setNote}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveButton, !selectedResult && styles.saveButtonDisabled]}
              onPress={saveEntry}
              disabled={!selectedResult}
            >
              <Text style={styles.saveButtonText}>Save Log</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatMini({
  value,
  label,
  icon,
  color,
  bg,
}: {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.statMini, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statMiniNumber}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function ToolCard({
  title,
  text,
  icon,
  color,
  bg,
  border,
  pro,
  onPress,
}: {
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
  pro?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.toolCard, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {pro ? (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
          <Text style={styles.lockBadgeText}>Pro</Text>
        </View>
      ) : null}

      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolText}>{text}</Text>
    </TouchableOpacity>
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
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(37,99,235,0.05)',
    top: 360,
    left: -140,
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

  headerTextWrap: {
    flex: 1,
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

  practiceCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 17,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },

  practiceGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37,99,235,0.08)',
    right: -55,
    top: -60,
  },

  practiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  practiceIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  practiceEyebrow: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  practiceTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A',
  },

  practiceText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 13,
  },

  statMini: {
  flex: 1,
  borderRadius: 18,
  paddingVertical: 8,
  alignItems: 'center',
},

statMiniNumber: {
  fontSize: 20,
  fontWeight: '900',
  color: '#0F172A',
  marginTop: 2,
},

  statMiniLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '900',
    marginTop: 1,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },

  sectionSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },

  visualRoutineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#2563EB',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  visualPreviewImage: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  visualRoutineTitle: {
    color: '#1E3A8A',
    fontSize: 17,
    fontWeight: '900',
  },

  visualRoutineText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  visualMiniRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 9,
  },

  visualMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 4,
  },

  visualMiniText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
  },

  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  toolCard: {
    width: '48%',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    minHeight: 112,
  },

  lockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },

  lockBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  toolTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 8,
  },

  toolText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
    fontWeight: '700',
  },

  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  recentTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
  },

  recentCount: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },

  emptyLogBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  emptyText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    fontWeight: '700',
  },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 20,
    marginBottom: 9,
  },

  logIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },

  logNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
    fontWeight: '700',
  },

  logRight: {
    alignItems: 'flex-end',
    gap: 8,
  },

  logTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
  },

  deleteLogButton: {
    width: 31,
    height: 31,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    paddingBottom: 34,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
  },

  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
    fontWeight: '700',
  },

  modalOptions: {
    gap: 10,
    marginBottom: 14,
  },

  modalOption: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },

  modalOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  modalOptionText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  noteInput: {
    minHeight: 82,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginBottom: 14,
    fontWeight: '700',
  },

  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },

  saveButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

mainLogButton: {
  marginTop: 4,
  backgroundColor: '#2563EB',
  borderRadius: 16,
  paddingVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 7,
},

mainLogButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '900',
},

logsShortcutCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 15,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginTop: 4,
},

logsShortcutIcon: {
  width: 48,
  height: 48,
  borderRadius: 18,
  backgroundColor: '#EFF6FF',
  alignItems: 'center',
  justifyContent: 'center',
},

logsShortcutTitle: {
  color: '#0F172A',
  fontSize: 15,
  fontWeight: '900',
},

logsShortcutText: {
  color: '#64748B',
  fontSize: 12,
  fontWeight: '700',
  marginTop: 3,
},

logsCountPill: {
  minWidth: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: '#EFF6FF',
  alignItems: 'center',
  justifyContent: 'center',
},

logsCountText: {
  color: '#2563EB',
  fontSize: 13,
  fontWeight: '900',
},

coachGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginBottom: 24,
},

coachCard: {
  width: '48%',
  backgroundColor: '#FFFFFF',
  borderRadius: 22,
  padding: 15,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  minHeight: 118,
},

coachCardFull: {
  width: '100%',
  backgroundColor: '#FFFBEB',
  borderRadius: 24,
  padding: 15,
  borderWidth: 1,
  borderColor: '#FDE68A',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},

coachFullIcon: {
  width: 48,
  height: 48,
  borderRadius: 18,
  backgroundColor: '#FEF3C7',
  alignItems: 'center',
  justifyContent: 'center',
},

coachTitle: {
  color: '#0F172A',
  fontSize: 15,
  fontWeight: '900',
  marginTop: 8,
},

coachText: {
  color: '#64748B',
  fontSize: 12,
  fontWeight: '700',
  lineHeight: 17,
  marginTop: 4,
},

coachSummaryCard: {
  backgroundColor: '#EFF6FF',
  borderRadius: 24,
  padding: 15,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
},

coachSummaryIcon: {
  width: 48,
  height: 48,
  borderRadius: 18,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
},

coachSummaryTitle: {
  color: '#1E3A8A',
  fontSize: 15,
  fontWeight: '900',
},

coachSummaryText: {
  color: '#334155',
  fontSize: 12.5,
  fontWeight: '700',
  lineHeight: 18,
  marginTop: 3,
},

coachMiniText: {
  fontSize: 11,
  fontWeight: '900',
  marginTop: 6,
  color: '#2563EB',
},
});