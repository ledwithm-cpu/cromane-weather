// Pure date helpers for the 7-day forecast carousel.

export function dublinDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

export function formatLongDate(date: Date, isToday: boolean, isTomorrow: boolean): string {
  const fmt = new Intl.DateTimeFormat('en-IE', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Europe/Dublin',
  });
  const base = fmt.format(date);
  if (isToday) return `Today · ${base}`;
  if (isTomorrow) return `Tomorrow · ${base}`;
  return base;
}

export function shortDay(date: Date): string {
  return new Intl.DateTimeFormat('en-IE', {
    weekday: 'short', timeZone: 'Europe/Dublin',
  }).format(date);
}

export function dayNumber(date: Date): string {
  return new Intl.DateTimeFormat('en-IE', {
    day: 'numeric', timeZone: 'Europe/Dublin',
  }).format(date);
}

export interface ForecastDay {
  date: Date;
  key: string;
}

/** Build 7 days starting from today (Dublin-keyed). */
export function build7Days(now: Date = new Date()): ForecastDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 24 * 3600 * 1000);
    return { date: d, key: dublinDateKey(d) };
  });
}
