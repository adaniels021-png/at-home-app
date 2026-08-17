import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { supabase } from './supabase';

const APPLE_API_KEY = process.env.EXPO_PUBLIC_RC_APPLE_API_KEY;
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_RC_GOOGLE_API_KEY;
const TEST_STORE_API_KEY = process.env.EXPO_PUBLIC_RC_TEST_STORE_API_KEY;
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID || 'pro';

let configured = false;
let configuringPromise: Promise<void> | null = null;
let revenueCatAvailable = true;
let currentRevenueCatAppUserId: string | null = null;
let lastAuthoritativeReconciliationAt = 0;
let authoritativeReconciliationPromise: Promise<boolean> | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function getRevenueCatApiKey(): string | null {
  if (isExpoGo()) {
    return TEST_STORE_API_KEY || null;
  }

  if (Platform.OS === 'ios') {
    return APPLE_API_KEY || null;
  }

  if (Platform.OS === 'android') {
    return GOOGLE_API_KEY || null;
  }

  return null;
}

async function isNativeRevenueCatConfigured(): Promise<boolean> {
  try {
    return await Purchases.isConfigured();
  } catch {
    return false;
  }
}

async function getCurrentSupabaseUserId(): Promise<string | undefined> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id;
  } catch {
    return undefined;
  }
}

export async function configureRevenueCat(): Promise<void> {
  if (configured) return;

  if (configuringPromise) {
    await configuringPromise;
    return;
  }

  configuringPromise = (async () => {
    const apiKey = getRevenueCatApiKey();

    if (!apiKey) {
      revenueCatAvailable = false;

      if (isExpoGo()) {
        console.log(
          'RevenueCat skipped in Expo Go: add EXPO_PUBLIC_RC_TEST_STORE_API_KEY or use a development build.'
        );
      } else if (Platform.OS === 'android') {
        console.log(
          'RevenueCat skipped on Android: missing EXPO_PUBLIC_RC_GOOGLE_API_KEY.'
        );
      } else if (Platform.OS === 'ios') {
        console.log(
          'RevenueCat skipped on iOS: missing EXPO_PUBLIC_RC_APPLE_API_KEY.'
        );
      } else {
        console.log('RevenueCat skipped: unsupported platform.');
      }

      return;
    }

    try {
      const alreadyConfigured = await isNativeRevenueCatConfigured();

      if (alreadyConfigured) {
        configured = true;
        revenueCatAvailable = true;

        try {
          currentRevenueCatAppUserId = await Purchases.getAppUserID();
        } catch {
          // Force the authenticated-user login path before reading entitlements.
          currentRevenueCatAppUserId = null;
        }
        return;
      }

      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

      const appUserID = await getCurrentSupabaseUserId();

      Purchases.configure({
        apiKey,
        appUserID,
      });

      configured = true;
      revenueCatAvailable = true;
      currentRevenueCatAppUserId = appUserID ?? null;

      console.log(
        `RevenueCat configured for ${
          isExpoGo() ? 'Expo Go/Test Store' : Platform.OS
        }.`
      );
    } catch (error) {
      revenueCatAvailable = false;
      configured = false;
      console.error('RevenueCat configure failed:', error);
    }
  })();

  try {
    await configuringPromise;
  } finally {
    configuringPromise = null;
  }
}

export async function logInRevenueCat(appUserID: string): Promise<boolean> {
  await configureRevenueCat();

  if (!revenueCatAvailable || !configured || !appUserID) return false;

  try {
    if (currentRevenueCatAppUserId === appUserID) {
      return true;
    }

    await Purchases.logIn(appUserID);

    currentRevenueCatAppUserId = appUserID;
    return true;
  } catch (error) {
    console.error('RevenueCat login failed:', error);
    currentRevenueCatAppUserId = null;
    return false;
  }
}

export async function reconcileAuthoritativeEntitlement(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && now - lastAuthoritativeReconciliationAt < 15 * 60 * 1000) {
    return true;
  }
  if (authoritativeReconciliationPromise) {
    return authoritativeReconciliationPromise;
  }

  authoritativeReconciliationPromise = (async () => {
    try {
      const { error } = await supabase.functions.invoke(
        'reconcile-revenuecat-entitlement',
        { body: {} }
      );

      if (error) {
        console.error('Authoritative entitlement reconciliation failed:', error);
        return false;
      }

      lastAuthoritativeReconciliationAt = now;
      return true;
    } catch (error) {
      console.error('Authoritative entitlement reconciliation failed:', error);
      return false;
    }
  })();

  try {
    return await authoritativeReconciliationPromise;
  } finally {
    authoritativeReconciliationPromise = null;
  }
}

export async function logOutRevenueCat(): Promise<void> {
  await configureRevenueCat();

  if (!revenueCatAvailable || !configured) return;

  try {
    const isAnonymous = await Purchases.isAnonymous();

    if (isAnonymous) {
      currentRevenueCatAppUserId = null;
      return;
    }

    await Purchases.logOut();
    currentRevenueCatAppUserId = null;
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('anonymous')) {
      currentRevenueCatAppUserId = null;
      return;
    }

    console.error('RevenueCat logout failed:', error);
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (!revenueCatAvailable || !configured) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('RevenueCat getCustomerInfo failed:', error);
    return null;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  await configureRevenueCat();

  if (!revenueCatAvailable || !configured) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('RevenueCat getOfferings failed:', error);
    return null;
  }
}

export function hasRevenueCatProEntitlement(
  customerInfo: CustomerInfo | null | undefined
): boolean {
  if (!customerInfo) return false;

  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

export async function isProUser(): Promise<boolean> {
  const info = await getCustomerInfo();
  return hasRevenueCatProEntitlement(info);
}

function isCancelledPurchaseError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();

  return (
    message.includes('cancelled') ||
    message.includes('canceled') ||
    message.includes('purchase was cancelled')
  );
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (!revenueCatAvailable || !configured) return null;

  try {
    const result = await Purchases.purchasePackage(pkg);

    void reconcileAuthoritativeEntitlement(true);

    return result.customerInfo;
  } catch (error) {
    if (isCancelledPurchaseError(error)) {
      console.log('RevenueCat purchase cancelled by user.');
      return null;
    }

    console.error('RevenueCat purchase failed:', error);
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (!revenueCatAvailable || !configured) return null;

  try {
    const info = await Purchases.restorePurchases();

    void reconcileAuthoritativeEntitlement(true);

    return info;
  } catch (error) {
    console.error('RevenueCat restore failed:', error);
    return null;
  }
}

export { ENTITLEMENT_ID };
