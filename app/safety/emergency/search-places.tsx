import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChild } from '../../../lib/SelectedChildContext';
import { loadActiveElopementIncident, loadSearchChecks, setSearchCheck, subscribeToIncident, type SafetySearchCheck } from '../../../lib/safety/incidentData';
import { loadSafetyProfile } from '../../../lib/safety/profileData';
import { labelsFor, SAFETY_CONCERNS, WANDERING_DESTINATIONS } from '../../../lib/safety/profileConfig';
import { getSafetyAccess } from '../../../lib/safety/safetyAccess';
import type { SafetyProfile } from '../../../lib/safety/types';
import { ELOPEMENT_COLORS as C } from '../../../lib/safety/elopementTheme';
import { returnToActiveSearch } from '../../../lib/safety/elopementNavigation';

type ChildDetails = { id: string; child_name?: string; name?: string; first_name?: string };
const HIGH_RISK = new Set(['water', 'traffic', 'danger-awareness']);

export default function SearchPlacesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter(); const { selectedChild } = useChild(); const child = selectedChild as ChildDetails | null;
  const [profile, setProfile] = useState<SafetyProfile | null>(null); const [incidentId, setIncidentId] = useState<string | null>(null);
  const [incidentChildId, setIncidentChildId] = useState<string | null>(null);
  const [checks, setChecks] = useState<SafetySearchCheck[]>([]); const [loading, setLoading] = useState(true); const [canParticipate, setCanParticipate] = useState(false);
  const childName = profile?.preferredName || child?.child_name || child?.name || child?.first_name || 'your child';
  const goBack = useCallback(() => returnToActiveSearch(router), [router]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
    return () => subscription.remove();
  }, [goBack]));

  const refresh = useCallback(async () => { if (!child?.id) return; const incident = await loadActiveElopementIncident(child.id); setIncidentId(incident?.id ?? null); setIncidentChildId(incident?.childId ?? null); setChecks(incident ? await loadSearchChecks(incident.id) : []); }, [child?.id]);
  useEffect(() => { let active = true; void (async () => { if (!child?.id) { setLoading(false); return; } try { const [saved, access] = await Promise.all([loadSafetyProfile(child.id), getSafetyAccess(child.id)]); if (active) { setProfile(saved); setCanParticipate(access.canParticipateInSafetyIncident); await refresh(); } } catch { if (active) Alert.alert('Couldn’t Load Search Places', 'Please try again.'); } finally { if (active) setLoading(false); } })(); return () => { active = false; }; }, [child?.id, refresh]);
  useEffect(() => incidentId && incidentChildId === child?.id ? subscribeToIncident(incidentId, () => { void refresh().then(() => AccessibilityInfo.announceForAccessibility('Shared search progress updated.')); }) : undefined, [child?.id, incidentChildId, incidentId, refresh]);

  const destinations = useMemo(() => {
    const base = (profile?.wandering?.destinations ?? []).map((id) => ({ key: id, label: labelsFor([id], WANDERING_DESTINATIONS)[0] || id }));
    if (profile?.wandering?.destinationsOther) base.push({ key: 'other-detail', label: profile.wandering.destinationsOther });
    return base;
  }, [profile]);
  const risks = (profile?.wandering?.safetyConcerns ?? []).filter((id) => HIGH_RISK.has(id));

  const toggle = async (key: string, label: string) => { if (!incidentId) return; const checked = checks.some((item) => item.placeKey === key); try { await setSearchCheck(incidentId, key, label, !checked); await refresh(); } catch { Alert.alert('We couldn’t update this right now.', 'Please try again.'); } };
  if (loading) return <State loading message="Loading search places…" />;
  if (!incidentId || !canParticipate) return <State message="An active incident and participant permission are required." />;

  return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false, gestureEnabled: false }} /><Pressable accessibilityRole="button" accessibilityLabel="Back to active search" hitSlop={14} onPress={goBack} style={[styles.back, touchStyles.backTouchable, { top: insets.top + 8 }]}><Ionicons name="chevron-back" size={24} color="#FFF" accessible={false} pointerEvents="none" /></Pressable><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Search Places</Text><Text style={styles.subtitle}>Use {childName}’s preparedness profile to organize the search. The app does not know their current location.</Text>
    {risks.length ? <View style={styles.priority}><Text style={styles.eyebrow}>HIGH PRIORITY</Text>{risks.map((id) => <Text key={id} style={styles.priorityText}>{labelsFor([id], SAFETY_CONCERNS)[0]}</Text>)}</View> : null}
    <Text style={styles.section}>LIKELY PLACES</Text>
    {destinations.length ? destinations.map((item) => { const checked = checks.some((check) => check.placeKey === item.key); return <Pressable key={item.key} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${item.label}, ${checked ? 'checked' : 'not checked'}`} onPress={() => void toggle(item.key, item.label)} style={[styles.place, checked && styles.placeChecked]}><View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked ? <Ionicons name="checkmark" size={16} color="#211D28" /> : null}</View><Text style={styles.placeText}>{item.label}</Text><Text style={styles.status}>{checked ? 'Checked' : 'Mark checked'}</Text></Pressable>; }) : <Text style={styles.empty}>No likely destinations have been added to the permanent Safety Profile yet.</Text>}
  </ScrollView></SafeAreaView>;
}
function State({ message, loading }: { message: string; loading?: boolean }) { return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false }} /><View style={styles.state}>{loading ? <ActivityIndicator color="#D8CBF2" /> : null}<Text style={styles.subtitle}>{message}</Text></View></SafeAreaView>; }
const touchStyles = StyleSheet.create({ backTouchable: { zIndex: 100, elevation: 20 } });
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: C.background }, back: { position: 'absolute', zIndex: 2, top: 14, left: 18, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, content: { paddingHorizontal: 20, paddingTop: 84, paddingBottom: 80 }, title: { color: C.text, fontSize: 31, lineHeight: 38, fontWeight: '900' }, subtitle: { marginTop: 10, color: C.textMuted, fontSize: 15, lineHeight: 23, fontWeight: '600' }, priority: { marginTop: 22, padding: 18, borderRadius: 22, backgroundColor: C.coralSoft, borderWidth: 1, borderColor: C.coralBorder }, eyebrow: { color: C.coral, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, priorityText: { marginTop: 9, color: C.text, fontSize: 16, fontWeight: '800' }, section: { marginTop: 26, marginBottom: 10, color: C.textSubtle, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, place: { minHeight: 64, marginBottom: 10, paddingHorizontal: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, placeChecked: { backgroundColor: C.lavenderSoft, borderColor: C.lavender }, checkbox: { width: 25, height: 25, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.textSubtle }, checkboxChecked: { backgroundColor: C.lavender, borderColor: C.lavender }, placeText: { flex: 1, marginLeft: 12, color: C.text, fontSize: 15, lineHeight: 21, fontWeight: '800' }, status: { color: C.textMuted, fontSize: 12, fontWeight: '700' }, empty: { padding: 18, borderRadius: 20, color: C.textMuted, fontSize: 15, lineHeight: 22, backgroundColor: C.surface }, state: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' } });
