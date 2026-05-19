import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import AppFooter from '@/components/AppFooter';
import WarningsCard from '@/components/WarningsCard';
import MarineCard from '@/components/MarineCard';
import ForecastSwiper from '@/components/ForecastSwiper';
import LightningCard from '@/components/LightningCard';
import PullToRefresh from '@/components/PullToRefresh';
import InstallPrompt from '@/components/InstallPrompt';
import DebugModeIndicator from '@/components/DebugModeIndicator';
import AdSlot from '@/components/AdSlot';
import SEOHead from '@/components/SEOHead';
import { hasActiveWarnings } from '@/types/forecast';
import { useWeather, useTides, useWarnings, useLightning, useRefreshAll } from '@/hooks/use-cromane-data';
import { useLocationFromRoute } from '@/hooks/use-location-from-route';
import { LOCATIONS } from '@/lib/locations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_SEO = {
  title: 'Irish Beach Saunas | Find Coastal Saunas, Tide Times & Weather',
  description:
    'Find Irish beach saunas with live tide times, sea temperature and weather for coastal sauna and sea swimming sessions around Ireland.',
  canonicalPath: '/',
};

function buildLocationSEO(loc: ReturnType<typeof useLocationFromRoute>['location']) {
  const title = loc.saunaName
    ? `${loc.name} Sauna – ${loc.saunaName} Beach Sauna & Sea Swimming, Co. ${loc.county}`
    : `${loc.name} Beach Sauna & Sea Swimming – Tides & Weather, Co. ${loc.county}`;
  const description = loc.saunaName
    ? `${loc.name} sauna guide: book ${loc.saunaName}, a wood-fired beach sauna in ${loc.name}, Co. ${loc.county}. Live tide times, sea temperature, and weather for sea swimming and cold-water plunges in ${loc.name}.`
    : `${loc.name} beach sauna and sea swimming guide for Co. ${loc.county}. Live tide times, sea temperature, and weather to plan a coastal sauna and cold-water swim in ${loc.name}.`;
  const h1 = loc.saunaName
    ? `${loc.name} Sauna · ${loc.saunaName} Beach Sauna & Sea Swimming in ${loc.name}, Co. ${loc.county}`
    : `${loc.name} Beach Sauna & Sea Swimming · ${loc.name}, Co. ${loc.county}`;
  return { title, description, canonicalPath: `/${loc.id}`, h1 };
}

const Index = () => {
  const { location, isInvalidRoute, hasRouteParam } = useLocationFromRoute();
  const navigate = useNavigate();

  const handleLocationChange = (id: string) => {
    navigate(`/${id}`);
  };

  const handleBookingClick = () => {
    if (location.saunaUrl) {
      window.open(location.saunaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const { data: wind, isLoading: windLoading } = useWeather();
  const { data: tides, isLoading: tidesLoading } = useTides();
  const { data: warningData, isLoading: warningsLoading } = useWarnings();
  const { data: lightning } = useLightning();
  const refreshAll = useRefreshAll();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const isToday = selectedDayIndex === 0;

  const warnings = warningData?.warnings ?? [];
  const marine = warningData?.marine ?? { type: 'Loading...', area: 'Southwest Coast', description: '', active: false };
  const warningActive = hasActiveWarnings(warnings);

  const lightningDanger = (lightning?.alert_level ?? 0) >= 2;
  const stormApproaching = (lightning?.nowcast?.nowcast_level ?? 0) >= 1;

  const isLoading = windLoading || tidesLoading || warningsLoading;

  const grouped = useMemo(
    () =>
      LOCATIONS.reduce<Record<string, typeof LOCATIONS>>((acc, loc) => {
        (acc[loc.county] ??= []).push(loc);
        return acc;
      }, {}),
    []
  );

  const seo = hasRouteParam ? buildLocationSEO(location) : null;
  const h1Text = seo?.h1 ?? `${location.name} Beach Sauna & Sea Swimming · Live Irish Coastal Conditions`;

  // Invalid /:locationId → bounce home declaratively (no render-time side effects).
  if (isInvalidRoute) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={`min-h-dvh transition-colors duration-700 ${warningActive || lightningDanger ? 'theme-warning' : ''}`} data-storm-approaching={stormApproaching || undefined}>
      <SEOHead
        title={seo?.title ?? DEFAULT_SEO.title}
        description={seo?.description ?? DEFAULT_SEO.description}
        canonicalPath={seo?.canonicalPath ?? DEFAULT_SEO.canonicalPath}
      />
      <h1 className="sr-only">{h1Text}</h1>
      <div className="bg-background min-h-dvh">
        <PullToRefresh onRefresh={refreshAll}>
        <main className="max-w-md mx-auto px-4 py-8 space-y-4">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-4 text-center relative"
          >
            <div className="absolute right-0 top-0">
              <ThemeToggle />
            </div>

            <p className="text-xs text-muted-foreground/50 mb-2 tracking-wide">
              Live tides, weather & warnings for Irish coastal saunas
            </p>

            <Select value={location.id} onValueChange={handleLocationChange}>
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

            <p className="text-[11px] text-muted-foreground/50 tracking-[0.08em] mt-1.5">
              Tap the location to change sauna
            </p>
            {location.saunaName && location.saunaUrl && (
              <button
                type="button"
                onClick={handleBookingClick}
                className="group mt-1 inline-flex min-h-8 items-center px-2 text-sm font-medium text-primary/90 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="border-b border-primary/25 pb-0.5 transition-colors group-hover:border-primary/60">
                  Book {location.saunaName}
                </span>
              </button>
            )}
            {isLoading ? (
              <p className="text-[10px] text-muted-foreground/50 mt-1 tracking-wider uppercase animate-pulse">
                Fetching live data…
              </p>
            ) : null}
          </motion.header>

          {/* Card Stack */}
          <div className="space-y-3">
            {wind && tides && (
              <ForecastSwiper wind={wind} tideData={tides} onDayChange={setSelectedDayIndex} />
            )}
            {isToday && lightning && <LightningCard data={lightning} />}
            {isToday && <WarningsCard warnings={warnings} weatherCode={wind?.weather_code} />}
            {isToday && <MarineCard marine={marine} />}
          </div>

          {/* Sponsored */}
          <AdSlot className="pt-6" />

          {/* Footer */}
          <AppFooter delay={0.6} />
        </main>
        </PullToRefresh>
        <InstallPrompt />
        <DebugModeIndicator />
      </div>
    </div>
  );
};

export default Index;
