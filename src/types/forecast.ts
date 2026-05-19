// Domain type definitions for forecast data (weather, tides, warnings, lightning).

export interface WeatherForecastDay {
  date: string; // YYYY-MM-DD
  temp_max_c: number;
  temp_min_c: number;
  feels_like_max_c: number;
  feels_like_min_c: number;
  wind_speed_kmh: number;
  wind_direction_degrees: number;
  wind_direction: string;
  precipitation_probability: number;
  weather_code: number;
  sunrise: string | null;
  sunset: string | null;
}

export interface WindData {
  speed_knots: number;
  speed_beaufort: number;
  beaufort_label: string;
  direction: string;
  direction_degrees: number;
  temperature_c: number;
  trend: 'rising' | 'falling' | 'steady';
  precipitation_mm?: number;
  weather_code?: number;
  cloud_cover?: number;
  water_temperature_c?: number;
  feels_like_c?: number;
  sunrise?: string;
  sunset?: string;
  forecast?: WeatherForecastDay[];
}

export interface TideEvent {
  type: 'high' | 'low';
  time: string;
  height_m: number;
  timestamp?: string;
}

export interface TidePredictionPoint {
  time: string;
  height_m: number;
  timestamp: string;
}

export interface TideForecastDay {
  date: string; // YYYY-MM-DD
  events: TideEvent[];
  points?: TidePredictionPoint[];
}

export interface TideData {
  events: TideEvent[];
  current_height_m: number;
  state: 'rising' | 'falling';
  forecast?: TideForecastDay[];
}

export interface Warning {
  level: 'yellow' | 'orange' | 'red';
  headline: string;
  description: string;
  valid_until: string;
  is_thunderstorm?: boolean;
  elevated?: boolean;
}

export interface MarineWarning {
  type: string;
  area: string;
  description: string;
  active: boolean;
}

export interface NowcastData {
  lpi: number;
  cape: number;
  atmospheric_alert: boolean;
  nowcast_level: number; // 0=stable, 0.5=charging, 1=approaching
  status_text: string;
  eta_minutes: number | null;
  nearest_cell: {
    direction: string;
    distance_km: number;
    intensity_mm: number;
    eta_minutes: number | null;
    approaching: boolean;
  } | null;
  storm_cell_count: number;
  radar_sync_ms: number;
}

export interface LightningData {
  alert_level: number;
  strike_count: number;
  last_strike_time_ms: number | null;
  closest_strike: {
    distance_km: number;
    bearing_compass: string;
    bearing_deg: number;
  } | null;
  strikes: Array<{
    distance_km: number;
    bearing_compass: string;
    time_ms: number;
  }>;
  nowcast?: NowcastData;
  checked_at: number;
}
