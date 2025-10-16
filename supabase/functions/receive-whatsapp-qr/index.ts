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
    const body = await req.json();
    const { instance_name, barbershop_id, event_type, qr_code_base64, connected_phone, evolution_instance_id } = body;

    console.log(`📥 Received webhook from N8n:`, {
      instance_name,
      barbershop_id,
      event_type,
      has_qr: !!qr_code_base64,
      connected_phone,
    });

    if (!instance_name || !barbershop_id || !event_type) {
      throw new Error('Missing required fields: instance_name, barbershop_id, event_type');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare update data based on event type
    let updateData: any = {
      instance_name,
      barbershop_id,
      updated_at: new Date().toISOString(),
    };

    switch (event_type) {
      case 'qr_code':
        if (!qr_code_base64) {
          throw new Error('qr_code_base64 is required for qr_code event');
        }
        updateData = {
          ...updateData,
          qr_code_base64,
          connection_status: 'waiting_scan',
          evolution_instance_id: evolution_instance_id || updateData.evolution_instance_id,
        };
        console.log('✅ Saving QR Code...');
        break;

      case 'connected':
        if (!connected_phone) {
          throw new Error('connected_phone is required for connected event');
        }
        updateData = {
          ...updateData,
          connected_phone,
          connection_status: 'connected',
          connected_at: new Date().toISOString(),
          qr_code_base64: null, // Clear QR code
          evolution_instance_id: evolution_instance_id || updateData.evolution_instance_id,
        };
        console.log(`✅ Connection established: ${connected_phone}`);
        break;

      case 'disconnected':
        updateData = {
          ...updateData,
          connection_status: 'disconnected',
          connected_phone: null,
          qr_code_base64: null,
        };
        console.log('⚠️ Disconnected from WhatsApp');
        break;

      default:
        throw new Error(`Unknown event_type: ${event_type}`);
    }

    // Upsert connection data
    const { error: upsertError } = await supabase
      .from('whatsapp_connections')
      .upsert(updateData, {
        onConflict: 'barbershop_id'
      });

    if (upsertError) {
      console.error('❌ Error upserting connection:', upsertError);
      throw upsertError;
    }

    console.log('✅ Connection updated successfully');

    // If connected, notify Chatwoot
    if (event_type === 'connected') {
      console.log('📬 Notifying Chatwoot about connection...');
      try {
        const { data: inbox } = await supabase
          .from('chatwoot_inboxes')
          .select('chatwoot_inbox_id, chatwoot_account_id')
          .eq('barbershop_id', barbershop_id)
          .single();

        if (inbox) {
          const chatwootUrl = Deno.env.get('CHATWOOT_API_URL');
          const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');

          if (chatwootUrl && chatwootToken) {
            await fetch(`${chatwootUrl}/api/v1/accounts/${inbox.chatwoot_account_id}/conversations`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'api_access_token': chatwootToken,
              },
              body: JSON.stringify({
                inbox_id: inbox.chatwoot_inbox_id,
                contact_id: null,
                status: 'open',
                message: {
                  content: `✅ WhatsApp conectado com sucesso!\nTelefone: ${connected_phone}\nInstância: ${instance_name}`,
                  private: true,
                },
              }),
            });
            console.log('✅ Chatwoot notified');
          }
        }
      } catch (chatwootError) {
        console.warn('⚠️ Failed to notify Chatwoot:', chatwootError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Event ${event_type} processed successfully`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
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
