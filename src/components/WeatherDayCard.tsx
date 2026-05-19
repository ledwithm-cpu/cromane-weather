import {
  Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow,
  CloudLightning, CloudFog, CloudSun, Wind, Droplets, Thermometer,
} from 'lucide-react';
import { WindData, WeatherForecastDay } from '@/lib/mock-data';
import { useLocation } from '@/hooks/use-location';
import { shortDay, dayNumber } from '@/lib/forecast-days';
import WeatherShareRow from './WeatherShareRow';

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

export function weatherLabel(code: number): string {
  if (code >= 95) return 'Thunderstorm';
  if (code >= 71) return 'Snow';
  if (code >= 61) return 'Rain';
  if (code >= 51) return 'Drizzle';
  if (code >= 45) return 'Fog';
  if (code >= 3) return 'Overcast';
  if (code >= 1) return 'Partly cloudy';
  return 'Clear';
}

interface Props {
  day: WeatherForecastDay | null;
  fallbackWind: WindData;
  isToday: boolean;
  date: Date;
}

const WeatherDayCard = ({ day, isToday, date }: Props) => {
  const { location } = useLocation();
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

      <WeatherShareRow
        text={`${location.name} · ${isToday ? 'Today' : shortDay(date)} ${dayNumber(date)} · ${day.temp_max_c}°/${day.temp_min_c}° ${weatherLabel(day.weather_code)} · ${day.wind_speed_kmh}km/h ${day.wind_direction}`}
        url={`${typeof window !== 'undefined' ? window.location.origin : 'https://saunasinireland.com'}/${location.id}`}
      />
    </div>
  );
};

export default WeatherDayCard;
