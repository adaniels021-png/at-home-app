import { supabase } from '../supabase';

export type SafetyIncident = {
  id: string;
  childId: string;
  incidentType: 'elopement' | 'aggression' | 'self_injury' | 'medical' | 'other';
  status: 'active' | 'resolved';
  startedAt: string;
  startedByUserId: string;
  resolvedAt?: string;
  currentClothing?: string;
  lastSeenTime?: string;
  lastSeenPlaceLabel?: string;
  lastSeenLatitude?: number;
  lastSeenLongitude?: number;
};

export type SafetySighting = {
  id: string;
  incidentId: string;
  reportedAt: string;
  reportedByUserId: string;
  sightingTime: string;
  placeLabel: string;
  notes?: string;
};

export type SafetySearchCheck = {
  id: string;
  incidentId: string;
  placeKey: string;
  placeLabel: string;
  checkedAt: string;
  checkedByUserId: string;
};

type IncidentRow = {
  id: string; child_id: string; incident_type: SafetyIncident['incidentType'];
  status: SafetyIncident['status']; started_at: string; started_by_user_id: string;
  resolved_at: string | null; current_clothing: string | null; last_seen_time: string | null;
  last_seen_place_label: string | null; last_seen_latitude: number | null; last_seen_longitude: number | null;
};

const INCIDENT_SELECT = 'id,child_id,incident_type,status,started_at,started_by_user_id,resolved_at,current_clothing,last_seen_time,last_seen_place_label,last_seen_latitude,last_seen_longitude';

const mapIncident = (row: IncidentRow): SafetyIncident => ({
  id: row.id, childId: row.child_id, incidentType: row.incident_type, status: row.status,
  startedAt: row.started_at, startedByUserId: row.started_by_user_id,
  resolvedAt: row.resolved_at ?? undefined, currentClothing: row.current_clothing ?? undefined,
  lastSeenTime: row.last_seen_time ?? undefined, lastSeenPlaceLabel: row.last_seen_place_label ?? undefined,
  lastSeenLatitude: row.last_seen_latitude ?? undefined, lastSeenLongitude: row.last_seen_longitude ?? undefined,
});

export function parseApproximateLocalTime(value: string, now = new Date()) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const candidateHours = hour >= 1 && hour <= 12 ? [hour % 12, (hour % 12) + 12] : [hour];
  const candidates = candidateHours.flatMap((candidateHour) => [0, -1].map((dayOffset) => {
    const date = new Date(now); date.setDate(date.getDate() + dayOffset); date.setHours(candidateHour, minute, 0, 0); return date;
  })).filter((date) => date.getTime() <= now.getTime()).sort((a, b) => b.getTime() - a.getTime());
  return candidates[0]?.toISOString() ?? null;
}

export async function loadActiveElopementIncident(childId: string) {
  const { data, error } = await supabase.from('safety_emergency_incidents').select(INCIDENT_SELECT)
    .eq('child_id', childId).eq('incident_type', 'elopement').eq('status', 'active').maybeSingle();
  if (error) throw error;
  return data ? mapIncident(data as IncidentRow) : null;
}

export async function loadSafetyIncident(incidentId: string) {
  const { data, error } = await supabase.from('safety_emergency_incidents').select(INCIDENT_SELECT)
    .eq('id', incidentId).maybeSingle();
  if (error) throw error;
  return data ? mapIncident(data as IncidentRow) : null;
}

export async function startOrJoinElopementIncident(childId: string) {
  const existing = await loadActiveElopementIncident(childId);
  if (existing) return existing;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('Authentication required');
  const { data, error } = await supabase.from('safety_emergency_incidents').insert({
    child_id: childId, incident_type: 'elopement', status: 'active', started_by_user_id: authData.user.id,
  }).select(INCIDENT_SELECT).single();
  if (error?.code === '23505') {
    const joined = await loadActiveElopementIncident(childId);
    if (joined) return joined;
  }
  if (error) throw error;
  return mapIncident(data as IncidentRow);
}

export async function updateSafetyIncident(incidentId: string, values: {
  currentClothing?: string | null; lastSeenTime?: string | null; lastSeenPlaceLabel?: string | null;
  lastSeenLatitude?: number | null; lastSeenLongitude?: number | null;
}) {
  const payload = {
    ...(values.currentClothing !== undefined ? { current_clothing: values.currentClothing } : {}),
    ...(values.lastSeenTime !== undefined ? { last_seen_time: values.lastSeenTime } : {}),
    ...(values.lastSeenPlaceLabel !== undefined ? { last_seen_place_label: values.lastSeenPlaceLabel } : {}),
    ...(values.lastSeenLatitude !== undefined ? { last_seen_latitude: values.lastSeenLatitude } : {}),
    ...(values.lastSeenLongitude !== undefined ? { last_seen_longitude: values.lastSeenLongitude } : {}),
  };
  const { data, error } = await supabase.from('safety_emergency_incidents').update(payload)
    .eq('id', incidentId).eq('status', 'active').select(INCIDENT_SELECT).single();
  if (error) throw error;
  return mapIncident(data as IncidentRow);
}

export async function resolveSafetyIncident(incidentId: string) {
  const { error } = await supabase.rpc('resolve_safety_incident', { target_incident_id: incidentId });
  if (error) throw error;
}

export async function loadSightings(incidentId: string): Promise<SafetySighting[]> {
  const { data, error } = await supabase.from('safety_incident_sightings').select('*')
    .eq('incident_id', incidentId).order('sighting_time', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, incidentId: row.incident_id, reportedAt: row.reported_at,
    reportedByUserId: row.reported_by_user_id, sightingTime: row.sighting_time,
    placeLabel: row.place_label, notes: row.notes ?? undefined }));
}

export async function addSighting(incidentId: string, input: { placeLabel: string; sightingTime: string; notes?: string }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('Authentication required');
  const { error } = await supabase.from('safety_incident_sightings').insert({ incident_id: incidentId,
    reported_by_user_id: authData.user.id, place_label: input.placeLabel,
    sighting_time: input.sightingTime, notes: input.notes?.trim() || null });
  if (error) throw error;
}

export async function loadSearchChecks(incidentId: string): Promise<SafetySearchCheck[]> {
  const { data, error } = await supabase.from('safety_incident_search_checks').select('*').eq('incident_id', incidentId);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, incidentId: row.incident_id, placeKey: row.place_key,
    placeLabel: row.place_label, checkedAt: row.checked_at, checkedByUserId: row.checked_by_user_id }));
}

export async function setSearchCheck(incidentId: string, placeKey: string, placeLabel: string, checked: boolean) {
  if (!checked) {
    const { error } = await supabase.from('safety_incident_search_checks').delete()
      .eq('incident_id', incidentId).eq('place_key', placeKey);
    if (error) throw error;
    return;
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('Authentication required');
  const { error } = await supabase.from('safety_incident_search_checks').upsert({ incident_id: incidentId,
    place_key: placeKey, place_label: placeLabel, checked_by_user_id: authData.user.id, checked_at: new Date().toISOString() },
  { onConflict: 'incident_id,place_key' });
  if (error) throw error;
}

let safetySubscriberSequence = 0;

export function subscribeToIncident(incidentId: string, onChange: () => void) {
  safetySubscriberSequence += 1;
  const subscriberId = safetySubscriberSequence;
  // Each mounted screen owns a unique channel. Supabase may otherwise return an
  // existing subscribed channel, which cannot accept additional callbacks.
  const channel = supabase.channel(`safety-incident-${incidentId}-${subscriberId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_emergency_incidents', filter: `id=eq.${incidentId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_incident_sightings', filter: `incident_id=eq.${incidentId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_incident_search_checks', filter: `incident_id=eq.${incidentId}` }, onChange)
    .subscribe();
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    void supabase.removeChannel(channel);
  };
}
