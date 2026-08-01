import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { hasEntitlement } from '../../lib/entitlements';
import { supabase } from '../../lib/supabase';

type CaregiverRole = 'parent' | 'caregiver' | 'therapist';

const ROLE_OPTIONS: Array<{
  label: string;
  value: CaregiverRole;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  {
    label: 'Parent',
    value: 'parent',
    icon: 'heart-outline',
    description: 'Best for a second parent or co-parent.',
  },
  {
    label: 'Caregiver',
    value: 'caregiver',
    icon: 'people-outline',
    description: 'Best for grandparents, babysitters, or family helpers.',
  },
  {
    label: 'Therapist',
    value: 'therapist',
    icon: 'clipboard-outline',
    description: 'Best for providers who help track progress.',
  },
];

function createInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function InviteCaregiverScreen() {
  const router = useRouter();
  const { selectedChild } = useChild() as any;
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const canInviteCaregiver = hasEntitlement(
    { isPro },
    'manage_caregivers'
  );

  useEffect(() => {
    if (!subscriptionLoading && !canInviteCaregiver) {
      router.replace('/subscription');
    }
  }, [canInviteCaregiver, router, subscriptionLoading]);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CaregiverRole>('caregiver');
  const [saving, setSaving] = useState(false);

  const childName = useMemo(() => {
    return selectedChild?.child_name || selectedChild?.name || 'your child';
  }, [selectedChild]);

  const handleInvite = async () => {
    if (!canInviteCaregiver) {
      router.replace('/subscription');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child profile first.');
      return;
    }

    if (!cleanEmail) {
      Alert.alert('Missing Email', 'Please enter the caregiver email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
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
          'Please sign in again to invite a caregiver.'
        );
        return;
      }

      const inviteCode = createInviteCode();

      const { error } = await supabase.from('caregiver_invites').insert([
        {
          child_id: selectedChild.id,
          invited_email: cleanEmail,
          role,
          invite_code: inviteCode,
          status: 'pending',
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      Alert.alert(
        'Invite Created',
        `Invite code: ${inviteCode}\n\nShare this code with ${cleanEmail}.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Invite caregiver error:', error);

      Alert.alert(
        'Invite Failed',
        error?.message || 'Could not create caregiver invite.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color="#94A3B8" />

          <Text style={styles.emptyTitle}>No child selected</Text>

          <Text style={styles.emptyText}>
            Please select or create a child profile before inviting a caregiver.
          </Text>
        </View>
      </SafeAreaView>
    );
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
              <Ionicons name="person-add-outline" size={30} color="#4F46E5" />
            </View>

            <Text style={styles.heroTitle}>Invite Caregiver</Text>

            <Text style={styles.heroText}>
              Invite a trusted person to support {childName}’s routines,
              progress, and care plan.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Caregiver Email</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.helperText}>
              They will use this email with the invite code you create.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Choose Role</Text>

            {ROLE_OPTIONS.map((option) => {
              const active = role === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.roleCard, active && styles.roleCardActive]}
                  onPress={() => setRole(option.value)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.roleIcon, active && styles.roleIconActive]}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={active ? '#FFFFFF' : '#4F46E5'}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.roleTitle,
                        active && styles.roleTitleActive,
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text style={styles.roleDescription}>
                      {option.description}
                    </Text>
                  </View>

                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#4F46E5"
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={22}
                      color="#CBD5E1"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#4F46E5"
            />

            <Text style={styles.infoText}>
              You can cancel pending invites or remove caregivers later from the
              Manage Caregivers screen.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.inviteButton, saving && styles.inviteButtonDisabled]}
            onPress={handleInvite}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                <Text style={styles.inviteButtonText}>Create Invite</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: '#4F46E5',
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
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
  },

  helperText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 10,
  },

  roleCardActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },

  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  roleIconActive: {
    backgroundColor: '#4F46E5',
  },

  roleTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  roleTitleActive: {
    color: '#3730A3',
  },

  roleDescription: {
    marginTop: 3,
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

  inviteButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  inviteButtonDisabled: {
    opacity: 0.7,
  },

  inviteButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
});
