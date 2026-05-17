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

export default function CaregiverProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [role, setRole] = useState('Parent / Caregiver');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) throw new Error('No authenticated user found.');

      const metadata = user.user_metadata || {};

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, caregiver_name, relationship_to_child, caregiver_role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.log('Profile table load warning:', profileError);
      }

      setName(
        profileData?.caregiver_name ||
          profileData?.full_name ||
          metadata.caregiver_name ||
          metadata.full_name ||
          ''
      );

      setRelationship(
        profileData?.relationship_to_child ||
          metadata.relationship_to_child ||
          ''
      );

      setRole(
        profileData?.caregiver_role ||
          metadata.caregiver_role ||
          'Parent / Caregiver'
      );
    } catch (error: any) {
      console.error('Load caregiver profile error:', error);
      Alert.alert(
        'Profile Error',
        error?.message || 'Could not load your caregiver profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedRelationship = relationship.trim();
    const trimmedRole = role.trim() || 'Parent / Caregiver';

    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter your caregiver name.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) throw new Error('No authenticated user found.');

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          caregiver_name: trimmedName,
          relationship_to_child: trimmedRelationship,
          caregiver_role: trimmedRole,
        },
      });

      if (metadataError) throw metadataError;

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          full_name: trimmedName,
          caregiver_name: trimmedName,
          relationship_to_child: trimmedRelationship,
          caregiver_role: trimmedRole,
          email: user.email || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

      if (profileError) throw profileError;

      Alert.alert('Profile Updated', 'Your caregiver profile has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Save caregiver profile error:', error);
      Alert.alert('Save Error', error?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading caregiver profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons name="person-circle-outline" size={48} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Caregiver Profile</Text>
          <Text style={styles.heroText}>
            Personalize how the app supports your family and child’s learning.
          </Text>
        </View>

        <View style={styles.card}>
          <Label text="Caregiver Name" />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Label text="Relationship to Child" />
          <TextInput
            value={relationship}
            onChangeText={setRelationship}
            placeholder="Example: Mom, Dad, Grandma, Therapist"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Label text="Caregiver Role" />
          <View style={styles.optionGrid}>
            {['Parent / Caregiver', 'Therapist', 'Teacher', 'Family Support'].map(
              (item) => {
                const active = role === item;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => setRole(item)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  content: { padding: 20, paddingBottom: 40 },

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
  },

  label: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
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

  optionGrid: { gap: 10 },

  option: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  optionActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },

  optionText: {
    color: '#475569',
    fontWeight: '800',
  },

  optionTextActive: {
    color: '#4F46E5',
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

  saveBtnDisabled: {
    opacity: 0.7,
  },

  saveText: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginLeft: 8,
  },
});