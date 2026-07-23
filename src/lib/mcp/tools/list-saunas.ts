import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { LOCATIONS } from "../../../features/location/data/locations";

export default defineTool({
  name: "list_saunas",
  title: "List saunas",
  description:
    "List coastal saunas tracked by Saunas in Ireland. Optionally filter by country (Ireland, Wales, England, Scotland) or county. Returns id, name, county, country, coordinates, and booking URL.",
  inputSchema: {
    country: z.string().optional().describe("Filter by country name, e.g. Ireland."),
    county: z.string().optional().describe("Filter by county, e.g. Kerry."),
    limit: z.number().int().min(1).max(200).optional().describe("Max results (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ country, county, limit }) => {
    const cap = limit ?? 50;
    const rows = LOCATIONS.filter((l) => {
      if (country && (l.country ?? "").toLowerCase() !== country.toLowerCase()) return false;
      if (county && l.county.toLowerCase() !== county.toLowerCase()) return false;
      return true;
    })
      .slice(0, cap)
      .map((l) => ({
        id: l.id,
        sauna_name: l.saunaName ?? null,
        location: l.name,
        county: l.county,
        country: l.country ?? null,
        lat: l.lat,
        lon: l.lon,
        booking_url: l.saunaUrl ?? null,
      }));

    return {
      content: [{ type: "text", text: `${rows.length} sauna(s) found.` }],
      structuredContent: { count: rows.length, saunas: rows },
    };
  },
});
