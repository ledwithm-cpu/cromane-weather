// Static fixtures for tests and offline fallbacks.
import type {
  WindData,
  TideData,
  Warning,
  MarineWarning,
  LightningData,
} from '@/types/forecast';

export const mockWind: WindData = {
  speed_knots: 14,
  speed_beaufort: 4,
  beaufort_label: 'Moderate breeze',
  direction: 'SW',
  direction_degrees: 225,
  temperature_c: 12,
  trend: 'falling',
  precipitation_mm: 0,
  weather_code: 3,
  cloud_cover: 75,
  water_temperature_c: 11,
  feels_like_c: 9,
  sunrise: '08:22',
  sunset: '17:15',
};

export const mockTides: TideData = {
  events: [
    { type: 'high', time: '14:32', height_m: 4.2 },
    { type: 'low', time: '20:48', height_m: 0.8 },
    { type: 'high', time: '02:55', height_m: 4.0 },
    { type: 'low', time: '09:12', height_m: 1.0 },
  ],
  current_height_m: 2.5,
  state: 'falling',
};

export const mockWarnings: Warning[] = [
  {
    level: 'yellow',
    headline: 'Wind Warning for Kerry',
    description: 'Southwest winds reaching mean speeds of 50 to 65 km/h with gusts of 90 to 110 km/h.',
    valid_until: '18:00 today',
  },
];

export const mockMarine: MarineWarning = {
  type: 'Small Craft Warning',
  area: 'Southwest Coast',
  description: 'Southwest winds veering westerly will reach force 6 at times.',
  active: true,
};

export const mockLightning: LightningData = {
  alert_level: 0,
  strike_count: 0,
  last_strike_time_ms: null,
  closest_strike: null,
  strikes: [],
  nowcast: {
    lpi: 0,
    cape: 0,
    atmospheric_alert: false,
    nowcast_level: 0,
    status_text: 'Atmosphere Stable',
    eta_minutes: null,
    nearest_cell: null,
    storm_cell_count: 0,
    radar_sync_ms: Date.now(),
  },
  checked_at: Date.now(),
};
