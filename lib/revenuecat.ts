import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

const APPLE_API_KEY =
  process.env.EXPO_PUBLIC_RC_APPLE_API_KEY;

const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_RC_GOOGLE_API_KEY;

const TEST_STORE_API_KEY =
  process.env.EXPO_PUBLIC_RC_TEST_STORE_API_KEY;

const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID || 'pro';

let configured = false;
let configuringPromise: Promise<void> | null = null;
let revenueCatAvailable = true;

/**
 * Tracks the Supabase user ID we intentionally logged into.
 *
 * Do not use CustomerInfo.originalAppUserId for this check because
 * RevenueCat may preserve an older anonymous/original identifier.
 */
let currentRevenueCatAppUserId: string | null = null;

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

/**
 * Configure the native RevenueCat SDK.
 *
 * This function does not query Supabase. Authentication is handled by
 * the root layout, which can pass the known user ID into this function.
 */
export async function configureRevenueCat(
  appUserID?: string
): Promise<void> {
  if (configured) {
    return;
  }

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
        console.log(
          'RevenueCat skipped: unsupported platform.'
        );
      }

      return;
    }

    try {
      const alreadyConfigured =
        await isNativeRevenueCatConfigured();

      if (alreadyConfigured) {
        configured = true;
        revenueCatAvailable = true;
        return;
      }

      /**
       * Avoid verbose RevenueCat logging in production builds.
       */
      Purchases.setLogLevel(
        __DEV__
          ? LOG_LEVEL.DEBUG
          : LOG_LEVEL.ERROR
      );

      Purchases.configure({
        apiKey,
        appUserID: appUserID || undefined,
      });

      configured = true;
      revenueCatAvailable = true;
      currentRevenueCatAppUserId =
        appUserID || null;

      console.log(
        `RevenueCat configured for ${
          isExpoGo()
            ? 'Expo Go/Test Store'
            : Platform.OS
        }.`
      );
    } catch (error) {
      revenueCatAvailable = false;
      configured = false;

      console.error(
        'RevenueCat configure failed:',
        error
      );
    }
  })();

  try {
    await configuringPromise;
  } finally {
    configuringPromise = null;
  }
}

/**
 * Connect the authenticated Supabase user to RevenueCat.
 */
export async function logInRevenueCat(
  appUserID: string
): Promise<void> {
  if (!appUserID) return;

  /**
   * Configure with the known user ID when possible. This avoids first
   * configuring anonymously and immediately performing a second login.
   */
  await configureRevenueCat(appUserID);

  if (
    !revenueCatAvailable ||
    !configured
  ) {
    return;
  }

  try {
    if (
      currentRevenueCatAppUserId === appUserID
    ) {
      return;
    }

    await Purchases.logIn(appUserID);

    /**
     * Track the ID that we explicitly requested, rather than
     * CustomerInfo.originalAppUserId.
     */
    currentRevenueCatAppUserId = appUserID;
  } catch (error) {
    console.error(
      'RevenueCat login failed:',
      error
    );
  }
}

export async function logOutRevenueCat(): Promise<void> {
  await configureRevenueCat();

  if (
    !revenueCatAvailable ||
    !configured
  ) {
    return;
  }

  try {
    const isAnonymous =
      await Purchases.isAnonymous();

    if (isAnonymous) {
      currentRevenueCatAppUserId = null;
      return;
    }

    await Purchases.logOut();

    currentRevenueCatAppUserId = null;
  } catch (error: any) {
    const message = String(
      error?.message || ''
    ).toLowerCase();

    if (message.includes('anonymous')) {
      currentRevenueCatAppUserId = null;
      return;
    }

    console.error(
      'RevenueCat logout failed:',
      error
    );
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (
    !revenueCatAvailable ||
    !configured
  ) {
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error(
      'RevenueCat getCustomerInfo failed:',
      error
    );

    return null;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  await configureRevenueCat();

  if (
    !revenueCatAvailable ||
    !configured
  ) {
    return null;
  }

  try {
    const offerings =
      await Purchases.getOfferings();

    return offerings.current;
  } catch (error) {
    console.error(
      'RevenueCat getOfferings failed:',
      error
    );

    return null;
  }
}

export function hasProAccess(
  customerInfo: CustomerInfo | null | undefined
): boolean {
  if (!customerInfo) {
    return false;
  }

  return Boolean(
    customerInfo.entitlements.active[
      ENTITLEMENT_ID
    ]
  );
}

export async function isProUser(): Promise<boolean> {
  const info = await getCustomerInfo();

  return hasProAccess(info);
}

function isCancelledPurchaseError(
  error: any
): boolean {
  const message = String(
    error?.message || ''
  ).toLowerCase();

  return (
    message.includes('cancelled') ||
    message.includes('canceled') ||
    message.includes(
      'purchase was cancelled'
    )
  );
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (
    !revenueCatAvailable ||
    !configured
  ) {
    return null;
  }

  try {
    const result =
      await Purchases.purchasePackage(pkg);

    return result.customerInfo;
  } catch (error) {
    if (isCancelledPurchaseError(error)) {
      console.log(
        'RevenueCat purchase cancelled by user.'
      );

      return null;
    }

    console.error(
      'RevenueCat purchase failed:',
      error
    );

    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (
    !revenueCatAvailable ||
    !configured
  ) {
    return null;
  }

  try {
    return await Purchases.restorePurchases();
  } catch (error) {
    console.error(
      'RevenueCat restore failed:',
      error
    );

    return null;
  }
}

export {
  ENTITLEMENT_ID
};
