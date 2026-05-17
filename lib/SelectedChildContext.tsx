import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

type Child = {
  id: string;
  child_name?: string;
  name?: string;
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

  const refreshChildren = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error in child context:', sessionError);
        setChildProfiles([]);
        setSelectedChild(null);
        return;
      }

      if (!session?.user?.id) {
        setChildProfiles([]);
        setSelectedChild(null);
        return;
      }

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const nextChildren = (data || []) as Child[];
      setChildProfiles(nextChildren);

      setSelectedChild((prev) => {
        if (!nextChildren.length) return null;

        if (prev) {
          const stillExists = nextChildren.find((child) => child.id === prev.id);
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
  };

  useEffect(() => {
    void refreshChildren();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!session?.user?.id) {
          setChildProfiles([]);
          setSelectedChild(null);
          setLoading(false);
          return;
        }

        await refreshChildren();
      } catch (error) {
        console.error('Child context auth sync error:', error);
        setChildProfiles([]);
        setSelectedChild(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      children: childProfiles,
      selectedChild,
      setSelectedChild,
      loading,
      refreshChildren,
    }),
    [childProfiles, selectedChild, loading]
  );

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export const useChild = () => useContext(ChildContext);