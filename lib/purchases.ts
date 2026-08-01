import {
  getCustomerInfo,
  hasRevenueCatProEntitlement,
} from './revenuecat';

export async function checkSubscriptionStatus(): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  return hasRevenueCatProEntitlement(customerInfo);
}
