import { supabase } from '../supabase';
import type { EmergencyContact, LocationConnectionMode, LocationSource, LocationSourceType } from './types';

export type SafetyEmergencyContact = EmergencyContact & { isPrimary: boolean };
export type SafetyLocationSourceType = LocationSourceType;
export type SafetyLocationConnectionMode = Extract<LocationConnectionMode, 'manual' | 'external_launch'>;
export type SafetyLocationSource = LocationSource & { connectionMode: SafetyLocationConnectionMode };

type ContactRow = { id: string; child_id: string; name: string; relationship: string | null; phone: string | null; email: string | null; is_primary: boolean; notes: string | null };
type LocationRow = { id: string; child_id: string; label: string; source_type: SafetyLocationSourceType; provider_name: string | null; device_name: string | null; connection_mode: SafetyLocationConnectionMode; launch_uri: string | null; web_url: string | null; notes: string | null };

const clean = (value: string | null) => value?.trim() || undefined;
const mapContact = (row: ContactRow): SafetyEmergencyContact => ({ id: row.id, childId: row.child_id, name: row.name, relationship: clean(row.relationship), phone: clean(row.phone), email: clean(row.email), isPrimary: row.is_primary, notes: clean(row.notes) });
const mapLocation = (row: LocationRow): SafetyLocationSource => ({ id: row.id, childId: row.child_id, label: row.label, sourceType: row.source_type, providerName: clean(row.provider_name), deviceName: clean(row.device_name), connectionMode: row.connection_mode, launchUri: clean(row.launch_uri), webUrl: clean(row.web_url), notes: clean(row.notes) });

export async function loadEmergencyContacts(childId: string) {
  const { data, error } = await supabase.from('child_safety_emergency_contacts').select('*').eq('child_id', childId).order('is_primary', { ascending: false }).order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => mapContact(row as ContactRow));
}

export async function saveEmergencyContact(childId: string, input: Omit<SafetyEmergencyContact, 'id' | 'childId'>, id?: string) {
  const payload = { child_id: childId, name: input.name.trim(), relationship: clean(input.relationship ?? null), phone: clean(input.phone ?? null), email: clean(input.email ?? null), is_primary: false, notes: clean(input.notes ?? null) };
  const query = id ? supabase.from('child_safety_emergency_contacts').update(payload).eq('id', id).eq('child_id', childId) : supabase.from('child_safety_emergency_contacts').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  const contact = mapContact(data as ContactRow);
  if (input.isPrimary) { const { error: primaryError } = await supabase.rpc('set_primary_safety_contact', { target_child_id: childId, target_contact_id: contact.id }); if (primaryError) throw primaryError; }
  return contact;
}

export async function deleteEmergencyContact(childId: string, id: string) {
  const { error } = await supabase.from('child_safety_emergency_contacts').delete().eq('child_id', childId).eq('id', id);
  if (error) throw error;
}

export async function loadLocationSources(childId: string) {
  const { data, error } = await supabase.from('child_safety_location_sources').select('*').eq('child_id', childId).order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => mapLocation(row as LocationRow));
}

export async function saveLocationSource(childId: string, input: Omit<SafetyLocationSource, 'id' | 'childId'>, id?: string) {
  const payload = { child_id: childId, label: input.label.trim(), source_type: input.sourceType, provider_name: clean(input.providerName ?? null), device_name: clean(input.deviceName ?? null), connection_mode: input.connectionMode, launch_uri: clean(input.launchUri ?? null), web_url: clean(input.webUrl ?? null), notes: clean(input.notes ?? null) };
  const query = id ? supabase.from('child_safety_location_sources').update(payload).eq('id', id).eq('child_id', childId) : supabase.from('child_safety_location_sources').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return mapLocation(data as LocationRow);
}

export async function deleteLocationSource(childId: string, id: string) {
  const { error } = await supabase.from('child_safety_location_sources').delete().eq('child_id', childId).eq('id', id);
  if (error) throw error;
}
