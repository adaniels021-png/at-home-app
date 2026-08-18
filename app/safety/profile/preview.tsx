import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../../lib/SelectedChildContext';
import {
  APPROACH_GUIDANCE,
  COMMUNICATION_METHODS,
  HARDER_TRIGGERS,
  HELPFUL_SUPPORTS,
  labelsFor,
  RESPONDS_TO_NAME,
  SAFETY_CONCERNS,
  UNDERSTANDING_SUPPORTS,
  WANDERING_PATTERNS,
  WANDERING_DESTINATIONS,
} from '../../../lib/safety/profileConfig';
import {
  createSafetyPhotoSignedUrl,
  loadSafetyProfile,
} from '../../../lib/safety/profileData';
import type { SafetyProfile } from '../../../lib/safety/types';
import { getSafetyAccess } from '../../../lib/safety/safetyAccess';
import { consumeProfileReturnToSearch, returnToActiveSearch, shouldReturnProfileToSearch } from '../../../lib/safety/elopementNavigation';
import { createAndShareEmergencyPdf } from '../../../lib/safety/pdf/emergencyPdf';
import { loadEmergencyContacts, loadLocationSources, type SafetyEmergencyContact, type SafetyLocationSource } from '../../../lib/safety/preparednessData';

type ChildDetails = {
  id: string;
  child_name?: string;
  name?: string;
  first_name?: string;
  age?: number | string;
  child_age?: number | string;
  caregiver_access_role?: string;
};

const combine = (values: string[]) => values.join(', ');

export default function EmergencyProfilePreviewScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const child = selectedChild as ChildDetails | null;
  const [profile, setProfile] = useState<SafetyProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [contacts, setContacts] = useState<SafetyEmergencyContact[]>([]);
  const [locationSources, setLocationSources] = useState<SafetyLocationSource[]>([]);
  const returnToSearch = shouldReturnProfileToSearch();
  const handleBack = useCallback(() => {
    if (consumeProfileReturnToSearch()) {
      returnToActiveSearch(router);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/safety/profile');
  }, [router]);

  useFocusEffect(useCallback(() => {
    if (!returnToSearch) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { handleBack(); return true; });
    return () => subscription.remove();
  }, [handleBack, returnToSearch]));

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        if (!child?.id) {
          setLoading(false);
          return;
        }
        setLoading(true);
        setFailed(false);
        try {
          const [saved, access, nextContacts, nextLocations] = await Promise.all([loadSafetyProfile(child.id), getSafetyAccess(child.id), loadEmergencyContacts(child.id), loadLocationSources(child.id)]);
          const signedUrl = await createSafetyPhotoSignedUrl(saved?.photoPath);
          if (active) {
            setProfile(saved);
            setPhotoUrl(signedUrl);
            setCanEdit(access.canEditSafetyProfile);
            setContacts(nextContacts);
            setLocationSources(nextLocations);
          }
        } catch {
          if (active) setFailed(true);
        } finally {
          if (active) setLoading(false);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [child?.id])
  );

  const childName =
    profile?.preferredName ||
    child?.child_name ||
    child?.name ||
    child?.first_name ||
    'Your child';
  const childAge = child?.age || child?.child_age;
  const shareEmergencyProfile = async () => {
    if (!child?.id || preparingPdf) return;
    setPreparingPdf(true);
    AccessibilityInfo.announceForAccessibility('Preparing emergency profile.');
    try {
      const result = await createAndShareEmergencyPdf(child.id);
      if (!result.shared) Alert.alert('Sharing isn’t available', 'The emergency profile was prepared, but sharing is not currently available on this device.');
    } catch {
      const message = 'We couldn’t prepare the emergency profile right now. Please try again.';
      AccessibilityInfo.announceForAccessibility(message);
      Alert.alert('Emergency Profile Unavailable', message);
    } finally {
      setPreparingPdf(false);
    }
  };

  if (loading || failed || !child?.id) {
    const message = loading
      ? 'Loading emergency profile preview…'
      : failed
        ? 'We couldn’t load this Safety Profile right now.'
        : 'Choose or add a child to set up Safety.';
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: !returnToSearch }} />
        <View style={styles.state}>
          {loading ? <ActivityIndicator size="large" color="#7256B6" /> : null}
          <Text style={styles.stateText}>{message}</Text>
          {!loading ? (
            <Pressable accessibilityRole="button" onPress={() => router.replace('/safety/profile')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Return to Profile</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const physical = [
    profile?.physicalDescription?.height && `Height: ${profile.physicalDescription.height}`,
    profile?.physicalDescription?.weight && `Approximate weight: ${profile.physicalDescription.weight}`,
    profile?.physicalDescription?.hair && `Hair: ${profile.physicalDescription.hair}`,
    profile?.physicalDescription?.eyes && `Eyes: ${profile.physicalDescription.eyes}`,
    profile?.physicalDescription?.identifyingFeatures,
  ].filter((value): value is string => Boolean(value));

  const communication = [
    combine(labelsFor(profile?.communication?.methods, COMMUNICATION_METHODS)),
    profile?.communication?.methodsOther,
    profile?.communication?.respondsToName &&
      `Responds to name: ${labelsFor([profile.communication.respondsToName], RESPONDS_TO_NAME)[0]}`,
    profile?.communication?.canShareName && ({
      yes: 'Can usually tell someone their name or caregiver’s name.',
      sometimes: 'May be able to tell someone their name or caregiver’s name.',
      'not-usually': 'May not be able to tell someone their name or caregiver’s name.',
      unknown: 'It is not known whether they can share their name or caregiver’s name.',
    } as const)[profile.communication.canShareName],
    combine(
      labelsFor(
        profile?.communication?.understandingSupports,
        UNDERSTANDING_SUPPORTS
      )
    ),
    profile?.communication?.understandingSupportsOther,
    profile?.communication?.helpfulPhrases &&
      `Helpful words or phrases: ${profile.communication.helpfulPhrases}`,
  ].filter((value): value is string => Boolean(value));

  const approach = [
    combine(labelsFor(profile?.approach?.guidance, APPROACH_GUIDANCE)),
    profile?.approach?.guidanceOther,
    profile?.approach?.notes,
  ].filter((value): value is string => Boolean(value));

  const safety = [
    combine(labelsFor(profile?.wandering?.patterns, WANDERING_PATTERNS)),
    profile?.wandering?.patternsOther,
    profile?.wandering?.destinations?.length
      ? `May go toward: ${combine(labelsFor(profile.wandering.destinations, WANDERING_DESTINATIONS))}`
      : '',
    profile?.wandering?.destinationsOther,
    combine(labelsFor(profile?.wandering?.safetyConcerns, SAFETY_CONCERNS)),
    profile?.wandering?.safetyConcernsOther,
  ].filter((value): value is string => Boolean(value));

  const support = [
    profile?.regulation?.harderTriggers?.length
      ? `May be harder with: ${combine(labelsFor(profile.regulation.harderTriggers, HARDER_TRIGGERS))}`
      : '',
    profile?.regulation?.harderTriggersOther,
    profile?.regulation?.helpfulSupports?.length
      ? `May help: ${combine(labelsFor(profile.regulation.helpfulSupports, HELPFUL_SUPPORTS))}`
      : '',
    profile?.regulation?.helpfulSupportsOther,
  ].filter(Boolean);

  const previewSections = [
    { title: 'Physical Description', lines: physical },
    { title: 'Communication', lines: communication },
    { title: 'If Found / How to Approach', lines: approach },
    { title: 'Safety Concerns', lines: safety },
    { title: 'Calming & Sensory Support', lines: support },
    {
      title: 'Important Health & Safety',
      lines: profile?.importantHealthSafetyNotes
        ? [profile.importantHealthSafetyNotes]
        : [],
    },
    { title: 'Emergency Contact', lines: contacts.flatMap((contact) => [contact.name + (contact.isPrimary ? ' — Primary' : ''), contact.relationship, contact.phone, contact.email].filter((value): value is string => Boolean(value))) },
    { title: 'Location Support', lines: locationSources.map((source) => [source.label, source.providerName, source.deviceName].filter(Boolean).join(' — ')) },
  ].filter((section) => section.lines.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !returnToSearch }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel={returnToSearch ? 'Back to active search' : 'Back to Safety Profile'} onPress={handleBack} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#3F3B47" accessible={false} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Emergency Profile Preview</Text>
        <Text style={styles.subtitle}>This is how {childName}’s information can be shown when you need it quickly.</Text>

        <Pressable accessibilityRole="button" accessibilityLabel="Create and share emergency profile" accessibilityState={{ busy: preparingPdf, disabled: preparingPdf }} disabled={preparingPdf} onPress={() => void shareEmergencyProfile()} style={[styles.shareButton, preparingPdf && styles.buttonDisabled]}>
          {preparingPdf ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="share-outline" size={21} color="#FFFFFF" accessible={false} />}
          <Text style={styles.shareButtonText}>{preparingPdf ? 'Preparing emergency profile…' : 'Create & Share Emergency Profile'}</Text>
        </Pressable>

        <View style={styles.identityCard}>
          <View style={styles.photoWrap}>
            {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} accessibilityLabel={`Recent photo of ${childName}`} /> : <Ionicons name="person-outline" size={44} color="#8B7D9C" />}
          </View>
          <Text style={styles.childName}>{childName}</Text>
          {childAge ? <Text style={styles.childAge}>{childAge} yrs</Text> : null}
        </View>

        {previewSections.map((section) => (
          <View key={section.title} style={styles.previewSection}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
            {section.lines.map((line, index) => <Text key={`${section.title}-${index}`} style={styles.sectionText}>{line}</Text>)}
          </View>
        ))}

        {canEdit ? (
          <Pressable accessibilityRole="button" onPress={() => router.replace('/safety/profile')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Edit Safety Profile</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FA' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 90 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE5EE' },
  title: { marginTop: 22, color: '#292631', fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { marginTop: 9, color: '#6E6874', fontSize: 15, lineHeight: 23, fontWeight: '600' },
  identityCard: { marginTop: 22, padding: 22, borderRadius: 28, alignItems: 'center', backgroundColor: '#EEE8FA', borderWidth: 1, borderColor: '#DED4EF' },
  photoWrap: { width: 124, height: 124, borderRadius: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  photo: { width: '100%', height: '100%' },
  childName: { marginTop: 15, color: '#302A37', fontSize: 25, lineHeight: 31, fontWeight: '900' },
  childAge: { marginTop: 4, color: '#6C6276', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  previewSection: { marginTop: 14, padding: 18, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E4ED' },
  sectionTitle: { color: '#3A343F', fontSize: 17, lineHeight: 23, fontWeight: '900' },
  sectionText: { marginTop: 8, color: '#57505D', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  emptyText: { marginTop: 8, color: '#827A87', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  primaryButton: { minHeight: 58, marginTop: 20, paddingHorizontal: 22, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7256B6' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  shareButton: { minHeight: 58, marginTop: 20, paddingHorizontal: 20, borderRadius: 29, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7256B6' },
  shareButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  buttonDisabled: { opacity: 0.68 },
  state: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  stateText: { marginTop: 16, color: '#403945', fontSize: 21, lineHeight: 29, fontWeight: '900', textAlign: 'center' },
});
