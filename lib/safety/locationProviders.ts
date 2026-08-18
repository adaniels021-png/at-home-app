import { Alert, Linking, Platform } from 'react-native';
import type { SafetyLocationSource, SafetyLocationSourceType } from './preparednessData';

export type LocationProviderId = 'apple_find_my' | 'apple_device' | 'angelsense' | 'ticktalk' | 'gabb' | 'garmin_bounce' | 'life360' | 'jiobit' | 'dedicated_gps' | 'another_app' | 'other';
export type LocationLaunchStrategy = 'verified_web_portal' | 'official_app_destination' | 'manual';
export type LocationIntegrationMode = 'external' | 'aba_connected';
type PlatformDestinations = { ios?: string; android?: string };
type LaunchPlatform = 'ios' | 'android';

export type ProviderLaunchTarget =
  | { type: 'external'; url: string; strategy: Exclude<LocationLaunchStrategy, 'manual'>; fallbackInstructions: string }
  | { type: 'manual'; instructions: string };

export type LocationProvider = {
  id: LocationProviderId; displayName: string; selectionDescription?: string;
  deviceCategory: SafetyLocationSourceType; defaultAppName?: string;
  launchStrategy: LocationLaunchStrategy; verifiedWebUrl?: string;
  officialAppDestinations?: PlatformDestinations;
  manualInstruction: (childName: string) => string; actionLabel: string;
  directAppOpeningVerified: boolean; webAccessVerified: boolean;
  integrationMode: LocationIntegrationMode;
};

const appStores = {
  angelsense: { ios: 'https://apps.apple.com/us/app/angelsense-guardian/id1015546607', android: 'https://play.google.com/store/apps/details?id=com.angelsense.mobile' },
  ticktalk: { ios: 'https://apps.apple.com/us/app/ticktalk-kids-smartwatch/id1444054034', android: 'https://play.google.com/store/apps/details?id=com.xdreamllc.ticktalk3' },
  gabb: { ios: 'https://apps.apple.com/us/app/mygabb/id1509258260', android: 'https://play.google.com/store/apps/details?id=com.gabbwireless.mygabb' },
  garmin: { ios: 'https://apps.apple.com/us/app/garmin-jr/id1122225740', android: 'https://play.google.com/store/apps/details?id=com.garmin.android.apps.vivokid' },
  life360: { ios: 'https://apps.apple.com/us/app/life360-family-safety-gps/id384830320', android: 'https://play.google.com/store/apps/details?id=com.life360.android.safetymapd' },
  jiobit: { ios: 'https://apps.apple.com/us/app/jiobit-for-families/id1221059964', android: 'https://play.google.com/store/apps/details?id=com.jiobit.app' },
} satisfies Record<string, PlatformDestinations>;

const APPROVED_EXTERNAL_URLS = new Set([
  'https://www.icloud.com/find',
  'https://app.angelsense.com/',
  ...Object.values(appStores).flatMap(({ ios, android }) => [ios, android].filter((url): url is string => Boolean(url))),
]);
const external = 'external' as const;

export const LOCATION_PROVIDERS: LocationProvider[] = [
  { id: 'apple_find_my', displayName: 'Apple Find My', selectionDescription: 'AirTag, Apple Watch, iPhone, or another Find My device', deviceCategory: 'external_app', defaultAppName: 'Find My', launchStrategy: 'verified_web_portal', verifiedWebUrl: 'https://www.icloud.com/find', manualInstruction: () => 'Open Apple Find My to check this device.', actionLabel: 'Open Find My', directAppOpeningVerified: false, webAccessVerified: true, integrationMode: external },
  { id: 'apple_device', displayName: 'Apple Find My', selectionDescription: 'AirTag, Apple Watch, iPhone, or another Find My device', deviceCategory: 'smartwatch', defaultAppName: 'Find My', launchStrategy: 'verified_web_portal', verifiedWebUrl: 'https://www.icloud.com/find', manualInstruction: () => 'Open Apple Find My to check this device.', actionLabel: 'Open Find My', directAppOpeningVerified: false, webAccessVerified: true, integrationMode: external },
  { id: 'angelsense', displayName: 'AngelSense', deviceCategory: 'dedicated_gps', defaultAppName: 'AngelSense Guardian', launchStrategy: 'verified_web_portal', verifiedWebUrl: 'https://app.angelsense.com/', officialAppDestinations: appStores.angelsense, manualInstruction: (childName) => `Open AngelSense Guardian to check ${childName}’s device location.`, actionLabel: 'Open AngelSense', directAppOpeningVerified: false, webAccessVerified: true, integrationMode: external },
  { id: 'ticktalk', displayName: 'TickTalk', deviceCategory: 'smartwatch', defaultAppName: 'TickTalk parent app', launchStrategy: 'official_app_destination', officialAppDestinations: appStores.ticktalk, manualInstruction: () => 'Open the TickTalk parent app and use its location view.', actionLabel: 'Open TickTalk', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
  { id: 'gabb', displayName: 'Gabb / MyGabb', deviceCategory: 'smartwatch', defaultAppName: 'MyGabb', launchStrategy: 'official_app_destination', officialAppDestinations: appStores.gabb, manualInstruction: (childName) => `Open the MyGabb app to check ${childName}’s device location.`, actionLabel: 'Open MyGabb', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
  { id: 'garmin_bounce', displayName: 'Garmin Bounce / Garmin Jr.', deviceCategory: 'smartwatch', defaultAppName: 'Garmin Jr.', launchStrategy: 'official_app_destination', officialAppDestinations: appStores.garmin, manualInstruction: () => 'Open Garmin Jr. to view the last reported Bounce location.', actionLabel: 'Open Garmin Jr.', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
  { id: 'life360', displayName: 'Life360', deviceCategory: 'external_app', defaultAppName: 'Life360', launchStrategy: 'official_app_destination', officialAppDestinations: appStores.life360, manualInstruction: () => 'Open Life360 to check the family’s shared location information.', actionLabel: 'Open Life360', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
  { id: 'jiobit', displayName: 'Jiobit', deviceCategory: 'dedicated_gps', defaultAppName: 'Jiobit', launchStrategy: 'official_app_destination', officialAppDestinations: appStores.jiobit, manualInstruction: () => 'Open the Jiobit app to check the device location.', actionLabel: 'Open Jiobit', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
  { id: 'dedicated_gps', displayName: 'Dedicated GPS tracker', deviceCategory: 'dedicated_gps', launchStrategy: 'manual', manualInstruction: () => 'Open the tracker’s app or website to check its location.', actionLabel: 'How to check this tracker', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
  { id: 'another_app', displayName: 'Another location app', deviceCategory: 'external_app', launchStrategy: 'manual', manualInstruction: () => 'Open the family’s location app to check location.', actionLabel: 'How to check this app', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
  { id: 'other', displayName: 'Other', deviceCategory: 'other', launchStrategy: 'manual', manualInstruction: () => 'Open the family’s saved location tool to check location.', actionLabel: 'How to check this tool', directAppOpeningVerified: false, webAccessVerified: false, integrationMode: external },
];

export const LOCATION_PROVIDER_CHOICES = LOCATION_PROVIDERS.filter(({ id }) => id !== 'apple_device');
export const getLocationProvider = (id: LocationProviderId) => LOCATION_PROVIDERS.find((provider) => provider.id === id) ?? LOCATION_PROVIDERS[LOCATION_PROVIDERS.length - 1];

export function isSafeLocationLaunchUrl(value?: string | null): value is string {
  if (!value) return false;
  if (value !== value.trim() || /\s/.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function isApprovedLocationLaunchUrl(value?: string | null): value is string {
  return isSafeLocationLaunchUrl(value) && APPROVED_EXTERNAL_URLS.has(value);
}

export function resolveProviderLaunchTarget(
  provider: LocationProvider,
  childName: string,
  platform: LaunchPlatform = Platform.OS === 'android' ? 'android' : 'ios'
): ProviderLaunchTarget {
  const instructions = provider.manualInstruction(childName);
  const candidate = provider.launchStrategy === 'verified_web_portal'
    ? provider.verifiedWebUrl
    : provider.launchStrategy === 'official_app_destination'
      ? provider.officialAppDestinations?.[platform]
      : undefined;

  if (
    isApprovedLocationLaunchUrl(candidate)
    && provider.launchStrategy !== 'manual'
  ) {
    return { type: 'external', url: candidate, strategy: provider.launchStrategy, fallbackInstructions: instructions };
  }

  return { type: 'manual', instructions };
}

export async function launchLocationProvider(source: SafetyLocationSource, childName: string) {
  const provider = resolveLocationProvider(source);
  const target = resolveProviderLaunchTarget(provider, childName);
  const fallback = source.notes || (target.type === 'manual' ? target.instructions : target.fallbackInstructions);

  if (target.type === 'manual') {
    Alert.alert(provider.actionLabel, fallback);
    return;
  }

  try {
    await Linking.openURL(target.url);
  } catch {
    Alert.alert(`${provider.defaultAppName || provider.displayName} couldn’t be opened.`, fallback);
  }
}

export function resolveLocationProvider(source: SafetyLocationSource) {
  const haystack = `${source.providerName ?? ''} ${source.label} ${source.deviceName ?? ''}`.toLowerCase();
  if (haystack.includes('angel')) return getLocationProvider('angelsense');
  if (haystack.includes('ticktalk')) return getLocationProvider('ticktalk');
  if (haystack.includes('gabb')) return getLocationProvider('gabb');
  if (haystack.includes('garmin') || haystack.includes('bounce')) return getLocationProvider('garmin_bounce');
  if (haystack.includes('jiobit')) return getLocationProvider('jiobit');
  if (haystack.includes('life360')) return getLocationProvider('life360');
  if (haystack.includes('find my') || haystack.includes('apple watch') || haystack.includes('iphone') || haystack.includes('airtag')) return getLocationProvider('apple_find_my');
  if (source.sourceType === 'dedicated_gps') return getLocationProvider('dedicated_gps');
  if (source.sourceType === 'external_app') return getLocationProvider('another_app');
  return getLocationProvider('other');
}
