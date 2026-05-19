import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';

import TideCard from './TideCard';
import {
  mockTidesResponse,
  mockWeatherResponse,
  FIXED_NOW_MS,
} from '@/tests/setup/mockData';

// We freeze "now" to 2024-01-01T12:00:00Z so the relative time math in
// TideCard (which sorts/filters events by Date.now()) is deterministic.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_NOW_MS));
});
afterEach(() => {
  vi.useRealTimers();
});

/**
 * Render TideCard at a given CSS viewport width and pull the SVG y-coords for
 * the "Now" marker and every event dot. The y-axis is shared across all of
 * them, so if they live on different chart datums we'll see the Now marker
 * fall outside the band of event dots — which is exactly what was happening
 * in the broken graph.
 */
function renderAndExtractCircleYs(viewportWidth: number) {
  // Match a real device width on the JSDOM window so any responsive code
  // paths inside TideCard see the correct viewport.
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: viewportWidth,
  });
  window.dispatchEvent(new Event('resize'));

  const { container, unmount } = render(
    <TideCard
      tideData={mockTidesResponse}
      wind={mockWeatherResponse}
      warnings={[]}
    />,
  );

  const circles = Array.from(container.querySelectorAll('circle'));
  // First circle = Now marker, rest = event dots (matches TideCard render order).
  expect(circles.length).toBeGreaterThanOrEqual(2);
  const ys = circles.map((c) => parseFloat(c.getAttribute('cy') ?? 'NaN'));
  unmount();
  return { nowY: ys[0], eventYs: ys.slice(1) };
}

describe('TideCard — chart datum scale consistency', () => {
  it('places the Now marker within the y-band of the high/low event dots (mobile, 360px)', () => {
    const { nowY, eventYs } = renderAndExtractCircleYs(360);

    const minEventY = Math.min(...eventYs);
    const maxEventY = Math.max(...eventYs);

    // current_height_m (2.5m) sits between LW (0.8m) and HW (4.2m), so the Now
    // dot should sit between the high-tide dot (top) and the low-tide dot
    // (bottom) on the SVG. If a scale mismatch creeps in (e.g. current is on a
    // different datum than the events), Now will jump outside the event band.
    expect(nowY).toBeGreaterThanOrEqual(minEventY);
    expect(nowY).toBeLessThanOrEqual(maxEventY);
  });

  it('places the Now marker within the y-band of the high/low event dots (desktop, 1280px)', () => {
    const { nowY, eventYs } = renderAndExtractCircleYs(1280);

    const minEventY = Math.min(...eventYs);
    const maxEventY = Math.max(...eventYs);

    expect(nowY).toBeGreaterThanOrEqual(minEventY);
    expect(nowY).toBeLessThanOrEqual(maxEventY);
  });

  it('keeps the Now marker on the same scale regardless of viewport size', () => {
    // The viewBox is normalized (preserveAspectRatio="none") so the *relative*
    // y position of the Now marker within the event band must be identical
    // across viewports. This proves the scale is data-driven, not layout-driven.
    const mobile = renderAndExtractCircleYs(360);
    const desktop = renderAndExtractCircleYs(1280);

    const relPos = (now: number, ys: number[]) => {
      const lo = Math.min(...ys);
      const hi = Math.max(...ys);
      return (now - lo) / (hi - lo || 1);
    };

    const mobilePos = relPos(mobile.nowY, mobile.eventYs);
    const desktopPos = relPos(desktop.nowY, desktop.eventYs);
    expect(Math.abs(mobilePos - desktopPos)).toBeLessThan(0.01);
  });

  it('refuses to render Now above the high-tide dot when current ≤ HW', () => {
    // This is the exact regression: pre-fix, current_height_m was 5.1m vs HW
    // 3.7m, so the Now marker rendered ABOVE the high-tide dot. We assert the
    // ordering invariant directly.
    const { nowY, eventYs } = renderAndExtractCircleYs(390);
    const highTideY = Math.min(...eventYs); // smallest y = highest on screen
    expect(nowY).toBeGreaterThanOrEqual(highTideY);
  });
});
