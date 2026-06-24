import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, MapPin } from 'lucide-react';
import { m } from 'framer-motion';
import AppNav from '@/components/AppNav';
import AppFooter from '@/components/AppFooter';
import SEOHead from '@/components/SEOHead';
import { LOCATIONS } from '@/features/location/data/locations';
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
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Keep me in the loop
          </button>
        </form>
      </div>
    </section>
  );
}

const Landing = () => {
  const featured = useMemo(() => {
    return FEATURED_IDS
      .map((id) => LOCATIONS.find((l) => l.id === id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l));
  }, []);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SEOHead
        title="Coastal saunas, gently catalogued | Irish & UK Beach Saunas"
        description="Find sea-side saunas around Ireland, Scotland, Wales and England. Soft, calm, and made for slow afternoons by the water."
      />
      <AppNav />

      {/* Hero */}
      <section className="relative">
        <div className="relative w-full h-[78vh] min-h-[520px] max-h-[760px] overflow-hidden">
          <img
            src={heroImg}
            alt="A wooden sauna by the sea at golden hour with soft steam drifting in the warm light"
            width={1600}
            height={1024}
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
          {/* Warm wash so type stays readable on any image area */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/30 to-background/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />

          <div className="relative h-full mx-auto max-w-6xl px-5 sm:px-8 flex flex-col justify-end pb-12 sm:pb-16">
            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="max-w-2xl"
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-foreground/70 mb-4">
                Coastal saunas · Ireland · Scotland · Wales · England
              </p>
              <h1 className="font-serif text-[2.4rem] sm:text-5xl md:text-6xl leading-[1.05] text-foreground tracking-[-0.015em]">
                Slow afternoons,<br className="hidden sm:block" /> by the sea.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-foreground/80 max-w-xl leading-relaxed">
                A gentle map of the coast's quietest saunas. Find a place,
                check the tide, and give yourself an hour.
              </p>

              <div className="mt-8">
                <Link
                  to="/discover"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-medium text-primary-foreground shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  Find your sauna
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* Featured saunas — visible value, no click required */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 pt-14 pb-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              A few to begin with
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">
              Saunas worth the journey
            </h2>
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((loc) => (
            <li key={loc.id}>
              <Link
                to={`/sauna/${loc.id}`}
                className="group block rounded-3xl overflow-hidden border border-border/60 bg-card hover:border-border transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={heroImg}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    width={800}
                    height={600}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-foreground/80 border border-border/60">
                    <MapPin className="w-3 h-3" />
                    {loc.country ?? 'Coast'}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <h3 className="font-serif text-lg text-foreground leading-snug">
                    {loc.saunaName ?? loc.name}
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {loc.name} · Co. {loc.county}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Soft-gate email capture, in the natural flow */}
      <InlineEmailCapture />

      {/* Secondary text link for high-intent visitors */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 pb-16 text-center">
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-[14px] text-foreground/75 hover:text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground/60 transition-colors"
        >
          Browse the full map
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      <AppFooter />
    </div>
  );
};

export default Landing;
