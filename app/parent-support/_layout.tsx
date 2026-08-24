import { Redirect, Stack } from 'expo-router';

import { useChildSubscription } from '../../lib/ChildSubscriptionContext';
import { useChild } from '../../lib/SelectedChildContext';
import { canUseHelpNowGeneral } from '../../lib/caregiverPermissions';

export default function ParentSupportLayout() {
  const { selectedChild, loading: childLoading } = useChild();
  const { isPro, loading: subscriptionLoading } = useChildSubscription();

  if (childLoading || subscriptionLoading) return null;
  if (!isPro || !canUseHelpNowGeneral(selectedChild?.caregiver_access_role)) {
    return <Redirect href="/(tabs)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
