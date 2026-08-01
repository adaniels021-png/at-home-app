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
import { runInBackground } from '../../lib/performance';

import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { hasEntitlement } from '../../lib/entitlements';
import { supabase } from '../../lib/supabase';

export default function AddChild() {
  const router = useRouter();

  const childContext = useChild() as any;
  const children = childContext?.children || [];
  const refreshChildren = childContext?.refreshChildren;
  const setSelectedChild = childContext?.setSelectedChild;
  
  const { isPro } = useSubscription();

  const hasProAccess = hasEntitlement(
    { isPro },
    'multi_child'
  );

  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverRelationship, setCaregiverRelationship] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | 'not_specified'>(
  'not_specified'
);
  const [saving, setSaving] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);

  const childCount = useMemo(() => {
    return Array.isArray(children) ? children.length : 0;
  }, [children]);

  const isFirstChild = childCount === 0;

useEffect(() => {
  let mounted = true;

  const checkAccess = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        if (mounted) setCheckedAccess(true);
        return;
      }

      const { data: sharedAccess, error } = await supabase
        .from('child_caregivers')
        .select('id')
        .eq('caregiver_user_id', user.id)
        .eq('status', 'accepted')
        .neq('role', 'owner')
        .limit(1);

      if (error) {
        console.error('Shared caregiver access check error:', error);
        if (mounted) setCheckedAccess(true);
        return;
      }

      if (sharedAccess && sharedAccess.length > 0) {
        router.replace('/(tabs)' as any);
        return;
      }

      if (!hasProAccess && childCount >= 1) {
        Alert.alert(
          'Pro Feature',
          'Your free plan includes 1 child profile. Upgrade to Pro to add another child.',
          [
            {
              text: 'Maybe Later',
              style: 'cancel',
              onPress: () => router.replace('/(tabs)' as any),
            },
            {
              text: 'Upgrade',
              onPress: () => router.replace('/subscription' as any),
            },
          ]
        );

        return;
      }

      if (mounted) setCheckedAccess(true);
    } catch (error) {
      console.error('Add child access check error:', error);

      if (mounted) setCheckedAccess(true);
    }
  };

  void checkAccess();

  return () => {
    mounted = false;
  };
}, [childCount, hasProAccess, router]);

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)' as any);
  }
};

  const timeout = (ms: number) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Check Supabase/RLS or internet connection.')), ms)
  );

const handleSave = async () => {
  if (saving) return;

  const {
  data: { user: currentUser },
} = await supabase.auth.getUser();

if (!currentUser?.id) {
  Alert.alert('Sign In Required', 'Please log in again.');
  return;
}

const { data: sharedAccess, error: sharedAccessError } = await supabase
  .from('child_caregivers')
  .select('id')
  .eq('caregiver_user_id', currentUser.id)
  .eq('status', 'accepted')
  .neq('role', 'owner')
  .limit(1);

if (sharedAccessError) {
  console.error('Add child save access check error:', sharedAccessError);
  Alert.alert('Access Check Failed', 'Please try again.');
  return;
}

  const trimmedCaregiverName = caregiverName.trim();
  const trimmedCaregiverRelationship = caregiverRelationship.trim();
  const trimmedName = name.trim();
  const trimmedAge = age.trim();

  if (isFirstChild && (!trimmedCaregiverName || !trimmedCaregiverRelationship)) {
    Alert.alert('Missing Caregiver Info', 'Please enter your name and relationship to the child.');
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

  if (!gender) {
  Alert.alert('Missing Info', 'Please choose a child visual preference.');
  return;
}

  setSaving(true);

  try {
    console.log('ADD CHILD: getting user');

    const userResult: any = await Promise.race([
      supabase.auth.getUser(),
      timeout(8000),
    ]);

    const user = userResult?.data?.user;
    const userError = userResult?.error;

    if (userError) throw userError;
    if (!user?.id) throw new Error('No active account found. Please log in again.');

    console.log('ADD CHILD: inserting child');

    const childResult: any = await Promise.race([
      supabase
        .from('children')
        .insert({
          parent_id: user.id,
          child_name: trimmedName,
          name: trimmedName,
          age: parsedAge,
          child_age: String(parsedAge),
          caregiver_relationship: trimmedCaregiverRelationship || 'Caregiver',
          gender,
        })
        .select('*')
        .single(),
      timeout(8000),
    ]);

    if (childResult?.error) throw childResult.error;

    console.log('ADD CHILD SUCCESS:', childResult.data);

if (typeof setSelectedChild === 'function') {
  setSelectedChild(childResult.data);
}

router.replace('/onboarding/assessment' as any);

runInBackground(async () => {
  if (typeof refreshChildren === 'function') {
    await refreshChildren();
  }
}, 'Refresh children after add child');
  } catch (error: any) {
    console.error('ADD CHILD FAILED:', error);
    Alert.alert('Could Not Create Profile', error?.message || 'Something went wrong.');
  } finally {
    setSaving(false);
  }
};

  if (!checkedAccess) {
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
  <Text style={styles.stepBadgeText}>STEP 1 OF 4</Text>
</View>

<View style={styles.progressTrack}>
  <View style={styles.progressFill} />
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

      <TouchableOpacity
  style={styles.inviteCodeLink}
  onPress={() =>
    router.push('/settings/accept-caregiver-invite' as any)
  }
>
  <Ionicons
    name="key-outline"
    size={17}
    color="#4F46E5"
  />

  <Text style={styles.inviteCodeLinkText}>
    I have an invite code instead
  </Text>
</TouchableOpacity>

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
              : 'The child profile owner can add multiple children with separate lessons, assessments, and progress.'}
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

            <View style={styles.inputGroup}>
  <Text style={styles.label}>Visual Preference</Text>

  <Text style={styles.helperText}>
    This helps ABA at Home show matching routine visuals, like potty routine images.
  </Text>

  <View style={styles.genderRow}>
    {[
      { id: 'boy', label: 'Boy' },
      { id: 'girl', label: 'Girl' },
      { id: 'not_specified', label: 'No Preference' },
    ].map((option) => {
      const selected = gender === option.id;

      return (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.genderButton,
            selected && styles.genderButtonSelected,
          ]}
          onPress={() => setGender(option.id as 'boy' | 'girl' | 'not_specified')}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.genderButtonText,
              selected && styles.genderButtonTextSelected,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
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
              Next, we&apos;ll learn about your child&apos;s communication,
              routines, learning style, and support needs so ABA at Home
              can create a personalized starting plan.
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

progressTrack: {
  height: 8,
  backgroundColor: '#E5E7EB',
  borderRadius: 999,
  marginBottom: 20,
},

progressFill: {
  width: '25%',
  height: '100%',
  borderRadius: 999,
  backgroundColor: '#4F46E5',
},

helperText: {
  color: '#64748B',
  fontSize: 12.5,
  fontWeight: '600',
  lineHeight: 18,
  marginBottom: 10,
},

genderRow: {
  flexDirection: 'row',
  gap: 8,
},

genderButton: {
  flex: 1,
  minHeight: 48,
  borderRadius: 16,
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 8,
},

genderButtonSelected: {
  backgroundColor: '#4F46E5',
  borderColor: '#4F46E5',
},

genderButtonText: {
  color: '#374151',
  fontSize: 12.5,
  fontWeight: '900',
  textAlign: 'center',
},

genderButtonTextSelected: {
  color: '#FFFFFF',
},

inviteCodeLink: {
  backgroundColor: '#EEF2FF',
  borderRadius: 18,
  paddingVertical: 12,
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#C7D2FE',
},

inviteCodeLinkText: {
  marginLeft: 8,
  color: '#4F46E5',
  fontWeight: '900',
  fontSize: 14,
},
});
