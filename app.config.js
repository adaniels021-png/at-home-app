import 'dotenv/config';

export default {
  expo: {
    name: 'ABA at Home',
    slug: 'at-home-app',
    version: "1.0.3",
    orientation: 'portrait',
    scheme: 'abaathome',
    userInterfaceStyle: 'light',

    icon: './assets/icon.png',

    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.adaniels021.abaathome',
      buildNumber: '35',

      infoPlist: {
        NSCameraUsageDescription:
          'ABA at Home may use the camera for profile photos and PECS content.',

        NSPhotoLibraryUsageDescription:
          'ABA at Home may access your photo library for profile customization and PECS image uploads.',

        NSPhotoLibraryAddUsageDescription:
          'ABA at Home may save exported worksheets and visual supports to your photo library.',

        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: 'com.adaniels021.abaathome',
      versionCode: 16,

      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#ffffff',
      },

      permissions: ['NOTIFICATIONS'],
    },

    web: {
      favicon: './assets/favicon.png',
    },

    plugins: [
      'expo-router',
      'expo-notifications',
    ],

    extra: {
      EXPO_PUBLIC_SUPABASE_URL:
        process.env.EXPO_PUBLIC_SUPABASE_URL,

      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      EXPO_PUBLIC_RC_APPLE_API_KEY:
        process.env.EXPO_PUBLIC_RC_APPLE_API_KEY,

      EXPO_PUBLIC_RC_GOOGLE_API_KEY:
        process.env.EXPO_PUBLIC_RC_GOOGLE_API_KEY,

      EXPO_PUBLIC_RC_ENTITLEMENT_ID:
        process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID,

      eas: {
        projectId: 'c4a657a7-ca99-4f5d-900f-7e7b19d7c3c8',
      },
    },

    owner: 'adaniels021',
  },
};