import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResourceDetail() {
  const router = useRouter();
  const { title, category, content } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Resource</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{category}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.bodyText}>
          {content || "Full article content coming soon. This module will explain clinical strategies and parental tips for this specific developmental milestone."}
        </Text>
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
  badge: { backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  badgeText: { color: '#2563EB', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', lineHeight: 34 },
  divider: { height: 4, width: 40, backgroundColor: '#2563EB', marginVertical: 24, borderRadius: 2 },
  bodyText: { fontSize: 16, color: '#374151', lineHeight: 26 }
});