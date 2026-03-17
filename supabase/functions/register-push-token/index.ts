import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    // Validate token exists and is a string
    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate token length (FCM tokens are typically 152-163 chars)
    if (token.length < 20 || token.length > 500) {
      return new Response(JSON.stringify({ error: 'Invalid token length' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate token format (alphanumeric, hyphens, underscores, colons)
    const FCM_TOKEN_REGEX = /^[A-Za-z0-9_\-:]+$/;
    if (!FCM_TOKEN_REGEX.test(token)) {
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert token (update last_used_at if already exists)
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        { token, last_used_at: new Date().toISOString() },
        { onConflict: 'token' }
      );

    if (error) throw error;

    return new Response(JSON.stringify({ registered: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Token registration error:', error);
    return new Response(JSON.stringify({ error: 'Failed to register token' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
