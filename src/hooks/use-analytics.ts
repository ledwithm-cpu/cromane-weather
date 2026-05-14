import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const isGaDebug = () => {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.location.search.includes('ga_debug=1') ||
      window.localStorage.getItem('ga_debug') === '1'
    );
  } catch {
    return false;
  }
};

export function useAnalytics() {
  const location = useLocation();

  useEffect(() => {
    const pagePath = location.pathname + location.search;
    const pageTitle = document.title;

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pagePath, page_title: pageTitle });
    }

    if (isGaDebug()) {
      // eslint-disable-next-line no-console
      console.log('[GA4] page_view', { page_path: pagePath, page_title: pageTitle });
    }
  }, [location.pathname, location.search]);
}
