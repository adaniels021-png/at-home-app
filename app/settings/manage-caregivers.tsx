import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

import { canManageCaregivers } from '../../lib/caregiverPermissions';
import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { hasEntitlement } from '../../lib/entitlements';
import { supabase } from '../../lib/supabase';

type Caregiver = {
  id: string;
  caregiver_user_id: string;
  role: string;
  status: string;
  created_at: string;
};

export default function ManageCaregiversScreen() {
  const router = useRouter();

  const { selectedChild } = useChild() as any;
  const { isPro } = useSubscription();
  const hasProAccess = hasEntitlement(
    { isPro },
    'manage_caregivers'
  );

  const role = selectedChild?.caregiver_access_role;
  const canInvite = canManageCaregivers(role);

  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  const loadCaregivers = async () => {
    if (!selectedChild?.id) {
      setLoading(false);
      return;
    }

    if (!canInvite) {
  setLoading(false);
  return;
}

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('child_caregivers')
        .select('*')
        .eq('child_id', selectedChild.id)
        .order('created_at', { ascending: true });

        const { data: invites } = await supabase
  .from('caregiver_invites')
  .select('*')
  .eq('child_id', selectedChild.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

setPendingInvites(invites || []);

      if (error) throw error;

      setCaregivers(data || []);
    } catch (error: any) {
      console.error(error);

      Alert.alert(
        'Load Error',
        error?.message || 'Unable to load caregivers.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!hasProAccess) {
        router.replace('/subscription');
        return;
      }

      void loadCaregivers();
    }, [selectedChild?.id, canInvite, hasProAccess, router])
  );

  const cancelInvite = (inviteId: string) => {
  Alert.alert(
    'Cancel Invite',
    'Are you sure you want to cancel this invitation?',
    [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Invite',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('caregiver_invites')
              .delete()
              .eq('id', inviteId);

            if (error) throw error;

            setPendingInvites((current) =>
              current.filter((item) => item.id !== inviteId)
            );

            await loadCaregivers();
          } catch (error: any) {
            console.error('Cancel invite error:', error);

            Alert.alert(
              'Cancel Failed',
              error?.message || 'Could not cancel invite.'
            );
          }
        },
      },
    ]
  );
};

  const removeCaregiver = (caregiver: Caregiver) => {
    Alert.alert(
      'Remove Caregiver',
      'Are you sure you want to remove this caregiver?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('child_caregivers')
                .delete()
                .eq('id', caregiver.id);

              if (error) throw error;

              setCaregivers((current) =>
                current.filter((item) => item.id !== caregiver.id)
              );
            } catch (error: any) {
              Alert.alert(
                'Remove Failed',
                error?.message || 'Could not remove caregiver.'
              );
            }
          },
        },
      ]
    );
  };

  const childName =
    selectedChild?.child_name ||
    selectedChild?.name ||
    'Child';

    if (!canInvite) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.restrictedCard}>
        <Ionicons name="lock-closed-outline" size={42} color="#94A3B8" />

        <Text style={styles.restrictedTitle}>Owner Only</Text>

        <Text style={styles.restrictedText}>
          Only the child profile owner can manage caregivers or invitations.
        </Text>

        <TouchableOpacity
  style={styles.restrictedButton}
  onPress={() => router.push('/settings/accept-caregiver-invite')}
>
  <Text style={styles.restrictedButtonText}>Accept an Invite</Text>
</TouchableOpacity>
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
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons
            name="people"
            size={40}
            color="#FFFFFF"
          />

          <Text style={styles.heroTitle}>
            Manage Caregivers
          </Text>

          <Text style={styles.heroText}>
            View caregivers who currently have access to
            {` ${childName}'s `}
            profile.
          </Text>
        </View>

        <TouchableOpacity
  style={styles.inviteButton}
  onPress={() => {
  if (!canInvite) {
    Alert.alert(
      'Not Available',
      'Only the child profile owner can invite caregivers.'
    );
    return;
  }

  if (!hasProAccess) {
    router.push('/subscription');
    return;
  }

  router.push('/settings/invite-caregiver');
}}
>
  <Ionicons
    name={hasProAccess ? 'person-add' : 'lock-closed-outline'}
    size={20}
    color="#FFFFFF"
  />

  <Text style={styles.inviteButtonText}>
    {hasProAccess ? 'Invite Caregiver' : 'Invite Caregiver Pro'}
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.acceptInviteButton}
  onPress={() => router.push('/settings/accept-caregiver-invite')}
>
  <Ionicons name="key-outline" size={20} color="#4F46E5" />

  <Text style={styles.acceptInviteButtonText}>
    Accept an Invite
  </Text>
</TouchableOpacity>

        <View style={styles.infoCard}>
  <Ionicons
    name="information-circle-outline"
    size={22}
    color="#4F46E5"
  />

  <View style={styles.infoContent}>
    <Text style={styles.infoTitle}>
      Share Your Child&apos;s Progress
    </Text>

    <Text style={styles.infoText}>
      Invite parents, caregivers, family members, or therapists to securely access and support your child&apos;s learning journey.
    </Text>
  </View>
</View>

                {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4F46E5" />

            <Text style={styles.loadingText}>
              Loading caregivers...
            </Text>
          </View>
        ) : caregivers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="people-outline"
              size={42}
              color="#94A3B8"
            />

            <Text style={styles.emptyTitle}>
              Build Your Support Team
            </Text>

            <Text style={styles.emptyText}>
              Invite caregivers, therapists, and family members to collaborate on lessons, routines, communication tools, and progress tracking.
            </Text>
          </View>
        ) : (
  caregivers.map((caregiver) => (
    <View
      key={caregiver.id}
      style={styles.caregiverCard}
    >
      <View style={styles.avatar}>
        <Ionicons
          name="person"
          size={20}
          color="#4F46E5"
        />
      </View>

      <View style={styles.caregiverInfo}>
        <Text style={styles.roleText}>
           {caregiver.role.charAt(0).toUpperCase() + caregiver.role.slice(1)}
        </Text>

        <Text style={styles.statusText}>
          Status: {caregiver.status}
        </Text>
      </View>

      {role === 'owner' && caregiver.role !== 'owner' && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeCaregiver(caregiver)}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#DC2626"
          />
        </TouchableOpacity>
      )}
    </View>
  ))
)}


                
  {pendingInvites.length > 0 && (
  <>
    <Text style={styles.sectionTitle}>
      Pending Invitations
    </Text>

    {pendingInvites.map((invite) => (
      <View
        key={invite.id}
        style={styles.pendingInviteCard}
      >
        <Ionicons
          name="mail-outline"
          size={20}
          color="#4F46E5"
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.pendingEmail}>
            {invite.invited_email}
          </Text>

          <Text style={styles.pendingRole}>
            {invite.role}
          </Text>

          <Text style={styles.pendingCode}>
            Code: {invite.invite_code}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => cancelInvite(invite.id)}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#DC2626"
          />
        </TouchableOpacity>
      </View>
    ))}
  </>
)}
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
    marginBottom: 20,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },

  heroText: {
    color: '#E0E7FF',
    marginTop: 8,
    lineHeight: 21,
    fontWeight: '600',
  },

  infoCard: {
  backgroundColor: '#EEF2FF',
  borderRadius: 20,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 20,
},

infoContent: {
  flex: 1,
  marginLeft: 10,
},

infoTitle: {
  color: '#3730A3',
  fontSize: 14,
  fontWeight: '800',
  marginBottom: 4,
},

infoText: {
  color: '#4338CA',
  fontWeight: '700',
  lineHeight: 20,
},

  centered: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 20,
  },

  caregiverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  caregiverInfo: {
    flex: 1,
    marginLeft: 12,
  },

  roleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  statusText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inviteButton: {
  backgroundColor: '#4F46E5',
  borderRadius: 20,
  paddingVertical: 14,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  marginBottom: 16,
},

inviteButtonText: {
  marginLeft: 8,
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 15,
},

sectionTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#0F172A',
  marginTop: 24,
  marginBottom: 12,
},

pendingInviteCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 16,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},

pendingEmail: {
  fontSize: 15,
  fontWeight: '900',
  color: '#0F172A',
},

pendingRole: {
  marginTop: 4,
  color: '#64748B',
  fontWeight: '700',
},

pendingCode: {
  marginTop: 4,
  color: '#4F46E5',
  fontWeight: '800',
},

acceptInviteButton: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  paddingVertical: 14,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#C7D2FE',
},

acceptInviteButtonText: {
  marginLeft: 8,
  color: '#4F46E5',
  fontWeight: '900',
  fontSize: 15,
},

restrictedCard: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
},

restrictedTitle: {
  marginTop: 14,
  fontSize: 22,
  fontWeight: '900',
  color: '#0F172A',
},

restrictedText: {
  marginTop: 8,
  color: '#64748B',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
  lineHeight: 21,
},

restrictedButton: {
  marginTop: 22,
  backgroundColor: '#4F46E5',
  borderRadius: 18,
  paddingVertical: 13,
  paddingHorizontal: 22,
},

restrictedButtonText: {
  color: '#FFFFFF',
  fontWeight: '900',
},
});
