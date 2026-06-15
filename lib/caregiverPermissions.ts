export type CaregiverRole = 'owner' | 'parent' | 'caregiver' | 'therapist';

export function canManageCaregivers(role?: string | null) {
  return role === 'owner';
}

export function canAddChild(role?: string | null) {
  return role === 'owner';
}

export function canDeleteChildProfile(role?: string | null) {
  return role === 'owner';
}

export function canManageSubscription(role?: string | null) {
  return role === 'owner';
}

export function canManagePecs(role?: string | null) {
  return role === 'owner' || role === 'parent';
}

export function canRunAssessments(role?: string | null) {
  return role === 'owner' || role === 'parent';
}

export function canDeleteOwnAccount(role?: string | null) {
  return role === 'owner';
}

export function canEditChildProfile(role?: string | null) {
  return role === 'owner' || role === 'parent';
}

export function canCustomizeRoutines(role?: string | null) {
  return role === 'owner' || role === 'parent' || role === 'caregiver';
}

export function canLogProgress(role?: string | null) {
  return (
    role === 'owner' ||
    role === 'parent' ||
    role === 'caregiver' ||
    role === 'therapist'
  );
}

export function canViewProgress(role?: string | null) {
  return true;
}

export function canUseParentSupport(role?: string | null) {
  return role === 'owner' || role === 'parent' || role === 'caregiver';
}

export function canDeleteChildData(role?: string | null) {
  return role === 'owner';
}

export function canManageLessonReminders(role?: string | null) {
  return role === 'owner' || role === 'parent';
}