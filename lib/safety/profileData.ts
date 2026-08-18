import { supabase } from '../supabase';
import type { SafetyProfile } from './types';

export const SAFETY_PHOTO_BUCKET = 'child-safety-photos';

type SafetyProfileRow = {
  id: string;
  child_id: string;
  preferred_name: string | null;
  photo_path: string | null;
  height: string | null;
  weight: string | null;
  hair_color: string | null;
  eye_color: string | null;
  identifying_features: string | null;
  communication_methods: string[] | null;
  communication_other: string | null;
  responds_to_name: 'yes' | 'sometimes' | 'not-usually' | 'unknown' | null;
  can_share_name: 'yes' | 'sometimes' | 'not-usually' | 'unknown' | null;
  communication_supports: string[] | null;
  communication_supports_other: string | null;
  helpful_phrases: string | null;
  approach_guidance: string[] | null;
  approach_guidance_other: string | null;
  approach_notes: string | null;
  wandering_history: 'yes' | 'no' | 'unknown' | null;
  wandering_patterns: string[] | null;
  wandering_patterns_other: string | null;
  wandering_destinations: string[] | null;
  wandering_destinations_other: string | null;
  safety_concerns: string[] | null;
  safety_concerns_other: string | null;
  sensory_challenges: string[] | null;
  sensory_challenges_other: string | null;
  regulation_supports: string[] | null;
  regulation_supports_other: string | null;
  important_health_safety_notes: string | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
};

const clean = (value: string | null) => value?.trim() || undefined;

export function mapSafetyProfile(row: SafetyProfileRow): SafetyProfile {
  return {
    id: row.id,
    childId: row.child_id,
    preferredName: clean(row.preferred_name),
    photoPath: clean(row.photo_path),
    physicalDescription: {
      height: clean(row.height),
      weight: clean(row.weight),
      hair: clean(row.hair_color),
      eyes: clean(row.eye_color),
      identifyingFeatures: clean(row.identifying_features),
    },
    communication: {
      methods: row.communication_methods ?? [],
      methodsOther: clean(row.communication_other),
      respondsToName: row.responds_to_name ?? undefined,
      canShareName: row.can_share_name ?? undefined,
      understandingSupports: row.communication_supports ?? [],
      understandingSupportsOther: clean(row.communication_supports_other),
      helpfulPhrases: clean(row.helpful_phrases),
    },
    approach: {
      guidance: row.approach_guidance ?? [],
      guidanceOther: clean(row.approach_guidance_other),
      notes: clean(row.approach_notes),
    },
    wandering: {
      history: row.wandering_history ?? undefined,
      patterns: row.wandering_patterns ?? [],
      patternsOther: clean(row.wandering_patterns_other),
      destinations: row.wandering_destinations ?? [],
      destinationsOther: clean(row.wandering_destinations_other),
      safetyConcerns: row.safety_concerns ?? [],
      safetyConcernsOther: clean(row.safety_concerns_other),
    },
    regulation: {
      harderTriggers: row.sensory_challenges ?? [],
      harderTriggersOther: clean(row.sensory_challenges_other),
      helpfulSupports: row.regulation_supports ?? [],
      helpfulSupportsOther: clean(row.regulation_supports_other),
    },
    importantHealthSafetyNotes: clean(row.important_health_safety_notes),
    additionalNotes: clean(row.additional_notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveChildAge(childId: string, age: number | null) {
  const { error } = await supabase
    .from('children')
    .update({ age })
    .eq('id', childId);
  if (error) throw error;
}

export async function loadSafetyProfile(childId: string) {
  const { data, error } = await supabase
    .from('child_safety_profiles')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSafetyProfile(data as SafetyProfileRow) : null;
}

export async function saveSafetyProfileSection(
  childId: string,
  values: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('child_safety_profiles')
    .upsert({ child_id: childId, ...values }, { onConflict: 'child_id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapSafetyProfile(data as SafetyProfileRow);
}

export async function createSafetyPhotoSignedUrl(photoPath?: string) {
  if (!photoPath) return null;
  const { data, error } = await supabase.storage
    .from(SAFETY_PHOTO_BUCKET)
    .createSignedUrl(photoPath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadSafetyPhoto(
  childId: string,
  uri: string,
  mimeType?: string | null
) {
  const extension = mimeType?.includes('png')
    ? 'png'
    : mimeType?.includes('webp')
      ? 'webp'
      : 'jpg';
  const path = `${childId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from(SAFETY_PHOTO_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType || 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;
  return path;
}

export async function removeSafetyPhoto(photoPath: string) {
  const { error } = await supabase.storage
    .from(SAFETY_PHOTO_BUCKET)
    .remove([photoPath]);
  if (error) throw error;
}
