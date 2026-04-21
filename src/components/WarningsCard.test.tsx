import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import WarningsCard from './WarningsCard';
import {
  mockWarningsResponse,
  mockLocation,
} from '@/tests/setup/mockData';
import type { Warning } from '@/lib/mock-data';

// WarningsCard reads location.county and location.name from useLocation()
vi.mock('@/hooks/use-location', () => ({
  useLocation: () => ({ location: mockLocation, setLocationById: vi.fn() }),
}));

describe('WarningsCard — with active warnings', () => {
  it('renders the headline, level badge, and description for each warning', () => {
    render(<WarningsCard warnings={mockWarningsResponse} />);

    // Header is always present
    expect(screen.getByText('Met Éireann Warnings')).toBeInTheDocument();

    // Headline + description from mockWarningsResponse[0]
    expect(screen.getByText('Wind Warning for Kerry')).toBeInTheDocument();
    expect(
      screen.getByText(/Southwest winds reaching mean speeds of 50–65 km\/h/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Valid until 18:00 today/i)).toBeInTheDocument();

    // Level badge text shows the level name
    expect(screen.getByText('yellow')).toBeInTheDocument();

    // Calm-state copy must NOT appear
    expect(
      screen.queryByText(`No active warnings for ${mockLocation.county}`),
    ).not.toBeInTheDocument();
  });

  it('applies the red badge class for a red-level warning', () => {
    const redWarning: Warning[] = [
      {
        level: 'red',
        headline: 'Severe Weather Warning',
        description: 'Damaging winds and coastal flooding expected.',
        valid_until: 'midnight',
      },
    ];
    render(<WarningsCard warnings={redWarning} />);

    const badge = screen.getByText('red');
    expect(badge.className).toContain('bg-warning-red');
    expect(screen.getByText('Severe Weather Warning')).toBeInTheDocument();
  });
});

describe('WarningsCard — empty state', () => {
  it('shows the "no active warnings" safe state when warnings is empty', () => {
    render(<WarningsCard warnings={[]} />);

    expect(screen.getByText('Met Éireann Warnings')).toBeInTheDocument();
    expect(
      screen.getByText(`No active warnings for ${mockLocation.county}`),
    ).toBeInTheDocument();

    // No specific warning content should render
    expect(screen.queryByText('Wind Warning for Kerry')).not.toBeInTheDocument();
  });

  it('upgrades to active state when weatherCode indicates a thunderstorm', () => {
    // weather codes >= 95 represent thunderstorms in Open-Meteo's WMO codes
    render(<WarningsCard warnings={[]} weatherCode={95} />);

    expect(screen.getByText('Thunderstorm Activity Detected')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`thunderstorm or lightning activity in the ${mockLocation.name} area`, 'i')),
    ).toBeInTheDocument();
    // Empty-state copy must NOT appear
    expect(
      screen.queryByText(`No active warnings for ${mockLocation.county}`),
    ).not.toBeInTheDocument();
  });
});
