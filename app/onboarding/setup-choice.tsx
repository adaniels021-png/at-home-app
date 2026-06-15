import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SetupChoiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="people-outline" size={34} color="#4F46E5" />
          </View>

          <Text style={styles.heroTitle}>Welcome to ABA at Home</Text>

          <Text style={styles.heroText}>
            Are you setting up a new child profile, or joining a profile someone
            already created?
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryCard}
          activeOpacity={0.9}
          onPress={() => router.push('/onboarding/add-child' as any)}
        >
          <View style={styles.cardIcon}>
            <Ionicons name="add-circle-outline" size={30} color="#FFFFFF" />
          </View>

          <View style={styles.cardTextWrap}>
            <Text style={styles.primaryTitle}>Set Up My Child</Text>
            <Text style={styles.primaryText}>
              Create a child profile, complete the assessment, and personalize
              the app.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCard}
          activeOpacity={0.9}
          onPress={() => router.push('/settings/accept-caregiver-invite' as any)}
        >
          <View style={styles.secondaryIcon}>
            <Ionicons name="key-outline" size={28} color="#4F46E5" />
          </View>

          <View style={styles.cardTextWrap}>
            <Text style={styles.secondaryTitle}>I Have an Invite Code</Text>
            <Text style={styles.secondaryText}>
              Join an existing child profile without creating a duplicate one.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#4F46E5" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#4F46E5" />

          <Text style={styles.infoText}>
            Invited caregivers only get access after entering a valid invite code.
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

  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroIcon: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  heroTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  heroText: {
    color: '#64748B',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '700',
    fontSize: 14,
  },

  primaryCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  secondaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  secondaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardTextWrap: {
    flex: 1,
  },

  primaryTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  primaryText: {
    color: '#E0E7FF',
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '700',
  },

  secondaryTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  secondaryText: {
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '700',
  },

  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#4338CA',
    fontWeight: '700',
    lineHeight: 18,
    fontSize: 13,
  },
});