import { Redirect, Stack, useSegments } from 'expo-router';

import { canUseElopementResponse, canViewSafetyProfile } from '../../lib/caregiverPermissions';
import { useChild } from '../../lib/SelectedChildContext';

export default function SafetyLayout() {
  const segments = useSegments();
  const { loading, selectedChild } = useChild();
  const role = selectedChild?.caregiver_access_role;
  const isEmergencyRoute = segments.includes('emergency');

  if (loading) return null;
  if (isEmergencyRoute && !canUseElopementResponse(role)) {
    return <Redirect href="/(tabs)" />;
  }
  if (!isEmergencyRoute && !canViewSafetyProfile(role)) {
    return canUseElopementResponse(role)
      ? <Redirect href="/safety/emergency/elopement" />
      : <Redirect href="/(tabs)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
