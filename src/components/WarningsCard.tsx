import { motion } from 'framer-motion';
import { Warning } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { CloudLightning } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';

interface Props {
  warnings: Warning[];
  weatherCode?: number;
}

const levelColor: Record<string, string> = {
  yellow: 'bg-warning-yellow text-black',
  orange: 'bg-warning-orange text-black',
  red: 'bg-warning-red text-destructive-foreground',
};

const WarningsCard = ({ warnings, weatherCode }: Props) => {
  const { location } = useLocation();
  const thunderActive = (weatherCode ?? 0) >= 95;

  if (warnings.length === 0 && !thunderActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-lg p-6 text-center"
      >
        <div className="flex items-center justify-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Met Éireann Warnings
          </p>
        </div>
        <p className="text-sm text-muted-foreground">No active warnings for {location.county}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-lg p-6 space-y-4 text-center"
    >
      <div className="flex items-center justify-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Met Éireann Warnings
        </p>
      </div>

      {thunderActive && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <CloudLightning size={14} className="text-accent" />
            <span className="text-sm font-normal text-foreground">Thunderstorm Activity Detected</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Live weather data indicates thunderstorm or lightning activity in the {location.name} area. Take appropriate precautions.
          </p>
        </div>
      )}

      {warnings.map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge className={`${levelColor[w.level]} border-0 text-xs uppercase font-medium`}>
              {w.elevated ? '⚡ ' : ''}{w.level}
            </Badge>
            <span className="text-sm font-normal text-foreground">{w.headline}</span>
          </div>
          {w.elevated && (
            <p className="text-xs text-warning-orange font-medium">
              ⚡ Elevated priority — thunderstorm risk near {location.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">{w.description}</p>
          <p className="text-xs text-muted-foreground/60">Valid until {w.valid_until}</p>
        </div>
      ))}
    </motion.div>
  );
};

export default WarningsCard;
