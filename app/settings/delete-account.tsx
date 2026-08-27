import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

type DeletionImpact = {
  account_role: 'OWNER' | 'CAREGIVER_ONLY' | 'MIXED';
  owned_child_count: number;
  caregiver_membership_count: number;
};

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(true);
  const [impactLoadError, setImpactLoadError] = useState(false);
  const mountedRef = useRef(true);
  const impactRequestInFlightRef = useRef(false);

  const loadDeletionImpact = useCallback(async () => {
    if (impactRequestInFlightRef.current) return;
    impactRequestInFlightRef.current = true;
    setImpactLoading(true);
    setImpactLoadError(false);
    setImpact(null);

    try {
      const { data, error } = await supabase.rpc('get_my_account_deletion_impact');
      const loadedImpact = Array.isArray(data) ? data[0] : null;
      if (!mountedRef.current) return;

      if (error || !loadedImpact) {
        setImpactLoadError(true);
      } else {
        setImpact(loadedImpact as DeletionImpact);
      }
    } catch {
      if (mountedRef.current) setImpactLoadError(true);
    } finally {
      impactRequestInFlightRef.current = false;
      if (mountedRef.current) setImpactLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadDeletionImpact();
    return () => { mountedRef.current = false; };
  }, [loadDeletionImpact]);

  const consequenceText = impact?.account_role === 'CAREGIVER_ONLY'
    ? 'Your ABA at Home login and caregiver profile will be deleted. Your access to shared children will be removed, but their profiles and data will stay with their owners. Contributions attached to those children may remain without your personal attribution.'
    : impact?.account_role === 'MIXED'
      ? 'Your ABA at Home account and child profiles you own will be permanently deleted with their learning, routines, PECS, activities, progress, and Safety data. Invited caregivers will lose access to those children, but their accounts will remain. Your access to children owned by others will also be removed; those children and their data will remain.'
      : 'Your ABA at Home account and child profiles you own will be permanently deleted with their learning, routines, PECS, activities, progress, and Safety data. Invited caregivers will lose access to those children, but their caregiver accounts will not be deleted.';

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account?',
      `${consequenceText}\n\nDeleting ABA at Home does not cancel an Apple App Store or Google Play subscription. Manage any active subscription separately in your store settings.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);

              const { data, error } = await supabase.functions.invoke(
                'delete-account'
              );

              if (error || !data?.success) {
                throw new Error(
                  error?.message ||
                    data?.error ||
                    'Account deletion failed.'
                );
              }

              await supabase.auth.signOut();

              Alert.alert(
                'Account Deleted',
                'Your account has been permanently deleted.'
              );

              router.replace('/auth');
            } catch (error: any) {
              console.error('Delete account error:', error);

              Alert.alert(
                'Delete Error',
                error?.message || 'Could not delete account right now.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.card}>
          <Ionicons name="warning-outline" size={42} color="#DC2626" />

          <Text style={styles.title}>Delete Account</Text>

          {impactLoadError ? (
            <View style={styles.impactError}>
              <Text style={styles.impactErrorTitle}>Unable to load deletion details</Text>
              <Text style={styles.impactErrorText}>
                We couldn&apos;t verify what will be removed from this account. Please try again.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadDeletionImpact}
                disabled={impactLoading}
              >
                {impactLoading ? (
                  <ActivityIndicator color="#4F46E5" />
                ) : (
                  <Text style={styles.retryText}>Try Again</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.text}>
              {impactLoading
                ? 'Checking what this account owns and can access…'
                : consequenceText}
            </Text>
          )}

          <Text style={styles.subscriptionText}>
            Deleting ABA at Home does not cancel an Apple App Store or Google
            Play subscription. Manage any active subscription separately in
            your store settings.
          </Text>

          <Text style={styles.warningText}>
            This action cannot be undone.
          </Text>

          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
            onPress={deleteAccount}
            disabled={deleting || impactLoading || impactLoadError || !impact}
          >
            {deleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                <Text style={styles.deleteText}>Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  content: {
    padding: 20,
    paddingBottom: 44,
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

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },

  text: {
    marginTop: 10,
    color: '#64748B',
    lineHeight: 22,
    fontWeight: '600',
  },

  impactError: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  impactErrorTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
  },

  impactErrorText: {
    marginTop: 5,
    color: '#64748B',
    lineHeight: 20,
    fontWeight: '600',
  },

  retryBtn: {
    alignSelf: 'flex-start',
    minWidth: 96,
    minHeight: 42,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  retryText: {
    color: '#4F46E5',
    fontWeight: '900',
  },

  warningText: {
    marginTop: 12,
    color: '#DC2626',
    fontWeight: '900',
    lineHeight: 21,
  },

  subscriptionText: {
    marginTop: 12,
    color: '#475569',
    lineHeight: 21,
    fontWeight: '700',
  },

  deleteBtn: {
    marginTop: 22,
    backgroundColor: '#DC2626',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  deleteBtnDisabled: {
    opacity: 0.7,
  },

  deleteText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    marginLeft: 8,
  },
});
