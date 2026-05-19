import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildGridPoints,
  computeNowcastScore,
  evaluateStormCell,
  pickNearestCell,
  type StormCell,
} from "./nowcast.ts";

// ─── evaluateStormCell ───
Deno.test("evaluateStormCell: returns null when precip is below threshold", () => {
  const cell = evaluateStormCell({ dist: 50, dir: "N" }, 1, 2, 0);
  assertEquals(cell, null);
});

Deno.test("evaluateStormCell: 100km cells are always approaching", () => {
  const cell = evaluateStormCell({ dist: 100, dir: "SW" }, 5, 3, 1);
  assertExists(cell);
  assertEquals(cell!.approaching, true);
  assertEquals(cell!.distance_km, 100);
  assertEquals(cell!.direction, "SW");
  // ETA = 100km / 40km/h * 60min = 150min
  assertEquals(cell!.eta_minutes, 150);
});

Deno.test("evaluateStormCell: 50km cell approaches only when precip > 2x home", () => {
  const farIntenser = evaluateStormCell({ dist: 50, dir: "W" }, 6, 1, 1);
  assertExists(farIntenser);
  assertEquals(farIntenser!.approaching, true);
  // ETA = 50/40*60 = 75min
  assertEquals(farIntenser!.eta_minutes, 75);

  const farWeaker = evaluateStormCell({ dist: 50, dir: "W" }, 5, 1, 4);
  assertExists(farWeaker);
  assertEquals(farWeaker!.approaching, false);
  assertEquals(farWeaker!.eta_minutes, null);
});

Deno.test("evaluateStormCell: nextPrecip alone can trigger inclusion", () => {
  const cell = evaluateStormCell({ dist: 50, dir: "N" }, 1, 8, 1);
  assertExists(cell);
  assertEquals(cell!.intensity_mm, 8);
});

// ─── pickNearestCell ───
Deno.test("pickNearestCell: returns null when no approaching cells", () => {
  const cells: StormCell[] = [
    { direction: "N", distance_km: 50, intensity_mm: 5, eta_minutes: null, approaching: false },
  ];
  assertEquals(pickNearestCell(cells), null);
});

Deno.test("pickNearestCell: picks lowest ETA among approaching cells", () => {
  const cells: StormCell[] = [
    { direction: "N", distance_km: 100, intensity_mm: 5, eta_minutes: 150, approaching: true },
    { direction: "W", distance_km: 50, intensity_mm: 5, eta_minutes: 75, approaching: true },
    { direction: "S", distance_km: 50, intensity_mm: 5, eta_minutes: null, approaching: false },
  ];
  const nearest = pickNearestCell(cells);
  assertExists(nearest);
  assertEquals(nearest!.direction, "W");
});

// ─── computeNowcastScore ───
Deno.test("computeNowcastScore: stable atmosphere → level 0", () => {
  const score = computeNowcastScore(0, 0, []);
  assertEquals(score.nowcast_level, 0);
  assertEquals(score.status_text, "Atmosphere Stable");
  assertEquals(score.atmospheric_alert, false);
});

Deno.test("computeNowcastScore: LPI > 0 → atmospheric alert (level 0.5)", () => {
  const score = computeNowcastScore(0.3, 100, []);
  assertEquals(score.nowcast_level, 0.5);
  assertEquals(score.atmospheric_alert, true);
});

Deno.test("computeNowcastScore: CAPE > 500 → atmospheric alert (level 0.5)", () => {
  const score = computeNowcastScore(0, 600, []);
  assertEquals(score.nowcast_level, 0.5);
  assertEquals(score.atmospheric_alert, true);
});

Deno.test("computeNowcastScore: approaching cell within 60min → level 1", () => {
  const cells: StormCell[] = [
    { direction: "W", distance_km: 50, intensity_mm: 5, eta_minutes: 45, approaching: true },
  ];
  const score = computeNowcastScore(0, 0, cells);
  assertEquals(score.nowcast_level, 1);
  assertEquals(score.eta_minutes, 45);
  assertEquals(score.status_text, "Storm Approaching: ETA 45 mins");
});

Deno.test("computeNowcastScore: ETA ≤30min produces directional status text", () => {
  const cells: StormCell[] = [
    { direction: "SW", distance_km: 30, intensity_mm: 8, eta_minutes: 20, approaching: true },
  ];
  const score = computeNowcastScore(0, 0, cells);
  assertEquals(score.nowcast_level, 1);
  assertEquals(
    score.status_text,
    "Storm Cell Detected: Approaching from SW. Estimated arrival: 20 minutes.",
  );
});

Deno.test("computeNowcastScore: approaching cell beyond 60min falls back to atmospheric scoring", () => {
  const cells: StormCell[] = [
    { direction: "N", distance_km: 100, intensity_mm: 5, eta_minutes: 150, approaching: true },
  ];
  const stable = computeNowcastScore(0, 0, cells);
  assertEquals(stable.nowcast_level, 0);
  const charging = computeNowcastScore(1, 0, cells);
  assertEquals(charging.nowcast_level, 0.5);
});

// ─── buildGridPoints ───
Deno.test("buildGridPoints: produces 16 points (8 bearings × 2 distances)", () => {
  const pts = buildGridPoints(52.1, -9.9);
  assertEquals(pts.length, 16);
  const dists = new Set(pts.map(p => p.dist));
  assertEquals(dists.has(50), true);
  assertEquals(dists.has(100), true);
  // Each compass direction appears at both distances.
  const dirs = new Set(pts.map(p => p.dir));
  assertEquals(dirs.size, 8);
});
