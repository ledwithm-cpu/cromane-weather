// Pure geographic / geofencing helpers for the lightning function.
// No side effects, no I/O — safe to unit test.

export const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
] as const;

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres between two lat/lon points. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Initial bearing in degrees (0-360) from point 1 to point 2. */
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

/** 16-point compass label for a bearing in degrees. */
export function bearingToCompass(deg: number): string {
  return COMPASS_16[Math.round(deg / 22.5) % 16];
}

/**
 * Discrete alert level by distance (km):
 *   ≤5  → 3 (immediate),
 *   ≤10 → 2 (warning),
 *   ≤20 → 1 (awareness),
 *   else 0.
 */
export function getAlertLevel(distanceKm: number): number {
  if (distanceKm <= 5) return 3;
  if (distanceKm <= 10) return 2;
  if (distanceKm <= 20) return 1;
  return 0;
}

/** Destination point given start lat/lon, distance (km) and bearing (deg). */
export function destinationPoint(
  lat: number,
  lon: number,
  distKm: number,
  bearingDeg: number,
): [number, number] {
  const d = distKm / EARTH_RADIUS_KM;
  const brng = bearingDeg * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
  );
  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

/** Stable cache key for a lat/lon pair (2-decimal precision ≈ 1.1km bucket). */
export function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}
