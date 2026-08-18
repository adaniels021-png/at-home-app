import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../lib/SelectedChildContext';
import { loadEmergencyContacts, loadLocationSources, type SafetyEmergencyContact, type SafetyLocationSource } from '../../lib/safety/preparednessData';
import { labelsFor, SAFETY_CONCERNS, WANDERING_DESTINATIONS } from '../../lib/safety/profileConfig';
import { loadSafetyProfile } from '../../lib/safety/profileData';
import { getSafetyAccess } from '../../lib/safety/safetyAccess';
import type { SafetyProfile } from '../../lib/safety/types';

type ChildDetails = { id: string; child_name?: string; name?: string; first_name?: string };

export default function WanderingScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const child = selectedChild as ChildDetails | null;
  const childName = child?.child_name || child?.name || child?.first_name || 'Your child';
  const [profile, setProfile] = useState<SafetyProfile | null>(null);
  const [contacts, setContacts] = useState<SafetyEmergencyContact[]>([]);
  const [locations, setLocations] = useState<SafetyLocationSource[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [canUseSafety, setCanUseSafety] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!child?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const access = await getSafetyAccess(child.id);
      if (!access.canViewSafetyProfile) throw new Error('Unauthorized');
      const [savedProfile, savedContacts, savedLocations] = await Promise.all([
        loadSafetyProfile(child.id),
        loadEmergencyContacts(child.id),
        loadLocationSources(child.id),
      ]);
      setProfile(savedProfile);
      setContacts(savedContacts);
      setLocations(savedLocations);
      setCanEdit(access.canEditSafetyProfile);
      setCanUseSafety(access.canUseSafetyMode || access.canParticipateInSafetyIncident);
    } catch {
      Alert.alert('Plan Unavailable', 'You don’t currently have access to this Safety plan.');
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const destinations = [
    ...labelsFor(profile?.wandering?.destinations, WANDERING_DESTINATIONS),
    ...(profile?.wandering?.destinationsOther ? [profile.wandering.destinationsOther] : []),
  ];
  const concerns = [
    ...labelsFor(profile?.wandering?.safetyConcerns, SAFETY_CONCERNS),
    ...(profile?.wandering?.safetyConcernsOther ? [profile.wandering.safetyConcernsOther] : []),
  ];
  const primaryContact = contacts.find((contact) => contact.isPrimary);
  const locationNames = locations.map((source) => source.providerName || source.deviceName || source.label);
  const profileRoute = canEdit ? '/safety/profile/safety' : '/safety/profile';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Safety" hitSlop={10} onPress={() => router.canGoBack() ? router.back() : router.replace('/safety')} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#3F3B47" accessible={false} />
        </Pressable>
        <View style={styles.icon} accessible={false}><Ionicons name="navigate-outline" size={29} color="#A16C2D" /></View>
        <Text accessibilityRole="header" style={styles.title}>Wandering &amp; Elopement Plan</Text>
        <Text style={styles.subtitle}>Prepare ahead for situations where your child may wander, bolt, or leave a safe area unexpectedly.</Text>
        <Text accessibilityLabel={`Plan for ${childName}`} style={styles.childName}>Plan for {childName}</Text>

        {loading ? <ActivityIndicator style={styles.loading} color="#7256B6" /> : <>
          <PlanCard icon="map-outline" title="Likely Places" summary={destinations.length ? destinations.join(' • ') : 'No likely destinations added yet.'} action="Review Likely Places" onPress={() => router.push(profileRoute)} />
          <PlanCard icon="warning-outline" title="Safety Concerns" summary={concerns.length ? concerns.join(' • ') : 'No safety concerns added yet.'} action="Review Safety Concerns" onPress={() => router.push(profileRoute)} />
          <PlanCard icon="call-outline" title="Emergency Contacts" summary={contacts.length ? `${primaryContact ? `Primary: ${primaryContact.name}. ` : ''}${contacts.length} contact${contacts.length === 1 ? '' : 's'} saved.` : 'No emergency contacts added yet.'} action="Manage Emergency Contacts" onPress={() => router.push('/safety/emergency-contacts')} />
          <PlanCard icon="location-outline" title="Location Support" summary={locations.length ? `${locationNames.join(' • ')}\nQuickly open the location service your family already uses.` : 'No location support added yet.'} action={canEdit ? 'Manage Location Support' : 'Open Location Support'} onPress={() => router.push('/safety/location-options')} />
          <PlanCard icon="document-text-outline" title="Emergency Profile" summary="Review the information that can be shared quickly if your child is missing." action="Preview Emergency Profile" onPress={() => router.push('/safety/profile/preview')} />

          <View style={styles.actNow}>
            <Text accessibilityRole="header" style={styles.actHeading}>IF YOUR CHILD IS MISSING NOW</Text>
            <Text style={styles.actBody}>Start Elopement Safety to organize the search and quickly access the information your family may need.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Start Elopement Safety for a child who is currently missing" accessibilityState={{ disabled: !canUseSafety }} disabled={!canUseSafety} onPress={() => router.push({ pathname: '/safety/emergency/elopement', params: { origin: 'safety' } })} style={[styles.start, !canUseSafety && styles.disabled]}>
              <Ionicons name="navigate-outline" size={22} color="#FFFFFF" accessible={false} />
              <Text style={styles.startText}>Start Elopement Safety</Text>
            </Pressable>
            <Text style={styles.actSupport}>Use this when your child is currently missing or has left a safe area unexpectedly.</Text>
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ icon, title, summary, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; summary: string; action: string; onPress: () => void }) {
  return <View style={styles.card}>
    <View style={styles.cardHeader}><View style={styles.cardIcon} accessible={false}><Ionicons name={icon} size={22} color="#7256B6" /></View><Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text></View>
    <Text style={styles.summary}>{summary}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${action}. ${title}`} onPress={onPress} style={styles.action}><Text style={styles.actionText}>{action}</Text><Ionicons name="chevron-forward" size={18} color="#7256B6" accessible={false} /></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FA' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8F0' },
  icon: { width: 58, height: 58, marginTop: 22, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4DE' },
  title: { marginTop: 16, color: '#292631', fontSize: 30, lineHeight: 38, fontWeight: '900' },
  subtitle: { marginTop: 8, color: '#706A76', fontSize: 16, lineHeight: 24, fontWeight: '600' },
  childName: { marginTop: 14, color: '#7256B6', fontSize: 14, lineHeight: 20, fontWeight: '900' },
  loading: { marginTop: 52 },
  card: { marginTop: 14, padding: 18, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E5ED' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1ECFF' },
  cardTitle: { flex: 1, color: '#39333F', fontSize: 18, lineHeight: 24, fontWeight: '900' },
  summary: { marginTop: 12, color: '#706A76', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  action: { minHeight: 48, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionText: { flex: 1, color: '#6B4EAD', fontSize: 15, lineHeight: 21, fontWeight: '900' },
  actNow: { marginTop: 24, padding: 20, borderRadius: 24, backgroundColor: '#FFF0EC', borderWidth: 1, borderColor: '#F0C8C1' },
  actHeading: { color: '#8F433C', fontSize: 13, lineHeight: 19, fontWeight: '900', letterSpacing: 0.7 },
  actBody: { marginTop: 9, color: '#5D4B4A', fontSize: 15, lineHeight: 23, fontWeight: '600' },
  start: { minHeight: 58, marginTop: 18, paddingHorizontal: 18, borderRadius: 29, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A64E45' },
  startText: { flexShrink: 1, color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
  actSupport: { marginTop: 10, color: '#806865', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  disabled: { opacity: 0.45 },
});
