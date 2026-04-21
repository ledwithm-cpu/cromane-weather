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
            We built Irish Saunas to help you explore Ireland's coastline safely, discover local saunas, and know the exact conditions before heading out.
          </p>
        </motion.header>

        {/* Philosophy */}
        <motion.section {...section(0.1)} className="pb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every card on your dashboard pulls from real, hyper-local data sources. No guesswork, no stale forecasts left over from yesterday. Here is exactly what we track and why you can trust it.
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
              40+ Coastal Towns & Saunas
            </h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Hyper-Local Data</strong> · We don't use generic county forecasts. Every spot has its own exact coordinates, nearest tide station, and local observation point.
              </li>
              <li>
                <strong className="text-foreground font-normal">Book a Sauna</strong> · If there's a sauna nearby—from Samhradh's in Cromane to Salt & Ember in Bundoran—you'll find a direct booking link.
              </li>
              <li>
                <strong className="text-foreground font-normal">Smart Memory</strong> · Your selected location is remembered automatically for your next visit.
              </li>
            </ul>
          </motion.section>

          {/* Tides */}
          <motion.section {...section(0.15)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Tides
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Marine Institute Live Tides
            </h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Local Accuracy</strong> · We calculate the exact time offset for how long it takes the tidal wave to reach your specific beach or harbour.
              </li>
              <li>
                <strong className="text-foreground font-normal">Real-World Depths</strong> · We apply local datum conversions so the water heights you see match what you actually experience at the shore.
              </li>
              <li>
                <strong className="text-foreground font-normal">Always Fresh</strong> · The chart updates every hour, showing exactly where you are between high and low tide.
              </li>
            </ul>
          </motion.section>

          {/* Conditions */}
          <motion.section {...section(0.2)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Conditions
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Pinpoint Weather Data
            </h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Exact Coordinates</strong> · Wind, temperature, and rain data are pinned specifically to your stretch of coast via Open-Meteo.
              </li>
              <li>
                <strong className="text-foreground font-normal">Plain-Language Wind</strong> · We convert wind speeds to knots and display them using the standard, easy-to-read Beaufort scale.
              </li>
              <li>
                <strong className="text-foreground font-normal">"Feels Like" Temp</strong> · We factor in wind chill data from the nearest Met Éireann observation station to tell you how cold it actually feels.
              </li>
            </ul>
          </motion.section>

          {/* Pollen */}
          <motion.section {...section(0.25)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Air Quality
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Live Pollen Counts
            </h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Allergy Awareness</strong> · We track Grass and Birch pollen, the most common allergens for Irish coastal activities.
              </li>
              <li>
                <strong className="text-foreground font-normal">Clear Status Levels</strong> · Raw pollen grains are translated into simple "Low," "Moderate," "High," or "Very High" warnings.
              </li>
            </ul>
          </motion.section>

          {/* Lightning */}
          <motion.section {...section(0.3)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Safety First
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Lightning & Storm Intelligence
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you have pets or kids on the beach, minutes matter. We use a dual-approach to keep you safe:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Live Sensors</strong> · We connect to the Blitzortung community network to track real, active lightning strikes within 20km of your beach.
              </li>
              <li>
                <strong className="text-foreground font-normal">Storm Prediction</strong> · Our custom engine tracks heavy rainfall cells across a 100km grid, calculates their speed, and gives you an estimated time of arrival (ETA) before the storm hits.
              </li>
              <li>
                <strong className="text-foreground font-normal">Fastest Updates</strong> · Because storms move fast, this is the quickest card on the site, checking for new danger every 30 seconds.
              </li>
            </ul>
          </motion.section>

          {/* Warnings & Marine */}
          <motion.section {...section(0.35)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Official Warnings
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Met Éireann Direct
            </h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Land Warnings</strong> · We pull live, colour-coded warnings directly from Met Éireann, automatically filtering them so you only see alerts relevant to your county.
              </li>
              <li>
                <strong className="text-foreground font-normal">Marine Conditions</strong> · We track offshore small craft warnings and sea area forecasts so you have the full picture before swimming.
              </li>
            </ul>
          </motion.section>

          {/* Push Notifications */}
          <motion.section {...section(0.37)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Alerts
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Smart Push Notifications
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you allow push notifications, we'll ping your phone when danger approaches, escalating through four clear stages:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Atmosphere Charging</strong> · Conditions are becoming favourable for thunderstorms. A heads-up to keep an eye on the sky.
              </li>
              <li>
                <strong className="text-foreground font-normal">Storm Approaching</strong> · A heavy rainfall cell is heading your way, complete with an ETA.
              </li>
              <li>
                <strong className="text-foreground font-normal">Lightning Warning</strong> · Real strikes detected within 10km. Time to pack up.
              </li>
              <li>
                <strong className="text-foreground font-normal">Immediate Danger</strong> · Strikes within 5km. Seek shelter immediately.
              </li>
            </ul>
          </motion.section>
        </div>

        <AppFooter delay={0.5} />
      </div>
    </div>
  );
};

export default HowItWorks;