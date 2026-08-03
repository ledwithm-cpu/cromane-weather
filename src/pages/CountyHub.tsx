import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import AppNav from '@/components/AppNav';
import AppFooter from '@/components/AppFooter';
import SEOHead from '@/components/SEOHead';
import SaunaCard from '@/components/SaunaCard';
import ThemeToggle from '@/components/ThemeToggle';
import { COUNTY_HUBS, getCountyHub } from '@/features/location/lib/directory';

const CountyHub = () => {
  const { countySlug } = useParams<{ countySlug: string }>();
  const hub = countySlug ? getCountyHub(countySlug) : undefined;

  const siblings = useMemo(
    () => COUNTY_HUBS.filter((c) => c.country === hub?.country && c.slug !== hub?.slug).slice(0, 8),
    [hub]
  );

  if (!hub) return <Navigate to="/" replace />;

  const title = `${hub.name} Saunas · ${hub.saunas.length} Coastal Beach Saunas, Tides & Weather`;
  const description = `Every coastal sauna in ${hub.name}, ${hub.country}: ${hub.saunas
    .map((s) => s.saunaName ?? s.name)
    .slice(0, 4)
    .join(', ')} and more. Live tide times, sea conditions and direct booking links.`;

  return (
    <div className="min-h-dvh bg-background">
      <SEOHead
        title={title}
        description={description}
        canonicalPath={`/county/${hub.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: `https://saunasinireland.com/county/${hub.slug}`,
        }}
      />
      <AppNav />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="text-[13px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline">
            Home
          </Link>
          <span className="mx-1.5">·</span>
          {hub.region && (
            <>
              <Link to={`/${hub.region.slug}`} className="hover:text-foreground hover:underline">
                {hub.region.name}
              </Link>
              <span className="mx-1.5">·</span>
            </>
          )}
          <span className="text-foreground">{hub.name}</span>
          <span className="float-right">
            <ThemeToggle />
          </span>
        </nav>

        <h1 className="mt-6 font-serif text-3xl sm:text-4xl leading-tight text-foreground">
          Coastal saunas in {hub.name}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {hub.saunas.length} coastal sauna{hub.saunas.length === 1 ? '' : 's'} in{' '}
          {hub.name}, {hub.country}. Each page shows live tide times, sea and air
          temperature, wind, weather warnings and a direct booking link · so you
          can pick your window before you drive to the beach. Free to use, no
          signup needed.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hub.saunas.map((loc) => (
            <SaunaCard key={loc.id} location={loc} />
          ))}
        </div>

        {siblings.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-xl text-foreground">
              Nearby areas in {hub.country}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {siblings.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/county/${c.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-4 py-2 text-[13px] text-foreground hover:border-primary/50"
                  >
                    {c.name}
                    <span className="text-muted-foreground">{c.saunas.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <AppFooter delay={0.2} />
      </main>
    </div>
  );
};

export default CountyHub;
