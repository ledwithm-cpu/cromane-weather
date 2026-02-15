import { motion } from 'framer-motion';
import ConditionsCard from '@/components/ConditionsCard';
import WarningsCard from '@/components/WarningsCard';
import TideCard from '@/components/TideCard';
import MarineCard from '@/components/MarineCard';
import { hasActiveWarnings } from '@/lib/mock-data';
import { useWeather, useTides, useWarnings } from '@/hooks/use-cromane-data';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: wind, isLoading: windLoading } = useWeather();
  const { data: tides, isLoading: tidesLoading } = useTides();
  const { data: warningData, isLoading: warningsLoading } = useWarnings();

  const warnings = warningData?.warnings ?? [];
  const marine = warningData?.marine ?? { type: 'Loading...', area: 'Southwest Coast', description: '', active: false };
  const warningActive = hasActiveWarnings(warnings);

  const isLoading = windLoading || tidesLoading || warningsLoading;

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
            {isLoading && (
              <p className="text-[10px] text-muted-foreground/50 mt-1 tracking-wider uppercase animate-pulse">
                Fetching live data…
              </p>
            )}
          </motion.header>

          {/* Card Stack */}
          {wind && <ConditionsCard wind={wind} warnings={warnings} />}
          <WarningsCard warnings={warnings} />
          {tides && <TideCard tides={tides} wind={wind!} warnings={warnings} />}
          <MarineCard marine={marine} />

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-8 pb-12 text-center"
          >
            <p className="text-[10px] text-muted-foreground/40 tracking-wider uppercase">
              Cromane Watch · Live
            </p>
          </motion.footer>
        </div>
      </div>
    </div>
  );
};

export default Index;
