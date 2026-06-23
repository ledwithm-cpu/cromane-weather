import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const STORAGE_KEY = 'home_sauna_slug';

function readLocal(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLocal(slug: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (slug) window.localStorage.setItem(STORAGE_KEY, slug);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function useHomeSauna() {
  const { user, loading: authLoading } = useAuth();
  const [homeSauna, setHomeSaunaState] = useState<string | null>(() => readLocal());
  const [loading, setLoading] = useState(true);

  // Sync from profile on auth resolve.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      if (!user) {
        setHomeSaunaState(readLocal());
        setLoading(false);
        return;
      }

      const local = readLocal();
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('home_sauna_slug')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setHomeSaunaState(local);
        } else {
          const remote = (data?.home_sauna_slug as string | null) ?? null;
          if (!local && remote) {
            writeLocal(remote);
            setHomeSaunaState(remote);
          } else if (local && !remote) {
            // Push local up to profile so devices stay in sync.
            await supabase
              .from('profiles')
              .update({ home_sauna_slug: local })
              .eq('user_id', user.id);
            setHomeSaunaState(local);
          } else {
            setHomeSaunaState(local ?? remote);
          }
        }
      } catch {
        if (!cancelled) setHomeSaunaState(local);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const setHomeSauna = useCallback(
    async (slug: string) => {
      writeLocal(slug);
      setHomeSaunaState(slug);
      if (user) {
        await supabase
          .from('profiles')
          .update({ home_sauna_slug: slug })
          .eq('user_id', user.id);
      }
    },
    [user]
  );

  const clearHomeSauna = useCallback(async () => {
    writeLocal(null);
    setHomeSaunaState(null);
    if (user) {
      await supabase
        .from('profiles')
        .update({ home_sauna_slug: null })
        .eq('user_id', user.id);
    }
  }, [user]);

  return { homeSauna, setHomeSauna, clearHomeSauna, loading };
}
