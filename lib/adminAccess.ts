import { useCallback, useEffect, useState } from 'react';

import { supabase } from './supabase';

export async function checkCurrentUserIsAdmin(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user?.id) return false;

  const { data, error } = await supabase.rpc('is_app_admin');
  if (error) return false;
  return data === true;
}

export function useAdminAccess() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setIsAdmin(await checkCurrentUserIsAdmin());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, isAdmin, refresh };
}
