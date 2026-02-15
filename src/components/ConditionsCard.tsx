import { useState } from 'react';
import { motion } from 'framer-motion';
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

const ConditionsCard = ({ wind, warnings }: Props) => {
  const canBook = isBookingConditionsMet(wind, warnings);
  const [unit, setUnit] = useState<'kts' | 'kmh'>('kts');

  const displaySpeed = unit === 'kts'
    ? wind.speed_knots
    : Math.round(wind.speed_knots * 1.852);

  const unitLabel = unit === 'kts' ? 'kts' : 'km/h';

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

      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-light tabular-nums text-foreground">
            {displaySpeed}
          </span>
          <span className="text-lg text-muted-foreground">{unitLabel}</span>
          <span className="text-lg text-muted-foreground ml-1">
            {trendArrow(wind.trend)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-light text-foreground">{wind.temperature_c}°</p>
        </div>
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
