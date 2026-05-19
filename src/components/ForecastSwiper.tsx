import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { WindData, TideData } from '@/types/forecast';
import WeatherDayCard from './WeatherDayCard';
import TideDayCard from './TideDayCard';
import { build7Days, formatLongDate } from '@/lib/forecast-days';
import { useSyncedEmbla } from '@/hooks/use-synced-embla';

interface Props {
  wind: WindData;
  tideData: TideData;
  onDayChange?: (dayIndex: number) => void;
}

const ForecastSwiper = ({ wind, tideData, onDayChange }: Props) => {
  const days = useRef(build7Days()).current;
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  // Direction the user is currently swiping: -1 = back, 0 = idle, 1 = forward
  const [swipeDir, setSwipeDir] = useState<-1 | 0 | 1>(0);

  // Notify parent whenever the active day changes
  useEffect(() => {
    onDayChange?.(currentDayIndex);
  }, [currentDayIndex, onDayChange]);

  const emblaOptions = { align: 'start' as const, containScroll: 'trimSnaps' as const, loop: false };
  const [weatherRef, weatherApi] = useEmblaCarousel(emblaOptions);
  const [tideRef, tideApi] = useEmblaCarousel(emblaOptions);

  useSyncedEmbla(weatherApi, tideApi, setCurrentDayIndex);

  // Track scroll direction for the Weather ↔ Tides indicator
  useEffect(() => {
    if (!weatherApi) return;
    let lastProgress = weatherApi.scrollProgress();
    const onScroll = () => {
      const p = weatherApi.scrollProgress();
      const delta = p - lastProgress;
      if (Math.abs(delta) > 0.001) {
        setSwipeDir(delta > 0 ? 1 : -1);
      }
      lastProgress = p;
    };
    const onSettle = () => setSwipeDir(0);
    weatherApi.on('scroll', onScroll);
    weatherApi.on('settle', onSettle);
    return () => {
      weatherApi.off('scroll', onScroll);
      weatherApi.off('settle', onSettle);
    };
  }, [weatherApi]);

  const jumpTo = useCallback((idx: number) => {
    weatherApi?.scrollTo(idx);
    tideApi?.scrollTo(idx);
  }, [weatherApi, tideApi]);

  const todayKey = days[0].key;
  const currentDay = days[currentDayIndex];
  const isToday = currentDayIndex === 0;
  const isTomorrow = currentDayIndex === 1;

  const weatherForecast = wind.forecast ?? [];
  const tideForecast = tideData.forecast ?? [];

  // Memoised date-keyed lookups so children don't trigger rebuilds on every parent render.
  const weatherByDate = useMemo(
    () => new Map(weatherForecast.map(d => [d.date, d])),
    [weatherForecast],
  );
  const tideByDate = useMemo(
    () => new Map(tideForecast.map(d => [d.date, d])),
    [tideForecast],
  );

  // Shared Y-scale across the week so sparklines are visually comparable.
  const { globalMinH, globalMaxH } = useMemo(() => {
    const allHeights = tideForecast.flatMap(d => [
      ...(d.points ?? []).map(p => p.height_m),
      ...(d.events ?? []).map(e => e.height_m),
    ]);
    return {
      globalMinH: allHeights.length ? Math.min(...allHeights) : 0,
      globalMaxH: allHeights.length ? Math.max(...allHeights) : 1,
    };
  }, [tideForecast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      {/* Static date label — does not move when swiping */}
      <div className="text-center space-y-2">
        <p className="text-base font-medium text-foreground tracking-wide">
          {formatLongDate(currentDay.date, isToday, isTomorrow)}
        </p>

        {/* Jony Ive–inspired swipe indicator: precision rail + breathing chevrons */}
        <div className="flex items-center justify-center gap-3 pt-0.5" aria-hidden>
          <motion.svg
            width="14" height="10" viewBox="0 0 14 10"
            className="text-muted-foreground/40"
            animate={{ x: [0, -2, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M9 1 L4 5 L9 9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>

          <div className="flex items-center gap-[3px]">
            {days.map((d, i) => {
              const active = i === currentDayIndex;
              return (
                <motion.span
                  key={`rail-${d.key}`}
                  className="block rounded-full bg-foreground"
                  animate={{
                    width: active ? 18 : 4,
                    opacity: active ? 0.9 : 0.18,
                  }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  style={{ height: 2 }}
                />
              );
            })}
          </div>

          <motion.svg
            width="14" height="10" viewBox="0 0 14 10"
            className="text-muted-foreground/40"
            animate={{ x: [0, 2, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M5 1 L10 5 L5 9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </div>
      </div>

      {/* Stitched weather + tide card — single glass surface, hairline divider between */}
      <div className="glass-card rounded-lg overflow-hidden">
        {/* Weather carousel */}
        <div className="overflow-hidden" ref={weatherRef}>
          <div className="flex">
            {days.map((d) => (
              <div key={`w-${d.key}`} className="min-w-0 shrink-0 grow-0 basis-full">
                <WeatherDayCard
                  day={weatherByDate.get(d.key) ?? null}
                  fallbackWind={wind}
                  isToday={d.key === todayKey}
                  date={d.date}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Hairline divider with subtle Weather ↔ Tides swipe indicator */}
        <div className="relative mx-5 h-px bg-border/60" aria-hidden>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80 font-medium shadow-sm">
              <motion.span
                animate={{
                  opacity: swipeDir === -1 ? 1 : 0.55,
                  color: swipeDir === -1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
                transition={{ duration: 0.2 }}
              >
                Weather
              </motion.span>
              <motion.span
                className="text-foreground/50"
                animate={{
                  x: swipeDir === 1 ? 1.5 : swipeDir === -1 ? -1.5 : 0,
                  opacity: swipeDir === 0 ? 0.5 : 0.9,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                ↔
              </motion.span>
              <motion.span
                animate={{
                  opacity: swipeDir === 1 ? 1 : 0.55,
                  color: swipeDir === 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
                transition={{ duration: 0.2 }}
              >
                Tides
              </motion.span>
            </div>
          </div>
        </div>

        {/* Tide carousel */}
        <div className="overflow-hidden" ref={tideRef}>
          <div className="flex">
            {days.map((d) => {
              const weatherDay = weatherByDate.get(d.key) ?? null;
              return (
                <div key={`t-${d.key}`} className="min-w-0 shrink-0 grow-0 basis-full">
                  <TideDayCard
                    day={tideByDate.get(d.key) ?? null}
                    currentHeight={tideData.current_height_m}
                    currentState={tideData.state}
                    isToday={d.key === todayKey}
                    globalMinH={globalMinH}
                    globalMaxH={globalMaxH}
                    sunrise={weatherDay?.sunrise}
                    sunset={weatherDay?.sunset}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ForecastSwiper;
