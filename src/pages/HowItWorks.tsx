import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

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
            Cromane Watch is a single-purpose tool built to answer one question:
            <em className="text-foreground font-normal"> what's happening outside right now?</em>
          </p>
        </motion.header>

        {/* Philosophy */}
        <motion.section {...section(0.1)} className="pb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every card on the dashboard pulls from a real data source — no guesswork, no stale
            forecasts left over from yesterday. The app polls these sources continuously so you're
            always looking at the freshest picture available. Here's exactly where each piece comes
            from and why we trust it.
          </p>
        </motion.section>

        <div className="space-y-8">
          {/* Tides */}
          <motion.section {...section(0.15)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Tides
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Marine Institute ERDDAP — Fenit Station
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tide predictions come directly from Ireland's Marine Institute via their ERDDAP
              scientific data server. We use the Fenit tidal station — the closest monitored point
              to Cromane — and apply a <strong className="text-foreground font-normal">+25 minute offset</strong> to
              account for the time it takes the tidal wave to travel up Castlemaine Harbour.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A <strong className="text-foreground font-normal">+2.53m datum conversion</strong> translates the raw LAT
              (Lowest Astronomical Tide) readings into heights you'd actually recognise at the
              shore. The tide graph interpolates your current position between known high and low
              events, refreshing every hour.
            </p>
          </motion.section>

          {/* Conditions */}
          <motion.section {...section(0.2)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Conditions
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Open-Meteo — Hyper-local Weather
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wind speed, direction, temperature, cloud cover, and precipitation all come from
              Open-Meteo's open-source weather API. We request data pinned to Cromane's exact
              coordinates (52.11°N, 9.89°W), so you're not getting a generic "Kerry" forecast —
              you're getting <em>this</em> stretch of coast.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wind speeds are converted to knots and mapped onto the Beaufort scale with plain-language
              labels. Water temperature, feels-like, sunrise, and sunset are all derived from the same
              request. The conditions card refreshes every 15 minutes.
            </p>
          </motion.section>

          {/* Lightning */}
          <motion.section {...section(0.25)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Lightning
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Blitzortung Community Network + Storm Intelligence
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Lightning detection uses a "sensor-direct" approach. We connect to the Blitzortung
              community network — a global array of volunteer-operated lightning detectors — via
              real-time WebSocket feeds. Strikes within range of Cromane are cached with a 30-minute
              rolling window.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              On top of raw strike data, a custom <strong className="text-foreground font-normal">Storm Intelligence engine</strong> tracks
              heavy rainfall cells across a spatial grid of 16 polling points at 50km and 100km radii.
              It calculates velocity vectors and estimates arrival times. This is further enhanced by
              Open-Meteo's Lightning Potential Index (LPI) and CAPE values for predictive nowcasting.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This card polls every 30 seconds — the fastest refresh rate in the app — because
              when lightning is approaching, minutes matter.
            </p>
          </motion.section>

          {/* Warnings */}
          <motion.section {...section(0.3)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Met Éireann Warnings
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Met Éireann — Direct HTML Parsing
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Weather warnings are scraped directly from Met Éireann's official warnings page
              (met.ie/warnings) using regex-based parsing. We chose this approach deliberately:
              the official JSON and XML feeds can be stale or inconsistent, but the public-facing
              HTML page is always current.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We filter for warnings that mention <strong className="text-foreground font-normal">Kerry</strong>,{' '}
              <strong className="text-foreground font-normal">Munster</strong>, or{' '}
              <strong className="text-foreground font-normal">Ireland</strong> — casting a wider net to catch
              late-addition regional alerts. The colour-coded levels (yellow, orange, red) match Met
              Éireann's own system exactly. This refreshes every 5 minutes.
            </p>
          </motion.section>

          {/* Marine */}
          <motion.section {...section(0.35)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Marine Forecast
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Met Éireann — Southwest Coast Marine
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The marine card pulls the current small craft warning and sea area forecast for the
              Southwest Coast from the same Met Éireann parsing pipeline as the warnings card.
              It tells you whether conditions offshore are noteworthy — useful context even if
              you're staying on the beach.
            </p>
          </motion.section>

          {/* Architecture note */}
          <motion.section {...section(0.4)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Under the Hood
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All external API calls run through backend functions — the app never
              contacts third-party services directly from your browser. This means your data stays
              private, requests are rate-limited and cached, and the app continues to work with
              locally cached data if your connection drops.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you pull to refresh, every data source is re-fetched simultaneously. When you
              don't, each card manages its own polling interval — fast for lightning, relaxed for
              tides — so you're never waiting for data you don't need.
            </p>
          </motion.section>
        </div>

        {/* Footer */}
        <motion.footer {...section(0.5)} className="pt-12 pb-12 text-center">
          <p className="text-[10px] text-muted-foreground/40 tracking-wider uppercase">
            Cromane Watch · Built for the shore
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default HowItWorks;
