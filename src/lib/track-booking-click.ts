import { supabase } from '@/integrations/supabase/client';

type BookingClickSource = 'detail-page' | 'map-drawer' | 'map-sheet' | 'other';

/**
 * Record that a visitor opened a sauna's booking link.
 * Fire-and-forget: never blocks or breaks the outbound navigation.
 */
export function trackBookingClick(opts: {
  locationId: string;
  saunaName?: string | null;
  source?: BookingClickSource;
}) {
  const payload = {
    location_id: opts.locationId,
    sauna_name: opts.saunaName ?? null,
    source: opts.source ?? 'other',
    path: typeof window !== 'undefined' ? window.location.pathname : null,
  };

  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'booking_click', {
        location_id: payload.location_id,
        sauna_name: payload.sauna_name,
        source: payload.source,
      });
    }
  } catch {
    /* no-op */
  }

  void supabase
    .from('booking_clicks')
    .insert(payload)
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[booking_click] not recorded:', error.message);
      }
    });
}
