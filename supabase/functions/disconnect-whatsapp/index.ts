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

    // Get barbershop and connection info
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

    console.log(`📱 Disconnecting WhatsApp for: ${barbershop.name} (${instanceName})`);

    // Call webhook to disconnect WhatsApp
    const webhookUrl = 'https://webhook.servicosemautomacoes.shop/webhook/whatsappdesconectado';
    
    console.log(`🔗 Calling disconnect webhook: ${webhookUrl}`);

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'disconnect',
        instance_name: instanceName,
        barbershop_id: barbershopId,
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook error: ${errorText}`);
      throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }

    console.log('✅ Webhook called successfully');

    // Update connection status to disconnected
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({
        connection_status: 'disconnected',
        qr_code_base64: null,
        connected_phone: null,
        connected_at: null,
      })
      .eq('barbershop_id', barbershopId);

    if (updateError) {
      console.error('Error updating connection:', updateError);
      throw updateError;
    }

    console.log('✅ Connection status updated to disconnected');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'WhatsApp disconnected successfully',
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
