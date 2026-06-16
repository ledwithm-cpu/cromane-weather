import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import AppFooter from '@/components/AppFooter';
import WarningsCard from '@/features/weather/components/WarningsCard';
import MarineCard from '@/features/weather/components/MarineCard';
import ForecastSwiper from '@/features/weather/components/ForecastSwiper';
import LightningCard from '@/features/lightning/components/LightningCard';
import PullToRefresh from '@/components/PullToRefresh';
import InstallPrompt from '@/components/InstallPrompt';
import DebugModeIndicator from '@/components/DebugModeIndicator';
import SEOHead from '@/components/SEOHead';
import { hasActiveWarnings } from '@/features/weather/lib/conditions';
import { useWeather, useTides, useWarnings, useLightning, useRefreshAll } from '@/hooks/use-cromane-data';
import { useLocationFromRoute } from '@/features/location/hooks/use-location-from-route';
import { LOCATIONS } from '@/features/location/data/locations';
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
  // TEMPORARY: trigger error-boundary preview via ?crash=1 in URL
  if (typeof window !== 'undefined' && window.location.search.includes('crash=1')) {
    throw new Error('Mock crash for ErrorBoundary preview');
  }

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
        <AppNav />
        <PullToRefresh onRefresh={refreshAll}>
        <main className="max-w-md mx-auto px-4 py-8 space-y-4">
          {/* Header */}
          <m.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-4 text-center relative"
          >
            <div className="absolute right-0 top-0 flex items-center gap-1">
              <ThemeToggle />
            </div>

            <p className="text-xs text-muted-foreground/50 mb-3 tracking-wide leading-relaxed">
              Check conditions before your sauna. Tap the location to change sauna.
            </p>

            <Select value={location.id} onValueChange={handleLocationChange}>
              <SelectTrigger className="inline-flex w-auto gap-2 border border-border/60 bg-card/70 shadow-md rounded-full h-auto px-6 py-3 mx-auto focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 hover:bg-card/90 hover:border-border/80 active:scale-[0.97] transition-all">
                <SelectValue>
                  <span className="text-2xl font-normal tracking-wide text-foreground">
                    {location.name}
                  </span>
                </SelectValue>
                <span className="text-muted-foreground/50 text-sm ml-1">▾</span>
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
            {isLoading ? (
              <p className="text-[10px] text-muted-foreground/50 mt-1 tracking-wider uppercase animate-pulse">
                Fetching live data…
              </p>
            ) : null}
          </m.header>

          {/* Card Stack */}
          <div className="space-y-3">
            {wind && tides && (
              <ForecastSwiper wind={wind} tideData={tides} onDayChange={setSelectedDayIndex} />
            )}
            {location.saunaName && location.saunaUrl && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="pt-1"
              >
                <button
                  type="button"
                  onClick={handleBookingClick}
                  className="group w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-medium tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background flex items-center justify-center gap-2"
                >
                  <span>Book {location.saunaName}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </m.div>
            )}
            {isToday && lightning && <LightningCard data={lightning} />}
            {isToday && <WarningsCard warnings={warnings} weatherCode={wind?.weather_code} />}
            {isToday && <MarineCard marine={marine} />}
          </div>


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
