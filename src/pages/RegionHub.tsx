import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import AppNav from '@/components/AppNav';
import AppFooter from '@/components/AppFooter';
import SEOHead from '@/components/SEOHead';
import SaunaCard from '@/components/SaunaCard';
import ThemeToggle from '@/components/ThemeToggle';
import {
  COUNTY_HUBS,
  getRegion,
  getRegionSaunas,
  slugify,
  countyLabel,
} from '@/features/location/lib/directory';

const RegionHub = () => {
  const { regionSlug } = useParams<{ regionSlug: string }>();
  const region = regionSlug ? getRegion(regionSlug) : undefined;

  const saunas = useMemo(
    () => (region ? getRegionSaunas(region.country) : []),
    [region]
  );

  const counties = useMemo(
    () => COUNTY_HUBS.filter((c) => c.country === region?.country),
    [region]
  );

  if (!region) return <Navigate to="/" replace />;

  const title = `Coastal Saunas in ${region.name} · ${saunas.length} Beach Saunas, Tides & Weather`;
  const description = `Browse ${saunas.length} coastal and beach saunas in ${region.name}. Live tide times, sea conditions and direct booking links for every sauna · free, no signup.`;

  return (
    <div className="min-h-dvh bg-background">
      <SEOHead
        title={title}
        description={description}
        canonicalPath={`/${region.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: `https://saunasinireland.com/${region.slug}`,
        }}
      />
      <AppNav />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="text-[13px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline">
            Home
          </Link>
          <span className="mx-1.5">·</span>
          <span className="text-foreground">{region.name}</span>
          <span className="float-right">
            <ThemeToggle />
          </span>
        </nav>

        <h1 className="mt-6 font-serif text-3xl sm:text-4xl leading-tight text-foreground">
          Coastal saunas in {region.name}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {region.blurb} We track {saunas.length} sauna
          {saunas.length === 1 ? '' : 's'} on the {region.name} coast. Every
          listing shows live tide times, sea and air conditions, weather
          warnings and a direct link to book · free to use, no signup needed.
        </p>

        {counties.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl text-foreground">
              Browse by area in {region.name}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {counties.map((c) => (
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

        <section className="mt-10">
          <h2 className="font-serif text-xl text-foreground">
            All {region.name} saunas
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saunas.map((loc) => (
              <SaunaCard key={loc.id} location={loc} />
            ))}
          </div>
        </section>

        <p className="mt-10 text-[14px] text-muted-foreground">
          Looking further afield? Browse{' '}
          {['ireland', 'scotland', 'wales', 'england']
            .filter((s) => s !== region.slug)
            .map((s, i, arr) => (
              <span key={s}>
                <Link to={`/${s}`} className="text-primary hover:underline">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Link>
                {i < arr.length - 1 ? ', ' : '.'}
              </span>
            ))}
        </p>

        <AppFooter delay={0.2} />
      </main>
    </div>
  );
};

export default RegionHub;
