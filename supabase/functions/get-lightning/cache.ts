// Per-location in-memory strike cache + DB hydration/persistence
// for the lightning function. Keyed by `${lat.toFixed(2)}_${lon.toFixed(2)}`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Strike = {
  time_ns: number;
  lat: number;
  lon: number;
  distance_km: number;
  bearing_deg: number;
  bearing_compass: string;
  alert_level: number;
};

export const CACHE_TTL_MS = 30 * 60 * 1000;

const strikeCaches = new Map<string, Strike[]>();
const hydratedCaches = new Set<string>();

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  _supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAdmin;
}

export function getStrikeCache(key: string): Strike[] {
  if (!strikeCaches.has(key)) strikeCaches.set(key, []);
  return strikeCaches.get(key)!;
}

/** Remove strikes older than CACHE_TTL_MS in-place. */
export function pruneCache(cache: Strike[]): void {
  const cutoff = Date.now() - CACHE_TTL_MS;
  let i = 0;
  while (i < cache.length) {
    if (Math.floor(cache[i].time_ns / 1_000_000) < cutoff) {
      cache.splice(i, 1);
    } else {
      i++;
    }
  }
}

/** Adds the strike if not already present (de-dupes on time_ns+lat+lon). Returns true when newly inserted. */
export function addStrikeToCache(cache: Strike[], strike: Strike): boolean {
  if (cache.some(s => s.time_ns === strike.time_ns && s.lat === strike.lat && s.lon === strike.lon)) {
    return false;
  }
  cache.push(strike);
  return true;
}

/** Pull recent strikes from DB once per warm worker, per cache key. */
export async function hydrateStrikeCacheFromDb(cacheKey: string, cache: Strike[]): Promise<void> {
  if (hydratedCaches.has(cacheKey)) return;
  hydratedCaches.add(cacheKey);
  if (cache.length > 0) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const cutoffNs = (Date.now() - CACHE_TTL_MS) * 1_000_000;
  try {
    const { data, error } = await supabase
      .from('lightning_cache')
      .select('time_ns, lat, lon, distance_km, bearing_deg, bearing_compass, alert_level')
      .eq('cache_key', cacheKey)
      .gte('time_ns', cutoffNs)
      .order('time_ns', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Hydration query error:', error.message);
      return;
    }
    if (data && data.length > 0) {
      for (const row of data) {
        addStrikeToCache(cache, {
          time_ns: Number(row.time_ns),
          lat: row.lat as number,
          lon: row.lon as number,
          distance_km: row.distance_km as number,
          bearing_deg: row.bearing_deg as number,
          bearing_compass: row.bearing_compass as string,
          alert_level: row.alert_level as number,
        });
      }
      console.log(`💧 Hydrated ${data.length} strikes for ${cacheKey} from DB`);
    }
  } catch (e) {
    console.error('Hydration error:', e);
  }
}

/** Batch upsert new strikes. Silently no-ops if service-role creds aren't set. */
export async function persistNewStrikes(cacheKey: string, newStrikes: Strike[]): Promise<void> {
  if (newStrikes.length === 0) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const rows = newStrikes.map(s => ({
    cache_key: cacheKey,
    time_ns: s.time_ns,
    lat: s.lat,
    lon: s.lon,
    distance_km: s.distance_km,
    bearing_deg: s.bearing_deg,
    bearing_compass: s.bearing_compass,
    alert_level: s.alert_level,
  }));

  try {
    const { error } = await supabase
      .from('lightning_cache')
      .upsert(rows, { onConflict: 'cache_key,time_ns,lat,lon', ignoreDuplicates: true });
    if (error) {
      console.error('Persist strikes error:', error.message);
    } else {
      console.log(`💾 Persisted ${rows.length} new strikes for ${cacheKey}`);
    }
  } catch (e) {
    console.error('Persist strikes exception:', e);
  }
}
