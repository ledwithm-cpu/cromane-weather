// Business logic for evaluating conditions (wind, warnings, booking suitability).
import type { WindData, Warning } from '@/types/forecast';

const BEAUFORT_LABELS = [
  'Calm', 'Light air', 'Light breeze', 'Gentle breeze',
  'Moderate breeze', 'Fresh breeze', 'Strong breeze',
  'Near gale', 'Gale', 'Strong gale', 'Storm',
  'Violent storm', 'Hurricane force',
] as const;

export function getBeaufortLabel(bf: number): string {
  return BEAUFORT_LABELS[bf] ?? 'Unknown';
}

export function hasActiveWarnings(warnings: Warning[]): boolean {
  return warnings.some(w => w.level === 'orange' || w.level === 'red');
}

export function isBookingConditionsMet(wind: WindData, warnings: Warning[]): boolean {
  return wind.speed_knots < 25 && !hasActiveWarnings(warnings);
}
