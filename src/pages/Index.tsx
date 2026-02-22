import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import ConditionsCard from '@/components/ConditionsCard';
import WarningsCard from '@/components/WarningsCard';
import TideCard from '@/components/TideCard';
import MarineCard from '@/components/MarineCard';
import LightningCard from '@/components/LightningCard';
import PullToRefresh from '@/components/PullToRefresh';
import { hasActiveWarnings } from '@/lib/mock-data';
import { useWeather, useTides, useWarnings, useLightning, useRefreshAll } from '@/hooks/use-cromane-data';

const Index = () => {
  const { data: wind, isLoading: windLoading, dataUpdatedAt: windUpdatedAt } = useWeather();
  const { data: tides, isLoading: tidesLoading, dataUpdatedAt: tidesUpdatedAt } = useTides();
  const { data: warningData, isLoading: warningsLoading, dataUpdatedAt: warningsUpdatedAt } = useWarnings();
  const { data: lightning } = useLightning();
  const refreshAll = useRefreshAll();

  const warnings = warningData?.warnings ?? [];
  const marine = warningData?.marine ?? { type: 'Loading...', area: 'Southwest Coast', description: '', active: false };
  const warningActive = hasActiveWarnings(warnings);

  // Lightning level 2+ or nowcast approaching triggers warning theme
  const lightningDanger = (lightning?.alert_level ?? 0) >= 2;
  const stormApproaching = (lightning?.nowcast?.nowcast_level ?? 0) >= 1;

  const isLoading = windLoading || tidesLoading || warningsLoading;
  const lastUpdated = Math.max(windUpdatedAt, tidesUpdatedAt, warningsUpdatedAt);
  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Dublin' })
    : null;

  return (
    <div className={`min-h-screen transition-colors duration-700 ${warningActive || lightningDanger ? 'theme-warning' : ''}`} data-storm-approaching={stormApproaching || undefined}>
      <div className="bg-background min-h-screen">
        <PullToRefresh onRefresh={refreshAll}>
        <div className="max-w-md mx-auto px-4 py-8 space-y-4">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-4 text-center relative"
          >
            <div className="absolute right-0 top-0">
              <ThemeToggle />
            </div>
            <h1 className="text-2xl font-normal tracking-wide text-foreground">
              Cromane
            </h1>
            <p className="text-sm text-muted-foreground tracking-[0.15em] uppercase">
              Co. Kerry · 52.11°N
            </p>
            {isLoading ? (
              <p className="text-[10px] text-muted-foreground/50 mt-1 tracking-wider uppercase animate-pulse">
                Fetching live data…
              </p>
            ) : lastUpdatedStr ? (
              <p className="text-[10px] text-muted-foreground/40 mt-1 tracking-wider uppercase">
                Updated {lastUpdatedStr}
              </p>
            ) : null}
          </motion.header>

          {/* Card Stack */}
          {wind && <ConditionsCard wind={wind} warnings={warnings} />}
          <div className="border-t border-border/30" />
          {tides && <TideCard tideData={tides} wind={wind!} warnings={warnings} />}
          <div className="border-t border-border/30" />
          {lightning && <LightningCard data={lightning} />}
          <div className="border-t border-border/30" />
          <WarningsCard warnings={warnings} weatherCode={wind?.weather_code} />
          <div className="border-t border-border/30" />
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
        </PullToRefresh>
      </div>
    </div>
  );
};

export default Index;
