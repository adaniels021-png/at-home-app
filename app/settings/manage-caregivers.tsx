import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
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
import { PersonAvatar, RoleBadge, roleFriendlyName } from '../../components/caregivers/CaregiverAccessUI';

type Caregiver = {
  id: string;
  caregiver_user_id: string;
  role: string;
  status: string;
  created_at: string;
  display_name?: string;
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

      const members = (data || []) as Caregiver[];
      const userIds = members.map((item) => item.caregiver_user_id).filter(Boolean);
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [] };
      setCaregivers(members.map((item) => ({
        ...item,
        display_name: profiles?.find((profile: any) => profile.id === item.caregiver_user_id)?.full_name || roleFriendlyName(item.role),
      })));
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
            Family Access
          </Text>

          <Text style={styles.heroText}>
            Manage who can support {childName} and what they can access.
          </Text>
        </View>

        <View style={styles.ownerCard}>
          <PersonAvatar name="You" />
          <View style={styles.ownerText}><Text style={styles.ownerTitle}>Your Access</Text><Text style={styles.ownerSubtitle}>Full access to {childName}&apos;s profile and family tools.</Text></View>
          <RoleBadge role="owner" />
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
              Your Support Team Starts Here
            </Text>

            <Text style={styles.emptyText}>
              Invite a trusted parent, caregiver, family member, or provider to support {childName}.
            </Text>
          </View>
        ) : (
  caregivers.map((caregiver) => (
    <Pressable
      key={caregiver.id}
      style={styles.caregiverCard}
      accessibilityRole="button"
      accessibilityLabel={`Manage ${caregiver.display_name}'s access`}
      onPress={() => router.push({ pathname: '/settings/caregiver-access/[id]', params: { id: caregiver.id } })}
    >
      <PersonAvatar name={caregiver.display_name} />

      <View style={styles.caregiverInfo}>
        <Text style={styles.roleText}>{caregiver.display_name}</Text>

        <Text style={styles.statusText}>
          {roleFriendlyName(caregiver.role)} • {caregiver.status === 'accepted' ? 'Active' : caregiver.status}
        </Text>
        <Text style={styles.accessPreview}>{caregiver.role === 'caregiver' ? 'Lessons • Communication • Emergency Response' : caregiver.role === 'therapist' ? 'Learning • Communication • Progress' : 'Parent-facing family tools'}</Text>
      </View>
      <View style={styles.cardRight}><RoleBadge role={caregiver.role} /><Ionicons name="chevron-forward" size={19} color="#938797" /></View>
    </Pressable>
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

        <View style={styles.pendingActions}><TouchableOpacity style={styles.shareButton} onPress={() => void Share.share({ message: `Use invite code ${invite.invite_code} to join ${childName}'s support team in ABA at Home.` })}><Text style={styles.shareText}>Share Code</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => cancelInvite(invite.id)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View>
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

  ownerCard: { backgroundColor: '#FFFDF9', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E8DED5', flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ownerText: { flex: 1, marginHorizontal: 12 },
  ownerTitle: { color: '#473C49', fontSize: 15, fontWeight: '900' },
  ownerSubtitle: { color: '#776D78', marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '600' },

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
  accessPreview: { color: '#786B79', marginTop: 5, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 10 },

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
  alignItems: 'flex-start',
  marginBottom: 12,
},

pendingActions: { alignItems: 'flex-end', gap: 8, marginLeft: 8 },
shareButton: { minHeight: 36, borderRadius: 12, backgroundColor: '#EEE4F2', paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
shareText: { color: '#654276', fontSize: 11, fontWeight: '900' },
cancelButton: { minHeight: 34, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
cancelText: { color: '#A4433B', fontSize: 11, fontWeight: '900' },

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
