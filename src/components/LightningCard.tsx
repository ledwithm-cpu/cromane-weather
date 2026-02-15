import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

export interface LightningData {
  alert_level: number; // 0=safe, 1=awareness, 2=warning, 3=danger
  strike_count: number;
  last_strike_time_ms: number | null;
  closest_strike: {
    distance_km: number;
    bearing_compass: string;
    bearing_deg: number;
  } | null;
  strikes: Array<{
    distance_km: number;
    bearing_compass: string;
    time_ms: number;
  }>;
  checked_at: number;
}

interface Props {
  data: LightningData;
}

const SAFE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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
  const [elapsed, setElapsed] = useState('');
  const [showPulse, setShowPulse] = useState(false);
  const [prevStrikeTime, setPrevStrikeTime] = useState<number | null>(null);

  // Determine if safe (no strikes in 30 min)
  const isSafe = !data.last_strike_time_ms || (Date.now() - data.last_strike_time_ms > SAFE_TIMEOUT_MS);
  const effectiveLevel = isSafe ? 0 : data.alert_level;

  // Trigger radial pulse when a new strike is detected
  useEffect(() => {
    if (data.last_strike_time_ms && data.last_strike_time_ms !== prevStrikeTime) {
      setPrevStrikeTime(data.last_strike_time_ms);
      if (prevStrikeTime !== null) {
        setShowPulse(true);
        // Trigger vibration for level 2+ (Web Vibration API)
        try {
          if (effectiveLevel >= 2 && navigator.vibrate) {
            navigator.vibrate(effectiveLevel >= 3 ? [200, 100, 200] : [100]);
          }
        } catch { /* vibration not supported in this context */ }
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
          new Notification('⚡ Lightning Alert — Cromane', {
            body: `Lightning Strike detected ${closestDistance}km ${closestBearing} of Cromane. Take cover.`,
            tag: 'lightning-alert',
          } as NotificationOptions);
        }
      } catch { /* Notifications not supported in this context */ }
    }
  }, [effectiveLevel, closestDistance, closestBearing]);

  // Request notification permission once
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* Notifications not available */ }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className={`glass-card rounded-lg p-6 space-y-4 relative overflow-hidden transition-colors duration-700 ${
        effectiveLevel >= 3 ? 'border-warning-red/40' :
        effectiveLevel >= 2 ? 'border-warning-orange/30' :
        effectiveLevel >= 1 ? 'border-border' : ''
      }`}
    >
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
          Lightning · Cromane
        </p>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
            effectiveLevel >= 3 ? 'bg-warning-red animate-pulse' :
            effectiveLevel >= 2 ? 'bg-warning-orange animate-pulse' :
            effectiveLevel >= 1 ? 'bg-accent' :
            'bg-muted-foreground/30'
          }`} />
          <span className={`text-[10px] uppercase tracking-wider ${alertColors[effectiveLevel]}`}>
            {effectiveLevel >= 1 ? 'Active' : 'Monitoring'}
          </span>
        </div>
      </div>

      {/* Status & Timer */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          {effectiveLevel >= 1 && (
            <Zap
              size={18}
              className={`${
                effectiveLevel >= 3 ? 'text-warning-red' :
                effectiveLevel >= 2 ? 'text-warning-orange' :
                'text-accent'
              }`}
              fill={effectiveLevel >= 2 ? 'currentColor' : 'none'}
            />
          )}
          <span className={`text-sm font-normal ${alertColors[effectiveLevel]}`}>
            {alertLabels[effectiveLevel]}
          </span>
        </div>

        {/* Time since last strike */}
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
            {data.strike_count} strike{data.strike_count !== 1 ? 's' : ''} detected within 50km
          </p>
        )}

        {/* Safe state */}
        {effectiveLevel === 0 && (
          <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
            No lightning activity within 50km for the past 30 minutes. Blitzortung community network.
          </p>
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
              ⚡ Lightning Strike detected {data.closest_strike.distance_km}km {data.closest_strike.bearing_compass} of Cromane. Take cover.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LightningCard;
