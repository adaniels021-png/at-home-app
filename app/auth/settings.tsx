import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || 'Anonymous Account');
    }
    getUser();
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.item}>
          <Ionicons name="mail-outline" size={20} color="#8E8E93" />
          <Text style={styles.itemText}>{email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>App Info</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>Version 1.0.0 (Beta)</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, paddingTop: 40, backgroundColor: '#fff' },
  title: { fontSize: 34, fontWeight: 'bold' },
  section: { marginTop: 30, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', marginBottom: 8, marginLeft: 10 },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12,
    gap: 10 
  },
  itemText: { fontSize: 17, color: '#1C1C1E' },
  signOutBtn: { 
    marginTop: 'auto', 
    marginBottom: 40, 
    marginHorizontal: 20, 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  signOutText: { color: '#FF3B30', fontSize: 18, fontWeight: '600' }
});
