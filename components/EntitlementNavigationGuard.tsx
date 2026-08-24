import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useChildSubscription } from '../lib/ChildSubscriptionContext';
import {
  getRouteEntitlement,
  hasEntitlement,
} from '../lib/entitlements';

export default function EntitlementNavigationGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isPro, loading } = useChildSubscription();

  useEffect(() => {
    if (loading) return;

    const requiredEntitlement = getRouteEntitlement(pathname);

    if (
      requiredEntitlement &&
      !hasEntitlement({ isPro }, requiredEntitlement)
    ) {
      router.replace('/subscription');
    }
  }, [isPro, loading, pathname, router]);

  return null;
}
