// Pure sparkline builder for tide forecast day cards.
// Produces SVG path strings + marker positions from a day's prediction points
// and high/low events, projected onto a shared Y-scale.

export interface TidePoint {
  time?: string;
  timestamp?: string;
  height_m: number;
}

export interface TideEvent {
  time?: string;
  timestamp?: string;
  type: 'high' | 'low';
  height_m: number;
}

export interface SparklineMarker {
  x: number;
  y: number;
  type: 'high' | 'low';
}

export interface Sparkline {
  d: string;
  dArea: string;
  markers: SparklineMarker[];
  W: number;
  H: number;
  now: { x: number; y: number } | null;
}

export interface BuildSparklineArgs {
  points: TidePoint[];
  events: TideEvent[];
  globalMinH: number;
  globalMaxH: number;
  isToday: boolean;
  currentHeight: number;
  width?: number;
  height?: number;
  now?: Date;
}

function toDublinMinutes(p: { time?: string; timestamp?: string }): number | null {
  if (p.time && /^\d{1,2}:\d{2}/.test(p.time)) {
    const [h, m] = p.time.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  }
  if (p.timestamp) {
    const d = new Date(p.timestamp);
    if (!isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Dublin',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const hh = Number(parts.find(part => part.type === 'hour')?.value ?? NaN);
      const mm = Number(parts.find(part => part.type === 'minute')?.value ?? NaN);
      if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
    }
  }
  return null;
}

export function buildTideSparkline({
  points,
  events,
  globalMinH,
  globalMaxH,
  isToday,
  currentHeight,
  width = 320,
  height = 40,
  now = new Date(),
}: BuildSparklineArgs): Sparkline | null {
  let samples = points
    .map(point => {
      const x = toDublinMinutes(point);
      return x == null ? null : { x, y: point.height_m };
    })
    .filter((p): p is { x: number; y: number } => p !== null && p.x >= 0 && p.x <= 1440)
    .sort((a, b) => a.x - b.x);

  // Fallback: synthesise samples from high/low events when the backend
  // doesn't return prediction points (events alone give us the wave shape).
  if (samples.length < 2 && events.length >= 2) {
    samples = events
      .map(e => {
        const x = toDublinMinutes(e);
        return x == null ? null : { x, y: e.height_m };
      })
      .filter((p): p is { x: number; y: number } => p !== null && p.x >= 0 && p.x <= 1440)
      .sort((a, b) => a.x - b.x);
  }

  if (samples.length < 2) return null;

  const minH = globalMinH;
  const maxH = globalMaxH;
  const rangeH = maxH - minH || 1;

  const W = width;
  const H = height;
  const padY = 6;
  const usableH = H - padY * 2;

  const projectY = (yMeters: number) =>
    padY + (1 - (yMeters - minH) / rangeH) * usableH;
  const projectX = (xMin: number) => (xMin / 1440) * W;

  // Smooth curve via cubic bezier with horizontal control handles —
  // approximates the sinusoidal tide shape between high/low extrema.
  const pts = samples.map(s => ({ x: projectX(s.x), y: projectY(s.y) }));
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` C${cx.toFixed(2)},${prev.y.toFixed(2)} ${cx.toFixed(2)},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`;
  }

  const baselineY = H - 2;
  const firstX = projectX(samples[0].x).toFixed(2);
  const lastX = projectX(samples[samples.length - 1].x).toFixed(2);
  const dArea = `${d} L${lastX},${baselineY} L${firstX},${baselineY} Z`;

  const markers: SparklineMarker[] = events
    .map(event => {
      const x = toDublinMinutes(event);
      return x == null ? null : { x: projectX(x), y: projectY(event.height_m), type: event.type };
    })
    .filter((m): m is SparklineMarker => m !== null);

  let nowMarker: { x: number; y: number } | null = null;
  if (isToday) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Dublin',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hh = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
    const mm = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
    const nowMin = hh * 60 + mm;
    nowMarker = { x: projectX(nowMin), y: projectY(currentHeight) };
  }

  return { d, dArea, markers, W, H, now: nowMarker };
}
