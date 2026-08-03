import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, MapPin, Search } from 'lucide-react';
import { m } from 'framer-motion';
import AppNav from '@/components/AppNav';
import AppFooter from '@/components/AppFooter';
import SEOHead from '@/components/SEOHead';
import SaunaCard from '@/components/SaunaCard';
import ThemeToggle from '@/components/ThemeToggle';
import SaunaMapSection from '@/features/location/components/SaunaMapSection';
import {
  COUNTY_HUBS,
  REGIONS,
  SAUNAS,
  countyLabel,
  getRegionSaunas,
} from '@/features/location/lib/directory';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import heroImg from '@/assets/landing-hero.jpg';

// Curated featured saunas — spread across regions so the value is visible at a glance.
const FEATURED_IDS = [
  'cromane',
  'beo-by-the-sea-mullaghmore-pier',
  'sauna-fiain-renville-pier',
  'brandon-bay-sauna-castlegregory',
  'soul-water-sauna-portobello-beach-promenade',
  'kiln-sauna-gyllyngvase-beach-falmouth-flushing-mylor',
];

const EMAIL_KEY = 'landingEmailCaptured:v1';

function InlineEmailCapture() {
  const { user } = useAuth();
  const [done, setDone] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(EMAIL_KEY) === '1',
  );
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  if (user || done) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error('Please enter a valid email.');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('marketing_subscribers')
      .insert({ email: trimmed, source: 'landing' });
    setBusy(false);
    if (error && !error.message.toLowerCase().includes('duplicate')) {
      toast.error('Could not subscribe. Please try again.');
      return;
    }
    window.localStorage.setItem(EMAIL_KEY, '1');
    setDone(true);
    toast.success("You're on the list. We'll be in touch.");
  };

  return (
    <section className="mx-auto max-w-2xl px-5 py-12">
      <div className="rounded-3xl border border-border/60 bg-card/70 px-6 py-8 sm:px-9 sm:py-10 backdrop-blur-sm">
        <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
          A quiet note when the sea is right
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
          Now and then we share gentle updates · new saunas, calm-water windows,
          a soft nudge when conditions look kind. Leave your email if you'd like
          to hear from us.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 h-12 rounded-full bg-background/80 border border-border/60 px-5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-12 px-6 rounded-full bg-primary text-primary-foreground text-[14px] font-medium inline-flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Keep me posted'}
          </button>
        </form>
      </div>
    </section>
  );
}

function SaunaSearch() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return SAUNAS.filter((l) =>
      `${l.saunaName ?? ''} ${l.name} ${l.county}`.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  return (
    <div className="mx-auto mt-6 w-full max-w-xl text-left">
      <label htmlFor="sauna-search" className="sr-only">
        Search saunas by name or place
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="sauna-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by sauna, beach or county…"
          className="h-12 w-full rounded-full border border-border/60 bg-background/90 pl-11 pr-5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
          {results.map((loc) => (
            <li key={loc.id}>
              <Link
                to={`/${loc.id}`}
                className="flex items-center gap-2 px-4 py-3 text-[14px] text-foreground hover:bg-primary/10"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium">{loc.saunaName ?? loc.name}</span>
                <span className="text-muted-foreground">
                  {loc.name} · {countyLabel(loc.county)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Landing = () => {
  const featured = useMemo(
    () =>
      FEATURED_IDS.map((id) => SAUNAS.find((l) => l.id === id)).filter(
        (l): l is (typeof SAUNAS)[number] => !!l,
      ),
    [],
  );

  const regionCounts = useMemo(
    () =>
      REGIONS.map((r) => ({ ...r, count: getRegionSaunas(r.country).length })),
    [],
  );

  const title = `Coastal Saunas Directory · ${SAUNAS.length} Beach Saunas in Ireland, Scotland, Wales & England`;
  const description = `Find ${SAUNAS.length} coastal saunas across Ireland, Scotland, Wales and England. Live tide times, sea conditions and direct booking links · 100% free, no signup needed.`;

  return (
    <div className="min-h-dvh bg-background">
      <SEOHead
        title={title}
        description={description}
        canonicalPath="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Coastal Saunas Directory',
          url: 'https://saunasinireland.com/',
          description,
        }}
      />
      <AppNav />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border/40">
        <img
          src={heroImg}
          alt="Steam rising from a wood-fired sauna beside the sea at golden hour"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="eager"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div className="relative mx-auto max-w-3xl px-5 py-12 sm:py-16 text-center">
          <div className="absolute right-4 top-4">
            <ThemeToggle />
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl leading-tight text-foreground">
            Find coastal saunas across Ireland, Scotland, Wales &amp; England
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] sm:text-base leading-relaxed text-foreground/80">
            {SAUNAS.length} coastal saunas · live tide times &amp; sea conditions ·
            direct booking links · 100% free, no signup needed
          </p>
          <SaunaSearch />
          <div className="mt-5">
            <Link
              to="/discover"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-medium text-primary-foreground transition active:scale-[0.98]"
            >
              Find your sauna <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Browse by region */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="font-serif text-2xl text-foreground">Browse by region</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {regionCounts.map((r) => (
            <Link
              key={r.slug}
              to={`/${r.slug}`}
              className="group rounded-3xl border border-border/60 bg-card/70 px-5 py-5 backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-card"
            >
              <h3 className="font-serif text-xl text-foreground">{r.name}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {r.count} coastal saunas
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {r.blurb}
              </p>
              <span className="mt-3 inline-block text-[13px] font-medium text-primary">
                Explore {r.name}
                <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured saunas */}
      <section className="mx-auto max-w-5xl px-5 pb-4">
        <h2 className="font-serif text-2xl text-foreground">Featured saunas</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">
          A few favourites, spread around the coast.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((loc) => (
            <SaunaCard key={loc.id} location={loc} />
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="mx-auto max-w-6xl px-0 sm:px-5 py-12">
        <div className="px-5 sm:px-0">
          <h2 className="font-serif text-2xl text-foreground">Sauna map</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Tap a pin to see the sauna, save it to your bucket list, or check
            tides.
          </p>
        </div>
        <div className="mt-4 overflow-hidden border-y border-border/50 sm:rounded-3xl sm:border">
          <SaunaMapSection className="h-[60vh] max-h-[560px]" />
        </div>
        <div className="mt-3 px-5 sm:px-0">
          <Link to="/discover" className="text-[14px] text-primary hover:underline">
            Browse the full map →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-5 pb-4">
        <h2 className="font-serif text-2xl text-foreground">
          How this works · why use it
        </h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Every sauna page pulls live coastal data so you can pick a good
            window before you leave the house: tide times and tide height for the
            nearest tide station, sea and air temperature, wind speed and
            direction, and the day-by-day forecast for the week ahead.
          </p>
          <p>
            For Irish saunas we also surface Met Éireann weather warnings and
            marine warnings for the relevant coastal area, so a small-craft
            warning or an orange wind warning shows up before you plan a swim.
          </p>
          <p>
            When you find a sauna you like, the booking link goes straight to the
            operator · we take no commission and add no booking layer. Save spots
            to a bucket list, set a home sauna so it opens by default, and use it
            all free, forever, with no signup needed.
          </p>
        </div>
        <p className="mt-4 text-[14px]">
          <Link to="/how-it-works" className="text-primary hover:underline">
            Read more about the data sources →
          </Link>
        </p>
      </section>

      <InlineEmailCapture />

      {/* Footer with internal links */}
      <footer className="border-t border-border/40 bg-card/40">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <h2 className="font-serif text-lg text-foreground">Explore by region</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            {regionCounts.map((r) => (
              <li key={r.slug}>
                <Link to={`/${r.slug}`} className="text-primary hover:underline">
                  Saunas in {r.name} ({r.count})
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 font-serif text-lg text-foreground">
            Popular counties &amp; areas
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
            {COUNTY_HUBS.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/county/${c.slug}`}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            <li>
              <Link to="/discover" className="text-primary hover:underline">
                Full map
              </Link>
            </li>
            <li>
              <Link to="/tides" className="text-primary hover:underline">
                Tides
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="text-primary hover:underline">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-primary hover:underline">
                Contact
              </Link>
            </li>
          </ul>

          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AppFooter delay={0.2} />
          </m.div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
