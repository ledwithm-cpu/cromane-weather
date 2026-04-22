import { motion } from 'framer-motion';
import type { PollenCurrent } from '@/hooks/use-pollen';

interface Props {
  data: PollenCurrent | undefined;
}

type PollenStatus = {
  label: 'Low' | 'Moderate' | 'High' | 'Very High' | 'No data';
  className: string;
  dotClassName: string;
};

function getPollenStatus(value: number | null | undefined): PollenStatus {
  if (value === null || value === undefined) {
    return {
      label: 'No data',
      className: 'text-muted-foreground',
      dotClassName: 'bg-muted-foreground/40',
    };
  }
  if (value <= 10) {
    return {
      label: 'Low',
      className: 'text-emerald-500',
      dotClassName: 'bg-emerald-500/70',
    };
  }
  if (value <= 50) {
    return {
      label: 'Moderate',
      className: 'text-warning-yellow',
      dotClassName: 'bg-warning-yellow',
    };
  }
  if (value <= 500) {
    return {
      label: 'High',
      className: 'text-warning-orange',
      dotClassName: 'bg-warning-orange',
    };
  }
  return {
    label: 'Very High',
    className: 'text-destructive',
    dotClassName: 'bg-destructive',
  };
}

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value < 10 ? value.toFixed(1) : Math.round(value).toString();
}

const PollenCard = ({ data }: Props) => {
  const grass = data?.grass_pollen ?? null;
  const birch = data?.birch_pollen ?? null;
  const alder = data?.alder_pollen ?? null;

  const grassStatus = getPollenStatus(grass);
  const birchStatus = getPollenStatus(birch);
  const alderStatus = getPollenStatus(alder);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="glass-card rounded-lg p-6 space-y-4 min-h-[168px]"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Pollen Count
        </p>
        <div
          className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${grassStatus.dotClassName}`}
        />
      </div>

      {/* Headline: Grass pollen — most common allergen in Ireland */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
          Grass Pollen
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-light tabular-nums text-foreground">
            {formatValue(grass)}
          </span>
          <span className={`text-sm font-medium ${grassStatus.className}`}>
            {grassStatus.label}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70">
          grains per m³ · most common allergen in Ireland
        </p>
      </div>

      {/* Secondary: birch + alder */}
      <div className="grid grid-cols-2 gap-3 pt-1 text-sm text-muted-foreground">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            Birch
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-normal text-foreground">{formatValue(birch)}</span>
            <span className={`text-xs ${birchStatus.className}`}>{birchStatus.label}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            Alder
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-normal text-foreground">{formatValue(alder)}</span>
            <span className={`text-xs ${alderStatus.className}`}>{alderStatus.label}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PollenCard;
