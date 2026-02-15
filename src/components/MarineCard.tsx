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
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
        Marine · {marine.area}
      </p>

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${marine.active ? 'bg-warning-orange' : 'bg-muted-foreground/30'}`} />
        <span className="text-sm font-normal text-foreground">{marine.type}</span>
        {marine.active && (
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Active</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{marine.description}</p>

      {/* Lightning placeholder */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
        <span className="text-xs text-muted-foreground/50">Lightning monitoring · coming soon</span>
      </div>
    </motion.div>
  );
};

export default MarineCard;
