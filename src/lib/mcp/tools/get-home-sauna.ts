import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { LOCATIONS } from "@/features/location/data/locations";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_home_sauna",
  title: "Get my home sauna",
  description:
    "Get the signed-in user's chosen home sauna, if set. Returns the sauna slug and details.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("home_sauna_slug")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const slug = data?.home_sauna_slug ?? null;
    if (!slug) {
      return {
        content: [{ type: "text", text: "No home sauna set." }],
        structuredContent: { home_sauna_slug: null, sauna: null },
      };
    }
    const sauna = LOCATIONS.find((l) => l.id === slug) ?? null;
    return {
      content: [
        { type: "text", text: `Home sauna: ${sauna?.saunaName ?? sauna?.name ?? slug}.` },
      ],
      structuredContent: { home_sauna_slug: slug, sauna },
    };
  },
});
