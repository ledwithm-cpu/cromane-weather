import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@/hooks/use-location';
import { useDebugMode } from '@/hooks/use-debug-mode';

export interface PollenCurrent {
  time: string;
  interval: number;
  grass_pollen: number | null;
  birch_pollen: number | null;
  alder_pollen: number | null;
}

// Extreme mock used when Debug Mode is enabled
const DEBUG_POLLEN: PollenCurrent = {
  time: new Date().toISOString(),
  interval: 3600,
  grass_pollen: 600,
  birch_pollen: 320,
  alder_pollen: 180,
};

interface PollenResponse {
  latitude: number;
  longitude: number;
  current_units: Record<string, string>;
  current: PollenCurrent;
}

async function fetchPollen(lat: number, lon: number): Promise<PollenCurrent> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=grass_pollen,birch_pollen,alder_pollen&timezone=Europe%2FDublin`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollen API error: ${res.status}`);
  const data: PollenResponse = await res.json();
  return data.current;
}

export function usePollen() {
  const { location } = useLocation();
  const { isDebugMode } = useDebugMode();

  const query = useQuery({
    queryKey: ['pollen', location.id, isDebugMode ? 'debug' : 'live'],
    queryFn: async () => {
      if (isDebugMode) return DEBUG_POLLEN;
      return fetchPollen(location.lat, location.lon);
    },
    refetchInterval: isDebugMode ? false : 60 * 60 * 1000, // 1 hour
    staleTime: 30 * 60 * 1000,
    retry: isDebugMode ? 0 : 2,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}
