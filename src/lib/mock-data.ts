// Mock data for Cromane Watch MVP

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
}

export interface TideEvent {
  type: 'high' | 'low';
  time: string;
  height_m: number;
}

export interface TideData {
  events: TideEvent[];
  current_height_m: number;
  state: 'rising' | 'falling';
}

export interface Warning {
  level: 'yellow' | 'orange' | 'red';
  headline: string;
  description: string;
  valid_until: string;
}

export interface MarineWarning {
  type: string;
  area: string;
  description: string;
  active: boolean;
}

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

export function getBeaufortLabel(bf: number): string {
  const labels = [
    'Calm', 'Light air', 'Light breeze', 'Gentle breeze',
    'Moderate breeze', 'Fresh breeze', 'Strong breeze',
    'Near gale', 'Gale', 'Strong gale', 'Storm',
    'Violent storm', 'Hurricane force',
  ];
  return labels[bf] || 'Unknown';
}

export function hasActiveWarnings(warnings: Warning[]): boolean {
  return warnings.some(w => w.level === 'orange' || w.level === 'red');
}

export function isBookingConditionsMet(wind: WindData, warnings: Warning[]): boolean {
  return wind.speed_knots < 25 && !hasActiveWarnings(warnings);
}
