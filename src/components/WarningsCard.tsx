import { motion } from 'framer-motion';
import { Warning } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';

interface Props {
  warnings: Warning[];
}

const levelColor: Record<string, string> = {
  yellow: 'bg-warning-yellow text-warning-yellow/10',
  orange: 'bg-warning-orange text-warning-orange/10',
  red: 'bg-warning-red text-destructive-foreground',
};

const WarningsCard = ({ warnings }: Props) => {
  if (warnings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-lg p-6"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
          Met Éireann Warnings
        </p>
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
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
        Met Éireann Warnings
      </p>

      {warnings.map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={`${levelColor[w.level]} border-0 text-xs uppercase font-medium`}>
              {w.level}
            </Badge>
            <span className="text-sm font-normal text-foreground">{w.headline}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{w.description}</p>
          <p className="text-xs text-muted-foreground/60">Valid until {w.valid_until}</p>
        </div>
      ))}
    </motion.div>
  );
};

export default WarningsCard;
