import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import AppFooter from '@/components/AppFooter';

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
        <motion.header {...section(0)} className="pb-8 relative">
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
            We built Irish Saunas because we love the coast but hate surprises. Whether you're checking the tides for a swim, finding a sauna to warm up after, or keeping an eye on the sky when the kids and dog are with you—this app is here to help.
          </p>
        </motion.header>

        {/* Philosophy */}
        <motion.section {...section(0.1)} className="pb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every number you see comes straight from the source. No made-up data, no forecasts from yesterday. Here's what we track and where it comes from.
          </p>
        </motion.section>

        <div className="space-y-8">
          {/* Location Selector */}
          <motion.section {...section(0.12)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Locations
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              40+ Spots Along the Coast
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Pinpoint accuracy:</strong> We don't give you a generic "County Kerry" forecast. Every beach has its own exact coordinates, tide station, and local weather point.</p>
              <p><strong className="text-foreground font-normal">Saunas nearby:</strong> From Samhradh's in Cromane to Salt & Ember in Bundoran, if there's a sauna close by, you'll see a booking button right there.</p>
              <p><strong className="text-foreground font-normal">Remembers where you are:</strong> Pick your spot once and it'll be there waiting next time you open the app.</p>
            </div>
          </motion.section>

          {/* Tides */}
          <motion.section {...section(0.15)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Tides
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Real Tide Data from the Marine Institute
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Actually local:</strong> The tide at Dingle isn't the same as Fenit. We calculate exactly how long the tidal wave takes to reach your specific beach.</p>
              <p><strong className="text-foreground font-normal">Makes sense on the ground:</strong> We convert the raw numbers into depths you'd actually see at the shoreline, not some abstract measurement.</p>
              <p><strong className="text-foreground font-normal">Updates every hour:</strong> The chart refreshes regularly so you always know where you are between high and low water.</p>
            </div>
          </motion.section>

          {/* Conditions */}
          <motion.section {...section(0.2)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Conditions
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Weather for Your Exact Spot
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Not a county average:</strong> Wind and temperature readings are pinned to your specific stretch of coast via Open-Meteo.</p>
              <p><strong className="text-foreground font-normal">Wind you can understand:</strong> We show speeds in knots on the Beaufort scale—so "Force 4" actually means something if you're heading out on the water.</p>
              <p><strong className="text-foreground font-normal">How cold it really feels:</strong> The "feels like" temp factors in wind chill from the nearest Met Éireann station (Valentia, Roches Point, etc.).</p>
            </div>
          </motion.section>

          {/* Pollen */}
          <motion.section {...section(0.25)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Air Quality
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Pollen Counts That Matter
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">The main culprits:</strong> We track Grass and Birch pollen—the two that usually cause trouble for people on Irish coasts.</p>
              <p><strong className="text-foreground font-normal">Plain English:</strong> Instead of throwing raw numbers at you, we translate them into simple warnings: Low, Moderate, High, or Very High.</p>
            </div>
          </motion.section>

          {/* Lightning */}
          <motion.section {...section(0.3)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Safety First
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Lightning & Storm Tracking
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you've got the dog and kids on the beach, you need to know about storms before they arrive. Here's how we watch the sky for you:
            </p>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3 mt-2">
              <p><strong className="text-foreground font-normal">Live lightning sensors:</strong> We're connected to the Blitzortung network, tracking real strikes within 20km of where you are.</p>
              <p><strong className="text-foreground font-normal">Storm radar:</strong> Our system watches heavy rain cells across a 100km area, figures out how fast they're moving, and tells you roughly when they might hit.</p>
              <p><strong className="text-foreground font-normal">Checks every 30 seconds:</strong> Because storms don't wait, this is the fastest-updating part of the app.</p>
            </div>
          </motion.section>

          {/* Warnings & Marine */}
          <motion.section {...section(0.35)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Official Warnings
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Straight from Met Éireann
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground font-normal">Only what matters to you:</strong> We pull the official warnings and filter them so you see alerts for your county—not a list of things happening 200km away.</p>
              <p><strong className="text-foreground font-normal">Sea conditions too:</strong> Small craft warnings and offshore forecasts so you know what you're dealing with before you get in the water.</p>
            </div>
          </motion.section>

          {/* Push Notifications */}
          <motion.section {...section(0.37)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Alerts
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Phone Notifications When It Matters
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you allow notifications, we'll give you a heads-up when conditions change. Four levels, from a gentle reminder to get-the-kids-inside-now:
            </p>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3 mt-2">
              <p><strong className="text-foreground font-normal">Atmosphere Charging:</strong> The air's getting unstable. Just a quiet nudge to keep an eye on the horizon.</p>
              <p><strong className="text-foreground font-normal">Storm Approaching:</strong> Heavy rain is heading your way with an estimated arrival time.</p>
              <p><strong className="text-foreground font-normal">Lightning Warning:</strong> Actual strikes detected within 10km. Time to pack up the towels.</p>
              <p><strong className="text-foreground font-normal">Immediate Danger:</strong> Lightning within 5km. Get everyone to shelter now.</p>
            </div>
          </motion.section>
        </div>

        <AppFooter delay={0.5} />
      </div>
    </div>
  );
};

export default HowItWorks;