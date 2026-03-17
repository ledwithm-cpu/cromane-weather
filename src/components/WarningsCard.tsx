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
  yellow: 'bg-warning-yellow text-warning-yellow/10',
  orange: 'bg-warning-orange text-warning-orange/10',
  red: 'bg-warning-red text-destructive-foreground',
};

const WarningsCard = ({ warnings, weatherCode }: Props) => {
  const thunderActive = (weatherCode ?? 0) >= 95;

  if (warnings.length === 0 && !thunderActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-lg p-6"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Met Éireann Warnings
          </p>
          <div
            className="w-2.5 h-2.5 rounded-full transition-all duration-500 bg-emerald-500"
          />
        </div>
        <p className="text-sm text-muted-foreground">No active warnings for Kerry</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Met Éireann Warnings
        </p>
        <div
          className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
            warnings.some(w => w.level === 'red') ? 'bg-warning-red animate-pulse' :
            warnings.some(w => w.level === 'orange') ? 'bg-warning-orange animate-pulse' :
            warnings.some(w => w.level === 'yellow') ? 'bg-warning-yellow animate-pulse' :
            thunderActive ? 'bg-warning-orange animate-pulse' :
            'bg-emerald-500'
          }`}
          style={
            warnings.some(w => w.level === 'red')
              ? { boxShadow: '0 0 12px 5px hsla(0, 80%, 50%, 0.7)' }
              : warnings.some(w => w.level === 'orange') || thunderActive
              ? { boxShadow: '0 0 8px 3px hsla(25, 95%, 55%, 0.4)' }
              : warnings.some(w => w.level === 'yellow')
              ? { boxShadow: '0 0 8px 3px hsla(45, 95%, 55%, 0.3)' }
              : undefined
          }
        />
      </div>

      {thunderActive && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CloudLightning size={14} className="text-accent" />
            <span className="text-sm font-normal text-foreground">Thunderstorm Activity Detected</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Live weather data indicates thunderstorm or lightning activity in the Cromane area. Take appropriate precautions.
          </p>
        </div>
      )}

      {warnings.map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={`${levelColor[w.level]} border-0 text-xs uppercase font-medium`}>
              {w.elevated ? '⚡ ' : ''}{w.level}
            </Badge>
            <span className="text-sm font-normal text-foreground">{w.headline}</span>
          </div>
          {w.elevated && (
            <p className="text-xs text-warning-orange font-medium">
              ⚡ Elevated priority — thunderstorm risk near Cromane Bay
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
