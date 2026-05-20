import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthIntent = 'save' | 'visit' | 'generic';

interface AuthModalState {
  open: boolean;
  intent: AuthIntent;
  message?: string;
  /** Callback fired after a successful sign-in or sign-up. */
  onSuccess?: () => void;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Opens the sign-in / sign-up modal; if a callback is provided it runs after auth. */
  requireAuth: (opts?: { message?: string; intent?: AuthIntent; onSuccess?: () => void }) => void;
  openAuthModal: (opts?: { message?: string; intent?: AuthIntent }) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  modal: AuthModalState;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<AuthModalState>({ open: false, intent: 'generic' });
  const pendingSuccess = useRef<(() => void) | null>(null);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    // Set up listener BEFORE getSession (per Supabase guidance)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Fire pending success once we have a session
      if (newSession && pendingSuccess.current && prevUserId.current !== newSession.user.id) {
        const fn = pendingSuccess.current;
        pendingSuccess.current = null;
        // Close modal then run callback on next tick
        setModal((m) => ({ ...m, open: false }));
        setTimeout(() => fn(), 50);
      }
      prevUserId.current = newSession?.user.id ?? null;
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      prevUserId.current = data.session?.user.id ?? null;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuthModal = useCallback((opts?: { message?: string; intent?: AuthIntent }) => {
    setModal({ open: true, intent: opts?.intent ?? 'generic', message: opts?.message });
  }, []);

  const closeAuthModal = useCallback(() => {
    setModal((m) => ({ ...m, open: false }));
    pendingSuccess.current = null;
  }, []);

  const requireAuth = useCallback<AuthContextValue['requireAuth']>((opts) => {
    if (session) {
      opts?.onSuccess?.();
      return;
    }
    pendingSuccess.current = opts?.onSuccess ?? null;
    setModal({
      open: true,
      intent: opts?.intent ?? 'generic',
      message: opts?.message,
    });
  }, [session]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    requireAuth,
    openAuthModal,
    closeAuthModal,
    signOut,
    modal,
  }), [session, loading, requireAuth, openAuthModal, closeAuthModal, signOut, modal]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
