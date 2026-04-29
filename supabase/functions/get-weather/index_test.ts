// Verifies that get-weather's `temperature_c` and `feels_like_c` mirror
// Open-Meteo's `temperature_2m` / `apparent_temperature` at the same lat/lon
// for EVERY location the app exposes — not just Cromane. This guards against
// the "Valentia wind-chill" regression where feels_like was being derived
// from a far-away Met Éireann station, which would only show up at certain
// locations.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Mirrored from src/lib/locations.ts. Deno can't import the .ts source through
// the Vite alias system, so we keep the minimal {id, name, lat, lon, met}
// tuple here and rely on a structure test (below) to make sure no app
// location is silently missing from this list.
type Loc = { id: string; name: string; lat: number; lon: number; metStation: string };
const LOCATIONS: Loc[] = [
  { id: "cromane", name: "Cromane", lat: 52.105818, lon: -9.895735, metStation: "valentia" },
  { id: "brandon-bay", name: "Brandon Bay", lat: 52.141, lon: -10.268, metStation: "valentia" },
  { id: "dingle", name: "Dingle", lat: 52.139, lon: -10.264, metStation: "valentia" },
  { id: "ventry", name: "Ventry", lat: 52.118, lon: -10.358, metStation: "valentia" },
  { id: "killarney", name: "Killarney", lat: 52.059, lon: -9.504, metStation: "valentia" },
  { id: "glenteenassig", name: "Glenteenassig", lat: 52.221, lon: -9.951, metStation: "valentia" },
  { id: "maharees", name: "Maharees", lat: 52.268, lon: -10.018, metStation: "valentia" },
  { id: "ballybunion", name: "Ballybunion", lat: 52.511, lon: -9.673, metStation: "valentia" },
  { id: "banna-strand", name: "Banna Strand", lat: 52.381, lon: -9.818, metStation: "valentia" },
  { id: "rossbeigh", name: "Rossbeigh", lat: 52.062, lon: -9.972, metStation: "valentia" },
  { id: "cahersiveen", name: "Cahersiveen", lat: 51.949, lon: -10.223, metStation: "valentia" },
  { id: "ballinskelligs", name: "Ballinskelligs", lat: 51.819, lon: -10.27, metStation: "valentia" },
  { id: "derrynane", name: "Derrynane", lat: 51.766, lon: -10.132, metStation: "valentia" },
  { id: "waterville", name: "Waterville", lat: 51.829, lon: -10.168, metStation: "valentia" },
  { id: "kinsale", name: "Kinsale", lat: 51.706, lon: -8.527, metStation: "roches-point" },
  { id: "garrettstown", name: "Garrettstown", lat: 51.638, lon: -8.588, metStation: "roches-point" },
  { id: "inchydoney", name: "Inchydoney", lat: 51.598, lon: -8.862, metStation: "roches-point" },
  { id: "clonakilty", name: "Clonakilty", lat: 51.621, lon: -8.887, metStation: "roches-point" },
  { id: "dunworley", name: "Dunworley", lat: 51.571, lon: -8.921, metStation: "roches-point" },
  { id: "schull", name: "Schull", lat: 51.527, lon: -9.554, metStation: "sherkin-island" },
  { id: "fountainstown", name: "Fountainstown", lat: 51.793, lon: -8.294, metStation: "sherkin-island" },
  { id: "redbarn-youghal", name: "Redbarn, Youghal", lat: 51.932, lon: -7.856, metStation: "roches-point" },
  { id: "lahinch", name: "Lahinch", lat: 52.937, lon: -9.351, metStation: "shannon" },
  { id: "fanore", name: "Fanore", lat: 53.121, lon: -9.28, metStation: "shannon" },
  { id: "salthill", name: "Salthill", lat: 53.257, lon: -9.077, metStation: "athenry" },
  { id: "spiddal", name: "Spiddal", lat: 53.243, lon: -9.308, metStation: "athenry" },
  { id: "dogs-bay", name: "Dog's Bay", lat: 53.383, lon: -9.982, metStation: "athenry" },
  { id: "achill-island", name: "Achill Island", lat: 53.961, lon: -10.07, metStation: "knock" },
  { id: "strandhill", name: "Strandhill", lat: 54.271, lon: -8.604, metStation: "knock" },
  { id: "bundoran", name: "Bundoran", lat: 54.474, lon: -8.281, metStation: "malin-head" },
  { id: "rossnowlagh", name: "Rossnowlagh", lat: 54.541, lon: -8.218, metStation: "malin-head" },
  { id: "portnoo", name: "Portnoo", lat: 54.834, lon: -8.493, metStation: "malin-head" },
  { id: "teelin", name: "Teelin", lat: 54.632, lon: -8.637, metStation: "malin-head" },
  { id: "shrove", name: "Shrove", lat: 55.222, lon: -7.036, metStation: "malin-head" },
  { id: "portmarnock", name: "Portmarnock", lat: 53.423, lon: -6.131, metStation: "dublin-airport" },
  { id: "portrane", name: "Portrane", lat: 53.494, lon: -6.116, metStation: "dublin-airport" },
  { id: "clontarf", name: "Clontarf", lat: 53.367, lon: -6.198, metStation: "dublin-airport" },
  { id: "dollymount", name: "Dollymount", lat: 53.371, lon: -6.157, metStation: "dublin-airport" },
  { id: "sandycove", name: "Sandycove", lat: 53.289, lon: -6.113, metStation: "dublin-airport" },
  { id: "seapoint", name: "Seapoint", lat: 53.296, lon: -6.156, metStation: "dublin-airport" },
  { id: "killiney", name: "Killiney", lat: 53.261, lon: -6.105, metStation: "dublin-airport" },
  { id: "howth", name: "Howth", lat: 53.386, lon: -6.065, metStation: "dublin-airport" },
  { id: "skerries", name: "Skerries", lat: 53.581, lon: -6.108, metStation: "dublin-airport" },
  { id: "greystones", name: "Greystones", lat: 53.141, lon: -6.063, metStation: "dublin-airport" },
  { id: "tramore", name: "Tramore", lat: 52.159, lon: -7.146, metStation: "johnstown-castle" },
  { id: "dunmore-east", name: "Dunmore East", lat: 52.151, lon: -6.995, metStation: "johnstown-castle" },
  { id: "curracloe", name: "Curracloe", lat: 52.392, lon: -6.385, metStation: "johnstown-castle" },
  { id: "cahore", name: "Cahore", lat: 52.561, lon: -6.199, metStation: "johnstown-castle" },
  { id: "termonfeckin", name: "Termonfeckin", lat: 53.732, lon: -6.262, metStation: "dublin-airport" },
];

// Tolerance: rounding + the two requests can land on different 15-min
// Open-Meteo intervals, which is normally ≤1°. We allow 2° to absorb that
// drift without losing the ability to catch a Valentia-style ~10° offset.
const MAX_DRIFT_C = 2;

type EdgeResp = {
  temperature_c: number;
  feels_like_c: number;
  forecast: Array<{ feels_like_max_c: number; feels_like_min_c: number; temp_max_c: number; temp_min_c: number }>;
};
type OMResp = {
  current: { temperature_2m: number; apparent_temperature: number };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
  };
};

async function fetchEdge(loc: Loc): Promise<EdgeResp> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-weather`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ lat: loc.lat, lon: loc.lon, metStation: loc.metStation }),
  });
  const json = await res.json();
  assertEquals(res.status, 200, `edge non-200 for ${loc.id}: ${JSON.stringify(json)}`);
  return json as EdgeResp;
}

async function fetchOpenMeteo(loc: Loc): Promise<OMResp> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min&timezone=Europe%2FDublin&forecast_days=1`;
  const res = await fetch(url);
  const json = await res.json();
  assertEquals(res.status, 200, `open-meteo non-200 for ${loc.id}`);
  return json as OMResp;
}

// One generated test per location so any failure points at the exact spot.
for (const loc of LOCATIONS) {
  Deno.test(`get-weather mirrors Open-Meteo for ${loc.name} (${loc.id})`, async () => {
    const [edge, om] = await Promise.all([fetchEdge(loc), fetchOpenMeteo(loc)]);

    const tDiff = Math.abs(edge.temperature_c - Math.round(om.current.temperature_2m));
    assert(
      tDiff <= MAX_DRIFT_C,
      `[${loc.id}] temperature_c=${edge.temperature_c} vs Open-Meteo ${om.current.temperature_2m} (±${MAX_DRIFT_C}°)`,
    );

    const fDiff = Math.abs(edge.feels_like_c - Math.round(om.current.apparent_temperature));
    assert(
      fDiff <= MAX_DRIFT_C,
      `[${loc.id}] feels_like_c=${edge.feels_like_c} should mirror Open-Meteo apparent_temperature=${om.current.apparent_temperature} (±${MAX_DRIFT_C}°). A larger gap means feels-like is being derived from a far-away Met Éireann station instead of Open-Meteo at this location.`,
    );

    const today = edge.forecast[0];
    const dDiffMax = Math.abs(today.feels_like_max_c - Math.round(om.daily.apparent_temperature_max[0]));
    const dDiffMin = Math.abs(today.feels_like_min_c - Math.round(om.daily.apparent_temperature_min[0]));
    assert(dDiffMax <= 1, `[${loc.id}] forecast feels_like_max_c=${today.feels_like_max_c} vs OM ${om.daily.apparent_temperature_max[0]}`);
    assert(dDiffMin <= 1, `[${loc.id}] forecast feels_like_min_c=${today.feels_like_min_c} vs OM ${om.daily.apparent_temperature_min[0]}`);
  });
}

// Structural guard: if a future PR adds/removes a location in the app, this
// test forces the maintainer to keep the parametrized list above in sync,
// otherwise we'd silently stop covering new locations.
Deno.test("LOCATIONS parametrized list matches src/lib/locations.ts count", async () => {
  const src = await Deno.readTextFile(new URL("../../../src/lib/locations.ts", import.meta.url));
  // Count unique `id: '...'` entries inside the LOCATIONS export. This is a
  // cheap heuristic that only requires a maintainer to update LOCATIONS in
  // this test file when the app's location list changes.
  const matches = src.match(/^\s*id:\s*['"][a-z0-9-]+['"],/gm) ?? [];
  assertEquals(
    LOCATIONS.length,
    matches.length,
    `Parametrized list has ${LOCATIONS.length} entries but src/lib/locations.ts declares ${matches.length}. Update the LOCATIONS array in this test file to keep weather coverage in sync.`,
  );
});
