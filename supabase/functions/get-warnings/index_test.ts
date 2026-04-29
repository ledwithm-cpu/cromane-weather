import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseWarningsHtml } from "./index.ts";

// Unique (county, province) pairs derived from src/lib/locations.ts
const COUNTY_PROVINCES: Array<{ county: string; province: string }> = [
  { county: "Kerry", province: "Munster" },
  { county: "Cork", province: "Munster" },
  { county: "Clare", province: "Munster" },
  { county: "Waterford", province: "Munster" },
  { county: "Galway", province: "Connacht" },
  { county: "Mayo", province: "Connacht" },
  { county: "Sligo", province: "Connacht" },
  { county: "Donegal", province: "Ulster" },
  { county: "Dublin", province: "Leinster" },
  { county: "Wicklow", province: "Leinster" },
  { county: "Wexford", province: "Leinster" },
  { county: "Louth", province: "Leinster" },
];

// Synthetic fixture mirroring met.ie warnings page structure with a
// Small Craft Warning in the marine section.
function buildFixture(area: string, type = "Small Craft Warning"): string {
  return `
    <html><body>
      <h2>Weather Warnings</h2>
      <p>No active weather warnings.</p>
      <h2>Marine Warnings</h2>
      <h3>Status Yellow - ${type} for ${area}</h3>
      <p>Southwesterly winds reaching force 6 at times on ${area}.</p>
      <p>Valid: Today 12:00 to Tomorrow 06:00</p>
      <p><strong>Issued:</strong> Met Éireann</p>
    </body></html>
  `;
}

const MARINE_AREAS = [
  "all Irish coastal waters",
  "Irish coastal waters from Mizen Head to Erris Head",
  "Irish coastal waters from Carnsore Point to Slyne Head",
  "Irish coastal waters from Roches Point to Bloody Foreland",
];

for (const { county, province } of COUNTY_PROVINCES) {
  for (const area of MARINE_AREAS) {
    Deno.test(`Small Craft Warning parsed for ${county} (${province}) — area: ${area}`, () => {
      const html = buildFixture(area);
      const { marine } = parseWarningsHtml(html, county, province);

      assertEquals(marine.active, true, `marine.active should be true for ${county}`);
      assertEquals(
        marine.type,
        "Small Craft Warning",
        `marine.type should normalise to "Small Craft Warning" for ${county}`,
      );
      assert(
        typeof marine.area === "string" && marine.area.length > 0,
        `marine.area should be populated for ${county}`,
      );
      assert(
        typeof marine.description === "string" && marine.description.length > 0,
        `marine.description should be populated for ${county}`,
      );
    });
  }
}

// Gale should win over an existing Small Craft warning (priority guard).
Deno.test("Gale Warning takes priority over Small Craft Warning", () => {
  const html = `
    <h2>Marine Warnings</h2>
    <h3>Status Yellow - Small Craft Warning for Irish coastal waters</h3>
    <p>Force 6 winds expected.</p>
    <h3>Status Orange - Gale Warning for Irish coastal waters</h3>
    <p>Force 8 gales expected.</p>
  `;
  const { marine } = parseWarningsHtml(html, "Kerry", "Munster");
  assertEquals(marine.type, "Gale Warning");
  assertEquals(marine.active, true);
});

// No marine section → inactive.
Deno.test("No marine warnings → marine.active false", () => {
  const html = `<h2>Weather Warnings</h2><p>Nothing active.</p>`;
  const { marine } = parseWarningsHtml(html, "Kerry", "Munster");
  assertEquals(marine.active, false);
});

// Sync guard: keep COUNTY_PROVINCES aligned with src/lib/locations.ts.
Deno.test("County/province coverage matches src/lib/locations.ts", async () => {
  const url = new URL("../../../src/lib/locations.ts", import.meta.url);
  const src = await Deno.readTextFile(url);
  const re = /county:\s*'([^']+)',\s*province:\s*'([^']+)'/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    found.add(`${m[1]}|${m[2]}`);
  }
  const covered = new Set(COUNTY_PROVINCES.map((c) => `${c.county}|${c.province}`));
  const missing = [...found].filter((k) => !covered.has(k));
  assertEquals(
    missing,
    [],
    `Add missing county/province pairs to COUNTY_PROVINCES: ${missing.join(", ")}`,
  );
});
