import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WindData, TideData, TideEvent, Warning, MarineWarning, LightningData, NowcastData, mockWind, mockTides, mockWarnings, mockMarine, mockLightning } from '@/lib/mock-data';
import { cacheGet, cacheSet } from '@/lib/offline-cache';
import { useCallback } from 'react';
import { useLocation } from '@/hooks/use-location';
import { useDebugMode } from '@/hooks/use-debug-mode';
import { Location } from '@/lib/locations';

// Extreme lightning mock used when Debug Mode is enabled (strike 2km away)
const DEBUG_LIGHTNING: LightningData = {
  alert_level: 3,
  strike_count: 4,
  last_strike_time_ms: Date.now() - 30_000,
  closest_strike: { distance_km: 2, bearing_compass: 'SW', bearing_deg: 225 },
  strikes: [
    { distance_km: 2, bearing_compass: 'SW', time_ms: Date.now() - 30_000 },
    { distance_km: 4.5, bearing_compass: 'W', time_ms: Date.now() - 90_000 },
    { distance_km: 7.1, bearing_compass: 'WNW', time_ms: Date.now() - 180_000 },
    { distance_km: 12.6, bearing_compass: 'NW', time_ms: Date.now() - 360_000 },
  ],
  nowcast: {
    lpi: 4.2,
    cape: 1800,
    atmospheric_alert: true,
    nowcast_level: 1,
    status_text: 'Storm Cell Detected: Approaching from SW. Estimated arrival: 12 minutes.',
    eta_minutes: 12,
    nearest_cell: {
      direction: 'SW',
      distance_km: 8,
      intensity_mm: 9.4,
      eta_minutes: 12,
      approaching: true,
    },
    storm_cell_count: 2,
    radar_sync_ms: Date.now(),
  },
  checked_at: Date.now(),
};

async function fetchWeather(loc: Location): Promise<WindData> {
  const { data, error } = await supabase.functions.invoke('get-weather', {
    body: { lat: loc.lat, lon: loc.lon, metStation: loc.metEireannStation },
  });
  if (error) throw error;
  cacheSet(`weather-${loc.id}`, data);
  return data;
}

async function fetchTides(loc: Location): Promise<TideData> {
  const { data, error } = await supabase.functions.invoke('get-tides', {
    body: {
      station: loc.tideStation,
      offsetMinutes: loc.tideOffsetMinutes,
      chartDatumOffset: loc.chartDatumOffset,
    },
  });
  if (error) throw error;
  cacheSet(`tides-${loc.id}`, data);
  return data;
}

async function fetchWarnings(loc: Location): Promise<{ warnings: Warning[]; marine: MarineWarning }> {
  const { data, error } = await supabase.functions.invoke('get-warnings', {
    body: { county: loc.county, province: loc.province },
  });
  if (error) throw error;
  cacheSet(`warnings-${loc.id}`, data);
  return data;
}

async function fetchLightning(loc: Location): Promise<LightningData> {
  const { data, error } = await supabase.functions.invoke('get-lightning', {
    body: { lat: loc.lat, lon: loc.lon, name: loc.name },
  });
  if (error) throw error;
  cacheSet(`lightning-${loc.id}`, data);
  return data;
}

export function useWeather() {
  const { location } = useLocation();
  return useQuery({
    queryKey: ['weather', location.id],
    queryFn: () => fetchWeather(location),
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    placeholderData: () => cacheGet<WindData>(`weather-${location.id}`) ?? mockWind,
    retry: 2,
  });
}

export function useTides() {
  const { location } = useLocation();
  return useQuery({
    queryKey: ['tides', location.id],
    queryFn: () => fetchTides(location),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
    placeholderData: () => cacheGet<TideData>(`tides-${location.id}`) ?? mockTides,
    retry: 2,
  });
}

export function useWarnings() {
  const { location } = useLocation();
  return useQuery({
    queryKey: ['warnings', location.id],
    queryFn: () => fetchWarnings(location),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    placeholderData: () => cacheGet<{ warnings: Warning[]; marine: MarineWarning }>(`warnings-${location.id}`) ?? { warnings: mockWarnings, marine: mockMarine },
    retry: 2,
  });
}

export function useLightning() {
  const { location } = useLocation();
  return useQuery({
    queryKey: ['lightning', location.id],
    queryFn: () => fetchLightning(location),
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
    placeholderData: () => cacheGet<LightningData>(`lightning-${location.id}`) ?? mockLightning,
    retry: 2,
  });
}

export function useRefreshAll() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
}
