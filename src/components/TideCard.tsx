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
              // Build timeline starting from "now" on the left
              const now = new Date();
              const nowMs = now.getTime();

              // Parse tide event times into timestamps for today/tomorrow
              const tideTimestamps = tides.map((t) => {
                const [h, m] = t.time.split(':').map(Number);
                const d = new Date(now);
                d.setHours(h, m, 0, 0);
                // If event is more than 2h in the past, assume it's tomorrow
                if (d.getTime() < nowMs - 2 * 60 * 60 * 1000) {
                  d.setDate(d.getDate() + 1);
                }
                return { ...t, ts: d.getTime() };
              });

              // Sort by timestamp
              tideTimestamps.sort((a, b) => a.ts - b.ts);

              // Timeline range: now to last event
              const startMs = nowMs;
              const endMs = tideTimestamps[tideTimestamps.length - 1].ts;
              const rangeMs = endMs - startMs || 1;

              // Infer current state: "now" point y based on tide state
              const nowY = state === 'rising'
                ? 28 // mid-low, heading up
                : 12; // mid-high, heading down

              const points = [
                { x: 0, y: nowY },
                ...tideTimestamps.map((t) => ({
                  x: ((t.ts - startMs) / rangeMs) * 400,
                  y: t.type === 'high' ? 6 : 34,
                })),
              ];

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
          {/* "Now" marker */}
          <circle cx="0" cy={state === 'rising' ? 28 : 12} r="3" fill="hsl(var(--primary))" />
        </svg>

        <div className="relative h-4 mt-1">
          {(() => {
            const now = new Date();
            const nowMs = now.getTime();
            const tideTimestamps = tides.map((t) => {
              const [h, m] = t.time.split(':').map(Number);
              const d = new Date(now);
              d.setHours(h, m, 0, 0);
              if (d.getTime() < nowMs - 2 * 60 * 60 * 1000) {
                d.setDate(d.getDate() + 1);
              }
              return { ...t, ts: d.getTime() };
            });
            tideTimestamps.sort((a, b) => a.ts - b.ts);
            const startMs = nowMs;
            const endMs = tideTimestamps[tideTimestamps.length - 1].ts;
            const rangeMs = endMs - startMs || 1;

            return tideTimestamps.map((t, i) => {
              const leftPct = ((t.ts - startMs) / rangeMs) * 100;
              return (
                <span
                  key={i}
                  className="absolute text-[10px] tabular-nums text-muted-foreground"
                  style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
                >
                  {t.type === 'high' ? '▲' : '▼'} {t.time}
                </span>
              );
            });
          })()}
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
