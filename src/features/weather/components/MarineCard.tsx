import { m } from 'framer-motion';
import { MarineWarning } from '@/types/forecast';

interface Props {
  marine: MarineWarning;
}

const MarineCard = ({ marine }: Props) => {
  const isEmptyState = marine.type.toLowerCase() === 'no warnings';
  const active = !isEmptyState;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-lg p-6 space-y-4 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Marine Warnings · {marine.area}
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
        <p className="text-sm font-normal text-foreground">{marine.type}</p>
        {!isEmptyState && marine.description && (
          <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{marine.description}</p>
        )}
        {isEmptyState && (
          <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
            No active marine warnings in effect.
          </p>
        )}
      </div>
    </m.div>
  );
};

export default MarineCard;
