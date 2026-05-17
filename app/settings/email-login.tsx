import { Ionicons } from '@expo/vector-icons';
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

export default function EmailLoginScreen() {
  const router = useRouter();

  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        const email = data.user?.email || '';

        setCurrentEmail(email);
        setNewEmail(email);
      } catch (error) {
        console.error('Load email error:', error);
      }
    };

    void load();
  }, []);

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter an email address.'
      );
      return;
    }

    if (newEmail.trim() === currentEmail.trim()) {
      Alert.alert(
        'No Changes',
        'Please enter a different email address.'
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) throw error;

      Alert.alert(
  'Email Update Started',
  'For security, please check your email to confirm this change.',
  [
    {
      text: 'OK',
      onPress: () => router.back(),
    },
  ]
);
    } catch (error: any) {
  console.error('Email update error:', error);

  Alert.alert(
    'Email Update Failed',
    error?.message || 'Could not update email.'
  );
} finally {
      setSaving(false);
    }
  };



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
            name="mail-outline"
            size={44}
            color="#FFFFFF"
          />

          <Text style={styles.heroTitle}>
            Email & Login
          </Text>

          <Text style={styles.heroText}>
            Manage the email address connected to your ABA at Home account.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>
            Current Email
          </Text>

          <View style={styles.readOnlyBox}>
            <Ionicons
              name="mail"
              size={18}
              color="#4F46E5"
            />

            <Text style={styles.readOnlyText}>
              {currentEmail || 'No email found'}
            </Text>
          </View>

          <Text style={styles.label}>
            New Email
          </Text>

          <TextInput
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            placeholder="Enter new email"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <TouchableOpacity
            style={[
              styles.saveBtn,
              saving && { opacity: 0.7 },
            ]}
            onPress={handleUpdateEmail}
            disabled={saving}
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

                <Text style={styles.saveText}>
                  Update Email
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#2563EB"
          />

          <Text style={styles.noteText}>
            Your login email is securely managed through your authenticated ABA at Home account.
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
  },

  label: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },

  readOnlyBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  readOnlyText: {
    marginLeft: 8,
    color: '#3730A3',
    fontWeight: '800',
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#0F172A',
    fontWeight: '700',
  },

  saveBtn: {
    marginTop: 22,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  saveText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
  },

  noteCard: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  noteText: {
    flex: 1,
    marginLeft: 8,
    color: '#1D4ED8',
    fontWeight: '700',
    lineHeight: 20,
  },
});