import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Purchases from 'react-native-purchases';

export default function PaywallScreen() {
  const handlePurchase = async () => {
    try {
      const offerings = await Purchases.getOfferings();
const packageToBuy =
  offerings.current?.monthly ??
  offerings.current?.availablePackages?.[0];

if (!packageToBuy) {
  Alert.alert('Subscription unavailable', 'Please try again later.');
  return;
}

const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      if (customerInfo.entitlements.active['pro']) {
        Alert.alert("Welcome to Pro!", "All features are now unlocked.");
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock ABA at Home Pro</Text>
      <Text style={styles.benefit}>✅ Weekly Clinical Progress Reports</Text>
      <Text style={styles.benefit}>✅ Unlimited AI-Generated Activities</Text>
      <Text style={styles.benefit}>✅ Multi-Child Profile Support</Text>
      
      <TouchableOpacity style={styles.button} onPress={handlePurchase}>
        <Text style={styles.buttonText}>Subscribe Monthly</Text>
      </TouchableOpacity>
      
      <Text style={styles.footer} onPress={() => Linking.openURL('https://docs.google.com/document/d/YOUR_ID')}>
        Privacy Policy & Terms of Use
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  benefit: { fontSize: 18, marginBottom: 15, color: '#444' },
  button: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, marginTop: 30 },
  buttonText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  footer: { marginTop: 40, color: '#8E8E93', textAlign: 'center', textDecorationLine: 'underline' }
});
