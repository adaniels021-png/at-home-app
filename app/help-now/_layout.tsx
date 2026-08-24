import { Redirect, Stack } from 'expo-router';

import { canUseHelpNowGeneral } from '../../lib/caregiverPermissions';
import { useChild } from '../../lib/SelectedChildContext';
import { useChildSubscription } from '../../lib/ChildSubscriptionContext';

export default function HelpNowLayout() {
  const { loading, selectedChild } = useChild();
  const { isPro, loading: subscriptionLoading } = useChildSubscription();
  if (loading || subscriptionLoading) return null;
  if (!isPro) return <Redirect href="/(tabs)" />;
  if (!canUseHelpNowGeneral(selectedChild?.caregiver_access_role)) {
    return <Redirect href="/safety/emergency/elopement" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
