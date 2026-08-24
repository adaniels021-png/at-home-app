import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccessSummary, PersonAvatar, RoleBadge, roleFriendlyName } from '../../../components/caregivers/CaregiverAccessUI';
import { canManageCaregivers, getRoleAccessSummary, hasChildPermission, type ChildPermission } from '../../../lib/caregiverPermissions';
import { useChild } from '../../../lib/SelectedChildContext';
import { supabase } from '../../../lib/supabase';

type Member = { id: string; caregiver_user_id: string; role: string; status: string };
type OverrideRow = { permission: ChildPermission; allowed: boolean };
const CONTROLS: { permission: ChildPermission; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { permission: 'view_learning_content', title: 'Lessons & Learning', description: 'Use lessons and everyday learning supports.', icon: 'book-outline' },
  { permission: 'use_communication_tools', title: 'Communication Tools', description: 'Use visual communication and PECS supports.', icon: 'chatbubbles-outline' },
  { permission: 'view_progress', title: 'View Progress', description: 'See progress and recent learning activity.', icon: 'stats-chart-outline' },
  { permission: 'edit_progress', title: 'Update Progress', description: 'Record supported learning progress.', icon: 'create-outline' },
  { permission: 'use_elopement_response', title: 'Emergency Response', description: 'Open elopement response tools when needed.', icon: 'navigate-outline' },
  { permission: 'view_emergency_response_data', title: 'Emergency Information', description: 'See information needed during an active response.', icon: 'medical-outline' },
  { permission: 'view_safety_profile', title: 'Expanded Safety Information', description: 'View the full Safety Profile outside emergencies.', icon: 'shield-outline' },
  { permission: 'edit_safety_profile', title: 'Edit Safety Profile', description: 'Change private safety and preparedness information.', icon: 'shield-checkmark-outline' },
];

export default function CaregiverAccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedChild } = useChild();
  const canManage = canManageCaregivers(selectedChild?.caregiver_access_role);
  const [member, setMember] = useState<Member | null>(null);
  const [displayName, setDisplayName] = useState('Support team member');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const childName = selectedChild?.child_name || selectedChild?.name || 'this child';

  const load = useCallback(async () => {
    if (!id || !selectedChild?.id || !canManage) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('child_caregivers').select('id, caregiver_user_id, role, status').eq('id', id).eq('child_id', selectedChild.id).single();
      if (error) throw error;
      const next = data as Member;
      setMember(next);
      const [{ data: profile }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', next.caregiver_user_id).maybeSingle(),
        supabase.from('child_caregiver_permission_overrides').select('permission, allowed').eq('child_id', selectedChild.id).eq('caregiver_user_id', next.caregiver_user_id),
      ]);
      setDisplayName(profile?.full_name || roleFriendlyName(next.role));
      setOverrides(Object.fromEntries(((rows || []) as OverrideRow[]).map((row) => [row.permission, row.allowed])));
    } catch (error: any) { Alert.alert('Unable to Load Access', error?.message || 'Please try again.'); }
    finally { setLoading(false); }
  }, [canManage, id, selectedChild?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const summary = useMemo(() => getRoleAccessSummary(member?.role), [member?.role]);

  const setPermission = async (permission: ChildPermission, allowed: boolean) => {
    if (!member || !selectedChild?.id || !canManage) return;
    setOverrides((current) => ({ ...current, [permission]: allowed }));
    const { error } = await supabase.from('child_caregiver_permission_overrides').upsert({ child_id: selectedChild.id, caregiver_user_id: member.caregiver_user_id, permission, allowed, granted_by: (await supabase.auth.getUser()).data.user?.id }, { onConflict: 'child_id,caregiver_user_id,permission' });
    if (error) { setOverrides((current) => ({ ...current, [permission]: !allowed })); Alert.alert('Update Failed', 'This permission could not be updated.'); }
  };

  const remove = () => member && Alert.alert(`Remove ${displayName}'s access to ${childName}?`, `${displayName} will no longer be able to view ${childName} or use ${childName}'s caregiver and emergency tools.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove Access', style: 'destructive', onPress: async () => { const { error } = await supabase.from('child_caregivers').delete().eq('id', member.id).eq('child_id', selectedChild?.id); if (error) Alert.alert('Remove Failed', error.message); else router.back(); } },
  ]);

  if (!canManage) return <SafeAreaView style={styles.center}><Ionicons name="lock-closed" size={30} color="#735A78" /><Text style={styles.stateTitle}>Owner access required</Text></SafeAreaView>;
  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color="#6B477C" /><Text style={styles.stateText}>Loading access…</Text></SafeAreaView>;
  if (!member) return <SafeAreaView style={styles.center}><Text style={styles.stateTitle}>This person no longer has access.</Text></SafeAreaView>;

  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color="#4B3A50" /></Pressable>
    <View style={styles.hero}><PersonAvatar name={displayName} size={66} /><View style={styles.heroText}><Text style={styles.name}>{displayName}</Text><Text style={styles.assignment}>Supporting {childName}</Text><RoleBadge role={member.role} /></View></View>
    <Text style={styles.sectionTitle}>Role access</Text><AccessSummary available={summary.available} restricted={summary.restricted} />
    <View style={styles.emergency}><Ionicons name="navigate" size={22} color="#724A61" /><Text style={styles.emergencyText}><Text style={styles.bold}>Emergency Response{`\n`}</Text>{displayName} can use emergency tools when enabled without being able to edit {`${childName}'s Safety Profile.`}</Text></View>
    <Text style={styles.sectionTitle}>Manage access</Text>
    <View style={styles.card}>{CONTROLS.map((control, index) => {
      const value = overrides[control.permission] ?? hasChildPermission(member.role, control.permission);
      return <View key={control.permission} style={[styles.permission, index < CONTROLS.length - 1 && styles.divider]}><View style={styles.permissionIcon}><Ionicons name={control.icon} size={19} color="#6B477C" /></View><View style={styles.permissionText}><Text style={styles.permissionTitle}>{control.title}</Text><Text style={styles.permissionDescription}>{control.description}</Text></View><Switch accessibilityLabel={`${control.title} access`} value={value} onValueChange={(next) => void setPermission(control.permission, next)} trackColor={{ false: '#D8D0D8', true: '#CDB7DD' }} thumbColor={value ? '#6B477C' : '#F8F4F0'} /></View>;
    })}</View>
    <View style={styles.locked}><Ionicons name="lock-closed" size={18} color="#716875" /><View><Text style={styles.permissionTitle}>Manage Caregivers</Text><Text style={styles.permissionDescription}>Owner only. This permission cannot be granted.</Text></View></View>
    <Pressable accessibilityRole="button" onPress={remove} style={styles.remove}><Text style={styles.removeText}>Remove Access</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F1E9' }, content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#F7F1E9', alignItems: 'center', justifyContent: 'center', padding: 24 }, stateTitle: { marginTop: 12, color: '#443848', fontSize: 18, fontWeight: '900', textAlign: 'center' }, stateText: { marginTop: 10, color: '#776D78', fontWeight: '700' },
  back: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFFDF9', alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1, borderColor: '#E8DED5' },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4E315A', borderRadius: 28, padding: 22 }, heroText: { flex: 1, marginLeft: 16, gap: 6 }, name: { color: '#FFF', fontSize: 23, fontWeight: '900' }, assignment: { color: '#EADFF0', fontSize: 14, fontWeight: '700' },
  sectionTitle: { marginTop: 24, marginBottom: 10, color: '#443848', fontSize: 16, fontWeight: '900' },
  emergency: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#F4E8E0', borderRadius: 20, padding: 16 }, emergencyText: { flex: 1, color: '#654F5B', lineHeight: 20, fontWeight: '600' }, bold: { fontWeight: '900', color: '#563949' },
  card: { backgroundColor: '#FFFDF9', borderRadius: 24, borderWidth: 1, borderColor: '#E8DED5', overflow: 'hidden' }, permission: { minHeight: 78, flexDirection: 'row', alignItems: 'center', padding: 14 }, divider: { borderBottomWidth: 1, borderBottomColor: '#EFE7E0' }, permissionIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#F1E8F4', alignItems: 'center', justifyContent: 'center' }, permissionText: { flex: 1, marginHorizontal: 12 }, permissionTitle: { color: '#473C49', fontSize: 14, fontWeight: '900' }, permissionDescription: { marginTop: 3, color: '#776D78', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  locked: { marginTop: 12, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EEE9E5', borderRadius: 20, padding: 15 },
  remove: { minHeight: 50, marginTop: 28, borderRadius: 18, backgroundColor: '#FFF5F3', borderWidth: 1, borderColor: '#E9BDB6', alignItems: 'center', justifyContent: 'center' }, removeText: { color: '#A4433B', fontWeight: '900' },
});
