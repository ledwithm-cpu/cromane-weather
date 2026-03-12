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

          // Interpolate nowY from current_height_m relative to tide range
          const heights = tideTimestamps.map(t => t.height_m);
          const minH = Math.min(...heights);
          const maxH = Math.max(...heights);
          const rangeH = maxH - minH || 1;
          const clampedHeight = Math.max(minH, Math.min(maxH, current_height_m));
          // y=6 is high tide (top), y=34 is low tide (bottom)
          const nowY = 34 - ((clampedHeight - minH) / rangeH) * 28;

          const eventPoints = tideTimestamps.map((t) => ({
            x: ((t.ts - startMs) / rangeMs) * 400,
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

          // SVG viewBox height expanded to fit labels above/below the wave
          const svgHeight = 56;
          const waveOffsetY = 14; // shift wave down to leave room for high-tide labels on top

          return (
            <svg className="w-full" viewBox={`0 0 400 ${svgHeight}`} preserveAspectRatio="none" style={{ height: 56, overflow: 'visible' }}>
              {/* Wave path - shifted down */}
              <path
                d={pathD}
                fill="none"
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="1.5"
                transform={`translate(0, ${waveOffsetY})`}
              />
              {/* Now marker */}
              <circle cx={0} cy={nowY + waveOffsetY} r="3" fill="hsl(var(--primary))" />
              {/* Event dots and labels on the curve */}
              {eventPoints.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y + waveOffsetY}
                    r="3"
                    fill={pt.type === 'high' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'}
                  />
                  <text
                    x={pt.x}
                    y={pt.type === 'high' ? pt.y + waveOffsetY - 7 : pt.y + waveOffsetY + 13}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize="9"
                    fontFamily="inherit"
                  >
                    {pt.time}
                  </text>
                </g>
              ))}
            </svg>
          );
        })()}
      </div>

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
    </motion.div>
  );
};

export default TideCard;
