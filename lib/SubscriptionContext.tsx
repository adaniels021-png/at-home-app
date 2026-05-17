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

// Turn this to true ONLY for quick dev override
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
  const [revenueCatIsPro, setRevenueCatIsPro] = useState<boolean>(false);
  const [adminMode, setAdminMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // FINAL PRO VALUE (this is what your app uses)
  const isPro = DEV_FORCE_PRO || adminMode || revenueCatIsPro;

  const setIsPro = (value: boolean) => {
    setRevenueCatIsPro(value);
  };

  // ✅ Load Admin Mode from storage
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

  // ✅ Toggle Admin Mode
  const toggleAdminMode = async () => {
    try {
      const nextValue = !adminMode;
      setAdminMode(nextValue);
      await AsyncStorage.setItem(ADMIN_MODE_KEY, String(nextValue));
    } catch (error) {
      console.error('Toggle admin mode error:', error);
    }
  };

  // ✅ Refresh subscription from RevenueCat
  const refreshSubscription = async () => {
    try {
      setLoading(true);

      if (DEV_FORCE_PRO) {
        setRevenueCatIsPro(true);
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Subscription session error:', error);
        setRevenueCatIsPro(false);
        return;
      }

      if (!session?.user?.id) {
        setRevenueCatIsPro(false);
        return;
      }

      await configureRevenueCat();
      await logInRevenueCat(session.user.id);

      const customerInfo = await getCustomerInfo();
      const proActive = hasProAccess(customerInfo);

      setRevenueCatIsPro(proActive);
    } catch (error) {
      console.error('Subscription refresh error:', error);
      setRevenueCatIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial load + auth sync
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        if (DEV_FORCE_PRO) {
          if (isMounted) {
            setRevenueCatIsPro(true);
            setLoading(false);
          }
          return;
        }

        await refreshSubscription();
      } catch (error) {
        console.error('Subscription init error:', error);
        if (isMounted) {
          setRevenueCatIsPro(false);
          setLoading(false);
        }
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (DEV_FORCE_PRO) {
          if (isMounted) {
            setRevenueCatIsPro(true);
            setLoading(false);
          }
          return;
        }

        if (!session?.user?.id) {
          await logOutRevenueCat();

          if (isMounted) {
            setRevenueCatIsPro(false);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setLoading(true);
        }

        await configureRevenueCat();
        await logInRevenueCat(session.user.id);

        const customerInfo = await getCustomerInfo();
        const proActive = hasProAccess(customerInfo);

        if (isMounted) {
          setRevenueCatIsPro(proActive);
        }
      } catch (error) {
        console.error('Subscription auth sync error:', error);

        if (isMounted) {
          setRevenueCatIsPro(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Context value
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