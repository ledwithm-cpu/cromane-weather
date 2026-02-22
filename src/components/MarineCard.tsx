import { motion } from 'framer-motion';
import { MarineWarning } from '@/lib/mock-data';

interface Props {
  marine: MarineWarning;
}

const MarineCard = ({ marine }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-lg p-6 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Marine Warnings · {marine.area}
        </p>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              marine.active ? 'bg-warning-orange animate-pulse' : 'bg-emerald-500'
            }`}
            style={marine.active ? { boxShadow: '0 0 8px 3px hsla(25, 95%, 55%, 0.4)' } : undefined}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-normal text-foreground">{marine.type}</span>
        {marine.active && (
          <span className="text-[10px] uppercase tracking-wider text-warning-orange">Active</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{marine.description}</p>

    </motion.div>
  );
};

export default MarineCard;
