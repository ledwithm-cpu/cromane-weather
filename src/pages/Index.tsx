import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import ConditionsCard from '@/components/ConditionsCard';
import WarningsCard from '@/components/WarningsCard';
import TideCard from '@/components/TideCard';
import MarineCard from '@/components/MarineCard';
import LightningCard from '@/components/LightningCard';
import type { LightningData } from '@/components/LightningCard';
import PullToRefresh from '@/components/PullToRefresh';
import { hasActiveWarnings } from '@/lib/mock-data';
import { useWeather, useTides, useWarnings, useLightning, useRefreshAll } from '@/hooks/use-cromane-data';
import { Skeleton } from '@/components/ui/skeleton';

// Demo simulation data for each alert level
const demoStrikes: Record<number, LightningData> = {
  0: {
    alert_level: 0, strike_count: 0, last_strike_time_ms: null,
    closest_strike: null, strikes: [], checked_at: Date.now(),
  },
  1: {
    alert_level: 1, strike_count: 3, last_strike_time_ms: Date.now(),
    closest_strike: { distance_km: 15.2, bearing_compass: 'NNW', bearing_deg: 338 },
    strikes: [
      { distance_km: 15.2, bearing_compass: 'NNW', time_ms: Date.now() },
      { distance_km: 18.7, bearing_compass: 'NW', time_ms: Date.now() - 60000 },
      { distance_km: 19.1, bearing_compass: 'N', time_ms: Date.now() - 120000 },
    ],
    checked_at: Date.now(),
  },
  2: {
    alert_level: 2, strike_count: 7, last_strike_time_ms: Date.now(),
    closest_strike: { distance_km: 7.4, bearing_compass: 'WSW', bearing_deg: 248 },
    strikes: [
      { distance_km: 7.4, bearing_compass: 'WSW', time_ms: Date.now() },
      { distance_km: 9.8, bearing_compass: 'W', time_ms: Date.now() - 30000 },
      { distance_km: 12.1, bearing_compass: 'SW', time_ms: Date.now() - 90000 },
    ],
    checked_at: Date.now(),
  },
  3: {
    alert_level: 3, strike_count: 12, last_strike_time_ms: Date.now(),
    closest_strike: { distance_km: 3.1, bearing_compass: 'SSE', bearing_deg: 158 },
    strikes: [
      { distance_km: 3.1, bearing_compass: 'SSE', time_ms: Date.now() },
      { distance_km: 4.5, bearing_compass: 'SE', time_ms: Date.now() - 15000 },
      { distance_km: 6.2, bearing_compass: 'S', time_ms: Date.now() - 45000 },
    ],
    checked_at: Date.now(),
  },
};

const Index = () => {
  const { data: wind, isLoading: windLoading, dataUpdatedAt: windUpdatedAt } = useWeather();
  const { data: tides, isLoading: tidesLoading, dataUpdatedAt: tidesUpdatedAt } = useTides();
  const { data: warningData, isLoading: warningsLoading, dataUpdatedAt: warningsUpdatedAt } = useWarnings();
  const { data: lightning, isLoading: lightningLoading } = useLightning();
  const refreshAll = useRefreshAll();

  // Demo mode state
  const [demoLevel, setDemoLevel] = useState<number | null>(null);
  const [demoData, setDemoData] = useState<LightningData | null>(null);

  // Cycle demo: when activated, escalate every 5s: 0 → 1 → 2 → 3 → off
  useEffect(() => {
    if (demoLevel === null) {
      setDemoData(null);
      return;
    }
    // Keep last_strike_time_ms fresh so the countdown works
    setDemoData({ ...demoStrikes[demoLevel], last_strike_time_ms: demoLevel > 0 ? Date.now() : null });

    if (demoLevel < 3) {
      const timer = setTimeout(() => {
        setDemoLevel(prev => (prev !== null && prev < 3) ? prev + 1 : null);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      // Stay on Level 3 for 8 seconds before resetting
      const timer = setTimeout(() => setDemoLevel(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [demoLevel]);

  const activeLightning = demoData ?? lightning;

  const warnings = warningData?.warnings ?? [];
  const marine = warningData?.marine ?? { type: 'Loading...', area: 'Southwest Coast', description: '', active: false };
  const warningActive = hasActiveWarnings(warnings);

  // Lightning level 2+ also triggers warning theme
  const lightningDanger = (activeLightning?.alert_level ?? 0) >= 2;

  const isLoading = windLoading || tidesLoading || warningsLoading;
  const lastUpdated = Math.max(windUpdatedAt, tidesUpdatedAt, warningsUpdatedAt);
  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Dublin' })
    : null;

  return (
    <div className={`min-h-screen transition-colors duration-700 ${warningActive || lightningDanger ? 'theme-warning' : ''}`}>
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
          {activeLightning && <LightningCard data={activeLightning} />}

          {/* Demo trigger button */}
          {demoLevel === null ? (
            <button
              onClick={() => setDemoLevel(0)}
              className="w-full text-[10px] uppercase tracking-wider text-muted-foreground/40 hover:text-muted-foreground transition-colors py-1"
            >
              ▶ Simulate Lightning Demo
            </button>
          ) : (
            <p className="text-[10px] uppercase tracking-wider text-accent text-center py-1 animate-pulse">
              Demo: Level {demoLevel} of 3 — {demoLevel < 3 ? 'escalating…' : 'complete'}
            </p>
          )}

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
