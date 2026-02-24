import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, CloudFog, CloudSun } from 'lucide-react';
import { WindData, isBookingConditionsMet, Warning } from '@/lib/mock-data';

interface Props {
  wind: WindData;
  warnings: Warning[];
}

const trendArrow = (trend: string) => {
  if (trend === 'rising') return '↑';
  if (trend === 'falling') return '↓';
  return '→';
};

const WindCompass = ({ degrees }: { degrees: number }) => {
  const size = 96;
  const center = size / 2;
  const radius = 32;
  const tickLen = 5;
  const cardinals = ['N', 'E', 'S', 'W'];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />

        {/* Tick marks */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 - 90) * (Math.PI / 180);
          const isMajor = i % 2 === 0;
          const len = isMajor ? tickLen + 1 : tickLen - 1;
          const x1 = center + (radius - len) * Math.cos(angle);
          const y1 = center + (radius - len) * Math.sin(angle);
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth={isMajor ? 1.2 : 0.6} strokeOpacity={isMajor ? 0.7 : 0.4} />;
        })}

        {/* Cardinal labels */}
        {cardinals.map((label, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const x = center + (radius + 9) * Math.cos(angle);
          const y = center + (radius + 9) * Math.sin(angle);
          return (
            <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground" fontSize="9" fontWeight={label === 'N' ? 500 : 300}>
              {label}
            </text>
          );
        })}

        {/* Wind arrow */}
        <g transform={`rotate(${(degrees + 180) % 360}, ${center}, ${center})`}>
          <line x1={center} y1={center + 10} x2={center} y2={center - radius + 8} stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" />
          <polygon
            points={`${center},${center - radius + 5} ${center - 4},${center - radius + 13} ${center + 4},${center - radius + 13}`}
            fill="hsl(var(--primary))"
          />
        </g>

        {/* Center dot */}
        <circle cx={center} cy={center} r="2.5" fill="hsl(var(--muted-foreground))" opacity="0.5" />
      </svg>
    </div>
  );
};

const getWeatherIcon = (code: number, cloudCover: number) => {
  const props = { size: 20, className: 'text-muted-foreground' };
  if (code >= 95) return <CloudLightning {...props} className="text-accent" />;
  if (code >= 71) return <CloudSnow {...props} className="text-primary/60" />;
  if (code >= 61) return <CloudRain {...props} className="text-primary" />;
  if (code >= 51) return <CloudDrizzle {...props} className="text-primary/70" />;
  if (code >= 45) return <CloudFog {...props} />;
  if (code >= 3 || cloudCover > 70) return <Cloud {...props} />;
  if (cloudCover > 30) return <CloudSun {...props} className="text-accent" />;
  return <Sun {...props} className="text-accent" />;
};

const ConditionsCard = ({ wind, warnings }: Props) => {
  const canBook = isBookingConditionsMet(wind, warnings);
  const [unit, setUnit] = useState<'kts' | 'kmh'>('kmh');

  const displaySpeed = unit === 'kts'
    ? wind.speed_knots
    : Math.round(wind.speed_knots * 1.852);

  const unitLabel = unit === 'kts' ? 'Knots' : 'km/h';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Current Conditions
        </p>
        <button
          onClick={() => setUnit(u => u === 'kts' ? 'kmh' : 'kts')}
          className="text-[10px] uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded border border-border/50"
        >
          {unit === 'kts' ? 'km/h' : 'kts'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-light tabular-nums text-foreground">
            {displaySpeed}
          </span>
          <span className="text-lg text-muted-foreground">{unitLabel}</span>
          <span className="text-lg text-muted-foreground ml-1">
            {trendArrow(wind.trend)}
          </span>
        </div>
        <WindCompass degrees={wind.direction_degrees} />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>F{wind.speed_beaufort} · {wind.beaufort_label}</span>
        <span className="opacity-40">|</span>
        <span>{wind.direction} ({wind.direction_degrees}°)</span>
      </div>

      {canBook && (
        <a
          href="https://www.dooks.com/contact/"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-primary/70 hover:text-primary transition-colors pt-1"
        >
          Book Golf at Dooks →
        </a>
      )}
    </motion.div>
  );
};

export default ConditionsCard;
