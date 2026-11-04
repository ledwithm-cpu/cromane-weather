import { TideData } from '@/types/forecast';

export const TIDES_UNAVAILABLE_TEXT =
  'Tide times are unavailable right now · check back shortly or see the Marine Institute.';

/** True when there is no real tide data to draw. */
export function isTideUnavailable(tideData: TideData | null | undefined): boolean {
  if (!tideData) return true;
  if (tideData.unavailable) return true;
  const hasEvents = (tideData.events?.length ?? 0) > 0;
  const hasForecast = (tideData.forecast ?? []).some(d => (d.events?.length ?? 0) > 0 || (d.points?.length ?? 0) > 0);
  return !hasEvents && !hasForecast;
}

export function formatStaleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'earlier';
  return new Intl.DateTimeFormat('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Dublin',
  }).format(d);
}

export const TidesUnavailable = () => (
  <div className="px-5 py-6 text-center">
    <p className="text-sm text-muted-foreground leading-relaxed">{TIDES_UNAVAILABLE_TEXT}</p>
  </div>
);

export const TidesStaleNote = ({ fetchedAt }: { fetchedAt?: string }) => (
  <p className="text-[11px] text-muted-foreground/70 text-center">
    Showing tide predictions from {fetchedAt ? formatStaleTime(fetchedAt) : 'earlier'} · live update failed.
  </p>
);
