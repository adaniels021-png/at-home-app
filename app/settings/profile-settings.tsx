import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../lib/supabase';
import { canManageCaregivers, canUseElopementResponse, canUseHelpNowGeneral, canViewSafetyProfile } from '../../lib/caregiverPermissions';
import { useChild } from '../../lib/SelectedChildContext';
import { RoleBadge, roleFriendlyName } from '../../components/caregivers/CaregiverAccessUI';

type ProfileItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
};

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { children, selectedChild } = useChild();
  const role = selectedChild?.caregiver_access_role;
  const childName = selectedChild?.child_name || selectedChild?.name || 'your child';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/auth');
    } catch (error: any) {
      Alert.alert('Logout Error', error?.message || 'Could not log out.');
    }
  };

  const openLegalLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert('Link Error', 'This link could not be opened.');
        return;
      }

      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert('Link Error', error?.message || 'Could not open this link.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Your Account</Text>

          <Text style={styles.heroSubtitle}>
            Personal details, family access, privacy, and security.
          </Text>
          <View style={styles.heroBadge}><RoleBadge role={role} /></View>
        </View>



        <Section title="My Account">
          <ProfileItem
            icon="person-circle-outline"
            title="Personal Profile"
            subtitle="Edit your display name and relationship."
            onPress={() => router.push('/settings/caregiver-profile' as any)}
          />
        
          <ProfileItem
            icon="mail-outline"
            title="Email & Login"
            subtitle="View or update your login email."
            onPress={() => router.push('/settings/email-login' as any)}
          />

          <ProfileItem
            icon="lock-closed-outline"
            title="Password & Security"
            subtitle="Send password reset email or update your password."
            onPress={() => router.push('/settings/password-security' as any)}
          />
        </Section>

        <Section title="Family & Child Access">
          <ProfileItem icon="people-circle-outline" title={`My Access to ${childName}`} subtitle={`${roleFriendlyName(role)} • View your child-specific access and settings.`} badge={role?.toUpperCase()} onPress={() => router.push('/settings/caregiver-profile' as any)} />
          {children.map((child) => child.id === selectedChild?.id ? null : <ProfileItem key={child.id} icon="person-outline" title={child.child_name || child.name || 'Child'} subtitle={`${roleFriendlyName(child.caregiver_access_role)} access`} badge={child.caregiver_access_role?.toUpperCase()} onPress={() => router.push('/settings/caregiver-profile' as any)} />)}
          {canManageCaregivers(role) ? <ProfileItem icon="people-outline" title="Manage Caregivers" subtitle={`Manage who can support ${childName}.`} onPress={() => router.push('/settings/manage-caregivers' as any)} /> : null}
          <ProfileItem icon="key-outline" title={canManageCaregivers(role) ? 'Accept an Invite' : 'Accept Another Invite'} subtitle="Connect to another child profile with an invite code." onPress={() => router.push('/settings/accept-caregiver-invite' as any)} />
          {!canUseHelpNowGeneral(role) && canUseElopementResponse(role) ? <ProfileItem icon="navigate-outline" title="Emergency Response" subtitle={`Open ${childName}'s elopement response tools.`} onPress={() => router.push('/safety/emergency/elopement' as any)} /> : null}
          {canViewSafetyProfile(role) ? <ProfileItem icon="shield-checkmark-outline" title="Safety Hub" subtitle={`Manage ${childName}'s safety and preparedness information.`} onPress={() => router.push('/safety' as any)} /> : null}
        </Section>

        <Section title="Privacy, Legal & Support">
          <ProfileItem
            icon="document-text-outline"
            title="Privacy Policy"
            subtitle="Read how ABA at Home protects and stores your data."
            onPress={() =>
              openLegalLink(
                'https://docs.google.com/document/d/e/2PACX-1vS_YJJ2JENjbHXysMq8WWI5xectm8aERFu_V7EaRrWSj_JMTc02q5x5MlvIj94BDp8JJt25Z4sR23vP/pub'
              )
            }
          />

          <ProfileItem
            icon="shield-checkmark-outline"
            title="Terms of Use"
            subtitle="Review the ABA at Home terms and conditions."
            onPress={() =>
              openLegalLink(
                'https://docs.google.com/document/d/e/2PACX-1vSdEK03Z4x_j27vnpt7ZpOx7tLBVtzFfIdbYsRULhoGh5Ubi0fehW3V-O9hzVrCQ6yXIQIGoSfF5IBx/pub'
              )
            }
          />

          <ProfileItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help, report an issue, or contact support."
            onPress={() => router.push('/settings/support' as any)}
          />
        </Section>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>ABA at Home</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ProfileItem({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: ProfileItemProps) {
  return (
    <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color="#4F46E5" />
        </View>

        <View style={styles.itemTextWrap}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.itemRight}>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F1E9' },
  content: { padding: 20, paddingBottom: 40 },

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

  heroCard: {
    backgroundColor: '#4E315A',
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },

  heroSubtitle: {
    color: '#E0E7FF',
    marginTop: 8,
    lineHeight: 21,
    fontWeight: '600',
  },
  heroBadge: { marginTop: 14 },

  section: { marginBottom: 22 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  itemTextWrap: { flex: 1 },

  itemTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  itemSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    fontWeight: '600',
  },

  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  badge: {
    backgroundColor: '#F5F3FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },

  badgeText: {
    color: '#7C3AED',
    fontWeight: '900',
    fontSize: 11,
  },

  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
  },

  logoutText: {
    color: '#DC2626',
    marginLeft: 8,
    fontWeight: '900',
    fontSize: 14,
  },

  footerText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontWeight: '800',
    marginTop: 24,
    fontSize: 12,
  },
});
