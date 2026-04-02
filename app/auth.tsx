import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const router = useRouter();
  const LEGAL_URL = "https://docs.google.com/document/d/1vQn3TzI3S1L0YV5I1v1v1v1v1v1v1v1v1v1v1v1v1v/edit";

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.updateUser({ email, password });
        if (error) throw error;
        Alert.alert("Success!", "Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert("Auth Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="person-circle" size={80} color="#007AFF" style={styles.icon} />
        <Text style={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>
        
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isSignUp ? "Sign Up" : "Log In"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchBtn}>
          <Text style={styles.switchText}>{isSignUp ? "Already have an account? Log In" : "New here? Sign Up"}</Text>
        </TouchableOpacity>

        <View style={styles.legalFooter}>
          <Text style={styles.legalText}>View our </Text>
          <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URL)}>
            <Text style={styles.legalLink}>Privacy Policy & Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 30, flex: 1, justifyContent: 'center' },
  icon: { alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#F2F2F7', padding: 18, borderRadius: 12, marginBottom: 15 },
  primaryBtn: { backgroundColor: '#007AFF', padding: 20, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#007AFF' },
  legalFooter: { marginTop: 40, alignItems: 'center' },
  legalText: { color: '#AEAEB2', fontSize: 12 },
  legalLink: { color: '#007AFF', fontSize: 12, textDecorationLine: 'underline', marginTop: 4 }
});
