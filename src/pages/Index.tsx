import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import AppFooter from '@/components/AppFooter';
import ConditionsCard from '@/components/ConditionsCard';
import WarningsCard from '@/components/WarningsCard';
import TideCard from '@/components/TideCard';
import MarineCard from '@/components/MarineCard';
import LightningCard from '@/components/LightningCard';
import PullToRefresh from '@/components/PullToRefresh';
import { hasActiveWarnings } from '@/lib/mock-data';
import { useWeather, useTides, useWarnings, useLightning, useRefreshAll } from '@/hooks/use-cromane-data';
import { useLocation } from '@/hooks/use-location';
import { LOCATIONS } from '@/lib/locations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Index = () => {
  const { location, setLocationById } = useLocation();
  const { data: wind, isLoading: windLoading, dataUpdatedAt: windUpdatedAt } = useWeather();
  const { data: tides, isLoading: tidesLoading, dataUpdatedAt: tidesUpdatedAt } = useTides();
  const { data: warningData, isLoading: warningsLoading, dataUpdatedAt: warningsUpdatedAt } = useWarnings();
  const { data: lightning } = useLightning();
  const refreshAll = useRefreshAll();

  const warnings = warningData?.warnings ?? [];
  const marine = warningData?.marine ?? { type: 'Loading...', area: 'Southwest Coast', description: '', active: false };
  const warningActive = hasActiveWarnings(warnings);

  const lightningDanger = (lightning?.alert_level ?? 0) >= 2;
  const stormApproaching = (lightning?.nowcast?.nowcast_level ?? 0) >= 1;

  const isLoading = windLoading || tidesLoading || warningsLoading;
  const lastUpdated = Math.max(windUpdatedAt, tidesUpdatedAt, warningsUpdatedAt);
  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Dublin' })
    : null;

  // Group locations by county for the dropdown
  const grouped = LOCATIONS.reduce<Record<string, typeof LOCATIONS>>((acc, loc) => {
    (acc[loc.county] ??= []).push(loc);
    return acc;
  }, {});

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

            <Select value={location.id} onValueChange={setLocationById}>
              <SelectTrigger className="inline-flex w-auto gap-1.5 border border-border/50 bg-card/60 shadow-sm rounded-full h-auto px-4 py-2 mx-auto focus:ring-1 focus:ring-primary/30 focus:ring-offset-0 hover:bg-card/80 hover:border-border/70 active:scale-[0.97] transition-all">
                <SelectValue>
                  <span className="text-xl font-normal tracking-wide text-foreground">
                    {location.name}
                  </span>
                </SelectValue>
                <span className="text-muted-foreground/50 text-xs ml-0.5">▾</span>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {Object.entries(grouped).map(([county, locs]) => (
                  <div key={county}>
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">
                      {county}
                    </div>
                    {locs.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            {location.saunaName && (
              <p className="text-sm text-primary font-medium mt-0.5">{location.saunaName}</p>
            )}
            <p className="text-xs text-muted-foreground/50 tracking-[0.12em] uppercase mt-1.5">
              {location.subtitle}
            </p>
            {isLoading ? (
              <p className="text-[10px] text-muted-foreground/50 mt-1 tracking-wider uppercase animate-pulse">
                Fetching live data…
              </p>
            ) : lastUpdatedStr ? (
              <p className="text-[10px] text-muted-foreground/40 mt-1 tracking-wider uppercase">
                Live · {lastUpdatedStr}
              </p>
            ) : null}
            <p className="text-[10px] text-muted-foreground/30 mt-2 tracking-wide">
              Live tides, weather & warnings for Irish coastal saunas
            </p>
          </motion.header>

          {/* Card Stack */}
          <div className="space-y-3">
            {tides && wind && <TideCard tideData={tides} wind={wind} warnings={warnings} />}
            {wind && <ConditionsCard wind={wind} warnings={warnings} />}
            {lightning && <LightningCard data={lightning} />}
            <WarningsCard warnings={warnings} weatherCode={wind?.weather_code} />
            <MarineCard marine={marine} />
          </div>

          {/* Footer */}
          <AppFooter delay={0.6} />
        </div>
        </PullToRefresh>
      </div>
    </div>
  );
};

export default Index;
