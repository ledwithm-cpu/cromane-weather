import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Navigation, Wind, Thermometer, Droplets } from 'lucide-react';
import { Location } from '@/lib/locations';
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

const MapLocationDrawer = ({ location, onClose }: Props) => {
  const isMobile = useIsMobile();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setWeather(null);
    supabase.functions
      .invoke('get-weather', {
        body: { lat: location.lat, lon: location.lon, metStation: location.metEireannStation },
      })
      .then(({ data }) => {
        if (data) setWeather(data);
      })
      .finally(() => setLoading(false));
  }, [location.id]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`;
  const condition = weather ? getConditionLabel(weather.weather_code, weather.speed_knots) : null;

  // Mobile = bottom sheet, Desktop = side panel
  const panelVariants = isMobile
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      }
    : {
        initial: { x: '100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
      };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 z-[1001] bg-background/20 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <motion.div
        {...panelVariants}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`absolute z-[1002] glass-card shadow-2xl ${
          isMobile
            ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[75vh] overflow-y-auto'
            : 'top-4 right-4 bottom-4 w-[380px] rounded-3xl overflow-y-auto'
        }`}
      >
        {/* Handle bar (mobile) */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-light tracking-tight text-foreground">
                {location.name}
              </h2>
              <p className="text-xs text-muted-foreground tracking-[0.12em] uppercase mt-1">
                {location.subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Weather Card */}
          <div className="rounded-2xl bg-muted/30 border border-border/30 p-5 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Current Conditions
            </p>

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
                  <span className="text-4xl font-light tabular-nums text-foreground">
                    {weather.temperature_c}°
                  </span>
                </div>

                {condition && (
                  <p className={`text-sm font-medium ${condition.color}`}>
                    {condition.label}
                  </p>
                )}

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

          {/* Sauna Info */}
          {location.saunaUrl && (
            <button
              onClick={() => window.open(location.saunaUrl, '_blank', 'noopener,noreferrer')}
              className="flex items-center justify-between w-full rounded-2xl bg-primary/10 hover:bg-primary/15 border border-primary/20 p-5 group active:scale-[0.98] transition-all text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{location.saunaName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Book a session →</p>
              </div>
              <span className="text-2xl group-hover:scale-110 transition-transform">🔥</span>
            </button>
          )}

          {/* Directions */}
          <button
            onClick={() => window.open(directionsUrl, '_blank', 'noopener,noreferrer')}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-foreground text-background py-3.5 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Navigation className="w-4 h-4" />
            Open in Google Maps
          </button>

          {/* Coordinates */}
          <p className="text-center text-[10px] text-muted-foreground/50 tracking-wider tabular-nums">
            {location.lat.toFixed(4)}°N · {Math.abs(location.lon).toFixed(4)}°W
          </p>
        </div>
      </motion.div>
    </>
  );
};

export default MapLocationDrawer;
