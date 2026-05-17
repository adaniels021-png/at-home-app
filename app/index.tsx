import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

type ChildRecord = {
  id: string;
  child_name?: string | null;
  name?: string | null;
};

export default function IndexScreen() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const routeUser = async () => {
      try {
        if (hasNavigatedRef.current || !mounted) return;

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Root session check error:', sessionError);
          if (!mounted || hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          router.replace('/auth');
          return;
        }

        if (!session?.user?.id) {
          if (!mounted || hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          router.replace('/auth');
          return;
        }

        const userId = session.user.id;

        const { data: children, error: childError } = await supabase
          .from('children')
          .select('id, child_name, name')
          .eq('parent_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (childError) {
          console.error('Child lookup error:', childError);
          if (!mounted || hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          router.replace('/onboarding/add-child')     
          return;
        }

        const firstChild = (children?.[0] || null) as ChildRecord | null;

        if (!firstChild?.id) {
          if (!mounted || hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          router.replace('/onboarding/add-child');
          return;
        }

        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .select('id')
          .eq('child_id', firstChild.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assessmentError) {
          console.error('Assessment lookup error:', assessmentError);
          if (!mounted || hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          router.replace('/onboarding/assessment');
          return;
        }

        if (!assessment?.id) {
          if (!mounted || hasNavigatedRef.current) return;
          hasNavigatedRef.current = true;
          router.replace('/onboarding/assessment');
          return;
        }

        if (!mounted || hasNavigatedRef.current) return;
        hasNavigatedRef.current = true;
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Root routing error:', error);
        if (!mounted || hasNavigatedRef.current) return;
        hasNavigatedRef.current = true;
        router.replace('/auth');
      }
    };

    void routeUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted || hasNavigatedRef.current) return;
      await routeUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4F46E5" />
      <Text style={styles.text}>Loading ABA at Home...</Text>
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