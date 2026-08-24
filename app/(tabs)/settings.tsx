import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  canAddChild,
  canDeleteChildProfile,
  canDeleteOwnAccount,
  canManageCaregivers,
  canManageLessonReminders,
  canManagePecs,
  canManageSubscription,
  canRunAssessments,
} from '../../lib/caregiverPermissions';
import { useAdminAccess } from '../../lib/adminAccess';
import { deleteChildProfile } from '../../lib/deleteChildProfile';
import { useResponsiveLayout } from '../../lib/responsive';
import { useChild } from '../../lib/SelectedChildContext';
import { useSubscription } from '../../lib/SubscriptionContext';
import { useChildSubscription } from '../../lib/ChildSubscriptionContext';
import { canAccessRoute, hasEntitlement } from '../../lib/entitlements';
import { supabase } from '../../lib/supabase';

type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  helper?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

export default function SettingsScreen() {
  const router = useRouter();
  const layout = useResponsiveLayout();

  const childContext = useChild() as any;
  const { selectedChild, refreshChildren } = childContext;

  const { isPro: personalIsPro } = useSubscription();
  const { isPro } = useChildSubscription();

  const [deletingChild, setDeletingChild] = useState(false);
  const { isAdmin: isAppAdmin } = useAdminAccess();
  

  const hasProAccess = hasEntitlement(
    { isPro },
    'premium_tool'
  );
  const personalHasProAccess = hasEntitlement(
    { isPro: personalIsPro },
    'premium_tool'
  );

  const role = selectedChild?.caregiver_access_role;

const allowAddChild = canAddChild(role);
const allowDeleteChild = canDeleteChildProfile(role);
const allowManageCaregivers = canManageCaregivers(role);
const allowManageSubscription = canManageSubscription(role);
const allowManagePecs = canManagePecs(role);
const allowLessonReminders = canManageLessonReminders(role);
const allowRunAssessments = canRunAssessments(role);
const allowDeleteOwnAccount = canDeleteOwnAccount(role);

  const childName =
    selectedChild?.child_name ||
    selectedChild?.name ||
    selectedChild?.first_name ||
    'this child';

  const handleDeleteChild = () => {
    if (!selectedChild?.id) {
      Alert.alert('No Child Selected', 'Please select a child profile first.');
      return;
    }

    Alert.alert(
      'Delete Child Profile?',
      `This will permanently delete ${childName}'s profile, lessons, routines, PECS cards, progress, and assessment data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingChild(true);

            try {
              await deleteChildProfile(selectedChild.id);
              await refreshChildren?.();

              Alert.alert(
                'Deleted',
                `${childName}'s profile was deleted successfully.`
              );

              router.replace('/(tabs)/settings');
            } catch (error: any) {
              console.error('Delete child error:', error);

              Alert.alert(
                'Delete Failed',
                error?.message || 'Could not delete this child profile.'
              );
            } finally {
              setDeletingChild(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  const handleDeleteAccount = () => {
    router.push('/settings/delete-account');
  };

  const openRoute = (path: string) => {
    router.push(path as any);
  };

  const openPremiumRoute = (path: string) => {
    if (!canAccessRoute({ isPro }, path)) {
      router.push('/subscription');
      return;
    }

    router.push(path as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            alignItems: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, { maxWidth: layout.maxContentWidth }]}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>Settings</Text>

            <Text style={styles.subtitle}>
              Manage your account, child profiles, subscription, legal links, and app tools.
            </Text>

            <View style={styles.statusPill}>
              <Ionicons
                name={hasProAccess ? 'sparkles' : 'lock-closed-outline'}
                size={15}
                color={hasProAccess ? '#6D28D9' : '#64748B'}
              />

              <Text
                style={[
                  styles.statusPillText,
                  hasProAccess && styles.statusPillTextPro,
                ]}
              >
                {hasProAccess ? 'Pro tools available' : 'Free plan'}
              </Text>
            </View>
          </View>

         {isAppAdmin ? (
  <Section title="Admin Tools">
    <SettingItem
      icon="sparkles-outline"
      label="AI Content Studio"
      helper="Open the complete admin command center for lessons, curriculum, activities, AI assets, and worksheets"
      onPress={() => openRoute('/admin/content-studio')}
    />
  </Section>
) : null}

          {!hasProAccess && allowManageSubscription ? (
            <TouchableOpacity
              style={styles.proCard}
              onPress={() => router.push('/subscription')}
              activeOpacity={0.9}
            >
              <View style={styles.proTopRow}>
                <View style={styles.proIconWrap}>
                  <Ionicons name="star" size={22} color="#F59E0B" />
                </View>

                <View style={styles.proTextWrap}>
                  <Text style={styles.proTitle}>Upgrade to Pro</Text>
                  <Text style={styles.proText}>
                    Unlock unlimited lessons, activity generation, worksheets,
                    PECS tools, and multi-child support.
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#C2410C" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeProCard}>
              <View style={styles.proTopRow}>
                <View style={styles.activeProIconWrap}>
                  <Ionicons name="sparkles" size={22} color="#7C3AED" />
                </View>

                <View style={styles.proTextWrap}>
                  <Text style={styles.activeProTitle}>Pro Active</Text>
                  <Text style={styles.activeProText}>
                    Premium tools and testing features are unlocked.
                  </Text>
                </View>
              </View>
            </View>
          )}

          <Section title="Account">
            <SettingItem
              icon="person-outline"
              label="Profile Settings"
              helper="Manage caregiver account details"
              onPress={() => openRoute('/settings/profile-settings')}
            />

            <SettingItem
              icon="log-out-outline"
              label="Log Out"
              helper="Sign out of this account"
              onPress={handleLogout}
            />

            <SettingItem
  icon="trash-outline"
  label="Delete Account"
  sub={!allowDeleteOwnAccount ? 'Owner only' : undefined}
  helper="Permanently delete your account and app data"
  destructive
  disabled={!allowDeleteOwnAccount}
  onPress={handleDeleteAccount}
/>
          </Section>


         <Section title="Child Profiles">
  <SettingItem
    icon="add-circle-outline"
    label="Add Child"
    sub={!allowAddChild ? 'Owner only' : hasProAccess ? undefined : '1st Free'}
    helper="Create or add another child profile"
    disabled={!allowAddChild}
    onPress={() => openRoute('/onboarding/add-child')}
  />

  <SettingItem
  icon="refresh-circle-outline"
  label="Reassess Child Profile"
  sub={!allowRunAssessments ? 'Parent only' : undefined}
  helper="Update lessons and recommendations based on current needs"
  disabled={!allowRunAssessments}
  onPress={() => openRoute('/onboarding/assessment')}
/>

  <SettingItem
    icon="stats-chart-outline"
    label="View Progress"
    helper="See lesson history, weekly growth, and recent wins"
    onPress={() => openRoute('/(tabs)/progress')}
  />

  {allowManageCaregivers ? <SettingItem
    icon="people-outline"
    label="Manage Caregivers"
    sub={
      !allowManageCaregivers
        ? 'Owner only'
        : hasProAccess
        ? undefined
        : 'Pro'
    }
    helper="Invite another caregiver to access this child’s profile"
    onPress={() => openPremiumRoute('/settings/manage-caregivers')}
  /> : <SettingItem icon="person-circle-outline" label={`My Access to ${childName}`} helper="View your role and child-specific permissions" onPress={() => openRoute('/settings/caregiver-profile')} />}

  <SettingItem
    icon="trash-outline"
    label={deletingChild ? 'Deleting Child...' : 'Delete Child Profile'}
    helper={
      selectedChild
        ? `Permanently delete ${childName} and related app data`
        : 'No child profile selected'
    }
    destructive
    disabled={deletingChild || !allowDeleteChild}
    sub={!allowDeleteChild ? 'Owner only' : undefined}
    onPress={handleDeleteChild}
  />
</Section>

          <Section title="Subscription">
            <SettingItem
  icon="card-outline"
  label={personalHasProAccess ? 'Manage Subscription' : 'View Subscription Options'}
  sub={!allowManageSubscription ? 'Owner only' : undefined}
  helper={
    personalHasProAccess
      ? 'Change plans or cancel through Apple'
      : 'Choose monthly or yearly Pro access'
  }
  disabled={!allowManageSubscription}
  onPress={() => router.push('/subscription')}
/>
          </Section>

          <Section title="Help">
            <SettingItem
              icon="play-circle-outline"
              label="Replay Getting Started Guide"
              helper="Review the warm introduction to ABA at Home"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/daily-lessons',
                  params: { replay: '1' },
                } as any)
              }
            />

            <SettingItem
              icon="help-circle-outline"
              label="Help & Support"
              helper="Get help, report an issue, or contact support"
              onPress={() => openRoute('/settings/support')}
            />
          </Section>

          <Section title="Legal">
            <SettingItem
              icon="document-text-outline"
              label="Privacy Policy"
              helper="Review how ABA at Home handles privacy and data"
              onPress={() => openRoute('/settings/privacy-policy')}
            />

            <SettingItem
              icon="reader-outline"
              label="Terms of Use"
              helper="View app terms and subscription terms"
              onPress={() => openRoute('/settings/terms-of-use')}
            />
          </Section>

          <Section title="App Tools">
            <SettingItem
              icon="chatbubbles-outline"
              label="Communication / PECS"
              helper="Open visual communication supports"
              onPress={() => openRoute('/communication')}
            />

            <SettingItem
  icon="images-outline"
  label="Manage PECS Cards"
  sub={!allowManagePecs ? 'Parent only' : hasProAccess ? undefined : 'Pro'}
  helper="Create, edit, and organize PECS cards"
  disabled={!allowManagePecs}
  onPress={() => openPremiumRoute('/manage-pecs')}
/>

            <SettingItem
              icon="document-text-outline"
              label="Worksheets"
              sub={hasProAccess ? undefined : 'Pro'}
              helper="Access printable learning materials"
              onPress={() => openPremiumRoute('/worksheets')}
            />
          </Section>

          <Section title="App Preferences">
           <SettingItem
  icon="notifications-outline"
  label="Daily Lesson Reminders"
  sub={!allowLessonReminders ? 'Parent only' : undefined}
  helper="Set parent practice reminders"
  disabled={!allowLessonReminders}
  onPress={() => openRoute('/settings/daily-reminders')}
/>

            <SettingItem
              icon="volume-high-outline"
              label="Communication Voice"
              helper="Choose a clearer voice for PECS speech"
              onPress={() => openRoute('/settings/voice-settings')}
            />
          </Section>

          <Text style={styles.versionText}>ABA at Home</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBox}>{children}</View>
    </View>
  );
}

function SettingItem({
  icon,
  label,
  sub,
  helper,
  destructive,
  disabled,
  onPress,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={[styles.item, disabled && styles.disabledItem]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconWrap, destructive && styles.destructiveIconWrap]}>
          <Ionicons
            name={icon}
            size={20}
            color={destructive ? '#DC2626' : '#4F46E5'}
          />
        </View>

        <View style={styles.itemTextWrap}>
          <Text style={[styles.itemText, destructive && styles.destructiveText]}>
            {label}
          </Text>

          {helper ? <Text style={styles.helperText}>{helper}</Text> : null}
        </View>
      </View>

      <View style={styles.itemRight}>
        {sub ? <Text style={styles.subText}>{sub}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { 
  flex: 1, 
  backgroundColor: '#FFF7ED',
},

content: { 
  paddingTop: 20, 
  paddingBottom: 120,
},

headerCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 32,
  padding: 22,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E9D5FF',
  shadowColor: '#7C3AED',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
},

title: { 
  fontSize: 34, 
  fontWeight: '900', 
  color: '#2E1065',
},

subtitle: {
  color: '#7C3AED',
  marginTop: 8,
  lineHeight: 22,
  fontWeight: '700',
},

statusPill: {
  marginTop: 16,
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F5F3FF',
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderWidth: 1,
  borderColor: '#DDD6FE',
},

sectionTitle: {
  fontSize: 19,
  fontWeight: '900',
  marginBottom: 10,
  color: '#2E1065',
},

sectionBox: {
  backgroundColor: '#FFFFFF',
  borderRadius: 28,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '#E9D5FF',
  shadowColor: '#7C3AED',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
},

item: {
  paddingVertical: 18,
  paddingHorizontal: 18,
  borderBottomWidth: 1,
  borderBottomColor: '#F3E8FF',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

iconWrap: {
  width: 48,
  height: 48,
  borderRadius: 18,
  backgroundColor: '#F5F3FF',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

itemText: {
  fontWeight: '900',
  color: '#1E1B4B',
  fontSize: 15,
},

helperText: {
  marginTop: 4,
  color: '#64748B',
  fontSize: 13,
  fontWeight: '700',
  lineHeight: 18,
},

proCard: {
  backgroundColor: '#FFF7ED',
  padding: 18,
  borderRadius: 28,
  marginBottom: 22,
  borderWidth: 1,
  borderColor: '#FDBA74',
},

activeProCard: {
  backgroundColor: '#F5F3FF',
  padding: 18,
  borderRadius: 28,
  marginBottom: 22,
  borderWidth: 1,
  borderColor: '#C4B5FD',
},

  disabledItem: { opacity: 0.6 },

  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  subText: {
    marginRight: 6,
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 12,
  },

  

  proTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  proIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  activeProIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  proTextWrap: { flex: 1 },

  proTitle: {
    fontWeight: '900',
    color: '#9A3412',
    fontSize: 16,
  },

  proText: {
    marginTop: 4,
    color: '#C2410C',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  
  activeProTitle: {
    fontWeight: '900',
    color: '#6D28D9',
    fontSize: 16,
  },

  activeProText: {
    marginTop: 4,
    color: '#7C3AED',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  versionText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '800',
  },

  adminCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  adminLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  adminIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  adminTextWrap: {
    marginLeft: 10,
    flex: 1,
  },

  adminTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
  },

  adminText: {
    marginTop: 4,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },

  adminToggle: {
    backgroundColor: '#94A3B8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },

  adminToggleActive: { backgroundColor: '#4F46E5' },

  adminToggleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },

  contentInner: { 
  width: '100%' 
},

statusPillText: {
  marginLeft: 6,
  color: '#64748B',
  fontSize: 12,
  fontWeight: '900',
},

statusPillTextPro: { 
  color: '#6D28D9' 
},

section: { 
  marginBottom: 26 
},

itemLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  paddingRight: 10,
},

destructiveIconWrap: { 
  backgroundColor: '#FEE2E2' 
},

itemTextWrap: { 
  flex: 1 
},

destructiveText: { 
  color: '#DC2626' 
},
});
