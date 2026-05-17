import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChild } from '../../lib/SelectedChildContext';

// 1. Library with numeric age ranges for filtering
const ACTIVITY_LIBRARY = [
  { id: '1', title: 'Sensory Bin Search', minAge: 2, maxAge: 4, icon: 'beaker', color: '#F472B6', desc: 'Hide small toys in rice or beans to build fine motor and tactile exploration.' },
  { id: '2', title: 'Mirror Mimicry', minAge: 1, maxAge: 3, icon: 'happy', color: '#60A5FA', desc: 'Sit in front of a mirror and practice making "happy" and "silly" faces together.' },
  { id: '3', title: 'Indoor Obstacle Course', minAge: 3, maxAge: 8, icon: 'navigate', color: '#FB923C', desc: 'Use pillows to practice following "over," "under," and "through" directions.' },
  { id: '4', title: 'Bubble Pop Counting', minAge: 2, maxAge: 5, icon: 'sunny', color: '#4ADE80', desc: 'Blow bubbles and have your child point to and count them as they pop.' },
  { id: '5', title: 'Flashlight Tag', minAge: 3, maxAge: 10, icon: 'flashlight', color: '#8B5CF6', desc: 'In a dimmed room, shine a light and have the child "catch" it with their hand.' },
  { id: '6', title: 'Sticky Wall Art', minAge: 1, maxAge: 4, icon: 'color-palette', color: '#EC4899', desc: 'Tape contact paper (sticky side out) to a wall and let them stick scraps of paper to it.' },
  { id: '7', title: 'Emotion Charades', minAge: 5, maxAge: 12, icon: 'people', color: '#F59E0B', desc: 'Act out an emotion (frustrated, excited) without words and have them guess.' },
  { id: '8', title: 'Nature Scavenger Hunt', minAge: 4, maxAge: 10, icon: 'leaf', color: '#10B981', desc: 'Find 3 different shaped leaves and something "bumpy" outside.' },
];

export default function FunActivities() {
  const router = useRouter();
  const { selectedChild } = useChild();

  // 2. Logic to filter by age AND pick daily rotation
  const dailyActivities = useMemo(() => {
    if (!selectedChild?.date_of_birth) return ACTIVITY_LIBRARY.slice(0, 3);

    // Calculate Age
    const birthDate = new Date(selectedChild.date_of_birth);
    const todayDate = new Date();
    let age = todayDate.getFullYear() - birthDate.getFullYear();
    const m = todayDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && todayDate.getDate() < birthDate.getDate())) {
      age--;
    }

    // Filter by Age Range
    const ageAppropriate = ACTIVITY_LIBRARY.filter(
      act => age >= act.minAge && age <= act.maxAge
    );

    // Use a date-based seed for rotation
    const todayStr = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Shuffle age-appropriate list
    const pool = ageAppropriate.length > 0 ? ageAppropriate : ACTIVITY_LIBRARY;
    const shuffled = [...pool].sort(() => {
      const random = Math.sin(hash++) * 10000;
      return random - Math.floor(random) - 0.5;
    });

    return shuffled.slice(0, 3);
  }, [selectedChild]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fun at Home</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.introSection}>
          <View style={styles.dailyBadge}>
            <Ionicons name="sparkles" size={12} color="#DB2777" />
            <Text style={styles.dailyBadgeText}>TAILORED FOR {selectedChild?.child_name?.toUpperCase() || 'YOU'}</Text>
          </View>
          <Text style={styles.introTitle}>Today's Play Picks</Text>
          <Text style={styles.introDesc}>
            Developmentally appropriate ideas to try today.
          </Text>
        </View>

        {dailyActivities.map((item) => (
          <TouchableOpacity key={item.id} style={styles.activityCard} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={28} color="#FFF" />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.ageBadge}>
                  <Text style={styles.ageText}>Ages {item.minAge}-{item.maxAge}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.footer}>
          <Ionicons name="refresh-circle" size={20} color="#9CA3AF" />
          <Text style={styles.footerText}>New ideas every 24 hours</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 24 },
  introSection: { marginBottom: 32 },
  dailyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FDF2F8', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  dailyBadgeText: { fontSize: 10, fontWeight: '800', color: '#DB2777' },
  introTitle: { fontSize: 26, fontWeight: '900', color: '#111827' },
  introDesc: { fontSize: 15, color: '#6B7280', marginTop: 4, lineHeight: 22 },
  activityCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 18, marginBottom: 16, flexDirection: 'row', gap: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  iconContainer: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  ageBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ageText: { fontSize: 9, fontWeight: '800', color: '#6B7280' },
  cardDesc: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  footer: { marginTop: 30, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' }
});