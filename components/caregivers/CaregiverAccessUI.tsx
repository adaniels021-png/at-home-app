import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CAREGIVER_ROLE_LABELS, normalizeCaregiverRole } from '../../lib/caregiverPermissions';

const TONES = {
  owner: { bg: '#E8DDF7', text: '#553070' },
  parent: { bg: '#F0E6FA', text: '#6D3A8D' },
  caregiver: { bg: '#E7EDF9', text: '#405D8A' },
  therapist: { bg: '#E1F0EC', text: '#356A60' },
} as const;

export function RoleBadge({ role }: { role?: string | null }) {
  const normalized = normalizeCaregiverRole(role) ?? 'caregiver';
  const tone = TONES[normalized];
  return <View style={[styles.badge, { backgroundColor: tone.bg }]}><Text style={[styles.badgeText, { color: tone.text }]}>{normalized.toUpperCase()}</Text></View>;
}

export function PersonAvatar({ name, size = 52 }: { name?: string | null; size?: number }) {
  const initials = (name || 'Support person').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <View accessibilityLabel={`${name || 'Support person'} avatar`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text></View>;
}

export function AccessSummary({ available, restricted }: { available: string[]; restricted: string[] }) {
  return <View style={styles.summary}>
    <Text style={styles.summaryHeading}>Can use</Text>
    {available.map((item) => <AccessLine key={item} icon="checkmark-circle" color="#4F7A68" text={item} />)}
    {restricted.length ? <Text style={[styles.summaryHeading, styles.restrictedHeading]}>Not included</Text> : null}
    {restricted.map((item) => <AccessLine key={item} icon="lock-closed" color="#8B8490" text={item} />)}
  </View>;
}

function AccessLine({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  return <View style={styles.line}><Ionicons name={icon} size={17} color={color} /><Text style={styles.lineText}>{text}</Text></View>;
}

export const roleFriendlyName = (role?: string | null) => {
  const normalized = normalizeCaregiverRole(role);
  return normalized ? CAREGIVER_ROLE_LABELS[normalized] : 'Support Person';
};

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B477C' },
  avatarText: { color: '#FFF', fontWeight: '900' },
  summary: { backgroundColor: '#FFFCF7', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E9E0D8' },
  summaryHeading: { color: '#45384A', fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  restrictedHeading: { marginTop: 15 },
  line: { minHeight: 32, flexDirection: 'row', alignItems: 'center' },
  lineText: { flex: 1, marginLeft: 9, color: '#514A54', fontSize: 14, lineHeight: 19, fontWeight: '600' },
});
