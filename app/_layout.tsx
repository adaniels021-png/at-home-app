import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChildProvider } from '../lib/SelectedChildContext';
import { SettingsProvider } from '../lib/SettingsContext';
import { SubscriptionProvider } from '../lib/SubscriptionContext';
import {
  requestNotificationPermission,
  setupNotificationChannel,
} from '../lib/notifications';
import * as revenuecat from '../lib/revenuecat';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        await setupNotificationChannel();
        await requestNotificationPermission();
      } catch (error) {
        console.error('Notification init error:', error);
      }
    };

    void initNotifications();
  }, []);

  useEffect(() => {
    let mounted = true;

    const safeConfigureRevenueCat = async (userId?: string) => {
      try {
        if (typeof revenuecat.configureRevenueCat === 'function') {
          await revenuecat.configureRevenueCat();
        }

        if (userId && typeof revenuecat.logInRevenueCat === 'function') {
          await revenuecat.logInRevenueCat(userId);
        }
      } catch (error) {
        console.error('RevenueCat init error:', error);
      }
    };

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error loading session:', error.message);
        }

        await safeConfigureRevenueCat(data.session?.user?.id);

        if (mounted) {
          setSession(data.session ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Root layout session load error:', error);

        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth change:', event);

      setSession(newSession ?? null);

      try {
        if (
          newSession?.user?.id &&
          typeof revenuecat.logInRevenueCat === 'function'
        ) {
          await revenuecat.logInRevenueCat(newSession.user.id);
        } else if (
          !newSession?.user?.id &&
          typeof revenuecat.logOutRevenueCat === 'function'
        ) {
          await revenuecat.logOutRevenueCat();
        }
      } catch (error) {
        console.error('RevenueCat auth sync error:', error);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0];
    const inAuth = firstSegment === 'auth';

    if (!session) {
      if (!inAuth) {
        router.replace('/auth');
      }

      return;
    }

    if (session && inAuth) {
      router.replace('/');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <SubscriptionProvider>
          <ChildProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ChildProvider>
        </SubscriptionProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}