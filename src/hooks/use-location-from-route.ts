import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { LOCATIONS } from '@/lib/locations';
import { useLocation } from './use-location';

/**
 * Derives the active location from the URL (:locationId param) and keeps the
 * LocationContext in sync. The URL is the single source of truth on
 * /:locationId routes; on the root route, context (localStorage default) wins.
 */
export function useLocationFromRoute() {
  const { locationId } = useParams<{ locationId?: string }>();
  const { location, setLocationById } = useLocation();

  const routeLocation = useMemo(
    () => (locationId ? LOCATIONS.find(l => l.id === locationId) ?? null : null),
    [locationId],
  );

  const hasRouteParam = Boolean(locationId);
  const isInvalidRoute = hasRouteParam && !routeLocation;

  useEffect(() => {
    if (routeLocation && routeLocation.id !== location.id) {
      setLocationById(routeLocation.id);
    }
  }, [routeLocation, location.id, setLocationById]);

  return {
    location: routeLocation ?? location,
    isInvalidRoute,
    hasRouteParam,
  };
}
