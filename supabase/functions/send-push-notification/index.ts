import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cooldown: don't send same notification type within this window
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FCM_SERVER_KEY = Deno.env.get('FIREBASE_FCM_SERVER_KEY');
    if (!FCM_SERVER_KEY) {
      throw new Error('FCM Server Key not configured');
    }

    const { title, body, notification_type, alert_level, data } = await req.json();

    if (!title || !body || !notification_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Init Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cooldown — don't spam
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: recentNotifs } = await supabase
      .from('push_notification_log')
      .select('id')
      .eq('notification_type', notification_type)
      .gte('sent_at', cutoff)
      .limit(1);

    if (recentNotifs && recentNotifs.length > 0) {
      return new Response(JSON.stringify({ 
        sent: 0, 
        reason: 'cooldown_active',
        message: `Notification type "${notification_type}" sent recently. Cooling down.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all registered tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token');

    if (tokenError) throw tokenError;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send to each token via FCM Legacy HTTP API
    let successCount = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      try {
        const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title,
              body,
              icon: '/favicon.ico',
              click_action: supabaseUrl.replace('.supabase.co', '.lovable.app'),
            },
            data: data || {},
          }),
        });

        const result = await fcmRes.json();
        
        if (result.success === 1) {
          successCount++;
        } else if (result.results?.[0]?.error === 'NotRegistered' || 
                   result.results?.[0]?.error === 'InvalidRegistration') {
          staleTokens.push(token);
        }
      } catch (e) {
        console.error(`FCM send error for token ${token.substring(0, 10)}...`, e);
      }
    }

    // Clean up stale tokens
    if (staleTokens.length > 0) {
      await supabase.from('fcm_tokens').delete().in('token', staleTokens);
      console.log(`Cleaned ${staleTokens.length} stale FCM tokens`);
    }

    // Log the notification
    await supabase.from('push_notification_log').insert({
      notification_type,
      alert_level: alert_level || 0,
      details: { title, body, sent: successCount, total_tokens: tokens.length },
    });

    // Update last_used_at for active tokens
    const activeTokens = tokens
      .map(t => t.token)
      .filter(t => !staleTokens.includes(t));
    if (activeTokens.length > 0) {
      await supabase
        .from('fcm_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .in('token', activeTokens);
    }

    return new Response(JSON.stringify({ 
      sent: successCount, 
      total_tokens: tokens.length,
      stale_cleaned: staleTokens.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
