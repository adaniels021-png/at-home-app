import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSkillStore } from '../store/useSkillStore';

const SKILLS = [
  { id: '1', name: 'Functional Communication', level: 'Emerging' },
  { id: '2', name: 'Hand Washing', level: 'Proximity' },
  { id: '3', name: 'Eye Contact', level: 'Brief' },
  { id: '4', name: 'Following Directions', level: 'One-Step' },
  { id: '5', name: 'Social Play', level: 'Parallel' },
];

export default function SelectSkill() {
  const router = useRouter();
  const { setSkill, setLevel, currentSkill } = useSkillStore();

  const handleSelect = (name: string, level: string) => {
    setSkill(name);
    setLevel(level);
    router.back(); // Go back to the dashboard with the new skill set
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Target a New Skill 🎯</Text>
      <FlatList
        data={SKILLS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.item, currentSkill === item.name && styles.selectedItem]} 
            onPress={() => handleSelect(item.name, item.level)}
          >
            <Text style={styles.skillName}>{item.name}</Text>
            <Text style={styles.skillLevel}>Current Focus: {item.level}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#1F2937' },
  item: { padding: 15, borderRadius: 10, backgroundColor: '#F3F4F6', marginBottom: 12, borderWidth: 1, borderColor: 'transparent' },
  selectedItem: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  skillName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  skillLevel: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});
