import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../lib/SelectedChildContext';

type SafetyRoute =
  | '/safety/profile'
  | '/safety/emergency-contacts'
  | '/safety/wandering'
  | '/safety/location-options'
  | '/safety/emergency';

type SafetyCard = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: SafetyRoute;
  tone: 'lavender' | 'blue' | 'cream';
};

const PREPARE_CARDS: SafetyCard[] = [
  {
    title: 'Child Safety Profile',
    subtitle:
      'Keep important identification, communication, and safety information in one place.',
    icon: 'person-circle-outline',
    route: '/safety/profile',
    tone: 'lavender',
  },
  {
    title: 'Emergency Contacts',
    subtitle: 'Add the people you may need to reach quickly.',
    icon: 'call-outline',
    route: '/safety/emergency-contacts',
    tone: 'blue',
  },
  {
    title: 'Wandering & Elopement Plan',
    subtitle: 'Prepare likely places, safety concerns, and what to do if your child goes missing.',
    icon: 'navigate-outline',
    route: '/safety/wandering',
    tone: 'cream',
  },
  {
    title: 'Location Support',
    subtitle: 'Add the location tools your family already uses.',
    icon: 'location-outline',
    route: '/safety/location-options',
    tone: 'lavender',
  },
];

const TONE_STYLES = {
  lavender: { background: '#F1ECFF', icon: '#7256B6' },
  blue: { background: '#EAF4FF', icon: '#4178A8' },
  cream: { background: '#FFF4DE', icon: '#A16C2D' },
} as const;

export default function SafetyHubScreen() {
  const router = useRouter();
  const { selectedChild } = useChild();
  const child = selectedChild as
    | (typeof selectedChild & {
        first_name?: string;
        age?: number | string;
        child_age?: number | string;
      })
    | null;
  const childName =
    child?.child_name || child?.name || child?.first_name || 'Selected child';
  const childAge = child?.age || child?.child_age;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/')
            }
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-back" size={24} color="#3F3B47" />
          </Pressable>
          <View style={styles.headerIcon} accessible={false}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#7256B6" />
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          Safety
        </Text>
        <Text style={styles.intro}>
          Prepare important information now so it&apos;s easier to act quickly
          when you need it.
        </Text>

        {child ? (
          <View
            accessibilityLabel={`${childName}${childAge ? `, age ${childAge}` : ''}`}
            style={styles.childPill}
          >
            <View style={styles.childDot} />
            <Text style={styles.childText}>
              {childName}
              {childAge ? ` • ${childAge} yrs` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon} accessible={false}>
              <Ionicons name="person-add-outline" size={25} color="#7256B6" />
            </View>
            <Text style={styles.emptyTitle}>
              Choose or add a child to set up Safety.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose or add a child"
              onPress={() => router.push('/onboarding/add-child')}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emptyButtonText}>Choose or Add a Child</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Prepare
          </Text>
          <Text style={styles.sectionSubtitle}>
            Set up the information and tools you may need later.
          </Text>
        </View>

        <View style={styles.cardList}>
          {PREPARE_CARDS.map((card) => {
            const tone = TONE_STYLES[card.tone];
            return (
              <Pressable
                key={card.route}
                accessibilityRole="button"
                accessibilityLabel={`${card.title}. ${card.subtitle}`}
                onPress={() => router.push(card.route)}
                style={({ pressed }) => [
                  styles.prepareCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <View
                  accessible={false}
                  style={[
                    styles.cardIcon,
                    { backgroundColor: tone.background },
                  ]}
                >
                  <Ionicons name={card.icon} size={25} color={tone.icon} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#9A94A2"
                  accessible={false}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.sectionHeader, styles.emergencySectionHeader]}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Emergency
          </Text>
          <Text style={styles.sectionSubtitle}>
            Use these tools when something is happening right now.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Safety Mode. Fast access to emergency support and child safety information."
          onPress={() => router.push('/safety/emergency')}
          style={({ pressed }) => [
            styles.emergencyCard,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.emergencyIcon} accessible={false}>
            <Ionicons name="shield-outline" size={28} color="#A64E45" />
          </View>
          <View style={styles.cardCopy}>
            <Text style={styles.emergencyTitle}>Open Safety Mode</Text>
            <Text style={styles.emergencySubtitle}>
              Fast access to emergency support and child safety information.
            </Text>
          </View>
          <View style={styles.emergencyArrow} accessible={false}>
            <Ionicons name="arrow-forward" size={19} color="#8F433C" />
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FA' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 72 },
  headerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE8F0',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE8FA',
  },
  pressed: { opacity: 0.72 },
  title: {
    marginTop: 20,
    color: '#292631',
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  intro: {
    maxWidth: 520,
    marginTop: 10,
    color: '#696371',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  childPill: {
    alignSelf: 'flex-start',
    minHeight: 38,
    marginTop: 18,
    paddingHorizontal: 14,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2ED',
  },
  childDot: {
    width: 8,
    height: 8,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#8D72C7',
  },
  childText: { color: '#514A59', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  emptyCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E4EE',
  },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1ECFF',
  },
  emptyTitle: {
    marginTop: 13,
    color: '#3D3844',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: 48,
    marginTop: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7256B6',
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  sectionHeader: { marginTop: 32, marginBottom: 14 },
  emergencySectionHeader: { marginTop: 42 },
  sectionTitle: { color: '#302C37', fontSize: 22, lineHeight: 28, fontWeight: '900' },
  sectionSubtitle: {
    marginTop: 4,
    color: '#77717D',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  cardList: { gap: 12 },
  prepareCard: {
    minHeight: 92,
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBE7EF',
    shadowColor: '#3B3150',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.992 }] },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, marginHorizontal: 14 },
  cardTitle: { color: '#37323D', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  cardSubtitle: {
    marginTop: 4,
    color: '#746E79',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  emergencyCard: {
    minHeight: 116,
    padding: 18,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAE5',
    borderWidth: 1,
    borderColor: '#EDB9AF',
    shadowColor: '#934D45',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  emergencyIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  emergencyTitle: { color: '#713A35', fontSize: 18, lineHeight: 24, fontWeight: '900' },
  emergencySubtitle: {
    marginTop: 4,
    color: '#805A56',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  emergencyArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
