import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { useChild } from './SelectedChildContext';
import { useSubscription } from './SubscriptionContext';
import { supabase } from './supabase';

type ChildEntitlementState = 'FREE' | 'TRIAL' | 'PRO' | 'UNKNOWN';

type ChildSubscriptionContextType = {
  isPro: boolean;
  loading: boolean;
  personalIsPro: boolean;
  state: ChildEntitlementState;
  source: 'family' | 'none';
  refreshChildSubscription: () => Promise<void>;
};

const ChildSubscriptionContext = createContext<ChildSubscriptionContextType>({
  isPro: false,
  loading: true,
  personalIsPro: false,
  state: 'UNKNOWN',
  source: 'none',
  refreshChildSubscription: async () => {},
});

export function ChildSubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedChild, loading: childLoading } = useChild();
  const { isPro: personalIsPro, loading: personalLoading } = useSubscription();
  const [state, setState] = useState<ChildEntitlementState>('UNKNOWN');
  const [isPro, setIsPro] = useState(false);
  const [resolvedChildId, setResolvedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const refreshChildSubscription = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const childId = selectedChild?.id ?? null;

    if (!childId) {
      setState('UNKNOWN');
      setIsPro(false);
      setResolvedChildId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc(
        'resolve_child_server_entitlement',
        { target_child_id: childId },
      );
      if (error) throw error;
      if (requestId !== requestIdRef.current) return;

      const result = Array.isArray(data) ? data[0] : data;
      const nextState = String(result?.state || 'UNKNOWN') as ChildEntitlementState;
      setState(nextState);
      setIsPro(result?.authoritative === true && result?.is_pro === true);
      setResolvedChildId(childId);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Child subscription resolution failed:', error);
      setState('UNKNOWN');
      setIsPro(false);
      setResolvedChildId(childId);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [selectedChild?.id]);

  useEffect(() => {
    if (childLoading || personalLoading) return;
    void refreshChildSubscription();
  }, [childLoading, personalIsPro, personalLoading, refreshChildSubscription]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshChildSubscription();
    });
    return () => subscription.remove();
  }, [refreshChildSubscription]);

  const value = useMemo(
    () => ({
      isPro: resolvedChildId === selectedChild?.id && isPro,
      loading:
        childLoading ||
        personalLoading ||
        loading ||
        resolvedChildId !== (selectedChild?.id ?? null),
      personalIsPro,
      state,
      source:
        resolvedChildId === selectedChild?.id && isPro
          ? ('family' as const)
          : ('none' as const),
      refreshChildSubscription,
    }),
    [childLoading, isPro, loading, personalIsPro, personalLoading, refreshChildSubscription, resolvedChildId, selectedChild?.id, state],
  );

  return (
    <ChildSubscriptionContext.Provider value={value}>
      {children}
    </ChildSubscriptionContext.Provider>
  );
}

export const useChildSubscription = () => useContext(ChildSubscriptionContext);
