import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  mockLocation,
  mockWeatherResponse,
  mockTidesResponse,
  mockWarningsResponse,
  mockMarineResponse,
  mockPollenLow,
} from '@/tests/setup/mockData';

// ─── Hook mocks (registered before importing Index) ───
const useWeatherMock = vi.fn();
const useTidesMock = vi.fn();
const useWarningsMock = vi.fn();
const useLightningMock = vi.fn();
const usePollenMock = vi.fn();
const useRefreshAllMock = vi.fn(() => vi.fn());

vi.mock('@/hooks/use-cromane-data', () => ({
  useWeather: () => useWeatherMock(),
  useTides: () => useTidesMock(),
  useWarnings: () => useWarningsMock(),
  useLightning: () => useLightningMock(),
  useRefreshAll: () => useRefreshAllMock(),
}));

vi.mock('@/hooks/use-pollen', () => ({
  usePollen: () => usePollenMock(),
}));

vi.mock('@/hooks/use-location', () => ({
  useLocation: () => ({ location: mockLocation, setLocationById: vi.fn() }),
}));

// Heavy children — replace with simple test stubs so we don't pull in
// charts, swipers, or the lightning card's timer machinery.
vi.mock('@/components/ForecastSwiper', () => ({
  default: () => <div data-testid="forecast-swiper" />,
}));
vi.mock('@/components/PullToRefresh', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/InstallPrompt', () => ({
  default: () => null,
}));
vi.mock('@/components/MarineCard', () => ({
  default: () => <div data-testid="marine-card" />,
}));
vi.mock('@/components/PollenCard', () => ({
  default: () => <div data-testid="pollen-card" />,
}));
// Now import the page under test
import Index from './Index';

const renderPage = () =>
  render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>,
  );

beforeEach(() => {
  // Default: everything loaded successfully
  useWeatherMock.mockReturnValue({ data: mockWeatherResponse, isLoading: false });
  useTidesMock.mockReturnValue({ data: mockTidesResponse, isLoading: false });
  useWarningsMock.mockReturnValue({
    data: { warnings: mockWarningsResponse, marine: mockMarineResponse },
    isLoading: false,
  });
  useLightningMock.mockReturnValue({ data: { alert_level: 0, nowcast: { nowcast_level: 0 } } });
  usePollenMock.mockReturnValue({ data: mockPollenLow, isLoading: false });
});

describe('<Index /> dashboard', () => {
  it('renders the current location name in the header', () => {
    renderPage();
    expect(screen.getByText(mockLocation.name)).toBeInTheDocument();
    expect(screen.getByText('Tap the location name to change beach')).toBeInTheDocument();
    if (mockLocation.saunaName) {
      expect(screen.getByText(mockLocation.saunaName)).toBeInTheDocument();
    }
  });

  it('shows the "Fetching live data…" skeleton when any hook is loading', () => {
    useWeatherMock.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    expect(screen.getByText(/Fetching live data/i)).toBeInTheDocument();
  });

  it('hides the loading skeleton when all hooks have resolved', () => {
    renderPage();
    expect(screen.queryByText(/Fetching live data/i)).not.toBeInTheDocument();
  });

  it('renders warnings and hides the lightning card when data is present', () => {
    renderPage();

    expect(screen.queryByTestId('lightning-card')).not.toBeInTheDocument();

    // WarningsCard renders inline (not stubbed) so we assert on its visible content
    expect(screen.getByText('Met Éireann Warnings')).toBeInTheDocument();
    expect(screen.getByText(mockWarningsResponse[0].headline)).toBeInTheDocument();

    // ForecastSwiper / Marine stubs mounted; pollen is currently hidden
    expect(screen.getByTestId('forecast-swiper')).toBeInTheDocument();
    expect(screen.getByTestId('marine-card')).toBeInTheDocument();
    expect(screen.queryByTestId('pollen-card')).not.toBeInTheDocument();
  });
});
