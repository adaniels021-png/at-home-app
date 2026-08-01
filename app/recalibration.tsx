import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function RecalibrationScreen() {
  const router = useRouter();
  // We can pass the top improved or top 'need' categories via params
  const { focusSkill = "Joint Attention" } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.pulseCircle}>
            <Ionicons name="sync" size={40} color="#2563EB" />
          </View>
        </View>

        <Text style={styles.title}>Curriculum Recalibrated</Text>
        <Text style={styles.subtitle}>
          Your assessment is complete. We&apos;ve analyzed the results and updated your Daily Play activities.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTag}>NEW FOCUS AREA</Text>
          <Text style={styles.cardTitle}>{focusSkill}</Text>
          <Text style={styles.cardBody}>
            Based on your answers, we&apos;re increasing the frequency of {focusSkill} activities to bridge the current developmental gap.
          </Text>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="flash" size={20} color="#F59E0B" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Adjusted Difficulty</Text>
            <Text style={styles.featureSub}>Lessons will now use more advanced prompting techniques.</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="analytics" size={20} color="#10B981" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Data Baseline Updated</Text>
            <Text style={styles.featureSub}>Your growth charts now reflect these new skill levels.</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.buttonText}>Go to Dashboard</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 30, alignItems: 'center' },
  iconContainer: { marginTop: 40, marginBottom: 30 },
  pulseCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#DBEAFE'
  },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 12, lineHeight: 24, marginBottom: 40 },
  card: {
    backgroundColor: '#111827', borderRadius: 24, padding: 25, width: '100%', marginBottom: 30
  },
  cardTag: { color: '#6366F1', fontWeight: '900', fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  cardTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  cardBody: { color: '#9CA3AF', fontSize: 14, lineHeight: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 25, paddingHorizontal: 10 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  featureSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  button: {
    backgroundColor: '#2563EB', width: '100%', padding: 20, borderRadius: 20,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 10
  },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '800' }
});
