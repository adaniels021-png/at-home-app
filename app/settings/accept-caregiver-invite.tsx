import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useChild } from '../../lib/SelectedChildContext';
import { AccessSummary, RoleBadge } from '../../components/caregivers/CaregiverAccessUI';
import { getRoleAccessSummary } from '../../lib/caregiverPermissions';

export default function AcceptCaregiverInviteScreen() {
  const router = useRouter();
  const { refreshChildren } = useChild();

  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState<{ childName: string; role: string } | null>(null);

  const handleAcceptInvite = async () => {
    const cleanCode = inviteCode.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert('Missing Code', 'Please enter your invite code.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Sign In Required',
          'Please sign in before accepting an invite.'
        );
        return;
      }

      const { data: childId, error: acceptError } = await supabase.rpc(
        'accept_caregiver_invite',
        {
          p_invite_code: cleanCode,
        }
      );

      if (acceptError) throw acceptError;
      const [{ data: membership }, { data: child }] = await Promise.all([
        supabase.from('child_caregivers').select('role').eq('child_id', childId).eq('caregiver_user_id', user.id).maybeSingle(),
        supabase.from('children').select('child_name, name').eq('id', childId).maybeSingle(),
      ]);
      await refreshChildren();
      setAccepted({ childName: child?.child_name || child?.name || 'this child', role: membership?.role || 'caregiver' });
    } catch (error: any) {
      console.error('Accept invite error:', error);

      Alert.alert(
        'Accept Failed',
        error?.message || 'Could not accept this invite.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (accepted) {
    const summary = getRoleAccessSummary(accepted.role);
    return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.successContent}><View style={styles.successIcon}><Ionicons name="checkmark" size={32} color="#FFF" /></View><Text style={styles.successTitle}>Access Connected</Text><Text style={styles.successText}>You&apos;re now part of {accepted.childName}&apos;s support team.</Text><RoleBadge role={accepted.role} /><View style={styles.summaryWrap}><AccessSummary available={summary.available} restricted={summary.restricted} /></View><TouchableOpacity style={styles.acceptButton} onPress={() => router.replace('/(tabs)' as any)}><Text style={styles.acceptButtonText}>Continue</Text></TouchableOpacity></ScrollView></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="key-outline" size={30} color="#4F46E5" />
            </View>

            <Text style={styles.heroTitle}>Accept Invite</Text>

            <Text style={styles.heroText}>
              Enter the invite code you received to connect to a child profile.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Invite Code</Text>

            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="ABC123"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              maxLength={12}
            />

            <Text style={styles.helperText}>
              Invite codes are usually 6 characters long.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#4F46E5"
            />

            <Text style={styles.infoText}>
              Only accept an invite from someone you trust. Your access is based
              on the role selected by the primary parent.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.acceptButton, saving && styles.acceptButtonDisabled]}
            onPress={handleAcceptInvite}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.acceptButtonText}>Accept Invite</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  successContent: { flexGrow: 1, padding: 26, alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: '#5A7C69', alignItems: 'center', justifyContent: 'center' },
  successTitle: { marginTop: 20, color: '#443848', fontSize: 28, fontWeight: '900' },
  successText: { marginVertical: 12, color: '#776D78', fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  summaryWrap: { alignSelf: 'stretch', marginTop: 22 },
  container: {
    flex: 1,
    backgroundColor: '#F7F1E9',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  backButton: {
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
    backgroundColor: '#4E315A',
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },

  heroText: {
    color: '#E0E7FF',
    marginTop: 8,
    lineHeight: 21,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },

  label: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  helperText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    marginBottom: 18,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#4338CA',
    fontWeight: '700',
    lineHeight: 18,
    fontSize: 13,
  },

  acceptButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  acceptButtonDisabled: {
    opacity: 0.7,
  },

  acceptButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
