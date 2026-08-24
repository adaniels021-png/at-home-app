import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChild } from '../../../lib/SelectedChildContext';
import { createSafetyPhotoSignedUrl, loadEmergencySafetyProfile, loadSafetyProfile } from '../../../lib/safety/profileData';
import { getSafetyAccess } from '../../../lib/safety/safetyAccess';
import { loadActiveElopementIncident, loadSafetyIncident, loadSightings, parseApproximateLocalTime, resolveSafetyIncident, startOrJoinElopementIncident, subscribeToIncident, updateSafetyIncident, type SafetyIncident, type SafetySighting } from '../../../lib/safety/incidentData';
import type { SafetyProfile } from '../../../lib/safety/types';
import { ELOPEMENT_COLORS as C } from '../../../lib/safety/elopementTheme';
import { markProfileReturnToSearch } from '../../../lib/safety/elopementNavigation';
import { createAndShareEmergencyPdf } from '../../../lib/safety/pdf/emergencyPdf';

type Stage = 'entry' | 'clothing' | 'location' | 'time' | 'search' | 'resolved';
type SnapshotMode = 'setup' | 'edit';
type ChildDetails = { id: string; child_name?: string; name?: string; first_name?: string; age?: number | string; child_age?: number | string };

const formatClock = (value: string) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const elapsed = (from: string, now: number) => {
  const seconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
};

export default function ElopementSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ screen?: string; origin?: string }>();
  const { selectedChild } = useChild();
  const child = selectedChild as ChildDetails | null;
  const [incident, setIncident] = useState<SafetyIncident | null>(null);
  const [profile, setProfile] = useState<SafetyProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sightings, setSightings] = useState<SafetySighting[]>([]);
  const [stage, setStage] = useState<Stage>('entry');
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode>('setup');
  const [canParticipate, setCanParticipate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [clothing, setClothing] = useState('');
  const [place, setPlace] = useState('');
  const [timeText, setTimeText] = useState('');
  const [now, setNow] = useState(Date.now());
  const childName = profile?.preferredName || child?.child_name || child?.name || child?.first_name || 'Your child';

  const refresh = useCallback(async () => {
    if (!child?.id) return;
    const current = await loadActiveElopementIncident(child.id);
    setIncident(current);
    if (current) {
      setClothing(current.currentClothing ?? '');
      setPlace(current.lastSeenPlaceLabel ?? '');
      setSightings(await loadSightings(current.id));
      if (current.status === 'resolved') setStage('resolved');
    }
  }, [child?.id]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!child?.id) { setLoading(false); return; }
      try {
        const access = await getSafetyAccess(child.id);
        const [savedProfile, current] = await Promise.all([
          access.canViewSafetyProfile
            ? loadSafetyProfile(child.id)
            : access.canViewEmergencyResponseData
              ? loadEmergencySafetyProfile(child.id)
              : Promise.resolve(null),
          access.canParticipateInSafetyIncident ? loadActiveElopementIncident(child.id) : Promise.resolve(null),
        ]);
        const signed = access.canViewSafetyProfile || access.canViewEmergencyResponseData
          ? await createSafetyPhotoSignedUrl(savedProfile?.photoPath)
          : null;
        if (!active) return;
        setCanParticipate(access.canParticipateInSafetyIncident);
        setProfile(savedProfile); setPhotoUrl(signed); setIncident(current);
        if (current) { setClothing(current.currentClothing ?? ''); setPlace(current.lastSeenPlaceLabel ?? ''); if (params.screen === 'search') setStage('search'); }
      } catch { if (active) Alert.alert('Safety Mode Unavailable', 'We couldn’t load this right now. Please try again.'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [child?.id, params.screen]);

  useFocusEffect(useCallback(() => {
    if (incident?.status === 'active' && params.screen === 'search') setStage('search');
  }, [incident?.status, params.screen]));

  useEffect(() => {
    if (!incident?.id || incident.childId !== child?.id || incident.status !== 'active' || stage === 'resolved') return;
    return subscribeToIncident(incident.id, () => {
      void loadSafetyIncident(incident.id).then(async (updated) => {
        if (updated?.status === 'resolved') { setIncident(updated); setStage('resolved'); AccessibilityInfo.announceForAccessibility(`${childName} is safe.`); return; }
        await refresh();
        AccessibilityInfo.announceForAccessibility('Shared Safety incident updated.');
      });
    });
  }, [child?.id, childName, incident?.childId, incident?.id, incident?.status, refresh, stage]);

  useEffect(() => {
    if (stage !== 'search') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [stage]);

  const handleBack = useCallback(() => {
    if (stage === 'resolved') { router.replace('/safety'); return; }
    if (stage === 'clothing') { setStage(snapshotMode === 'edit' ? 'search' : 'entry'); return; }
    if (stage === 'location') { setStage('clothing'); return; }
    if (stage === 'time') { setStage('location'); return; }
    if (stage === 'search') { router.replace('/safety'); return; }
    router.replace(params.origin === 'help-now' ? '/help-now' : '/safety');
  }, [params.origin, router, snapshotMode, stage]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { handleBack(); return true; });
    return () => subscription.remove();
  }, [handleBack]));

  const begin = async () => {
    if (!child?.id) return;
    setWorking(true);
    try { const next = await startOrJoinElopementIncident(child.id); setIncident(next); setSnapshotMode('setup'); setStage(next.currentClothing || next.lastSeenTime || next.lastSeenPlaceLabel ? 'search' : 'clothing'); }
    catch { Alert.alert('Couldn’t Start Safety Mode', 'Please check your connection and try again.'); }
    finally { setWorking(false); }
  };

  const save = async (values: Parameters<typeof updateSafetyIncident>[1], next: Stage) => {
    if (!incident) return;
    setWorking(true);
    try { setIncident(await updateSafetyIncident(incident.id, values)); setStage(next); }
    catch { Alert.alert('We couldn’t update this right now.', 'Your information is still here. Please try again.'); }
    finally { setWorking(false); }
  };

  const saveTime = () => {
    const selected = parseApproximateLocalTime(timeText);
    if (!selected) { Alert.alert('Check the time', 'Enter an approximate time like 2:35.'); return; }
    void save({ lastSeenTime: selected }, 'search');
  };

  const confirmFound = () => Alert.alert(`Mark ${childName} as safe?`, 'This will end the active elopement Safety incident for everyone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: `${childName} is safe`, onPress: () => { if (!incident) return; setWorking(true); void resolveSafetyIncident(incident.id).then(() => { setStage('resolved'); AccessibilityInfo.announceForAccessibility(`${childName} is safe.`); }).catch(() => Alert.alert('We couldn’t update this right now.', 'Please try again.')).finally(() => setWorking(false)); } },
  ]);

  const shareEmergencyInfo = async () => {
    if (!child?.id || preparingPdf) return;
    setPreparingPdf(true);
    AccessibilityInfo.announceForAccessibility('Preparing emergency profile.');
    try {
      const result = await createAndShareEmergencyPdf(child.id, { includeActiveIncident: true });
      if (!result.shared) Alert.alert('Sharing isn’t available', 'The emergency profile was prepared, but sharing is not currently available on this device.');
    } catch {
      const message = 'We couldn’t prepare the emergency profile right now. Please try again.';
      AccessibilityInfo.announceForAccessibility(message);
      Alert.alert('Emergency Profile Unavailable', message);
    } finally {
      setPreparingPdf(false);
    }
  };

  if (loading) return <State loading message="Loading Elopement Safety…" />;
  if (!child?.id) return <State message="Choose a child before starting Safety Mode." />;
  if (!canParticipate) return <State message="You don’t currently have permission to participate in this Safety incident." />;
  if (stage === 'resolved') return <Resolved childName={childName} onBack={handleBack} onRecovery={() => router.replace('/safety/recovery')} onHome={() => router.replace('/')} />;

  if (stage === 'entry') return (
    <Shell onBack={handleBack} gestureEnabled>
      <View style={styles.centerContent}><View style={styles.shield}><Ionicons name="shield-checkmark-outline" size={34} color="#D8CBF2" /></View>
        <Text accessibilityRole="header" style={styles.title}>Elopement Safety</Text>
        {incident ? <><Text style={styles.subtitle}>An active Safety incident is already open for {childName}.</Text><Primary label="Open Active Search" busy={working} onPress={() => { setStage('search'); void refresh(); }} /></>
          : <><Text style={styles.subtitle}>We’ll help you quickly record the information needed for this safety incident.</Text><Primary label="Start Elopement Safety" busy={working} onPress={() => void begin()} /></>}
      </View>
    </Shell>
  );

  if (stage === 'clothing') return <Snapshot title={`What is ${childName} wearing right now?`} support="Add whatever you remember. You can update this later." onBack={handleBack}>
    <TextInput accessibilityLabel="Current clothing" value={clothing} onChangeText={setClothing} maxLength={300} multiline placeholder="Blue dinosaur shirt, gray shorts, red shoes" placeholderTextColor="#817C86" style={styles.input} />
    <Primary label="Continue →" busy={working} onPress={() => void save({ currentClothing: clothing.trim() || null }, 'location')} />
  </Snapshot>;

  if (stage === 'location') return <Snapshot title={`Where was ${childName} last seen?`} support="Add a short place description, or skip it for now." onBack={handleBack}>
    <TextInput accessibilityLabel="Last seen place" value={place} onChangeText={setPlace} maxLength={200} placeholder="Community park" placeholderTextColor="#817C86" style={styles.singleInput} />
    <Primary label="Enter this place →" busy={working} disabled={!place.trim()} onPress={() => void save({ lastSeenPlaceLabel: place.trim() }, 'time')} />
    <Secondary label="Skip for now" onPress={() => { setPlace(''); void save({ lastSeenPlaceLabel: null, lastSeenLatitude: null, lastSeenLongitude: null }, 'time'); }} />
  </Snapshot>;

  if (stage === 'time') return <Snapshot title={`When was ${childName} last seen?`} support={`Just now: ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`} onBack={handleBack}>
    <Primary label="Just now →" busy={working} onPress={() => void save({ lastSeenTime: new Date().toISOString() }, 'search')} />
    <TextInput accessibilityLabel="Approximate earlier time" value={timeText} onChangeText={setTimeText} keyboardType="numbers-and-punctuation" placeholder="Earlier time, for example 2:35" placeholderTextColor="#817C86" style={styles.singleInput} />
    <Secondary label="Use this earlier time" disabled={!timeText.trim()} onPress={saveTime} />
    <Secondary label="Skip for now" onPress={() => setStage('search')} />
  </Snapshot>;

  const timerFrom = incident?.lastSeenTime || incident?.startedAt || new Date().toISOString();
  const physical = [profile?.physicalDescription?.height, profile?.physicalDescription?.hair && `${profile.physicalDescription.hair} hair`, profile?.physicalDescription?.eyes && `${profile.physicalDescription.eyes} eyes`].filter(Boolean).join(' • ');
  const openProfile = () => { markProfileReturnToSearch(); router.push('/safety/profile/preview'); };
  return <Shell onBack={handleBack} scroll gestureEnabled>
    <Text style={styles.activeLabel}>ACTIVE SEARCH</Text><Text accessibilityRole="header" style={styles.searchTitle}>{childName} is missing</Text>
    <Text accessibilityLabel="Missing duration" style={styles.timer}>Missing for {elapsed(timerFrom, now)}</Text>
    <View style={styles.identityStrip}>{photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Ionicons name="person" size={28} color="#CFC6DD" /></View>}<View style={styles.identityCopy}><Text style={styles.identityName}>{childName}</Text><Text style={styles.identityMeta}>{child?.age || child?.child_age ? `Age ${child.age || child.child_age}` : 'Age not added'}{physical ? ` • ${physical}` : ''}</Text><Pressable accessibilityRole="button" onPress={openProfile}><Text style={styles.link}>View Safety Profile →</Text></Pressable></View></View>
    <View style={styles.summaryCard}><Summary label="LAST SEEN" value={incident?.lastSeenPlaceLabel || 'Not added yet'} detail={incident?.lastSeenTime ? formatClock(incident.lastSeenTime) : 'Using incident start time'} onEdit={() => { setSnapshotMode('edit'); setStage('location'); }} /><View style={styles.divider} /><Summary label="WEARING" value={incident?.currentClothing || 'Not added yet'} onEdit={() => { setSnapshotMode('edit'); setStage('clothing'); }} /></View>
    <Text style={styles.sectionLabel}>SEARCH ACTIONS</Text>
    <View style={styles.actionGrid}><Action icon="create-outline" label="Edit Incident Info" onPress={() => { setSnapshotMode('edit'); setStage('clothing'); }} /><Action icon="eye-outline" label="Add Sighting" onPress={() => router.push('/safety/emergency/add-sighting')} /><Action icon="search-outline" label="Search Places" onPress={() => router.push('/safety/emergency/search-places')} /><Action icon="document-text-outline" label="View Safety Profile" onPress={openProfile} /></View>
    <View style={styles.supportActions}><SupportAction icon="call-outline" label="Emergency Contacts" onPress={() => router.push('/safety/emergency/contacts')} /><SupportAction icon="location-outline" label="Location Support" onPress={() => router.push('/safety/emergency/location-tools')} /></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Share emergency info" accessibilityState={{ busy: preparingPdf, disabled: preparingPdf }} disabled={preparingPdf} onPress={() => void shareEmergencyInfo()} style={[styles.shareAction, preparingPdf && styles.disabled]}>{preparingPdf ? <ActivityIndicator color={C.text} /> : <Ionicons name="share-outline" size={24} color={C.lavender} accessible={false} />}<Text style={styles.shareActionText}>{preparingPdf ? 'Preparing emergency profile…' : 'Share Emergency Info'}</Text></Pressable>
    <Text style={styles.sectionLabel}>SEARCH TIMELINE</Text>
    <View style={styles.timeline}><Timeline time={formatClock(incident?.lastSeenTime || incident?.startedAt || timerFrom)} text={`Last seen${incident?.lastSeenPlaceLabel ? ` at ${incident.lastSeenPlaceLabel}` : ''}`} />{sightings.map((item, index) => <Timeline key={item.id} time={formatClock(item.sightingTime)} text={`Reported sighting at ${item.placeLabel}`} latest={index === sightings.length - 1} />)}</View>
    <Pressable accessibilityRole="button" disabled={working} onPress={confirmFound} style={styles.foundButton}><Text style={styles.foundText}>Child Found</Text></Pressable>
  </Shell>;
}

function Shell({ children, onBack, scroll, gestureEnabled = false }: { children: React.ReactNode; onBack: () => void; scroll?: boolean; gestureEnabled?: boolean }) { const insets = useSafeAreaInsets(); const body = scroll ? <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView> : <View style={styles.flex}>{children}</View>; return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false, gestureEnabled }} />{scroll ? <View pointerEvents="none" style={[styles.headerMask, { height: insets.top + 70 }]} /> : null}<Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={14} onPress={onBack} style={[styles.back, { top: insets.top + 8 }]}><Ionicons name="chevron-back" size={24} color="#F5F1F7" accessible={false} pointerEvents="none" /></Pressable>{body}</SafeAreaView>; }
function Snapshot({ title, support, onBack, children }: { title: string; support: string; onBack: () => void; children: React.ReactNode }) { return <Shell onBack={onBack}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.snapshot}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.subtitle}>{support}</Text>{children}</ScrollView></Shell>; }
function Primary({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress} style={[styles.primary, (disabled || busy) && styles.disabled]}>{busy ? <ActivityIndicator color="#211D28" /> : <Text style={styles.primaryText}>{label}</Text>}</Pressable>; }
function Secondary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.secondary, disabled && styles.disabled]}><Text style={styles.secondaryText}>{label}</Text></Pressable>; }
function Summary({ label, value, detail, onEdit }: { label: string; value: string; detail?: string; onEdit: () => void }) { return <View><View style={styles.summaryHeader}><Text style={styles.summaryLabel}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${label.toLowerCase()}`} onPress={onEdit}><Text style={styles.link}>Edit</Text></Pressable></View><Text style={styles.summaryValue}>{value}</Text>{detail ? <Text style={styles.summaryDetail}>{detail}</Text> : null}</View>; }
function Action({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}><Ionicons name={icon} size={24} color="#D9CDEF" /><Text style={styles.actionText}>{label}</Text></Pressable>; }
function SupportAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.supportAction}><Ionicons name={icon} size={20} color={C.lavender} accessible={false} /><Text style={styles.supportActionText}>{label}</Text><Ionicons name="chevron-forward" size={18} color={C.textMuted} accessible={false} /></Pressable>; }
function Timeline({ time, text, latest }: { time: string; text: string; latest?: boolean }) { return <View accessible accessibilityLabel={`${latest ? 'Latest reported sighting. ' : ''}${time}. ${text}`} style={[styles.timelineRow, latest && styles.latestTimeline]}><Text style={styles.timelineTime}>{time}</Text><View style={[styles.timelineDot, latest && styles.latestTimelineDot]} /><View style={styles.timelineCopy}>{latest ? <Text style={styles.latestLabel}>LATEST SIGHTING</Text> : null}<Text style={styles.timelineText}>{text}</Text></View></View>; }
function State({ message, loading }: { message: string; loading?: boolean }) { return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false }} /><View style={styles.centerContent}>{loading ? <ActivityIndicator color="#D8CBF2" /> : null}<Text style={styles.subtitle}>{message}</Text></View></SafeAreaView>; }
function Resolved({ childName, onBack, onRecovery, onHome }: { childName: string; onBack: () => void; onRecovery: () => void; onHome: () => void }) { return <Shell onBack={onBack}><View style={styles.centerContent}><Text accessibilityRole="header" style={styles.title}>{childName} is safe.</Text><Text style={styles.subtitle}>Take a moment before deciding what comes next.</Text><Primary label="Go to Recovery" onPress={onRecovery} /><Secondary label="Return Home" onPress={onHome} /></View></Shell>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background }, flex: { flex: 1 }, scrollContent: { paddingHorizontal: 20, paddingTop: 92, paddingBottom: 80 }, headerMask: { position: 'absolute', zIndex: 90, top: 0, left: 0, right: 0, backgroundColor: C.background }, back: { position: 'absolute', zIndex: 100, elevation: 20, left: 18, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  centerContent: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }, shield: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lavenderSoft }, title: { marginTop: 18, color: C.text, fontSize: 30, lineHeight: 38, fontWeight: '900', textAlign: 'center' }, subtitle: { marginTop: 12, color: C.textMuted, fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  snapshot: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 90, paddingBottom: 64, justifyContent: 'center' }, input: { minHeight: 130, marginTop: 28, padding: 16, borderRadius: 22, color: C.lightText, fontSize: 17, lineHeight: 24, backgroundColor: C.lightSurface, textAlignVertical: 'top' }, singleInput: { minHeight: 58, marginTop: 24, paddingHorizontal: 16, borderRadius: 20, color: C.lightText, fontSize: 16, backgroundColor: C.lightSurface },
  primary: { width: '100%', minHeight: 60, marginTop: 24, paddingHorizontal: 18, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: C.lightSurface }, primaryText: { color: C.lightText, fontSize: 16, fontWeight: '900', textAlign: 'center' }, secondary: { width: '100%', minHeight: 54, marginTop: 12, paddingHorizontal: 18, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }, secondaryText: { color: C.text, fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.45 },
  activeLabel: { color: C.coral, fontSize: 12, lineHeight: 17, fontWeight: '900', letterSpacing: 1.2 }, searchTitle: { marginTop: 5, color: C.text, fontSize: 31, lineHeight: 38, fontWeight: '900' }, timer: { marginTop: 5, color: C.coral, fontSize: 19, lineHeight: 26, fontWeight: '800' }, identityStrip: { marginTop: 22, padding: 14, borderRadius: 22, flexDirection: 'row', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, photo: { width: 74, height: 74, borderRadius: 20 }, photoPlaceholder: { width: 74, height: 74, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceRaised }, identityCopy: { flex: 1, marginLeft: 13 }, identityName: { color: C.text, fontSize: 18, fontWeight: '900' }, identityMeta: { marginTop: 4, color: C.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' }, link: { marginTop: 6, color: C.lavender, fontSize: 14, fontWeight: '900' },
  summaryCard: { marginTop: 16, padding: 18, borderRadius: 24, backgroundColor: C.lightSurface }, summaryHeader: { flexDirection: 'row', justifyContent: 'space-between' }, summaryLabel: { color: '#64727E', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }, summaryValue: { marginTop: 7, color: C.lightText, fontSize: 16, lineHeight: 23, fontWeight: '800' }, summaryDetail: { marginTop: 3, color: '#667581', fontSize: 14, fontWeight: '600' }, divider: { height: 1, marginVertical: 16, backgroundColor: '#DDE3E8' }, sectionLabel: { marginTop: 24, marginBottom: 10, color: C.textSubtle, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, action: { width: '48%', minHeight: 104, padding: 15, borderRadius: 22, justifyContent: 'space-between', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, actionText: { marginTop: 13, color: C.text, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  shareAction: { minHeight: 62, marginTop: 12, paddingHorizontal: 18, borderRadius: 22, flexDirection: 'row', gap: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceRaised, borderWidth: 1, borderColor: C.lavender }, shareActionText: { color: C.text, fontSize: 15, lineHeight: 21, fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  supportActions: { marginTop: 12, gap: 10 }, supportAction: { minHeight: 58, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, supportActionText: { flex: 1, color: C.text, fontSize: 14, lineHeight: 20, fontWeight: '900' },
  timeline: { padding: 16, borderRadius: 22, backgroundColor: C.surface }, timelineRow: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start' }, latestTimeline: { marginHorizontal: -7, padding: 8, borderRadius: 12, backgroundColor: C.lavenderSoft }, timelineTime: { width: 70, color: C.textMuted, fontSize: 13, fontWeight: '700' }, timelineDot: { width: 8, height: 8, marginTop: 4, marginRight: 11, borderRadius: 4, backgroundColor: C.coral }, latestTimelineDot: { backgroundColor: C.lavender }, timelineCopy: { flex: 1 }, latestLabel: { marginBottom: 3, color: C.lavender, fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8 }, timelineText: { color: C.text, fontSize: 14, lineHeight: 20, fontWeight: '700' }, foundButton: { minHeight: 60, marginTop: 24, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: C.coral }, foundText: { color: C.backgroundDeep, fontSize: 17, fontWeight: '900' },
});
