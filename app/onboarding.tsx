import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useChild } from '../lib/SelectedChildContext';
import { supabase } from '../lib/supabase';

type ChildRecord = {
  id: string;
  child_name?: string | null;
  name?: string | null;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { setSelectedChild } = useChild() as any;
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

        const { data: children, error: childError } = await supabase
          .from('children')
          .select('*')
          .eq('parent_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (childError) {
          console.error('Onboarding child lookup error:', childError);
          hasNavigatedRef.current = true;
          router.replace('/onboarding/add-child');
          return;
        }

        const firstChild = (children?.[0] || null) as ChildRecord | null;

        if (!firstChild?.id) {
          hasNavigatedRef.current = true;
          router.replace('/onboarding/add-child');
          return;
        }

        if (typeof setSelectedChild === 'function') {
          setSelectedChild(firstChild);
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
        hasNavigatedRef.current = true;
        router.replace('/auth');
      }
    };

    void routeOnboarding();

    return () => {
      mounted = false;
    };
  }, [router, setSelectedChild]);

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