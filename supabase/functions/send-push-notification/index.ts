// Sends a push to devices subscribed to ONE sauna, via FCM HTTP v1.
// Server-only: the caller must present the service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAccessToken, readServiceAccount, sendToToken } from "../_shared/fcm.ts";
import { isCoolingDown, PUSH_COOLDOWN_MS } from "../_shared/push-logic.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SLUG = /^[a-z0-9-]{1,120}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return json({ error: "Forbidden" }, 403);

  try {
    const { location_id, title, body, notification_type, alert_level, data, only_token } = await req.json();
    if (typeof location_id !== "string" || !SLUG.test(location_id) || !title || !body || !notification_type) {
      return json({ error: "location_id, title, body and notification_type are required" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Cooldown per type per location (skipped for a single-token test send).
    if (!only_token) {
      const { data: last } = await supabase.from("push_notification_log")
        .select("sent_at").eq("location_id", location_id).eq("notification_type", notification_type)
        .gte("sent_at", new Date(Date.now() - PUSH_COOLDOWN_MS).toISOString())
        .order("sent_at", { ascending: false }).limit(1).maybeSingle();
      if (isCoolingDown(last?.sent_at)) return json({ sent: 0, reason: "cooldown_active" });
    }

    let q = supabase.from("fcm_tokens").select("token").eq("location_id", location_id);
    if (only_token) q = q.eq("token", only_token);
    const { data: rows, error } = await q;
    if (error) throw error;
    if (!rows?.length) return json({ sent: 0, reason: "no_subscribers" });

    const sa = readServiceAccount();
    const accessToken = await getAccessToken(sa);
    const link = `https://saunasinireland.com/${location_id}`;
    const payloadData: Record<string, string> = { location_id, notification_type, ...(data ?? {}) };

    let sent = 0;
    const stale: string[] = [];
    for (const { token } of rows) {
      const r = await sendToToken(sa, accessToken, token, { title, body, link, data: payloadData });
      if (r === "sent") sent++;
      else if (r === "stale") stale.push(token);
    }
    if (stale.length) await supabase.from("fcm_tokens").delete().in("token", stale);

    if (!only_token) {
      await supabase.from("push_notification_log").insert({
        location_id, notification_type, alert_level: alert_level ?? 0,
        details: { title, body, sent, total: rows.length, stale: stale.length },
      });
    }
    return json({ sent, total: rows.length, stale_cleaned: stale.length });
  } catch (e) {
    console.error("Push notification error:", e);
    return json({ error: e instanceof Error ? e.message : "Failed to send notification" }, 500);
  }
});
