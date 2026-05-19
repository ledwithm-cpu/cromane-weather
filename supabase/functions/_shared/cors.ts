// Shared CORS headers for all edge functions.
// Includes the extended Supabase client headers (platform/runtime variants)
// — harmless when the client doesn't send them, required when it does.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export const jsonCorsHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};
