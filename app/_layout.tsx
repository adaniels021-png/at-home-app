import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import Purchases from 'react-native-purchases';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    const setupPurchases = async () => {
      try {
        const apiKey = Platform.select({
          ios: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
        });

        if (!apiKey) {
          console.warn("⚠️ RevenueCat API Key is missing. Check .env or EAS Env Variables.");
          return;
        }

        const isConfigured = await Purchases.isConfigured();
        if (!isConfigured) {
          Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
          await Purchases.configure({ apiKey });
          console.log("✅ RevenueCat initialized successfully");
        }
      } catch (e) {
        console.error("❌ RevenueCat setup failed:", e);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    setupPurchases();
  }, []);

  return (
    <Stack>
      {/* This points to app/(tabs)/_layout.tsx */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Modals and other screens */}
      <Stack.Screen name="paywall" options={{ title: 'Go Pro', presentation: 'modal' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}
