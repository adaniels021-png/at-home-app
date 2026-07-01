import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
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
  const startupFinishedRef = useRef(false);

  const finishStartup = (nextSession: any = null) => {
    if (startupFinishedRef.current) return;

    startupFinishedRef.current = true;
    setSession(nextSession);
    setLoading(false);
  };

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

    const startupTimer = setTimeout(() => {
      if (!mounted) return;

      console.warn('Startup timeout reached. Continuing without blocking app.');
      finishStartup(null);
    }, 7000);

    const safeConfigureRevenueCat = async (userId?: string) => {
      try {
        if (typeof revenuecat.configureRevenueCat === 'function') {
          await revenuecat.configureRevenueCat();
        }

        if (userId && typeof revenuecat.logInRevenueCat === 'function') {
  await revenuecat.logInRevenueCat(userId);
  await revenuecat.getCustomerInfo();
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

        if (!mounted) return;

        clearTimeout(startupTimer);
        finishStartup(data.session ?? null);

        void safeConfigureRevenueCat(data.session?.user?.id);
      } catch (error) {
        console.error('Root layout session load error:', error);

        if (!mounted) return;

        clearTimeout(startupTimer);
        finishStartup(null);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth change:', event);

      if (mounted) {
        setSession(newSession ?? null);
        setLoading(false);
      }

      try {
        if (
          newSession?.user?.id &&
          typeof revenuecat.logInRevenueCat === 'function'
        ) {
          await revenuecat.logInRevenueCat(newSession.user.id);
          await revenuecat.getCustomerInfo();
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
      clearTimeout(startupTimer);
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
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text
            style={{
              marginTop: 18,
              color: '#64748B',
              fontSize: 16,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            Loading ABA at Home...
          </Text>
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