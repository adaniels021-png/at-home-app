import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TOPICS = [
  // --- ABA BASICS ---
  { 
    id: '1', 
    title: 'The ABCs of Behavior', 
    category: 'ABA Basics', 
    icon: 'school', 
    color: '#3B82F6',
    content: 'ABC stands for Antecedent, Behavior, and Consequence. Understanding what happens right before and right after a behavior helps you understand WHY it is happening.' 
  },
  { 
    id: '2', 
    title: 'Positive Reinforcement', 
    category: 'Strategies', 
    icon: 'star', 
    color: '#10B981',
    content: 'Positive reinforcement involves the addition of a reinforcing stimulus following a behavior that makes it more likely that the behavior will occur again.' 
  },
  // --- PRINTABLE WORKSHEETS ---
  { 
    id: '4', 
    title: 'Shape Recognition', 
    category: 'Worksheets', 
    icon: 'shapes', 
    color: '#8B5CF6',
    isPrintable: 'true',
    url: 'https://example.com/worksheets/shapes.pdf', // Replace with your Supabase Storage URL
    content: 'This worksheet focuses on identifying and tracing basic shapes like circles, squares, and triangles. It helps build the visual discrimination skills needed for later letter recognition.' 
  },
  { 
    id: '5', 
    title: 'Letter Tracing (A-Z)', 
    category: 'Worksheets', 
    icon: 'pencil', 
    color: '#EC4899',
    isPrintable: 'true',
    url: 'https://example.com/worksheets/letters.pdf',
    content: 'A complete set of uppercase and lowercase letter tracing guides. This activity builds the fine motor control required for handwriting.' 
  },
  { 
    id: '6', 
    title: 'Name Tracing Template', 
    category: 'Worksheets', 
    icon: 'person-add', 
    color: '#F59E0B',
    isPrintable: 'true',
    url: 'https://example.com/worksheets/name-template.pdf',
    content: 'Use this template to practice the specific letters in your child’s name. Repetition of these familiar letters builds confidence and early literacy.' 
  },
  { 
    id: '7', 
    title: 'Color Matching', 
    category: 'Worksheets', 
    icon: 'color-filter', 
    color: '#06B6D4',
    isPrintable: 'true',
    url: 'https://example.com/worksheets/colors.pdf',
    content: 'A vibrant worksheet designed to help children match colors to everyday objects, reinforcing vocabulary and categorization skills.' 
  },
];

export default function ResourceLibrary() {
  const router = useRouter();

  const openResource = (topic: any) => {
    router.push({
      pathname: '/curriculum/resource-detail',
      params: { 
        title: topic.title, 
        category: topic.category, 
        content: topic.content,
        isPrintable: topic.isPrintable || 'false',
        url: topic.url || ''
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resource Library</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.introHeader}>
          <Text style={styles.sectionLabel}>LEARNING HUB</Text>
          <Text style={styles.introTitle}>Guides & Worksheets</Text>
          <Text style={styles.introDesc}>
            Expert ABA strategies and printable activities to support development at home.
          </Text>
        </View>

        <View style={styles.topicGrid}>
          {TOPICS.map((topic) => (
            <TouchableOpacity 
              key={topic.id} 
              style={styles.topicCard}
              onPress={() => openResource(topic)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: topic.color + '15' }]}>
                <Ionicons name={topic.icon as any} size={22} color={topic.color} />
              </View>
              <View style={styles.topicTextContent}>
                <View style={styles.categoryRow}>
                  <Text style={styles.topicCategory}>{topic.category}</Text>
                  {topic.isPrintable === 'true' && (
                    <View style={styles.printBadge}>
                      <Ionicons name="print" size={10} color="#6B7280" />
                      <Text style={styles.printBadgeText}>PDF</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.topicTitle}>{topic.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 24 },
  introHeader: { marginBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#2563EB', letterSpacing: 1, marginBottom: 8 },
  introTitle: { fontSize: 28, fontWeight: '900', color: '#111827' },
  introDesc: { fontSize: 15, color: '#6B7280', marginTop: 8, lineHeight: 22 },
  topicGrid: { gap: 12 },
  topicCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#F3F4F6',
    // Slight shadow for a premium feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  iconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  topicTextContent: { flex: 1 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicCategory: { fontSize: 10, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  printBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  printBadgeText: { fontSize: 9, fontWeight: '700', color: '#6B7280' },
  topicTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 2 }
});