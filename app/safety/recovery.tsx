import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Safety incidents do not fabricate Help Now intensity/outcome parameters.
// This adapter provides a compatible transition without changing the approved
// Help Now Recovery contract.
export default function SafetyRecoveryAdapterScreen() {
  const router = useRouter();
  return <SafeAreaView style={styles.container}><Stack.Screen options={{ headerShown: false }} /><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Take one slow moment.</Text>
    <Text style={styles.subtitle}>The immediate search is over. You don’t need to decide everything that comes next right now.</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>For now</Text><Text style={styles.cardText}>Stay close. Keep stimulation and demands low while everyone settles. Give yourself and your child time before asking questions.</Text></View>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.primary}><Text style={styles.primaryText}>Return Home</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/help-now/situation')} style={styles.secondary}><Text style={styles.secondaryText}>Open Help Now Support</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#17181C' }, content: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 100, paddingBottom: 70, justifyContent: 'center' }, title: { color: '#FFF', fontSize: 32, lineHeight: 40, fontWeight: '900', textAlign: 'center' }, subtitle: { marginTop: 14, color: '#C7C2CC', fontSize: 16, lineHeight: 25, fontWeight: '600', textAlign: 'center' }, card: { marginTop: 30, padding: 22, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' }, cardTitle: { color: '#E0D4F4', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }, cardText: { marginTop: 10, color: '#F3EFF5', fontSize: 17, lineHeight: 26, fontWeight: '600' }, primary: { minHeight: 60, marginTop: 28, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F4F8' }, primaryText: { color: '#211D28', fontSize: 16, fontWeight: '900' }, secondary: { minHeight: 54, marginTop: 12, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }, secondaryText: { color: '#F3EFF5', fontSize: 15, fontWeight: '800' } });
