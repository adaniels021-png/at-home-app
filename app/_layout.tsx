import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChildProvider } from '../lib/SelectedChildContext';
import { SettingsProvider } from '../lib/SettingsContext';
import { SubscriptionProvider } from '../lib/SubscriptionContext';
import {
  requestNotificationPermission,
  setupNotificationChannel,
} from '../lib/notifications';
import { supabase } from '../lib/supabase';

/**
 * Keep the native splash screen visible until the root app is ready.
 * This must run outside the component.
 */
void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Could not keep splash screen visible:', error);
});

SplashScreen.setOptions({
  duration: 300,
  fade: true,
});

const SESSION_TIMEOUT_MS = 6000;

function withTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, milliseconds);

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const splashHiddenRef = useRef(false);

  /**
   * Load the saved Supabase session.
   *
   * RevenueCat is intentionally not handled here.
   * SubscriptionProvider now owns all subscription initialization.
   */
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          'Session loading timed out.'
        );

        if (!mounted) return;

        if (result.error) {
          console.error(
            'Error loading session:',
            result.error.message
          );
        }

        setSession(result.data.session ?? null);
      } catch (error) {
        console.error(
          'Root layout session load error:',
          error
        );

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth change:', event);

        if (!mounted) return;

        setSession(newSession ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Initialize notifications after startup.
   *
   * Notification setup should never delay the first screen.
   */
  useEffect(() => {
    if (loading) return;

    const timeoutId = setTimeout(() => {
      const initializeNotifications = async () => {
        try {
          await setupNotificationChannel();
          await requestNotificationPermission();
        } catch (error) {
          console.error(
            'Notification initialization error:',
            error
          );
        }
      };

      void initializeNotifications();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading]);

  /**
   * Route users according to their authentication state.
   */
  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === 'auth';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/auth');
      }

      return;
    }

    if (inAuthGroup) {
      /**
       * Send authenticated users through app/index.tsx.
       * That screen decides whether they need onboarding,
       * assessment, or the main tabs.
       */
      router.replace('/');
    }
  }, [session, loading, segments, router]);

  /**
   * Hide the native splash only after React can render
   * the root navigation tree.
   */
  useEffect(() => {
    if (loading || splashHiddenRef.current) return;

    splashHiddenRef.current = true;

    void SplashScreen.hideAsync().catch((error) => {
      console.warn(
        'Could not hide splash screen:',
        error
      );
    });
  }, [loading]);

  /**
   * Keep the native splash visible while the session loads.
   * Returning null prevents a temporary white React screen.
   */
  if (loading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <SubscriptionProvider>
          <ChildProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#FFF7ED',
                },
              }}
            />
          </ChildProvider>
        </SubscriptionProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}