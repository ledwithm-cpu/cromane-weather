import { createContext, useContext, useState, useCallback } from 'react';
import { Location, DEFAULT_LOCATION, getLocationById } from '@/lib/locations';

interface LocationContextValue {
  location: Location;
  setLocationById: (id: string) => void;
}

const STORAGE_KEY = 'cromane-watch-location';

function getInitialLocation(): Location {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return getLocationById(stored);
  } catch {}
  return DEFAULT_LOCATION;
}

export const LocationContext = createContext<LocationContextValue>({
  location: DEFAULT_LOCATION,
  setLocationById: () => {},
});

export function useLocation() {
  return useContext(LocationContext);
}

export function useLocationState(): LocationContextValue {
  const [location, setLocation] = useState<Location>(getInitialLocation);

  const setLocationById = useCallback((id: string) => {
    const loc = getLocationById(id);
    setLocation(loc);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  return { location, setLocationById };
}
