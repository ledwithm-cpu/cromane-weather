import { motion } from 'framer-motion';
import ConditionsCard from '@/components/ConditionsCard';
import WarningsCard from '@/components/WarningsCard';
import TideCard from '@/components/TideCard';
import MarineCard from '@/components/MarineCard';
import { mockWind, mockTides, mockWarnings, mockMarine, hasActiveWarnings } from '@/lib/mock-data';

const Index = () => {
  const warningActive = hasActiveWarnings(mockWarnings);

  return (
    <div className={`min-h-screen transition-colors duration-700 ${warningActive ? 'theme-warning' : ''}`}>
      <div className="bg-background min-h-screen">
        <div className="max-w-md mx-auto px-4 py-8 space-y-4">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-4"
          >
            <h1 className="text-lg font-normal tracking-wide text-foreground">
              Cromane
            </h1>
            <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase">
              Co. Kerry · 51.93°N
            </p>
          </motion.header>

          {/* Card Stack */}
          <ConditionsCard wind={mockWind} warnings={mockWarnings} />
          <WarningsCard warnings={mockWarnings} />
          <TideCard tides={mockTides} wind={mockWind} warnings={mockWarnings} />
          <MarineCard marine={mockMarine} />

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-8 pb-12 text-center"
          >
            <p className="text-[10px] text-muted-foreground/40 tracking-wider uppercase">
              Cromane Watch · MVP
            </p>
          </motion.footer>
        </div>
      </div>
    </div>
  );
};

export default Index;
