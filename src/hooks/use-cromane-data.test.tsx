import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import {
  mockLocation,
  mockWeatherResponse,
  mockTidesResponse,
  mockWarningsResponse,
  mockMarineResponse,
  mockLightningWithStrikes,
} from '@/tests/setup/mockData';

// ─── Module mocks (must come before importing the hooks under test) ───

// Mock the location context so hooks read our test location instead of DEFAULT_LOCATION
vi.mock('@/hooks/use-location', () => ({
  useLocation: () => ({ location: mockLocation, setLocationById: vi.fn() }),
}));

// Mock the offline cache so it doesn't reach into localStorage
vi.mock('@/lib/offline-cache', () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}));

// Mock Debug Mode (used by useLightning)
vi.mock('@/hooks/use-debug-mode', () => ({
  useDebugMode: () => ({ isDebugMode: false, toggle: vi.fn() }),
}));

// Mock the Supabase client — these hooks call supabase.functions.invoke(), not fetch
const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

// Now import the hooks (after the mocks are registered)
import { useWeather, useTides, useLightning, useWarnings } from './use-cromane-data';

// ─── Helpers ───
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  invokeMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───

describe('useWeather', () => {
  it('starts fetching then resolves with weather data', async () => {
    invokeMock.mockResolvedValueOnce({ data: mockWeatherResponse, error: null });

    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });

    // These hooks use `placeholderData`, so isLoading flips false immediately
    // while isFetching stays true until the network round-trip resolves.
    expect(result.current.isFetching).toBe(true);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.data).toEqual(mockWeatherResponse);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(invokeMock).toHaveBeenCalledWith('get-weather', {
      body: {
        lat: mockLocation.lat,
        lon: mockLocation.lon,
        metStation: mockLocation.metEireannStation,
      },
    });
  });
});

describe('useTides', () => {
  it('starts fetching then resolves with tide data', async () => {
    invokeMock.mockResolvedValueOnce({ data: mockTidesResponse, error: null });

    const { result } = renderHook(() => useTides(), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(true);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.data).toEqual(mockTidesResponse);
    expect(result.current.data?.events.length).toBeGreaterThan(0);
    expect(invokeMock).toHaveBeenCalledWith('get-tides', {
      body: {
        station: mockLocation.tideStation,
        offsetMinutes: mockLocation.tideOffsetMinutes,
        chartDatumOffset: mockLocation.chartDatumOffset,
      },
    });
  });
});

describe('useLightning', () => {
  it('starts fetching then resolves with strike data', async () => {
    invokeMock.mockResolvedValueOnce({ data: mockLightningWithStrikes, error: null });

    const { result } = renderHook(() => useLightning(), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(true);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.data).toEqual(mockLightningWithStrikes);
    expect(result.current.data?.alert_level).toBe(3);
    expect(result.current.data?.closest_strike?.distance_km).toBe(2.1);
    expect(invokeMock).toHaveBeenCalledWith('get-lightning', {
      body: {
        lat: mockLocation.lat,
        lon: mockLocation.lon,
        name: mockLocation.name,
      },
    });
  });
});

describe('useWarnings', () => {
  it('returns warnings + marine payload from the edge function', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { warnings: mockWarningsResponse, marine: mockMarineResponse },
      error: null,
    });

    const { result } = renderHook(() => useWarnings(), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(true);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.data?.warnings).toEqual(mockWarningsResponse);
    expect(result.current.data?.marine).toEqual(mockMarineResponse);
  });
});

describe('error handling', () => {
  it('useWeather surfaces invoke errors via failureCount', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('boom') });

    const { result } = renderHook(() => useWeather(), { wrapper: createWrapper() });

    // With placeholderData set, React Query keeps `isError` false (placeholder
    // is treated as a successful fallback). The signal that fetch threw is
    // failureCount incrementing.
    await waitFor(() => expect(result.current.failureCount).toBeGreaterThan(0));
    expect(result.current.failureReason).toBeInstanceOf(Error);
    expect((result.current.failureReason as Error).message).toBe('boom');
  });
});
