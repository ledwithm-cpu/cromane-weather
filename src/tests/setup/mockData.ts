import type { Location } from '@/lib/locations';
import type {
  WindData,
  TideData,
  LightningData,
  Warning,
  MarineWarning,
} from '@/lib/mock-data';
import type { PollenCurrent } from '@/hooks/use-pollen';

// ─── Stable timestamp so snapshot diffs stay deterministic ───
export const FIXED_NOW_MS = 1_704_110_400_000; // 2024-01-01T12:00:00.000Z

// ─── Location ───
export const mockLocation: Location = {
  id: 'cromane',
  name: 'Cromane',
  subtitle: 'Co. Kerry · 52.11°N',
  lat: 52.105818,
  lon: -9.895735,
  county: 'Kerry',
  province: 'Munster',
  tideStation: 'Fenit',
  tideOffsetMinutes: 25,
  chartDatumOffset: 2.67,
  metEireannStation: 'valentia',
  saunaName: "Samhradh's Sauna",
  saunaUrl: 'https://www.samhradhssauna.com/book-sauna',
};

// ─── Weather ───
export const mockWeatherResponse: WindData = {
  speed_knots: 12,
  speed_beaufort: 4,
  beaufort_label: 'Moderate breeze',
  direction: 'SW',
  direction_degrees: 225,
  temperature_c: 11.5,
  trend: 'steady',
  precipitation_mm: 0.2,
  weather_code: 3, // overcast
  cloud_cover: 80,
  water_temperature_c: 10.4,
  feels_like_c: 8.7,
  sunrise: '08:22',
  sunset: '17:15',
  forecast: [
    {
      date: '2024-01-01',
      temp_max_c: 12,
      temp_min_c: 6,
      feels_like_max_c: 10,
      feels_like_min_c: 3,
      wind_speed_kmh: 22,
      wind_direction_degrees: 225,
      wind_direction: 'SW',
      precipitation_probability: 40,
      weather_code: 3,
      sunrise: '08:22',
      sunset: '17:15',
    },
    {
      date: '2024-01-02',
      temp_max_c: 11,
      temp_min_c: 5,
      feels_like_max_c: 9,
      feels_like_min_c: 2,
      wind_speed_kmh: 30,
      wind_direction_degrees: 250,
      wind_direction: 'WSW',
      precipitation_probability: 70,
      weather_code: 61,
      sunrise: '08:22',
      sunset: '17:16',
    },
  ],
};

// ─── Tides ───
export const mockTidesResponse: TideData = {
  events: [
    { type: 'high', time: '02:55', height_m: 4.0, timestamp: '2024-01-01T02:55:00Z' },
    { type: 'low', time: '09:12', height_m: 1.0, timestamp: '2024-01-01T09:12:00Z' },
    { type: 'high', time: '14:32', height_m: 4.2, timestamp: '2024-01-01T14:32:00Z' },
    { type: 'low', time: '20:48', height_m: 0.8, timestamp: '2024-01-01T20:48:00Z' },
  ],
  current_height_m: 2.5,
  state: 'falling',
  forecast: [
    {
      date: '2024-01-01',
      events: [
        { type: 'high', time: '14:32', height_m: 4.2, timestamp: '2024-01-01T14:32:00Z' },
        { type: 'low', time: '20:48', height_m: 0.8, timestamp: '2024-01-01T20:48:00Z' },
      ],
    },
  ],
};

// ─── Warnings ───
export const mockWarningsResponse: Warning[] = [
  {
    level: 'yellow',
    headline: 'Wind Warning for Kerry',
    description: 'Southwest winds reaching mean speeds of 50–65 km/h with gusts of 90–110 km/h.',
    valid_until: '18:00 today',
  },
];

export const mockMarineResponse: MarineWarning = {
  type: 'Small Craft Warning',
  area: 'Southwest Coast',
  description: 'Southwest winds veering westerly will reach force 6 at times.',
  active: true,
};

// ─── Lightning: calm state (no strikes) ───
export const mockLightningCalm: LightningData = {
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
    radar_sync_ms: FIXED_NOW_MS,
  },
  checked_at: FIXED_NOW_MS,
};

// ─── Lightning: active strikes (extreme state) ───
export const mockLightningWithStrikes: LightningData = {
  alert_level: 3, // <=5 km
  strike_count: 4,
  last_strike_time_ms: FIXED_NOW_MS - 30_000,
  closest_strike: {
    distance_km: 2.1,
    bearing_compass: 'SW',
    bearing_deg: 225,
  },
  strikes: [
    { distance_km: 2.1, bearing_compass: 'SW', time_ms: FIXED_NOW_MS - 30_000 },
    { distance_km: 4.8, bearing_compass: 'W', time_ms: FIXED_NOW_MS - 90_000 },
    { distance_km: 7.3, bearing_compass: 'WNW', time_ms: FIXED_NOW_MS - 180_000 },
    { distance_km: 12.6, bearing_compass: 'NW', time_ms: FIXED_NOW_MS - 360_000 },
  ],
  nowcast: {
    lpi: 4.2,
    cape: 1850,
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
    radar_sync_ms: FIXED_NOW_MS,
  },
  checked_at: FIXED_NOW_MS,
};

// ─── Pollen ───
export const mockPollenLow: PollenCurrent = {
  time: '2024-01-01T12:00',
  interval: 3600,
  grass_pollen: 4,
  birch_pollen: 2,
  alder_pollen: 1,
};

export const mockPollenHigh: PollenCurrent = {
  time: '2024-01-01T12:00',
  interval: 3600,
  grass_pollen: 600,
  birch_pollen: 320,
  alder_pollen: 180,
};
