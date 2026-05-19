import {
  assert,
  assertAlmostEquals,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  bearing,
  bearingToCompass,
  destinationPoint,
  getAlertLevel,
  getCacheKey,
  haversine,
} from "./geofence.ts";

// Cromane reference point used by the lightning function.
const HOME_LAT = 52.1008;
const HOME_LON = -9.8856;

Deno.test("haversine: same point is zero km", () => {
  assertEquals(haversine(HOME_LAT, HOME_LON, HOME_LAT, HOME_LON), 0);
});

Deno.test("haversine: ~111 km per degree of latitude", () => {
  const d = haversine(0, 0, 1, 0);
  // Spherical earth approximation — should land around 111.19 km.
  assertAlmostEquals(d, 111.19, 0.5);
});

Deno.test("haversine: is symmetric", () => {
  const a = haversine(HOME_LAT, HOME_LON, 53.349, -6.260); // Dublin
  const b = haversine(53.349, -6.260, HOME_LAT, HOME_LON);
  assertAlmostEquals(a, b, 1e-9);
});

Deno.test("bearing: due north is 0°", () => {
  const b = bearing(HOME_LAT, HOME_LON, HOME_LAT + 0.1, HOME_LON);
  assertAlmostEquals(b, 0, 0.5);
});

Deno.test("bearing: due east is 90°", () => {
  const b = bearing(HOME_LAT, HOME_LON, HOME_LAT, HOME_LON + 0.1);
  assertAlmostEquals(b, 90, 0.5);
});

Deno.test("bearing: due south is 180°", () => {
  const b = bearing(HOME_LAT, HOME_LON, HOME_LAT - 0.1, HOME_LON);
  assertAlmostEquals(b, 180, 0.5);
});

Deno.test("bearing: due west is 270°", () => {
  const b = bearing(HOME_LAT, HOME_LON, HOME_LAT, HOME_LON - 0.1);
  assertAlmostEquals(b, 270, 0.5);
});

Deno.test("bearingToCompass: cardinal points", () => {
  assertEquals(bearingToCompass(0), "N");
  assertEquals(bearingToCompass(90), "E");
  assertEquals(bearingToCompass(180), "S");
  assertEquals(bearingToCompass(270), "W");
});

Deno.test("bearingToCompass: 16-point rounding", () => {
  assertEquals(bearingToCompass(22.5), "NNE");
  assertEquals(bearingToCompass(45), "NE");
  assertEquals(bearingToCompass(360), "N");
  // Halfway between W and NW (292.5°) — Math.round rounds .5 up.
  assertEquals(bearingToCompass(292.5), "WNW");
});

Deno.test("getAlertLevel: distance thresholds", () => {
  assertEquals(getAlertLevel(0), 3);
  assertEquals(getAlertLevel(5), 3);
  assertEquals(getAlertLevel(5.01), 2);
  assertEquals(getAlertLevel(10), 2);
  assertEquals(getAlertLevel(10.01), 1);
  assertEquals(getAlertLevel(20), 1);
  assertEquals(getAlertLevel(20.01), 0);
  assertEquals(getAlertLevel(100), 0);
});

Deno.test("destinationPoint: round-trips back to source via haversine", () => {
  const [lat, lon] = destinationPoint(HOME_LAT, HOME_LON, 50, 90); // 50km east
  const dist = haversine(HOME_LAT, HOME_LON, lat, lon);
  assertAlmostEquals(dist, 50, 0.05);
  assert(lon > HOME_LON, "should move east");
});

Deno.test("destinationPoint: bearing 0 moves north", () => {
  const [lat, lon] = destinationPoint(HOME_LAT, HOME_LON, 10, 0);
  assert(lat > HOME_LAT, "should move north");
  assertAlmostEquals(lon, HOME_LON, 1e-6);
});

Deno.test("getCacheKey: 2-decimal precision buckets nearby points together", () => {
  assertEquals(getCacheKey(52.1008, -9.8856), "52.10_-9.89");
  // Two points within ~500m get the same key.
  assertEquals(getCacheKey(52.1011, -9.8859), getCacheKey(52.1008, -9.8856));
});
