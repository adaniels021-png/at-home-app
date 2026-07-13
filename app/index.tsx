import {
  useRootNavigationState,
  useRouter,
} from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

type ChildRecord = {
  id: string;
};

type AppRoute =
  | '/auth'
  | '/onboarding/add-child'
  | '/onboarding/assessment'
  | '/(tabs)';

const STARTUP_TIMEOUT_MS = 10_000;

export default function IndexScreen() {
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const mountedRef = useRef(true);
  const navigationStartedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    /*
     * Wait until Expo Router has mounted its root navigator.
     * Redirecting before this exists can cause an unmatched-route
     * screen or a failed startup redirect.
     */
    if (!navigationState?.key) {
      return;
    }

    if (navigationStartedRef.current) {
      return;
    }

    navigationStartedRef.current = true;

    let completed = false;

    const navigate = (route: AppRoute) => {
      if (!mountedRef.current || completed) {
        return;
      }

      completed = true;
      clearTimeout(startupTimeout);

      router.replace(route as any);
    };

    /*
     * If a database request hangs during startup, do not leave the
     * user trapped on a blank or loading screen.
     *
     * The valid route for your tab layout is "/(tabs)", not
     * "/(tabs)/index".
     */
    const startupTimeout = setTimeout(() => {
      if (!mountedRef.current || completed) {
        return;
      }

      console.warn(
        'Startup routing timed out. Opening the main app.'
      );

      navigate('/(tabs)');
    }, STARTUP_TIMEOUT_MS);

    const routeUser = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mountedRef.current || completed) {
          return;
        }

        if (sessionError) {
          console.error(
            'Root session check error:',
            sessionError
          );

          navigate('/auth');
          return;
        }

        const userId = session?.user?.id;

        if (!userId) {
          navigate('/auth');
          return;
        }

        const {
          data: children,
          error: childError,
        } = await supabase
          .from('children')
          .select('id')
          .eq('parent_id', userId)
          .order('created_at', {
            ascending: true,
          })
          .limit(1);

        if (!mountedRef.current || completed) {
          return;
        }

        if (childError) {
          console.error(
            'Child lookup error:',
            childError
          );

          /*
           * The user is authenticated. A temporary child-table error
           * should not prevent the app from opening.
           */
          navigate('/(tabs)');
          return;
        }

        const firstChild =
          (children?.[0] || null) as
            | ChildRecord
            | null;

        if (!firstChild?.id) {
          navigate('/onboarding/add-child');
          return;
        }

        const {
          data: assessment,
          error: assessmentError,
        } = await supabase
          .from('assessments')
          .select('id')
          .eq('child_id', firstChild.id)
          .order('completed_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (!mountedRef.current || completed) {
          return;
        }

        if (assessmentError) {
          console.error(
            'Assessment lookup error:',
            assessmentError
          );

          /*
           * Do not send an established user through onboarding again
           * because of a temporary database error.
           */
          navigate('/(tabs)');
          return;
        }

        if (!assessment?.id) {
          navigate('/onboarding/assessment');
          return;
        }

        navigate('/(tabs)');
      } catch (error) {
        console.error(
          'Root routing error:',
          error
        );

        if (!mountedRef.current || completed) {
          return;
        }

        /*
         * The session was not confirmed as signed out, so open the
         * existing main app instead of leaving a blank screen.
         */
        navigate('/(tabs)');
      }
    };

    void routeUser();

    return () => {
      clearTimeout(startupTimeout);
    };
  }, [navigationState?.key, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#4F46E5"
      />

      <Text style={styles.title}>
        ABA at Home
      </Text>

      <Text style={styles.text}>
        Preparing your family dashboard...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  title: {
    marginTop: 18,
    color: '#1E1B4B',
    fontSize: 20,
    fontWeight: '900',
  },

  text: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});