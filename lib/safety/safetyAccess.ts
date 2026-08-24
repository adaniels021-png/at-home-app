import { supabase } from '../supabase';
import type { SafetyAccess } from './types';

// Every child-specific Safety feature must define its data owner, view and edit
// permissions, synchronization behavior, and permanent-vs-incident scope.
export async function getSafetyAccess(childId: string): Promise<SafetyAccess> {
  const [view, emergencyView, edit, mode, incident, alerts] = await Promise.all([
    supabase.rpc('can_access_child_safety', { target_child_id: childId }),
    supabase.rpc('has_child_permission', {
      target_child_id: childId,
      requested_permission: 'view_emergency_response_data',
    }),
    supabase.rpc('can_edit_child_safety', { target_child_id: childId }),
    supabase.rpc('can_use_child_safety_mode', { target_child_id: childId }),
    supabase.rpc('can_participate_child_safety_incident', {
      target_child_id: childId,
    }),
    supabase.rpc('should_receive_child_safety_alerts', { target_child_id: childId }),
  ]);

  const error = view.error || emergencyView.error || edit.error || mode.error || incident.error || alerts.error;
  if (error) throw error;

  return {
    canViewSafetyProfile: Boolean(view.data),
    canViewEmergencyResponseData: Boolean(emergencyView.data),
    canEditSafetyProfile: Boolean(edit.data),
    canUseSafetyMode: Boolean(mode.data),
    canParticipateInSafetyIncident: Boolean(incident.data),
    receiveSafetyAlerts: Boolean(alerts.data),
  };
}

export type CaregiverExperience =
  | 'parent-guardian'
  | 'trusted-caregiver'
  | 'temporary-caregiver'
  | 'provider';

export function getCaregiverExperience(role?: string | null): CaregiverExperience {
  if (role === 'owner' || role === 'parent') return 'parent-guardian';
  if (role === 'therapist') return 'provider';
  if (role === 'caregiver') return 'trusted-caregiver';
  return 'temporary-caregiver';
}
