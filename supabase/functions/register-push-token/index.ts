// Subscribe / unsubscribe / check a device token for lightning alerts at one sauna.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TOKEN = /^[A-Za-z0-9_\-:]{20,500}$/;
const SLUG = /^[a-z0-9-]{1,120}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, location_id, lat, lon, action = "subscribe" } = await req.json();
    if (typeof token !== "string" || !TOKEN.test(token)) return json({ error: "Invalid token" }, 400);
    if (typeof location_id !== "string" || !SLUG.test(location_id)) return json({ error: "Invalid location_id" }, 400);
    if (!["subscribe", "unsubscribe", "status"].includes(action)) return json({ error: "Invalid action" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "status") {
      const { data } = await supabase.from("fcm_tokens").select("id")
        .eq("token", token).eq("location_id", location_id).maybeSingle();
      return json({ subscribed: !!data });
    }
    if (action === "unsubscribe") {
      const { error } = await supabase.from("fcm_tokens").delete().eq("token", token).eq("location_id", location_id);
      if (error) throw error;
      return json({ subscribed: false });
    }

    if (typeof lat !== "number" || typeof lon !== "number" || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return json({ error: "Invalid coordinates" }, 400);
    }
    const { error } = await supabase.from("fcm_tokens").upsert(
      { token, location_id, lat, lon, last_used_at: new Date().toISOString() },
      { onConflict: "token,location_id" },
    );
    if (error) throw error;
    return json({ subscribed: true });
  } catch (e) {
    console.error("Token registration error:", e);
    return json({ error: "Failed to update subscription" }, 500);
  }
});
