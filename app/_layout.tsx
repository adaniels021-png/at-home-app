import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import EntitlementNavigationGuard from '../components/EntitlementNavigationGuard';
import { ChildProvider } from '../lib/SelectedChildContext';
import { SettingsProvider } from '../lib/SettingsContext';
import { SubscriptionProvider } from '../lib/SubscriptionContext';
import {
  requestNotificationPermission,
  setupNotificationChannel,
} from '../lib/notifications';
import * as revenuecat from '../lib/revenuecat';
import { supabase } from '../lib/supabase';

const STARTUP_TIMEOUT_MS = 10000;

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const [session, setSession] = useState<any>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const mountedRef = useRef(true);
  const revenueCatUserRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * RevenueCat should never block the app from opening.
   */
  const syncRevenueCat = async (userId?: string) => {
    try {
      if (
        typeof revenuecat.configureRevenueCat === 'function'
      ) {
        await revenuecat.configureRevenueCat();
      }

      if (userId) {
        if (
          revenueCatUserRef.current !== userId &&
          typeof revenuecat.logInRevenueCat === 'function'
        ) {
          await revenuecat.logInRevenueCat(userId);
          revenueCatUserRef.current = userId;
        }

        if (
          typeof revenuecat.getCustomerInfo === 'function'
        ) {
          await revenuecat.getCustomerInfo();
        }

        return;
      }

      if (
        revenueCatUserRef.current &&
        typeof revenuecat.logOutRevenueCat === 'function'
      ) {
        await revenuecat.logOutRevenueCat();
      }

      revenueCatUserRef.current = null;
    } catch (error) {
      console.error('RevenueCat sync error:', error);
    }
  };

  /**
   * Restore the Supabase session.
   *
   * A timeout prevents the loading overlay from remaining forever,
   * but the root Stack remains mounted underneath it at all times.
   */
  useEffect(() => {
    let cancelled = false;
    let completed = false;

    const finishSessionLoad = (nextSession: any) => {
      if (cancelled || completed) return;

      completed = true;

      if (mountedRef.current) {
        setSession(nextSession ?? null);
        setSessionLoaded(true);
      }
    };

    const startupTimer = setTimeout(() => {
      console.warn(
        'Session restoration timed out. Continuing to the authentication screen.'
      );

      finishSessionLoad(null);
    }, STARTUP_TIMEOUT_MS);

    const loadSession = async () => {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (error) {
          console.error(
            'Supabase session restoration error:',
            error.message
          );
        }

        if (cancelled) return;

        clearTimeout(startupTimer);

        const restoredSession = data.session ?? null;

        finishSessionLoad(restoredSession);

        // Do not block navigation while RevenueCat initializes.
        setTimeout(() => {
          void syncRevenueCat(
            restoredSession?.user?.id
          );
        }, 0);
      } catch (error) {
        console.error(
          'Root session initialization error:',
          error
        );

        if (cancelled) return;

        clearTimeout(startupTimer);
        finishSessionLoad(null);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        console.log('Auth change:', event);

        if (!cancelled && mountedRef.current) {
          setSession(nextSession ?? null);
          setSessionLoaded(true);
        }

        /**
         * Do not make this callback async.
         * Run external subscription work after Supabase finishes
         * processing the auth event.
         */
        setTimeout(() => {
          void syncRevenueCat(
            nextSession?.user?.id
          );
        }, 0);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(startupTimer);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Notifications are optional startup work and must not block
   * authentication or navigation.
   */
  useEffect(() => {
    if (!sessionLoaded) return;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          await setupNotificationChannel();
          await requestNotificationPermission();
        } catch (error) {
          console.error(
            'Notification initialization error:',
            error
          );
        }
      })();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [sessionLoaded]);

  /**
   * Redirect only after:
   * 1. Supabase session restoration has completed.
   * 2. Expo Router's root navigation container has mounted.
   */
  useEffect(() => {
    if (!sessionLoaded) return;
    if (!navigationState?.key) return;

    const firstSegment = segments[0];
    const inAuth =
      firstSegment === 'auth' ||
      firstSegment === '(auth)';

    if (!session && !inAuth) {
      router.replace('/auth');
      return;
    }

    if (session && inAuth) {
      router.replace('/');
    }
  }, [
    session,
    sessionLoaded,
    navigationState?.key,
    segments,
    router,
  ]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SettingsProvider>
        <SubscriptionProvider>
          <EntitlementNavigationGuard />
          <ChildProvider>
            {/*
             * The Stack must stay mounted even while startup work
             * is running. The loading screen is an overlay instead
             * of replacing the navigator.
             */}
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />

            {!sessionLoaded ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator
                  size="large"
                  color="#4F46E5"
                />

                <Text style={styles.loadingText}>
                  Loading ABA at Home...
                </Text>
              </View>
            ) : null}
          </ChildProvider>
        </SubscriptionProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 18,
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
