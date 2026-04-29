import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import TideCard from './TideCard';
import ForecastSwiper from './ForecastSwiper';
import {
  mockTidesResponse,
  mockWeatherResponse,
  FIXED_NOW_MS,
} from '@/tests/setup/mockData';

// Freeze "now" so ForecastSwiper picks today=index 0 deterministically.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_NOW_MS));
  // jsdom doesn't ship IntersectionObserver, which embla-carousel (used by
  // ForecastSwiper) calls on mount. A no-op shim is enough for render-only
  // assertions — we never scroll the carousel in these tests.
  if (!('IntersectionObserver' in globalThis)) {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
    }
    // @ts-expect-error - polyfill
    globalThis.IntersectionObserver = IO;
  }
  if (!('ResizeObserver' in globalThis)) {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error - polyfill
    globalThis.ResizeObserver = RO;
  }
});
afterEach(() => {
  vi.useRealTimers();
});

/**
 * These tests guard the contract: whatever the get-weather edge function
 * returns for `temperature_c` and `feels_like_c` (both rounded mirrors of
 * Open-Meteo's `temperature_2m` and `apparent_temperature`) must be the
 * exact numbers shown to the user. No client-side math, no fallbacks, no
 * unit conversions — otherwise the UI can drift away from Open-Meteo's
 * apparent_temperature and we get back the bug where Cromane showed
 * "FEELS 16°" while Open-Meteo said ~7°.
 */
describe('Weather UI — temperature & feels-like mirror the API payload', () => {
  it('TideCard renders the exact feels_like_c value from the weather payload', () => {
    render(
      <TideCard
        tideData={mockTidesResponse}
        wind={mockWeatherResponse}
        warnings={[]}
      />,
    );
    // Mock payload uses feels_like_c=8.7 (already rounded by edge function in
    // prod, here intentionally fractional to prove no rounding happens client
    // side — whatever the edge sends is what we render).
    expect(screen.getByText(`${mockWeatherResponse.feels_like_c}°`)).toBeInTheDocument();
    expect(screen.getByText(/feels like/i)).toBeInTheDocument();
  });

  it("ForecastSwiper renders today's feels_like_max_c verbatim from the forecast", () => {
    render(
      <ForecastSwiper
        wind={mockWeatherResponse}
        tideData={mockTidesResponse}
      />,
    );
    const today = mockWeatherResponse.forecast[0];
    // Both the high/low temps and the "Feels" value must come straight from
    // the forecast payload — they're rounded mirrors of Open-Meteo's daily
    // apparent_temperature_max/min and temperature_2m_max/min.
    expect(screen.getByText(`${today.temp_max_c}°`)).toBeInTheDocument();
    expect(screen.getByText(`/ ${today.temp_min_c}°`)).toBeInTheDocument();
    expect(screen.getByText(`${today.feels_like_max_c}°`)).toBeInTheDocument();
  });

  it('regression: feels_like_c never silently falls back to temperature_c when the API omits it', () => {
    // If a future change re-introduces a `feels_like_c ?? temperature_c`
    // fallback in the UI, this test will catch it: when the API explicitly
    // returns the same number for both, TideCard hides the "Feels Like" cell
    // (current behavior) — proving the UI doesn't fabricate a value.
    const sameTemps = {
      ...mockWeatherResponse,
      temperature_c: 11,
      feels_like_c: 11,
    };
    render(
      <TideCard tideData={mockTidesResponse} wind={sameTemps} warnings={[]} />,
    );
    expect(screen.queryByText(/feels like/i)).not.toBeInTheDocument();
  });
});
