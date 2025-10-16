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
    const { barbershopId, instanceName } = await req.json();

    if (!barbershopId || !instanceName) {
      throw new Error('barbershopId and instanceName are required');
    }

    console.log(`📥 Creating Chatwoot inbox for barbershop: ${barbershopId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if inbox already exists
    const { data: existingInbox } = await supabase
      .from('chatwoot_inboxes')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single();

    if (existingInbox) {
      console.log('✅ Inbox already exists:', existingInbox.chatwoot_inbox_id);
      return new Response(
        JSON.stringify({
          success: true,
          inbox_id: existingInbox.chatwoot_inbox_id,
          message: 'Inbox already exists',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get barbershop info
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('name')
      .eq('id', barbershopId)
      .single();

    if (!barbershop) {
      throw new Error('Barbershop not found');
    }

    // Get Chatwoot credentials
    const chatwootUrl = Deno.env.get('CHATWOOT_API_URL');
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootAccountId = Deno.env.get('CHATWOOT_ACCOUNT_ID');

    if (!chatwootUrl || !chatwootToken || !chatwootAccountId) {
      throw new Error('Chatwoot credentials not configured');
    }

    // Create inbox in Chatwoot
    console.log('🔗 Creating inbox in Chatwoot...');
    const chatwootResponse = await fetch(`${chatwootUrl}/api/v1/accounts/${chatwootAccountId}/inboxes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': chatwootToken,
      },
      body: JSON.stringify({
        name: `${barbershop.name} - WhatsApp`,
        channel: {
          type: 'api',
          webhook_url: '',
        },
      }),
    });

    if (!chatwootResponse.ok) {
      const errorText = await chatwootResponse.text();
      console.error('❌ Chatwoot error:', errorText);
      throw new Error(`Chatwoot API error: ${chatwootResponse.status}`);
    }

    const chatwootData = await chatwootResponse.json();
    console.log('✅ Inbox created in Chatwoot:', chatwootData.id);

    // Save inbox info to Supabase
    const { error: insertError } = await supabase
      .from('chatwoot_inboxes')
      .insert({
        barbershop_id: barbershopId,
        chatwoot_inbox_id: chatwootData.id,
        chatwoot_account_id: parseInt(chatwootAccountId),
        inbox_name: chatwootData.name,
        inbox_identifier: chatwootData.inbox_identifier,
        webhook_url: chatwootData.webhook_url || '',
      });

    if (insertError) {
      console.error('❌ Error saving inbox:', insertError);
      throw insertError;
    }

    // Update whatsapp_connections with chatwoot_inbox_id
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({ chatwoot_inbox_id: chatwootData.id })
      .eq('barbershop_id', barbershopId);

    if (updateError) {
      console.error('⚠️ Error updating whatsapp_connections:', updateError);
    }

    console.log('✅ Inbox created and saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        inbox_id: chatwootData.id,
        inbox_identifier: chatwootData.inbox_identifier,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error creating inbox:', error);
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
