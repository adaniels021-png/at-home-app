import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { canViewChild, selectAuthorizedChild } from './caregiverPermissions';

type Child = {
  id: string;
  child_name?: string;
  name?: string;
  parent_id?: string;
  caregiver_role?: string;
  caregiver_access_role?: string;
};

type ChildContextType = {
  children: Child[];
  selectedChild: Child | null;
  setSelectedChild: (child: Child | null) => void;
  loading: boolean;
  refreshChildren: () => Promise<void>;
};

const ChildContext = createContext<ChildContextType>({
  children: [],
  selectedChild: null,
  setSelectedChild: () => {},
  loading: true,
  refreshChildren: async () => {},
});

export function ChildProvider({ children }: { children: React.ReactNode }) {
  const [childProfiles, setChildProfiles] = useState<Child[]>([]);
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshChildren = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.id) {
        setChildProfiles([]);
        setSelectedChildState(null);
        return;
      }

      const userId = session.user.id;

      const { data: ownedChildren, error: ownedError } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: true });

      if (ownedError) throw ownedError;

      const { data: caregiverRows, error: caregiverError } = await supabase
        .from('child_caregivers')
        .select('child_id, role, status, owner_user_id')
        .eq('caregiver_user_id', userId)
        .eq('status', 'accepted');

      if (caregiverError) throw caregiverError;

      const sharedRows = (caregiverRows || []).filter(
        (row: any) => row.role !== 'owner'
      );

      const sharedChildIds = sharedRows
        .map((row: any) => row.child_id)
        .filter(Boolean);

      let sharedChildren: Child[] = [];

      if (sharedChildIds.length > 0) {
        const { data: sharedData, error: sharedError } = await supabase
          .from('children')
          .select('*')
          .in('id', sharedChildIds)
          .order('created_at', { ascending: true });

        if (sharedError) throw sharedError;

        sharedChildren = (sharedData || []).map((child: any) => {
          const caregiverRow = sharedRows.find(
            (row: any) => row.child_id === child.id
          );

          return {
            ...child,
            caregiver_access_role: caregiverRow?.role || 'caregiver',
          };
        });
      }

      const mergedMap = new Map<string, Child>();

      ((ownedChildren || []) as Child[]).forEach((child) => {
        mergedMap.set(child.id, {
          ...child,
          caregiver_access_role: 'owner',
        });
      });

      sharedChildren.forEach((child) => {
        mergedMap.set(child.id, child);
      });

      const nextChildren = Array.from(mergedMap.values()).filter((child) =>
        canViewChild(child.caregiver_access_role)
      );

      setChildProfiles(nextChildren);

      setSelectedChildState((prev) =>
        selectAuthorizedChild(nextChildren, prev?.id)
      );
    } catch (error) {
      console.error('Error fetching children for context:', error);
      setChildProfiles([]);
      setSelectedChildState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      void refreshChildren();
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.id) {
        setChildProfiles([]);
        setSelectedChildState(null);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        void refreshChildren();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshChildren]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshChildren();
    });
    return () => subscription.remove();
  }, [refreshChildren]);

  const setSelectedChild = useCallback((requested: Child | null) => {
    setSelectedChildState(
      requested
        ? childProfiles.find((child) => child.id === requested.id) ?? null
        : null
    );
  }, [childProfiles]);

  const value = useMemo(
    () => ({
      children: childProfiles,
      selectedChild,
      setSelectedChild,
      loading,
      refreshChildren,
    }),
    [childProfiles, selectedChild, setSelectedChild, loading, refreshChildren]
  );

  return (
    <ChildContext.Provider value={value}>
      {children}
    </ChildContext.Provider>
  );
}

export const useChild = () => useContext(ChildContext);
