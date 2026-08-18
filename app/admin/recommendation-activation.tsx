import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  loadActivationConfig,
  setAdminActivationControl,
  type AdminActivationAction,
  type RecommendationActivationConfig,
} from '../../lib/personalization/recommendation/activationControl';

type ControlAction = AdminActivationAction & {
  title: string;
  confirmation: string;
  reason: string;
  emergency?: boolean;
};

const ACTIONS: ControlAction[] = [
  {
    mode: 'CONTROLLED_V2',
    cohortPercentage: 25,
    title: 'Activate Controlled V2 — 25%',
    confirmation: 'Eligible in-cohort Trial and Pro users may receive V2 Daily Lesson recommendations. Free, Unknown, and out-of-cohort users remain on Legacy.',
    reason: 'Owner-authorized Phase 4P controlled V2 activation at 25%',
  },
  {
    mode: 'LEGACY',
    cohortPercentage: 0,
    title: 'Return to Legacy',
    confirmation: 'Return all recommendation routing to the normal Legacy baseline with a 0% controlled cohort?',
    reason: 'Owner-requested return to normal Legacy routing baseline',
  },
  {
    mode: 'EMERGENCY_LEGACY',
    cohortPercentage: 0,
    title: 'Emergency Legacy',
    confirmation: 'Immediately enable the server-authoritative emergency Legacy rollback and set the controlled cohort to 0%?',
    reason: 'Owner-initiated emergency Legacy rollback',
    emergency: true,
  },
];

export default function RecommendationActivationScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<RecommendationActivationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const value = await loadActivationConfig();
      if (value.source !== 'server') throw new Error('Authoritative activation configuration is unavailable.');
      setConfig(value);
    } catch (error) {
      setConfig(null);
      Alert.alert('Unable to load activation state', message(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const confirm = (action: ControlAction) => {
    Alert.alert(action.title, action.confirmation, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action.emergency ? 'Enable Emergency Legacy' : 'Confirm',
        style: action.emergency ? 'destructive' : 'default',
        onPress: async () => {
          setBusy(true);
          try {
            await setAdminActivationControl(action, action.reason);
            await refresh();
            Alert.alert('Authoritative state updated', `${action.mode} / ${action.cohortPercentage}% is now confirmed by the server.`);
          } catch (error) {
            await refresh();
            Alert.alert('Activation change rejected', message(error));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} disabled={busy}>
            <Ionicons name="arrow-back" size={24} color="#29145F" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Recommendation Activation</Text>
            <Text style={styles.subtitle}>Authoritative production routing control</Text>
          </View>
        </View>

        <View style={styles.stateCard}>
          <Text style={styles.sectionTitle}>Current server configuration</Text>
          {loading || !config ? <ActivityIndicator color="#7C3AED" /> : <>
            <State label="Activation Mode" value={config.mode} />
            <State label="Controlled Cohort" value={`${config.controlledCohortPercentage}%`} />
            <State label="Algorithm Version" value={config.algorithmVersion} />
            <State label="Emergency Kill Switch" value={config.emergencyKillSwitch ? 'ON' : 'OFF'} danger={config.emergencyKillSwitch} />
            <State label="Config Version" value={String(config.configVersion)} />
          </>}
          <TouchableOpacity style={styles.refresh} onPress={() => void refresh()} disabled={busy || loading}>
            <Ionicons name="refresh-outline" size={17} color="#6D28D9" />
            <Text style={styles.refreshText}>Refresh authoritative state</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.notice}>Every action requires confirmation and is revalidated by the server using your signed-in administrator identity.</Text>

        {ACTIONS.map(action => {
          const active = config?.mode === action.mode && config.controlledCohortPercentage === action.cohortPercentage;
          return <TouchableOpacity
            key={action.mode}
            style={[styles.action, action.emergency && styles.emergency, (busy || loading || !config || active) && styles.disabled]}
            disabled={busy || loading || !config || active}
            onPress={() => confirm(action)}
          >
            <Ionicons name={action.emergency ? 'warning-outline' : action.mode === 'LEGACY' ? 'return-down-back-outline' : 'git-branch-outline'} size={21} color="#FFFFFF" />
            <Text style={styles.actionText}>{active ? `${action.title} — Current` : action.title}</Text>
          </TouchableOpacity>;
        })}
        {busy && <ActivityIndicator style={styles.busy} color="#7C3AED" />}
      </ScrollView>
    </SafeAreaView>
  );
}

function State({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={[styles.value, danger && styles.dangerText]}>{value}</Text></View>;
}

function message(error: unknown) { return error instanceof Error ? error.message : 'Unknown error'; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F1' },
  content: { padding: 20, paddingBottom: 80 },
  header: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 18 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: '#29145F' },
  subtitle: { color: '#64748B', fontWeight: '600', marginTop: 2 },
  stateCard: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#EDE9FE', padding: 16 },
  sectionTitle: { color: '#4C1D95', fontSize: 17, fontWeight: '900', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  label: { color: '#64748B', fontWeight: '700' },
  value: { color: '#1E293B', fontWeight: '900', textAlign: 'right', flexShrink: 1 },
  dangerText: { color: '#B91C1C' },
  refresh: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 14 },
  refreshText: { color: '#6D28D9', fontWeight: '900' },
  notice: { color: '#475569', fontWeight: '600', lineHeight: 20, marginVertical: 16 },
  action: { backgroundColor: '#6D28D9', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  emergency: { backgroundColor: '#B91C1C', marginTop: 8 },
  disabled: { opacity: 0.4 },
  actionText: { color: '#FFFFFF', fontWeight: '900' },
  busy: { marginTop: 10 },
});
