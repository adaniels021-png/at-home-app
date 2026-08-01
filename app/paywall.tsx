import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { useSubscription } from '../lib/SubscriptionContext';
import {
  getCurrentOffering,
  hasRevenueCatProEntitlement,
  purchasePackage,
} from '../lib/revenuecat';

   const TERMS_URL =
  'https://docs.google.com/document/d/e/2PACX-1vSdEK03Z4x_j27vnpt7ZpOx7tLBVtzFfIdbYsRULhoGh5Ubi0fehW3V-O9hzVrCQ6yXIQIGoSfF5IBx/pub';

const PRIVACY_URL =
  'https://docs.google.com/document/d/e/2PACX-1vS_YJJ2JENjbHXysMq8WWI5xectm8aERFu_V7EaRrWSj_JMTc02q5x5MlvIj94BDp8JJt25Z4sR23vP/pub';


export default function PaywallScreen() {
  const { refreshSubscription } = useSubscription();
  const [packageToBuy, setPackageToBuy] =
    useState<PurchasesPackage | null>(null);

  const [loadingOffering, setLoadingOffering] =
    useState(true);

  const [purchasing, setPurchasing] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const loadOffering = async () => {
      try {
        setLoadingOffering(true);

        const currentOffering = await getCurrentOffering();

        if (!currentOffering) {
          throw new Error(
            'No current RevenueCat offering is available.'
          );
        }

        const monthlyPackage =
          currentOffering.monthly ||
          currentOffering.availablePackages.find(
            (pkg) =>
              pkg.identifier
                .toLowerCase()
                .includes('monthly')
          ) ||
          currentOffering.availablePackages[0];

        if (!monthlyPackage) {
          throw new Error(
            'No subscription package is available.'
          );
        }

        if (mounted) {
          setPackageToBuy(monthlyPackage);
        }
      } catch (error: any) {
        console.error(
          'Paywall offering error:',
          error
        );

        if (mounted) {
          setPackageToBuy(null);
        }
      } finally {
        if (mounted) {
          setLoadingOffering(false);
        }
      }
    };

    void loadOffering();

    return () => {
      mounted = false;
    };
  }, []);

  const handlePurchase = async () => {
    if (!packageToBuy) {
      Alert.alert(
        'Subscription Unavailable',
        'The subscription could not be loaded. Please try again in a moment.'
      );

      return;
    }

    try {
      setPurchasing(true);

      const customerInfo = await purchasePackage(packageToBuy);
      const hasPro = hasRevenueCatProEntitlement(customerInfo);

      if (hasPro) {
        await refreshSubscription();
        Alert.alert(
          'Welcome to Pro!',
          'All Pro features are now unlocked.'
        );
      } else {
        Alert.alert(
          'Purchase Processing',
          'Your purchase was completed, but Pro access is still updating. Please try restoring purchases if it does not appear shortly.'
        );
      }
    } catch (error: any) {
      if (error?.userCancelled) {
        return;
      }

      console.error(
        'Paywall purchase error:',
        error
      );

      Alert.alert(
        'Purchase Error',
        error?.message ||
          'The purchase could not be completed.'
      );
    } finally {
      setPurchasing(false);
    }
  };

  const displayPrice =
    packageToBuy?.product?.priceString ||
    '$9.99/month';

  const purchaseDisabled =
    loadingOffering ||
    purchasing ||
    !packageToBuy;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Start Your FREE 2-Week Trial
      </Text>

      <Text style={styles.trialText}>
  Eligible subscribers may receive 2 weeks free, then {displayPrice} unless canceled.
</Text>

      <Text style={styles.benefit}>
        ✅ Unlimited Daily Lessons
      </Text>

      <Text style={styles.benefit}>
        ✅ Unlimited Daily Adventures
      </Text>

      <Text style={styles.benefit}>
        ✅ Complete Worksheet Library
      </Text>

      <Text style={styles.benefit}>
        ✅ Multi-Child Profiles
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          purchaseDisabled &&
            styles.buttonDisabled,
        ]}
        onPress={handlePurchase}
        disabled={purchaseDisabled}
        activeOpacity={0.85}
      >
        {loadingOffering || purchasing ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <Text style={styles.buttonText}>
            Start FREE 2-Week Trial
          </Text>
        )}
      </TouchableOpacity>

      {!loadingOffering &&
        !packageToBuy && (
          <Text style={styles.errorText}>
            Subscription options are
            temporarily unavailable.
          </Text>
        )}

        <View style={styles.footerLinks}>
  <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
    <Text style={styles.footerLink}>Terms of Use</Text>
  </TouchableOpacity>

  <Text style={styles.footerText}> • </Text>

  <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
    <Text style={styles.footerLink}>Privacy Policy</Text>
  </TouchableOpacity>
</View>
</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },

  benefit: {
    fontSize: 18,
    marginBottom: 15,
    color: '#444444',
  },

  button: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 15,
    marginTop: 30,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },

  errorText: {
    color: '#B91C1C',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },

  footerLinks: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 40,
},

footerText: {
  color: '#8E8E93',
  marginHorizontal: 6,
},

footerLink: {
  color: '#007AFF',
  textDecorationLine: 'underline',
  fontWeight: '600',
},

trialText: {
  textAlign: 'center',
  marginBottom: 24,
  color: '#6B7280',
  fontSize: 13,
  lineHeight: 18,
},
});
