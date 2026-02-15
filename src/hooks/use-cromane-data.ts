import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WindData, TideEvent, Warning, MarineWarning, mockWind, mockTides, mockWarnings, mockMarine } from '@/lib/mock-data';

async function fetchWeather(): Promise<WindData> {
  const { data, error } = await supabase.functions.invoke('get-weather');
  if (error) throw error;
  return data;
}

async function fetchTides(): Promise<TideEvent[]> {
  const { data, error } = await supabase.functions.invoke('get-tides');
  if (error) throw error;
  return data;
}

async function fetchWarnings(): Promise<{ warnings: Warning[]; marine: MarineWarning }> {
  const { data, error } = await supabase.functions.invoke('get-warnings');
  if (error) throw error;
  return data;
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeather,
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    staleTime: 5 * 60 * 1000,
    placeholderData: mockWind,
    retry: 2,
  });
}

export function useTides() {
  return useQuery({
    queryKey: ['tides'],
    queryFn: fetchTides,
    refetchInterval: 60 * 60 * 1000, // 1 hour
    staleTime: 30 * 60 * 1000,
    placeholderData: mockTides,
    retry: 2,
  });
}

export function useWarnings() {
  return useQuery({
    queryKey: ['warnings'],
    queryFn: fetchWarnings,
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    placeholderData: { warnings: mockWarnings, marine: mockMarine },
    retry: 2,
  });
}
