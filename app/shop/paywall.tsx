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
import type { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '../../lib/SubscriptionContext';
import { useChildSubscription } from '../../lib/ChildSubscriptionContext';
import {
  confirmAuthoritativeProActivation,
  getCurrentOffering,
  hasRevenueCatProEntitlement,
  purchasePackage,
} from '../../lib/revenuecat';

export default function Paywall() {
  const router = useRouter();
  const { refreshSubscription } = useSubscription();
  const { refreshChildSubscription } = useChildSubscription();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const showActivationPending = () => {
    Alert.alert(
      'Finishing Pro Activation',
      'Your purchase was successful. We’re finishing Pro activation now. You will not be charged again.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Try Again', onPress: () => { void retryActivation(); } },
      ]
    );
  };

  const retryActivation = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const activated = await confirmAuthoritativeProActivation(
        false,
        refreshSubscription,
        refreshChildSubscription
      );
      if (activated) {
        Alert.alert('Pro Is Ready', 'You now have full access to ABA at Home.');
        router.replace('/(tabs)/dashboard');
      } else {
        showActivationPending();
      }
    } finally {
      setLoading(false);
    }
  };

  const dismissPaywall = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/worksheets');
  };

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
  try {
    setLoading(true);

    const offering = await getCurrentOffering();

    if (!offering) {
      setPackages([]);
      return;
    }

    setPackages(offering.availablePackages);
  } catch (error: any) {
    Alert.alert(
      'Paywall Error',
      error?.message || 'Could not load subscription options.'
    );
  } finally {
    setLoading(false);
  }
};

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setLoading(true);
      const activation = await purchasePackage(pkg);

      if (!activation) {
        Alert.alert('Purchase Not Completed', 'The purchase did not finish. Please try again.');
        return;
      }
      
      if (hasRevenueCatProEntitlement(activation.customerInfo)) {
        const activated = await confirmAuthoritativeProActivation(
          activation.authoritativeReconciled,
          refreshSubscription,
          refreshChildSubscription
        );
        if (!activated) {
          showActivationPending();
          return;
        }
        Alert.alert("Welcome to Pro!", "You now have full access to ABA at Home.");
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert(
          'Purchase Processing',
          'Your purchase was successful, but Pro activation is still updating.'
        );
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
      <TouchableOpacity style={styles.closeBtn} onPress={dismissPaywall}>
        <Ionicons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={40} color="#2563EB" />
          </View>
          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>Supporting your child&apos;s growth with expert-designed tools.</Text>
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
