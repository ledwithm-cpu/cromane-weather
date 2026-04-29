import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Navigation, Wind, Thermometer, Droplets, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Location } from '@/lib/locations';
import { openExternal } from '@/lib/open-external';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface WeatherSnapshot {
  temperature_c: number;
  feels_like_c: number;
  speed_kmh: number;
  speed_knots: number;
  direction_deg: number;
  weather_code: number;
  water_temperature_c?: number;
}

interface TideEvent {
  time: string;
  type: 'high' | 'low';
  height_m: number;
}

interface TideData {
  events: TideEvent[];
  current_height_m: number;
  state: 'rising' | 'falling';
}

interface Props {
  location: Location;
  onClose: () => void;
}

function getConditionLabel(code: number, windKnots: number): { label: string; color: string } {
  if (windKnots > 25) return { label: 'Rough conditions', color: 'text-warning-orange' };
  if (windKnots > 15) return { label: 'Moderate winds', color: 'text-accent' };
  if (code >= 61) return { label: 'Rainy — bring layers', color: 'text-muted-foreground' };
  if (code >= 45) return { label: 'Overcast but calm', color: 'text-muted-foreground' };
  return { label: 'Ideal for a dip ☀', color: 'text-primary' };
}

function getWeatherIcon(code: number): string {
  if (code <= 1) return '☀️';
  if (code <= 3) return '⛅';
  if (code >= 95) return '⛈️';
  if (code >= 61) return '🌧️';
  if (code >= 45) return '☁️';
  return '🌤️';
}

function MiniTideTimeline({ tides, currentHeight }: { tides: TideEvent[]; currentHeight: number }) {
  const now = new Date();
  const nowMs = now.getTime();

  const tideTimestamps = tides.map((t) => {
    const [h, m] = t.time.split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d.getTime() < nowMs - 2 * 60 * 60 * 1000) d.setDate(d.getDate() + 1);
    return { ...t, ts: d.getTime() };
  });
  tideTimestamps.sort((a, b) => a.ts - b.ts);

  if (tideTimestamps.length === 0) return null;

  const startMs = nowMs;
  const endMs = tideTimestamps[tideTimestamps.length - 1].ts;
  const rangeMs = endMs - startMs || 1;

  const heights = tideTimestamps.map((t) => t.height_m);
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);
  const rangeH = maxH - minH || 1;
  const clampedHeight = Math.max(minH, Math.min(maxH, currentHeight));
  const nowY = 34 - ((clampedHeight - minH) / rangeH) * 28;

  const eventPoints = tideTimestamps.map((t) => ({
    x: ((t.ts - startMs) / rangeMs) * 300,
    y: t.type === 'high' ? 6 : 34,
    time: t.time,
    type: t.type,
  }));

  const allPoints = [{ x: 0, y: nowY }, ...eventPoints];
  let pathD = `M${allPoints[0].x},${allPoints[0].y}`;
  for (let i = 0; i < allPoints.length - 1; i++) {
    const cx = (allPoints[i].x + allPoints[i + 1].x) / 2;
    pathD += ` C${cx},${allPoints[i].y} ${cx},${allPoints[i + 1].y} ${allPoints[i + 1].x},${allPoints[i + 1].y}`;
  }

  return (
    <svg className="w-full" viewBox="0 0 300 50" preserveAspectRatio="none" style={{ height: 44, overflow: 'visible' }}>
      <path d={pathD} fill="none" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" transform="translate(0, 8)" />
      <circle cx={0} cy={nowY + 8} r="3" fill="hsl(var(--primary))" />
      {eventPoints.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y + 8} r="2.5" fill={pt.type === 'high' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'} />
          <text x={pt.x} y={pt.type === 'high' ? pt.y + 2 : pt.y + 20} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" fontFamily="inherit">
            {pt.time}
          </text>
        </g>
      ))}
    </svg>
  );
}

const MapLocationDrawer = ({ location, onClose }: Props) => {
  const isMobile = useIsMobile();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tideLoading, setTideLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setWeather(null);
    setTideData(null);
    setTideLoading(true);

    supabase.functions
      .invoke('get-weather', {
        body: { lat: location.lat, lon: location.lon, metStation: location.metEireannStation },
      })
      .then(({ data }) => { if (data) setWeather(data); })
      .finally(() => setLoading(false));

    supabase.functions
      .invoke('get-tides', {
        body: { station: location.tideStation, offsetMinutes: location.tideOffsetMinutes },
      })
      .then(({ data }) => { if (data) setTideData(data); })
      .finally(() => setTideLoading(false));
  }, [location.id]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`;
  const condition = weather ? getConditionLabel(weather.weather_code, weather.speed_knots) : null;

  const tides = tideData ? (Array.isArray(tideData) ? tideData : tideData.events ?? []) : [];
  const currentHeight = tideData && !Array.isArray(tideData) ? tideData.current_height_m ?? 0 : 0;
  const tideState = tideData && !Array.isArray(tideData) ? tideData.state ?? 'falling' : 'falling';
  const nextTide = tides[0];

  const panelVariants = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '100%', opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0 } };

  return (
    <>

      <motion.div
        {...panelVariants}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`${
          isMobile
            ? 'fixed inset-0 z-[2000] h-dvh w-screen overflow-y-auto bg-background'
            : 'absolute top-4 right-4 bottom-4 w-[380px] z-[1002] rounded-3xl glass-card shadow-2xl overflow-y-auto'
        }`}
      >
        {isMobile && (
          <div className="sticky top-0 z-10 bg-background border-b border-border/30 px-4 py-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to map
            </button>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-light tracking-tight text-foreground">{location.name}</h2>
              {location.saunaName && (
                <p className="text-sm text-primary font-medium mt-0.5">{location.saunaName}</p>
              )}
              <p className="text-xs text-muted-foreground tracking-[0.12em] uppercase mt-1">{location.subtitle}</p>
            </div>
            {!isMobile && (
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Weather Card */}
          <div className="rounded-2xl bg-muted/30 border border-border/30 p-5 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Current Conditions</p>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="h-4 w-48 rounded-lg" />
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-20 rounded-xl" />
                  <Skeleton className="h-12 w-20 rounded-xl" />
                  <Skeleton className="h-12 w-20 rounded-xl" />
                </div>
              </div>
            ) : weather ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl">{getWeatherIcon(weather.weather_code)}</span>
                  <span className="text-4xl font-light tabular-nums text-foreground">{weather.temperature_c}°</span>
                </div>
                {condition && <p className={`text-sm font-medium ${condition.color}`}>{condition.label}</p>}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-background/50 p-3">
                    <Wind className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-light tabular-nums">{weather.speed_kmh}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">km/h</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-background/50 p-3">
                    <Thermometer className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-light tabular-nums">{weather.feels_like_c}°</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Feels</span>
                  </div>
                  {weather.water_temperature_c != null && (
                    <div className="flex flex-col items-center gap-1 rounded-xl bg-background/50 p-3">
                      <Droplets className="w-4 h-4 text-primary" />
                      <span className="text-sm font-light tabular-nums">{weather.water_temperature_c}°</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Water</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Weather unavailable</p>
            )}
          </div>

          {/* Tide Card */}
          <div className="rounded-2xl bg-muted/30 border border-border/30 p-5 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Tides</p>
            {tideLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-28 rounded-xl" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : tides.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light tabular-nums text-foreground">{currentHeight}</span>
                  <span className="text-base text-muted-foreground">m</span>
                  <span className="text-base text-muted-foreground ml-1">{tideState === 'rising' ? '↑' : '↓'}</span>
                  <span className="text-xs text-muted-foreground">{tideState === 'rising' ? 'Rising' : 'Falling'}</span>
                </div>
                {nextTide && (
                  <p className="text-xs text-muted-foreground">
                    Next: {nextTide.type === 'high' ? '▲' : '▼'} {nextTide.type} tide at {nextTide.time} ({nextTide.height_m}m)
                  </p>
                )}
                <MiniTideTimeline tides={tides} currentHeight={currentHeight} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tide data unavailable</p>
            )}
          </div>

          {/* Sauna Info */}
          {location.saunaUrl && (
            <button
              onClick={() => openExternal(location.saunaUrl!)}
              className="flex items-center justify-between w-full rounded-2xl bg-primary/10 hover:bg-primary/15 border border-primary/20 p-5 group active:scale-[0.98] transition-all text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{location.saunaName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Book a session →</p>
              </div>
            </button>
          )}

          {/* Directions */}
          <button
            onClick={() => openExternal(directionsUrl)}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-foreground text-background py-3.5 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Navigation className="w-4 h-4" />
            Open in Google Maps
          </button>

          {/* View full location page */}
          <Link
            to={`/${location.id}`}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-muted/40 border border-border/30 py-3.5 text-sm font-medium text-foreground hover:bg-muted/60 active:scale-[0.98] transition-all"
          >
            View full details →
          </Link>

          <p className="text-center text-[10px] text-muted-foreground/50 tracking-wider tabular-nums">
            {location.lat.toFixed(4)}°N · {Math.abs(location.lon).toFixed(4)}°W
          </p>
        </div>
      </motion.div>
    </>
  );
};

export default MapLocationDrawer;
