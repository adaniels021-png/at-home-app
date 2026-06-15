import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from './supabase';

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
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
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
        setSelectedChild(null);
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

      const nextChildren = Array.from(mergedMap.values());

      setChildProfiles(nextChildren);

      setSelectedChild((prev) => {
        if (!nextChildren.length) return null;

        if (prev?.id) {
          const stillExists = nextChildren.find(
            (child) => child.id === prev.id
          );

          if (stillExists) return stillExists;
        }

        return nextChildren[0];
      });
    } catch (error) {
      console.error('Error fetching children for context:', error);
      setChildProfiles([]);
      setSelectedChild(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshChildren();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user?.id) {
        setChildProfiles([]);
        setSelectedChild(null);
        setLoading(false);
        return;
      }

      await refreshChildren();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshChildren]);

  const value = useMemo(
    () => ({
      children: childProfiles,
      selectedChild,
      setSelectedChild,
      loading,
      refreshChildren,
    }),
    [childProfiles, selectedChild, loading, refreshChildren]
  );

  return (
    <ChildContext.Provider value={value}>
      {children}
    </ChildContext.Provider>
  );
}

export const useChild = () => useContext(ChildContext);