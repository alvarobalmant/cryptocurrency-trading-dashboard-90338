import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Timezone do Brasil (UTC-3)
const BRAZIL_OFFSET_HOURS = -3;
const BRAZIL_OFFSET_MS = BRAZIL_OFFSET_HOURS * 60 * 60 * 1000;

// Converter UTC para horário de Brasília
function toBrasiliaTime(utcDate: Date): Date {
  return new Date(utcDate.getTime() + BRAZIL_OFFSET_MS);
}

// Converter horário de Brasília para UTC
function toUTC(brasiliaDate: Date): Date {
  return new Date(brasiliaDate.getTime() - BRAZIL_OFFSET_MS);
}

// Formatar data para string no formato brasileiro
function formatBrasiliaDateTime(date: Date): string {
  const brasiliaDate = toBrasiliaTime(date);
  const day = String(brasiliaDate.getUTCDate()).padStart(2, '0');
  const month = String(brasiliaDate.getUTCMonth() + 1).padStart(2, '0');
  const year = brasiliaDate.getUTCFullYear();
  const hours = String(brasiliaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(brasiliaDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(brasiliaDate.getUTCSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Formatar apenas hora
function formatBrasiliaTime(date: Date): string {
  const brasiliaDate = toBrasiliaTime(date);
  const hours = String(brasiliaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(brasiliaDate.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Formatar para o banco (HH:MM:SS)
function formatTimeForDB(date: Date): string {
  const brasiliaDate = toBrasiliaTime(date);
  const hours = String(brasiliaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(brasiliaDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(brasiliaDate.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Formatar data para o banco (YYYY-MM-DD)
function formatDateForDB(date: Date): string {
  const brasiliaDate = toBrasiliaTime(date);
  const year = brasiliaDate.getUTCFullYear();
  const month = String(brasiliaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(brasiliaDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AvailableSlot {
  start: Date;
  end: Date;
  employeeId: string;
}

interface QueueEntry {
  id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  employee_id: string | null;
  estimated_arrival_minutes: number;
  created_at: string;
  priority_score: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Horário atual em UTC
    const nowUTC = new Date();
    const nowBrasilia = toBrasiliaTime(nowUTC);
    
    console.log("🔄 Iniciando monitor de fila virtual...");
    console.log(`   UTC: ${nowUTC.toISOString()}`);
    console.log(`   Brasília: ${formatBrasiliaDateTime(nowUTC)}`);

    // Buscar barbearias com fila virtual ativada
    const { data: barbershopsWithQueue } = await supabase
      .from("virtual_queue_settings")
      .select("*, barbershops!inner(id, whatsapp_business_account_id)")
      .eq("enabled", true);

    if (!barbershopsWithQueue || barbershopsWithQueue.length === 0) {
      console.log("ℹ️ Nenhuma barbearia com fila virtual ativa");
      return new Response(
        JSON.stringify({ message: "Nenhuma barbearia com fila virtual ativa" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const queueSettings of barbershopsWithQueue) {
      const barbershopId = queueSettings.barbershop_id;
      console.log(`📋 Processando barbearia: ${barbershopId}`);

      // Buscar entradas aguardando
      const { data: waitingEntries } = await supabase
        .from("virtual_queue_entries")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("status", "waiting")
        .order("created_at", { ascending: true });

      if (!waitingEntries || waitingEntries.length === 0) {
        console.log(`  ℹ️ Nenhuma entrada aguardando`);
        continue;
      }

      console.log(`  👥 ${waitingEntries.length} entradas aguardando`);

      // Buscar slots disponíveis nas próximas 4 horas em Brasília
      const fourHoursLaterBrasilia = new Date(nowBrasilia.getTime() + 4 * 60 * 60 * 1000);
      const startDate = formatDateForDB(nowUTC);
      const endDate = formatDateForDB(toUTC(fourHoursLaterBrasilia));

      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .in("status", ["pending", "confirmed", "queue_reserved"]);

      // Buscar serviços, funcionários e business hours
      const { data: services } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("active", true);

      const { data: employees } = await supabase
        .from("employees")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("status", "active");

      // Buscar relações funcionário-serviço
      const { data: employeeServices } = await supabase
        .from("employee_services")
        .select("employee_id, service_id");

      const { data: barbershopData } = await supabase
        .from("barbershops")
        .select("business_hours")
        .eq("id", barbershopId)
        .single();

      if (!services || !employees || !barbershopData) continue;

      const businessHours = barbershopData.business_hours;

      // Calcular prioridade para cada entrada
      const entriesWithPriority = waitingEntries.map((entry, index) => {
        const waitTime = nowUTC.getTime() - new Date(entry.created_at).getTime();
        const waitMinutes = waitTime / (1000 * 60);
        
        const priorityScore = 
          (queueSettings.eta_weight * (100 - entry.estimated_arrival_minutes)) +
          (queueSettings.position_weight * (100 - index)) +
          (queueSettings.wait_time_bonus * Math.min(waitMinutes, 60));

        return { ...entry, calculatedPriority: priorityScore };
      });

      // Encontrar slots disponíveis
      for (const entry of entriesWithPriority) {
        const service = services.find(s => s.id === entry.service_id);
        if (!service) continue;

        console.log(`  🔍 DEBUG - Cliente: ${entry.client_name}`);
        console.log(`     Serviço: ${service.name} (${service.duration_minutes} min)`);

        const durationMinutes = service.duration_minutes;
        const bufferMultiplier = 1 - (queueSettings.buffer_percentage / 100);
        const requiredDuration = Math.floor(durationMinutes * bufferMultiplier);

        // Filtrar funcionários que fazem esse serviço
        const serviceEmployeeIds = employeeServices
          ?.filter(es => es.service_id === entry.service_id)
          .map(es => es.employee_id) || [];

        // Se tem preferência de funcionário, usar só ele (se faz o serviço)
        // Senão, usar todos que fazem o serviço
        const eligibleEmployees = entry.employee_id 
          ? employees.filter(e => e.id === entry.employee_id && serviceEmployeeIds.includes(e.id))
          : employees.filter(e => serviceEmployeeIds.includes(e.id));

        console.log(`     Funcionários que fazem este serviço: ${eligibleEmployees.length}`);
        console.log(`     Appointments existentes: ${existingAppointments?.length || 0}`);

        // Encontrar o funcionário com o slot mais cedo disponível
        let earliestSlot: AvailableSlot | null = null;
        let selectedEmployee: any = null;

        for (const employee of eligibleEmployees) {
          const slot = findNextAvailableSlot(
            nowBrasilia,
            fourHoursLaterBrasilia,
            employee.id,
            requiredDuration,
            existingAppointments || [],
            entry.estimated_arrival_minutes,
            businessHours
          );

          if (slot) {
            // Se é o primeiro slot ou se é mais cedo que o anterior
            if (!earliestSlot || slot.start.getTime() < earliestSlot.start.getTime()) {
              earliestSlot = slot;
              selectedEmployee = employee;
            }
          }
        }

        if (earliestSlot && selectedEmployee) {
          const slot = earliestSlot;
          const employee = selectedEmployee;
          
          // Arredondar o slot para múltiplos de 10 minutos
          const roundedSlotStart = roundToValidSlot(slot.start);
          const roundedSlotEnd = new Date(roundedSlotStart.getTime() + requiredDuration * 60 * 1000);
          
          // Calcular quanto tempo falta até o slot (em minutos)
          const minutesUntilSlot = Math.floor((roundedSlotStart.getTime() - nowBrasilia.getTime()) / (1000 * 60));
          
          console.log(`     ✅ Slot encontrado e arredondado: ${formatBrasiliaDateTime(toUTC(roundedSlotStart))} - ${formatBrasiliaDateTime(toUTC(roundedSlotEnd))}`);
          console.log(`     👤 Profissional selecionado: ${employee.name}`);
          console.log(`     ⏰ Agora: ${formatBrasiliaDateTime(nowUTC)}`);
          console.log(`     ⏱️ Tempo até slot: ${minutesUntilSlot} min`);
          console.log(`     🚗 Tempo de deslocamento informado: ${entry.estimated_arrival_minutes} min`);
          
          // Janela ideal para notificação por WhatsApp (10-120 minutos)
          const minNotificationTime = 10;
          const maxNotificationTime = 120;
          const shouldSendWhatsApp = minutesUntilSlot >= minNotificationTime 
                                  && minutesUntilSlot <= maxNotificationTime;

          // Sempre criar agendamento se slot estiver dentro das próximas 4 horas
          const maxSlotTime = 4 * 60; // 4 horas
          const shouldCreateAppointment = minutesUntilSlot > 0 && minutesUntilSlot <= maxSlotTime;

          console.log(`     📊 Janela WhatsApp: ${minNotificationTime} - ${maxNotificationTime} min`);
          console.log(`     ${shouldSendWhatsApp ? '✅' : '⏸️'} Enviar WhatsApp? ${shouldSendWhatsApp}`);
          console.log(`     ${shouldCreateAppointment ? '✅' : '❌'} Criar agendamento? ${shouldCreateAppointment}`);

          if (shouldCreateAppointment) {
            console.log(`  ✅ Criando agendamento para cliente: ${entry.client_name}`);

            // CRIAR APPOINTMENT - converter de horário de Brasília para formato do banco
            const appointmentDate = formatDateForDB(toUTC(roundedSlotStart));
            const startTime = formatTimeForDB(toUTC(roundedSlotStart));
            const endTime = formatTimeForDB(toUTC(roundedSlotEnd));
            
            console.log(`  📅 Criando appointment: ${appointmentDate} ${startTime}-${endTime}`);

            const { data: provisionalAppointment, error: appointmentError } = await supabase
              .from("appointments")
              .insert({
                barbershop_id: barbershopId,
                employee_id: employee.id,
                service_id: entry.service_id,
                appointment_date: appointmentDate,
                start_time: startTime,
                end_time: endTime,
                client_name: entry.client_name,
                client_phone: entry.client_phone,
                client_profile_id: entry.client_profile_id,
                status: "queue_reserved",
                payment_status: "pending",
                virtual_queue_entry_id: entry.id,
                source: "virtual_queue"
              })
              .select()
              .single();

            if (appointmentError) {
              console.error(`  ❌ Erro ao criar appointment provisório:`, appointmentError);
              continue;
            }

            console.log(`  ✅ Appointment provisório criado: ${provisionalAppointment.id}`);

            // Atualizar entrada - converter para UTC para o banco
            const expiresAtBrasilia = new Date(nowBrasilia.getTime() + 5 * 60 * 1000);
            const expiresAtUTC = toUTC(expiresAtBrasilia);
            const slotStartUTC = toUTC(roundedSlotStart);
            const slotEndUTC = toUTC(roundedSlotEnd);
            
            await supabase
              .from("virtual_queue_entries")
              .update({
                status: "notified",
                notification_sent_at: nowUTC.toISOString(),
                notification_expires_at: expiresAtUTC.toISOString(),
                reserved_slot_start: slotStartUTC.toISOString(),
                reserved_slot_end: slotEndUTC.toISOString(),
                priority_score: entry.calculatedPriority
              })
              .eq("id", entry.id);

            // Log
            await supabase.from("virtual_queue_logs").insert({
              queue_entry_id: entry.id,
              barbershop_id: barbershopId,
              event_type: "notification_sent",
              event_data: { 
                slot: { 
                  start: slotStartUTC.toISOString(), 
                  end: slotEndUTC.toISOString() 
                } 
              }
            });

            // Enviar WhatsApp apenas se dentro da janela ideal
            if (shouldSendWhatsApp && whatsappToken && queueSettings.barbershops?.whatsapp_business_account_id) {
              console.log(`  📱 Enviando WhatsApp para ${entry.client_phone}`);
              const slotTime = formatBrasiliaTime(toUTC(roundedSlotStart));
              const minutesToSlot = Math.floor((roundedSlotStart.getTime() - nowBrasilia.getTime()) / (1000 * 60));
              
              const message = `🔔 *Sua vez está chegando!*\n\n` +
                `Olá ${entry.client_name}!\n\n` +
                `Temos um horário disponível para você em *${minutesToSlot} minutos*:\n` +
                `⏰ Horário: ${slotTime}\n` +
                `💈 Serviço: ${service.name}\n\n` +
                `Este é o momento perfeito para você sair! ` +
                `Com base no tempo de deslocamento que você informou (${entry.estimated_arrival_minutes} min), ` +
                `você chegará exatamente no horário!\n\n` +
                `Responda *SIM* para confirmar ou *NÃO* para cancelar.\n` +
                `⚠️ Você tem 5 minutos para confirmar!`;

              try {
                const whatsappResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${queueSettings.barbershops.whatsapp_business_account_id}/messages`,
                  {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${whatsappToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      messaging_product: "whatsapp",
                      to: entry.client_phone,
                      type: "text",
                      text: { body: message },
                    }),
                  }
                );

                if (whatsappResponse.ok) {
                  console.log(`  ✅ WhatsApp enviado para ${entry.client_phone}`);
                } else {
                  console.error(`  ❌ Erro ao enviar WhatsApp:`, await whatsappResponse.text());
                }
              } catch (error) {
                console.error(`  ❌ Erro no WhatsApp:`, error);
              }
            } else if (!shouldSendWhatsApp) {
              console.log(`  ⏸️ WhatsApp não enviado - fora da janela ideal (slot em ${minutesUntilSlot} min)`);
            } else {
              console.log(`  ⚠️ WhatsApp não configurado para esta barbearia`);
            }
          } else {
            console.log(`  ❌ Slot rejeitado - fora do limite de 4 horas (slot em ${minutesUntilSlot} min)`);
          }
        } else {
          console.log(`  ❌ Nenhum slot disponível para este cliente nos próximos horários`);
        }
      }

      // Limpar notificações expiradas e deletar appointments provisórios
      const { data: expiredEntries } = await supabase
        .from("virtual_queue_entries")
        .select("id")
        .eq("barbershop_id", barbershopId)
        .eq("status", "notified")
        .lt("notification_expires_at", nowUTC.toISOString());

      if (expiredEntries && expiredEntries.length > 0) {
        const expiredIds = expiredEntries.map(e => e.id);
        
        // Deletar appointments provisórios
        await supabase
          .from("appointments")
          .delete()
          .in("virtual_queue_entry_id", expiredIds)
          .eq("status", "queue_reserved");

        await supabase
          .from("virtual_queue_entries")
          .update({ status: "expired" })
          .in("id", expiredIds);

        await supabase.from("virtual_queue_logs").insert(
          expiredIds.map(id => ({
            queue_entry_id: id,
            barbershop_id: barbershopId,
            event_type: "notification_expired",
            event_data: {}
          }))
        );

        console.log(`  ⏰ ${expiredIds.length} notificações expiradas (appointments deletados)`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Monitor executado com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro no monitor:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Arredondar para o próximo slot válido (10 em 10 minutos)
// A data já está em horário de Brasília, então usar métodos locais
function roundToValidSlot(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 10) * 10;
  
  const rounded = new Date(date);
  
  if (roundedMinutes >= 60) {
    rounded.setHours(date.getHours() + 1);
    rounded.setMinutes(0);
  } else {
    rounded.setMinutes(roundedMinutes);
  }
  
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  
  return rounded;
}

// Parse appointment do banco: date e time vêm como strings, interpretar como horário de Brasília
function parseAppointmentTime(date: string, time: string): Date {
  // date: "2025-10-03", time: "14:30:00"
  // Interpretar como horário de Brasília
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, seconds] = time.split(':').map(Number);
  
  // Criar data em Brasília (usando UTC como base + offset)
  const brasiliaDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds || 0));
  return brasiliaDate;
}

function isWithinBusinessHours(time: Date, businessHours: any): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[time.getUTCDay()];
  const hours = businessHours[dayOfWeek];
  
  if (!hours || hours.closed) return false;
  
  const timeStr = formatTimeForDB(toUTC(time)).substring(0, 5);
  return timeStr >= hours.open && timeStr <= hours.close;
}

function findNextAvailableSlot(
  start: Date,
  end: Date,
  employeeId: string,
  durationMinutes: number,
  existingAppointments: any[],
  clientTravelTime: number,
  businessHours: any
): AvailableSlot | null {
  // Appointments já interpretados como horário de Brasília
  const employeeAppointments = existingAppointments
    .filter(apt => apt.employee_id === employeeId)
    .filter(apt => apt.status !== 'cancelled' && apt.status !== 'no_show')
    .map(apt => ({
      ...apt,
      start: parseAppointmentTime(apt.appointment_date, apt.start_time),
      end: parseAppointmentTime(apt.appointment_date, apt.end_time)
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // start já está em horário de Brasília
  // Adicionar margem de segurança de 10 minutos ao tempo de deslocamento
  const safetyMargin = 10;
  const minSlotTime = new Date(start.getTime() + (clientTravelTime + safetyMargin) * 60 * 1000);
  let currentTime = roundToValidSlot(minSlotTime);

  console.log(`     🔍 Buscando slot a partir de: ${formatBrasiliaDateTime(toUTC(currentTime))}`);
  console.log(`     ⏰ Horário atual: ${formatBrasiliaDateTime(toUTC(start))}`);
  console.log(`     ⏰ Tempo mínimo do slot: ${formatBrasiliaDateTime(toUTC(minSlotTime))}`);
  console.log(`     📅 ${employeeAppointments.length} appointments existentes para este funcionário`);

  for (const apt of employeeAppointments) {
    const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);
    
    console.log(`        Testando slot: ${formatTimeForDB(toUTC(currentTime))} - ${formatTimeForDB(toUTC(slotEnd))}`);
    console.log(`        Appointment existente: ${formatTimeForDB(toUTC(apt.start))} - ${formatTimeForDB(toUTC(apt.end))}`);
    
    if (currentTime.getTime() < minSlotTime.getTime()) {
      console.log(`        ⚠️ Slot no passado! Pulando para minSlotTime`);
      currentTime = roundToValidSlot(minSlotTime);
      continue;
    }
    
    if (slotEnd.getTime() <= apt.start.getTime()) {
      if (isWithinBusinessHours(currentTime, businessHours) && 
          isWithinBusinessHours(slotEnd, businessHours)) {
        
        if (currentTime.getTime() >= minSlotTime.getTime()) {
          console.log(`        ✅ Slot válido encontrado no futuro!`);
          return {
            start: currentTime,
            end: slotEnd,
            employeeId
          };
        } else {
          console.log(`        ❌ Slot rejeitado por estar no passado`);
        }
      }
    }

    const nextTime = roundToValidSlot(new Date(apt.end.getTime()));
    currentTime = new Date(Math.max(nextTime.getTime(), minSlotTime.getTime()));
    console.log(`        ⏭️ Próximo slot: ${formatTimeForDB(toUTC(currentTime))}`);
  }

  // Testar slot final
  const finalSlotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);
  console.log(`     🔍 Testando slot final: ${formatTimeForDB(toUTC(currentTime))} - ${formatTimeForDB(toUTC(finalSlotEnd))}`);
  
  if (finalSlotEnd.getTime() <= end.getTime() &&
      isWithinBusinessHours(currentTime, businessHours) &&
      isWithinBusinessHours(finalSlotEnd, businessHours) &&
      currentTime.getTime() >= minSlotTime.getTime()) {
    
    console.log(`     ✅ Slot final válido!`);
    return {
      start: currentTime,
      end: finalSlotEnd,
      employeeId
    };
  }

  console.log(`     ❌ Nenhum slot disponível no futuro`);
  return null;
}
