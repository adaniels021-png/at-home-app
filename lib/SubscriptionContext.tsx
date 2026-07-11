import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const PRO_CACHE_PREFIX = 'ABA_AT_HOME_PRO_ACCESS';

const DEV_FORCE_PRO = false;
const SUBSCRIPTION_TIMEOUT_MS = 8000;

const SubscriptionContext =
  createContext<SubscriptionContextType>({
    isPro: false,
    adminMode: false,
    toggleAdminMode: async () => {},
    loading: true,
    refreshSubscription: async () => {},
    setIsPro: () => {},
  });

function getProCacheKey(userId: string): string {
  return `${PRO_CACHE_PREFIX}:${userId}`;
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, milliseconds);

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revenueCatIsPro, setRevenueCatIsPro] =
    useState(false);

  const [ownerInheritedPro, setOwnerInheritedPro] =
    useState(false);

  const [adminMode, setAdminMode] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const mountedRef = useRef(true);

  const refreshPromiseRef =
    useRef<Promise<void> | null>(null);

  const currentUserIdRef =
    useRef<string | null>(null);

  const isPro =
    DEV_FORCE_PRO ||
    adminMode ||
    revenueCatIsPro ||
    ownerInheritedPro;

  const setIsPro = useCallback((value: boolean) => {
    setRevenueCatIsPro(value);
  }, []);

  const saveCachedProStatus = useCallback(
    async (
      userId: string,
      proActive: boolean
    ) => {
      try {
        await AsyncStorage.setItem(
          getProCacheKey(userId),
          String(proActive)
        );
      } catch (error) {
        console.warn(
          'Save Pro cache error:',
          error
        );
      }
    },
    []
  );

  const loadCachedProStatus = useCallback(
    async (userId: string) => {
      try {
        const saved = await AsyncStorage.getItem(
          getProCacheKey(userId)
        );

        if (!mountedRef.current) return;

        if (saved === 'true') {
          setRevenueCatIsPro(true);
        } else if (saved === 'false') {
          setRevenueCatIsPro(false);
        }
      } catch (error) {
        console.warn(
          'Load Pro cache error:',
          error
        );
      }
    },
    []
  );

  const saveCurrentUserProStatus = useCallback(
    async (
      userId: string,
      proActive: boolean
    ) => {
      const { error } = await supabase
        .from('user_subscription_status')
        .upsert(
          {
            user_id: userId,
            is_pro: proActive,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) {
        console.warn(
          'Save user subscription status error:',
          error.message
        );
      }
    },
    []
  );

  const getInheritedOwnerPro = useCallback(
    async (userId: string): Promise<boolean> => {
      const {
        data: caregiverRows,
        error: caregiverError,
      } = await supabase
        .from('child_caregivers')
        .select(
          'owner_user_id, caregiver_user_id, status'
        )
        .eq('caregiver_user_id', userId)
        .eq('status', 'accepted');

      if (caregiverError) {
        throw caregiverError;
      }

      const ownerIds = Array.from(
        new Set(
          (caregiverRows ?? [])
            .map(
              (row: any) =>
                row.owner_user_id as string | null
            )
            .filter(
              (ownerId): ownerId is string =>
                Boolean(
                  ownerId &&
                    ownerId !== userId
                )
            )
        )
      );

      if (!ownerIds.length) {
        return false;
      }

      const {
        data: ownerStatuses,
        error: ownerStatusError,
      } = await supabase
        .from('user_subscription_status')
        .select('user_id, is_pro')
        .in('user_id', ownerIds);

      if (ownerStatusError) {
        throw ownerStatusError;
      }

      return (ownerStatuses ?? []).some(
        (status: any) =>
          status.is_pro === true
      );
    },
    []
  );

  const clearSubscriptionState =
    useCallback(() => {
      if (!mountedRef.current) return;

      currentUserIdRef.current = null;
      setRevenueCatIsPro(false);
      setOwnerInheritedPro(false);
      setLoading(false);
    }, []);

  const refreshSubscription =
    useCallback(async (): Promise<void> => {
      /*
       * Prevent the initial load and auth event from
       * refreshing subscriptions simultaneously.
       */
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const refreshTask = async () => {
        try {
          if (DEV_FORCE_PRO) {
            if (mountedRef.current) {
              setRevenueCatIsPro(true);
              setOwnerInheritedPro(true);
              setLoading(false);
            }

            return;
          }

          const sessionResult =
            await withTimeout(
              supabase.auth.getSession(),
              SUBSCRIPTION_TIMEOUT_MS,
              'Subscription session lookup timed out.'
            );

          if (!mountedRef.current) return;

          if (sessionResult.error) {
            throw sessionResult.error;
          }

          const userId =
            sessionResult.data.session?.user?.id;

          if (!userId) {
            clearSubscriptionState();
            return;
          }

          currentUserIdRef.current = userId;

          /*
           * Show cached access immediately while the
           * store refresh continues in the background.
           */
          await loadCachedProStatus(userId);

          if (mountedRef.current) {
            setLoading(false);
          }

          /*
           * RevenueCat no longer queries Supabase itself.
           * Pass the known user ID directly.
           */
          await withTimeout(
            configureRevenueCat(userId),
            SUBSCRIPTION_TIMEOUT_MS,
            'RevenueCat configuration timed out.'
          );

          await withTimeout(
            logInRevenueCat(userId),
            SUBSCRIPTION_TIMEOUT_MS,
            'RevenueCat login timed out.'
          );

          const customerInfo =
            await withTimeout(
              getCustomerInfo(),
              SUBSCRIPTION_TIMEOUT_MS,
              'RevenueCat customer information timed out.'
            );

          const proActive =
            hasProAccess(customerInfo);

          if (!mountedRef.current) return;

          setRevenueCatIsPro(proActive);

          await saveCachedProStatus(
            userId,
            proActive
          );

          /*
           * These database operations are independent.
           * Run them together and do not let either one
           * block access to the app.
           */
          const [
            saveStatusResult,
            inheritedResult,
          ] = await Promise.allSettled([
            saveCurrentUserProStatus(
              userId,
              proActive
            ),
            getInheritedOwnerPro(userId),
          ]);

          if (!mountedRef.current) return;

          if (
            inheritedResult.status ===
            'fulfilled'
          ) {
            setOwnerInheritedPro(
              inheritedResult.value
            );
          } else {
            console.warn(
              'Inherited owner Pro lookup failed:',
              inheritedResult.reason
            );
          }

          if (
            saveStatusResult.status ===
            'rejected'
          ) {
            console.warn(
              'Subscription status sync failed:',
              saveStatusResult.reason
            );
          }
        } catch (error) {
          /*
           * Preserve cached/current subscription state
           * during a temporary connection failure.
           */
          console.error(
            'Subscription refresh error:',
            error
          );
        } finally {
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      };

      refreshPromiseRef.current =
        refreshTask().finally(() => {
          refreshPromiseRef.current = null;
        });

      return refreshPromiseRef.current;
    }, [
      clearSubscriptionState,
      getInheritedOwnerPro,
      loadCachedProStatus,
      saveCachedProStatus,
      saveCurrentUserProStatus,
    ]);

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        const savedAdminMode =
          await AsyncStorage.getItem(
            ADMIN_MODE_KEY
          );

        if (mountedRef.current) {
          setAdminMode(
            savedAdminMode === 'true'
          );
        }
      } catch (error) {
        console.error(
          'Load admin mode error:',
          error
        );
      }

      /*
       * Do not wait before rendering the app.
       */
      if (mountedRef.current) {
        setLoading(false);
      }

      void refreshSubscription();
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;

        if (
          event === 'SIGNED_OUT' ||
          !session?.user?.id
        ) {
          clearSubscriptionState();

          void logOutRevenueCat().catch(
            (error) => {
              console.error(
                'RevenueCat logout error:',
                error
              );
            }
          );

          return;
        }

        /*
         * Ignore INITIAL_SESSION and TOKEN_REFRESHED.
         * The provider already performs an initial
         * refresh, and token refreshes do not change
         * subscription access.
         */
        if (
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED'
        ) {
          if (
            currentUserIdRef.current !==
            session.user.id
          ) {
            setRevenueCatIsPro(false);
            setOwnerInheritedPro(false);
          }

          void refreshSubscription();
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [
    clearSubscriptionState,
    refreshSubscription,
  ]);

  const toggleAdminMode =
    useCallback(async () => {
      const nextValue = !adminMode;

      setAdminMode(nextValue);

      try {
        await AsyncStorage.setItem(
          ADMIN_MODE_KEY,
          String(nextValue)
        );
      } catch (error) {
        console.error(
          'Toggle admin mode error:',
          error
        );
      }
    }, [adminMode]);

  const value =
    useMemo<SubscriptionContextType>(
      () => ({
        isPro,
        adminMode,
        toggleAdminMode,
        loading,
        refreshSubscription,
        setIsPro,
      }),
      [
        isPro,
        adminMode,
        toggleAdminMode,
        loading,
        refreshSubscription,
        setIsPro,
      ]
    );

  return (
    <SubscriptionContext.Provider
      value={value}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}