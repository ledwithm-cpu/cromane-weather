import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, FlaskConical, CloudLightning, Radar } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { LightningData } from '@/lib/mock-data';

interface Props {
  data: LightningData;
}

const SAFE_TIMEOUT_MS = 30 * 60 * 1000;
const RADAR_FRESH_MS = 6 * 60 * 1000; // 6 minutes

const alertLabels: Record<number, string> = {
  0: 'Atmosphere Stable',
  1: 'Lightning Awareness',
  2: 'Lightning Warning',
  3: 'Immediate Danger',
};

const alertColors: Record<number, string> = {
  0: 'text-muted-foreground',
  1: 'text-muted-foreground',
  2: 'text-warning-orange',
  3: 'text-warning-red',
};

const LightningCard = ({ data }: Props) => {
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState('');
  const [showPulse, setShowPulse] = useState(false);
  const [prevStrikeTime, setPrevStrikeTime] = useState<number | null>(null);

  const nowcast = data.nowcast;
  const nowcastLevel = nowcast?.nowcast_level ?? 0;

  // Determine if safe (no strikes in 30 min)
  const isSafe = !data.last_strike_time_ms || (Date.now() - data.last_strike_time_ms > SAFE_TIMEOUT_MS);
  const effectiveLevel = isSafe ? 0 : data.alert_level;

  // Combined display level: real-time strikes take priority, then nowcast
  const displayLevel = effectiveLevel > 0 ? effectiveLevel : (nowcastLevel >= 1 ? 1 : 0);

  // Radar health
  const radarSyncAge = nowcast?.radar_sync_ms ? Date.now() - nowcast.radar_sync_ms : Infinity;
  const radarFresh = radarSyncAge < RADAR_FRESH_MS;

  // Horizon gradient: storms 30-60 min out
  const showHorizon = nowcastLevel >= 1 && (nowcast?.eta_minutes ?? 999) > 30;
  const showHorizonClose = nowcastLevel >= 1 && (nowcast?.eta_minutes ?? 999) <= 30;

  // Trigger radial pulse when a new strike is detected
  useEffect(() => {
    if (data.last_strike_time_ms && data.last_strike_time_ms !== prevStrikeTime) {
      setPrevStrikeTime(data.last_strike_time_ms);
      if (prevStrikeTime !== null) {
        setShowPulse(true);
        try {
          if (effectiveLevel >= 2 && navigator.vibrate) {
            navigator.vibrate(effectiveLevel >= 3 ? [200, 100, 200] : [100]);
          }
        } catch { /* vibration not supported */ }
        setTimeout(() => setShowPulse(false), 2000);
      }
    }
  }, [data.last_strike_time_ms, prevStrikeTime, effectiveLevel]);

  // Timer: time since last strike
  const updateElapsed = useCallback(() => {
    if (!data.last_strike_time_ms) {
      setElapsed('--:--');
      return;
    }
    const diff = Math.max(0, Date.now() - data.last_strike_time_ms);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    setElapsed(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
  }, [data.last_strike_time_ms]);

  useEffect(() => {
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [updateElapsed]);

  // Web Notification for level 3
  const closestDistance = data.closest_strike?.distance_km ?? null;
  const closestBearing = data.closest_strike?.bearing_compass ?? null;
  useEffect(() => {
    if (effectiveLevel >= 3 && closestDistance !== null && closestBearing !== null) {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚡ Lightning Alert', {
            body: `Lightning detected ${closestDistance}km ${closestBearing}. Take your pets inside.`,
            tag: 'lightning-alert',
          } as NotificationOptions);
        }
      } catch { /* not supported */ }
    }
  }, [effectiveLevel, closestDistance, closestBearing]);

  // Request notification permission once
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* not available */ }
  }, []);

  const triggerTestAlert = useCallback(async () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lightning?test=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    });
    const testData = await res.json();
    queryClient.setQueryData(['lightning'], testData);
  }, [queryClient]);

  // Status text: prefer nowcast when no active strikes
  const statusText = effectiveLevel >= 1
    ? alertLabels[effectiveLevel]
    : nowcastLevel > 0
    ? nowcast?.status_text ?? 'Atmosphere Stable'
    : 'Atmosphere Stable';

  const statusColor = effectiveLevel >= 3
    ? 'text-warning-red'
    : effectiveLevel >= 2
    ? 'text-warning-orange'
    : nowcastLevel >= 1
    ? 'text-warning-orange'
    : nowcastLevel > 0
    ? 'text-accent'
    : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className={`glass-card rounded-lg p-6 space-y-4 relative overflow-hidden transition-colors duration-700 ${
        effectiveLevel >= 3 ? 'border-warning-red/40' :
        effectiveLevel >= 2 ? 'border-warning-orange/30' :
        displayLevel >= 1 ? 'border-warning-orange/20' :
        nowcastLevel > 0 ? 'border-accent/20' : ''
      }`}
    >
      {/* Horizon Gradient — distant storm darkening */}
      <AnimatePresence>
        {(showHorizon || showHorizonClose) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showHorizonClose ? 0.4 : 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="absolute inset-x-0 top-0 h-16 pointer-events-none z-0"
            style={{
              background: showHorizonClose
                ? 'linear-gradient(to bottom, hsla(25, 15%, 8%, 0.6), transparent)'
                : 'linear-gradient(to bottom, hsla(220, 20%, 12%, 0.4), transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Radial Pulse Animation */}
      <AnimatePresence>
        {showPulse && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 0.3, 0.6].map((delay) => (
              <motion.div
                key={delay}
                className="absolute rounded-full border border-accent/30"
                initial={{ width: 0, height: 0, opacity: 0.6 }}
                animate={{ width: 300, height: 300, opacity: 0 }}
                transition={{ duration: 1.8, delay, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Thunder &amp; Lightning
        </p>
        <div className="flex items-center gap-2">
          {/* Radar Health Indicator */}
          <div className="flex items-center gap-1" title={radarFresh ? 'Nowcast active' : 'Nowcast syncing...'}>
            <Radar size={10} className="text-muted-foreground/50" />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
              radarFresh ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            }`} />
          </div>
          {/* Alert Status Dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              effectiveLevel >= 2 || displayLevel >= 1
                ? 'bg-warning-red animate-pulse'
                : 'bg-emerald-500'
            }`}
            style={
              effectiveLevel >= 3
                ? { boxShadow: '0 0 12px 5px hsla(0, 80%, 50%, 0.7)' }
                : effectiveLevel >= 2 || displayLevel >= 1
                ? { boxShadow: '0 0 8px 3px hsla(0, 80%, 50%, 0.4)' }
                : undefined
            }
          />
          <span className={`text-[10px] uppercase tracking-wider ${
            displayLevel >= 1 || nowcastLevel > 0 ? statusColor : 'text-muted-foreground'
          }`}>
            {effectiveLevel >= 1 ? 'Active' : nowcastLevel >= 1 ? 'Tracking' : nowcastLevel > 0 ? 'Charging' : ''}
          </span>
        </div>
      </div>

      {/* Status & Timer */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          {(effectiveLevel >= 1 || nowcastLevel > 0) && (
            nowcastLevel > 0 && effectiveLevel === 0
              ? <CloudLightning size={18} className={statusColor} />
              : <Zap
                  size={18}
                  className={statusColor}
                  fill={effectiveLevel >= 2 ? 'currentColor' : 'none'}
                />
          )}
          <span className={`text-sm font-normal ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Nowcast ETA (when no active strikes but storm approaching) */}
        {effectiveLevel === 0 && nowcastLevel >= 1 && nowcast?.eta_minutes != null && (
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                Estimated Arrival
              </p>
              <span className="text-3xl font-light tabular-nums tracking-wide text-foreground">
                {nowcast.eta_minutes}
                <span className="text-lg text-muted-foreground ml-1">min</span>
              </span>
            </div>
            {nowcast.nearest_cell && (
              <div className="ml-auto text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                  From
                </p>
                <span className="text-lg font-light text-foreground">
                  {nowcast.nearest_cell.direction}
                </span>
                <p className="text-xs text-muted-foreground">
                  {nowcast.nearest_cell.distance_km}km
                </p>
              </div>
            )}
          </div>
        )}

        {/* Atmospheric charging (level 0.5) detail */}
        {effectiveLevel === 0 && nowcastLevel === 0.5 && (
          <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">
            LPI: {nowcast?.lpi?.toFixed(1)} J/kg · CAPE: {nowcast?.cape?.toFixed(0)} J/kg
          </p>
        )}

        {/* Time since last strike (active strikes) */}
        {effectiveLevel >= 1 && (
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                Since Last Strike
              </p>
              <span className="text-3xl font-light tabular-nums tracking-wide text-foreground">
                {elapsed}
              </span>
            </div>
            {data.closest_strike && (
              <div className="ml-auto text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                  Nearest
                </p>
                <span className="text-lg font-light tabular-nums text-foreground">
                  {data.closest_strike.distance_km}
                  <span className="text-sm text-muted-foreground ml-0.5">km</span>
                </span>
                <span className="text-xs text-muted-foreground ml-1.5">
                  {data.closest_strike.bearing_compass}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Strike count */}
        {data.strike_count > 0 && effectiveLevel >= 1 && (
          <p className="text-xs text-muted-foreground mt-3">
            {data.strike_count} strike{data.strike_count !== 1 ? 's' : ''} detected within 20km
          </p>
        )}

        {/* Safe state (no nowcast activity either) */}
        {effectiveLevel === 0 && nowcastLevel === 0 && (
          <>
            <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
              No lightning activity within 20km for the past 30 minutes.
            </p>
            <button
              onClick={triggerTestAlert}
              className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <FlaskConical size={12} />
              Test Alert
            </button>
          </>
        )}
      </div>

      {/* Level 3 danger banner */}
      <AnimatePresence>
        {effectiveLevel >= 3 && data.closest_strike && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 bg-warning-red/10 rounded p-3 border border-warning-red/20"
          >
            <p className="text-xs text-foreground font-medium">
              ⚡ Lightning detected {data.closest_strike.distance_km}km {data.closest_strike.bearing_compass}. Take your pets inside.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LightningCard;
