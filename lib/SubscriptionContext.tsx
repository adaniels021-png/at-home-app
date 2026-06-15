import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  configureRevenueCat,
  getCustomerInfo,
  hasProAccess,
  logInRevenueCat,
  logOutRevenueCat,
} from './revenuecat';
import { supabase } from './supabase';

type SubscriptionContextType = {
  isPro: boolean;
  adminMode: boolean;
  toggleAdminMode: () => Promise<void>;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  setIsPro: (value: boolean) => void;
};

const ADMIN_MODE_KEY = 'ABA_AT_HOME_ADMIN_MODE';
const DEV_FORCE_PRO = false;

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  adminMode: false,
  toggleAdminMode: async () => {},
  loading: true,
  refreshSubscription: async () => {},
  setIsPro: () => {},
});

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revenueCatIsPro, setRevenueCatIsPro] = useState(false);
  const [ownerInheritedPro, setOwnerInheritedPro] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPro = DEV_FORCE_PRO || adminMode || revenueCatIsPro || ownerInheritedPro;

  const setIsPro = (value: boolean) => {
    setRevenueCatIsPro(value);
  };

  const saveCurrentUserProStatus = async (userId: string, proActive: boolean) => {
    await supabase.from('user_subscription_status').upsert(
      {
        user_id: userId,
        is_pro: proActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  };

  const checkInheritedOwnerPro = async (userId: string) => {
    const { data: caregiverRows, error: caregiverError } = await supabase
      .from('child_caregivers')
      .select('owner_user_id, caregiver_user_id, status')
      .eq('caregiver_user_id', userId)
      .eq('status', 'accepted');

    if (caregiverError) throw caregiverError;

    const ownerIds = Array.from(
      new Set(
        (caregiverRows || [])
          .map((row: any) => row.owner_user_id)
          .filter((ownerId: string) => ownerId && ownerId !== userId)
      )
    );

    if (ownerIds.length === 0) {
      setOwnerInheritedPro(false);
      return;
    }

    const { data: ownerStatuses, error: ownerStatusError } = await supabase
      .from('user_subscription_status')
      .select('user_id, is_pro')
      .in('user_id', ownerIds);

    if (ownerStatusError) throw ownerStatusError;

    const ownerHasPro = (ownerStatuses || []).some(
      (status: any) => status.is_pro === true
    );

    setOwnerInheritedPro(ownerHasPro);
  };

  useEffect(() => {
    const loadAdminMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(ADMIN_MODE_KEY);
        setAdminMode(saved === 'true');
      } catch (error) {
        console.error('Load admin mode error:', error);
      }
    };

    void loadAdminMode();
  }, []);

  const toggleAdminMode = async () => {
    try {
      const nextValue = !adminMode;
      setAdminMode(nextValue);
      await AsyncStorage.setItem(ADMIN_MODE_KEY, String(nextValue));
    } catch (error) {
      console.error('Toggle admin mode error:', error);
    }
  };

  const refreshSubscription = async () => {
    try {
      setLoading(true);

      if (DEV_FORCE_PRO) {
        setRevenueCatIsPro(true);
        setOwnerInheritedPro(true);
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user?.id) {
        setRevenueCatIsPro(false);
        setOwnerInheritedPro(false);
        return;
      }

      const userId = session.user.id;

      await configureRevenueCat();
      await logInRevenueCat(userId);

      const customerInfo = await getCustomerInfo();
      const proActive = hasProAccess(customerInfo);

      setRevenueCatIsPro(proActive);

      await saveCurrentUserProStatus(userId, proActive);
      await checkInheritedOwnerPro(userId);
    } catch (error) {
      console.error('Subscription refresh error:', error);
      setRevenueCatIsPro(false);
      setOwnerInheritedPro(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await refreshSubscription();
      } catch (error) {
        console.error('Subscription init error:', error);

        if (isMounted) {
          setRevenueCatIsPro(false);
          setOwnerInheritedPro(false);
          setLoading(false);
        }
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!session?.user?.id) {
          await logOutRevenueCat();

          if (isMounted) {
            setRevenueCatIsPro(false);
            setOwnerInheritedPro(false);
            setLoading(false);
          }

          return;
        }

        if (isMounted) setLoading(true);

        await refreshSubscription();
      } catch (error) {
        console.error('Subscription auth sync error:', error);

        if (isMounted) {
          setRevenueCatIsPro(false);
          setOwnerInheritedPro(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      isPro,
      adminMode,
      toggleAdminMode,
      loading,
      refreshSubscription,
      setIsPro,
    }),
    [isPro, adminMode, loading]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);