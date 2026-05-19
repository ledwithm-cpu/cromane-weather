import { useEffect, useState } from 'react';
import { dublinDateKey } from '@/lib/forecast-days';

/**
 * Returns a token that changes whenever the Dublin-local calendar date rolls
 * over (e.g. past midnight while the tab was backgrounded). Listens for tab
 * visibility, window focus, and a periodic check while visible.
 *
 * Use the returned `dateKey` as a dependency (or in a `useMemo` key) for any
 * 7-day timeline that must stay anchored to "today".
 */
export function useDailyRollover(): string {
  const [dateKey, setDateKey] = useState(() => dublinDateKey(new Date()));

  useEffect(() => {
    const check = () => {
      const next = dublinDateKey(new Date());
      setDateKey(prev => (prev === next ? prev : next));
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    // Catch the rollover even if the tab stays visible all night.
    const interval = window.setInterval(check, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.clearInterval(interval);
    };
  }, []);

  return dateKey;
}
