import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../../lib/SelectedChildContext';
import {
  APPROACH_GUIDANCE,
  COMMUNICATION_METHODS,
  HARDER_TRIGGERS,
  HELPFUL_SUPPORTS,
  RESPONDS_TO_NAME,
  SAFETY_CONCERNS,
  UNDERSTANDING_SUPPORTS,
  WANDERING_HISTORY,
  WANDERING_PATTERNS,
  WANDERING_DESTINATIONS,
  type Choice,
} from '../../../lib/safety/profileConfig';
import {
  createSafetyPhotoSignedUrl,
  loadSafetyProfile,
  removeSafetyPhoto,
  saveSafetyProfileSection,
  saveChildAge,
  uploadSafetyPhoto,
} from '../../../lib/safety/profileData';
import type { SafetyProfile } from '../../../lib/safety/types';
import { getSafetyAccess } from '../../../lib/safety/safetyAccess';

type Section =
  | 'identification'
  | 'communication'
  | 'approach'
  | 'safety'
  | 'supports'
  | 'health'
  | 'notes';

const SECTIONS: Section[] = [
  'identification',
  'communication',
  'approach',
  'safety',
  'supports',
  'health',
  'notes',
];

const SECTION_TITLES: Record<Section, string> = {
  identification: 'Photo & Identification',
  communication: 'Communication',
  approach: 'How to Approach',
  safety: 'Wandering & Safety',
  supports: 'Calming & Sensory Support',
  health: 'Important Health & Safety',
  notes: 'Anything Else to Know',
};

type ChildDetails = {
  id: string;
  child_name?: string;
  name?: string;
  first_name?: string;
  age?: number | string;
  child_age?: number | string;
  caregiver_access_role?: string;
};

const trim = (value: string) => value.trim() || null;

export default function SafetyProfileSectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const { selectedChild, refreshChildren } = useChild();
  const child = selectedChild as ChildDetails | null;
  const section = SECTIONS.includes(params.section as Section)
    ? (params.section as Section)
    : null;
  const [profile, setProfile] = useState<SafetyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<{ uri: string; mimeType?: string | null } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);

  const [preferredName, setPreferredName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [hair, setHair] = useState('');
  const [eyes, setEyes] = useState('');
  const [features, setFeatures] = useState('');
  const [age, setAge] = useState('');
  const [methods, setMethods] = useState<string[]>([]);
  const [methodsOther, setMethodsOther] = useState('');
  const [responds, setResponds] = useState<string | null>(null);
  const [canShareName, setCanShareName] = useState<string | null>(null);
  const [understanding, setUnderstanding] = useState<string[]>([]);
  const [understandingOther, setUnderstandingOther] = useState('');
  const [phrases, setPhrases] = useState('');
  const [approach, setApproach] = useState<string[]>([]);
  const [approachOther, setApproachOther] = useState('');
  const [approachNotes, setApproachNotes] = useState('');
  const [wanderingHistory, setWanderingHistory] = useState<string | null>(null);
  const [wanderingPatterns, setWanderingPatterns] = useState<string[]>([]);
  const [wanderingPatternsOther, setWanderingPatternsOther] = useState('');
  const [wanderingDestinations, setWanderingDestinations] = useState<string[]>([]);
  const [wanderingDestinationsOther, setWanderingDestinationsOther] = useState('');
  const [safetyConcerns, setSafetyConcerns] = useState<string[]>([]);
  const [safetyConcernsOther, setSafetyConcernsOther] = useState('');
  const [harderTriggers, setHarderTriggers] = useState<string[]>([]);
  const [harderTriggersOther, setHarderTriggersOther] = useState('');
  const [helpfulSupports, setHelpfulSupports] = useState<string[]>([]);
  const [helpfulSupportsOther, setHelpfulSupportsOther] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const childName = useMemo(
    () =>
      preferredName.trim() ||
      child?.child_name ||
      child?.name ||
      child?.first_name ||
      'your child',
    [child, preferredName]
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!child?.id || !section) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const [saved, access] = await Promise.all([loadSafetyProfile(child.id), getSafetyAccess(child.id)]);
        if (!active) return;
        setCanEdit(access.canEditSafetyProfile);
        setProfile(saved);
        setPreferredName(saved?.preferredName ?? '');
        setHeight(saved?.physicalDescription?.height ?? '');
        setWeight(saved?.physicalDescription?.weight ?? '');
        setHair(saved?.physicalDescription?.hair ?? '');
        setEyes(saved?.physicalDescription?.eyes ?? '');
        setFeatures(saved?.physicalDescription?.identifyingFeatures ?? '');
        setAge(String(child.age ?? child.child_age ?? ''));
        setMethods(saved?.communication?.methods ?? []);
        setMethodsOther(saved?.communication?.methodsOther ?? '');
        setResponds(saved?.communication?.respondsToName ?? null);
        setCanShareName(saved?.communication?.canShareName ?? null);
        setUnderstanding(saved?.communication?.understandingSupports ?? []);
        setUnderstandingOther(saved?.communication?.understandingSupportsOther ?? '');
        setPhrases(saved?.communication?.helpfulPhrases ?? '');
        setApproach(saved?.approach?.guidance ?? []);
        setApproachOther(saved?.approach?.guidanceOther ?? '');
        setApproachNotes(saved?.approach?.notes ?? '');
        setWanderingHistory(saved?.wandering?.history ?? null);
        setWanderingPatterns(saved?.wandering?.patterns ?? []);
        setWanderingPatternsOther(saved?.wandering?.patternsOther ?? '');
        setWanderingDestinations(saved?.wandering?.destinations ?? []);
        setWanderingDestinationsOther(saved?.wandering?.destinationsOther ?? '');
        setSafetyConcerns(saved?.wandering?.safetyConcerns ?? []);
        setSafetyConcernsOther(saved?.wandering?.safetyConcernsOther ?? '');
        setHarderTriggers(saved?.regulation?.harderTriggers ?? []);
        setHarderTriggersOther(saved?.regulation?.harderTriggersOther ?? '');
        setHelpfulSupports(saved?.regulation?.helpfulSupports ?? []);
        setHelpfulSupportsOther(saved?.regulation?.helpfulSupportsOther ?? '');
        setHealthNotes(saved?.importantHealthSafetyNotes ?? '');
        setAdditionalNotes(saved?.additionalNotes ?? '');
        setPhotoUrl(await createSafetyPhotoSignedUrl(saved?.photoPath));
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [child?.age, child?.child_age, child?.id, section]);

  if (!child?.id) {
    return <MessageState message="Choose or add a child to set up Safety." action="Choose or Add a Child" onPress={() => router.replace('/onboarding/add-child')} />;
  }
  if (!section) {
    return <MessageState message="Let’s return to the Safety Profile." action="Return to Profile" onPress={() => router.replace('/safety/profile')} />;
  }
  if (canEdit === false) {
    return <MessageState message="This Safety Profile can only be edited by a parent or profile owner." action="Return to Profile" onPress={() => router.replace('/safety/profile')} />;
  }
  if (loading) return <MessageState message="Loading safety profile…" loading onPress={() => undefined} />;
  if (error) return <MessageState message="We couldn’t load this Safety Profile right now." action="Return to Profile" onPress={() => router.replace('/safety/profile')} />;

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo Access Needed', 'Please allow photo access to add a recent child photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (asset?.uri) {
      setLocalPhoto({ uri: asset.uri, mimeType: asset.mimeType });
      setRemovePhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      let values: Record<string, unknown> = {};
      if (section === 'identification') {
        const normalizedAge = age.trim() ? Number(age.trim()) : null;
        if (normalizedAge !== null && (!Number.isInteger(normalizedAge) || normalizedAge < 0 || normalizedAge > 120)) {
          Alert.alert('Check Age', 'Enter a whole number between 0 and 120.');
          return;
        }
        let nextPhotoPath = removePhoto ? null : profile?.photoPath ?? null;
        if (localPhoto) {
          uploadedPath = await uploadSafetyPhoto(child.id, localPhoto.uri, localPhoto.mimeType);
          nextPhotoPath = uploadedPath;
        }
        values = {
          preferred_name: trim(preferredName),
          photo_path: nextPhotoPath,
          height: trim(height),
          weight: trim(weight),
          hair_color: trim(hair),
          eye_color: trim(eyes),
          identifying_features: trim(features),
        };
        await saveChildAge(child.id, normalizedAge);
        await refreshChildren();
      } else if (section === 'communication') {
        values = { communication_methods: methods, communication_other: methods.includes('other') ? trim(methodsOther) : null, responds_to_name: responds, can_share_name: canShareName, communication_supports: understanding, communication_supports_other: understanding.includes('other') ? trim(understandingOther) : null, helpful_phrases: trim(phrases) };
      } else if (section === 'approach') {
        values = { approach_guidance: approach, approach_guidance_other: approach.includes('other') ? trim(approachOther) : null, approach_notes: trim(approachNotes) };
      } else if (section === 'safety') {
        values = { wandering_history: wanderingHistory, wandering_patterns: wanderingHistory === 'yes' ? wanderingPatterns : [], wandering_patterns_other: wanderingHistory === 'yes' && wanderingPatterns.includes('other') ? trim(wanderingPatternsOther) : null, wandering_destinations: wanderingHistory === 'yes' ? wanderingDestinations : [], wandering_destinations_other: wanderingHistory === 'yes' && wanderingDestinations.includes('other') ? trim(wanderingDestinationsOther) : null, safety_concerns: safetyConcerns, safety_concerns_other: safetyConcerns.includes('other') ? trim(safetyConcernsOther) : null };
      } else if (section === 'supports') {
        values = { sensory_challenges: harderTriggers, sensory_challenges_other: harderTriggers.includes('other') ? trim(harderTriggersOther) : null, regulation_supports: helpfulSupports, regulation_supports_other: helpfulSupports.includes('other') ? trim(helpfulSupportsOther) : null };
      } else if (section === 'health') {
        values = { important_health_safety_notes: trim(healthNotes) };
      } else {
        values = { additional_notes: trim(additionalNotes) };
      }

      await saveSafetyProfileSection(child.id, values);

      if (section === 'identification' && profile?.photoPath) {
        if (removePhoto || (uploadedPath && uploadedPath !== profile.photoPath)) {
          try {
            await removeSafetyPhoto(profile.photoPath);
          } catch {
            // The profile is safely saved; old-file cleanup can be retried later.
          }
        }
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/safety/profile');
      }
    } catch {
      if (uploadedPath) {
        try {
          await removeSafetyPhoto(uploadedPath);
        } catch {
          // Avoid replacing the useful parent-facing save error with cleanup details.
        }
      }
      Alert.alert('Couldn’t Save', 'Your changes are still here. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/safety/profile')} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color="#3F3B47" />
        </Pressable>
        <Text style={styles.topTitle}>{SECTION_TITLES[section]}</Text>
        <View style={styles.topSpacer} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {section === 'identification' ? (
          <>
            <Question title="Recent Photo" support="Use a recent, clear photo that shows your child’s face." />
            <View style={styles.photoCard}>
              <View style={styles.photoWrap}>
                {localPhoto || (!removePhoto && photoUrl) ? <Image source={{ uri: localPhoto?.uri || photoUrl! }} style={styles.photo} /> : <Ionicons name="person-outline" size={40} color="#8B7D9C" />}
              </View>
              <View style={styles.photoActions}>
                <SmallAction label={profile?.photoPath || localPhoto ? 'Replace Photo' : 'Add Photo'} onPress={() => void pickPhoto()} />
                {profile?.photoPath || localPhoto ? <SmallAction label="Remove Photo" muted onPress={() => { setLocalPhoto(null); setRemovePhoto(true); }} /> : null}
              </View>
            </View>
            <Field label="Preferred name" value={preferredName} onChangeText={setPreferredName} maxLength={100} />
            <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
            <Field label="Height" value={height} onChangeText={setHeight} maxLength={100} />
            <Field label="Approximate weight" value={weight} onChangeText={setWeight} maxLength={100} />
            <Field label="Hair color" value={hair} onChangeText={setHair} maxLength={100} />
            <Field label="Eye color" value={eyes} onChangeText={setEyes} maxLength={100} />
            <Field label="Identifying features" helper="Glasses, birthmarks, braces, scars, mobility equipment, or anything that may help someone recognize your child." value={features} onChangeText={setFeatures} multiline maxLength={500} />
          </>
        ) : null}

        {section === 'communication' ? (
          <>
            <Question title={`How does ${childName} communicate?`} support="Select all that apply." />
            <ChoiceList choices={COMMUNICATION_METHODS} selected={methods} onToggle={(id) => setMethods(toggle(methods, id))} />
            {methods.includes('other') ? <Field label="Tell us more" value={methodsOther} onChangeText={setMethodsOther} maxLength={200} /> : null}
            <Question title={`Does ${childName} usually respond when someone calls their name?`} />
            <ChoiceList choices={RESPONDS_TO_NAME} selected={responds ? [responds] : []} radio onToggle={setResponds} />
            <Question title={`Can ${childName} tell someone their name or caregiver’s name?`} />
            <ChoiceList choices={RESPONDS_TO_NAME} selected={canShareName ? [canShareName] : []} radio onToggle={setCanShareName} />
            <Question title={`What helps ${childName} understand someone?`} />
            <ChoiceList choices={UNDERSTANDING_SUPPORTS} selected={understanding} onToggle={(id) => setUnderstanding(toggle(understanding, id))} />
            {understanding.includes('other') ? <Field label="Tell us more" value={understandingOther} onChangeText={setUnderstandingOther} maxLength={200} /> : null}
            <Field label="Familiar words or phrases that may help" helper={'For example: “Mom is coming.” “You’re safe.” “First car, then home.”'} value={phrases} onChangeText={setPhrases} multiline maxLength={400} />
          </>
        ) : null}

        {section === 'approach' ? (
          <>
            <Question title={`What may help someone approach ${childName} safely?`} support="Select all that apply." />
            <ChoiceList choices={APPROACH_GUIDANCE} selected={approach} onToggle={(id) => setApproach(toggle(approach, id))} />
            {approach.includes('other') ? <Field label="Tell us more" value={approachOther} onChangeText={setApproachOther} maxLength={200} /> : null}
            <Field label={`Anything else that may help someone connect with ${childName}?`} helper="Talking about a favorite character, toy, or interest may help." value={approachNotes} onChangeText={setApproachNotes} multiline maxLength={500} />
          </>
        ) : null}

        {section === 'safety' ? (
          <>
            <Question title={`Has ${childName} ever wandered, bolted, or left a safe area unexpectedly?`} />
            <ChoiceList choices={WANDERING_HISTORY} selected={wanderingHistory ? [wanderingHistory] : []} radio onToggle={setWanderingHistory} />
            {wanderingHistory === 'yes' ? <><Question title={`When ${childName} wanders, what are they more likely to do?`} /><ChoiceList choices={WANDERING_PATTERNS} selected={wanderingPatterns} onToggle={(id) => setWanderingPatterns(toggle(wanderingPatterns, id))} />{wanderingPatterns.includes('other') ? <Field label="Tell us more" value={wanderingPatternsOther} onChangeText={setWanderingPatternsOther} maxLength={200} /> : null}<Question title={`Where might ${childName} go?`} support="Select all that apply." /><ChoiceList choices={WANDERING_DESTINATIONS} selected={wanderingDestinations} onToggle={(id) => setWanderingDestinations(toggle(wanderingDestinations, id))} />{wanderingDestinations.includes('other') ? <Field label="Tell us more" value={wanderingDestinationsOther} onChangeText={setWanderingDestinationsOther} maxLength={200} /> : null}</> : null}
            <Question title="Safety concerns someone should know about" />
            <ChoiceList choices={SAFETY_CONCERNS} selected={safetyConcerns} onToggle={(id) => setSafetyConcerns(toggle(safetyConcerns, id))} />
            {safetyConcerns.includes('other') ? <Field label="Tell us more" value={safetyConcernsOther} onChangeText={setSafetyConcernsOther} maxLength={200} /> : null}
          </>
        ) : null}

        {section === 'supports' ? (
          <>
            <Question title="THINGS THAT MAY BE HARD" />
            <ChoiceList choices={HARDER_TRIGGERS} selected={harderTriggers} onToggle={(id) => setHarderTriggers(toggle(harderTriggers, id))} />
            {harderTriggers.includes('other') ? <Field label="Tell us more" value={harderTriggersOther} onChangeText={setHarderTriggersOther} maxLength={200} /> : null}
            <Question title="WHAT MAY HELP" />
            <ChoiceList choices={HELPFUL_SUPPORTS} selected={helpfulSupports} onToggle={(id) => setHelpfulSupports(toggle(helpfulSupports, id))} />
            {helpfulSupports.includes('other') ? <Field label="Tell us more" value={helpfulSupportsOther} onChangeText={setHelpfulSupportsOther} maxLength={200} /> : null}
          </>
        ) : null}

        {section === 'health' ? <><Question title={`Is there important health or safety information someone helping ${childName} should know?`} support={`Only include information someone may need to help ${childName} safely.`} /><Field label="Important information" helper="Allergies, seizure concerns, medical equipment, medications that may affect an emergency, or other information important to immediate safety." value={healthNotes} onChangeText={setHealthNotes} multiline maxLength={500} /></> : null}
        {section === 'notes' ? <><Question title={`Anything else someone helping ${childName} should know?`} /><Field label="Additional notes" value={additionalNotes} onChangeText={setAdditionalNotes} multiline maxLength={500} /></> : null}

        <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => void handleSave()} style={({ pressed }) => [styles.save, pressed && styles.pressed, saving && styles.saveDisabled]}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const toggle = (values: string[], id: string) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

function Question({ title, support }: { title: string; support?: string }) {
  return <View style={styles.question}><Text accessibilityRole="header" style={styles.questionTitle}>{title}</Text>{support ? <Text style={styles.questionSupport}>{support}</Text> : null}</View>;
}

function ChoiceList({ choices, selected, onToggle, radio }: { choices: Choice[]; selected: string[]; onToggle: (id: string) => void; radio?: boolean }) {
  return <View accessibilityRole={radio ? 'radiogroup' : undefined} style={styles.choices}>{choices.map((choice) => { const active = selected.includes(choice.id); return <Pressable key={choice.id} accessibilityRole={radio ? 'radio' : 'checkbox'} accessibilityState={{ selected: radio ? active : undefined, checked: radio ? undefined : active }} accessibilityLabel={choice.label} onPress={() => onToggle(choice.id)} style={[styles.choice, !radio && styles.multiChoice, active && styles.choiceSelected]}><Text style={styles.choiceText}>{choice.label}</Text><View style={[radio ? styles.radioControl : styles.checkboxControl, active && styles.controlSelected]}>{active ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}</View></Pressable>; })}</View>;
}

function Field({ label, helper, multiline, maxLength, ...inputProps }: React.ComponentProps<typeof TextInput> & { label: string; helper?: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text>{helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}<TextInput {...inputProps} accessibilityLabel={label} multiline={multiline} maxLength={maxLength} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline]} /><Text style={styles.characterCount}>{String(inputProps.value ?? '').length}/{maxLength}</Text></View>;
}

function SmallAction({ label, muted, onPress }: { label: string; muted?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.smallAction}><Text style={[styles.smallActionText, muted && styles.mutedAction]}>{label}</Text></Pressable>;
}

function MessageState({ message, action, loading, onPress }: { message: string; action?: string; loading?: boolean; onPress: () => void }) {
  return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false }} /><View style={styles.messageState}>{loading ? <ActivityIndicator size="large" color="#7256B6" /> : null}<Text style={styles.messageText}>{message}</Text>{action ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.save}><Text style={styles.saveText}>{action}</Text></Pressable> : null}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FA' },
  topBar: { minHeight: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE5EE' },
  topTitle: { flex: 1, marginHorizontal: 10, color: '#37313D', fontSize: 17, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
  topSpacer: { width: 44 },
  content: { paddingHorizontal: 20, paddingBottom: 128 },
  question: { marginTop: 22, marginBottom: 12 },
  questionTitle: { color: '#322D38', fontSize: 20, lineHeight: 27, fontWeight: '900' },
  questionSupport: { marginTop: 6, color: '#746D7A', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  choices: { gap: 10 },
  choice: { minHeight: 58, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 19, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E3EC' },
  multiChoice: { minHeight: 46, paddingVertical: 8 },
  choiceSelected: { backgroundColor: '#F0EBFB', borderColor: '#B9A8DE' },
  choiceText: { flex: 1, color: '#4A434F', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  checkboxControl: { width: 23, height: 23, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#AAA3AF' },
  radioControl: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#AAA3AF' },
  controlSelected: { backgroundColor: '#7256B6', borderColor: '#7256B6' },
  field: { marginTop: 20 },
  fieldLabel: { color: '#3D3743', fontSize: 15, lineHeight: 21, fontWeight: '900' },
  fieldHelper: { marginTop: 5, color: '#77707D', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  input: { minHeight: 52, marginTop: 9, paddingHorizontal: 15, borderRadius: 18, color: '#302B35', fontSize: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3DEE7' },
  multiline: { minHeight: 126, paddingTop: 14, paddingBottom: 14 },
  characterCount: { marginTop: 5, color: '#918A96', fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'right' },
  photoCard: { padding: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E3EC' },
  photoWrap: { width: 88, height: 88, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE8F5' },
  photo: { width: '100%', height: '100%' },
  photoActions: { flex: 1, marginLeft: 14 },
  smallAction: { minHeight: 42, justifyContent: 'center' },
  smallActionText: { color: '#694DA8', fontSize: 14, lineHeight: 20, fontWeight: '900' },
  mutedAction: { color: '#7D7581' },
  ageCard: { minHeight: 54, marginTop: 18, paddingHorizontal: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EEEAF2' },
  ageLabel: { color: '#4A434F', fontSize: 15, fontWeight: '900' },
  ageValue: { flexShrink: 1, marginLeft: 14, color: '#746D7A', fontSize: 14, textAlign: 'right' },
  save: { minHeight: 58, marginTop: 28, paddingHorizontal: 22, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7256B6' },
  saveDisabled: { opacity: 0.65 },
  saveText: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  pressed: { opacity: 0.78 },
  messageState: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  messageText: { marginTop: 16, color: '#403945', fontSize: 21, lineHeight: 29, fontWeight: '900', textAlign: 'center' },
});
