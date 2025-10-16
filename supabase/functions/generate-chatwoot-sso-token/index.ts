import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { barbershopId } = await req.json();
    if (!barbershopId) {
      throw new Error('barbershopId is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log(`🔐 Generating SSO token for user: ${user.email}`);

    // Verify user owns the barbershop
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .eq('id', barbershopId)
      .single();

    if (barbershopError || !barbershop) {
      throw new Error('Barbershop not found');
    }

    if (barbershop.owner_id !== user.id) {
      throw new Error('Unauthorized: Not the owner of this barbershop');
    }

    // Get Chatwoot inbox info
    const { data: inbox, error: inboxError } = await supabase
      .from('chatwoot_inboxes')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single();

    if (inboxError || !inbox) {
      throw new Error('Chatwoot inbox not found. Please connect WhatsApp first.');
    }

    // Get Chatwoot credentials
    const chatwootSsoSecret = Deno.env.get('CHATWOOT_SSO_SECRET');
    const chatwootBaseUrl = Deno.env.get('CHATWOOT_BASE_URL');

    if (!chatwootSsoSecret || !chatwootBaseUrl) {
      throw new Error('Chatwoot SSO credentials not configured');
    }

    // Create JWT payload
    const payload = {
      identifier: user.id,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      email: user.email,
      role: 'agent',
    };

    console.log('📝 JWT payload:', payload);

    // Generate JWT token using jose
    const secret = new TextEncoder().encode(chatwootSsoSecret);
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(secret);

    // Construct SSO URL
    const ssoUrl = `${chatwootBaseUrl}/app/accounts/${inbox.chatwoot_account_id}/auth/sso?token=${jwt}`;

    console.log('✅ SSO token generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        sso_url: ssoUrl,
        inbox_id: inbox.chatwoot_inbox_id,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error generating SSO token:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
