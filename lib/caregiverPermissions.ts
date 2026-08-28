export type CaregiverRole = 'owner' | 'parent' | 'caregiver' | 'therapist';
export type ChildPermission = 'view_child' | 'edit_child_profile' | 'manage_caregivers' | 'view_learning_content' | 'use_communication_tools' | 'view_progress' | 'edit_progress' | 'use_elopement_response' | 'view_emergency_response_data' | 'view_safety_profile' | 'edit_safety_profile' | 'use_help_now_general' | 'manage_child_settings';
export type PermissionOverrides = Partial<Record<ChildPermission, boolean>>;

const ROLE_DEFAULTS: Record<CaregiverRole, ReadonlySet<ChildPermission>> = {
  owner: new Set(['view_child', 'edit_child_profile', 'manage_caregivers', 'view_learning_content', 'use_communication_tools', 'view_progress', 'edit_progress', 'use_elopement_response', 'view_emergency_response_data', 'view_safety_profile', 'edit_safety_profile', 'use_help_now_general', 'manage_child_settings']),
  parent: new Set(['view_child', 'edit_child_profile', 'view_learning_content', 'use_communication_tools', 'view_progress', 'edit_progress', 'use_elopement_response', 'view_emergency_response_data', 'view_safety_profile', 'edit_safety_profile', 'use_help_now_general', 'manage_child_settings']),
  caregiver: new Set(['view_child', 'view_learning_content', 'use_communication_tools', 'view_progress', 'edit_progress', 'use_elopement_response', 'view_emergency_response_data']),
  therapist: new Set(['view_child', 'view_learning_content', 'use_communication_tools', 'view_progress', 'edit_progress']),
};

export function normalizeCaregiverRole(role?: string | null): CaregiverRole | null {
  return role === 'owner' || role === 'parent' || role === 'caregiver' || role === 'therapist' ? role : null;
}

export function hasChildPermission(role: string | null | undefined, permission: ChildPermission, overrides?: PermissionOverrides | null) {
  const normalizedRole = normalizeCaregiverRole(role);
  if (!normalizedRole) return false;
  const override = overrides?.[permission];
  return typeof override === 'boolean' ? override : ROLE_DEFAULTS[normalizedRole].has(permission);
}

export const canViewChild = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'view_child', overrides);
export const canManageCaregivers = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'manage_caregivers', overrides);
export const canEditChildProfile = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'edit_child_profile', overrides);
export const canViewLearningContent = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'view_learning_content', overrides);
export const canUseCommunicationTools = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'use_communication_tools', overrides);
export const canViewProgress = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'view_progress', overrides);
export const canLogProgress = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'edit_progress', overrides);
export const canUseElopementResponse = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'use_elopement_response', overrides);
export const canViewEmergencyResponseData = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'view_emergency_response_data', overrides);
export const canViewSafetyProfile = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'view_safety_profile', overrides);
export const canEditSafetyProfile = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'edit_safety_profile', overrides);
export const canUseHelpNowGeneral = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'use_help_now_general', overrides);
export const canManageChildSettings = (role?: string | null, overrides?: PermissionOverrides | null) => hasChildPermission(role, 'manage_child_settings', overrides);

// Backward-compatible helpers used by existing screens.
export const canAddChild = (role?: string | null) => role === 'owner';
export const canDeleteChildProfile = (role?: string | null) => role === 'owner';
export const canManageSubscription = (role?: string | null) => role === 'owner';
export const canManagePecs = (role?: string | null) => role === 'owner' || role === 'parent';
export const canRunAssessments = (role?: string | null) => role === 'owner' || role === 'parent';
// Account ownership belongs to the authenticated adult, independently of any
// selected-child role. Route authentication and the server-derived deletion
// impact remain the authority for the destructive operation.
export const canDeleteOwnAccount = () => true;
export const canCustomizeRoutines = (role?: string | null) => role === 'owner' || role === 'parent' || role === 'caregiver';
export const canUseParentSupport = canUseHelpNowGeneral;
export const canDeleteChildData = (role?: string | null) => role === 'owner';
export const canManageLessonReminders = (role?: string | null) => role === 'owner' || role === 'parent';

export function selectAuthorizedChild<T extends { id: string }>(authorizedChildren: readonly T[], requestedChildId?: string | null): T | null {
  if (!authorizedChildren.length) return null;
  return authorizedChildren.find((child) => child.id === requestedChildId) ?? authorizedChildren[0];
}

export const CAREGIVER_ROLE_LABELS: Record<CaregiverRole, string> = {
  owner: 'Account Owner',
  parent: 'Parent',
  caregiver: 'Caregiver',
  therapist: 'Therapist',
};

export type RoleAccessSummary = { available: string[]; restricted: string[] };

export function getRoleAccessSummary(role?: string | null, overrides?: PermissionOverrides | null): RoleAccessSummary {
  const available: string[] = [];
  const restricted: string[] = [];
  if (canViewLearningContent(role, overrides)) available.push('Lessons and daily support');
  if (canUseCommunicationTools(role, overrides)) available.push('Communication tools');
  if (canViewProgress(role, overrides)) available.push('Progress tools');
  if (canUseElopementResponse(role, overrides)) available.push('Emergency and elopement response');
  if (canEditChildProfile(role, overrides)) available.push('Child profile editing');
  else restricted.push('Child profile editing');
  if (canViewSafetyProfile(role, overrides)) available.push('Full Safety Profile');
  else restricted.push('Full Safety Profile');
  if (canUseHelpNowGeneral(role, overrides)) available.push('General Help Now');
  else restricted.push('General Help Now');
  if (canManageCaregivers(role, overrides)) available.push('Caregiver management');
  else restricted.push('Caregiver management');
  if (!canManageChildSettings(role, overrides)) restricted.push('Child settings');
  return { available, restricted };
}
