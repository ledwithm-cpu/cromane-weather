import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { m } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WindData, TideData } from '@/types/forecast';
import WeatherDayCard from './WeatherDayCard';
import TideDayCard from '@/features/tides/components/TideDayCard';
import { build7Days, formatLongDate } from '@/features/weather/lib/forecast-days';
import { useSyncedEmbla } from '@/features/weather/hooks/use-synced-embla';
import { useDailyRollover } from '@/features/weather/hooks/use-daily-rollover';

interface Props {
  wind: WindData;
  tideData: TideData;
  onDayChange?: (dayIndex: number) => void;
}

const ForecastSwiper = ({ wind, tideData, onDayChange }: Props) => {
  // Rebuild the 7-day window whenever the Dublin calendar date rolls over,
  // so a backgrounded app silently re-anchors to "today" on resume.
  const dateKey = useDailyRollover();
  const days = useMemo(() => build7Days(), [dateKey]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  // Direction the user is currently swiping: -1 = back, 0 = idle, 1 = forward
  const [swipeDir, setSwipeDir] = useState<-1 | 0 | 1>(0);
  const [activeView, setActiveView] = useState<'weather' | 'tides'>('tides');

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

  // Sync newly visible carousel to current day when switching views
  useEffect(() => {
    if (activeView === 'weather') {
      weatherApi?.scrollTo(currentDayIndex);
    } else {
      tideApi?.scrollTo(currentDayIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Track current day from the visible carousel
  useEffect(() => {
    const api = activeView === 'weather' ? weatherApi : tideApi;
    if (!api) return;
    const onSelect = () => setCurrentDayIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [activeView, weatherApi, tideApi]);

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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      {/* Static date label — does not move when swiping */}
      <div className="text-center space-y-1.5">
        <p className="text-base font-medium text-foreground tracking-wide">
          {formatLongDate(currentDay.date, isToday, isTomorrow)}
        </p>
        <p className="text-[11px] text-muted-foreground/50 tracking-[0.08em]">
          Swipe to see the week ahead →
        </p>

        {/* Day-initial pagination with larger tappable arrows */}
        <div className="flex items-center justify-center gap-1 pt-1" aria-hidden>
          <button
            onClick={() => jumpTo(Math.max(0, currentDayIndex - 1))}
            className="p-2 -ml-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {days.map((d, i) => {
              const active = i === currentDayIndex;
              const initial = d.date.toLocaleDateString('en-GB', { weekday: 'narrow' });
              return (
                <button
                  key={`day-${d.key}`}
                  onClick={() => jumpTo(i)}
                  className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {initial}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => jumpTo(Math.min(days.length - 1, currentDayIndex + 1))}
            className="p-2 -mr-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stitched weather + tide card — single glass surface */}
      <div className="glass-card rounded-lg overflow-hidden">
        {/* WEATHER · TIDES toggle */}
        <div className="flex items-center justify-center gap-0.5 py-3 border-b border-border/30">
          <button
            onClick={() => setActiveView('weather')}
            className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.15em] font-medium transition-colors ${
              activeView === 'weather'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            Weather
          </button>
          <span className="text-muted-foreground/30 text-[11px]">·</span>
          <button
            onClick={() => setActiveView('tides')}
            className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.15em] font-medium transition-colors ${
              activeView === 'tides'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            Tides
          </button>
        </div>

        {activeView === 'weather' && (
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
        )}

        {activeView === 'tides' && (
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
                      sunrise={weatherDay?.sunrise ?? undefined}
                      sunset={weatherDay?.sunset ?? undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </m.div>
  );
};

export default ForecastSwiper;
