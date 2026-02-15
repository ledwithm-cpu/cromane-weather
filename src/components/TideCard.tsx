import { motion } from 'framer-motion';
// Waves icon removed – using text labels instead
import { TideData, WindData, Warning } from '@/lib/mock-data';

interface Props {
  tideData: TideData;
  wind: WindData;
  warnings: Warning[];
}

const TideCard = ({ tideData, wind, warnings }: Props) => {
  // Handle both new format ({events, current_height_m, state}) and legacy cached array format
  const tides = Array.isArray(tideData) ? tideData : tideData?.events ?? [];
  const current_height_m = Array.isArray(tideData) ? 0 : tideData?.current_height_m ?? 0;
  const state = Array.isArray(tideData) ? 'falling' as const : tideData?.state ?? 'falling';
  const next = tides[0];
  if (!next) return null;
  const calm = wind.speed_knots < 20 && !warnings.some(w => w.level === 'orange' || w.level === 'red');
  const stateArrow = state === 'rising' ? '↑' : '↓';
  const stateLabel = state === 'rising' ? 'Rising' : 'Falling';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Tides · Cromane Point
        </p>
        <div className="flex flex-col items-end gap-0.5 text-muted-foreground">
          {wind.water_temperature_c != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider">Water Temp</span>
              <span className="text-xs tabular-nums">{wind.water_temperature_c}°</span>
            </div>
          )}
          {wind.feels_like_c != null && wind.feels_like_c !== wind.temperature_c && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider">Feels Like</span>
              <span className="text-xs tabular-nums">{wind.feels_like_c}°</span>
            </div>
          )}
          {wind.sunrise && wind.sunset && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider">☀ {wind.sunrise}</span>
              <span className="text-[10px] uppercase tracking-wider">☽ {wind.sunset}</span>
            </div>
          )}
        </div>
      </div>

      {/* Current tide height */}
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-light tabular-nums text-foreground">
          {current_height_m}
        </span>
        <span className="text-lg text-muted-foreground">m</span>
        <span className="text-lg text-muted-foreground ml-1">{stateArrow}</span>
        <span className="text-sm text-muted-foreground">{stateLabel}</span>
      </div>

      {/* Next event */}
      <p className="text-xs text-muted-foreground">
        Next: {next.type === 'high' ? '▲' : '▼'} {next.type} tide at {next.time} ({next.height_m}m)
      </p>

      {/* Tide timeline */}
      <div className="relative pt-4 pb-2">
        <svg className="w-full h-10" viewBox="0 0 400 40" preserveAspectRatio="none">
          <path
            d={(() => {
              const points = tides.map((t, i) => {
                const x = (i / (tides.length - 1)) * 400;
                const y = t.type === 'high' ? 6 : 34;
                return { x, y };
              });
              let d = `M${points[0].x},${points[0].y}`;
              for (let i = 0; i < points.length - 1; i++) {
                const cx = (points[i].x + points[i + 1].x) / 2;
                d += ` C${cx},${points[i].y} ${cx},${points[i + 1].y} ${points[i + 1].x},${points[i + 1].y}`;
              }
              return d;
            })()}
            fill="none"
            stroke="hsl(var(--primary) / 0.3)"
            strokeWidth="1.5"
          />
        </svg>

        <div className="relative flex justify-between -mt-10 h-10">
          {tides.map((t, i) => (
            <div key={i} className={`flex flex-col items-center ${t.type === 'high' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`w-2 h-2 rounded-full ${t.type === 'high' ? 'bg-primary' : 'bg-muted-foreground/40'}`}
              />
              <span className="text-[10px] tabular-nums text-muted-foreground mt-0.5">
                {t.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {calm && (
        <div className="pt-1 space-y-1">
          <p className="text-[10px] text-muted-foreground/50 tracking-wider uppercase">
            Tide at {current_height_m}m · {stateLabel}
          </p>
          <a
            href="https://www.samhradhssauna.com/book-sauna"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-primary/70 hover:text-primary transition-colors"
          >
            Book Sauna at Samhradh's →
          </a>
        </div>
      )}
    </motion.div>
  );
};

export default TideCard;
