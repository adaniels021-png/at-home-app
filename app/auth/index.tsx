import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

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
      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid_credentials')
      ) {
        return 'The email or password is incorrect. If you recently signed up, you may also need to verify your email first.';
      }

      if (
        message.includes('email not confirmed') ||
        message.includes('email_not_confirmed')
      ) {
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

        if (error) {
          throw error;
        }

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

      if (error) {
        throw error;
      }

      if (data?.session) {
        router.replace('/');
        return;
      }

      Alert.alert('Login Error', 'Something went wrong while logging in.');
    } catch (error: any) {
      console.error('❌ AUTH ERROR:', error?.message || error);

      const friendlyMessage = getFriendlyAuthMessage(
        error,
        isSignUp ? 'signup' : 'login'
      );

      Alert.alert(isSignUp ? 'Sign Up Error' : 'Login Error', friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Enter Email',
        'Please enter your email address first so we can send a reset link.'
      );
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (error) {
        throw error;
      }

      Alert.alert(
        'Reset Email Sent',
        'If that email is registered, a password reset link has been sent to the inbox.'
      );
    } catch (error: any) {
      console.error('❌ PASSWORD RESET ERROR:', error?.message || error);
      Alert.alert(
        'Reset Error',
        error?.message || 'We could not send the reset email. Please try again.'
      );
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart" size={40} color="#4F46E5" />
          </View>

          <Text style={styles.title}>ABA at Home</Text>

          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your parent account' : 'Welcome back'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#64748B"
              style={styles.inputIcon}
            />
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
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#64748B"
              style={styles.inputIcon}
            />
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

            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748B"
              />
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
                ? 'Already have an account? Login'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },

  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },

  form: {
    width: '100%',
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1E293B',
  },

  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1E293B',
  },

  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },

  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 10,
  },

  forgotText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 13,
  },

  button: {
    backgroundColor: '#4F46E5',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  toggleContainer: {
    marginTop: 24,
    alignItems: 'center',
  },

  toggleText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
});