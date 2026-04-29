// Verifies that get-weather's `feels_like_c` and `temperature_c` for Cromane
// match Open-Meteo's `apparent_temperature` / `temperature_2m` at the same
// lat/lon. This guards against the "Valentia wind-chill" regression where
// feels_like was being derived from a far-away Met Éireann station.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const CROMANE = { lat: 52.105818, lon: -9.895735, metStation: "valentia" };

async function fetchEdge() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-weather`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(CROMANE),
  });
  const json = await res.json();
  assertEquals(res.status, 200);
  return json as {
    temperature_c: number;
    feels_like_c: number;
    forecast: Array<{ feels_like_max_c: number; feels_like_min_c: number; temp_max_c: number; temp_min_c: number }>;
  };
}

async function fetchOpenMeteo() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${CROMANE.lat}&longitude=${CROMANE.lon}&current=temperature_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min&timezone=Europe%2FDublin&forecast_days=1`;
  const res = await fetch(url);
  const json = await res.json();
  assertEquals(res.status, 200);
  return json as {
    current: { temperature_2m: number; apparent_temperature: number };
    daily: {
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      apparent_temperature_max: number[];
      apparent_temperature_min: number[];
    };
  };
}

Deno.test("get-weather: current temperature_c matches Open-Meteo temperature_2m for Cromane", async () => {
  const [edge, om] = await Promise.all([fetchEdge(), fetchOpenMeteo()]);
  // Both are rounded to whole degrees in the edge function — allow ±1°C drift
  // because the two requests can land on different 15-min Open-Meteo intervals.
  const diff = Math.abs(edge.temperature_c - Math.round(om.current.temperature_2m));
  assert(
    diff <= 1,
    `temperature_c=${edge.temperature_c} should match Open-Meteo ${om.current.temperature_2m} (±1°)`,
  );
});

Deno.test("get-weather: feels_like_c matches Open-Meteo apparent_temperature for Cromane (no Valentia wind-chill)", async () => {
  const [edge, om] = await Promise.all([fetchEdge(), fetchOpenMeteo()]);
  const expected = Math.round(om.current.apparent_temperature);
  const diff = Math.abs(edge.feels_like_c - expected);
  // ±1° tolerance for inter-request drift. A larger gap means we've reverted to
  // computing feels-like from a Met Éireann station instead of Open-Meteo's
  // location-specific apparent_temperature.
  assert(
    diff <= 1,
    `feels_like_c=${edge.feels_like_c} should mirror Open-Meteo apparent_temperature=${om.current.apparent_temperature} for Cromane (±1°). A larger gap usually means feels-like is being derived from a far-away Met Éireann station.`,
  );
});

Deno.test("get-weather: today's forecast feels_like_max/min mirror Open-Meteo daily apparent_temperature_max/min", async () => {
  const [edge, om] = await Promise.all([fetchEdge(), fetchOpenMeteo()]);
  const today = edge.forecast[0];
  assertEquals(today.feels_like_max_c, Math.round(om.daily.apparent_temperature_max[0]));
  assertEquals(today.feels_like_min_c, Math.round(om.daily.apparent_temperature_min[0]));
  assertEquals(today.temp_max_c, Math.round(om.daily.temperature_2m_max[0]));
  assertEquals(today.temp_min_c, Math.round(om.daily.temperature_2m_min[0]));
});
