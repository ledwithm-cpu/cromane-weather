import { m } from 'framer-motion';
import { Warning } from '@/types/forecast';
import { Badge } from '@/components/ui/badge';
import { CloudLightning } from 'lucide-react';
import { useLocation } from '@/features/location/hooks/use-location';

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
  const active = warnings.length > 0 || thunderActive;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-lg p-6 space-y-4 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Met Éireann Warnings
        </p>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              active ? 'bg-warning-orange animate-pulse' : 'bg-emerald-500'
            }`}
            style={
              active
                ? { boxShadow: '0 0 8px 3px hsla(25, 95%, 55%, 0.4)' }
                : undefined
            }
          />
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10">
        {!active && (
          <>
            <p className="text-sm font-normal text-foreground">No active warnings</p>
            <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
              No Met Éireann warnings in effect for {location.county}.
            </p>
          </>
        )}

        {thunderActive && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CloudLightning size={18} className="text-warning-orange" />
              <span className="text-sm font-normal text-foreground">Thunderstorm Activity Detected</span>
            </div>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Live weather data indicates thunderstorm or lightning activity in the {location.name} area. Take appropriate precautions.
            </p>
          </div>
        )}

        {warnings.map((w, i) => (
          <div key={i} className={`${thunderActive || i > 0 ? 'mt-4' : ''} space-y-2`}>
            <div className="flex items-center gap-2 flex-wrap">
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
            <p className="text-xs text-muted-foreground/70 leading-relaxed">{w.description}</p>
            <p className="text-xs text-muted-foreground/50">Valid until {w.valid_until}</p>
          </div>
        ))}
      </div>
    </m.div>
  );
};

export default WarningsCard;
