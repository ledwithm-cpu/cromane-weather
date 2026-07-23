import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { LOCATIONS } from "../../../features/location/data/locations";

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default defineTool({
  name: "find_nearest_sauna",
  title: "Find nearest sauna",
  description:
    "Given a latitude and longitude, return the nearest coastal saunas ordered by distance in kilometres.",
  inputSchema: {
    lat: z.number().describe("Latitude in decimal degrees."),
    lon: z.number().describe("Longitude in decimal degrees."),
    limit: z.number().int().min(1).max(20).optional().describe("Number of results (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ lat, lon, limit }) => {
    const cap = limit ?? 5;
    const ranked = LOCATIONS
      .map((l) => ({
        id: l.id,
        sauna_name: l.saunaName ?? null,
        location: l.name,
        county: l.county,
        country: l.country ?? null,
        lat: l.lat,
        lon: l.lon,
        booking_url: l.saunaUrl ?? null,
        distance_km: Math.round(distanceKm(lat, lon, l.lat, l.lon) * 10) / 10,
      }))
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, cap);

    return {
      content: [
        {
          type: "text",
          text: `Nearest sauna: ${ranked[0]?.sauna_name ?? ranked[0]?.location} (${ranked[0]?.distance_km} km).`,
        },
      ],
      structuredContent: { results: ranked },
    };
  },
});
