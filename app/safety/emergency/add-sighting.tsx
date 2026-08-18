import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChild } from '../../../lib/SelectedChildContext';
import { addSighting, loadActiveElopementIncident, parseApproximateLocalTime } from '../../../lib/safety/incidentData';
import { getSafetyAccess } from '../../../lib/safety/safetyAccess';
import { ELOPEMENT_COLORS as C } from '../../../lib/safety/elopementTheme';
import { returnToActiveSearch } from '../../../lib/safety/elopementNavigation';

type ChildDetails = { id: string };
export default function AddSightingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter(); const { selectedChild } = useChild(); const child = selectedChild as ChildDetails | null;
  const [incidentId, setIncidentId] = useState<string | null>(null); const [allowed, setAllowed] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [place, setPlace] = useState(''); const [notes, setNotes] = useState(''); const [timeText, setTimeText] = useState(''); const [minutesAgo, setMinutesAgo] = useState(0);
  const hasDraft = Boolean(place.trim() || notes.trim() || timeText.trim() || minutesAgo !== 0);
  const discardOrReturn = useCallback(() => {
    if (!hasDraft) { returnToActiveSearch(router); return; }
    Alert.alert('Discard this sighting?', "This sighting hasn't been shared yet.", [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => returnToActiveSearch(router) },
    ]);
  }, [hasDraft, router]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { discardOrReturn(); return true; });
    return () => subscription.remove();
  }, [discardOrReturn]));
  useEffect(() => { let active = true; void (async () => { if (!child?.id) { setLoading(false); return; } try { const [incident, access] = await Promise.all([loadActiveElopementIncident(child.id), getSafetyAccess(child.id)]); if (active) { setIncidentId(incident?.id ?? null); setAllowed(access.canParticipateInSafetyIncident); } } catch { if (active) Alert.alert('Couldn’t Load Incident', 'Please try again.'); } finally { if (active) setLoading(false); } })(); return () => { active = false; }; }, [child?.id]);
  const submit = async () => { if (!incidentId || !place.trim()) return; const sightingTime = timeText.trim() ? parseApproximateLocalTime(timeText) : new Date(Date.now() - minutesAgo * 60_000).toISOString(); if (!sightingTime) { Alert.alert('Check the time', 'Enter an approximate time like 2:35.'); return; } setSaving(true); try { await addSighting(incidentId, { placeLabel: place.trim(), sightingTime, notes }); returnToActiveSearch(router); } catch { Alert.alert('We couldn’t update this right now.', 'Your sighting is still here and was not shared. Please try again.'); } finally { setSaving(false); } };
  if (loading || !incidentId || !allowed) return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false }} /><View style={styles.state}>{loading ? <ActivityIndicator color="#D8CBF2" /> : <Text style={styles.subtitle}>An active incident and participant permission are required.</Text>}</View></SafeAreaView>;
  return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false, gestureEnabled: !hasDraft }} /><Pressable accessibilityRole="button" accessibilityLabel="Back to active search" hitSlop={14} onPress={discardOrReturn} style={[styles.back, touchStyles.backTouchable, { top: insets.top + 8 }]}><Ionicons name="chevron-back" size={24} color="#FFF" accessible={false} pointerEvents="none" /></Pressable><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Add a reported sighting</Text><Text style={styles.label}>Where?</Text><TextInput accessibilityLabel="Sighting place" value={place} onChangeText={setPlace} maxLength={200} placeholder="Near the community playground" placeholderTextColor="#817C86" style={styles.input} />
    <Text style={styles.label}>When?</Text><View accessibilityRole="radiogroup" style={styles.timeChoices}>{[0, 5, 10, 15].map((minutes) => <Pressable key={minutes} accessibilityRole="radio" accessibilityState={{ selected: minutesAgo === minutes && !timeText }} onPress={() => { setMinutesAgo(minutes); setTimeText(''); }} style={[styles.timeChoice, minutesAgo === minutes && !timeText && styles.timeChoiceSelected]}><Text style={styles.timeChoiceText}>{minutes === 0 ? 'Just now' : `${minutes} min ago`}</Text></Pressable>)}</View><Text style={styles.helper}>Or enter an approximate earlier time.</Text><TextInput accessibilityLabel="Approximate sighting time" value={timeText} onChangeText={setTimeText} keyboardType="numbers-and-punctuation" placeholder="For example 2:35" placeholderTextColor="#817C86" style={styles.input} />
    <Text style={styles.label}>Anything else?</Text><TextInput accessibilityLabel="Optional sighting notes" value={notes} onChangeText={setNotes} maxLength={300} multiline placeholder="Optional details" placeholderTextColor="#817C86" style={[styles.input, styles.notes]} />
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !place.trim() || saving }} disabled={!place.trim() || saving} onPress={() => void submit()} style={[styles.primary, (!place.trim() || saving) && styles.disabled]}>{saving ? <ActivityIndicator color="#211D28" /> : <Text style={styles.primaryText}>Add Sighting</Text>}</Pressable>
  </ScrollView></SafeAreaView>;
}
const touchStyles = StyleSheet.create({ backTouchable: { zIndex: 100, elevation: 20 } });
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: C.background }, back: { position: 'absolute', zIndex: 2, top: 14, left: 18, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, content: { paddingHorizontal: 22, paddingTop: 88, paddingBottom: 80 }, title: { color: C.text, fontSize: 30, lineHeight: 38, fontWeight: '900' }, label: { marginTop: 24, color: C.text, fontSize: 17, fontWeight: '900' }, helper: { marginTop: 8, color: C.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' }, input: { minHeight: 58, marginTop: 10, paddingHorizontal: 16, borderRadius: 20, color: C.lightText, fontSize: 16, backgroundColor: C.lightSurface }, notes: { minHeight: 110, paddingTop: 15, textAlignVertical: 'top' }, timeChoices: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, timeChoice: { minHeight: 44, paddingHorizontal: 13, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, timeChoiceSelected: { backgroundColor: C.lavenderSoft, borderColor: C.lavender }, timeChoiceText: { color: C.text, fontSize: 13, fontWeight: '800' }, primary: { minHeight: 60, marginTop: 28, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lightSurface }, primaryText: { color: C.lightText, fontSize: 16, fontWeight: '900' }, disabled: { opacity: 0.45 }, state: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }, subtitle: { color: C.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center' } });
