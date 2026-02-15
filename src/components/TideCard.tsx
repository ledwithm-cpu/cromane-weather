import { motion } from 'framer-motion';
import { TideEvent, WindData, Warning, isBookingConditionsMet } from '@/lib/mock-data';

interface Props {
  tides: TideEvent[];
  wind: WindData;
  warnings: Warning[];
}

const TideCard = ({ tides, wind, warnings }: Props) => {
  const next = tides[0];
  const calm = wind.speed_knots < 20 && !warnings.some(w => w.level === 'orange' || w.level === 'red');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-lg p-6 space-y-4"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
        Tides · Cromane Point
      </p>

      {/* Next tide highlight */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-light tabular-nums text-foreground">{next.time}</span>
        <span className="text-sm text-muted-foreground uppercase">{next.type} tide</span>
        <span className="text-sm text-muted-foreground">{next.height_m}m</span>
      </div>


      {/* Upcoming tides */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {tides.slice(1).map((t, i) => (
          <span key={i}>
            {t.type === 'high' ? '▲' : '▼'} {t.time} · {t.height_m}m
          </span>
        ))}
      </div>

      {calm && (
        <a
          href="https://www.samhradhssauna.com/book-sauna"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-primary/70 hover:text-primary transition-colors pt-1"
        >
          Book Sauna at Samhradh's →
        </a>
      )}
    </motion.div>
  );
};

export default TideCard;
