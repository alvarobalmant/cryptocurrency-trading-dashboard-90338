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
    console.log('📥 Received WhatsApp message webhook');
    
    const body = await req.json();
    const { instance_name, event, data } = body;

    if (!instance_name || event !== 'message' || !data) {
      console.log('⚠️ Invalid payload format');
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extract message data from Evolution API format
    const remoteJid = data.key?.remoteJid;
    const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text;
    const fromMe = data.key?.fromMe;

    // Ignore messages sent by the business
    if (fromMe) {
      console.log('⏩ Ignoring message sent by business');
      return new Response(
        JSON.stringify({ success: true, message: 'Message from business ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!remoteJid || !messageText) {
      console.log('⚠️ Missing message data');
      return new Response(
        JSON.stringify({ success: false, message: 'Missing message data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extract phone number (remove @s.whatsapp.net suffix)
    const clientPhone = remoteJid.replace('@s.whatsapp.net', '');
    console.log(`📱 Message from: ${clientPhone}`);
    console.log(`💬 Message: ${messageText}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find barbershop by instance_name
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select('barbershop_id')
      .eq('instance_name', instance_name)
      .eq('connection_status', 'connected')
      .single();

    if (connectionError || !connection) {
      console.error('❌ Barbershop not found or not connected:', connectionError);
      return new Response(
        JSON.stringify({ success: false, message: 'Barbershop not found or not connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const barbershopId = connection.barbershop_id;
    console.log(`🏪 Barbershop ID: ${barbershopId}`);

    // Find or create client profile
    let { data: clientProfile } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('phone', clientPhone)
      .eq('phone_verified', true)
      .maybeSingle();

    if (!clientProfile) {
      console.log('👤 Creating new client profile');
      const { data: newProfile, error: profileError } = await supabase
        .from('client_profiles')
        .insert({
          barbershop_id: barbershopId,
          phone: clientPhone,
          name: `Cliente ${clientPhone.slice(-4)}`,
          phone_verified: true,
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ Error creating client profile:', profileError);
        throw profileError;
      }
      clientProfile = newProfile;
    }

    // Find or create chat session
    let { data: session } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('client_phone', clientPhone)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      console.log('💬 Creating new chat session');
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          barbershop_id: barbershopId,
          client_profile_id: clientProfile.id,
          client_phone: clientPhone,
          status: 'active',
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Error creating session:', sessionError);
        throw sessionError;
      }
      session = newSession;
    }

    // Save user message
    await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: messageText,
      });

    // Get conversation history
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    // Call chatbot function
    console.log('🤖 Calling chatbot...');
    const { data: chatbotResponse, error: chatbotError } = await supabase.functions.invoke('barbershop-chatbot', {
      body: {
        messages: messages || [],
        barbershopId,
        clientPhone,
      },
    });

    if (chatbotError) {
      console.error('❌ Chatbot error:', chatbotError);
      throw chatbotError;
    }

    const aiResponse = chatbotResponse?.response || 'Desculpe, não consegui processar sua mensagem.';
    console.log(`🤖 AI Response: ${aiResponse}`);

    // Save AI response
    await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        role: 'assistant',
        content: aiResponse,
      });

    // Send response back via N8n
    console.log('📤 Sending response via N8n...');
    const sendResponse = await fetch('https://webhook.servicosemautomacoes.shop/webhook/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instance_name,
        to: clientPhone,
        message: aiResponse,
      }),
    });

    if (!sendResponse.ok) {
      console.error('❌ Failed to send message via N8n');
    } else {
      console.log('✅ Message sent successfully');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Message processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error processing message:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
