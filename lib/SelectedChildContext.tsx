import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { supabase } from './supabase';

type Child = {
  id: string;
  child_name?: string | null;
  name?: string | null;
  parent_id?: string | null;
  caregiver_role?: string | null;
  caregiver_access_role?: string | null;
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

const CHILD_LOAD_TIMEOUT_MS = 7000;

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

export function ChildProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [childProfiles, setChildProfiles] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const hasLoadedOnceRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const clearChildState = useCallback(() => {
    if (!mountedRef.current) return;

    setChildProfiles([]);
    setSelectedChild(null);
    setLoading(false);
    hasLoadedOnceRef.current = true;
  }, []);

  const refreshChildren = useCallback(async (): Promise<void> => {
    /*
     * Prevent two startup events from running the same database
     * queries at the same time.
     */
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshTask = async () => {
      const isInitialLoad = !hasLoadedOnceRef.current;

      if (isInitialLoad && mountedRef.current) {
        setLoading(true);
      }

      try {
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          CHILD_LOAD_TIMEOUT_MS,
          'Child session lookup timed out.'
        );

        if (!mountedRef.current) return;

        if (sessionResult.error) {
          console.error(
            'Child context session error:',
            sessionResult.error.message
          );

          /*
           * Do not erase an existing child selection because of a
           * temporary session error.
           */
          return;
        }

        const userId = sessionResult.data.session?.user?.id;

        if (!userId) {
          clearChildState();
          return;
        }

        /*
         * These two requests are independent, so run them together.
         */
        const [ownedResult, caregiverResult] = await withTimeout(
          Promise.all([
            supabase
              .from('children')
              .select('*')
              .eq('parent_id', userId)
              .order('created_at', { ascending: true }),

            supabase
              .from('child_caregivers')
              .select('child_id, role, status, owner_user_id')
              .eq('caregiver_user_id', userId)
              .eq('status', 'accepted'),
          ]),
          CHILD_LOAD_TIMEOUT_MS,
          'Child profile lookup timed out.'
        );

        if (!mountedRef.current) return;

        if (ownedResult.error) {
          throw ownedResult.error;
        }

        if (caregiverResult.error) {
          throw caregiverResult.error;
        }

        const ownedChildren: Child[] = (
          ownedResult.data ?? []
        ).map((child: any) => ({
          ...child,
          caregiver_access_role: 'owner',
        }));

        const caregiverRows = caregiverResult.data ?? [];

        const sharedRows = caregiverRows.filter(
          (row: any) =>
            row.child_id &&
            row.role !== 'owner'
        );

        const sharedChildIds = Array.from(
          new Set(
            sharedRows
              .map((row: any) => row.child_id)
              .filter(Boolean)
          )
        );

        let sharedChildren: Child[] = [];

        if (sharedChildIds.length > 0) {
          const sharedResult = await withTimeout(
            supabase
              .from('children')
              .select('*')
              .in('id', sharedChildIds)
              .order('created_at', { ascending: true }),
            CHILD_LOAD_TIMEOUT_MS,
            'Shared child lookup timed out.'
          );

          if (!mountedRef.current) return;

          if (sharedResult.error) {
            throw sharedResult.error;
          }

          sharedChildren = (sharedResult.data ?? []).map(
            (child: any) => {
              const caregiverRow = sharedRows.find(
                (row: any) => row.child_id === child.id
              );

              return {
                ...child,
                caregiver_role:
                  caregiverRow?.role ?? 'caregiver',
                caregiver_access_role:
                  caregiverRow?.role ?? 'caregiver',
              };
            }
          );
        }

        /*
         * Merge owned and shared children without duplicates.
         * Owned access takes priority.
         */
        const mergedChildren = new Map<string, Child>();

        ownedChildren.forEach((child) => {
          mergedChildren.set(child.id, child);
        });

        sharedChildren.forEach((child) => {
          if (!mergedChildren.has(child.id)) {
            mergedChildren.set(child.id, child);
          }
        });

        const nextChildren = Array.from(
          mergedChildren.values()
        );

        if (!mountedRef.current) return;

        setChildProfiles(nextChildren);

        setSelectedChild((previousChild) => {
          if (!nextChildren.length) {
            return null;
          }

          if (previousChild?.id) {
            const refreshedSelection = nextChildren.find(
              (child) => child.id === previousChild.id
            );

            if (refreshedSelection) {
              return refreshedSelection;
            }
          }

          return nextChildren[0];
        });
      } catch (error) {
        /*
         * Preserve the current selection during temporary network or
         * database failures. Clearing it can make screens flash or fail.
         */
        console.error(
          'Error fetching children for context:',
          error
        );
      } finally {
        hasLoadedOnceRef.current = true;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    refreshPromiseRef.current = refreshTask().finally(() => {
      refreshPromiseRef.current = null;
    });

    return refreshPromiseRef.current;
  }, [clearChildState]);

  useEffect(() => {
    mountedRef.current = true;

    /*
     * Load once when the provider mounts.
     */
    void refreshChildren();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_OUT' || !session?.user?.id) {
        clearChildState();
        return;
      }

      /*
       * Reload only when a user actually signs in or their account
       * changes. TOKEN_REFRESHED should not refetch every child.
       */
      if (
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED'
      ) {
        void refreshChildren();
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [clearChildState, refreshChildren]);

  const value = useMemo<ChildContextType>(
    () => ({
      children: childProfiles,
      selectedChild,
      setSelectedChild,
      loading,
      refreshChildren,
    }),
    [
      childProfiles,
      selectedChild,
      loading,
      refreshChildren,
    ]
  );

  return (
    <ChildContext.Provider value={value}>
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  return useContext(ChildContext);
}