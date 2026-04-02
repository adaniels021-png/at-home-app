import Purchases from 'react-native-purchases';

export async function checkSubscriptionStatus(): Promise<boolean> {
  // MOCK OVERRIDE: While we wait for Apple Enrollment
  if (__DEV__) {
    console.log("🛠️ Dev Mode: Mocking Pro Subscription as ACTIVE");
    return true; 
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch (e) {
    return false;
  }
}
