import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafetyModeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Safety" onPress={() => router.canGoBack() ? router.back() : router.replace('/safety')} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color="#3F3B47" />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.icon}><Ionicons name="shield-outline" size={33} color="#A64E45" /></View>
        <Text accessibilityRole="header" style={styles.title}>Safety Mode</Text>
        <Text style={styles.body}>Choose the urgent Safety support you need right now.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Elopement Safety" onPress={() => router.push({ pathname: '/safety/emergency/elopement', params: { origin: 'safety' } })} style={styles.elopementButton}>
          <Ionicons name="navigate-outline" size={23} color="#FFFFFF" />
          <Text style={styles.elopementText}>Elopement Safety</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FA', paddingHorizontal: 20 },
  back: { width: 44, height: 44, marginTop: 8, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8F0' },
  content: { flex: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0EC' },
  title: { marginTop: 22, color: '#292631', fontSize: 29, lineHeight: 36, fontWeight: '900', textAlign: 'center' },
  body: { marginTop: 10, color: '#706A76', fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  elopementButton: { minHeight: 60, marginTop: 26, paddingHorizontal: 24, borderRadius: 30, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A64E45' },
  elopementText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
