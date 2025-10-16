import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      barbershopId, 
      clientName, 
      clientPhone, 
      serviceId, 
      travelTimeMinutes 
    } = await req.json();

    console.log("📥 Nova entrada na fila:", { barbershopId, clientName, clientPhone, travelTimeMinutes });

    // Validar configurações da fila
    const { data: settings } = await supabase
      .from("virtual_queue_settings")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .eq("enabled", true)
      .single();

    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Fila virtual não está ativada para esta barbearia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar limite de fila
    const { count } = await supabase
      .from("virtual_queue_entries")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_id", barbershopId)
      .eq("status", "waiting");

    if (count && count >= settings.max_queue_size) {
      return new Response(
        JSON.stringify({ error: "Fila virtual está cheia. Tente novamente mais tarde." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalizar telefone
    const normalizedPhone = clientPhone.replace(/\D/g, "");
    
    // Buscar ou criar perfil do cliente
    let clientProfileId = null;
    const { data: existingProfile } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("barbershop_id", barbershopId)
      .eq("phone", normalizedPhone)
      .eq("phone_verified", true)
      .maybeSingle();

    if (existingProfile) {
      clientProfileId = existingProfile.id;
    }

    // Criar entrada na fila
    const { data: queueEntry, error: insertError } = await supabase
      .from("virtual_queue_entries")
      .insert({
        barbershop_id: barbershopId,
        client_name: clientName,
        client_phone: normalizedPhone,
        service_id: serviceId,
        estimated_arrival_minutes: travelTimeMinutes,
        client_profile_id: clientProfileId,
        status: "waiting"
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erro ao criar entrada:", insertError);
      throw insertError;
    }

    // Log do evento
    await supabase.from("virtual_queue_logs").insert({
      queue_entry_id: queueEntry.id,
      barbershop_id: barbershopId,
      event_type: "queue_joined",
      event_data: { travelTimeMinutes }
    });

    console.log("✅ Entrada criada:", queueEntry.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        entryId: queueEntry.id,
        message: `Você entrou na fila virtual! Será notificado quando faltar ${travelTimeMinutes} minutos para um horário disponível.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});