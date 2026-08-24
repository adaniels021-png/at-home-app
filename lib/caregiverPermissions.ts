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
export const canDeleteOwnAccount = (role?: string | null) => role === 'owner';
export const canCustomizeRoutines = (role?: string | null) => role === 'owner' || role === 'parent' || role === 'caregiver';
export const canUseParentSupport = canUseHelpNowGeneral;
export const canDeleteChildData = (role?: string | null) => role === 'owner';
export const canManageLessonReminders = (role?: string | null) => role === 'owner' || role === 'parent';

export function selectAuthorizedChild<T extends { id: string }>(authorizedChildren: readonly T[], requestedChildId?: string | null): T | null {
  if (!authorizedChildren.length) return null;
  return authorizedChildren.find((child) => child.id === requestedChildId) ?? authorizedChildren[0];
}
