// Sends a push to devices subscribed to ONE sauna, via FCM HTTP v1.
// Server-only: the caller must present the service role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAccessToken, readServiceAccount, sendToToken, validateOnlyTopic } from "../_shared/fcm.ts";
import { isCoolingDown, PUSH_COOLDOWN_MS } from "../_shared/push-logic.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SLUG = /^[a-z0-9-]{1,120}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const url = new URL(req.url);
  if (url.searchParams.get("selftest") === "1") return await selfTest(req, serviceKey);
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

// Admin-only end-to-end check: credentials, FCM v1 acceptance (validate_only), targeting, cooldown.
async function selfTest(req: Request, serviceKey: string): Promise<Response> {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const out: Record<string, unknown> = {};
  const tag = `selftest-${crypto.randomUUID().slice(0, 8)}`;
  const tokA = `${tag}-tokenA-cromane-xxxxxxxx`, tokB = `${tag}-tokenB-other-xxxxxxxx`;
  try {
    const sa = readServiceAccount();
    out.secret_readable = true;
    const at = await getAccessToken(sa);
    out.oauth_token = !!at;
    out.fcm_v1_validate_only = await validateOnlyTopic(sa, at, "selftest");

    await admin.from("fcm_tokens").insert([
      { token: tokA, location_id: "cromane", lat: 52.1, lon: -9.9 },
      { token: tokB, location_id: "shetland-test-only", lat: 60.1, lon: -1.1 },
    ]);
    const { data: targeted } = await admin.from("fcm_tokens").select("token").eq("location_id", "cromane").like("token", `${tag}%`);
    const t = (targeted ?? []).map((r) => r.token);
    out.targeting = { cromane_gets_A: t.includes(tokA), other_location_B_excluded: !t.includes(tokB) };

    const type = `${tag}-type`;
    const { data: before } = await admin.from("push_notification_log").select("sent_at").eq("location_id", "cromane").eq("notification_type", type).limit(1).maybeSingle();
    await admin.from("push_notification_log").insert({ location_id: "cromane", notification_type: type, alert_level: 0, details: { selftest: true } });
    const { data: after } = await admin.from("push_notification_log").select("sent_at").eq("location_id", "cromane").eq("notification_type", type)
      .gte("sent_at", new Date(Date.now() - PUSH_COOLDOWN_MS).toISOString()).order("sent_at", { ascending: false }).limit(1).maybeSingle();
    out.cooldown = { first_send_allowed: !isCoolingDown(before?.sent_at), second_send_blocked: isCoolingDown(after?.sent_at) };
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  } finally {
    await admin.from("fcm_tokens").delete().like("token", `${tag}%`);
    await admin.from("push_notification_log").delete().like("notification_type", `${tag}%`);
    out.cleaned_up = true;
  }
  return json(out);
}
