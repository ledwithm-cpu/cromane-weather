import { useMemo } from 'react';
import { TideForecastDay } from '@/types/forecast';
import { useLocation } from '@/features/location/hooks/use-location';
import { buildTideSparkline } from '@/features/tides/lib/tide-sparkline';

interface Props {
  day: TideForecastDay | null;
  currentHeight: number;
  currentState: 'rising' | 'falling';
  isToday: boolean;
  globalMinH: number;
  globalMaxH: number;
  sunrise?: string;
  sunset?: string;
}

const TideDayCard = ({
  day, currentHeight, currentState, isToday, globalMinH, globalMaxH, sunrise, sunset,
}: Props) => {
  const { location } = useLocation();
  const isIrish = !location.country || location.country === 'Ireland';
  const events = day?.events ?? [];
  const predictionPoints = day?.points ?? [];
  const highs = events.filter(e => e.type === 'high');
  const lows = events.filter(e => e.type === 'low');

  const sparkPoints = useMemo(
    () => buildTideSparkline({
      points: predictionPoints,
      events,
      globalMinH,
      globalMaxH,
      isToday,
      currentHeight,
    }),
    [predictionPoints, events, globalMinH, globalMaxH, isToday, currentHeight],
  );

  if (!isIrish) {
    return (
      <div className="px-5 py-6 space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Tides · {location.name}
        </p>
        <p className="text-sm font-normal text-foreground">UK tides coming soon</p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          Live tide times for UK saunas aren't wired up yet. Check the UK Hydrographic Office in the meantime.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-2.5">
      <div className="flex items-center justify-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Tides · {location.name}
        </p>
      </div>

      {sparkPoints && (
        <div className="relative -mx-1">
          <svg
            viewBox={`0 0 ${sparkPoints.W} ${sparkPoints.H}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: 32, overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="tide-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[6, 12, 18].map(h => {
              const x = (h / 24) * sparkPoints.W;
              return (
                <line
                  key={h}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={sparkPoints.H - 2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="0.4"
                  strokeOpacity="0.18"
                  strokeDasharray="1.5 2.5"
                />
              );
            })}
            <line x1={0} y1={sparkPoints.H - 2} x2={sparkPoints.W} y2={sparkPoints.H - 2} stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.5" />
            <path d={sparkPoints.dArea} fill="url(#tide-fill)" stroke="none" />
            <path d={sparkPoints.d} fill="none" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.5" strokeLinecap="round" />
            {sparkPoints.markers.map((m, i) => (
              <circle
                key={i}
                cx={m.x}
                cy={m.y}
                r="2.5"
                fill={m.type === 'high' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)'}
              />
            ))}
            {sparkPoints.now && (
              <g>
                <line
                  x1={sparkPoints.now.x}
                  y1={0}
                  x2={sparkPoints.now.x}
                  y2={sparkPoints.H - 2}
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.75"
                  strokeOpacity="0.45"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={sparkPoints.now.x}
                  cy={sparkPoints.now.y}
                  r="3"
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth="1.25"
                />
                <text
                  x={Math.max(20, Math.min(sparkPoints.W - 20, sparkPoints.now.x))}
                  y={Math.max(6, sparkPoints.now.y - 9)}
                  textAnchor="middle"
                  fill="hsl(var(--primary))"
                  fontSize="7.5"
                  fontWeight="500"
                  style={{ letterSpacing: '0.05em', paintOrder: 'stroke' }}
                  stroke="hsl(var(--background))"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                >
                  {currentHeight}m {currentState === 'rising' ? '↑' : '↓'}
                </text>
              </g>
            )}
          </svg>
          <div className="flex justify-between text-[9px] text-muted-foreground/60 px-0.5 mt-0.5 tracking-wider">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tide data for this day
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground text-center">
              ▲ High Tide
            </p>
            {highs.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center">—</p>
            )}
            {highs.map((e, i) => (
              <div key={i} className="text-center">
                <p className="text-base font-light tabular-nums text-foreground leading-tight">{e.time}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{e.height_m}m</p>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground text-center">
              ▼ Low Tide
            </p>
            {lows.length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center">—</p>
            )}
            {lows.map((e, i) => (
              <div key={i} className="text-center">
                <p className="text-base font-light tabular-nums text-foreground leading-tight">{e.time}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{e.height_m}m</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(sunrise || sunset) && (
        <div className="flex items-center justify-center gap-7 pt-2 text-[11px] font-medium tracking-[0.08em] text-foreground/75">
          {sunrise && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <span className="text-muted-foreground/70" aria-hidden>☀</span>
              {sunrise}
            </span>
          )}
          {sunset && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <span className="text-muted-foreground/70" aria-hidden>☽</span>
              {sunset}
            </span>
          )}
        </div>
      )}

      {location.saunaUrl && (
        <div className="pt-0.5">
          <button
            onClick={() => window.open(location.saunaUrl!, '_blank', 'noopener,noreferrer')}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 active:scale-[0.97] transition-all rounded-md px-4 py-2 tracking-wide"
          >
            Book {location.saunaName ?? 'Sauna'}
            <span className="text-primary/60">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TideDayCard;
