import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { LOCATIONS } from "../../features/location/data/locations";

export default defineTool({
  name: "get_sauna",
  title: "Get sauna",
  description:
    "Get full details for a single sauna by its slug id (e.g. 'cromane'). Includes coordinates, tide station, and booking URL.",
  inputSchema: {
    id: z.string().min(1).describe("The sauna slug id, e.g. 'cromane'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const sauna = LOCATIONS.find((l) => l.id === id);
    if (!sauna) {
      return {
        content: [{ type: "text", text: `No sauna found with id '${id}'.` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `${sauna.saunaName ?? sauna.name} — ${sauna.county}` }],
      structuredContent: { sauna },
    };
  },
});
