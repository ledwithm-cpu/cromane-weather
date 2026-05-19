// Pure nowcast scoring + storm-cell helpers for the lightning function.
// Network I/O for Open-Meteo lives here too, but scoring is split out
// (computeNowcastScore + buildStatusText) so it can be unit tested.

import { bearingToCompass, destinationPoint } from "./geofence.ts";

export interface StormCell {
  direction: string;
  distance_km: number;
  intensity_mm: number;
  eta_minutes: number | null;
  approaching: boolean;
}

export interface NowcastResult {
  lpi: number;
  cape: number;
  atmospheric_alert: boolean;
  storm_cells: StormCell[];
  nearest_cell: StormCell | null;
  eta_minutes: number | null;
  nowcast_level: number;
  status_text: string;
  radar_sync_ms: number;
}

export interface NowcastScore {
  nowcast_level: number;
  status_text: string;
  nearest_cell: StormCell | null;
  eta_minutes: number | null;
  atmospheric_alert: boolean;
}

const STORM_SPEED_KMH = 40;
const BEARINGS_8 = [0, 45, 90, 135, 180, 225, 270, 315];
const DISTANCES_KM = [50, 100];

/** Build the 16-point lat/lon grid used to sample Open-Meteo for storm cells. */
export function buildGridPoints(homeLat: number, homeLon: number) {
  const points: Array<{ lat: number; lon: number; dist: number; bearingDeg: number; dir: string }> = [];
  for (const dist of DISTANCES_KM) {
    for (const b of BEARINGS_8) {
      const [lat, lon] = destinationPoint(homeLat, homeLon, dist, b);
      points.push({ lat, lon, dist, bearingDeg: b, dir: bearingToCompass(b) });
    }
  }
  return points;
}

/** Build a single StormCell from a grid sample. Returns null if precip too low. */
export function evaluateStormCell(
  gp: { dist: number; dir: string },
  precip: number,
  nextPrecip: number,
  homePrecip: number,
): StormCell | null {
  if (precip <= 4 && nextPrecip <= 4) return null;
  const intensity = Math.max(precip, nextPrecip);
  const etaMin = Math.round((gp.dist / STORM_SPEED_KMH) * 60);
  const isApproaching = gp.dist === 100 ? true : precip > homePrecip * 2;
  return {
    direction: gp.dir,
    distance_km: gp.dist,
    intensity_mm: Math.round(intensity * 10) / 10,
    eta_minutes: isApproaching ? etaMin : null,
    approaching: isApproaching,
  };
}

/** Pick the nearest approaching cell by ETA. */
export function pickNearestCell(cells: StormCell[]): StormCell | null {
  const approaching = cells.filter(c => c.approaching && c.eta_minutes !== null);
  if (approaching.length === 0) return null;
  return approaching.reduce((a, b) => (a.eta_minutes ?? 999) < (b.eta_minutes ?? 999) ? a : b);
}

/**
 * Pure scoring step — derives the nowcast level + status text from raw inputs.
 * Returns 1 if a storm cell is approaching within 60 min,
 * 0.5 if the atmosphere is charging (LPI>0 or CAPE>500),
 * 0 otherwise.
 */
export function computeNowcastScore(
  lpi: number,
  cape: number,
  cells: StormCell[],
): NowcastScore {
  const nearestCell = pickNearestCell(cells);
  const etaMinutes = nearestCell?.eta_minutes ?? null;
  const atmosphericAlert = lpi > 0 || cape > 500;

  let nowcastLevel = 0;
  let statusText = 'Atmosphere Stable';

  if (nearestCell && etaMinutes !== null && etaMinutes <= 60) {
    nowcastLevel = 1;
    statusText = `Storm Approaching: ETA ${etaMinutes} mins`;
    if (etaMinutes <= 30) {
      statusText = `Storm Cell Detected: Approaching from ${nearestCell.direction}. Estimated arrival: ${etaMinutes} minutes.`;
    }
  } else if (atmosphericAlert) {
    nowcastLevel = 0.5;
    statusText = 'Atmosphere Charging: Conditions favorable for thunder.';
  }

  return { nowcast_level: nowcastLevel, status_text: statusText, nearest_cell: nearestCell, eta_minutes: etaMinutes, atmospheric_alert: atmosphericAlert };
}

// ─── Cache + fetcher ───
const nowcastCaches = new Map<string, { result: NowcastResult; time: number }>();
const NOWCAST_CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchNowcast(
  homeLat: number,
  homeLon: number,
  cacheKey: string,
): Promise<NowcastResult> {
  const cached = nowcastCaches.get(cacheKey);
  if (cached && Date.now() - cached.time < NOWCAST_CACHE_TTL_MS) {
    return cached.result;
  }

  const radarSyncTime = Date.now();
  const gridPoints = buildGridPoints(homeLat, homeLon);

  const allLats = [homeLat, ...gridPoints.map(p => p.lat)].join(',');
  const allLons = [homeLon, ...gridPoints.map(p => p.lon)].join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${allLats}&longitude=${allLons}&hourly=lightning_potential,cape,precipitation&forecast_hours=6&timezone=Europe%2FDublin`;

  let lpi = 0;
  let cape = 0;
  let homePrecip = 0;
  const stormCells: StormCell[] = [];

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const currentHour = new Date().toISOString().substring(0, 13) + ':00';
      const results = Array.isArray(data) ? data : [data];

      if (results[0]?.hourly) {
        const h = results[0].hourly;
        const timeIdx = h.time?.findIndex((t: string) => t >= currentHour) ?? 0;
        lpi = h.lightning_potential?.[timeIdx] ?? 0;
        cape = h.cape?.[timeIdx] ?? 0;
        homePrecip = h.precipitation?.[timeIdx] ?? 0;
      }

      for (let i = 0; i < gridPoints.length; i++) {
        const ptData = results[i + 1]?.hourly;
        if (!ptData) continue;
        const timeIdx = ptData.time?.findIndex((t: string) => t >= currentHour) ?? 0;
        const precip = ptData.precipitation?.[timeIdx] ?? 0;
        const nextPrecip = ptData.precipitation?.[timeIdx + 1] ?? 0;
        const cell = evaluateStormCell(gridPoints[i], precip, nextPrecip, homePrecip);
        if (cell) stormCells.push(cell);
      }
    }
  } catch (e) {
    console.error('Nowcast fetch error:', e);
  }

  const score = computeNowcastScore(lpi, cape, stormCells);
  const result: NowcastResult = {
    lpi,
    cape,
    atmospheric_alert: score.atmospheric_alert,
    storm_cells: stormCells,
    nearest_cell: score.nearest_cell,
    eta_minutes: score.eta_minutes,
    nowcast_level: score.nowcast_level,
    status_text: score.status_text,
    radar_sync_ms: radarSyncTime,
  };

  nowcastCaches.set(cacheKey, { result, time: Date.now() });
  return result;
}
