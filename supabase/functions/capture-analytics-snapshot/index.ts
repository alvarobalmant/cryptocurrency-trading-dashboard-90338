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
    const body = req.method === 'POST' ? await req.json() : {};
    const { 
      barbershopId,
      periodType = 'month',
      startDate,
      endDate,
      manual = false
    } = body;

    console.log('🔄 Iniciando captura de analytics snapshots...', { periodType, barbershopId });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Calcular período
    let start: string, end: string;
    const today = new Date();

    switch (periodType) {
      case 'day':
        start = today.toISOString().split('T')[0];
        end = start;
        break;
      
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        start = monthAgo.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      
      case 'custom':
        if (!startDate || !endDate) {
          throw new Error('startDate e endDate são obrigatórios para periodType=custom');
        }
        start = startDate;
        end = endDate;
        break;
      
      default:
        const defaultStart = new Date(today);
        defaultStart.setDate(defaultStart.getDate() - 30);
        start = defaultStart.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
    }

    // Validar período máximo (90 dias)
    const diffDays = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      throw new Error('Período máximo permitido: 90 dias');
    }

    console.log(`📅 Período: ${start} até ${end} (${diffDays} dias)`);

    // Buscar barbearias
    let query = supabase
      .from('barbershops')
      .select('id, name')
      .eq('active', true);

    if (barbershopId) {
      query = query.eq('id', barbershopId);
    }

    const { data: barbershops, error: barbershopsError } = await query;

    if (barbershopsError) throw barbershopsError;

    console.log(`📋 Encontradas ${barbershops?.length || 0} barbearias ativas`);

    const results = { success: [] as string[], failed: [] as any[] };

    for (const barbershop of barbershops || []) {
      try {
        console.log(`\n🏪 ${barbershop.name}`);
        
        // Buscar dados básicos incluindo PAYMENTS (CRÍTICO para LTV correto)
        const [appointmentsRes, employeesRes, servicesRes, clientProfilesRes, paymentsRes] = await Promise.all([
          supabase.from('appointments').select('*').eq('barbershop_id', barbershop.id).gte('appointment_date', start).lte('appointment_date', end),
          supabase.from('employees').select('*').eq('barbershop_id', barbershop.id).eq('status', 'active'),
          supabase.from('services').select('*').eq('barbershop_id', barbershop.id),
          supabase.from('client_profiles').select('*').eq('barbershop_id', barbershop.id),
          supabase.from('payments').select('*').eq('barbershop_id', barbershop.id).eq('status', 'paid')
        ]);

        const appointments = appointmentsRes.data || [];
        const employees = employeesRes.data || [];
        const services = servicesRes.data || [];
        const clients = clientProfilesRes.data || [];
        const paymentsData = paymentsRes.data || [];

        // Buscar schedules dos funcionários ativos
        const employeeIds = employees.map(e => e.id);
        const { data: employeeSchedules } = await supabase
          .from('employee_schedules')
          .select('*')
          .in('employee_id', employeeIds)
          .eq('is_active', true);

        // Criar map de schedules para lookup rápido
        const schedulesMap = new Map<string, any[]>();
        (employeeSchedules || []).forEach(schedule => {
          if (!schedulesMap.has(schedule.employee_id)) {
            schedulesMap.set(schedule.employee_id, []);
          }
          schedulesMap.get(schedule.employee_id)!.push(schedule);
        });

        // Buscar pausas/intervalos dos funcionários (almoço, descansos)
        const { data: employeeBreaks } = await supabase
          .from('employee_breaks')
          .select('*')
          .in('employee_id', employeeIds)
          .eq('is_active', true);

        // Criar map de breaks para lookup rápido
        const breaksMap = new Map<string, any[]>();
        (employeeBreaks || []).forEach(breakItem => {
          if (!breaksMap.has(breakItem.employee_id)) {
            breaksMap.set(breakItem.employee_id, []);
          }
          breaksMap.get(breakItem.employee_id)!.push(breakItem);
        });

        // Criar maps de serviços
        const servicesMap = new Map(services.map(s => [s.id, s]));

        // ===== MÉTRICAS DETALHADAS POR FUNCIONÁRIO =====
        const employeeDetails = employees.map(emp => {
          const empAppointments = appointments.filter(a => a.employee_id === emp.id);
          const confirmedAppts = empAppointments.filter(a => a.status === 'confirmed');
          const pendingAppts = empAppointments.filter(a => a.status === 'pending');
          const cancelledAppts = empAppointments.filter(a => a.status === 'cancelled' || a.status === 'no_show');
          
          const confirmedRevenue = confirmedAppts.reduce((sum, a) => {
            const service = servicesMap.get(a.service_id);
            return sum + (Number(service?.price) || 0);
          }, 0);

          const pendingRevenue = pendingAppts.reduce((sum, a) => {
            const service = servicesMap.get(a.service_id);
            return sum + (Number(service?.price) || 0);
          }, 0);

          const cancelledRevenue = cancelledAppts.reduce((sum, a) => {
            const service = servicesMap.get(a.service_id);
            return sum + (Number(service?.price) || 0);
          }, 0);

          const revenue = confirmedRevenue + pendingRevenue + cancelledRevenue;
          const clientsServed = new Set(empAppointments.map(a => a.client_phone)).size;
          
          // === CALCULAR MAPA DE CALOR (UTILIZAÇÃO SEMANAL) ===
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const weeklyUtilization: any = {};
          let totalAvailableHours = 0;
          let totalWorkedHours = 0;

          // Para cada dia da semana (0=domingo, 6=sábado)
          for (let dow = 0; dow <= 6; dow++) {
            const dayName = dayNames[dow];
            
            // Buscar schedules deste dia
            const daySchedules = (schedulesMap.get(emp.id) || []).filter((s: any) => s.day_of_week === dow);
            
            // Calcular horas brutas de trabalho (somar todos os schedules do dia)
            let availableHours = daySchedules.reduce((sum: number, schedule: any) => {
              const start = schedule.start_time.split(':');
              const end = schedule.end_time.split(':');
              const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
              const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
              const durationMinutes = endMinutes - startMinutes;
              return sum + (durationMinutes / 60);
            }, 0);

            // Descontar pausas/intervalos deste dia (almoço, etc)
            const dayBreaks = (breaksMap.get(emp.id) || []).filter((b: any) => {
              // Breaks recorrentes por dia da semana
              if (b.break_type === 'recurring' && b.day_of_week === dow) return true;
              // Breaks de data específica (checar se está no período do snapshot)
              if (b.break_type === 'one_time' && b.specific_date) {
                const breakDate = new Date(b.specific_date + 'T00:00:00');
                return breakDate.getDay() === dow && 
                       breakDate >= new Date(start) && 
                       breakDate <= new Date(end);
              }
              return false;
            });

            const breakHours = dayBreaks.reduce((sum: number, breakItem: any) => {
              const breakStart = breakItem.start_time.split(':');
              const breakEnd = breakItem.end_time.split(':');
              const breakStartMinutes = parseInt(breakStart[0]) * 60 + parseInt(breakStart[1]);
              const breakEndMinutes = parseInt(breakEnd[0]) * 60 + parseInt(breakEnd[1]);
              const breakDurationMinutes = breakEndMinutes - breakStartMinutes;
              return sum + (breakDurationMinutes / 60);
            }, 0);

            // Horas disponíveis = horas de trabalho - horas de pausa
            availableHours = Math.max(0, availableHours - breakHours);
            
            // Calcular horas trabalhadas (appointments confirmados neste dia da semana)
            const dayAppointments = confirmedAppts.filter((a: any) => {
              const appointmentDate = new Date(a.appointment_date + 'T00:00:00');
              return appointmentDate.getDay() === dow;
            });
            
            const workedHours = dayAppointments.reduce((sum: number, a: any) => {
              const start = a.start_time.split(':');
              const end = a.end_time.split(':');
              const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
              const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
              const durationMinutes = endMinutes - startMinutes;
              return sum + (durationMinutes / 60);
            }, 0);
            
            const utilizationPct = availableHours > 0 ? (workedHours / availableHours) * 100 : 0;
            
            weeklyUtilization[dayName] = {
              available_hours: parseFloat(availableHours.toFixed(2)),
              worked_hours: parseFloat(workedHours.toFixed(2)),
              utilization_pct: parseFloat(utilizationPct.toFixed(2))
            };
            
            totalAvailableHours += availableHours;
            totalWorkedHours += workedHours;
          }

          const overallUtilization = totalAvailableHours > 0 
            ? (totalWorkedHours / totalAvailableHours) * 100 
            : 0;

          // FASE 1: Novas métricas de funcionário
          const rescheduledAppts = empAppointments.filter(a => a.rescheduled_from || a.rescheduled_to).length;
          const rescheduleRate = empAppointments.length > 0 ? (rescheduledAppts / empAppointments.length) * 100 : 0;
          const cancellationRate = empAppointments.length > 0 ? (cancelledAppts.length / empAppointments.length) * 100 : 0;
          const revenuePerHour = totalWorkedHours > 0 ? confirmedRevenue / totalWorkedHours : 0;
          
          // Productivity score: média ponderada de utilização, conversão e receita por hora
          const utilizationScore = Math.min(100, overallUtilization);
          const conversionScore = empAppointments.length > 0 ? (confirmedAppts.length / empAppointments.length) * 100 : 0;
          const revenueScore = Math.min(100, (revenuePerHour / 100) * 100); // normalizar
          const productivityScore = (utilizationScore * 0.4 + conversionScore * 0.3 + revenueScore * 0.3);
          
          return {
            employeeId: emp.id,
            employeeName: emp.name,
            totalAppointments: empAppointments.length,
            confirmedAppointments: confirmedAppts.length,
            pendingAppointments: pendingAppts.length,
            cancelledAppointments: cancelledAppts.length,
            revenue,
            confirmedRevenue,
            pendingRevenue,
            cancelledRevenue,
            clientsServed,
            avgRevenuePerService: confirmedAppts.length > 0 ? confirmedRevenue / confirmedAppts.length : 0,
            conversionRate: parseFloat(conversionScore.toFixed(2)),
            weeklyUtilization,
            totalAvailableHours: parseFloat(totalAvailableHours.toFixed(2)),
            totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
            overallUtilization: parseFloat(overallUtilization.toFixed(2)),
            // Novas métricas FASE 1
            revenuePerHour: parseFloat(revenuePerHour.toFixed(2)),
            cancellationRate: parseFloat(cancellationRate.toFixed(2)),
            rescheduleRate: parseFloat(rescheduleRate.toFixed(2)),
            productivityScore: parseFloat(productivityScore.toFixed(2))
          };
        });

        // ===== MÉTRICAS DETALHADAS POR CLIENTE =====
        // Buscar feedback e assinaturas para métricas avançadas
        const { data: clientFeedback } = await supabase
          .from('client_feedback')
          .select('client_profile_id, nps_score, rating')
          .eq('barbershop_id', barbershop.id);

        const { data: clientSubs } = await supabase
          .from('client_subscriptions')
          .select('client_profile_id, status')
          .eq('barbershop_id', barbershop.id);

        const feedbackMap = new Map();
        (clientFeedback || []).forEach(fb => {
          if (!feedbackMap.has(fb.client_profile_id)) {
            feedbackMap.set(fb.client_profile_id, { nps: [], rating: [] });
          }
          if (fb.nps_score) feedbackMap.get(fb.client_profile_id).nps.push(fb.nps_score);
          if (fb.rating) feedbackMap.get(fb.client_profile_id).rating.push(fb.rating);
        });

        const subsMap = new Map();
        (clientSubs || []).forEach(sub => {
          subsMap.set(sub.client_profile_id, sub.status === 'active');
        });

        const clientDetails = clients.slice(0, 100).map(client => {
          // CRÍTICO: Filtrar por client_profile_id ao invés de phone para evitar vazamento entre barbearias
          const clientAppts = appointments.filter(a => a.client_profile_id === client.id);
          // CORRIGIDO: confirmedAppts deve filtrar APENAS por status === 'confirmed' (não payment_status)
          const confirmedAppts = clientAppts.filter(a => a.status === 'confirmed');
          const pendingAppts = clientAppts.filter(a => a.status === 'pending');
          const cancelledAppts = clientAppts.filter(a => a.status === 'cancelled');
          const noShowAppts = clientAppts.filter(a => a.status === 'no_show');
          
          // CORRIGIDO: totalSpent deve vir da tabela PAYMENTS (valores realmente pagos), não de service.price
          // Filtrar pagamentos por client_phone e status = 'paid'
          const clientPayments = paymentsData.filter((p: any) => 
            p.client_phone === client.phone && 
            p.status === 'paid' &&
            p.barbershop_id === barbershop.id
          );
          const totalSpent = clientPayments.reduce((sum: number, p: any) => 
            sum + (Number(p.net_received_amount) || Number(p.amount) || 0), 0
          );

          // Cálculo de métricas avançadas baseado em visitas confirmadas
          const visitDates = confirmedAppts
            .map(a => new Date(a.appointment_date).getTime())
            .sort();

          const firstVisit = visitDates.length > 0 ? new Date(visitDates[0]).toISOString() : null;
          const lastVisit = visitDates.length > 0 ? new Date(visitDates[visitDates.length - 1]).toISOString() : null;
          
          // Frequência de visita (média de dias entre visitas confirmadas)
          let visitFrequency = 0;
          if (visitDates.length >= 2) {
            const intervals = [];
            for (let i = 1; i < visitDates.length; i++) {
              intervals.push((visitDates[i] - visitDates[i - 1]) / (1000 * 60 * 60 * 24));
            }
            visitFrequency = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
          }

          const daysSinceLastVisit = lastVisit 
            ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          // Taxa de Retenção: baseada em comportamento de retorno
          // Cliente com múltiplas visitas confirmadas = boa retenção
          // Cliente que não retorna há muito tempo = baixa retenção
          let retentionRate = 0;
          if (confirmedAppts.length >= 2) {
            // Base: cliente com múltiplas visitas já retornou (mínimo 50%)
            retentionRate = 50;
            
            // Bônus por frequência (até +30%)
            if (visitFrequency > 0 && visitFrequency <= 30) {
              retentionRate += 30; // Visita a cada 30 dias ou menos = +30%
            } else if (visitFrequency <= 60) {
              retentionRate += 20; // Visita a cada 60 dias = +20%
            } else if (visitFrequency <= 90) {
              retentionRate += 10; // Visita a cada 90 dias = +10%
            }
            
            // Penalidade por tempo desde última visita (até -30%)
            if (daysSinceLastVisit > 90) {
              retentionRate -= 30;
            } else if (daysSinceLastVisit > 60) {
              retentionRate -= 20;
            } else if (daysSinceLastVisit > 45) {
              retentionRate -= 10;
            }
            
            // Garantir entre 0-100%
            retentionRate = Math.max(0, Math.min(100, retentionRate));
          } else if (confirmedAppts.length === 1) {
            // Cliente com apenas 1 visita: avalia se voltará
            if (daysSinceLastVisit <= 30) {
              retentionRate = 25; // Visitou recentemente, pode voltar
            } else if (daysSinceLastVisit <= 60) {
              retentionRate = 10; // Já faz tempo, pouca chance
            }
          }

          // Churn risk score (0-100, maior = maior risco)
          const churnRisk = Math.min(100, Math.max(0, 
            daysSinceLastVisit > 90 ? 100 :
            daysSinceLastVisit > 60 ? 75 :
            daysSinceLastVisit > 30 ? 50 : 25
          ));

          const averageTicket = confirmedAppts.length > 0 ? totalSpent / confirmedAppts.length : 0;
          const hasActiveSubscription = subsMap.get(client.id) || false;

          // NPS e satisfação
          const clientFb = feedbackMap.get(client.id);
          const npsScore = clientFb && clientFb.nps.length > 0
            ? clientFb.nps.reduce((a: number, b: number) => a + b, 0) / clientFb.nps.length
            : null;
          const satisfactionRating = clientFb && clientFb.rating.length > 0
            ? clientFb.rating.reduce((a: number, b: number) => a + b, 0) / clientFb.rating.length
            : null;
          
          return {
            clientProfileId: client.id,
            clientName: client.name,
            clientPhone: client.phone,
            // CORRIGIDO: totalAppointments agora mostra apenas confirmados (visitas reais)
            totalAppointments: confirmedAppts.length,
            confirmedAppointments: confirmedAppts.length,
            cancelledAppointments: cancelledAppts.length,
            noShowAppointments: noShowAppts.length,
            totalSpent,
            lastVisit,
            firstVisit,
            // LTV = total gasto confirmado e pago
            lifetimeValue: parseFloat(totalSpent.toFixed(2)),
            // Frequência = média de dias entre visitas (0 se < 2 visitas)
            visitFrequency: parseFloat(visitFrequency.toFixed(1)),
            // Taxa de Retenção baseada em comportamento real
            retentionRate: parseFloat(retentionRate.toFixed(2)),
            churnRisk: parseFloat(churnRisk.toFixed(2)),
            daysSinceLastVisit,
            averageTicket: parseFloat(averageTicket.toFixed(2)),
            hasActiveSubscription,
            npsScore: npsScore ? parseFloat(npsScore.toFixed(1)) : null,
            satisfactionRating: satisfactionRating ? parseFloat(satisfactionRating.toFixed(1)) : null
          };
        });

        // ===== ANÁLISE DETALHADA DE VISITANTES (SEM CLIENT_PROFILE_ID) =====
        console.log('📊 Analisando visitantes (appointments sem client_profile_id)...');

        // Função para normalizar telefone (remove +55 e caracteres não numéricos)
        const normalizePhone = (phone: string): string => {
          return phone.replace(/\D/g, '').replace(/^55/, '');
        };

        // Agrupar appointments de visitantes por telefone normalizado
        const visitorAppointmentsByPhone = new Map<string, {
          appts: any[];
          originalPhones: Set<string>;
          names: Set<string>;
        }>();

        appointments
          .filter((a: any) => !a.client_profile_id && a.client_phone) // Sem profile mas tem telefone
          .forEach((appointment: any) => {
            const normalizedPhone = normalizePhone(appointment.client_phone);
            
            if (!visitorAppointmentsByPhone.has(normalizedPhone)) {
              visitorAppointmentsByPhone.set(normalizedPhone, {
                appts: [],
                originalPhones: new Set(),
                names: new Set()
              });
            }
            
            const visitor = visitorAppointmentsByPhone.get(normalizedPhone)!;
            visitor.appts.push(appointment);
            visitor.originalPhones.add(appointment.client_phone);
            visitor.names.add(appointment.client_name);
          });

        // Criar análise detalhada de cada visitante - BASEADO EM APPOINTMENTS
        const visitorDetails = Array.from(visitorAppointmentsByPhone.entries()).map(([normalizedPhone, visitor]) => {
          const appts = visitor.appts;
          const sortedAppts = appts.sort((a, b) => 
            new Date(a.appointment_date + 'T00:00:00').getTime() - new Date(b.appointment_date + 'T00:00:00').getTime()
          );
          
          // SEPARAR APPOINTMENTS POR STATUS
          const confirmedAppts = appts.filter((a: any) => a.status === 'confirmed');
          const completedAppts = appts.filter((a: any) => a.status === 'completed');
          const pendingAppts = appts.filter((a: any) => a.status === 'pending');
          const cancelledAppts = appts.filter((a: any) => a.status === 'cancelled');
          const noShowAppts = appts.filter((a: any) => a.status === 'no_show');
          const queueReservedAppts = appts.filter((a: any) => a.status === 'queue_reserved');
          
          // SEPARAR POR STATUS DE PAGAMENTO
          const paidAppts = appts.filter((a: any) => a.payment_status === 'paid');
          const pendingPaymentAppts = appts.filter((a: any) => a.payment_status === 'pending');
          const failedPaymentAppts = appts.filter((a: any) => a.payment_status === 'failed');
          
          // Coletar todos os nomes usados e telefones originais (fazer isso antes para usar nos logs)
          const namesArray = Array.from(visitor.names);
          const phonesArray = Array.from(visitor.originalPhones);
          const mostRecentName = sortedAppts[sortedAppts.length - 1]?.client_name || 'Visitante';
          
          // CALCULAR VALORES FINANCEIROS
          const totalPaidValue = paidAppts.reduce((sum, a) => {
            const service = servicesMap.get(a.service_id);
            const price = Number(service?.price) || 0;
            if (!service) {
              console.warn(`⚠️ Serviço ${a.service_id} não encontrado para appointment ${a.id}`);
            }
            return sum + price;
          }, 0);
          
          const totalPendingValue = pendingPaymentAppts.reduce((sum, a) => {
            const service = servicesMap.get(a.service_id);
            const price = Number(service?.price) || 0;
            return sum + price;
          }, 0);
          
          const totalExpectedValue = appts.reduce((sum, a) => {
            const service = servicesMap.get(a.service_id);
            const price = Number(service?.price) || 0;
            return sum + price;
          }, 0);
          
          console.log(`💰 Visitante ${mostRecentName}: ${paidAppts.length} pagos, totalPaidValue: ${totalPaidValue}`);
          
          // TICKET MÉDIO (apenas dos pagos)
          const averageTicket = paidAppts.length > 0 ? totalPaidValue / paidAppts.length : 0;
          
          // ÚLTIMA VISITA PAGA
          const paidAppointmentsSorted = [...paidAppts].sort((a, b) => 
            new Date(a.appointment_date + 'T00:00:00').getTime() - new Date(b.appointment_date + 'T00:00:00').getTime()
          );
          const lastPaidDate = paidAppointmentsSorted[paidAppointmentsSorted.length - 1]?.appointment_date || null;
          
          const daysSinceLastPaidVisit = lastPaidDate 
            ? Math.floor((Date.now() - new Date(lastPaidDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          
          // FREQUÊNCIA DE VISITA (apenas confirmados/completed)
          const completedOrConfirmedAppts = [...confirmedAppts, ...completedAppts];
          let visitFrequency = 0;
          if (completedOrConfirmedAppts.length >= 2) {
            const sortedVisits = completedOrConfirmedAppts.sort((a, b) => 
              new Date(a.appointment_date + 'T00:00:00').getTime() - new Date(b.appointment_date + 'T00:00:00').getTime()
            );
            const intervals = [];
            for (let i = 1; i < sortedVisits.length; i++) {
              const diff = new Date(sortedVisits[i].appointment_date + 'T00:00:00').getTime() - 
                           new Date(sortedVisits[i-1].appointment_date + 'T00:00:00').getTime();
              intervals.push(diff / (1000 * 60 * 60 * 24));
            }
            visitFrequency = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
          }
          
          const firstAppointmentDate = sortedAppts[0]?.appointment_date || null;
          const lastAppointmentDate = sortedAppts[sortedAppts.length - 1]?.appointment_date || null;
          
          const daysSinceLastAppointment = lastAppointmentDate 
            ? Math.floor((Date.now() - new Date(lastAppointmentDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          
          return {
            visitorPhone: phonesArray[0] || normalizedPhone,
            visitorName: mostRecentName,
            variantNames: namesArray.length > 1 ? namesArray.slice(0, 3) : [],
            variantPhones: phonesArray.length > 1 ? phonesArray : [],
            
            // CONTADORES DE APPOINTMENTS POR STATUS
            totalAppointments: appts.length,
            confirmedAppointments: confirmedAppts.length,
            completedAppointments: completedAppts.length,
            pendingAppointments: pendingAppts.length,
            cancelledAppointments: cancelledAppts.length,
            noShowAppointments: noShowAppts.length,
            queueReservedAppointments: queueReservedAppts.length,
            
            // CONTADORES DE PAGAMENTOS POR STATUS
            paidPayments: paidAppts.length,
            pendingPayments: pendingPaymentAppts.length,
            failedPayments: failedPaymentAppts.length,
            
            // VALORES FINANCEIROS
            totalPaidValue: parseFloat(totalPaidValue.toFixed(2)),
            totalPendingValue: parseFloat(totalPendingValue.toFixed(2)),
            totalExpectedValue: parseFloat(totalExpectedValue.toFixed(2)),
            averageTicket: parseFloat(averageTicket.toFixed(2)),
            
            // DATAS E FREQUÊNCIA
            firstAppointmentDate,
            lastAppointmentDate,
            lastPaidDate,
            daysSinceLastAppointment,
            daysSinceLastPaidVisit,
            visitFrequency: parseFloat(visitFrequency.toFixed(1)),
            
            // CLASSIFICAÇÕES
            isRecurring: completedOrConfirmedAppts.length >= 2,
            conversionPotential: completedOrConfirmedAppts.length >= 2 ? 'high' : 
                                completedOrConfirmedAppts.length === 1 && daysSinceLastAppointment <= 30 ? 'medium' : 'low'
          };
        });

        // Ordenar por confirmados (maiores primeiro)
        visitorDetails.sort((a, b) => b.confirmedAppointments - a.confirmedAppointments);

        console.log(`✅ ${visitorDetails.length} visitantes únicos analisados`);

        // ===== MÉTRICAS AGREGADAS DE VISITANTES =====
        const totalVisitors = visitorDetails.length;
        const totalVisitorAppointments = visitorDetails.reduce((sum, v) => sum + v.totalAppointments, 0);
        const totalVisitorConfirmed = visitorDetails.reduce((sum, v) => sum + v.confirmedAppointments, 0);
        const recurringVisitors = visitorDetails.filter(v => v.isRecurring).length;

        const visitorMetrics = {
          totalVisitors,
          recurringVisitors,
          oneTimeVisitors: totalVisitors - recurringVisitors,
          totalAppointments: totalVisitorAppointments,
          totalConfirmedAppointments: totalVisitorConfirmed,
          conversionOpportunities: visitorDetails.filter(v => v.conversionPotential === 'high').length,
          appointmentsShare: 0, // Será calculado depois quando soubermos total de appointments
          
          // MÉTRICAS FINANCEIRAS
          totalRevenue: parseFloat(visitorDetails.reduce((sum, v) => sum + v.totalPaidValue, 0).toFixed(2)),
          totalPendingRevenue: parseFloat(visitorDetails.reduce((sum, v) => sum + v.totalPendingValue, 0).toFixed(2)),
          averageTicket: visitorDetails.length > 0
            ? parseFloat((visitorDetails.reduce((sum, v) => sum + v.averageTicket, 0) / visitorDetails.length).toFixed(2))
            : 0,
          totalPaidPayments: visitorDetails.reduce((sum, v) => sum + v.paidPayments, 0)
        };

        // Calcular appointmentsShare
        const totalAppointmentsInPeriod = appointments.length;
        visitorMetrics.appointmentsShare = totalAppointmentsInPeriod > 0 
          ? parseFloat((totalVisitorAppointments / totalAppointmentsInPeriod * 100).toFixed(2)) 
          : 0;
        
        const totalConfirmedAppts = appointments.filter(a => a.status === 'confirmed').length;
        const totalPendingAppts = appointments.filter(a => a.status === 'pending').length;
        const totalCancelledAppts = appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;
        
        const paidRevenue = appointments.filter(a => a.payment_status === 'paid').reduce((sum, a) => {
          const service = servicesMap.get(a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);
        
        const pendingPaymentRevenue = appointments.filter(a => a.payment_status === 'pending').reduce((sum, a) => {
          const service = servicesMap.get(a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);

        // Receita por status de appointment (independente do payment_status)
        const totalConfirmedRevenue = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').reduce((sum, a) => {
          const service = servicesMap.get(a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);

        const totalPendingRevenue = appointments.filter(a => a.status === 'pending').reduce((sum, a) => {
          const service = servicesMap.get(a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);

        const totalCancelledRevenue = appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').reduce((sum, a) => {
          const service = servicesMap.get(a.service_id);
          return sum + (Number(service?.price) || 0);
        }, 0);

        // ===== CALCULAR MÉTODOS DE PAGAMENTO =====
        type PaymentMethodType = 'pix' | 'card' | 'cash' | 'subscription';
        const paymentMethodsMap: Record<PaymentMethodType, { amount: number; count: number }> = {
          pix: { amount: 0, count: 0 },
          card: { amount: 0, count: 0 },
          cash: { amount: 0, count: 0 },
          subscription: { amount: 0, count: 0 }
        };

        appointments.filter(a => a.payment_status === 'paid').forEach(a => {
          const service = servicesMap.get(a.service_id);
          const price = Number(service?.price) || 0;
          const method = (a.payment_method || 'cash') as PaymentMethodType;
          
          if (paymentMethodsMap[method]) {
            paymentMethodsMap[method].amount += price;
            paymentMethodsMap[method].count += 1;
          }
        });

        const totalPaymentAmount = Object.values(paymentMethodsMap).reduce((sum, pm) => sum + pm.amount, 0);
        const totalPaymentCount = Object.values(paymentMethodsMap).reduce((sum, pm) => sum + pm.count, 0);

        // ===== BUSCAR DADOS HISTÓRICOS (ÚLTIMOS 6 MESES) =====
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const historicalStart = sixMonthsAgo.toISOString().split('T')[0];

        const { data: historicalAppts } = await supabase
          .from('appointments')
          .select('appointment_date, service_id, status, payment_status, payment_method')
          .eq('barbershop_id', barbershop.id)
          .gte('appointment_date', historicalStart)
          .lte('appointment_date', end);

        // Buscar comissões pagas por mês (últimos 6 meses)
        const { data: historicalPaidPeriods } = await supabase
          .from('commission_periods')
          .select('net_amount, paid_at')
          .eq('barbershop_id', barbershop.id)
          .eq('status', 'paid')
          .gte('paid_at', historicalStart)
          .lte('paid_at', end);

        // Processar histórico mensal
        const monthlyData: Record<string, {
          revenue: { services: number; products: number; subscriptions: number; tabs: number; total: number };
          costs: { total: number; commissions: number };
          cashFlow: { inflow: number; outflow: number };
        }> = {};
        (historicalAppts || []).forEach(appt => {
          const month = appt.appointment_date.substring(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = {
              revenue: { services: 0, products: 0, subscriptions: 0, tabs: 0, total: 0 },
              costs: { total: 0, commissions: 0 },
              cashFlow: { inflow: 0, outflow: 0 }
            };
          }
          
          const service = servicesMap.get(appt.service_id);
          const price = Number(service?.price) || 0;
          
          if (appt.status === 'confirmed' || appt.status === 'completed') {
            monthlyData[month].revenue.services += price;
            monthlyData[month].revenue.total += price;
            
            if (appt.payment_status === 'paid') {
              monthlyData[month].cashFlow.inflow += price;
            }
          }
        });

        // Processar comissões por mês
        (historicalPaidPeriods || []).forEach(period => {
          const month = period.paid_at.substring(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = {
              revenue: { services: 0, products: 0, subscriptions: 0, tabs: 0, total: 0 },
              costs: { total: 0, commissions: 0 },
              cashFlow: { inflow: 0, outflow: 0 }
            };
          }
          
          const commissionAmount = Number(period.net_amount);
          monthlyData[month].costs.total += commissionAmount;
          monthlyData[month].costs.commissions += commissionAmount;
          monthlyData[month].cashFlow.outflow += commissionAmount;
        });

        // Buscar comissões pagas no período (de commission_periods)
        const { data: paidPeriods } = await supabase
          .from('commission_periods')
          .select('net_amount, paid_at')
          .eq('barbershop_id', barbershop.id)
          .eq('status', 'paid')
          .gte('paid_at', start + 'T00:00:00')
          .lte('paid_at', end + 'T23:59:59');

        const totalCommissionsPaid = (paidPeriods || []).reduce((sum, p) => sum + Number(p.net_amount), 0);

        // Buscar comissões pendentes (não pagas mas já geradas)
        const { data: pendingPeriods } = await supabase
          .from('commission_periods')
          .select('net_amount')
          .eq('barbershop_id', barbershop.id)
          .in('status', ['pending_signature', 'draft'])
          .gte('period_end', start)
          .lte('period_end', end);

        const totalCommissionsPending = (pendingPeriods || []).reduce((sum, p) => sum + Number(p.net_amount), 0);
        
        // Buscar custos de produtos (inventário)
        const { data: inventoryTransactions } = await supabase
          .from('inventory_transactions')
          .select('quantity, unit_cost, created_at')
          .eq('barbershop_id', barbershop.id)
          .eq('transaction_type', 'OUT')
          .gte('created_at', start + 'T00:00:00')
          .lte('created_at', end + 'T23:59:59');

        const productCosts = (inventoryTransactions || []).reduce((sum, t) => 
          sum + (Number(t.quantity) * Number(t.unit_cost)), 0
        );

        // ===== CALCULAR MÉTRICAS FINANCEIRAS =====
        const grossRevenue = totalConfirmedRevenue + totalPendingRevenue;
        const netRevenue = paidRevenue;
        const totalCosts = totalCommissionsPaid + productCosts;
        const grossProfit = grossRevenue - totalCosts;
        const netProfit = netRevenue - totalCosts;
        const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
        const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

        // Processar histórico mensal de margens
        const marginHistory = Object.entries(monthlyData).map(([month, data]) => {
          const revenue = data.revenue.total;
          const costs = data.costs.total;
          const profit = revenue - costs;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
          
          return {
            month,
            gross_margin: margin,
            net_margin: margin,
            gross_profit: profit,
            net_profit: profit
          };
        }).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

        // Receita por fonte
        const revenueBySource = {
          services: totalConfirmedRevenue, // Simplificado - na prática você pode ter outras fontes
          products: 0,
          subscriptions: 0,
          tabs: 0
        };

        // ===== MONTAR OBJETO FINANCIAL_ANALYTICS =====
        const financialAnalytics = {
          revenue: {
            received: paidRevenue,
            pending: pendingPaymentRevenue,
            future: totalPendingRevenue,
            lost: totalCancelledRevenue,
            by_source: revenueBySource,
            monthly_history: Object.entries(monthlyData).map(([month, data]) => ({
              month,
              total: data.revenue.total,
              by_source: data.revenue
            })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
          },
          costs: {
            commissions_paid: totalCommissionsPaid,
            commissions_pending: totalCommissionsPending,
            products: productCosts,
            purchase_orders: 0,
            saas: 0,
            total: totalCosts,
            distribution: {
              commissions_pct: totalCosts > 0 ? (totalCommissionsPaid / totalCosts) * 100 : 0,
              products_pct: totalCosts > 0 ? (productCosts / totalCosts) * 100 : 0,
              purchase_orders_pct: 0,
              saas_pct: 0
            },
            monthly_history: Object.entries(monthlyData).map(([month, data]) => ({
              month,
              total: data.costs.total,
              commissions: data.costs.commissions,
              products: 0,
              purchase_orders: 0,
              saas: 0
            })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
          },
          margins: {
            gross_profit: grossProfit,
            gross_margin: grossMargin,
            net_profit: netProfit,
            net_margin: netMargin,
            ebitda: netProfit, // Simplificado
            monthly_history: marginHistory
          },
          cash_flow: {
            net_cash_flow: paidRevenue - totalCosts,
            inflow: paidRevenue,
            outflow: totalCosts,
            burn_rate: totalCosts,
            runway_months: totalCosts > 0 ? Math.floor(paidRevenue / totalCosts) : 999,
            subscription_mrr: 0,
            monthly_history: Object.entries(monthlyData).map(([month, data]) => ({
              month,
              inflow: data.cashFlow.inflow,
              outflow: data.cashFlow.outflow,
              net: data.cashFlow.inflow - data.cashFlow.outflow
            })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
          },
          payment_methods: {
            pix: {
              amount: paymentMethodsMap.pix.amount,
              count: paymentMethodsMap.pix.count,
              percentage: totalPaymentAmount > 0 ? (paymentMethodsMap.pix.amount / totalPaymentAmount) * 100 : 0
            },
            card: {
              amount: paymentMethodsMap.card.amount,
              count: paymentMethodsMap.card.count,
              percentage: totalPaymentAmount > 0 ? (paymentMethodsMap.card.amount / totalPaymentAmount) * 100 : 0
            },
            cash: {
              amount: paymentMethodsMap.cash.amount,
              count: paymentMethodsMap.cash.count,
              percentage: totalPaymentAmount > 0 ? (paymentMethodsMap.cash.amount / totalPaymentAmount) * 100 : 0
            },
            subscription: {
              amount: paymentMethodsMap.subscription.amount,
              count: paymentMethodsMap.subscription.count,
              percentage: totalPaymentAmount > 0 ? (paymentMethodsMap.subscription.amount / totalPaymentAmount) * 100 : 0
            },
            total_amount: totalPaymentAmount,
            total_count: totalPaymentCount
          },
          // FASE 1: Métricas de recorrência/assinaturas
          recurrence: await (async () => {
            const { data: allSubs } = await supabase
              .from('client_subscriptions')
              .select('status, amount_paid, created_at, cancelled_at, cancellation_reason')
              .eq('barbershop_id', barbershop.id)
              .gte('created_at', start + 'T00:00:00')
              .lte('created_at', end + 'T23:59:59');

            const activeSubs = (allSubs || []).filter(s => s.status === 'active').length;
            const totalSubRevenue = (allSubs || []).reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);
            const avgSubValue = activeSubs > 0 ? totalSubRevenue / activeSubs : 0;
            
            const newSubs = (allSubs || []).filter(s => {
              const created = new Date(s.created_at);
              return created >= new Date(start) && created <= new Date(end);
            }).length;

            const cancelledSubs = (allSubs || []).filter(s => s.status === 'cancelled' && s.cancelled_at).length;
            const churnRate = activeSubs > 0 ? (cancelledSubs / activeSubs) * 100 : 0;
            const retentionRate = 100 - churnRate;

            // MRR simplificado (assinatura ativa média)
            const mrr = avgSubValue * activeSubs;

            return {
              activeSubscriptions: activeSubs,
              totalSubscriptionRevenue: totalSubRevenue,
              monthlyRecurringRevenue: mrr,
              averageSubscriptionValue: avgSubValue,
              subscriptionChurnRate: parseFloat(churnRate.toFixed(2)),
              newSubscriptions: newSubs,
              cancelledSubscriptions: cancelledSubs,
              subscriptionRetentionRate: parseFloat(retentionRate.toFixed(2))
            };
          })(),
          // FASE 1: Receita por categoria de serviço
          revenueByServiceCategory: await (async () => {
            const { data: categories } = await supabase
              .from('service_categories')
              .select('id, name')
              .eq('barbershop_id', barbershop.id);

            const categoryMap = new Map((categories || []).map(c => [c.id, c.name]));
            const categoryRevenue = new Map<string, { revenue: number; count: number }>();

            appointments.filter(a => a.status === 'confirmed').forEach(a => {
              const service = servicesMap.get(a.service_id);
              if (!service) return;

              const categoryId = (service as any).category_id || 'uncategorized';
              const categoryName = categoryMap.get(categoryId) || 'Sem Categoria';
              const price = Number(service.price) || 0;

              if (!categoryRevenue.has(categoryName)) {
                categoryRevenue.set(categoryName, { revenue: 0, count: 0 });
              }

              const cat = categoryRevenue.get(categoryName)!;
              cat.revenue += price;
              cat.count += 1;
            });

            const totalCatRevenue = Array.from(categoryRevenue.values()).reduce((sum, c) => sum + c.revenue, 0);

            return Array.from(categoryRevenue.entries()).map(([name, data]) => ({
              categoryName: name,
              revenue: data.revenue,
              appointmentCount: data.count,
              averageTicket: data.count > 0 ? data.revenue / data.count : 0,
              percentage: totalCatRevenue > 0 ? (data.revenue / totalCatRevenue) * 100 : 0
            }));
          })(),
          profitability: {
            gross_revenue: grossRevenue,
            net_revenue: netRevenue,
            cogs: productCosts,
            labor_costs: totalCommissionsPaid,
            operational_costs: 0,
            roi: totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0,
            profit_per_transaction: totalConfirmedAppts > 0 ? netProfit / totalConfirmedAppts : 0
          },
          metadata: {
            period_start: start,
            period_end: end,
            snapshot_type: periodType,
            captured_at: new Date().toISOString(),
            total_transactions: appointments.length,
            data_quality_score: 100
          }
        };

        // Preparar dados para salvar
        const snapshotData = {
          barbershop_id: barbershop.id,
          barbershop_name: barbershop.name,
          period_start: start,
          period_end: end,
          snapshot_type: periodType,
          operational_metrics: {
            total_appointments: appointments.length,
            confirmed_appointments: totalConfirmedAppts,
            pending_appointments: totalPendingAppts,
            cancelled_appointments: totalCancelledAppts,
            conversion_rate: appointments.length > 0 ? (totalConfirmedAppts / appointments.length) * 100 : 0
          },
          financial_analytics: financialAnalytics,
          employee_detailed_analytics: employeeDetails,
          client_detailed_analytics: clientDetails,
          visitor_detailed_analytics: visitorDetails.slice(0, 100), // Limitar a 100 visitantes
          visitor_metrics: visitorMetrics,
          captured_at: new Date().toISOString(),
          // Campos antigos mantidos temporariamente para compatibilidade
          cash_flow: {},
          profitability: {},
          client_metrics: {},
          revenue_by_source: {},
          payment_methods: {},
          employee_analytics: employeeDetails,
          historical_data: {}
        };

        console.log('💾 Salvando snapshot com dados:', {
          operational_metrics: snapshotData.operational_metrics,
          revenue_by_source: snapshotData.revenue_by_source,
          employees_count: employeeDetails.length,
          clients_count: clientDetails.length
        });

        // Salvar snapshot
        const { error: insertError } = await supabase
          .from('analytics_snapshots')
          .upsert(snapshotData, {
            onConflict: 'barbershop_id,period_end,snapshot_type'
          });

        if (insertError) {
          console.error(`❌ Erro:`, insertError);
          results.failed.push({ barbershopId: barbershop.id, error: insertError.message });
        } else {
          console.log(`✅ Snapshot salvo`);
          results.success.push(barbershop.id);
        }

      } catch (error: any) {
        console.error(`❌ Erro:`, error);
        results.failed.push({ barbershopId: barbershop.id, error: error.message });
      }
    }

    console.log(`\n✅ Sucesso: ${results.success.length} | ❌ Falhas: ${results.failed.length}`);

    return new Response(
      JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
