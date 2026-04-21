import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import LightningCard from './LightningCard';
import {
  mockLightningCalm,
  mockLightningWithStrikes,
  FIXED_NOW_MS,
} from '@/tests/setup/mockData';

beforeEach(() => {
  // Freeze time so SAFE_TIMEOUT_MS / elapsed timer math is deterministic.
  // mockLightningWithStrikes.last_strike_time_ms is FIXED_NOW_MS - 30s,
  // so freezing Date.now() to FIXED_NOW_MS keeps the strike "active" (< 30 min).
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_NOW_MS));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LightningCard — calm state', () => {
  it('renders "Atmosphere Stable" when there are no strikes', () => {
    render(<LightningCard data={mockLightningCalm} />);

    expect(screen.getByText('Thunder & Lightning')).toBeInTheDocument();
    expect(screen.getByText('Atmosphere Stable')).toBeInTheDocument();
    expect(
      screen.getByText(/No lightning activity within 20km/i),
    ).toBeInTheDocument();
    // No "Since Last Strike" timer in calm state
    expect(screen.queryByText(/Since Last Strike/i)).not.toBeInTheDocument();
    // No level-3 danger banner
    expect(screen.queryByText(/Take your pets inside/i)).not.toBeInTheDocument();
  });
});

describe('LightningCard — severe storm state', () => {
  it('shows the danger banner with correct distance and bearing for level 3', () => {
    render(<LightningCard data={mockLightningWithStrikes} />);

    // Severe alert label
    expect(screen.getByText('Immediate Danger')).toBeInTheDocument();

    // Active status pill
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Distance + compass from mock (2.1km SW)
    const banner = screen.getByText(/2\.1km SW/);
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/Take your pets inside/i);

    // Strike count line
    expect(
      screen.getByText(/4 strikes detected within 20km/i),
    ).toBeInTheDocument();

    // Time-since-last-strike block is rendered (30s after strike → "00:30")
    expect(screen.getByText('Since Last Strike')).toBeInTheDocument();
    expect(screen.getByText('00:30')).toBeInTheDocument();
  });

  it('applies the warning-red color class to the status text at level 3', () => {
    render(<LightningCard data={mockLightningWithStrikes} />);
    const status = screen.getByText('Immediate Danger');
    expect(status.className).toContain('text-warning-red');
  });
});
