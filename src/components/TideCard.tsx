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


      {/* Tide timeline */}
      <div className="relative pt-4 pb-2">
        {/* Horizontal line */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-border/60" />

        {/* Sine wave hint */}
        <svg className="w-full h-10" viewBox="0 0 400 40" preserveAspectRatio="none">
          <path
            d={(() => {
              const points = tides.map((t, i) => {
                const x = (i / (tides.length - 1)) * 400;
                const y = t.type === 'high' ? 6 : 34;
                return { x, y };
              });
              // Build smooth curve through points
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

        {/* Markers */}
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
