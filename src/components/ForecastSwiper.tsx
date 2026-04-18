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
    <div className="glass-card rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Weather
        </p>
        {isToday && (
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-light tabular-nums text-foreground">
            {day.temp_max_c}°
          </span>
          <span className="text-lg text-muted-foreground">/ {day.temp_min_c}°</span>
        </div>
        <div className="flex items-center gap-2">
          {getWeatherIcon(day.weather_code)}
        </div>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">{weatherLabel(day.weather_code)}</p>

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/40">
        <div className="flex flex-col items-center gap-1">
          <Thermometer size={16} className="text-muted-foreground" strokeWidth={1.5} />
          <span className="text-base tabular-nums text-foreground">{day.feels_like_max_c}°</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Feels</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="relative" style={{ width: 16, height: 16 }}>
            <Wind size={16} className="text-muted-foreground" strokeWidth={1.5} />
          </div>
          <span className="text-base tabular-nums text-foreground inline-flex items-center gap-1">
            {day.wind_speed_kmh}
            <span
              className="inline-block text-primary"
              style={{ transform: `rotate(${dirRotation}deg)`, fontSize: 10, lineHeight: 1 }}
              aria-hidden
            >
              ↑
            </span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            km/h · {day.wind_direction}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Droplets size={16} className="text-muted-foreground" strokeWidth={1.5} />
          <span className="text-base tabular-nums text-foreground">{day.precipitation_probability}%</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Rain</span>
        </div>
      </div>

      {(day.sunrise || day.sunset) && (
        <div className="flex items-center justify-around pt-2 text-xs text-muted-foreground border-t border-border/40">
          {day.sunrise && <span>☀ {day.sunrise}</span>}
          {day.sunset && <span>☽ {day.sunset}</span>}
        </div>
      )}
    </div>
  );
};

const TIDE_HALF_PERIOD_MIN = 372; // ~6h12m between consecutive high/low

const TideDayCard = ({
  day, currentHeight, currentState, isToday, globalMinH, globalMaxH,
}: {
  day: TideForecastDay | null;
  currentHeight: number;
  currentState: 'rising' | 'falling';
  isToday: boolean;
  globalMinH: number;
  globalMaxH: number;
}) => {
  const { location } = useLocation();
  const events = day?.events ?? [];
  const highs = events.filter(e => e.type === 'high');
  const lows = events.filter(e => e.type === 'low');

  // Build sparkline using a true tidal sinusoid between events
  const sparkPoints = (() => {
    if (events.length === 0) return null;

    const pts = events
      .map(e => {
        const ts = e.timestamp ? new Date(e.timestamp) : null;
        const minutes = ts
          ? ts.getUTCHours() * 60 + ts.getUTCMinutes()
          : (() => {
              const [h, m] = e.time.split(':').map(Number);
              return h * 60 + m;
            })();
        return { x: minutes, y: e.height_m, type: e.type as 'high' | 'low' };
      })
      .sort((a, b) => a.x - b.x);

    // Estimate typical high/low height for this day (used for edge extrapolation)
    const highHeights = pts.filter(p => p.type === 'high').map(p => p.y);
    const lowHeights = pts.filter(p => p.type === 'low').map(p => p.y);
    const avgHigh = highHeights.length
      ? highHeights.reduce((a, b) => a + b, 0) / highHeights.length
      : Math.max(...pts.map(p => p.y));
    const avgLow = lowHeights.length
      ? lowHeights.reduce((a, b) => a + b, 0) / lowHeights.length
      : Math.min(...pts.map(p => p.y));

    // Extrapolate a virtual extremum before first event and after last event
    const first = pts[0];
    const last = pts[pts.length - 1];
    const beforeFirst = {
      x: first.x - TIDE_HALF_PERIOD_MIN,
      y: first.type === 'high' ? avgLow : avgHigh,
      type: (first.type === 'high' ? 'low' : 'high') as 'high' | 'low',
    };
    const afterLast = {
      x: last.x + TIDE_HALF_PERIOD_MIN,
      y: last.type === 'high' ? avgLow : avgHigh,
      type: (last.type === 'high' ? 'low' : 'high') as 'high' | 'low',
    };

    const extrema = [beforeFirst, ...pts, afterLast];

    // Sample sinusoidally between consecutive extrema, clipped to [0, 1440]
    const SAMPLES_PER_SEG = 16;
    const samples: { x: number; y: number }[] = [];
    for (let i = 0; i < extrema.length - 1; i++) {
      const a = extrema[i];
      const b = extrema[i + 1];
      const mid = (a.y + b.y) / 2;
      const amp = (a.y - b.y) / 2; // positive if a high → b low
      for (let s = 0; s <= SAMPLES_PER_SEG; s++) {
        const t = s / SAMPLES_PER_SEG;
        const x = a.x + (b.x - a.x) * t;
        const y = mid + amp * Math.cos(Math.PI * t);
        if (x >= 0 && x <= 1440) samples.push({ x, y });
      }
    }

    if (samples.length === 0) return null;

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

    // Build polyline path
    let d = `M${projectX(samples[0].x).toFixed(2)},${projectY(samples[0].y).toFixed(2)}`;
    for (let i = 1; i < samples.length; i++) {
      d += ` L${projectX(samples[i].x).toFixed(2)},${projectY(samples[i].y).toFixed(2)}`;
    }

    const markers = pts.map(p => ({
      x: projectX(p.x),
      y: projectY(p.y),
      type: p.type,
    }));

    return { d, markers, W, H };
  })();

  return (
    <div className="glass-card rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Tides · {location.name}
        </p>
        {isToday && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {currentHeight}m {currentState === 'rising' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {sparkPoints && (
        <div className="relative -mx-1">
          <svg
            viewBox={`0 0 ${sparkPoints.W} ${sparkPoints.H}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: 40, overflow: 'visible' }}
          >
            {/* Subtle baseline */}
            <line x1={0} y1={sparkPoints.H - 2} x2={sparkPoints.W} y2={sparkPoints.H - 2} stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.5" />
            {/* Wave */}
            <path d={sparkPoints.d} fill="none" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.5" strokeLinecap="round" />
            {/* Event dots */}
            {sparkPoints.markers.map((m, i) => (
              <circle
                key={i}
                cx={m.x}
                cy={m.y}
                r="2.5"
                fill={m.type === 'high' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)'}
              />
            ))}
          </svg>
          {/* Time scale */}
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
        <p className="text-sm text-muted-foreground text-center py-6">
          No tide data for this day
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">
              ▲ High Tide
            </p>
            {highs.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center">—</p>
            )}
            {highs.map((e, i) => (
              <div key={i} className="text-center">
                <p className="text-xl font-light tabular-nums text-foreground">{e.time}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{e.height_m}m</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">
              ▼ Low Tide
            </p>
            {lows.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center">—</p>
            )}
            {lows.map((e, i) => (
              <div key={i} className="text-center">
                <p className="text-xl font-light tabular-nums text-foreground">{e.time}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{e.height_m}m</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {location.saunaUrl && isToday && (
        <div className="pt-1">
          <button
            onClick={() => window.open(location.saunaUrl!, '_blank', 'noopener,noreferrer')}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 active:scale-[0.97] transition-all rounded-md px-4 py-2.5 tracking-wide"
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
  const allHeights = tideForecast.flatMap(d => (d.events ?? []).map(e => e.height_m));
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

        <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/50 font-light">
          Swipe · Day {currentDayIndex + 1} of 7
        </p>
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
          {days.map((d) => (
            <div key={`t-${d.key}`} className="min-w-0 shrink-0 grow-0 basis-full">
              <TideDayCard
                day={tideByDate.get(d.key) ?? null}
                currentHeight={tideData.current_height_m}
                currentState={tideData.state}
                isToday={d.key === todayKey}
                globalMinH={globalMinH}
                globalMaxH={globalMaxH}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Day pagination dots / quick nav */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {days.map((d, i) => {
          const active = i === currentDayIndex;
          const today = i === 0;
          return (
            <button
              key={d.key}
              onClick={() => jumpTo(i)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-all ${
                active ? 'bg-primary/15 scale-105' : 'hover:bg-card/60 opacity-60'
              }`}
              aria-label={`Go to ${shortDay(d.date)} ${dayNumber(d.date)}`}
            >
              <span className={`text-[9px] uppercase tracking-wider ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {today ? 'Today' : shortDay(d.date)}
              </span>
              <span className={`text-xs tabular-nums ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {dayNumber(d.date)}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ForecastSwiper;
