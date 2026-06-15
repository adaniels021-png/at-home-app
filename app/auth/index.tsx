import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const LOGIN_BG = require('../../assets/images/android-icon-background.png');

export default function AuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function getFriendlyAuthMessage(error: any, mode: 'login' | 'signup') {
    const message = String(error?.message || '').toLowerCase();

    if (mode === 'login') {
      if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
        return 'The email or password is incorrect. If you recently signed up, you may also need to verify your email first.';
      }

      if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
        return 'Your email is not confirmed yet. Please check your inbox and verify your email before logging in.';
      }

      if (message.includes('too many requests')) {
        return 'Too many login attempts. Please wait a moment and try again.';
      }

      return error?.message || 'We could not log you in. Please try again.';
    }

    if (message.includes('user already registered')) {
      return 'An account with this email already exists. Try logging in instead.';
    }

    if (message.includes('password should be at least')) {
      return 'Your password is too short. Please use a stronger password.';
    }

    return error?.message || 'We could not create your account. Please try again.';
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) throw error;

        if (data?.session) {
          router.replace('/');
          return;
        }

        Alert.alert(
          'Verify Email',
          'Your account was created. Please check your inbox and confirm your email before logging in.'
        );
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) throw error;

      if (data?.session) {
        router.replace('/');
        return;
      }

      Alert.alert('Login Error', 'Something went wrong while logging in.');
    } catch (error: any) {
      console.warn('AUTH ERROR:', error?.message || error);

      const friendlyMessage = getFriendlyAuthMessage(error, isSignUp ? 'signup' : 'login');
      Alert.alert(isSignUp ? 'Sign Up Error' : 'Login Error', friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert('Enter Email', 'Please enter your email address first so we can send a reset link.');
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      Alert.alert(
        'Reset Email Sent',
        'If that email is registered, a password reset link has been sent to the inbox.'
      );
    } catch (error: any) {
      console.warn('PASSWORD RESET ERROR:', error?.message || error);
      Alert.alert('Reset Error', error?.message || 'We could not send the reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
  <ImageBackground
    source={LOGIN_BG}
    style={styles.backgroundImage}
    resizeMode="cover"
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={21} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={21} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {!isSignUp && (
            <TouchableOpacity
              onPress={() => void handleForgotPassword()}
              style={styles.forgotContainer}
              disabled={resetLoading}
            >
              <Text style={styles.forgotText}>
                {resetLoading ? 'Sending reset email...' : 'Forgot Password?'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
  <ActivityIndicator color="#FFFFFF" />
) : (
  <Text style={styles.buttonText}>
    {isSignUp ? 'Create Account' : 'Login'}
  </Text>
)}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSignUp((prev) => !prev)}
            style={styles.toggleContainer}
            disabled={loading || resetLoading}
          >
          <Text style={styles.toggleText}>
              {isSignUp
              ? 'Already have an account? '
              : "Don't have an account? "}
            <Text style={styles.toggleTextBold}>
              {isSignUp ? 'Login' : 'Sign Up'}
           </Text>
         </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </ImageBackground>
);
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  scrollContent: {
  flexGrow: 1,
  paddingHorizontal: 24,
  paddingTop: 375,
  paddingBottom: 80,
},

  logoSection: {
  alignItems: 'center',
  marginTop: 120,
  marginBottom: 28,
},

  title: {
  fontSize: 38,
  fontWeight: '900',
  color: '#0F172A',
  textAlign: 'center',
},

  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },

  form: {
    width: '100%',
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    minHeight: 58,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },

  passwordInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },

  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
  
forgotContainer: {
  alignSelf: 'flex-end',
  marginTop: -8,
  marginBottom: 20,
},

  forgotText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 14,
  },


  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  toggleContainer: {
  marginTop: 20,
  marginBottom: 80,
  alignItems: 'center',
},

  toggleText: {
  color: '#475569',
  fontWeight: '700',
  fontSize: 16,
},

toggleTextBold: {
  color: '#4F46E5',
  fontWeight: '900',
},

  backgroundImage: {
  flex: 1,
},

button: {
  height: 62,
  borderRadius: 18,
  marginTop: 8,
  backgroundColor: '#312E81',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#4F46E5',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 5,
},
});