import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

export default function PasswordSecurityScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      setEmail(user?.email || '');
    } catch (error: any) {
      console.error('Load security user error:', error);

      Alert.alert(
        'Account Error',
        error?.message || 'Could not load your account information.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedPassword.length < 8) {
      Alert.alert(
        'Password Too Short',
        'Please use at least 8 characters.'
      );
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please confirm your new password.'
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user?.id) {
        throw new Error(
          'Please log in again before updating your password.'
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (error) throw error;

      setPassword('');
      setConfirmPassword('');

     Alert.alert(
  'Password Updated',
  'Your password has been updated successfully.',
  [
    {
      text: 'OK',
      onPress: () => router.back(),
    },
  ]
);
    } catch (error: any) {
      console.error('Update password error:', error);

      Alert.alert(
        'Update Failed',
        error?.message || 'Could not update password.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetEmail = async () => {
    setResetting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      const accountEmail = user?.email || email;

      if (!accountEmail) {
        throw new Error(
          'No email address found for this account.'
        );
      }

      const redirectTo = Linking.createURL(
        '/auth/reset-password'
      );

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          accountEmail,
          {
            redirectTo,
          }
        );

      if (error) throw error;

      Alert.alert(
  'Reset Email Sent',
  `Password reset instructions were sent to ${accountEmail}.`,
  [
    {
      text: 'OK',
      onPress: () => router.back(),
    },
  ]
);
    } catch (error: any) {
      console.error(
        'Reset password email error:',
        error
      );

      Alert.alert(
        'Reset Failed',
        error?.message ||
          'Could not send reset email.'
      );
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color="#4F46E5"
          />

          <Text style={styles.loadingText}>
            Loading security settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons
            name="lock-closed-outline"
            size={44}
            color="#FFFFFF"
          />

          <Text style={styles.heroTitle}>
            Password & Security
          </Text>

          <Text style={styles.heroText}>
            Keep your family account protected
            with secure login settings.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Account Email
          </Text>

          <Text style={styles.sectionText}>
            Password reset instructions will be
            sent to this email.
          </Text>

          <View style={styles.emailBox}>
            <Ionicons
              name="mail-outline"
              size={18}
              color="#4F46E5"
            />

            <Text style={styles.emailText}>
              {email || 'No email found'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Update Password
          </Text>

          <Text style={styles.sectionText}>
            Choose a strong password with at
            least 8 characters.
          </Text>

          <View style={styles.passwordInputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="New password"
              placeholderTextColor="#94A3B8"
              style={styles.passwordInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword((prev) => !prev)
              }
            >
              <Ionicons
                name={
                  showPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordInputWrap}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#94A3B8"
              style={styles.passwordInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword((prev) => !prev)
              }
            >
              <Ionicons
                name={
                  showPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              saving && styles.disabledBtn,
            ]}
            onPress={handleUpdatePassword}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.saveText}>
                  Update Password
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.secondaryCard,
            resetting && styles.disabledCard,
          ]}
          onPress={handleResetEmail}
          disabled={resetting}
          activeOpacity={0.85}
        >
          {resetting ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <>
              <Ionicons
                name="mail-outline"
                size={22}
                color="#4F46E5"
              />

              <View style={styles.secondaryTextWrap}>
                <Text style={styles.secondaryTitle}>
                  Send Password Reset Email
                </Text>

                <Text style={styles.secondaryText}>
                  Get a secure reset link sent to
                  your account email.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#94A3B8"
              />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#4F46E5"
          />

          <Text style={styles.infoText}>
            If the reset link does not open the
            app, return here and use Update
            Password while logged in.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  hero: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    padding: 22,
    marginBottom: 20,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 10,
  },

  heroText: {
    color: '#E0E7FF',
    marginTop: 8,
    lineHeight: 21,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  sectionText: {
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 14,
  },

  emailBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  emailText: {
    marginLeft: 8,
    color: '#0F172A',
    fontWeight: '800',
    flex: 1,
  },

  passwordInputWrap: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 11,
    color: '#0F172A',
    fontWeight: '700',
  },

  saveBtn: {
    marginTop: 6,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  disabledBtn: {
    opacity: 0.7,
  },

  saveText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
  },

  secondaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  disabledCard: {
    opacity: 0.7,
  },

  secondaryTextWrap: {
    flex: 1,
    marginLeft: 12,
  },

  secondaryTitle: {
    color: '#0F172A',
    fontWeight: '900',
  },

  secondaryText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    fontWeight: '600',
  },

  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#4338CA',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});