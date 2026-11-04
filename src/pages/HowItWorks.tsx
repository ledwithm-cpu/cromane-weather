import { m } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import AppFooter from '@/components/AppFooter';
import { SAUNAS } from '@/features/location/lib/directory';


const section = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5 },
});

const HowItWorks = () => {
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <m.header {...section(0)} className="pb-8 relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase mb-6"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <h1 className="text-2xl font-normal tracking-wide text-foreground">
            How This Works
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We built Irish Beach Saunas because we love the coast but hate surprises. Whether you're checking the tide for a swim, the wind before you drive out, or finding a sauna to warm up in after · this site is here to help.
          </p>
        </m.header>

        {/* Philosophy */}
        <m.section {...section(0.1)} className="pb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We pull from named public sources · the Marine Institute, Met Éireann, Open-Meteo and Blitzortung · and tell you where each number comes from. Always use your own judgement at the water&apos;s edge.
          </p>
        </m.section>

        <div className="space-y-8">
          {/* What it costs */}
          <m.section {...section(0.1)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                What it costs
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Free · for You and the Saunas
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">No fees, ever:</strong> The site is free to use, with no signup needed. Booking happens on each operator&apos;s own site · we never take a commission or add a booking fee.</p>
              <p><strong className="text-foreground font-normal">Free for operators too:</strong> No sauna pays to be listed.</p>
            </div>
          </m.section>

          {/* Location Selector */}
          <m.section {...section(0.12)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Locations
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              {SAUNAS.length} Saunas Around the Coast
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Five coastlines:</strong> We cover saunas in Ireland, Northern Ireland, Scotland, Wales and England.</p>
              <p><strong className="text-foreground font-normal">Every sauna, its own spot:</strong> Every sauna has its own map pin and weather point, so you don&apos;t get a generic county forecast. Roving operators are shown at their main spot.</p>
              <p><strong className="text-foreground font-normal">Booking right there:</strong> From Samhradh&apos;s in Cromane to Salt and Ember at Creevy Pier in Donegal, each sauna page has a button that goes straight to the operator&apos;s own booking site.</p>
              <p><strong className="text-foreground font-normal">Your home sauna:</strong> Set a home sauna and it opens straight to it next time.</p>
            </div>
          </m.section>

          {/* Tides */}
          <m.section {...section(0.15)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Tides
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Tide Times for Irish Saunas
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Ireland and Northern Ireland:</strong> Tide times come from Marine Institute predictions, for saunas with a Marine Institute station within reach. A few Northern Ireland saunas are too far from one, and Scotland, Wales and England don&apos;t have tide data yet.</p>
              <p><strong className="text-foreground font-normal">Actually local:</strong> The tide at Dingle isn&apos;t the same as Fenit. Each sauna uses its nearest Marine Institute station, with the times adjusted for your stretch of coast where we know the difference.</p>
              <p><strong className="text-foreground font-normal">Heights you can compare:</strong> Heights are shown above chart datum (Lowest Astronomical Tide) · the same reference used on charts and tide tables.</p>
              <p><strong className="text-foreground font-normal">Updates every hour:</strong> The chart refreshes regularly so you always know where you are between high and low water.</p>
            </div>
          </m.section>

          {/* Conditions */}
          <m.section {...section(0.2)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Conditions
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Weather for Every Sauna
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Not a county average:</strong> Weather comes from Open-Meteo at each sauna&apos;s own coordinates · temperature, rain chance and a 7-day forecast.</p>
              <p><strong className="text-foreground font-normal">Wind:</strong> Speed in km/h, with the direction it&apos;s blowing.</p>
              <p><strong className="text-foreground font-normal">How cold it really feels:</strong> The &quot;feels like&quot; temperature is Open-Meteo&apos;s apparent temperature, which accounts for wind, humidity and sun.</p>
              <p><strong className="text-foreground font-normal">Sea temperature:</strong> From Open-Meteo Marine, so you know what the plunge will feel like.</p>
              <p>Refreshes every 15 minutes.</p>
            </div>
          </m.section>

          {/* Lightning */}
          <m.section {...section(0.3)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Safety First
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Lightning Watch
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Live lightning sensors:</strong> We watch the Blitzortung network for strikes within 20km of the sauna.</p>
              <p><strong className="text-foreground font-normal">Storm cells:</strong> We also check Open-Meteo rain data on a grid up to 100km out for heavy storm cells.</p>
              <p><strong className="text-foreground font-normal">Checks every 30 seconds:</strong> While the page is open. If lightning is within 10km, or there&apos;s an active Met Éireann warning, the sauna page switches to a warning colour scheme.</p>
              <p><strong className="text-foreground font-normal">An aid, not a safety service:</strong> If you hear thunder, get out of the water.</p>
            </div>
          </m.section>

          {/* Lightning alerts (opt-in push) */}
          <m.section {...section(0.33)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Lightning Alerts
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Opt In, Sauna by Sauna
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Your choice:</strong> Turn on &quot;Lightning alerts for this sauna&quot; on any sauna page. You only hear about the saunas you pick.</p>
              <p><strong className="text-foreground font-normal">What triggers one:</strong> Lightning within 20km, 10km or 5km, or a storm cell approaching within about an hour.</p>
              <p><strong className="text-foreground font-normal">Checked every 5 minutes:</strong> Even when the site is closed.</p>
              <p><strong className="text-foreground font-normal">An aid, not a safety service:</strong> Alerts can be late or missed · always use your own judgement.</p>
            </div>
          </m.section>

          {/* Warnings & Marine */}
          <m.section {...section(0.35)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Official Warnings
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              From Met Éireann and the Met Office
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Only what matters to you:</strong> Saunas in the Republic get Met Éireann weather warnings, and Northern Ireland saunas get Met Office warnings · both filtered to your sauna&apos;s county where the warning names areas, not a list of things happening 200km away.</p>
              <p><strong className="text-foreground font-normal">Not yet in Great Britain:</strong> Saunas in Scotland, Wales and England don&apos;t get warnings yet.</p>
              <p><strong className="text-foreground font-normal">Sea conditions too:</strong> For the Republic, Met Éireann marine warnings (gale and small craft) so you know what you&apos;re dealing with before you get in the water.</p>
            </div>
          </m.section>

        </div>

      </div>
    </div>
  );
};

export default HowItWorks;