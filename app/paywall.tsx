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
import Purchases, {
  PurchasesPackage,
} from 'react-native-purchases';

const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID || 'pro';

export default function PaywallScreen() {
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

        const offerings =
          await Purchases.getOfferings();

        const currentOffering =
          offerings.current;

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

      const result =
        await Purchases.purchasePackage(
          packageToBuy
        );

      const hasPro =
        result.customerInfo.entitlements
          .active[ENTITLEMENT_ID];

      if (hasPro) {
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
        Unlock ABA at Home Pro
      </Text>

      <Text style={styles.benefit}>
        ✅ Unlimited daily lessons
      </Text>

      <Text style={styles.benefit}>
        ✅ Unlimited Daily Adventures
      </Text>

      <Text style={styles.benefit}>
        ✅ Printable worksheets
      </Text>

      <Text style={styles.benefit}>
        ✅ Multi-child profile support
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
            Subscribe — {displayPrice}
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

      <Text
        style={styles.footer}
        onPress={() =>
          Linking.openURL(
            'https://docs.google.com/document/d/YOUR_ID'
          )
        }
      >
        Privacy Policy & Terms of Use
      </Text>
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

  footer: {
    marginTop: 40,
    color: '#8E8E93',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});