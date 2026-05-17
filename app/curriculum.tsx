import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS = [
  "Day 1: Understanding Reinforcement",
  "Day 2: Identifying Antecedents",
  "Day 3: Setting Up Your Environment",
  "Day 4: Natural Environment Teaching",
  "Day 5: Tracking Success Metrics",
  "Day 6: Generalization Strategies",
  "Day 7: Review & Week 1 Assessment"
];

export default function CurriculumScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>30-Day ABA Roadmap</Text>
        <Text style={styles.subHeader}>Guided behavioral support for home sessions.</Text>
        
        {DAYS.map((day, index) => (
          <View key={index} style={styles.dayCard}>
            <View>
              <Text style={styles.dayTitle}>{day}</Text>
              <Text style={styles.lockedText}>🔒 Pro Content</Text>
            </View>
            <View style={styles.bullet} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  subHeader: { fontSize: 16, color: '#666', marginBottom: 30, marginTop: 5 },
  dayCard: { 
    backgroundColor: '#f8f9fa', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee'
  },
  dayTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  lockedText: { fontSize: 12, color: '#007AFF', marginTop: 4, fontWeight: '500' },
  bullet: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ddd' }
});
