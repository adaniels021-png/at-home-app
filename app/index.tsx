import { useRouter } from 'expo-router';
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
  child_name?: string | null;
  name?: string | null;
  caregiver_access_role?: string | null;
};

const ROUTING_TIMEOUT_MS = 7000;

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

export default function IndexScreen() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const navigateOnce = (pathname: string) => {
      if (!mounted || hasNavigatedRef.current) return;

      hasNavigatedRef.current = true;
      router.replace(pathname as any);
    };

    const routeUser = async () => {
      try {
        /*
         * The root layout already resolves authentication.
         * This check only confirms the currently cached session.
         */
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          ROUTING_TIMEOUT_MS,
          'Session check timed out.'
        );

        if (!mounted || hasNavigatedRef.current) return;

        if (sessionResult.error) {
          console.error(
            'Index session check error:',
            sessionResult.error.message
          );

          navigateOnce('/auth');
          return;
        }

        const userId = sessionResult.data.session?.user?.id;

        if (!userId) {
          navigateOnce('/auth');
          return;
        }

        /*
         * Owned children and caregiver access can be loaded together.
         */
        const [ownedResult, caregiverResult] = await withTimeout(
          Promise.all([
            supabase
              .from('children')
              .select('id, child_name, name, created_at')
              .eq('parent_id', userId)
              .order('created_at', { ascending: true }),

            supabase
              .from('child_caregivers')
              .select('child_id, role, status')
              .eq('caregiver_user_id', userId)
              .eq('status', 'accepted'),
          ]),
          ROUTING_TIMEOUT_MS,
          'Child access lookup timed out.'
        );

        if (!mounted || hasNavigatedRef.current) return;

        if (ownedResult.error) {
          console.error(
            'Owned-child lookup error:',
            ownedResult.error.message
          );
        }

        if (caregiverResult.error) {
          console.error(
            'Caregiver-child lookup error:',
            caregiverResult.error.message
          );
        }

        const ownedChildren: ChildRecord[] = (
          ownedResult.data ?? []
        ).map((child: any) => ({
          ...child,
          caregiver_access_role: 'owner',
        }));

        const caregiverRows = caregiverResult.data ?? [];

        const sharedChildIds = caregiverRows
          .map((row: any) => row.child_id)
          .filter(Boolean);

        let sharedChildren: ChildRecord[] = [];

        if (sharedChildIds.length > 0) {
          const sharedResult = await withTimeout(
            supabase
              .from('children')
              .select('id, child_name, name, created_at')
              .in('id', sharedChildIds)
              .order('created_at', { ascending: true }),
            ROUTING_TIMEOUT_MS,
            'Shared-child lookup timed out.'
          );

          if (sharedResult.error) {
            console.error(
              'Shared-child lookup error:',
              sharedResult.error.message
            );
          } else {
            sharedChildren = (sharedResult.data ?? []).map(
              (child: any) => {
                const accessRow = caregiverRows.find(
                  (row: any) => row.child_id === child.id
                );

                return {
                  ...child,
                  caregiver_access_role:
                    accessRow?.role ?? 'caregiver',
                };
              }
            );
          }
        }

        /*
         * Merge the lists so a child cannot appear twice.
         */
        const childMap = new Map<string, ChildRecord>();

        ownedChildren.forEach((child) => {
          childMap.set(child.id, child);
        });

        sharedChildren.forEach((child) => {
          if (!childMap.has(child.id)) {
            childMap.set(child.id, child);
          }
        });

        const firstChild =
          Array.from(childMap.values())[0] ?? null;

        if (!firstChild?.id) {
          /*
           * Only route to Add Child when both child lookups completed
           * without database errors.
           */
          if (!ownedResult.error && !caregiverResult.error) {
            navigateOnce('/onboarding/add-child');
          } else {
            console.warn(
              'Child lookup was unavailable. Opening the app instead.'
            );

            navigateOnce('/(tabs)');
          }

          return;
        }

        /*
         * Shared caregivers do not need to complete the owner's
         * onboarding assessment.
         */
        const isSharedChild =
          firstChild.caregiver_access_role !== 'owner';

        if (isSharedChild) {
          navigateOnce('/(tabs)');
          return;
        }

        const assessmentResult = await withTimeout(
          supabase
            .from('assessments')
            .select('id')
            .eq('child_id', firstChild.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          ROUTING_TIMEOUT_MS,
          'Assessment lookup timed out.'
        );

        if (!mounted || hasNavigatedRef.current) return;

        if (assessmentResult.error) {
          console.error(
            'Assessment lookup error:',
            assessmentResult.error.message
          );

          /*
           * A temporary assessment lookup failure should not trap an
           * existing user on the loading screen.
           */
          navigateOnce('/(tabs)');
          return;
        }

        if (!assessmentResult.data?.id) {
          navigateOnce('/onboarding/assessment');
          return;
        }

        navigateOnce('/(tabs)');
      } catch (error) {
        console.error('Root routing error:', error);

        /*
         * The root layout handles authentication. If startup data is
         * temporarily unavailable, open the app instead of showing a
         * permanent loading or blank screen.
         */
        navigateOnce('/(tabs)');
      }
    };

    void routeUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#7C3AED" />

        <Text style={styles.title}>ABA at Home</Text>

        <Text style={styles.text}>
          Preparing your family’s dashboard...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  title: {
    marginTop: 16,
    color: '#2E1065',
    fontSize: 22,
    fontWeight: '900',
  },

  text: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});