import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../supabase';
import { loadActiveElopementIncident, loadSightings, type SafetyIncident, type SafetySighting } from '../incidentData';
import { APPROACH_GUIDANCE, COMMUNICATION_METHODS, HARDER_TRIGGERS, HELPFUL_SUPPORTS, labelsFor, RESPONDS_TO_NAME, SAFETY_CONCERNS, UNDERSTANDING_SUPPORTS, WANDERING_DESTINATIONS, WANDERING_PATTERNS } from '../profileConfig';
import { createSafetyPhotoSignedUrl, loadSafetyProfile } from '../profileData';
import { getSafetyAccess } from '../safetyAccess';
import type { SafetyProfile } from '../types';
import { loadEmergencyContacts, loadLocationSources } from '../preparednessData';

export type EmergencyPdfSection = { title: string; lines: string[] };
export type EmergencyPdfData = {
  generatedAt: string;
  child: { name: string; age?: string; photoDataUri?: string; identification: string[] };
  sections: EmergencyPdfSection[];
  incident?: SafetyIncident & { missingDuration: string; sightings: SafetySighting[] };
};

type ChildRow = { child_name?: string | null; name?: string | null; first_name?: string | null; age?: number | string | null; child_age?: number | string | null };

const compact = (values: (string | undefined | null | false)[]) => values.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));
const joinLabels = (ids: string[] | undefined, choices: Parameters<typeof labelsFor>[1]) => labelsFor(ids, choices).join(', ');
const responseLabel = (value?: string) => value ? labelsFor([value], RESPONDS_TO_NAME)[0] : undefined;
const elapsed = (from: string, now: Date) => {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(from).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

async function loadPhotoDataUri(photoPath?: string) {
  if (!photoPath || !FileSystem.cacheDirectory) return undefined;
  let temporaryUri: string | undefined;
  try {
    const signedUrl = await createSafetyPhotoSignedUrl(photoPath);
    if (!signedUrl) return undefined;
    const extension = photoPath.toLowerCase().endsWith('.png') ? 'png' : photoPath.toLowerCase().endsWith('.webp') ? 'webp' : 'jpeg';
    temporaryUri = `${FileSystem.cacheDirectory}safety-profile-${Date.now()}.${extension === 'jpeg' ? 'jpg' : extension}`;
    await FileSystem.downloadAsync(signedUrl, temporaryUri);
    const base64 = await FileSystem.readAsStringAsync(temporaryUri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:image/${extension};base64,${base64}`;
  } catch {
    return undefined;
  } finally {
    if (temporaryUri) await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
  }
}

function composeSections(profile: SafetyProfile | null): EmergencyPdfSection[] {
  if (!profile) return [];
  const communication = compact([
    joinLabels(profile.communication?.methods, COMMUNICATION_METHODS), profile.communication?.methodsOther,
    responseLabel(profile.communication?.respondsToName) && `Responds when name is called: ${responseLabel(profile.communication?.respondsToName)}`,
    profile.communication?.canShareName && ({ yes: 'Can usually tell someone their name or caregiver’s name.', sometimes: 'May be able to tell someone their name or caregiver’s name.', 'not-usually': 'May not be able to tell someone their name or caregiver’s name.', unknown: 'It is not known whether they can share their name or caregiver’s name.' } as const)[profile.communication.canShareName],
    joinLabels(profile.communication?.understandingSupports, UNDERSTANDING_SUPPORTS) && `Helps with understanding: ${joinLabels(profile.communication?.understandingSupports, UNDERSTANDING_SUPPORTS)}`,
    profile.communication?.understandingSupportsOther, profile.communication?.helpfulPhrases && `Helpful words or phrases: ${profile.communication.helpfulPhrases}`,
  ]);
  const approach = compact([joinLabels(profile.approach?.guidance, APPROACH_GUIDANCE), profile.approach?.guidanceOther, profile.approach?.notes]);
  const wandering = compact([
    profile.wandering?.history && `Wandering history: ${profile.wandering.history === 'yes' ? 'Yes' : profile.wandering.history === 'no' ? 'No' : 'Caregiver is not sure'}`,
    joinLabels(profile.wandering?.patterns, WANDERING_PATTERNS) && `Patterns: ${joinLabels(profile.wandering?.patterns, WANDERING_PATTERNS)}`,
    profile.wandering?.patternsOther,
    joinLabels(profile.wandering?.destinations, WANDERING_DESTINATIONS) && `Likely destinations: ${joinLabels(profile.wandering?.destinations, WANDERING_DESTINATIONS)}`,
    profile.wandering?.destinationsOther,
    joinLabels(profile.wandering?.safetyConcerns, SAFETY_CONCERNS) && `Safety concerns: ${joinLabels(profile.wandering?.safetyConcerns, SAFETY_CONCERNS)}`,
    profile.wandering?.safetyConcernsOther,
  ]);
  const calming = compact([
    joinLabels(profile.regulation?.harderTriggers, HARDER_TRIGGERS) && `May be harder with: ${joinLabels(profile.regulation?.harderTriggers, HARDER_TRIGGERS)}`,
    profile.regulation?.harderTriggersOther,
    joinLabels(profile.regulation?.helpfulSupports, HELPFUL_SUPPORTS) && `May help: ${joinLabels(profile.regulation?.helpfulSupports, HELPFUL_SUPPORTS)}`,
    profile.regulation?.helpfulSupportsOther,
  ]);
  return [
    { title: 'COMMUNICATION', lines: communication }, { title: 'HOW TO APPROACH', lines: approach },
    { title: 'WANDERING & SAFETY', lines: wandering }, { title: 'CALMING & SENSORY SUPPORT', lines: calming },
    { title: 'HEALTH & SAFETY', lines: compact([profile.importantHealthSafetyNotes]) },
    { title: 'ADDITIONAL INFORMATION', lines: compact([profile.additionalNotes]) },
  ].filter((section) => section.lines.length > 0);
}

export async function composeEmergencyPdfData(childId: string, options?: { includeActiveIncident?: boolean }): Promise<EmergencyPdfData> {
  const access = await getSafetyAccess(childId);
  const mayUseIncident = Boolean(options?.includeActiveIncident && access.canParticipateInSafetyIncident);
  if (!access.canViewSafetyProfile && !mayUseIncident) throw new Error('Safety access required');

  const [{ data: child, error: childError }, profile, incident, contacts, locationSources] = await Promise.all([
    supabase.from('children').select('*').eq('id', childId).single(),
    access.canViewSafetyProfile ? loadSafetyProfile(childId) : Promise.resolve(null),
    mayUseIncident ? loadActiveElopementIncident(childId) : Promise.resolve(null),
    access.canViewSafetyProfile ? loadEmergencyContacts(childId) : Promise.resolve([]),
    access.canViewSafetyProfile ? loadLocationSources(childId) : Promise.resolve([]),
  ]);
  if (childError) throw childError;
  const childRow = child as ChildRow;
  const now = new Date();
  const sightings = incident ? await loadSightings(incident.id) : [];
  const photoDataUri = access.canViewSafetyProfile ? await loadPhotoDataUri(profile?.photoPath) : undefined;
  const physical = profile?.physicalDescription;
  const name = profile?.preferredName || childRow.child_name || childRow.name || childRow.first_name || 'Child';
  const ageValue = childRow.age ?? childRow.child_age;
  return {
    generatedAt: now.toISOString(),
    child: {
      name, age: ageValue === null || ageValue === undefined ? undefined : String(ageValue), photoDataUri,
      identification: compact([physical?.height && `Height: ${physical.height}`, physical?.weight && `Approximate weight: ${physical.weight}`, physical?.hair && `Hair: ${physical.hair}`, physical?.eyes && `Eyes: ${physical.eyes}`, physical?.identifyingFeatures && `Identifying features: ${physical.identifyingFeatures}`]),
    },
    sections: [
      ...composeSections(profile),
      ...(contacts.length ? [{ title: 'EMERGENCY CONTACTS', lines: contacts.flatMap((contact) => compact([`${contact.name}${contact.isPrimary ? ' — Primary' : ''}`, contact.relationship, contact.phone, contact.email])) }] : []),
      ...(locationSources.length ? [{ title: 'LOCATION SUPPORT', lines: [...locationSources.flatMap((source) => compact([source.label, source.providerName || source.deviceName])), 'Location is checked using the family’s external location service. ABA at Home does not independently track the child.'] }] : []),
    ],
    incident: incident ? { ...incident, missingDuration: elapsed(incident.lastSeenTime || incident.startedAt, now), sightings } : undefined,
  };
}
