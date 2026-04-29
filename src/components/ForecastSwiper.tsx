import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import {
  Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow,
  CloudLightning, CloudFog, CloudSun, Wind, Droplets, Thermometer,
} from 'lucide-react';
import { WindData, TideData, TideForecastDay, WeatherForecastDay } from '@/lib/mock-data';
import { useLocation } from '@/hooks/use-location';

interface Props {
  wind: WindData;
  tideData: TideData;
  onDayChange?: (dayIndex: number) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeatherIcon(code: number, className = 'text-foreground') {
  const props = { size: 36, strokeWidth: 1.5, className };
  if (code >= 95) return <CloudLightning {...props} />;
  if (code >= 71) return <CloudSnow {...props} />;
  if (code >= 61) return <CloudRain {...props} />;
  if (code >= 51) return <CloudDrizzle {...props} />;
  if (code >= 45) return <CloudFog {...props} />;
  if (code >= 3) return <Cloud {...props} />;
  if (code >= 1) return <CloudSun {...props} />;
  return <Sun {...props} />;
}

function weatherLabel(code: number): string {
  if (code >= 95) return 'Thunderstorm';
  if (code >= 71) return 'Snow';
  if (code >= 61) return 'Rain';
  if (code >= 51) return 'Drizzle';
  if (code >= 45) return 'Fog';
  if (code >= 3) return 'Overcast';
  if (code >= 1) return 'Partly cloudy';
  return 'Clear';
}

function dublinDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

function formatLongDate(date: Date, isToday: boolean, isTomorrow: boolean): string {
  const fmt = new Intl.DateTimeFormat('en-IE', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Europe/Dublin',
  });
  const base = fmt.format(date);
  if (isToday) return `Today · ${base}`;
  if (isTomorrow) return `Tomorrow · ${base}`;
  return base;
}

function shortDay(date: Date): string {
  return new Intl.DateTimeFormat('en-IE', {
    weekday: 'short', timeZone: 'Europe/Dublin',
  }).format(date);
}

function dayNumber(date: Date): string {
  return new Intl.DateTimeFormat('en-IE', {
    day: 'numeric', timeZone: 'Europe/Dublin',
  }).format(date);
}

// Build 7 days starting from today
function build7Days(): { date: Date; key: string }[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 24 * 3600 * 1000);
    return { date: d, key: dublinDateKey(d) };
  });
}

// ─── Day cards ──────────────────────────────────────────────────────────────

const WeatherDayCard = ({
  day, fallbackWind, isToday,
}: {
  day: WeatherForecastDay | null;
  fallbackWind: WindData;
  isToday: boolean;
}) => {
  if (!day) {
    return (
      <div className="glass-card rounded-lg p-6 h-full flex items-center justify-center text-xs text-muted-foreground">
        No weather data
      </div>
    );
  }

  const dirRotation = (day.wind_direction_degrees + 180) % 360;

  return (
    <div className="px-5 py-4 space-y-2.5">
      <div className="relative flex items-center justify-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Weather
        </p>
        {isToday && (
          <span className="absolute right-0 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 items-center gap-2">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-3xl font-light tabular-nums text-foreground leading-none">
            {day.temp_max_c}°
          </span>
          <span className="text-sm text-muted-foreground">/ {day.temp_min_c}°</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">{weatherLabel(day.weather_code)}</p>
        <div className="flex justify-center">
          {getWeatherIcon(day.weather_code)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="flex flex-col items-center gap-0.5">
          <Thermometer size={14} className="text-muted-foreground" strokeWidth={1.5} />
          <span className="text-sm tabular-nums text-foreground">{day.feels_like_max_c}°</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Feels</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Wind size={14} className="text-muted-foreground" strokeWidth={1.5} />
          <span className="text-sm tabular-nums text-foreground inline-flex items-center gap-1">
            {day.wind_speed_kmh}
            <span
              className="inline-block text-primary"
              style={{ transform: `rotate(${dirRotation}deg)`, fontSize: 9, lineHeight: 1 }}
              aria-hidden
            >
              ↑
            </span>
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
            km/h · {day.wind_direction}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Droplets size={14} className="text-muted-foreground" strokeWidth={1.5} />
          <span className="text-sm tabular-nums text-foreground">{day.precipitation_probability}%</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Rain</span>
        </div>
      </div>

    </div>
  );
};

const TideDayCard = ({
  day, currentHeight, currentState, isToday, globalMinH, globalMaxH, sunrise, sunset,
}: {
  day: TideForecastDay | null;
  currentHeight: number;
  currentState: 'rising' | 'falling';
  isToday: boolean;
  globalMinH: number;
  globalMaxH: number;
  sunrise?: string;
  sunset?: string;
}) => {
  const { location } = useLocation();
  const events = day?.events ?? [];
  const predictionPoints = day?.points ?? [];
  const highs = events.filter(e => e.type === 'high');
  const lows = events.filter(e => e.type === 'low');

  const toDublinMinutes = (p: { time?: string; timestamp?: string }): number | null => {
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
  };

  // Build sparkline from live continuous tide prediction points.
  const sparkPoints = (() => {
    const samples = predictionPoints
      .map(point => {
        const x = toDublinMinutes(point);
        return x == null ? null : { x, y: point.height_m };
      })
      .filter((point): point is { x: number; y: number } => point !== null && point.x >= 0 && point.x <= 1440)
      .sort((a, b) => a.x - b.x);

    if (samples.length < 2) return null;

    // Use shared Y-scale across all 7 days for visual comparability
    const minH = globalMinH;
    const maxH = globalMaxH;
    const rangeH = maxH - minH || 1;

    const W = 320;
    const H = 40;
    const padY = 6;
    const usableH = H - padY * 2;

    const projectY = (yMeters: number) =>
      padY + (1 - (yMeters - minH) / rangeH) * usableH;
    const projectX = (xMin: number) => (xMin / 1440) * W;

    // Build polyline path (stroke)
    let d = `M${projectX(samples[0].x).toFixed(2)},${projectY(samples[0].y).toFixed(2)}`;
    for (let i = 1; i < samples.length; i++) {
      d += ` L${projectX(samples[i].x).toFixed(2)},${projectY(samples[i].y).toFixed(2)}`;
    }

    // Closed area path (for fill below curve)
    const baselineY = H - 2;
    const firstX = projectX(samples[0].x).toFixed(2);
    const lastX = projectX(samples[samples.length - 1].x).toFixed(2);
    const dArea = `${d} L${lastX},${baselineY} L${firstX},${baselineY} Z`;

    const markers = events
      .map(event => {
        const x = toDublinMinutes(event);
        return x == null ? null : { x: projectX(x), y: projectY(event.height_m), type: event.type };
      })
      .filter((marker): marker is { x: number; y: number; type: 'high' | 'low' } => marker !== null);

    // "Now" marker — only meaningful for today
    let now: { x: number; y: number } | null = null;
    if (isToday) {
      const nowDate = new Date();
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Dublin',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(nowDate);
      const hh = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
      const mm = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
      const nowMin = hh * 60 + mm;
      now = { x: projectX(nowMin), y: projectY(currentHeight) };
    }

    return { d, dArea, markers, W, H, now };
  })();

  return (
    <div className="px-5 py-4 space-y-2.5">
      <div className="flex items-center justify-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Tides · {location.name}
        </p>
      </div>

      {sparkPoints && (
        <div className="relative -mx-1">
          <svg
            viewBox={`0 0 ${sparkPoints.W} ${sparkPoints.H}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: 32, overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="tide-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[6, 12, 18].map(h => {
              const x = (h / 24) * sparkPoints.W;
              return (
                <line
                  key={h}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={sparkPoints.H - 2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="0.4"
                  strokeOpacity="0.18"
                  strokeDasharray="1.5 2.5"
                />
              );
            })}
            <line x1={0} y1={sparkPoints.H - 2} x2={sparkPoints.W} y2={sparkPoints.H - 2} stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.5" />
            <path d={sparkPoints.dArea} fill="url(#tide-fill)" stroke="none" />
            <path d={sparkPoints.d} fill="none" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.5" strokeLinecap="round" />
            {sparkPoints.markers.map((m, i) => (
              <circle
                key={i}
                cx={m.x}
                cy={m.y}
                r="2.5"
                fill={m.type === 'high' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)'}
              />
            ))}
            {sparkPoints.now && (
              <g>
                <line
                  x1={sparkPoints.now.x}
                  y1={0}
                  x2={sparkPoints.now.x}
                  y2={sparkPoints.H - 2}
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.75"
                  strokeOpacity="0.45"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={sparkPoints.now.x}
                  cy={sparkPoints.now.y}
                  r="3"
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth="1.25"
                />
                <text
                  x={Math.max(20, Math.min(sparkPoints.W - 20, sparkPoints.now.x))}
                  y={Math.max(6, sparkPoints.now.y - 9)}
                  textAnchor="middle"
                  fill="hsl(var(--primary))"
                  fontSize="7.5"
                  fontWeight="500"
                  style={{ letterSpacing: '0.05em', paintOrder: 'stroke' }}
                  stroke="hsl(var(--background))"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                >
                  {currentHeight}m {currentState === 'rising' ? '↑' : '↓'}
                </text>
              </g>
            )}
          </svg>
          <div className="flex justify-between text-[9px] text-muted-foreground/60 px-0.5 mt-0.5 tracking-wider">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tide data for this day
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground text-center">
              ▲ High Tide
            </p>
            {highs.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center">—</p>
            )}
            {highs.map((e, i) => (
              <div key={i} className="text-center">
                <p className="text-base font-light tabular-nums text-foreground leading-tight">{e.time}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{e.height_m}m</p>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground text-center">
              ▼ Low Tide
            </p>
            {lows.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center">—</p>
            )}
            {lows.map((e, i) => (
              <div key={i} className="text-center">
                <p className="text-base font-light tabular-nums text-foreground leading-tight">{e.time}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{e.height_m}m</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(sunrise || sunset) && (
        <div className="flex items-center justify-center gap-7 pt-2 text-[11px] font-medium tracking-[0.08em] text-foreground/75">
          {sunrise && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <span className="text-muted-foreground/70" aria-hidden>☀</span>
              {sunrise}
            </span>
          )}
          {sunset && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <span className="text-muted-foreground/70" aria-hidden>☽</span>
              {sunset}
            </span>
          )}
        </div>
      )}

      {location.saunaUrl && (
        <div className="pt-0.5">
          <button
            onClick={() => window.open(location.saunaUrl!, '_blank', 'noopener,noreferrer')}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 active:scale-[0.97] transition-all rounded-md px-4 py-2 tracking-wide"
          >
            Book {location.saunaName ?? 'Sauna'}
            <span className="text-primary/60">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main swiper ────────────────────────────────────────────────────────────

const ForecastSwiper = ({ wind, tideData, onDayChange }: Props) => {
  const days = useRef(build7Days()).current;
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // Notify parent whenever the active day changes
  useEffect(() => {
    onDayChange?.(currentDayIndex);
  }, [currentDayIndex, onDayChange]);

  const emblaOptions = { align: 'start' as const, containScroll: 'trimSnaps' as const, loop: false };
  const [weatherRef, weatherApi] = useEmblaCarousel(emblaOptions);
  const [tideRef, tideApi] = useEmblaCarousel(emblaOptions);

  const syncing = useRef(false);

  // When weather scrolls, mirror to tide and update index
  useEffect(() => {
    if (!weatherApi || !tideApi) return;
    const onSelect = () => {
      const idx = weatherApi.selectedScrollSnap();
      setCurrentDayIndex(idx);
      if (!syncing.current) {
        syncing.current = true;
        tideApi.scrollTo(idx);
        syncing.current = false;
      }
    };
    weatherApi.on('select', onSelect);
    return () => { weatherApi.off('select', onSelect); };
  }, [weatherApi, tideApi]);

  // When tide scrolls, mirror to weather
  useEffect(() => {
    if (!weatherApi || !tideApi) return;
    const onSelect = () => {
      const idx = tideApi.selectedScrollSnap();
      setCurrentDayIndex(idx);
      if (!syncing.current) {
        syncing.current = true;
        weatherApi.scrollTo(idx);
        syncing.current = false;
      }
    };
    tideApi.on('select', onSelect);
    return () => { tideApi.off('select', onSelect); };
  }, [weatherApi, tideApi]);

  const jumpTo = useCallback((idx: number) => {
    weatherApi?.scrollTo(idx);
    tideApi?.scrollTo(idx);
  }, [weatherApi, tideApi]);

  const todayKey = days[0].key;
  const currentDay = days[currentDayIndex];
  const isToday = currentDayIndex === 0;
  const isTomorrow = currentDayIndex === 1;

  const weatherForecast = wind.forecast ?? [];
  const tideForecast = tideData.forecast ?? [];

  // Map by date key for safe lookup
  const weatherByDate = new Map(weatherForecast.map(d => [d.date, d]));
  const tideByDate = new Map(tideForecast.map(d => [d.date, d]));

  // Shared Y-scale across the week so sparklines are visually comparable
  const allHeights = tideForecast.flatMap(d => [
    ...(d.points ?? []).map(p => p.height_m),
    ...(d.events ?? []).map(e => e.height_m),
  ]);
  const globalMinH = allHeights.length ? Math.min(...allHeights) : 0;
  const globalMaxH = allHeights.length ? Math.max(...allHeights) : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      {/* Static date label — does not move when swiping */}
      <div className="text-center space-y-2">
        <p className="text-base font-medium text-foreground tracking-wide">
          {formatLongDate(currentDay.date, isToday, isTomorrow)}
        </p>

        {/* Jony Ive–inspired swipe indicator: precision rail + breathing chevrons */}
        <div className="flex items-center justify-center gap-3 pt-0.5" aria-hidden>
          <motion.svg
            width="14" height="10" viewBox="0 0 14 10"
            className="text-muted-foreground/40"
            animate={{ x: [0, -2, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M9 1 L4 5 L9 9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>

          <div className="flex items-center gap-[3px]">
            {days.map((d, i) => {
              const active = i === currentDayIndex;
              return (
                <motion.span
                  key={`rail-${d.key}`}
                  className="block rounded-full bg-foreground"
                  animate={{
                    width: active ? 18 : 4,
                    opacity: active ? 0.9 : 0.18,
                  }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  style={{ height: 2 }}
                />
              );
            })}
          </div>

          <motion.svg
            width="14" height="10" viewBox="0 0 14 10"
            className="text-muted-foreground/40"
            animate={{ x: [0, 2, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M5 1 L10 5 L5 9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </div>

      </div>

      {/* Weather carousel */}
      <div className="overflow-hidden" ref={weatherRef}>
        <div className="flex">
          {days.map((d, i) => (
            <div key={`w-${d.key}`} className="min-w-0 shrink-0 grow-0 basis-full">
              <WeatherDayCard
                day={weatherByDate.get(d.key) ?? null}
                fallbackWind={wind}
                isToday={d.key === todayKey}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tide carousel */}
      <div className="overflow-hidden" ref={tideRef}>
        <div className="flex">
          {days.map((d) => {
            const weatherDay = weatherByDate.get(d.key) ?? null;

            return (
            <div key={`t-${d.key}`} className="min-w-0 shrink-0 grow-0 basis-full">
              <TideDayCard
                day={tideByDate.get(d.key) ?? null}
                currentHeight={tideData.current_height_m}
                currentState={tideData.state}
                isToday={d.key === todayKey}
                globalMinH={globalMinH}
                globalMaxH={globalMaxH}
                sunrise={weatherDay?.sunrise}
                sunset={weatherDay?.sunset}
              />
            </div>
            );
          })}
        </div>
      </div>

    </motion.div>
  );
};

export default ForecastSwiper;
