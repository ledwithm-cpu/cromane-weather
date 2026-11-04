import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyFcmError } from "./fcm.ts";
import { decideAlert, groupByCell, isCoolingDown, PUSH_COOLDOWN_MS } from "./push-logic.ts";

const noCell = { eta_minutes: null, nearest_cell: null };

Deno.test("levels map to 5/10/20km alert types", () => {
  const c = { distance_km: 4.2, bearing_compass: "SW" };
  assertEquals(decideAlert(3, c, noCell, "Cromane")?.notification_type, "lightning_5km");
  assertEquals(decideAlert(2, { ...c, distance_km: 8 }, noCell, "Cromane")?.notification_type, "lightning_10km");
  assertEquals(decideAlert(1, { ...c, distance_km: 18 }, noCell, "Cromane")?.notification_type, "lightning_20km");
});

Deno.test("storm cell alerts only when ETA is within 60 minutes", () => {
  const cell = { direction: "W", approaching: true };
  assertEquals(decideAlert(0, null, { eta_minutes: 45, nearest_cell: cell }, "X")?.notification_type, "storm_approaching");
  assertEquals(decideAlert(0, null, { eta_minutes: 90, nearest_cell: cell }, "X"), null);
  assertEquals(decideAlert(0, null, noCell, "X"), null);
});

Deno.test("cooldown is 15 minutes", () => {
  const now = Date.now();
  assertEquals(isCoolingDown(null, now), false);
  assertEquals(isCoolingDown(new Date(now - 14 * 60_000), now), true);
  assertEquals(isCoolingDown(new Date(now - PUSH_COOLDOWN_MS - 1), now), false);
});

Deno.test("subscriptions are deduped per ~1km cell but keep every location id", () => {
  const groups = groupByCell([
    { location_id: "cromane", lat: 52.1008, lon: -9.8856 },
    { location_id: "cromane", lat: 52.1008, lon: -9.8856 },
    { location_id: "cromane-other", lat: 52.1031, lon: -9.8849 },
    { location_id: "shetland", lat: 60.15, lon: -1.15 },
  ]);
  assertEquals(groups.size, 2);
  assertEquals(groups.get("52.10_-9.89")?.locationIds, ["cromane", "cromane-other"]);
  assertEquals(groups.get("60.15_-1.15")?.locationIds, ["shetland"]);
});

Deno.test("UNREGISTERED and INVALID_ARGUMENT tokens are stale; others are not", () => {
  assertEquals(classifyFcmError(404, '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}'), "stale");
  assertEquals(classifyFcmError(400, '{"error":{"status":"INVALID_ARGUMENT"}}'), "stale");
  assertEquals(classifyFcmError(500, "boom"), "failed");
  assertEquals(classifyFcmError(429, "RESOURCE_EXHAUSTED"), "failed");
});
