import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../lib/SelectedChildContext';
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
} from '../../lib/safety/profileConfig';
import {
  createSafetyPhotoSignedUrl,
  loadSafetyProfile,
} from '../../lib/safety/profileData';
import type { SafetyProfile } from '../../lib/safety/types';
import { getSafetyAccess } from '../../lib/safety/safetyAccess';
import { loadEmergencyContacts, loadLocationSources, type SafetyEmergencyContact, type SafetyLocationSource } from '../../lib/safety/preparednessData';

type ChildDetails = {
  id: string;
  child_name?: string;
  name?: string;
  first_name?: string;
  age?: number | string;
  child_age?: number | string;
  caregiver_access_role?: string;
};

const join = (values: string[]) => values.join(', ');

export default function SafetyProfileScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const child = selectedChild as ChildDetails | null;
  const [profile, setProfile] = useState<SafetyProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [contacts, setContacts] = useState<SafetyEmergencyContact[]>([]);
  const [locationSources, setLocationSources] = useState<SafetyLocationSource[]>([]);

  const childName =
    profile?.preferredName ||
    child?.child_name ||
    child?.name ||
    child?.first_name ||
    'Your child';
  const childAge = child?.age || child?.child_age;
  const load = useCallback(async () => {
    if (!child?.id) {
      setProfile(null);
      setPhotoUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadFailed(false);
    try {
      const [nextProfile, access, nextContacts, nextLocations] = await Promise.all([
        loadSafetyProfile(child.id),
        getSafetyAccess(child.id),
        loadEmergencyContacts(child.id),
        loadLocationSources(child.id),
      ]);
      setProfile(nextProfile);
      setCanEdit(access.canEditSafetyProfile);
      setContacts(nextContacts);
      setLocationSources(nextLocations);
      setPhotoUrl(
        nextProfile?.photoPath
          ? await createSafetyPhotoSignedUrl(nextProfile.photoPath)
          : null
      );
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!child?.id) {
    return (
      <StateScreen
        title="Choose or add a child to set up Safety."
        action="Choose or Add a Child"
        onAction={() => router.push('/onboarding/add-child')}
      />
    );
  }

  if (loading) {
    return (
      <StateScreen
        title="Loading safety profile…"
        loading
        onAction={() => undefined}
      />
    );
  }

  if (loadFailed) {
    return (
      <StateScreen
        title="We couldn’t load this Safety Profile right now."
        action="Try Again"
        onAction={() => void load()}
      />
    );
  }

  const communicationAdded = Boolean(
    profile?.communication?.methods?.length ||
      profile?.communication?.respondsToName ||
      profile?.communication?.understandingSupports?.length
  );
  const approachAdded = Boolean(
    profile?.approach?.guidance?.length || profile?.approach?.notes
  );
  const safetyAdded = Boolean(
    profile?.wandering?.history ||
      profile?.wandering?.patterns?.length ||
      profile?.wandering?.safetyConcerns?.length ||
      profile?.regulation?.harderTriggers?.length ||
      profile?.regulation?.helpfulSupports?.length
  );

  const sections = [
    {
      title: 'Photo & Identification',
      route: 'identification',
      lines: [
        profile?.preferredName && `Preferred name: ${profile.preferredName}`,
        profile?.physicalDescription?.height &&
          `Height: ${profile.physicalDescription.height}`,
        profile?.physicalDescription?.weight &&
          `Approximate weight: ${profile.physicalDescription.weight}`,
        profile?.physicalDescription?.hair &&
          `Hair: ${profile.physicalDescription.hair}`,
        profile?.physicalDescription?.eyes &&
          `Eyes: ${profile.physicalDescription.eyes}`,
        profile?.physicalDescription?.identifyingFeatures,
      ],
      empty: 'Add a photo and details that may help someone recognize your child.',
    },
    {
      title: 'Communication',
      route: 'communication',
      lines: [
        join(labelsFor(profile?.communication?.methods, COMMUNICATION_METHODS)),
        profile?.communication?.respondsToName &&
          `Responds to name: ${labelsFor([profile.communication.respondsToName], RESPONDS_TO_NAME)[0]}`,
        join(
          labelsFor(
            profile?.communication?.understandingSupports,
            UNDERSTANDING_SUPPORTS
          )
        ),
        profile?.communication?.helpfulPhrases,
      ],
      empty: 'Add how your child communicates and what helps them understand.',
    },
    {
      title: `If Someone Finds ${childName}`,
      route: 'approach',
      lines: [
        join(labelsFor(profile?.approach?.guidance, APPROACH_GUIDANCE)),
        profile?.approach?.notes,
      ],
      empty: 'Add calm guidance for approaching and connecting with your child.',
    },
    {
      title: 'Safety Concerns',
      route: 'safety',
      lines: [
        profile?.wandering?.history &&
          `Wandering history: ${profile.wandering.history === 'unknown' ? 'Not sure / not yet' : profile.wandering.history === 'yes' ? 'Yes' : 'No'}`,
        join(labelsFor(profile?.wandering?.patterns, WANDERING_PATTERNS)),
        join(labelsFor(profile?.wandering?.safetyConcerns, SAFETY_CONCERNS)),
      ],
      empty: 'Add wandering patterns or immediate safety concerns.',
    },
    {
      title: 'Calming & Sensory Support',
      route: 'supports',
      lines: [
        profile?.regulation?.harderTriggers?.length
          ? `May be harder with: ${join(labelsFor(profile.regulation.harderTriggers, HARDER_TRIGGERS))}`
          : '',
        profile?.regulation?.helpfulSupports?.length
          ? `May help: ${join(labelsFor(profile.regulation.helpfulSupports, HELPFUL_SUPPORTS))}`
          : '',
      ],
      empty: `Add things that may make a hard moment harder and what may help ${childName} feel safer or calmer.`,
    },
    {
      title: 'Important Health & Safety',
      route: 'health',
      lines: [profile?.importantHealthSafetyNotes],
      empty: 'No important health or safety information added yet.',
    },
    {
      title: 'Anything Else to Know',
      route: 'notes',
      lines: [profile?.additionalNotes],
      empty: 'No additional notes added yet.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Safety"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/safety')}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color="#3F3B47" />
        </Pressable>

        <Text accessibilityRole="header" style={styles.title}>
          {childName}’s Safety Profile
        </Text>
        <Text style={styles.subtitle}>
          Keep the information someone may need if {childName} is separated from you or needs help.
        </Text>

        <View style={styles.identityCard}>
          <View style={styles.photoWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} accessibilityLabel={`Recent photo of ${childName}`} />
            ) : (
              <Ionicons name="person-outline" size={38} color="#8B7D9C" />
            )}
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.identityName}>{childName}</Text>
            <Text style={styles.identityMeta}>{childAge ? `${childAge} yrs` : 'Age not added'}</Text>
          </View>
          {canEdit ? <EditLink label="Edit" onPress={() => router.push('/safety/profile/identification')} /> : null}
        </View>

        <View style={styles.readinessCard}>
          <Text style={styles.cardHeading}>Safety Profile readiness</Text>
          <Text style={styles.readinessCopy}>
            Add a few key details to make {childName}’s Safety Profile more useful when you need it.
          </Text>
          <ReadinessRow label="Photo" ready={Boolean(profile?.photoPath)} />
          <ReadinessRow label="Communication" ready={communicationAdded} />
          <ReadinessRow label="How to approach" ready={approachAdded} />
          <ReadinessRow label="Emergency contact" ready={contacts.length > 0} />
          <ReadinessRow label="Safety details" ready={safetyAdded} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Preview Emergency Profile"
          onPress={() => router.push('/safety/profile/preview')}
          style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}
        >
          <Ionicons name="document-text-outline" size={21} color="#FFFFFF" />
          <Text style={styles.previewButtonText}>Preview Emergency Profile</Text>
        </Pressable>

        {sections.slice(0, 3).map((section) => {
          const visibleLines = section.lines.filter((line): line is string => Boolean(line?.trim()));
          return (
            <View key={section.route} style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text accessibilityRole="header" style={styles.summaryTitle}>{section.title}</Text>
                {canEdit ? (
                  <EditLink label="Edit" onPress={() => router.push(`/safety/profile/${section.route}`)} />
                ) : null}
              </View>
              {visibleLines.length ? visibleLines.map((line, index) => (
                <Text key={`${section.route}-${index}`} style={styles.summaryText}>{line}</Text>
              )) : <Text style={styles.emptyText}>{section.empty}</Text>}
            </View>
          );
        })}

        <ManageCard
          title="Emergency Contacts"
          lines={contacts.length ? [contacts[0].isPrimary ? `Primary: ${contacts[0].name}${contacts[0].relationship ? ` • ${contacts[0].relationship}` : ''}` : contacts[0].name, contacts.length > 1 ? `${contacts.length} contacts added` : '1 contact added'] : []}
          empty="No emergency contact added yet."
          action="Manage contacts →"
          onPress={() => router.push('/safety/emergency-contacts')}
        />
        {sections.slice(3).map((section) => {
          const visibleLines = section.lines.filter((line): line is string => Boolean(line?.trim()));
          return (
            <View key={section.route} style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text accessibilityRole="header" style={styles.summaryTitle}>{section.title}</Text>
                {canEdit ? (
                  <EditLink label="Edit" onPress={() => router.push(`/safety/profile/${section.route}`)} />
                ) : null}
              </View>
              {visibleLines.length ? visibleLines.map((line, index) => (
                <Text key={`${section.route}-${index}`} style={styles.summaryText}>{line}</Text>
              )) : <Text style={styles.emptyText}>{section.empty}</Text>}
            </View>
          );
        })}
        <ManageCard
          title="Location Support"
          lines={locationSources.map((source) => [source.label, source.providerName].filter(Boolean).join(' — '))}
          empty="No location option added yet."
          action="Manage Location Support →"
          onPress={() => router.push('/safety/location-options')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View accessibilityLabel={`${label}, ${ready ? 'added' : 'not added yet'}`} style={styles.readinessRow}>
      <Ionicons name={ready ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={ready ? '#5C8A6B' : '#A19AA8'} />
      <Text style={styles.readinessLabel}>{label}</Text>
      <Text style={styles.readinessStatus}>{ready ? 'Added' : 'Add details'}</Text>
    </View>
  );
}

function EditLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}><Text style={styles.editLink}>{label}</Text></Pressable>;
}

function ManageCard({ title, lines = [], empty, action, onPress }: { title: string; lines?: string[]; empty: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.summaryCard}>
      <Text accessibilityRole="header" style={styles.summaryTitle}>{title}</Text>
      {lines.length ? lines.map((line) => <Text key={line} style={styles.summaryText}>{line}</Text>) : <Text style={styles.emptyText}>{empty}</Text>}
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.manageAction}>
        <Text style={styles.editLink}>{action}</Text>
      </Pressable>
    </View>
  );
}

function StateScreen({ title, action, loading, onAction }: { title: string; action?: string; loading?: boolean; onAction: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.stateContent}>
        {loading ? <ActivityIndicator size="large" color="#7256B6" /> : null}
        <Text accessibilityRole="header" style={styles.stateTitle}>{title}</Text>
        {action ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.stateButton}><Text style={styles.stateButtonText}>{action}</Text></Pressable> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FA' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 90 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8F0' },
  title: { marginTop: 22, color: '#292631', fontSize: 31, lineHeight: 38, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { marginTop: 9, color: '#6E6874', fontSize: 15, lineHeight: 23, fontWeight: '600' },
  identityCard: { marginTop: 22, padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE5EE' },
  photoWrap: { width: 72, height: 72, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE8F5' },
  photo: { width: '100%', height: '100%' },
  identityCopy: { flex: 1, marginHorizontal: 14 },
  identityName: { color: '#302B36', fontSize: 19, lineHeight: 25, fontWeight: '900' },
  identityMeta: { marginTop: 4, color: '#79727F', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  editLink: { color: '#6B4EAD', fontSize: 14, lineHeight: 20, fontWeight: '900' },
  readinessCard: { marginTop: 14, padding: 18, borderRadius: 24, backgroundColor: '#F0EBFB', borderWidth: 1, borderColor: '#E0D7F2' },
  cardHeading: { color: '#3A3343', fontSize: 17, lineHeight: 23, fontWeight: '900' },
  readinessCopy: { marginTop: 6, marginBottom: 10, color: '#6D6475', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  readinessRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center' },
  readinessLabel: { flex: 1, marginLeft: 9, color: '#49414F', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  readinessStatus: { color: '#7E7586', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  previewButton: { minHeight: 56, marginTop: 16, paddingHorizontal: 18, borderRadius: 28, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7054B1' },
  previewButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  pressed: { opacity: 0.78 },
  summaryCard: { marginTop: 14, padding: 18, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBE7EF' },
  summaryHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' },
  summaryTitle: { flex: 1, color: '#38323E', fontSize: 17, lineHeight: 23, fontWeight: '900' },
  summaryText: { marginTop: 8, color: '#5F5865', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  emptyText: { marginTop: 8, color: '#817A86', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  manageAction: { alignSelf: 'flex-start', minHeight: 40, marginTop: 8, justifyContent: 'center' },
  stateContent: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { marginTop: 16, color: '#39333F', fontSize: 23, lineHeight: 31, fontWeight: '900', textAlign: 'center' },
  stateButton: { minHeight: 52, marginTop: 20, paddingHorizontal: 22, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7256B6' },
  stateButtonText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '900' },
});
