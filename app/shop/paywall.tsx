import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchOfferings } from '../../lib/revenuecat';

export default function Paywall() {
  const router = useRouter();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    const available = await fetchOfferings();
    setPackages(available);
    setLoading(false);
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setLoading(true);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      if (customerInfo.entitlements.active['pro'] !== undefined) {
        Alert.alert("Welcome to Pro!", "You now have full access to ABA at Home.");
        router.replace('/(tabs)/dashboard');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase Error", e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={40} color="#2563EB" />
          </View>
          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>Supporting your child's growth with expert-designed tools.</Text>
        </View>

        <View style={styles.benefits}>
          <BenefitItem icon="calendar" text="Complete 30-Day ABA Curriculum" />
          <BenefitItem icon="people" text="Unlimited Child Profiles" />
          <BenefitItem icon="bar-chart" text="Detailed Progress Tracking" />
          <BenefitItem icon="bulb" text="Daily Personalized Activities" />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FFF" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.packageList}>
            {packages.map((pkg) => (
              <TouchableOpacity 
                key={pkg.identifier} 
                style={styles.packageCard}
                onPress={() => handlePurchase(pkg)}
              >
                <View>
                  <Text style={styles.pkgName}>{pkg.product.title}</Text>
                  <Text style={styles.pkgPrice}>{pkg.product.priceString}</Text>
                </View>
                <View style={styles.pkgBadge}>
                  <Text style={styles.pkgBadgeText}>START FREE TRIAL</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          Recurring billing. Cancel anytime in your App Store settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BenefitItem({ icon, text }: { icon: any, text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon} size={22} color="#2563EB" />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  closeBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  content: { padding: 32, alignItems: 'center' },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 24 },
  benefits: { width: '100%', gap: 16, marginBottom: 40 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1F2937', padding: 16, borderRadius: 16 },
  benefitText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
  packageList: { width: '100%', gap: 12 },
  packageCard: { width: '100%', backgroundColor: '#2563EB', padding: 24, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pkgName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  pkgPrice: { color: '#DBEAFE', fontSize: 14, fontWeight: '600' },
  pkgBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pkgBadgeText: { color: '#2563EB', fontSize: 10, fontWeight: '900' },
  disclaimer: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 24 }
});