import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useChild } from '../lib/SelectedChildContext';
import { supabase } from '../lib/supabase';

type ChildRecord = {
  id: string;
  child_name?: string | null;
  name?: string | null;
  caregiver_access_role?: string | null;
};


export default function OnboardingScreen() {
  const router = useRouter();

  const { setSelectedChild, refreshChildren } = useChild() as any;

  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const routeOnboarding = async () => {
      try {
        if (!mounted || hasNavigatedRef.current) return;

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user?.id) {
          hasNavigatedRef.current = true;
          router.replace('/auth');
          return;
        }

        const userId = session.user.id;

        const [ownedResult, caregiverResult] = await Promise.all([
  supabase
    .from('children')
    .select('*')
    .eq('parent_id', userId)
    .order('created_at', { ascending: true }),

  supabase
    .from('child_caregivers')
    .select('child_id, role, status')
    .eq('caregiver_user_id', userId)
    .eq('status', 'accepted'),
]);

if (ownedResult.error) throw ownedResult.error;
if (caregiverResult.error) throw caregiverResult.error;

const ownedChildren = ownedResult.data || [];
const caregiverRows = caregiverResult.data || [];

        const sharedChildIds = (caregiverRows || [])
          .map((row: any) => row.child_id)
          .filter(Boolean);

        let sharedChildren: ChildRecord[] = [];

        if (sharedChildIds.length > 0) {
          const { data: sharedData, error: sharedError } = await supabase
            .from('children')
            .select('*')
            .in('id', sharedChildIds)
            .order('created_at', { ascending: true });

          if (sharedError) throw sharedError;

          sharedChildren = (sharedData || []).map((child: any) => {
            const caregiverRow = (caregiverRows || []).find(
              (row: any) => row.child_id === child.id
            );

            return {
              ...child,
              caregiver_access_role: caregiverRow?.role || 'caregiver',
            };
          });
        }

        const mergedMap = new Map<string, ChildRecord>();

        ((ownedChildren || []) as ChildRecord[]).forEach((child) => {
          mergedMap.set(child.id, {
            ...child,
            caregiver_access_role: 'owner',
          });
        });

        sharedChildren.forEach((child) => {
          mergedMap.set(child.id, child);
        });

        const allChildren = Array.from(mergedMap.values());
        const firstChild = allChildren[0] || null;

        if (!firstChild?.id) {
          hasNavigatedRef.current = true;
          router.replace('/onboarding/setup-choice');
          return;
        }

        if (typeof setSelectedChild === 'function') {
          setSelectedChild(firstChild);
        }

       if (typeof refreshChildren === 'function') {
  void refreshChildren();
}

        const isSharedChild = firstChild.caregiver_access_role !== 'owner';

        if (isSharedChild) {
          hasNavigatedRef.current = true;
          router.replace('/(tabs)');
          return;
        }

        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .select('id')
          .eq('child_id', firstChild.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assessmentError || !assessment?.id) {
          hasNavigatedRef.current = true;
          router.replace('/onboarding/assessment');
          return;
        }

        hasNavigatedRef.current = true;
        router.replace('/(tabs)');
      } catch (error) {
  console.error('Onboarding routing error:', error);

  if (!mounted || hasNavigatedRef.current) return;

  hasNavigatedRef.current = true;

  // The root layout already handles authentication.
  // Avoid sending an authenticated user back to login because of
  // a temporary child or assessment lookup failure.
  router.replace('/(tabs)');
}
    };

    void routeOnboarding();

    return () => {
      mounted = false;
    };
  }, [router, setSelectedChild, refreshChildren]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />

      <Text style={styles.text}>Preparing onboarding...</Text>
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

  text: {
    marginTop: 14,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});