import { useMemo, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { m } from 'framer-motion';
import AppNav from '@/components/AppNav';
import ThemeToggle from '@/components/ThemeToggle';
import AppFooter from '@/components/AppFooter';
import HomeSaunaToggle from '@/components/HomeSaunaToggle';
import WarningsCard from '@/features/weather/components/WarningsCard';
import MarineCard from '@/features/weather/components/MarineCard';
import ForecastSwiper from '@/features/weather/components/ForecastSwiper';
import PullToRefresh from '@/components/PullToRefresh';
import InstallPrompt from '@/components/InstallPrompt';
import DebugModeIndicator from '@/components/DebugModeIndicator';
import SEOHead from '@/components/SEOHead';
import { hasActiveWarnings } from '@/features/weather/lib/conditions';
import { useWeather, useTides, useWarnings, useLightning, useRefreshAll } from '@/hooks/use-cromane-data';
import { useLocationFromRoute } from '@/features/location/hooks/use-location-from-route';
import { LOCATIONS, Location } from '@/features/location/data/locations';
import {
  countyLabel,
  getCountyHubForLocation,
  getNearbySaunas,
  getRegionForLocation,
} from '@/features/location/lib/directory';
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

function buildLocationSEO(loc: Location) {
  const county = countyLabel(loc.county);
  const title = loc.saunaName
    ? `${loc.name} Sauna – ${loc.saunaName} Beach Sauna & Sea Swimming, ${county}`
    : `${loc.name} Beach Sauna & Sea Swimming – Tides & Weather, ${county}`;
  const description = loc.saunaName
    ? `${loc.name} sauna guide: book ${loc.saunaName}, a wood-fired beach sauna in ${loc.name}, ${county}. Live tide times, sea temperature, and weather for sea swimming and cold-water plunges in ${loc.name}.`
    : `${loc.name} beach sauna and sea swimming guide for ${county}. Live tide times, sea temperature, and weather to plan a coastal sauna and cold-water swim in ${loc.name}.`;
  const h1 = loc.saunaName
    ? `${loc.saunaName} · beach sauna in ${loc.name}, ${county}`
    : `${loc.name} beach sauna & sea swimming · ${county}`;
  return { title, description, canonicalPath: `/${loc.id}`, h1 };
}

function buildSaunaJsonLd(loc: Location) {
  const county = countyLabel(loc.county);
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HealthClub'],
    name: loc.saunaName ?? `${loc.name} beach sauna`,
    description: `Coastal sauna at ${loc.name}, ${county}, with live tide times, sea conditions and weather.`,
    url: `https://saunasinireland.com/${loc.id}`,
    ...(loc.saunaUrl ? { sameAs: loc.saunaUrl } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: loc.name,
      addressRegion: county,
      addressCountry: loc.country ?? 'Ireland',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: loc.lat,
      longitude: loc.lon,
    },
    ...(loc.saunaUrl
      ? {
          potentialAction: {
            '@type': 'ReserveAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: loc.saunaUrl,
            },
          },
        }
      : {}),
  } as Record<string, unknown>;
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
  const county = countyLabel(location.county);
  const countyHub = useMemo(() => getCountyHubForLocation(location), [location]);
  const region = useMemo(() => getRegionForLocation(location), [location]);
  const nearby = useMemo(() => getNearbySaunas(location, 3), [location]);
  const jsonLd = useMemo(
    () => (hasRouteParam ? buildSaunaJsonLd(location) : undefined),
    [hasRouteParam, location]
  );

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
        jsonLd={jsonLd}
      />
      <h1 className="sr-only">{h1Text}</h1>
      <div className="bg-background min-h-dvh">
        <AppNav />
        <PullToRefresh onRefresh={refreshAll}>
        <main className="max-w-md mx-auto px-4 py-5 space-y-3">
          {hasRouteParam && (
            <nav aria-label="Breadcrumb" className="text-[11px] text-muted-foreground">
              <Link to="/" className="hover:text-foreground hover:underline">
                Home
              </Link>
              {region && (
                <>
                  <span className="mx-1">·</span>
                  <Link to={`/${region.slug}`} className="hover:text-foreground hover:underline">
                    {region.name}
                  </Link>
                </>
              )}
              {countyHub && (
                <>
                  <span className="mx-1">·</span>
                  <Link
                    to={`/county/${countyHub.slug}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {countyHub.name}
                  </Link>
                </>
              )}
              <span className="mx-1">·</span>
              <span className="text-foreground">{location.saunaName ?? location.name}</span>
            </nav>
          )}
          {/* Header */}
          <m.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-2 text-center relative"
          >
            <div className="absolute right-0 top-0 flex items-center gap-1">
              <ThemeToggle />
            </div>


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

          {hasRouteParam && (
            <div className="flex flex-col items-center gap-2">
              <HomeSaunaToggle slug={location.id} label={location.name} />
              <Link
                to="/discover"
                className="text-xs text-muted-foreground/70 hover:text-foreground underline-offset-4 hover:underline"
              >
                Browse all saunas · Change home sauna
              </Link>
            </div>
          )}

          {/* Card Stack */}
          <div className="space-y-2">
            {wind && tides && (
              <ForecastSwiper wind={wind} tideData={tides} onDayChange={setSelectedDayIndex} />
            )}
            {location.saunaName && location.saunaUrl && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="-mt-2"
              >
                <button
                  type="button"
                  onClick={handleBookingClick}
                  className="group w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-medium tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background flex items-center justify-center gap-2"
                >
                  <span>Book {location.saunaName}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </m.div>
            )}
            {!location.saunaUrl && (
              <p className="pt-1 text-center text-[13px] text-muted-foreground">
                No online booking · contact the operator directly
              </p>
            )}
            {isToday && <WarningsCard warnings={warnings} weatherCode={wind?.weather_code} />}
            {isToday && <MarineCard marine={marine} />}
          </div>

          {hasRouteParam && (
            <section className="pt-6 space-y-4">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {location.saunaName ? `${location.saunaName} is a coastal sauna at ` : 'A coastal sauna spot at '}
                {location.name}, {county}
                {location.country && location.country !== 'Ireland' ? `, ${location.country}` : ''}. This
                page shows live tide times for the {location.tideStation} tide station, sea and air
                temperature, wind and the week ahead — plus weather and marine warnings — so you can
                pick a good window for a sauna and a cold-water swim.
              </p>

              {nearby.length > 0 && (
                <div>
                  <h2 className="font-serif text-base text-foreground">Nearby saunas</h2>
                  <ul className="mt-2 space-y-1.5">
                    {nearby.map((n) => (
                      <li key={n.id}>
                        <Link
                          to={`/${n.id}`}
                          className="text-[13px] text-primary hover:underline"
                        >
                          {n.saunaName ?? n.name} · {n.name}, {countyLabel(n.county)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[13px] text-muted-foreground">
                {countyHub && (
                  <>
                    <Link to={`/county/${countyHub.slug}`} className="text-primary hover:underline">
                      All saunas in {countyHub.name}
                    </Link>
                    <span className="mx-1.5">·</span>
                  </>
                )}
                {region && (
                  <Link to={`/${region.slug}`} className="text-primary hover:underline">
                    All saunas in {region.name}
                  </Link>
                )}
              </p>
            </section>
          )}

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
