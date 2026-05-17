import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIVACY_POLICY_URL = '';
const TERMS_URL = '';

export default function PrivacyLegalScreen() {
  const router = useRouter();

  const openLink = async (url: string, title: string) => {
    if (!url) {
      Alert.alert(
        `${title} Link Needed`,
        `Add your published ${title} URL inside app/settings/privacy-legal.tsx.`
      );
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons name="shield-checkmark-outline" size={46} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Privacy & Legal</Text>
          <Text style={styles.heroText}>
            Review how ABA at Home protects family data and outlines app usage.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Family Data</Text>
          <InfoRow text="Child profile data is used to personalize lessons, activities, routines, and progress tools." />
          <InfoRow text="Subscription status may be managed through RevenueCat." />
          <InfoRow text="Secure account and app data may be stored with Supabase." />
          <InfoRow text="ABA at Home is educational support and does not replace clinical, medical, or therapy services." />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Documents</Text>

          <DocumentButton
            icon="document-text-outline"
            title="Privacy Policy"
            subtitle="How data is collected, used, stored, and protected."
            onPress={() => openLink(PRIVACY_POLICY_URL, 'Privacy Policy')}
          />

          <DocumentButton
            icon="reader-outline"
            title="Terms of Use / EULA"
            subtitle="Usage terms, subscriptions, disclaimers, and limitations."
            onPress={() => openLink(TERMS_URL, 'Terms of Use')}
          />
        </View>

        <View style={styles.disclaimerCard}>
          <Ionicons name="medical-outline" size={20} color="#B45309" />
          <Text style={styles.disclaimerText}>
            ABA at Home provides parent-friendly educational tools only. It is not a replacement for professional medical, psychological, behavioral, or clinical care.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function DocumentButton({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.docBtn} onPress={onPress}>
      <View style={styles.docIcon}>
        <Ionicons name={icon} size={20} color="#4F46E5" />
      </View>
      <View style={styles.docTextWrap}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  hero: { backgroundColor: '#4F46E5', borderRadius: 28, padding: 22, marginBottom: 20 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 10 },
  heroText: { color: '#E0E7FF', marginTop: 8, lineHeight: 21, fontWeight: '600' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  infoText: { flex: 1, marginLeft: 8, color: '#334155', lineHeight: 20, fontWeight: '700' },
  docBtn: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  docIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docTextWrap: { flex: 1 },
  docTitle: { color: '#0F172A', fontWeight: '900' },
  docSubtitle: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 3, fontWeight: '600' },
  disclaimerCard: { backgroundColor: '#FFFBEB', borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#FDE68A' },
  disclaimerText: { flex: 1, marginLeft: 8, color: '#92400E', lineHeight: 20, fontWeight: '700' },
});