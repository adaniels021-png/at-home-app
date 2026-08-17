import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  configureRevenueCat,
  getCustomerInfo,
  hasRevenueCatProEntitlement,
  logInRevenueCat,
  logOutRevenueCat,
  reconcileAuthoritativeEntitlement,
} from './revenuecat';
import { supabase } from './supabase';

type SubscriptionContextType = {
  isPro: boolean;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  loading: true,
  refreshSubscription: async () => {},
});

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revenueCatIsPro, setRevenueCatIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPro = revenueCatIsPro;

  const refreshSubscription = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user?.id) {
        setRevenueCatIsPro(false);
        return;
      }

      const userId = session.user.id;
      let proActive = false;

      try {
        await configureRevenueCat();
        const revenueCatUserReady = await logInRevenueCat(userId);

        if (!revenueCatUserReady) {
          setRevenueCatIsPro(false);
          return;
        }

        const customerInfo = await getCustomerInfo();
        proActive = hasRevenueCatProEntitlement(customerInfo);

        setRevenueCatIsPro(proActive);
        void reconcileAuthoritativeEntitlement();
      } catch (revenueCatError) {
        console.error('RevenueCat subscription check error:', revenueCatError);
        setRevenueCatIsPro(false);
      }

    } catch (error) {
      console.error('Subscription refresh error:', error);
      setRevenueCatIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  void refreshSubscription();

  const {
    data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
  if (!session?.user?.id) {
    setRevenueCatIsPro(false);
    setLoading(false);

    void logOutRevenueCat();

    return;
  }

  setLoading(true);
  void refreshSubscription();
});

return () => {
  subscription.unsubscribe();
};
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshSubscription();
      }
    });

    return () => subscription.remove();
  }, []);

  const value = useMemo(
    () => ({
      isPro,
      loading,
      refreshSubscription,
    }),
    [isPro, loading]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}


export const useSubscription = () => useContext(SubscriptionContext);
