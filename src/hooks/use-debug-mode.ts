import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'irish-saunas:debug-mode';
const EVENT_NAME = 'debug-mode-change';

function readInitial(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Debug Mode toggle. Persisted in localStorage and synced across hook instances
 * via a custom window event so every consumer (footer toggle, indicator, hooks)
 * stays in sync without a context provider.
 */
export function useDebugMode() {
  const [isDebugMode, setIsDebugMode] = useState<boolean>(readInitial);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setIsDebugMode(detail);
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  const toggle = useCallback(() => {
    const next = !readInitial();
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  }, []);

  return { isDebugMode, toggle };
}
