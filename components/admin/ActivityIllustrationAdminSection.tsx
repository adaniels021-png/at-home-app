import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AdminIllustrationState,
  approveActivityIllustration,
  generateActivityIllustration,
  getActivityIllustrationPreview,
  getAdminIllustrationState,
  rejectActivityIllustration,
} from '../../lib/adminActivityIllustrations';

type Props = { activityId: string; eligible: boolean };

export function ActivityIllustrationAdminSection({ activityId, eligible }: Props) {
  const [state, setState] = useState<AdminIllustrationState | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(eligible);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    if (!eligible) return;
    try {
      setLoading(true);
      setState(await getAdminIllustrationState(activityId));
    } catch (error: any) {
      Alert.alert('Illustration Error', error?.message || 'Could not load illustration status.');
    } finally {
      setLoading(false);
    }
  }, [activityId, eligible]);

  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (action: () => Promise<unknown>) => {
    if (working) return;
    try {
      setWorking(true);
      await action();
      setPreviewUrl(null);
      await refresh();
    } catch (error: any) {
      Alert.alert('Illustration Action Failed', error?.message || 'Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const candidate = state?.candidate;
  const approved = state?.approved;
  const canGenerate = !candidate || candidate.status === 'failed';

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.icon}><Ionicons name="images-outline" size={18} color="#7C3AED" /></View>
        <View style={styles.headingText}>
          <Text style={styles.title}>Illustration</Text>
          <Text style={styles.helper}>Artwork is reviewed separately from activity content.</Text>
        </View>
        {(loading || working) && <ActivityIndicator color="#7C3AED" />}
      </View>

      {!eligible ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Approve this activity first</Text>
          <Text style={styles.helper}>Illustrations attach to the stable Activity Library record. Approval will not generate artwork automatically.</Text>
        </View>
      ) : null}

      {eligible && approved ? (
        <View style={styles.artBlock}>
          <Text style={styles.label}>Current approved illustration</Text>
          {approved.approved_public_url ? <Image source={{ uri: approved.approved_public_url }} style={styles.image} /> : null}
          <Text style={styles.meta}>Version {approved.version} · Family-visible</Text>
        </View>
      ) : null}

      {eligible && state?.artwork_may_be_outdated ? (
        <View style={styles.warning}>
          <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
          <View style={styles.warningText}>
            <Text style={styles.warningTitle}>Artwork may be outdated</Text>
            <Text style={styles.helper}>This activity changed after the current illustration was created. Keeping it makes no database change.</Text>
          </View>
        </View>
      ) : null}

      {eligible && !approved && !candidate && !loading ? (
        <Text style={styles.empty}>No illustration yet.</Text>
      ) : null}

      {eligible && candidate?.status === 'generating' ? (
        <View style={styles.notice}><Text style={styles.noticeTitle}>Creating illustration…</Text><Text style={styles.helper}>Duplicate generation is disabled. Current approved artwork remains live.</Text></View>
      ) : null}

      {eligible && candidate?.status === 'failed' ? (
        <View style={styles.error}><Text style={styles.errorTitle}>Illustration generation failed</Text><Text style={styles.helper}>{candidate.error_message || candidate.error_code || 'The provider response could not be safely processed.'}</Text></View>
      ) : null}

      {eligible && candidate?.status === 'draft' ? (
        <View style={styles.artBlock}>
          <Text style={styles.label}>{approved ? 'Replacement draft' : 'Draft ready for review'}</Text>
          {previewUrl ? <Image source={{ uri: previewUrl }} style={styles.image} /> : null}
          <View style={styles.actions}>
            <Action label="Private Preview" icon="eye-outline" disabled={working} onPress={() => run(async () => setPreviewUrl((await getActivityIllustrationPreview(candidate.id)).signed_url))} />
            <Action label={approved ? 'Approve Replacement' : 'Approve'} icon="checkmark-circle-outline" disabled={working} onPress={() => run(() => approveActivityIllustration(candidate.id, approved?.id || null))} />
            <Action label="Reject" icon="close-circle-outline" destructive disabled={working} onPress={() => Alert.alert('Reject Illustration?', 'The activity and current approved artwork will remain unchanged.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reject', style: 'destructive', onPress: () => void run(() => rejectActivityIllustration(candidate.id)) }])} />
          </View>
        </View>
      ) : null}

      {eligible && canGenerate ? (
        <TouchableOpacity
          style={[styles.primary, working && styles.disabled]}
          disabled={working}
          onPress={() => void run(() => generateActivityIllustration(activityId, approved ? 'regenerate' : 'missing', approved?.id || null))}
        >
          <Ionicons name="sparkles-outline" size={17} color="#FFFFFF" />
          <Text style={styles.primaryText}>{candidate?.status === 'failed' ? 'Retry' : approved ? 'Generate New Illustration' : 'Generate Illustration'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Action({ label, icon, onPress, disabled, destructive = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled: boolean; destructive?: boolean }) {
  return <TouchableOpacity style={[styles.secondary, disabled && styles.disabled]} onPress={onPress} disabled={disabled}><Ionicons name={icon} size={16} color={destructive ? '#DC2626' : '#6D28D9'} /><Text style={[styles.secondaryText, destructive && styles.destructive]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#E9D5FF', gap: 14 },
  headingRow: { flexDirection: 'row', alignItems: 'center' },
  headingText: { flex: 1 },
  icon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  title: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  helper: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 2 },
  label: { color: '#312E81', fontWeight: '900', fontSize: 14 },
  meta: { color: '#64748B', fontWeight: '700', fontSize: 11 },
  empty: { color: '#64748B', fontWeight: '700' },
  notice: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 13 },
  noticeTitle: { color: '#334155', fontWeight: '900' },
  warning: { flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 16, padding: 13 },
  warningText: { flex: 1, marginLeft: 9 },
  warningTitle: { color: '#92400E', fontWeight: '900' },
  error: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 13 },
  errorTitle: { color: '#B91C1C', fontWeight: '900' },
  artBlock: { gap: 10 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 18, backgroundColor: '#F1F5F9' },
  actions: { gap: 8 },
  primary: { minHeight: 46, borderRadius: 15, backgroundColor: '#7C3AED', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  secondary: { minHeight: 42, borderRadius: 13, borderWidth: 1, borderColor: '#DDD6FE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryText: { color: '#6D28D9', fontWeight: '900', fontSize: 13 },
  destructive: { color: '#DC2626' },
  disabled: { opacity: 0.55 },
});
