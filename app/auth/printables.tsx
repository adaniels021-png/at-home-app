import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RESOURCES = [
  { id: '1', title: 'Data Tracking Sheet', type: 'PDF', icon: 'document-text-outline' },
  { id: '2', title: 'Visual Schedule Icons', type: 'Image Pack', icon: 'images-outline' },
  { id: '3', title: 'Token Economy Board', type: 'PDF', icon: 'gift-outline' }
];

export default function Printables() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Printables</Text>
        <Text style={styles.subtitle}>Download tools to use during your ABA sessions.</Text>

        {RESOURCES.map((item) => (
          <TouchableOpacity key={item.id} style={styles.card} onPress={() => Linking.openURL('https://google.com')}>
            <View style={styles.iconBox}>
              <Ionicons name={item.icon as any} size={24} color="#2563EB" />
            </View>
            <View style={styles.info}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemType}>{item.type}</Text>
            </View>
            <Ionicons name="download-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 30, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 16 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  itemType: { fontSize: 12, color: '#6B7280', marginTop: 2 }
});