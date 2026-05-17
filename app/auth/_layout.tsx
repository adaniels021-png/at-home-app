import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Session load error:', error.message);
      }

      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('🔄 Auth state changed:', event);
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && inTabsGroup) {
      console.log('🚪 No session found, redirecting to auth');
      router.replace('/auth');
    }

    if (session && inAuthGroup) {
      console.log('✅ Session found, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}