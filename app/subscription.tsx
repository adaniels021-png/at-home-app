import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Purchases from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSubscription } from '../lib/SubscriptionContext';
import {
  getCurrentOffering,
  hasProAccess,
  purchasePackage,
  restorePurchases,
} from '../lib/revenuecat';

type PlanType = 'monthly' | 'yearly';
type CurrentPlan = 'free' | 'monthly' | 'yearly';

type RevenueCatPlan = {
  title: string;
  priceString: string;
  subtext: string;
  packageObject: any | null;
};

const TERMS_URL =
  'https://docs.google.com/document/d/e/2PACX-1vSdEK03Z4x_j27vnpt7ZpOx7tLBVtzFfIdbYsRULhoGh5Ubi0fehW3V-O9hzVrCQ6yXIQIGoSfF5IBx/pub';

const PRIVACY_URL =
  'https://docs.google.com/document/d/e/2PACX-1vS_YJJ2JENjbHXysMq8WWI5xectm8aERFu_V7EaRrWSj_JMTc02q5x5MlvIj94BDp8JJt25Z4sR23vP/pub';

function detectPlanFromCustomerInfo(customerInfo: any): CurrentPlan {
  const activeSubscriptions: string[] = customerInfo?.activeSubscriptions || [];

  const hasYearly = activeSubscriptions.some((id) => {
    const value = String(id).toLowerCase();
    return (
      value.includes('year') ||
      value.includes('annual') ||
      value.includes('aba_yearly')
    );
  });

  const hasMonthly = activeSubscriptions.some((id) => {
    const value = String(id).toLowerCase();
    return (
      value.includes('month') ||
      value.includes('monthly') ||
      value.includes('aba_monthly')
    );
  });

  if (hasYearly) return 'yearly';
  if (hasMonthly) return 'monthly';
  return hasProAccess(customerInfo) ? 'monthly' : 'free';
}

export default function SubscriptionScreen() {
  const router = useRouter();

  const { isPro, setIsPro, refreshSubscription } = useSubscription() as {
    isPro?: boolean;
    setIsPro: (value: boolean) => void;
    refreshSubscription?: () => Promise<void>;
  };

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [checkingPlan, setCheckingPlan] = useState(true);

  const [selectedPlan, setSelectedPlan] =
  useState<PlanType>('yearly');
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>(
    isPro ? 'monthly' : 'free'
  );

  const [monthlyPlan, setMonthlyPlan] = useState<RevenueCatPlan>({
    title: 'Monthly',
    priceString: '$9.99/mo',
    subtext: 'Flexible monthly access',
    packageObject: null,
  });

  const [yearlyPlan, setYearlyPlan] = useState<RevenueCatPlan>({
    title: 'Yearly',
    priceString: '$59.99/yr',
    subtext: 'Best value • Save more over time',
    packageObject: null,
  });

  useEffect(() => {
    void loadPlans();
    void loadCurrentPlan();
  }, []);

 useEffect(() => {
  if (currentPlan === 'monthly') {
    setSelectedPlan('yearly');
  } else if (currentPlan === 'free') {
    setSelectedPlan('monthly');
  }
}, [currentPlan]);

  const openTerms = async () => {
    try {
      await Linking.openURL(TERMS_URL);
    } catch {
      Alert.alert('Terms of Use', 'Unable to open Terms of Use right now.');
    }
  };

  const openPrivacy = async () => {
    try {
      await Linking.openURL(PRIVACY_URL);
    } catch {
      Alert.alert('Privacy Policy', 'Unable to open Privacy Policy right now.');
    }
  };

  const loadCurrentPlan = async () => {
    setCheckingPlan(true);

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const detectedPlan = detectPlanFromCustomerInfo(customerInfo);

      setCurrentPlan(detectedPlan);
      setIsPro(detectedPlan !== 'free');
    } catch (error) {
      console.error('Plan check error:', error);
      setCurrentPlan(isPro ? 'monthly' : 'free');
    } finally {
      setCheckingPlan(false);
    }
  };

  const loadPlans = async () => {
    setPlansLoading(true);

    try {
      const offering = await getCurrentOffering();

      if (!offering) {
        console.log('No current offering found. Using fallback plan text.');
        return;
      }

      const packages = offering.availablePackages || [];

      const monthlyPkg =
        packages.find(
          (pkg: any) =>
            pkg.packageType === 'MONTHLY' ||
            pkg.identifier?.toLowerCase().includes('monthly') ||
            pkg.product?.identifier?.toLowerCase().includes('month') ||
            pkg.product?.identifier?.toLowerCase().includes('aba_monthly')
        ) || null;

      const yearlyPkg =
        packages.find(
          (pkg: any) =>
            pkg.packageType === 'ANNUAL' ||
            pkg.packageType === 'YEARLY' ||
            pkg.identifier?.toLowerCase().includes('annual') ||
            pkg.identifier?.toLowerCase().includes('yearly') ||
            pkg.product?.identifier?.toLowerCase().includes('year') ||
            pkg.product?.identifier?.toLowerCase().includes('aba_yearly')
        ) || null;

      if (monthlyPkg) {
        setMonthlyPlan({
          title: 'Monthly',
          priceString: monthlyPkg.product?.priceString || '$9.99/mo',
          subtext: 'Flexible monthly access',
          packageObject: monthlyPkg,
        });
      }

      if (yearlyPkg) {
        setYearlyPlan({
          title: 'Yearly',
          priceString: yearlyPkg.product?.priceString || '$59.99/yr',
          subtext: 'Best value • Save more over time',
          packageObject: yearlyPkg,
        });
      }

      if (!monthlyPkg && yearlyPkg) {
        setSelectedPlan('yearly');
      }
    } catch (error) {
      console.error('Failed to load RevenueCat plans:', error);
    } finally {
      setPlansLoading(false);
    }
  };

 const selectedPlanDetails = useMemo(() => {
  if (selectedPlan === 'yearly') {
    return {
      title: 'Yearly Pro',
      price: yearlyPlan.priceString,
      subtext: yearlyPlan.subtext,
      badge: currentPlan === 'monthly' ? 'UPGRADE' : 'BEST VALUE',
      cta:
        currentPlan === 'monthly'
          ? 'Unlock Pro & Save'
          : 'Unlock Pro & Save',
      packageObject: yearlyPlan.packageObject,
    };
  }

  return {
    title: 'Monthly Pro',
    price: monthlyPlan.priceString,
    subtext: monthlyPlan.subtext,
    badge: 'MOST POPULAR',
    cta: 'Unlock Pro Access',
    packageObject: monthlyPlan.packageObject,
  };
}, [selectedPlan, monthlyPlan, yearlyPlan, currentPlan]);

  const handlePurchase = async () => {
    if (currentPlan === 'yearly') return;

    setLoading(true);

    try {
      let selectedPackage = selectedPlanDetails.packageObject;

      if (!selectedPackage) {
        const offering = await getCurrentOffering();

        if (!offering) {
          Alert.alert(
            'Products Unavailable',
            'Your subscription products are not loading yet. Please try again in a moment.'
          );
          return;
        }

        const availablePackages = offering.availablePackages || [];

        selectedPackage =
          selectedPlan === 'yearly'
            ? availablePackages.find(
                (pkg: any) =>
                  pkg.packageType === 'ANNUAL' ||
                  pkg.packageType === 'YEARLY' ||
                 pkg.product?.identifier?.toLowerCase().includes('year') ||
                 pkg.product?.identifier?.toLowerCase().includes('aba_yearly')
              )
            : availablePackages.find(
                (pkg: any) =>
                  pkg.packageType === 'MONTHLY' ||
                  pkg.product?.identifier?.toLowerCase().includes('month') ||
                  pkg.product?.identifier?.toLowerCase().includes('aba_monthly')
              );

        if (!selectedPackage && availablePackages.length > 0) {
          selectedPackage = availablePackages[0];
        }
      }

      if (!selectedPackage) {
        Alert.alert(
          'No Packages Found',
          'No subscription packages are currently available.'
        );
        return;
      }

      const customerInfo = await purchasePackage(selectedPackage);

      if (!customerInfo) {
        Alert.alert(
          'Purchase Not Completed',
          'The purchase did not finish. Please try again.'
        );
        return;
      }

      const detectedPlan = detectPlanFromCustomerInfo(customerInfo);
      const proActive = hasProAccess(customerInfo);

      setCurrentPlan(detectedPlan);

      if (!proActive) {
        Alert.alert(
          'Purchase Completed',
          'The purchase went through, but Pro access is not active yet. Try Restore Purchase.'
        );
        return;
      }

      setIsPro(true);

      if (refreshSubscription) {
        await refreshSubscription();
      }

      Alert.alert('Welcome to Pro 🎉', 'Your Pro access is now unlocked.', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error: any) {
      console.error('Purchase error:', error);

      const message = error?.message || '';

      if (
        message.toLowerCase().includes('cancel') ||
        message.toLowerCase().includes('cancelled')
      ) {
        return;
      }

      Alert.alert('Purchase Failed', message || 'Could not complete purchase.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);

    try {
      const customerInfo = await restorePurchases();

      if (!customerInfo) {
        Alert.alert(
          'Restore Failed',
          'No purchase information was returned. Please try again.'
        );
        return;
      }

      const detectedPlan = detectPlanFromCustomerInfo(customerInfo);
      const proActive = hasProAccess(customerInfo);

      setCurrentPlan(detectedPlan);

      if (!proActive) {
        Alert.alert(
          'No Pro Purchase Found',
          'We could not find an active Pro subscription to restore.'
        );
        return;
      }

      setIsPro(true);

      if (refreshSubscription) {
        await refreshSubscription();
      }

      Alert.alert('Restored', 'Your Pro access has been restored.', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert(
        'Restore Failed',
        error?.message || 'Could not restore purchases.'
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    } catch {
      Alert.alert(
        'Cancel Subscription',
        'Open Settings, tap your Apple ID, then tap Subscriptions to manage or cancel ABA at Home Pro.'
      );
    }
  };

  const statusText =
    currentPlan === 'yearly'
      ? 'You are currently on the Yearly Pro plan.'
      : currentPlan === 'monthly'
        ? 'You are currently on the Monthly Pro plan.'
        : 'Choose monthly or yearly Pro access.';

const showMonthlyPlan = currentPlan !== 'yearly';
const showYearlyPlan = currentPlan !== 'yearly';
const showPurchaseButton = currentPlan !== 'yearly';
const cancelEnabled = currentPlan !== 'free';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>ABA AT HOME PRO</Text>
          </View>

          <Text style={styles.title}>
            Help Your Child Learn More at Home
          </Text>

          <Text style={styles.subtitle}>
            Get unlimited lessons, communication tools, routines,
            worksheets, and parent support designed for everyday life.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>∞</Text>
              <Text style={styles.heroStatLabel}>Unlimited lessons</Text>
            </View>

            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>Pro</Text>
              <Text style={styles.heroStatLabel}>Premium features</Text>
            </View>
          </View>
        </View>

        <View style={styles.familyBenefitCard}>
  <Text style={styles.familyBenefitTitle}>
    Why families choose Pro
  </Text>

  <Benefit
    icon="chatbubble-ellipses-outline"
    title="Build Communication"
    text="Practice requesting, answering questions, and everyday communication skills."
  />

  <Benefit
    icon="people-outline"
    title="Support Daily Routines"
    text="Create more successful mornings, meals, transitions, and bedtime routines."
  />

  <Benefit
    icon="school-outline"
    title="Practice Important Skills"
    text="Access unlimited lessons and activities tailored to your child's needs."
  />
</View>

        <View style={styles.statusCard}>
          <Ionicons
            name={
              currentPlan === 'free' ? 'lock-closed-outline' : 'checkmark-circle'
            }
            size={18}
            color={currentPlan === 'free' ? '#64748B' : '#059669'}
          />
          <Text style={styles.statusText}>
            {checkingPlan ? 'Checking subscription status...' : statusText}
          </Text>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>What unlocks with Pro</Text>

          <Feature text="Unlimited Daily Lessons" />
          <Feature text="Communication Activities" />
          <Feature text="Printable Worksheets" />
          <Feature text="PECS Communication Tools" />
          <Feature text="Parent Support Toolkit" />
          <Feature text="Routine Builders" />
          <Feature text="AI Activity Generator" />
          <Feature text="Future Pro Features Included" />
        </View>

        <View style={styles.socialProofCard}>
  <Ionicons
    name="heart"
    size={22}
    color="#EC4899"
  />

  <Text style={styles.socialProofText}>
    Built specifically for parents supporting children
    with autism at home.
  </Text>
</View>

        <View style={styles.planSection}>
          <Text style={styles.sectionTitle}>
            {currentPlan === 'monthly'
              ? 'Upgrade your plan'
              : currentPlan === 'yearly'
                ? 'Manage your subscription'
                : 'Choose your plan'}
          </Text>

          {plansLoading ? (
            <View style={styles.loadingPlansCard}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.loadingPlansText}>
                Loading live App Store pricing...
              </Text>
            </View>
          ) : null}

          {showMonthlyPlan ? (
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.activePlan,
              ]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.9}
            >
              <View style={styles.planTopRow}>
                <View>
                  <Text style={styles.planTitle}>{monthlyPlan.title}</Text>
                  <Text style={styles.planPrice}>{monthlyPlan.priceString}</Text>
                  <Text style={styles.planSubtext}>{monthlyPlan.subtext}</Text>
                </View>

                {selectedPlan === 'monthly' ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                ) : (
                  <View style={styles.unselectedCircle} />
                )}
              </View>
            </TouchableOpacity>
          ) : null}

          {showYearlyPlan ? (
            <TouchableOpacity
              style={[
                styles.planCard,
                styles.yearlyCard,
                selectedPlan === 'yearly' && styles.activePlan,
              ]}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.9}
            >
              <View style={styles.bestValue}>
                <Text style={styles.bestValueText}>
                  {currentPlan === 'monthly' ? 'UPGRADE' : 'BEST VALUE'}
                </Text>
              </View>

              <View style={styles.planTopRow}>
                <View>
                  <Text style={styles.planTitle}>{yearlyPlan.title}</Text>
                  <Text style={styles.planPrice}>{yearlyPlan.priceString}</Text>
                  <Text style={styles.savings}>{yearlyPlan.subtext}</Text>
                </View>

                {selectedPlan === 'yearly' ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                ) : (
                  <View style={styles.unselectedCircle} />
                )}
              </View>
            </TouchableOpacity>
          ) : null}

          {currentPlan === 'yearly' ? (
            <View style={styles.yearlyOnlyCard}>
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
              <Text style={styles.yearlyOnlyText}>
                Your yearly Pro plan is active. You can cancel renewal through
                Apple subscription settings.
              </Text>
            </View>
          ) : null}
        </View>

        {showPurchaseButton ? (
          <TouchableOpacity
            style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
            onPress={handlePurchase}
            disabled={loading || plansLoading || checkingPlan}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>{selectedPlanDetails.cta}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {showPurchaseButton ? (
          <View style={styles.subscriptionTermsBox}>
            <Text style={styles.subscriptionTermsText}>
              Subscription automatically renews unless canceled at least 24
              hours before the end of the current period. Your Apple ID account
              will be charged for renewal within 24 hours before the end of the
              current period. You can manage or cancel your subscription in Apple
              Account Settings.
            </Text>

            <Text style={styles.subscriptionTermsText}>
              By subscribing, you agree to our Terms of Use and Privacy Policy.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.restoreBtn, restoring && styles.restoreBtnDisabled]}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color="#4F46E5" />
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, !cancelEnabled && styles.disabledButton]}
          disabled={!cancelEnabled}
          onPress={handleCancelSubscription}
        >
          <Ionicons
            name="close-circle-outline"
            size={18}
            color={cancelEnabled ? '#DC2626' : '#94A3B8'}
          />
          <Text
            style={[
              styles.cancelButtonText,
              !cancelEnabled && styles.disabledText,
            ]}
          >
            Cancel Subscription
          </Text>
        </TouchableOpacity>

        <Text style={styles.smallText}>
          Purchases are managed through Apple. Cancel anytime in your App Store
          subscriptions.
        </Text>

        <View style={styles.legalLinksBox}>
          <Text style={styles.legalText}>By subscribing, you agree to our</Text>

          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={openTerms}>
              <Text style={styles.legalLink}>Terms of Use</Text>
            </TouchableOpacity>

            <Text style={styles.legalText}> and </Text>

            <TouchableOpacity onPress={openPrivacy}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.compareCard}>
          <Text style={styles.compareTitle}>Why upgrade?</Text>

          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Free</Text>
            <Text style={styles.compareValue}>1 lesson per day</Text>
          </View>

          <View style={styles.compareDivider} />

          <View style={styles.compareRow}>
            <Text style={styles.compareLabelPro}>Pro</Text>
            <Text style={styles.compareValuePro}>
              Unlimited lessons + premium tools
            </Text>
          </View>
        </View>

        <View style={styles.trustBox}>
          <View style={styles.trustHeader}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#3730A3"
            />
            <Text style={styles.trustTitle}>Built for real daily support</Text>
          </View>

          <Text style={styles.trustText}>
            Designed for parents, guided by ABA principles, and built to support
            daily routines, communication, learning, and independence at home.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon} size={22} color="#4F46E5" />

      <View style={{ flex: 1 }}>
        <Text style={styles.benefitTitle}>
          {title}
        </Text>

        <Text style={styles.benefitText}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 44 },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  heroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
    overflow: 'hidden',
    position: 'relative',
  },

  heroGlowOne: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  heroGlowTwo: {
    position: 'absolute',
    bottom: -45,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 14,
  },

  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.4,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },

  subtitle: {
    color: '#E0E7FF',
    lineHeight: 21,
    fontSize: 14,
    marginBottom: 18,
  },

  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  heroStatNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },

  heroStatLabel: {
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '700',
  },

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusText: {
    marginLeft: 8,
    color: '#475569',
    fontWeight: '800',
    flex: 1,
    lineHeight: 19,
  },

  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  featureText: {
    marginLeft: 10,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },

  planSection: { marginBottom: 18 },

  loadingPlansCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  loadingPlansText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },

  planCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },

  yearlyCard: { position: 'relative' },

  activePlan: {
    borderColor: '#4F46E5',
    backgroundColor: '#FAF5FF',
  },

  bestValue: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  bestValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },

  planTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
  },

  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
    color: '#111827',
  },

  planSubtext: {
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },

  savings: {
    color: '#10B981',
    fontWeight: '800',
    marginTop: 6,
  },

  yearlyOnlyCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  yearlyOnlyText: {
    marginLeft: 10,
    color: '#047857',
    fontWeight: '800',
    lineHeight: 20,
    flex: 1,
  },

  selectedPlanCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  selectedPlanBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },

  selectedPlanBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  selectedPlanLabel: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  selectedPlanTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },

  selectedPlanPrice: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#3730A3',
  },

  selectedPlanSubtext: {
    marginTop: 6,
    color: '#5B21B6',
    fontWeight: '700',
  },

  ctaButton: {
    backgroundColor: '#4F46E5',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  ctaButtonDisabled: { opacity: 0.75 },

  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },

  subscriptionTermsBox: {
    marginTop: 14,
    paddingHorizontal: 6,
  },

  subscriptionTermsText: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 6,
  },

  restoreBtn: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  restoreBtnDisabled: { opacity: 0.75 },

  restoreText: {
    color: '#4F46E5',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 14,
  },

  cancelButton: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  cancelButtonText: {
    color: '#DC2626',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 14,
  },

  disabledButton: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },

  disabledText: { color: '#94A3B8' },

  smallText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 12,
    lineHeight: 19,
  },

  legalLinksBox: {
    marginTop: 14,
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  legalText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },

  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },

  legalLink: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '900',
    textDecorationLine: 'underline',
  },

  compareCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  compareTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 14,
  },

  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  compareLabel: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },

  compareValue: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },

  compareDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },

  compareLabelPro: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 14,
  },

  compareValuePro: {
    color: '#1E293B',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  trustBox: {
    marginTop: 18,
    padding: 18,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },

  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  trustTitle: {
    marginLeft: 8,
    color: '#3730A3',
    fontWeight: '800',
  },

  trustText: {
    color: '#4338CA',
    textAlign: 'left',
    fontWeight: '600',
    lineHeight: 20,
  },

  familyBenefitCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 18,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

familyBenefitTitle: {
  fontSize: 17,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 14,
},

benefitRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 14,
},

benefitTitle: {
  fontSize: 14,
  fontWeight: '900',
  color: '#0F172A',
  marginBottom: 3,
},

benefitText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#64748B',
  lineHeight: 19,
},

socialProofCard: {
  backgroundColor: '#FFF1F2',
  borderRadius: 20,
  padding: 16,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#FECDD3',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

socialProofText: {
  flex: 1,
  color: '#9F1239',
  fontWeight: '800',
  fontSize: 13,
  lineHeight: 19,
},
});