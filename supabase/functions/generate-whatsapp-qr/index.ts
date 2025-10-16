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
    const { barbershopId } = await req.json();

    if (!barbershopId) {
      throw new Error('barbershopId is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get barbershop info
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('id', barbershopId)
      .single();

    if (barbershopError || !barbershop) {
      throw new Error('Barbershop not found');
    }

    // Normalize barbershop name to create instance_name
    const instanceName = barbershop.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();

    console.log(`📱 Generating QR for barbershop: ${barbershop.name} (${instanceName})`);

    // Delete old QR code data for this instance before generating new one
    const { error: deleteQrError } = await supabase
      .from('qrcodewhatsapp')
      .delete()
      .eq('instancia', instanceName);

    if (deleteQrError) {
      console.warn('⚠️ Error deleting old QR code data:', deleteQrError);
    } else {
      console.log('✅ Old QR code data deleted');
    }

    // Upsert connection record with waiting_scan status
    const { error: upsertError } = await supabase
      .from('whatsapp_connections')
      .upsert({
        barbershop_id: barbershopId,
        instance_name: instanceName,
        connection_status: 'waiting_scan',
        qr_code_base64: null,
        last_qr_generated_at: new Date().toISOString(),
      }, {
        onConflict: 'barbershop_id'
      });

    if (upsertError) {
      console.error('Error upserting connection:', upsertError);
      throw upsertError;
    }

    // Call N8n webhook to generate QR code
    const n8nWebhookUrl = 'https://webhook.servicosemautomacoes.shop/webhook/salaodebeleza';
    
    console.log(`🔗 Calling N8n webhook: ${n8nWebhookUrl}`);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate_qr',
        instance_name: instanceName,
        barbershop_id: barbershopId,
      }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error(`N8n webhook error: ${errorText}`);
      throw new Error(`N8n webhook failed: ${n8nResponse.status}`);
    }

    const n8nData = await n8nResponse.json();
    console.log('✅ N8n response:', n8nData);

    // Create Chatwoot inbox after QR generation
    console.log('📬 Creating Chatwoot inbox...');
    try {
      const inboxResponse = await fetch(`${supabaseUrl}/functions/v1/create-chatwoot-inbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          barbershopId: barbershopId,
          instanceName: instanceName,
        }),
      });

      if (inboxResponse.ok) {
        const inboxData = await inboxResponse.json();
        console.log('✅ Chatwoot inbox created:', inboxData.inbox_id);
      } else {
        console.warn('⚠️ Failed to create Chatwoot inbox, will retry later');
      }
    } catch (inboxError) {
      console.warn('⚠️ Error creating Chatwoot inbox:', inboxError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'QR code generation started',
        instance_name: instanceName,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
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
