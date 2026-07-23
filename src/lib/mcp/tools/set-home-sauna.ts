import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { LOCATIONS } from "@/features/location/data/locations";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "set_home_sauna",
  title: "Set my home sauna",
  description:
    "Set the signed-in user's home sauna to the given slug id. Pass null or empty string to clear.",
  inputSchema: {
    id: z
      .string()
      .describe("Sauna slug id (e.g. 'cromane'). Pass an empty string to clear."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const slug = id.trim() || null;
    if (slug && !LOCATIONS.some((l) => l.id === slug)) {
      return {
        content: [{ type: "text", text: `Unknown sauna id '${slug}'.` }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("profiles")
      .update({ home_sauna_slug: slug })
      .eq("user_id", ctx.getUserId());
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [
        { type: "text", text: slug ? `Home sauna set to '${slug}'.` : "Home sauna cleared." },
      ],
      structuredContent: { home_sauna_slug: slug },
    };
  },
});
