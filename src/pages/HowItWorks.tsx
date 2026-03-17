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
            This app is built to answer one question:
            <em className="text-foreground font-normal"> what's happening outside right now?</em>
            {' '}Pick your location from 20 Irish coastal towns and beaches, and every card updates with live data for that spot.
          </p>
        </motion.header>

        {/* Philosophy */}
        <motion.section {...section(0.1)} className="pb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every card on the dashboard pulls from a real data source. No guesswork, no stale
            forecasts left over from yesterday. The app polls these sources continuously so you're
            always looking at the freshest picture available. Here's exactly where each piece comes
            from and why we trust it.
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
              20 Coastal Towns, Beaches & Swimming Spots
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tap the location name at the top of the screen to switch between spots along the Irish coast. The app covers Kerry, Cork, Clare, Galway, Sligo, Donegal, Dublin, Waterford, and Wexford. Each location has its own coordinates, its nearest tide station, and a local Met Éireann observation point, so the data you see is genuinely tied to that stretch of coastline.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your selected location is remembered between visits. When you switch, all five cards re-fetch with the new coordinates.
            </p>
          </motion.section>

          {/* Tides */}
          <motion.section {...section(0.15)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Tides
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Marine Institute ERDDAP
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tide predictions come directly from Ireland's Marine Institute via their ERDDAP scientific data server. Each location is mapped to its nearest monitored station (Fenit, Galway, Ballyglass, Cobh, and others), with a time offset applied to account for how long it takes the tidal wave to reach that particular harbour or beach.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A <strong className="text-foreground font-normal">+2.53m datum conversion</strong> translates the raw readings into heights you'd actually recognise at the shore. The tide graph shows your current position between known high and low events, and it refreshes every hour.
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
              Open-Meteo Weather
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wind speed, direction, temperature, cloud cover, and precipitation all come from Open-Meteo's open source weather API. We request data pinned to your selected location's exact coordinates, so you're not getting a generic county forecast. You're getting <em>this</em> stretch of coast.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wind speeds are converted to knots and mapped onto the Beaufort scale with plain language labels. The weather icon beside the compass reflects current conditions at a glance: sun, cloud, rain, snow, fog, or thunderstorm. Water temperature comes from the marine API, and the feels like reading is sourced from the nearest Met Éireann observation station (Valentia for Kerry, Roches Point for Cork, Shannon for Clare, and so on). This card refreshes every 15 minutes.
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
              Lightning detection uses a sensor direct approach. We connect to the Blitzortung community network, a global array of volunteer operated lightning detectors, via real time WebSocket feeds. Strikes within 20km of your selected location are cached with a 30 minute rolling window.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              On top of raw strike data, a custom <strong className="text-foreground font-normal">Storm Intelligence engine</strong> tracks heavy rainfall cells across a spatial grid of 16 polling points at 50km and 100km radii around your location. It calculates velocity vectors and estimates arrival times. This is further enhanced by Open-Meteo's Lightning Potential Index (LPI) and CAPE values for predictive nowcasting.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This card polls every 30 seconds, the fastest refresh rate in the app, because when lightning is approaching, minutes matter.
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
              Met Éireann Warnings
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Weather warnings are scraped directly from Met Éireann's official warnings page (met.ie/warnings) using pattern based parsing. We chose this approach deliberately: the official JSON and XML feeds can be stale or inconsistent, but the public facing HTML page is always current.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Warnings are filtered to match your selected location's county and province. If you've chosen Bundoran, you'll see warnings for Donegal and Ulster. If you've chosen Lahinch, you'll see Clare and Munster. National warnings that mention all of Ireland are always shown regardless. The colour coded levels (yellow, orange, red) match Met Éireann's own system exactly. This refreshes every 5 minutes.
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
              Marine Warnings
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The marine card pulls the current small craft warning and sea area forecast from the same Met Éireann parsing pipeline as the warnings card. It tells you whether conditions offshore are noteworthy, useful context even if you're staying on the beach.
            </p>
          </motion.section>

          {/* Push Notifications */}
          <motion.section {...section(0.37)} className="space-y-3">
            <div className="border-t border-border/30 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Push Notifications
              </p>
            </div>
            <h2 className="text-base font-normal text-foreground">
              Lightning Alerts Sent to Your Phone
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you first open the app, it asks permission to send push notifications. If you allow it, the app registers your device so it can reach you even when your browser is closed.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Notifications are triggered automatically based on the lightning monitoring system. There are four escalation stages, each with a clear message so you know exactly what's happening:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-1">
              <li>
                <strong className="text-foreground font-normal">Atmosphere Charging</strong> — conditions are becoming favourable for thunderstorms. The Lightning Potential Index or CAPE values have crossed a threshold. This is a heads up, not an alarm.
              </li>
              <li>
                <strong className="text-foreground font-normal">Storm Approaching</strong> — the Storm Intelligence engine has detected a heavy rainfall cell moving toward your location. You'll see the direction it's coming from and an estimated arrival time, typically within 60 minutes.
              </li>
              <li>
                <strong className="text-foreground font-normal">Lightning Warning</strong> — real strikes have been detected within 10km by the Blitzortung sensor network. Time to pay attention.
              </li>
              <li>
                <strong className="text-foreground font-normal">Immediate Danger</strong> — lightning has struck within 5km. The message is simple: seek shelter. Take your pets inside.
              </li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              There's a 15 minute cooldown between notifications of the same type, so you won't be bombarded. Alerts only escalate; you won't get a lower level notification if you've already received a higher one recently.
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
              All external API calls run through backend functions. The app never contacts third party services directly from your browser. This means your data stays private, requests are rate limited and cached, and the app continues to work with locally cached data if your connection drops.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you pull to refresh, every data source is re-fetched simultaneously. When you don't, each card manages its own polling interval: fast for lightning, relaxed for tides. You're never waiting for data you don't need.
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
