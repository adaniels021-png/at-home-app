import { Redirect, Stack } from 'expo-router';

import { canUseHelpNowGeneral } from '../../lib/caregiverPermissions';
import { useChild } from '../../lib/SelectedChildContext';

export default function HelpNowLayout() {
  const { loading, selectedChild } = useChild();
  if (loading) return null;
  if (!canUseHelpNowGeneral(selectedChild?.caregiver_access_role)) {
    return <Redirect href="/safety/emergency/elopement" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
