export type AppEntitlement =
  | 'getting_started'
  | 'lesson'
  | 'routines_view'
  | 'routines_customize'
  | 'routines_child_mode'
  | 'routines_print'
  | 'pecs_view'
  | 'pecs_customize'
  | 'activities'
  | 'activity'
  | 'worksheet'
  | 'worksheets'
  | 'worksheet_downloads'
  | 'multi_child'
  | 'manage_caregivers'
  | 'parent_support'
  | 'premium_tool';

export type EntitlementContext = {
  isPro: boolean;
};

export type EntitlementResource = {
  proOnly?: boolean | null;
  isPro?: boolean | null;
};

export type LessonEntitlementResource = {
  pro_only?: boolean | null;
};

export type WorksheetEntitlementResource = {
  is_pro?: boolean | null;
};

export type ActivityEntitlementResource = {
  pro_only?: boolean | null;
};

const FREE_FEATURES = new Set<AppEntitlement>([
  'getting_started',
  'routines_view',
  'pecs_view',
]);

export function hasEntitlement(
  context: EntitlementContext,
  entitlement: AppEntitlement,
  resource: EntitlementResource = {}
): boolean {
  if (context.isPro) return true;

  if (entitlement === 'worksheet') {
    return resource.isPro === false;
  }

  if (entitlement === 'lesson' || entitlement === 'activity') {
    return resource.proOnly === false;
  }

  return FREE_FEATURES.has(entitlement);
}

export function canAccessLesson(
  isProSubscriber: boolean,
  lesson: LessonEntitlementResource
): boolean {
  return hasEntitlement(
    { isPro: isProSubscriber },
    'lesson',
    { proOnly: lesson.pro_only }
  );
}

export function canAccessWorksheet(
  isProSubscriber: boolean,
  worksheet: WorksheetEntitlementResource
): boolean {
  return hasEntitlement(
    { isPro: isProSubscriber },
    'worksheet',
    { isPro: worksheet.is_pro }
  );
}

export function canAccessActivity(
  isProSubscriber: boolean,
  activity: ActivityEntitlementResource
): boolean {
  return hasEntitlement(
    { isPro: isProSubscriber },
    'activity',
    { proOnly: activity.pro_only }
  );
}

const PREMIUM_ROUTE_ENTITLEMENTS: readonly {
  route: string;
  entitlement: AppEntitlement;
}[] = [
  { route: '/routine-printables', entitlement: 'routines_print' },
  { route: '/routines/practice', entitlement: 'routines_child_mode' },
  { route: '/routines/customize', entitlement: 'routines_customize' },
  { route: '/manage-pecs', entitlement: 'pecs_customize' },
  { route: '/pecs-creator', entitlement: 'pecs_customize' },
  { route: '/settings/manage-caregivers', entitlement: 'manage_caregivers' },
  { route: '/settings/invite-caregiver', entitlement: 'manage_caregivers' },
  { route: '/parent-support/emotional-reset', entitlement: 'parent_support' },
  { route: '/parent-support/journal', entitlement: 'parent_support' },
  { route: '/parent-support/journal-entry', entitlement: 'parent_support' },
  { route: '/parent-support/journal-history', entitlement: 'parent_support' },
  { route: '/parent-support/daily-permission', entitlement: 'parent_support' },
  { route: '/parent-support/saved-reflections', entitlement: 'parent_support' },
  { route: '/parent-support/reflection-detail', entitlement: 'parent_support' },
];

export function getRouteEntitlement(pathname: string): AppEntitlement | null {
  const match = PREMIUM_ROUTE_ENTITLEMENTS.find(
    ({ route }) => pathname === route || pathname.startsWith(`${route}/`)
  );

  return match?.entitlement ?? null;
}

export function canAccessRoute(
  context: EntitlementContext,
  pathname: string
): boolean {
  const entitlement = getRouteEntitlement(pathname);
  return entitlement ? hasEntitlement(context, entitlement) : true;
}
