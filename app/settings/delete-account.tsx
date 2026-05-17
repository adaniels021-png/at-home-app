import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account and app data. This action cannot be undone.',
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

          <Text style={styles.text}>
            Deleting your account will permanently remove your caregiver
            profile, child profiles, lesson data, PECS data, reminders, saved
            app content, and login access connected to this account.
          </Text>

          <Text style={styles.warningText}>
            This action cannot be undone.
          </Text>

          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
            onPress={deleteAccount}
            disabled={deleting}
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

  warningText: {
    marginTop: 12,
    color: '#DC2626',
    fontWeight: '900',
    lineHeight: 21,
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