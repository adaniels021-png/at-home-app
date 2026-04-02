import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LandingPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const LEGAL_URL = "https://docs.google.com/document/d/1vQn3TzI3S1L0YV5I1v1v1v1v1v1v1v1v1v1v1v1v1v/edit"; // Replace with your specific Google Doc ID

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('profiles').select('onboarding_completed').eq('id', session.user.id).maybeSingle();
      if (data?.onboarding_completed) {
        router.replace('/(tabs)');
        return;
      }
    }
    setCheckingSession(false);
  }

  const handleGetStarted = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (!error) router.push('/onboarding');
  };

  if (checkingSession) return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}><Ionicons name="home" size={60} color="#fff" /></View>
          <Text style={styles.appName}>ABA at Home</Text>
          <Text style={styles.tagline}>Empowering parents, one play-session at a time.</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGetStarted}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth')}>
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.legalLinks}>
            <Text style={styles.legalText}>By continuing, you agree to our </Text>
            <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URL)}>
              <Text style={[styles.legalText, styles.link]}>Terms & Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 30, justifyContent: 'space-between' },
  logoContainer: { alignItems: 'center', marginTop: 100 },
  logoCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 36, fontWeight: '900', color: '#1C1C1E' },
  tagline: { fontSize: 18, color: '#636366', textAlign: 'center', marginTop: 10 },
  footer: { marginBottom: 20 },
  buttonGroup: { gap: 15, marginBottom: 25 },
  primaryBtn: { backgroundColor: '#007AFF', padding: 20, borderRadius: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn: { padding: 20, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  secondaryBtnText: { color: '#007AFF', fontSize: 18, fontWeight: '600' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  legalText: { fontSize: 12, color: '#AEAEB2', textAlign: 'center' },
  link: { color: '#007AFF', textDecorationLine: 'underline' }
});
