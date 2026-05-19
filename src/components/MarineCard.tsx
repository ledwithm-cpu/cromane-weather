import { m } from 'framer-motion';
import { MarineWarning } from '@/types/forecast';

interface Props {
  marine: MarineWarning;
}

const MarineCard = ({ marine }: Props) => {
  const isEmptyState = marine.type.toLowerCase() === 'no warnings';

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-lg p-6 space-y-3 text-center"
    >
      <div className="flex items-center justify-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Marine Warnings · {marine.area}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-normal text-foreground">{marine.type}</span>
      </div>

      {!isEmptyState && (
        <p className="text-xs text-muted-foreground leading-relaxed">{marine.description}</p>
      )}

    </m.div>
  );
};

export default MarineCard;
