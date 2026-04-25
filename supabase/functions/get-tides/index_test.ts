// Deno tests that lock in the chart-datum scale invariant for the tide endpoint.
// We don't hit ERDDAP — we feed buildResponse() recorded rows and assert the
// current height, high/low events, and continuous curve points all share a
// single Chart Datum (LAT) scale. This is what was broken before (continuous
// data was being double-offset) and what caused the broken graph on both
// desktop and mobile, so guard it with assertions.

import {
  assert,
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildResponse } from "./index.ts";

// ---------------------------------------------------------------------------
// Fixture: a real Fenit response shape, trimmed.
// HighLow rows are [time, category, Water_Level_ODMalin] — OD Malin datum.
// Continuous rows are [time, Water_Level] — already on local LAT.
// chartDatumOffset for Fenit = 2.67m (OD Malin → LAT).
// ---------------------------------------------------------------------------
function makeFenitFixture(now: Date) {
  // Use OD Malin values for HL: high 1.03 (+2.67 = 3.70 LAT), low -0.77 (+2.67 = 1.90 LAT)
  const hl = {
    table: {
      rows: [
        // Earlier high tide (already passed)
        [
          new Date(now.getTime() - 1 * 3600_000).toISOString(),
          "HIGH",
          1.03,
        ],
        // Upcoming low tide
        [
          new Date(now.getTime() + 5 * 3600_000).toISOString(),
          "LOW",
          -0.77,
        ],
        // Following high tide
        [
          new Date(now.getTime() + 11 * 3600_000).toISOString(),
          "HIGH",
          1.23,
        ],
      ],
    },
  };

  // Continuous points: already in LAT. Build a tidy half-cosine between the
  // events around `now`. Heights span 1.90m → 3.70m. The point closest to
  // `now` should be ~3.5m so we can verify currentHeight matches.
  const cont = { table: { rows: [] as any[][] } };
  const startMs = now.getTime() - 2 * 3600_000;
  const endMs = now.getTime() + 11 * 3600_000;
  const stepMs = 30 * 60_000;
  const HIGH_LAT = 3.70;
  const LOW_LAT = 1.90;
  const mid = (HIGH_LAT + LOW_LAT) / 2;
  const amp = (HIGH_LAT - LOW_LAT) / 2;
  // Set period so we cross min/max at the right places for our HL events.
  const periodMs = 12.42 * 3600_000;
  for (let t = startMs; t <= endMs; t += stepMs) {
    // Anchor: previous high was at now-1h → cosine at 0 = HIGH.
    const phase = ((t - (now.getTime() - 1 * 3600_000)) / periodMs) * 2 * Math.PI;
    const heightLAT = mid + amp * Math.cos(phase);
    cont.table.rows.push([new Date(t).toISOString(), heightLAT]);
  }

  return { hl, cont };
}

// ---------------------------------------------------------------------------
// Test 1 — current height, events, and curve points all live on the same scale.
// ---------------------------------------------------------------------------
Deno.test("tide datum: current, events, and continuous points share one scale", () => {
  const now = new Date("2026-04-25T10:00:00Z");
  const data = makeFenitFixture(now);
  const offsetMs = 25 * 60_000; // Fenit
  const chartDatumOffset = 2.67;

  const res = buildResponse(data, now, offsetMs, chartDatumOffset);

  // Sanity: events were converted from OD Malin to LAT.
  const high = res.events.find((e: any) => e.type === "high");
  const low = res.events.find((e: any) => e.type === "low");
  assert(high, "expected a high event");
  assert(low, "expected a low event");
  assertAlmostEquals(high!.height_m, 3.7, 0.05, "HW should be 3.7m LAT");
  assertAlmostEquals(low!.height_m, 1.9, 0.05, "LW should be 1.9m LAT");

  // The whole point of this test: the curve, the dots, and the Now marker must
  // all be drawable on a single y-axis. That requires `current_height_m` and
  // every continuous point to fall inside (or very close to) the [LW, HW] band
  // implied by the events — i.e. NOT shifted by an extra +2.67m offset.
  const allEventHeights = res.events.map((e: any) => e.height_m);
  const eventMin = Math.min(...allEventHeights);
  const eventMax = Math.max(...allEventHeights);

  const todaysPoints = (res.forecast?.[0]?.points ?? []) as Array<{ height_m: number }>;
  assert(todaysPoints.length > 0, "expected continuous points for today");

  const pointMin = Math.min(...todaysPoints.map((p) => p.height_m));
  const pointMax = Math.max(...todaysPoints.map((p) => p.height_m));

  // Allow a small tolerance for sampling at endpoints.
  const TOL = 0.3;
  assert(
    pointMin >= eventMin - TOL && pointMax <= eventMax + TOL,
    `Continuous points (${pointMin.toFixed(2)}–${pointMax.toFixed(2)}m) must sit ` +
      `within event range (${eventMin}–${eventMax}m). A scale mismatch usually ` +
      `means chartDatumOffset was applied twice to the continuous dataset.`,
  );

  // Current height must also live inside the event band — never above the
  // day's high tide or below the day's low tide.
  assert(
    res.current_height_m >= eventMin - TOL &&
      res.current_height_m <= eventMax + TOL,
    `current_height_m (${res.current_height_m}m) is outside event range ` +
      `(${eventMin}–${eventMax}m). This is the bug that broke the graph.`,
  );

  // Stronger: current_height_m should agree with the continuous point closest
  // to `now` to within rounding (both are computed from the same source).
  const nowMs = now.getTime();
  const closestPoint = todaysPoints.reduce((best, p) => {
    const ts = new Date((p as any).timestamp).getTime();
    return Math.abs(ts - nowMs) < Math.abs(new Date((best as any).timestamp).getTime() - nowMs)
      ? p
      : best;
  });
  assertAlmostEquals(
    res.current_height_m,
    closestPoint.height_m,
    0.15,
    "current_height_m must match the nearest continuous point on the same datum",
  );
});

// ---------------------------------------------------------------------------
// Test 2 — regression guard: if the offset is ever applied twice to the
// continuous dataset, current_height_m would jump above the day's high tide.
// ---------------------------------------------------------------------------
Deno.test("tide datum: guards against double-offset on continuous data", () => {
  const now = new Date("2026-04-25T10:00:00Z");
  const data = makeFenitFixture(now);
  const res = buildResponse(data, now, 25 * 60_000, 2.67);

  const eventMax = Math.max(...res.events.map((e: any) => e.height_m));
  // Pre-fix this number was ~5.1m for Fenit while eventMax was 3.7m.
  // We assert the bug is gone with a strict ceiling.
  assert(
    res.current_height_m <= eventMax + 0.2,
    `current_height_m=${res.current_height_m} exceeds eventMax=${eventMax}. ` +
      `Looks like the OD Malin → LAT offset is being applied to ` +
      `Water_Level continuous rows, which already are on LAT.`,
  );
});

// ---------------------------------------------------------------------------
// Test 3 — different chartDatumOffset values shift only the events, never
// the continuous points, so the two streams stay on the same datum.
// ---------------------------------------------------------------------------
Deno.test("tide datum: chartDatumOffset only shifts HighLow events", () => {
  const now = new Date("2026-04-25T10:00:00Z");
  const data = makeFenitFixture(now);

  const a = buildResponse(data, now, 25 * 60_000, 2.0);
  const b = buildResponse(data, now, 25 * 60_000, 3.0);

  // Events shift by exactly the offset delta (1.0m).
  const aHigh = a.events.find((e: any) => e.type === "high")!.height_m;
  const bHigh = b.events.find((e: any) => e.type === "high")!.height_m;
  assertAlmostEquals(bHigh - aHigh, 1.0, 0.05);

  // Continuous points are identical regardless of the offset (they're LAT).
  const aPoints = a.forecast[0].points;
  const bPoints = b.forecast[0].points;
  assertEquals(aPoints.length, bPoints.length);
  for (let i = 0; i < aPoints.length; i++) {
    assertEquals(aPoints[i].height_m, bPoints[i].height_m);
  }

  // current_height_m must NOT change with the offset either.
  assertEquals(a.current_height_m, b.current_height_m);
});
