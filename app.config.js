export default {
  expo: {
    name: 'ABA at Home',
    slug: 'aba-at-home',
    version: '1.0.0',
    extra: {
      eas: {
        projectId: 'fda0fd5b-e698-479f-8733-1d5f5b59d6c5'
      }
    },
    ios: {
      bundleIdentifier: 'com.adaniels021.abaathome',
      appleTeamId: 'VD89UA35Z8',
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    plugins: ['expo-router']
  }
};