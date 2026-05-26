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
import { runInBackground, withTimeout } from '../../lib/performance';
import { supabase } from '../../lib/supabase';

export default function AddChild() {
  const router = useRouter();

  const childContext = useChild() as any;
  const children = childContext?.children || [];
  const refreshChildren = childContext?.refreshChildren;
  const setSelectedChild = childContext?.setSelectedChild;
  const selectedChild = childContext?.selectedChild;

  const { isPro, adminMode, loading: subscriptionLoading } = useSubscription();

  const hasProAccess = isPro || adminMode;

  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverRelationship, setCaregiverRelationship] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);

  const childCount = useMemo(() => {
    return Array.isArray(children) ? children.length : 0;
  }, [children]);

  const isFirstChild = childCount === 0;

  useEffect(() => {
    if (subscriptionLoading) return;

    if (!hasProAccess && childCount >= 1) {
      Alert.alert(
        'Pro Feature',
        'Your free plan includes 1 child profile. Upgrade to Pro to add another child.',
        [
          {
            text: 'Maybe Later',
            style: 'cancel',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            },
          },
          {
            text: 'Upgrade',
            onPress: () => router.replace('/subscription'),
          },
        ]
      );

      return;
    }

    setCheckedAccess(true);
  }, [childCount, hasProAccess, subscriptionLoading, router]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSave = async () => {
    const trimmedCaregiverName = caregiverName.trim();
    const trimmedCaregiverRelationship = caregiverRelationship.trim();
    const trimmedName = name.trim();
    const trimmedAge = age.trim();

    if (isFirstChild && (!trimmedCaregiverName || !trimmedCaregiverRelationship)) {
      Alert.alert(
        'Missing Caregiver Info',
        'Please enter your name and relationship to the child.'
      );
      return;
    }

    if (!trimmedName || !trimmedAge) {
      Alert.alert('Missing Info', 'Please provide a child name and age.');
      return;
    }

    const parsedAge = Number.parseInt(trimmedAge, 10);

    if (Number.isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 21) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 1 and 21.');
      return;
    }

    if (!hasProAccess && childCount >= 1) {
      Alert.alert(
        'Pro Feature',
        'Your free plan includes 1 child profile. Upgrade to Pro to add another child.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.replace('/subscription') },
        ]
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
        throw new Error('No active account found. Please log in again.');
      }

      if (isFirstChild) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            full_name: trimmedCaregiverName,
            caregiver_name: trimmedCaregiverName,
            relationship_to_child: trimmedCaregiverRelationship,
            caregiver_role: trimmedCaregiverRelationship,
          },
        });

        if (metadataError) throw metadataError;

        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            full_name: trimmedCaregiverName,
            caregiver_name: trimmedCaregiverName,
            relationship_to_child: trimmedCaregiverRelationship,
            caregiver_role: trimmedCaregiverRelationship,
            email: user.email || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (profileError) throw profileError;
      }

      const { data, error } = await withTimeout(
        supabase
          .from('children')
          .insert({
            parent_id: user.id,
            child_name: trimmedName,
            name: trimmedName,
            age: parsedAge,
            child_age: String(parsedAge),
            caregiver_relationship:
              trimmedCaregiverRelationship ||
              selectedChild?.caregiver_relationship ||
              'Caregiver',
          })
          .select('*')
          .single(),
        10000,
        'Creating child profile took too long. Please check your connection.'
      );

      if (error) throw error;

      if (typeof setSelectedChild === 'function') {
        setSelectedChild(data);
      }

      runInBackground(async () => {
        if (typeof refreshChildren === 'function') {
          await refreshChildren();
        }
      }, 'Refresh children after add child');

      router.replace('/onboarding/assessment');
    } catch (error: any) {
      console.error('Add child error:', error);

      Alert.alert(
        'Could Not Create Profile',
        error?.message || 'Something went wrong while creating this child profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (subscriptionLoading || !checkedAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Checking access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <View style={styles.stepBadge}>
  <Text style={styles.stepBadgeText}>STEP 1 OF 3</Text>
</View>

        <View style={styles.header}>
          <Text style={styles.title}>
       {isFirstChild ? 'Create Your Family Profile' : 'Add Another Child'}
       </Text>

  <Text style={styles.subtitle}>
    {isFirstChild
      ? 'We’ll use this information to personalize lessons, routines, communication tools, worksheets, and parent support.'
      : 'Each child gets their own personalized lessons, routines, communication tools, and progress tracking.'}
  </Text>
      </View>

          <View style={styles.proCard}>
            <View style={styles.proHeader}>
              <Ionicons
                name={isFirstChild ? 'checkmark-circle' : 'people-circle'}
                size={18}
                color="#4F46E5"
              />

              <Text style={styles.proTitle}>
              {isFirstChild ? 'Your First Child Profile' : 'Family Profiles'}
              </Text>
            </View>

            <Text style={styles.proText}>
               {isFirstChild
              ? 'Your first child profile is included in the free plan. Additional child profiles can be added with Pro.'
              : 'One caregiver account can support multiple children with separate lessons, assessments, and progress.'}
            </Text>
          </View>

          <View style={styles.formCard}>
            {isFirstChild ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your Name</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Example: Ashley"
                    value={caregiverName}
                    onChangeText={setCaregiverName}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Relationship to Child</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Example: Mom, Dad, Grandma, Caregiver"
                    value={caregiverRelationship}
                    onChangeText={setCaregiverRelationship}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Child’s Name</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter child name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholderTextColor="#9CA3AF"
                maxLength={2}
              />
            </View>

            <View style={styles.accountCard}>
              <Ionicons name="person-circle-outline" size={20} color="#4F46E5" />
              <View style={{ flex: 1 }}>
                <Text style={styles.accountTitle}>
                  Connected to your caregiver account
                </Text>
                <Text style={styles.accountText}>
                  This child will be added under your current ABA at Home login.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveBtnText}>Continue to Step 2</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#4F46E5"
              />
              <Text style={styles.infoTitle}>What happens next?</Text>
            </View>

            <Text style={styles.infoText}>
              After the profile is created, the app will open the child assessment.
              That assessment will help personalize lessons, routines, PECS cards,
              worksheets, behavior supports, and progress tracking.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '600',
  },

  proCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  proTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#3730A3',
  },

  proText: {
    color: '#4338CA',
    lineHeight: 21,
    fontSize: 14,
    fontWeight: '700',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },

  accountCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },

  accountTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },

  accountText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  saveBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },

  saveBtnDisabled: {
    opacity: 0.75,
  },

  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  infoTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },

  infoText: {
    color: '#64748B',
    lineHeight: 21,
    fontSize: 14,
    fontWeight: '600',
  },

  stepBadge: {
  alignSelf: 'flex-start',
  backgroundColor: '#EEF2FF',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 999,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#C7D2FE',
},

stepBadgeText: {
  color: '#4338CA',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 0.5,
},
});