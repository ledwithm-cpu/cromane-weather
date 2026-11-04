// Pure targeting / cooldown / alert-decision logic for lightning pushes (unit tested).

export const PUSH_COOLDOWN_MS = 15 * 60 * 1000;

export interface Subscription {
  location_id: string;
  lat: number;
  lon: number;
}

export interface AlertDecision {
  notification_type: string;
  title: string;
  body: string;
}

/** Same ~1km key the lightning cache uses. */
export function locationKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

/** Group subscribed locations so each ~1km cell is checked once. */
export function groupByCell(subs: Subscription[]): Map<string, { lat: number; lon: number; locationIds: string[] }> {
  const out = new Map<string, { lat: number; lon: number; locationIds: string[] }>();
  for (const s of subs) {
    const key = locationKey(s.lat, s.lon);
    const g = out.get(key) ?? { lat: s.lat, lon: s.lon, locationIds: [] };
    if (!g.locationIds.includes(s.location_id)) g.locationIds.push(s.location_id);
    out.set(key, g);
  }
  return out;
}

/** True when the same type was already sent for this location inside the window. */
export function isCoolingDown(lastSentAt: string | Date | null | undefined, now = Date.now()): boolean {
  if (!lastSentAt) return false;
  return now - new Date(lastSentAt).getTime() < PUSH_COOLDOWN_MS;
}

/**
 * Levels: 3 = strike within 5km, 2 = within 10km, 1 = within 20km.
 * A storm cell approaching with ETA ≤ 60 min also alerts.
 */
export function decideAlert(
  alertLevel: number,
  closest: { distance_km: number; bearing_compass: string } | null,
  nowcast: { eta_minutes: number | null; nearest_cell: { direction: string; approaching?: boolean } | null },
  name: string,
): AlertDecision | null {
  const d = closest ? Math.round(closest.distance_km * 10) / 10 : null;
  if (alertLevel >= 3 && closest) {
    return { notification_type: "lightning_5km", title: `⚡ Lightning within 5km of ${name}`,
      body: `Strike ${d}km ${closest.bearing_compass}. Get out of the water and take shelter.` };
  }
  if (alertLevel >= 2 && closest) {
    return { notification_type: "lightning_10km", title: `⚡ Lightning within 10km of ${name}`,
      body: `Strike ${d}km ${closest.bearing_compass}. Be ready to leave the water.` };
  }
  if (alertLevel >= 1 && closest) {
    return { notification_type: "lightning_20km", title: `⚡ Lightning within 20km of ${name}`,
      body: `Strike ${d}km ${closest.bearing_compass}. Keep an eye on the sky.` };
  }
  if (nowcast.eta_minutes !== null && nowcast.eta_minutes <= 60 && nowcast.nearest_cell) {
    return { notification_type: "storm_approaching", title: `🌩️ Storm approaching ${name}`,
      body: `Storm cell to the ${nowcast.nearest_cell.direction}, about ${nowcast.eta_minutes} minutes away.` };
  }
  return null;
}
