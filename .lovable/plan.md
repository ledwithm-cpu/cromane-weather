

## Problem
The tide sparklines render straight or flat-looking segments in some day cards. Three causes:

1. **Flat edges** — at 00:00 and 24:00 the curve is anchored to the *same height* as the first/last event of the day, creating a horizontal line into the day boundary.
2. **Bezier between two points only** — days with just 1 or 2 tide events produce a near-straight line because cubic Bezier with matching Y control points degenerates into something close to a straight segment.
3. **Bezier shape is wrong for tides** — tides between a high and a low follow a true sinusoid (cosine half-wave), not a generic smooth spline. The current control-point math (`cx, p[i].y` and `cx, p[i+1].y`) creates a flat-topped "S" rather than a proper wave crest.

## Fix
Rewrite the sparkline generator in `TideDayCard` to:

1. **Sample the curve as a true tidal sinusoid.** Between every consecutive pair of events (or extrapolated edge anchors), sample ~16 points using `y = mid + amp * cos(π * t)` where `t` goes 0→1 across the segment. This guarantees a real wave shape even with only 2 events.
2. **Extrapolate edges using tidal period (~6h12m).** Instead of flat-lining to the day boundary, project a virtual extremum before the first event and after the last event using the half-period offset and inverted height (high → low and vice versa). This gives a continuous wave entering and leaving the day.
3. **Render as a polyline** of the sampled points (no Bezier needed), which will look smooth and physically correct.
4. **Use a fixed Y-range across all 7 days** for that location (computed from the global min/max of the week) so sparklines are visually comparable day-to-day instead of each being auto-scaled to its own min/max (which can also exaggerate small variations into jagged lines).
5. **Guard against missing data** — if a day has 0 events, skip the sparkline (already done); if 1 event, still draw a wave by extrapolating both directions.

## Files touched
- `src/components/ForecastSwiper.tsx` — replace the `sparkPoints` IIFE inside `TideDayCard` and pass a shared `globalMin/globalMax` from the parent so all 7 days share a Y-scale.

## Out of scope
No edge function or data changes — purely a client-side rendering fix.

