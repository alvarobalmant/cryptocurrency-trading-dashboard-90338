import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, barbershopId, conversationHistory = [], sessionId = null } = await req.json();
    
    console.log('📨 Nova mensagem:', { message, barbershopId });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const [barbershopData, servicesData, employeesData] = await Promise.all([
      supabase.from('barbershops').select('*').eq('id', barbershopId).single(),
      supabase.from('services').select('*').eq('barbershop_id', barbershopId).eq('active', true),
      supabase.from('employees').select('*').eq('barbershop_id', barbershopId).eq('status', 'active')
    ]);

    const barbershop = barbershopData.data;
    const services = servicesData.data || [];
    const employees = employeesData.data || [];

    // ============= HORÁRIO DE BRASÍLIA =============
    const now = new Date();
    const brasiliaOffset = -3 * 60;
    const utcOffset = now.getTimezoneOffset();
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - utcOffset) * 60000);
    
    const currentDate = brasiliaTime.toISOString().split('T')[0];
    const currentTime = brasiliaTime.toTimeString().split(' ')[0].substring(0, 5);
    const dayOfWeek = brasiliaTime.getDay();
    
    const brasiliaDateFormatted = new Intl.DateTimeFormat('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    }).format(brasiliaTime);

    console.log('⏰ Horário de Brasília:', { brasiliaDateFormatted, currentDate, currentTime, dayOfWeek });

    // ============================================
    // RECUPERAR DATA DA SESSÃO + LIMPEZA 24H
    // ============================================
    let sessionDate: string | null = null;

    if (sessionId) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('current_appointment_date, last_message_at, session_data')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (session) {
        // Verificar se sessão expirou (24h de inatividade)
        const lastMessageAt = new Date(session.last_message_at || 0);
        const hoursSinceLastMessage = (now.getTime() - lastMessageAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastMessage > 24) {
          console.log(`🧹 Sessão expirada (${hoursSinceLastMessage.toFixed(1)}h de inatividade) - Limpando dados`);
          
          // Limpar dados expirados
          await supabase
            .from('chat_sessions')
            .update({ 
              current_appointment_date: null,
              session_data: {},
              status: 'expired'
            })
            .eq('id', sessionId);
          
          sessionDate = null;
        } else if (session.current_appointment_date) {
          // Verificar se data armazenada já passou
          const storedDate = new Date(session.current_appointment_date);
          const today = new Date(currentDate);
          
          if (storedDate < today) {
            console.log(`🧹 Data armazenada está no passado (${session.current_appointment_date}) - Limpando`);
            
            await supabase
              .from('chat_sessions')
              .update({ current_appointment_date: null })
              .eq('id', sessionId);
            
            sessionDate = null;
          } else {
            sessionDate = session.current_appointment_date;
            console.log(`📅 Data recuperada da sessão: ${sessionDate}`);
          }
        } else {
          console.log('📅 Nenhuma data na sessão');
        }
      }
    }

    // ============= GUARD: EXTRAÇÃO FORÇADA DE INFORMAÇÕES =============
    const lowerMessage = message.toLowerCase();
    
    // Extração de horário - múltiplos formatos
    let extractedTime: string | null = null;

    // Padrões de horário (ordem importa - mais específicos primeiro!)
    const timePatterns = [
      // Horários por extenso (mais específicos)
      /meio[- ]?dia/i,
      /meia[- ]?noite/i,
      
      // "quatro da tarde", "nove da manhã" (por extenso + período)
      /(uma|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s+da\s+(manhã|manha|tarde|noite)/i,
      
      // "às 4 da tarde", "as 4 da manhã", "4 da noite" (número + período) - CRÍTICO: vem antes do genérico
      /(?:às?|as|a)?\s*(\d{1,2})\s+da\s+(manhã|manha|tarde|noite)/i,
      
      // "16h", "16h30", "16:30"
      /(\d{1,2})[h:](\d{2})/i,
      
      // "16 horas", "4 horas"
      /(\d{1,2})\s*horas?/i,
      
      // "às 16", "as 16", "à 16" (genérico - último)
      /(?:às?|as|a)\s+(\d{1,2})(?::(\d{2}))?/i
    ];

    // Mapa de números por extenso
    const numberWords: { [key: string]: number } = {
      'uma': 1, 'duas': 2, 'três': 3, 'tres': 3, 'quatro': 4,
      'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
      'dez': 10, 'onze': 11, 'doze': 12
    };

    // Tentar cada padrão
    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        // Meio-dia
        if (/meio[- ]?dia/i.test(match[0])) {
          extractedTime = '12:00';
          console.log('⏰ Horário extraído (meio-dia): 12:00');
          break;
        }
        
        // Meia-noite
        if (/meia[- ]?noite/i.test(match[0])) {
          extractedTime = '00:00';
          console.log('⏰ Horário extraído (meia-noite): 00:00');
          break;
        }
        
        // Número por extenso + período
        if (match[1] && numberWords[match[1].toLowerCase()]) {
          let hour = numberWords[match[1].toLowerCase()];
          const period = match[2]?.toLowerCase();
          
          // Ajustar para formato 24h
          if (period === 'tarde' && hour < 12) {
            hour += 12;
          } else if (period === 'noite' && hour < 12) {
            hour += 12;
          }
          
          extractedTime = `${hour.toString().padStart(2, '0')}:00`;
          console.log(`⏰ Horário extraído (por extenso): ${extractedTime}`);
          break;
        }
        
        // Número + período do dia
        if (match[1] && /\d/.test(match[1]) && match[2]) {
          let hour = parseInt(match[1]);
          const period = match[2].toLowerCase();
          
          // Ajustar para formato 24h
          if ((period === 'tarde' || period === 'noite') && hour < 12) {
            hour += 12;
          } else if ((period === 'manhã' || period === 'manha') && hour === 12) {
            hour = 0;
          }
          
          extractedTime = `${hour.toString().padStart(2, '0')}:00`;
          console.log(`⏰ Horário extraído (com período): ${extractedTime}`);
          break;
        }
        
        // Formato padrão: hora + minutos opcionais
        if (match[1] && /\d/.test(match[1])) {
          const hour = match[1].padStart(2, '0');
          const minute = (match[2] || '00').padStart(2, '0');
          extractedTime = `${hour}:${minute}`;
          console.log(`⏰ Horário extraído: ${extractedTime}`);
          break;
        }
      }
    }

    // Validar se horário está em formato válido
    if (extractedTime) {
      const [hour, minute] = extractedTime.split(':').map(Number);
      
      // Validar hora (0-23) e minuto (0-59)
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.log('⚠️ Horário inválido:', extractedTime);
        extractedTime = null;
      }
    }

    // Extrair funcionário
    let extractedEmployee = null;
    for (const emp of employees) {
      const empNameLower = emp.name.toLowerCase();
      if (lowerMessage.includes(empNameLower)) {
        extractedEmployee = emp;
        console.log('👤 Funcionário extraído:', emp.name);
        break;
      }
    }

    // ============================================
    // EXTRAÇÃO DE DATA COM PRIORIDADE INTELIGENTE
    // ============================================
    let extractedDate: string | null = null;
    let dateSource: string = '';

    // Helper: obter data a partir de dia da semana
    const getDateFromWeekday = (weekdayName: string): string | null => {
      const weekdays = ['domingo', 'segunda', 'segunda-feira', 'terca', 'terça', 'terça-feira', 'terca-feira', 
                        'quarta', 'quarta-feira', 'quinta', 'quinta-feira', 'sexta', 'sexta-feira', 
                        'sabado', 'sábado', 'sábado'];
      const weekdayMap: Record<string, number> = {
        'domingo': 0, 'segunda': 1, 'segunda-feira': 1, 'terca': 2, 'terça': 2, 'terça-feira': 2, 'terca-feira': 2,
        'quarta': 3, 'quarta-feira': 3, 'quinta': 4, 'quinta-feira': 4, 
        'sexta': 5, 'sexta-feira': 5, 'sabado': 6, 'sábado': 6
      };
      
      const targetDay = weekdayMap[weekdayName.toLowerCase()];
      if (targetDay === undefined) return null;
      
      const today = brasiliaTime.getDay();
      let daysToAdd = targetDay - today;
      if (daysToAdd <= 0) daysToAdd += 7; // Próxima ocorrência
      
      const targetDate = new Date(brasiliaTime.getTime() + daysToAdd * 86400000);
      return targetDate.toISOString().split('T')[0];
    };

    // Helper: obter data a partir de dia do mês (ex: "dia 17")
    const getDateFromDay = (day: number): string | null => {
      const currentDay = brasiliaTime.getDate();
      const currentMonth = brasiliaTime.getMonth();
      const currentYear = brasiliaTime.getFullYear();
      
      let targetMonth = currentMonth;
      let targetYear = currentYear;
      
      // Se o dia já passou neste mês, usar próximo mês
      if (day < currentDay) {
        targetMonth++;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear++;
        }
      }
      
      const targetDate = new Date(targetYear, targetMonth, day);
      return targetDate.toISOString().split('T')[0];
    };

    // PRIORIDADE 1: Data explícita na mensagem atual
    if (/amanh[ãa]/i.test(message)) {
      extractedDate = new Date(brasiliaTime.getTime() + 86400000).toISOString().split('T')[0];
      dateSource = 'mensagem atual (amanhã)';
      console.log(`📅 Data extraída: ${extractedDate} (amanhã)`);
      
    } else if (/depois\s+de\s+amanh[ãa]/i.test(message)) {
      extractedDate = new Date(brasiliaTime.getTime() + 172800000).toISOString().split('T')[0];
      dateSource = 'mensagem atual (depois de amanhã)';
      console.log(`📅 Data extraída: ${extractedDate} (depois de amanhã)`);
      
    } else if (/hoje/i.test(message)) {
      extractedDate = currentDate;
      dateSource = 'mensagem atual (hoje)';
      console.log(`📅 Data extraída: ${extractedDate} (hoje)`);
      
    } else {
      // Tentar extrair dia da semana (ex: "sábado", "próxima sexta")
      const weekdayMatch = message.match(/(?:próxim[oa]|essa|est[ea]|no|na)?\s*(domingo|segunda|terça|terca|quarta|quinta|sexta|s[áa]bado)(?:\s*feira)?/i);
      if (weekdayMatch) {
        const weekdayDate = getDateFromWeekday(weekdayMatch[1]);
        if (weekdayDate) {
          extractedDate = weekdayDate;
          dateSource = `mensagem atual (${weekdayMatch[1]})`;
          console.log(`📅 Data extraída: ${extractedDate} (${weekdayMatch[1]})`);
        }
      }
      
      // Tentar extrair dia do mês (ex: "dia 17", "no dia 25")
      if (!extractedDate) {
        const dayMatch = message.match(/(?:dia|no\s+dia)\s+(\d{1,2})/i);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          if (day >= 1 && day <= 31) {
            const dayDate = getDateFromDay(day);
            if (dayDate) {
              extractedDate = dayDate;
              dateSource = `mensagem atual (dia ${day})`;
              console.log(`📅 Data extraída: ${extractedDate} (dia ${day})`);
            }
          }
        }
      }
    }

    // PRIORIDADE 2: Data da sessão (mantém contexto)
    // CRÍTICO: Se não tem data explícita na mensagem, SEMPRE usar a sessão se disponível
    if (!extractedDate && sessionDate) {
      extractedDate = sessionDate;
      dateSource = 'sessão (mantido)';
      console.log(`📅 Data mantida da sessão: ${extractedDate}`);
      console.log(`   ℹ️ Esta data será usada porque não foi mencionada nova data na mensagem`);
    }
    
    // EXTRA: Se sessionDate existe mas extractedDate já foi definida da mensagem, avisar
    if (extractedDate && sessionDate && extractedDate !== sessionDate) {
      console.log(`⚠️ ATENÇÃO: Data da mensagem (${extractedDate}) DIFERENTE da sessão (${sessionDate})`);
      console.log(`   ➡️ Usando data da mensagem (prioridade maior)`);
    }

    // PRIORIDADE 3: Buscar no histórico (última menção de data futura)
    if (!extractedDate) {
      for (const msg of [...conversationHistory].reverse()) {
        if (msg.role === 'user') {
          if (/amanh[ãa]/i.test(msg.content)) {
            extractedDate = new Date(brasiliaTime.getTime() + 86400000).toISOString().split('T')[0];
            dateSource = 'histórico (amanhã)';
            console.log(`📅 Data do histórico: ${extractedDate} (amanhã)`);
            break;
          } else if (/depois\s+de\s+amanh[ãa]/i.test(msg.content)) {
            extractedDate = new Date(brasiliaTime.getTime() + 172800000).toISOString().split('T')[0];
            dateSource = 'histórico (depois de amanhã)';
            console.log(`📅 Data do histórico: ${extractedDate} (depois de amanhã)`);
            break;
          }
          
          // Buscar dia da semana no histórico
          const weekdayMatch = msg.content.match(/(?:próxim[oa]|essa|est[ea]|no|na)?\s*(domingo|segunda|terça|terca|quarta|quinta|sexta|s[áa]bado)(?:\s*feira)?/i);
          if (weekdayMatch) {
            const weekdayDate = getDateFromWeekday(weekdayMatch[1]);
            if (weekdayDate) {
              extractedDate = weekdayDate;
              dateSource = `histórico (${weekdayMatch[1]})`;
              console.log(`📅 Data do histórico: ${extractedDate} (${weekdayMatch[1]})`);
              break;
            }
          }
          
          // Buscar dia do mês no histórico
          const dayMatch = msg.content.match(/(?:dia|no\s+dia)\s+(\d{1,2})/i);
          if (dayMatch) {
            const day = parseInt(dayMatch[1]);
            if (day >= 1 && day <= 31) {
              const dayDate = getDateFromDay(day);
              if (dayDate) {
                extractedDate = dayDate;
                dateSource = `histórico (dia ${day})`;
                console.log(`📅 Data do histórico: ${extractedDate} (dia ${day})`);
                break;
              }
            }
          }
          // NÃO buscar "hoje" no histórico - pode estar desatualizado
        }
      }
    }

    // PRIORIDADE 4: Default = hoje (último recurso)
    if (!extractedDate) {
      extractedDate = currentDate;
      dateSource = 'default (hoje)';
      console.log(`📅 Data padrão: ${extractedDate} (hoje)`);
    }

    console.log(`📊 Fonte da data: ${dateSource}`);
    console.log(`📊 extractedDate final: ${extractedDate}`);
    console.log(`📊 sessionId: ${sessionId}`);

    // SALVAR DATA NA SESSÃO (sempre que tiver data extraída, independente da fonte)
    if (sessionId && extractedDate && (dateSource.includes('mensagem atual') || dateSource.includes('sessão'))) {
      await supabase
        .from('chat_sessions')
        .update({ current_appointment_date: extractedDate })
        .eq('id', sessionId);
      
      console.log(`💾 Data salva na sessão: ${extractedDate} (fonte: ${dateSource})`);
    } else {
      console.log(`⚠️ Data NÃO salva - sessionId: ${sessionId}, extractedDate: ${extractedDate}, fonte: ${dateSource}`);
    }

    // ============= VERIFICAÇÃO FORÇADA DE DISPONIBILIDADE =============
    let serverSideAvailabilityResult = null;
    
    // BUSCAR FUNCIONÁRIO NO HISTÓRICO ANTES DE VERIFICAR DISPONIBILIDADE
    if (!extractedEmployee) {
      for (const msg of [...conversationHistory, { role: 'user', content: message }].reverse()) {
        for (const emp of employees) {
          if (msg.content.toLowerCase().includes(emp.name.toLowerCase())) {
            extractedEmployee = emp;
            console.log('👤 Funcionário extraído do histórico:', emp.name);
            break;
          }
        }
        if (extractedEmployee) break;
      }
    }
    
    if (extractedTime && extractedEmployee) {
      console.log('🔍 GUARD: Verificando disponibilidade forçada:', { extractedDate, extractedTime, employee: extractedEmployee.name });
      
      const requestedDayOfWeek = new Date(extractedDate + 'T00:00:00').getDay();
      
      // Buscar horário de trabalho
      const { data: schedules } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', extractedEmployee.id)
        .eq('day_of_week', requestedDayOfWeek)
        .eq('is_active', true);

      console.log('📋 Schedules:', schedules);

      if (!schedules || schedules.length === 0) {
        serverSideAvailabilityResult = {
          available: false,
          message: `❌ ${extractedEmployee.name} não trabalha neste dia da semana.`
        };
        console.log('❌ Sem expediente');
      } else {
        const schedule = schedules[0];
        const startMinutes = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
        const endMinutes = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
        const requestedMinutes = parseInt(extractedTime.split(':')[0]) * 60 + parseInt(extractedTime.split(':')[1]);

        console.log('⏰ Comparação:', { startMinutes, endMinutes, requestedMinutes });

        if (requestedMinutes < startMinutes || requestedMinutes >= endMinutes) {
          serverSideAvailabilityResult = {
            available: false,
            message: `❌ Este horário está fora do expediente. ${extractedEmployee.name} trabalha das ${schedule.start_time} às ${schedule.end_time}.`
          };
          console.log('❌ Fora do expediente');
        } else {
          // Verificar conflitos
          const defaultDuration = services.length === 1 ? services[0].duration_minutes : 60;
          const requestedEndMinutes = requestedMinutes + defaultDuration;

          const { data: conflicts } = await supabase
            .from('appointments')
            .select('*')
            .eq('employee_id', extractedEmployee.id)
            .eq('appointment_date', extractedDate)
            .neq('status', 'cancelled');

          console.log('🔍 Agendamentos:', conflicts?.length || 0);

          let hasConflict = false;
          if (conflicts && conflicts.length > 0) {
            for (const appt of conflicts) {
              const apptStart = parseInt(appt.start_time.split(':')[0]) * 60 + parseInt(appt.start_time.split(':')[1]);
              const apptEnd = parseInt(appt.end_time.split(':')[0]) * 60 + parseInt(appt.end_time.split(':')[1]);

              if (
                (requestedMinutes >= apptStart && requestedMinutes < apptEnd) ||
                (requestedEndMinutes > apptStart && requestedEndMinutes <= apptEnd) ||
                (requestedMinutes <= apptStart && requestedEndMinutes >= apptEnd)
              ) {
                hasConflict = true;
                console.log('⚠️ Conflito:', appt);
                break;
              }
            }
          }

          if (hasConflict) {
            // Gerar alternativas
            const allSlots: string[] = [];
            for (let m = startMinutes; m + defaultDuration <= endMinutes; m += 20) {
              const slotTime = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
              const slotEndMinutes = m + defaultDuration;
              
              let isFree = true;
              if (conflicts) {
                for (const appt of conflicts) {
                  const apptStart = parseInt(appt.start_time.split(':')[0]) * 60 + parseInt(appt.start_time.split(':')[1]);
                  const apptEnd = parseInt(appt.end_time.split(':')[0]) * 60 + parseInt(appt.end_time.split(':')[1]);
                  
                  if (
                    (m >= apptStart && m < apptEnd) ||
                    (slotEndMinutes > apptStart && slotEndMinutes <= apptEnd) ||
                    (m <= apptStart && slotEndMinutes >= apptEnd)
                  ) {
                    isFree = false;
                    break;
                  }
                }
              }
              
              if (isFree) allSlots.push(slotTime);
            }

            if (allSlots.length > 0) {
              const alternatives = allSlots.slice(0, 3).join(', ');
              serverSideAvailabilityResult = {
                available: false,
                hasAlternatives: true,
                alternatives: allSlots.slice(0, 3),
                message: `❌ O horário ${extractedTime} já está ocupado. Horários disponíveis com ${extractedEmployee.name}: ${alternatives}. Gostaria de agendar em um desses horários?`
              };
            } else {
              serverSideAvailabilityResult = {
                available: false,
                message: `❌ O horário ${extractedTime} está ocupado e não há outros horários disponíveis com ${extractedEmployee.name} neste dia.`
              };
            }
            console.log('❌ Horário ocupado');
          } else {
            serverSideAvailabilityResult = {
              available: true,
              time: extractedTime,
              date: extractedDate,
              employeeId: extractedEmployee.id,
              employeeName: extractedEmployee.name,
              message: services.length === 1 
                ? `✅ Ótimo! O horário ${extractedTime} com ${extractedEmployee.name} está disponível. Para confirmar, preciso do seu nome completo e telefone.`
                : `✅ Ótimo! O horário ${extractedTime} com ${extractedEmployee.name} está disponível. Para qual serviço você gostaria de agendar?`
            };
            console.log('✅ Horário disponível');
          }
        }
      }
    }

    // ============================================
    // RECONHECIMENTO DE CLIENTE RECORRENTE (PRELIMINAR)
    // ============================================
    let clientProfile: any = null;
    let preliminaryPhone: string | null = null;
    let clientProfileId: string | null = null; // ✅ ID do perfil para usar no agendamento

    // Tentar extrair telefone preliminarmente para buscar perfil
    for (const msg of [...conversationHistory, { role: 'user', content: message }].reverse()) {
      if (msg.role === 'user') {
        const phoneMatch = msg.content.match(/(\d{10,11})/);
        if (phoneMatch) {
          const candidatePhone = phoneMatch[1];
          if (candidatePhone.length === 10 || candidatePhone.length === 11) {
            if (!/(9999|0000|1111|1234)/i.test(candidatePhone)) {
              preliminaryPhone = candidatePhone;
              break;
            }
          }
        }
      }
    }

    // Buscar perfil do cliente se temos telefone
    if (preliminaryPhone) {
      console.log(`🔍 Busca preliminar de perfil para: ${preliminaryPhone}`);
      
      // Normalizar telefone (remover caracteres não numéricos)
      const normalizedPrelimPhone = preliminaryPhone.replace(/\D/g, '');
      console.log(`   📞 Telefone normalizado: ${normalizedPrelimPhone}`);
      
      // Buscar com múltiplas variações do telefone
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .or(`phone.eq.${preliminaryPhone},phone.eq.+55${normalizedPrelimPhone},phone.eq.${normalizedPrelimPhone}`)
        .maybeSingle();
      
      if (profile) {
        clientProfile = profile;
        clientProfileId = profile.id; // ✅ Guardar ID para usar depois
        console.log(`👤 Cliente identificado preliminarmente: ${profile.name} (ID: ${profile.id})`);
        console.log(`   📅 Cliente desde: ${new Date(profile.created_at).toLocaleDateString('pt-BR')}`);
        console.log(`   📱 Telefone no cadastro: ${profile.phone}`);
        
        // Atualizar sessão com client_profile_id
        if (sessionId) {
          await supabase
            .from('chat_sessions')
            .update({ 
              client_phone: preliminaryPhone,
              client_profile_id: profile.id 
            })
            .eq('id', sessionId);
        }
      } else {
        console.log('❌ Nenhum cadastro encontrado para este telefone');
      }
    }

    // ============= CONTEXTO PARA IA =============
    let barbershopContext = `
Você é o assistente virtual da ${barbershop?.name || 'barbearia'}. Seja simpático e profissional.

DATA E HORA ATUAL (Horário de Brasília):
${brasiliaDateFormatted}
Data: ${currentDate}
Hora: ${currentTime}

SERVIÇOS:
${services.map(s => `- ${s.name}: R$ ${s.price} (${s.duration_minutes}min)`).join('\n')}

PROFISSIONAIS:
${employees.map(e => `- ${e.name}`).join('\n')}

HORÁRIOS:
${Object.entries(barbershop?.business_hours || {}).map(([day, hours]: [string, any]) => {
  const days: Record<string, string> = { monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom' };
  return `${days[day]}: ${hours.closed ? 'Fechado' : `${hours.open}-${hours.close}`}`;
}).join(', ')}

⏰ INSTRUÇÕES CRÍTICAS SOBRE HORÁRIOS:

1. **Interpretação de Horários:**
   - "as 4" ou "às 4" = 04:00 (madrugada) OU 16:00 (tarde) - SEMPRE pergunte qual
   - "4 da tarde" = 16:00
   - "4 da manhã" = 04:00
   - "9 da noite" = 21:00
   - "meio dia" = 12:00
   - "meia noite" = 00:00
   - "16h" = 16:00

2. **Quando houver ambiguidade:**
   - Se cliente diz "as 4" sem especificar período, pergunte: "4 da manhã ou 4 da tarde?"
   - Se cliente diz "as 9" sem especificar, pergunte: "9 da manhã ou 9 da noite?"
   - Horários de 1 a 7 são ambíguos (podem ser manhã ou tarde/noite)
   - Horários de 8 a 12 geralmente são manhã
   - Horários de 13 a 23 são sempre tarde/noite

3. **Tolerância com erros de digitação:**
   - "as" (sem acento) = "às" (com acento)
   - "4h" = "4:00" ou "16:00"
   - "quatro da tarde" = "16:00"
   - Seja flexível e compreensivo com variações

4. **NUNCA diga que não há disponibilidade sem verificar:**
   - Se você recebeu informações de disponibilidade no contexto, use-as
   - Se NÃO recebeu informações, diga: "Deixa eu verificar a agenda do [barbeiro]..."
   - NÃO invente que não há disponibilidade

5. **Confirmação de horário:**
   - Sempre confirme o horário no formato 24h: "Confirma 16:00 (4 da tarde)?"
   - Isso evita confusões

REGRAS CRÍTICAS:
1. NUNCA diga "aguarde", "vou verificar", "deixe-me checar" - o sistema JÁ verificou tudo antes de você responder
2. NUNCA afirme disponibilidade sem confirmação do sistema
3. Para criar agendamento precisa: nome (aceite qualquer forma), telefone com DDD, serviço
4. Se o cliente já se apresentou, não peça o nome novamente
5. Datas: "amanhã" = ${new Date(brasiliaTime.getTime() + 86400000).toISOString().split('T')[0]}, "hoje" = ${currentDate}
6. Seja direto e objetivo - nada de "vou processar", "um momento", etc

${clientProfile ? `
👤 CLIENTE IDENTIFICADO (RETORNO):
Nome: ${clientProfile.name}
Telefone: ${clientProfile.phone}
${clientProfile.notes ? `Observações: ${clientProfile.notes}` : ''}

🎯 INSTRUÇÕES IMPORTANTES:
- Este é um cliente que JÁ AGENDOU antes conosco
- Cumprimente-o pelo nome de forma calorosa: "Olá, ${clientProfile.name}! Que bom ter você de volta!"
- NÃO peça o telefone novamente, você já tem: ${clientProfile.phone}
- Se ele quiser agendar, confirme: "É ${clientProfile.name}, correto?"
- Seja mais pessoal e amigável, ele já é conhecido da casa
` : ''}

🎯 INSTRUÇÕES IMPORTANTES SOBRE NOMES:

1. **QUANDO EXTRAIR NOME DO CLIENTE:**
   - Cliente diz explicitamente: "meu nome é X", "me chamo X", "sou X"
   - Cliente fornece "nome e telefone" juntos
   - Cliente CORRIGE o nome após você ter usado nome errado
   
2. **QUANDO NÃO EXTRAIR/MUDAR NOME:**
   - Cliente menciona nome de OUTRA PESSOA (funcionário, acompanhante, etc)
   - Cliente pergunta sobre disponibilidade: "tem horário com josé?"
   - Cliente diz respostas comuns: "pode sim", "tá bom", "ok valeu"
   
3. **COMO IDENTIFICAR CORREÇÃO DE NOME:**
   Se você disse: "Olá, [Nome]!" ou "É [Nome], correto?"
   E cliente responde: "Não, é [OutroNome]" ou "Na verdade é [OutroNome]"
   → ISSO É CORREÇÃO! Use o novo nome.
   
4. **COMO IDENTIFICAR MENÇÃO A OUTRA PESSOA:**
   Se cliente já tem nome identificado e diz:
   - "tem horário com [Nome]?" → [Nome] é FUNCIONÁRIO, não mude o nome do cliente
   - "quero agendar para [Nome]" → [Nome] é OUTRA PESSOA, não mude o nome do cliente
   - "pode ser com [Nome]?" → [Nome] é FUNCIONÁRIO preferido, não mude o nome do cliente
   
5. **EXEMPLOS PRÁTICOS:**

   ✅ CORRETO - Extrair/Mudar nome:
   Cliente: "meu nome é josé"
   Cliente: "me chamo maria"
   Você: "Olá, joão!"
   Cliente: "não, é pedro" ← CORREÇÃO!
   
   ❌ ERRADO - NÃO mudar nome:
   Cliente: "meu nome é alvaro" (nome já identificado)
   Cliente: "tem horário com josé?" ← josé é FUNCIONÁRIO
   Cliente: "pode sim" ← resposta comum
   Cliente: "tá bom" ← resposta comum

6. **REGRA DE OURO:**
   Se o cliente JÁ TEM NOME identificado, só mude se:
   - Cliente usar padrão explícito: "meu nome é X", "na verdade é X", "correto é X"
   - Cliente corrigir após você ter usado nome errado: "Não, é X"
   
   NUNCA mude o nome baseado em:
   - Menções a outras pessoas (funcionários, acompanhantes)
   - Respostas comuns (sim, não, ok, valeu)
   - Perguntas sobre disponibilidade

7. **VALIDAÇÃO ANTES DE MUDAR NOME:**
   Antes de aceitar um novo nome, pergunte a si mesmo:
   - "O cliente está CORRIGINDO o nome dele?"
   - "Ou está MENCIONANDO outra pessoa?"
   - "Ou está dando uma RESPOSTA COMUM?"
   
   Se for correção → Aceite o novo nome
   Se for menção/resposta → Ignore, mantenha nome atual

8. **QUANDO EM DÚVIDA:**
   Se não tiver certeza se é correção de nome ou menção a outra pessoa:
   → PERGUNTE ao cliente: "Desculpe, você está corrigindo seu nome ou perguntando sobre o profissional [Nome]?"

🚨 REGRAS CRÍTICAS DE CONFIRMAÇÃO:

1. **NUNCA diga que confirmou/agendou/criou se você não tem CERTEZA ABSOLUTA**
2. **NUNCA use palavras como:**
   - "confirmado"
   - "agendamento criado"
   - "está agendado"
   - "marquei"
   - "reservado"
   - "seu horário está garantido"
   
   **A MENOS QUE** você tenha recebido confirmação explícita do sistema

3. **Se falta QUALQUER dado (nome, telefone, serviço, profissional, horário, data):**
   - Diga: "Para finalizar o agendamento, preciso de..."
   - NÃO diga: "Agendamento confirmado"

4. **Seja HONESTO:**
   - Se não tem certeza → Pergunte
   - Se falta dado → Peça
   - Se não conseguiu agendar → Explique por quê

5. **Formato de confirmação válido (SOMENTE quando tiver TODOS os dados):**
   "✅ Agendamento confirmado!
   
   📋 Detalhes:
   👤 Nome: [nome]
   📱 Telefone: [telefone]
   💈 Serviço: [serviço]
   👨‍💼 Profissional: [profissional]
   📅 Data: [data]
   ⏰ Horário: [horário]
   
   Você receberá uma confirmação por WhatsApp em breve!"

6. **NUNCA invente que criou algo se não criou de fato!**
`;

    // Alertar IA se horário está fora do expediente típico (6h-23h)
    if (extractedTime) {
      const [hour] = extractedTime.split(':').map(Number);
      if (hour < 6 || hour >= 23) {
        console.log('⚠️ Horário fora do expediente típico:', extractedTime);
        barbershopContext += `\n\n⚠️ ATENÇÃO: Cliente solicitou horário ${extractedTime} (${hour < 6 ? 'madrugada' : 'noite'}). Confirme se realmente é esse horário ou se ele quis dizer outro período.`;
      }
    }

    // Informar IA sobre cadastro existente
    if (clientProfile) {
      console.log('📢 Adicionando info de cadastro existente ao contexto da IA');
      barbershopContext += `\n\n🔔 CADASTRO ENCONTRADO:
- Nome completo: ${clientProfile.name}
- Telefone: ${clientProfile.phone}
- Cliente desde: ${new Date(clientProfile.created_at).toLocaleDateString('pt-BR')}

IMPORTANTE: Cumprimente o cliente pelo NOME COMPLETO e mencione que encontrou o cadastro dele!
Exemplo: "✅ Olá ${clientProfile.name}! Encontrei seu cadastro aqui. Vamos agendar?"`;
    }

    const messages = [
      { role: "system", content: barbershopContext },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    // ============= CHAMAR IA =============
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let aiMessage = data.choices[0]?.message?.content || '';
    
    console.log('🤖 IA disse:', aiMessage);

    // ============= USAR RESULTADO DO GUARD =============
    let finalMessage = aiMessage;
    let actionResult = null;

    if (serverSideAvailabilityResult) {
      console.log('🔒 Usando resultado do guard:', serverSideAvailabilityResult.message);
      finalMessage = serverSideAvailabilityResult.message;
    }

    // ============= DETECTAR CONTEXTO COMPLETO E AUTO-CRIAR =============
    let extractedClientName: string | null = null;
    let extractedClientPhone: string | null = null;
    let extractedServiceId: string | null = null;

    // Extrair dados do histórico se a IA mencionou ter agendamento
    const shouldAutoCreate = /agend(?:amento|ar|ado)|confirm(?:ar|ado|ei)|criei|registr(?:ar|ei|ado)/i.test(aiMessage);
    
    console.log('🔍 AUTO-CREATE check:', { shouldAutoCreate, hasAvailability: !!serverSideAvailabilityResult });

    if (shouldAutoCreate) {
      console.log('🔍 AUTO-DETECT: Detectando dados para criação automática');
      
      // Recuperar horário e funcionário do histórico se não tiver no resultado atual
      let finalTime = serverSideAvailabilityResult?.time || extractedTime;
      let finalDate = serverSideAvailabilityResult?.date || extractedDate;
      let finalEmployee = extractedEmployee;

        // Se não temos horário/funcionário da mensagem atual, buscar no histórico
        if (!finalTime || !finalEmployee || !finalDate) {
          console.log('🔎 Buscando horário/funcionário/data no histórico');
          
          // ⚠️ DETECTAR SE USUÁRIO MENCIONOU PERÍODO VAGO
          const vagueTimeMentioned = /\b(manh[ãa]|tarde|noite)\b/i.test(message);
          
          // Só buscar no histórico se ainda não tiver os dados
          for (const msg of [...conversationHistory, { role: 'user', content: message }].reverse()) {
            // Buscar horário APENAS SE não foi período vago
            if (!finalTime && !vagueTimeMentioned) {
              const timeMatch = msg.content.match(/(\d{1,2}):(\d{2})|(\d{1,2})h/i);
              if (timeMatch) {
                finalTime = timeMatch[1] ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}` : `${timeMatch[3].padStart(2, '0')}:00`;
                console.log('⏰ Horário do histórico:', finalTime);
              }
            }
            
            // Buscar funcionário
            if (!finalEmployee) {
              for (const emp of employees) {
                if (msg.content.toLowerCase().includes(emp.name.toLowerCase())) {
                  finalEmployee = emp;
                  console.log('👤 Funcionário do histórico:', emp.name);
                  break;
                }
              }
            }
            
            if (finalTime && finalEmployee) break;
          }
          
          if (vagueTimeMentioned) {
            console.log('⚠️ Período vago detectado, não usar horário do histórico');
          }
        }
        
        // ============================================
        // USAR DATA JÁ EXTRAÍDA (não re-extrair)
        // ============================================
        // A data já foi extraída com prioridade inteligente acima
        if (!finalDate) {
          finalDate = extractedDate;
          console.log(`📅 Data final para agendamento: ${finalDate}`);
          console.log(`   Fonte: ${dateSource}`);
        }
      
      console.log('📊 Dados finais:', { finalTime, finalDate, finalEmployee: finalEmployee?.name });
      
      // Helper: normalizar nome para Title Case
      const toTitleCase = (s: string) =>
        s.trim()
          .replace(/\s+/g, ' ')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      
      // ============================================
      // LISTA DE RESPOSTAS COMUNS (NÃO SÃO NOMES)
      // ============================================
      const commonResponses = [
        // Confirmações
        'sim', 'pode sim', 'pode', 'ok', 'okay', 'beleza', 'perfeito',
        'ótimo', 'otimo', 'certo', 'certeza', 'com certeza', 'claro',
        'claro que sim', 'isso mesmo', 'exato', 'correto',
        
        // Negações
        'não', 'nao', 'nunca', 'jamais',
        
        // Agradecimentos
        'obrigado', 'obrigada', 'valeu', 'ok valeu', 'brigado',
        
        // Saudações
        'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite',
        
        // Respostas curtas
        'tá', 'ta', 'tá bom', 'ta bom', 'tudo bem', 'de boa',
        'show', 'legal', 'massa', 'top', 'blz'
      ];

      console.log('📋 Lista de bloqueio carregada com', commonResponses.length, 'respostas comuns');
      
      // ============================================
      // EXTRAÇÃO DE NOME DO HISTÓRICO
      // ============================================
      
      // Se já identificamos o cliente pelo cadastro, NÃO extrair nome
      if (clientProfile) {
        console.log(`🛡️ Cliente já identificado pelo cadastro: ${clientProfile.name}`);
        console.log(`   Pulando extração de nome do histórico`);
        extractedClientName = clientProfile.name;
        
      } else {
        console.log('🔍 Buscando nome no histórico (cliente não identificado)...');
        
        // Extrair nome do histórico (relaxado para aceitar lowercase)
        for (const msg of [...conversationHistory, { role: 'user', content: message }].reverse()) {
          if (msg.role === 'user') {
            console.log(`🔍 Analisando mensagem para nome: "${msg.content}"`);
          
          // ============================================
          // BLOQUEAR RESPOSTAS COMUNS
          // ============================================
          const normalizedContent = msg.content.toLowerCase().trim();
          if (commonResponses.includes(normalizedContent)) {
            console.log(`⚠️ Resposta comum bloqueada: "${msg.content}"`);
            continue; // Pula esta mensagem
          }
          
          // m1: Padrões explícitos - MELHORADO para capturar até 5 palavras
          const m1 = msg.content.match(/(?:meu\s+nome\s+(?:é|e|eh)\s+|me\s+chamo\s+|sou\s+o\s+|sou\s+a\s+|sou\s+)([A-ZÀ-Úa-zà-ú''\-]+(?:\s+[A-ZÀ-Úa-zà-ú''\-]+){0,4})(?=\s*,|\s+e\s+(?:meu|o)|$|\s+(?:número|numero|telefone|celular|whats|ddd)|\s+\d)/i);

          // m2: "Nome e telefone" - CORRIGIDO para aceitar 1-4 palavras {0,3}
          const m2 = msg.content.match(/^([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,3})\s+e\s+(?:meu\s+)?(?:número|numero|telefone|celular)?\s*(?:é\s+)?(\d{10,11})/i);

          // m3: Nome + vírgula + telefone (1-4 palavras)
          const m3 = msg.content.match(/^([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,3})\s*,\s*(\d{10,11})/i);

          // m4: Nome + telefone direto (1-4 palavras)
          const m4 = msg.content.match(/^([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,3})\s+(\d{10,11})/i);
          
// Tentar m1 primeiro (padrões explícitos como "meu nome é")
if (m1 && m1[1]) {
  const candidateName = toTitleCase(m1[1].trim());
  const parts = candidateName.split(/\s+/);
  const isObviousTest = /^(test|teste|cliente|usuario|user|fulano|ciclano)/i.test(candidateName);
  const isExactGeneric = /^(joão|maria)\s+(silva|santos)$/i.test(candidateName.toLowerCase());
  
  console.log(`   ├─ m1 match: "${candidateName}" (${parts.length} palavras)`);
  console.log(`   ├─ É teste: ${isObviousTest}, É genérico: ${isExactGeneric}`);
  
  // ============================================
  // VALIDAÇÃO DE CONTEXTO
  // ============================================
  
  // Verificar se mensagem indica OUTRA PESSOA (não o cliente)
  const mentionsOtherPerson = /(?:tem\s+horário|tem\s+vaga|disponível|atende|pode\s+ser)\s+(?:com|o|a)\s+/i.test(msg.content);
  
  if (mentionsOtherPerson) {
    console.log(`⚠️ Contexto indica menção a OUTRA PESSOA (funcionário), não é nome do cliente: "${candidateName}"`);
    // Não extrair nome, pular
  } else {
    // Verificar se é CORREÇÃO de nome
    const isCorrection = /(?:não|nao|na\s+verdade|correto|corrigindo|ops|desculpa|erro|errei)/i.test(msg.content);
    
    if (extractedClientName && !isCorrection) {
      console.log(`ℹ️ Nome já identificado (${extractedClientName}) e não é correção explícita, mantendo nome atual`);
    } else {
      if (isCorrection && extractedClientName) {
        console.log(`🔄 CORREÇÃO DE NOME detectada: "${extractedClientName}" → "${candidateName}"`);
      }
      
      // ============================================
      // FIM VALIDAÇÃO DE CONTEXTO
      // ============================================
      
      if (parts.length >= 1 && !isObviousTest && !isExactGeneric) {
        extractedClientName = candidateName;
        console.log(`✅ Nome extraído (m1): ${extractedClientName}`);
      } else {
        console.log(`❌ m1 rejeitado`);
      }
    }
  }
}


// Se não encontrou com m1/m0, tentar m2 (nome + "e meu número é" + telefone) - CORRIGIDO para 1+ palavras
if (!extractedClientName && m2 && m2[1]) {
  const raw = m2[1].trim();
  const candidateName = toTitleCase(raw);
  const parts = candidateName.split(/\s+/);
  const isObviousTest = /^(test|teste|cliente|usuario|user|fulano|ciclano)/i.test(candidateName);
  const isExactGeneric = /^(joão|maria)\s+(silva|santos)$/i.test(candidateName.toLowerCase());
  
  console.log(`   ├─ m2 match: "${candidateName}" (${parts.length} palavras)`);
  console.log(`   ├─ É teste: ${isObviousTest}, É genérico: ${isExactGeneric}`);
  
  if (parts.length >= 1 && parts.length <= 4 && !isObviousTest && !isExactGeneric) {
    extractedClientName = candidateName;
    console.log(`✅ Nome extraído (m2): ${extractedClientName}`);
    if (m2[2] && !extractedClientPhone) {
      extractedClientPhone = m2[2];
      console.log(`📱 Telefone extraído junto com nome: ${extractedClientPhone}`);
    }
  } else {
    console.log(`❌ m2 rejeitado`);
  }
}

// Se não encontrou, tentar m3 (nome, telefone) - CORRIGIDO para 1+ palavras
if (!extractedClientName && m3 && m3[1]) {
  const candidateName = toTitleCase(m3[1].trim());
  const parts = candidateName.split(/\s+/);
  const isObviousTest = /^(test|teste|cliente|usuario|user|fulano|ciclano)/i.test(candidateName);
  const isExactGeneric = /^(joão|maria)\s+(silva|santos)$/i.test(candidateName.toLowerCase());
  
  console.log(`   ├─ m3 match: "${candidateName}" (${parts.length} palavras)`);
  
  if (parts.length >= 1 && parts.length <= 4 && !isObviousTest && !isExactGeneric) {
    extractedClientName = candidateName;
    console.log(`✅ Nome extraído (m3): ${extractedClientName}`);
    if (m3[2] && !extractedClientPhone) {
      extractedClientPhone = m3[2];
      console.log(`📱 Telefone extraído (m3): ${extractedClientPhone}`);
    }
  } else {
    console.log(`❌ m3 rejeitado`);
  }
}

// Se não encontrou, tentar m4 (nome telefone) - CORRIGIDO para 1+ palavras
if (!extractedClientName && m4 && m4[1]) {
  const candidateName = toTitleCase(m4[1].trim());
  const parts = candidateName.split(/\s+/);
  const isObviousTest = /^(test|teste|cliente|usuario|user|fulano|ciclano)/i.test(candidateName);
  const isExactGeneric = /^(joão|maria)\s+(silva|santos)$/i.test(candidateName.toLowerCase());
  
  console.log(`   ├─ m4 match: "${candidateName}" (${parts.length} palavras)`);
  
  if (parts.length >= 1 && parts.length <= 4 && !isObviousTest && !isExactGeneric) {
    extractedClientName = candidateName;
    console.log(`✅ Nome extraído (m4): ${extractedClientName}`);
    if (m4[2] && !extractedClientPhone) {
      extractedClientPhone = m4[2];
      console.log(`📱 Telefone extraído (m4): ${extractedClientPhone}`);
    }
  } else {
    console.log(`❌ m4 rejeitado`);
  }
}

if (!m1 && !m2 && !m3 && !m4) {
  console.log(`❌ Nenhum padrão de nome matchou`);
}

// Caso tenha extraído nome, interrompe o loop para não sobrescrever
if (extractedClientName) {
  break;
}
          }
        }
      } // Fechar o else do if (clientProfile)

      // Extrair telefone do histórico
      for (const msg of [...conversationHistory, { role: 'user', content: message }].reverse()) {
        if (msg.role === 'user') {
          const phoneMatch = msg.content.match(/(?:telefone|número|celular|whats)?\s*(\d{10,11})/i);
          if (phoneMatch) {
            const candidatePhone = phoneMatch[1];
            
            // Validar comprimento (10 ou 11 dígitos)
            if (candidatePhone.length !== 10 && candidatePhone.length !== 11) {
              console.log(`⚠️ Telefone com comprimento inválido: ${candidatePhone.length} dígitos`);
              continue; // Pular para próxima tentativa
            }
            
            // Validar telefone
            if (!/(9999|0000|1111|1234)/i.test(candidatePhone)) {
              extractedClientPhone = candidatePhone;
              console.log('📱 Telefone extraído:', extractedClientPhone);
              break;
            }
          }
        }
      }

      // ============= BUSCAR/ATUALIZAR CADASTRO =============
      if (extractedClientPhone) {
        // Se já identificamos o cliente preliminarmente e o telefone bate
        if (clientProfile && clientProfile.phone === extractedClientPhone) {
          console.log('✅ Usando cadastro já identificado:', clientProfile.name);
          // SEMPRE usar nome do cadastro (sobrescrever extrações)
          extractedClientName = clientProfile.name;
          console.log('✅ Nome do cadastro:', extractedClientName);
        } else {
          // Buscar cadastro para o novo telefone detectado COM MÚLTIPLAS VARIAÇÕES
          const normalizedPhone = extractedClientPhone.replace(/\D/g, '');
          const last11Digits = normalizedPhone.slice(-11);
          const last10Digits = normalizedPhone.slice(-10);
          
          console.log('🔍 Buscando cadastro para novo telefone:', extractedClientPhone);
          console.log('   📞 Variações de busca:');
          console.log(`      - Exato: ${extractedClientPhone}`);
          console.log(`      - Normalizado: ${normalizedPhone}`);
          console.log(`      - Com +55: +55${normalizedPhone}`);
          console.log(`      - Últimos 11 dígitos: ${last11Digits}`);
          console.log(`      - Últimos 10 dígitos: ${last10Digits}`);
          
          // Buscar TODOS os perfis da barbearia para comparação manual
          const { data: allProfiles } = await supabase
            .from('client_profiles')
            .select('id, name, phone, notes, created_at, phone_verified')
            .eq('barbershop_id', barbershopId);
          
          let profile = null;
          
          if (allProfiles && allProfiles.length > 0) {
            // Comparar manualmente cada perfil
            for (const p of allProfiles) {
              const profileNormalized = p.phone.replace(/\D/g, '');
              const profileLast11 = profileNormalized.slice(-11);
              const profileLast10 = profileNormalized.slice(-10);
              
              // Match exato tem prioridade
              if (p.phone === extractedClientPhone || 
                  p.phone === normalizedPhone || 
                  p.phone === `+55${normalizedPhone}`) {
                profile = p;
                console.log('✅ Match EXATO encontrado:', p.name);
                break;
              }
              
              // Match por últimos dígitos (mais flexível)
              if (profileLast11 === last11Digits || 
                  profileLast10 === last10Digits ||
                  profileNormalized === normalizedPhone) {
                profile = p;
                console.log('✅ Match por ÚLTIMOS DÍGITOS encontrado:', p.name);
                // Não break aqui, continuar buscando match exato
              }
            }
          }
          
          if (profile) {
            console.log(`✅ Cadastro identificado: ${profile.name}`);
            console.log(`   Telefone DB: ${profile.phone}`);
            console.log(`   Telefone digitado: ${extractedClientPhone}`);
            console.log(`   Verificado: ${profile.phone_verified}`);
            console.log(`   Criado em: ${new Date(profile.created_at).toLocaleDateString('pt-BR')}`);
            
            clientProfile = profile;
            clientProfileId = profile.id;
            
            // SEMPRE usar nome do cadastro (sobrescrever extrações)
            extractedClientName = profile.name;
            console.log(`📝 Nome atualizado para nome do cadastro: ${extractedClientName}`);
            
          } else {
            console.log('ℹ️ Nenhum cadastro encontrado para:', extractedClientPhone);
            console.log('   ➡️ Agendamento será criado como visitante (sem client_profile_id)');
          }
        }
      }
      
      // ============= BUSCA INTELIGENTE POR NOME (se não achou por telefone) =============
      if (!clientProfile && extractedClientName && extractedClientName.length > 3) {
        console.log('🔍 Tentando buscar cliente por nome:', extractedClientName);
        
        const { data: profileByName } = await supabase
          .from('client_profiles')
          .select('id, name, phone, notes, created_at, phone_verified')
          .eq('barbershop_id', barbershopId)
          .ilike('name', `%${extractedClientName}%`)
          .limit(1)
          .maybeSingle();
        
        if (profileByName) {
          console.log('✅ Cliente encontrado por nome:', profileByName.name);
          console.log(`   Telefone: ${profileByName.phone}`);
          
          // Perguntar se quer usar esse telefone
          clientProfile = profileByName;
          clientProfileId = profileByName.id;
          extractedClientName = profileByName.name;
          extractedClientPhone = profileByName.phone;
          
          console.log('📝 Dados atualizados do perfil encontrado');
        }
      }

      // Fallback: extrair da mensagem da IA se ainda falta algum dado
      if (!extractedClientName) {
        console.log('🔍 Tentando extrair nome da mensagem da IA:', aiMessage.substring(0, 200));
        
        // Padrões diversos para capturar nome da mensagem da IA (incluindo nomes de 1 palavra)
        const aiNamePatterns = [
          /Cliente:\s*([^\n*]+)/i,                                    // "Cliente: Nome"
          /(?:Agradeço|Obrigad[oa])[^,]*,\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)\s*!/i,  // "Agradeço..., Nome!"
          /(?:Olá|Oi),?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)\s*!/i,  // "Olá, Nome!" (aceita 1+ palavras)
          /([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*),?\s+seu\s+agendamento/i  // "Nome, seu agendamento"
        ];
        
        for (const pattern of aiNamePatterns) {
          const match = aiMessage.match(pattern);
          if (match?.[1]) {
            const candidateName = toTitleCase(match[1].trim());
            const parts = candidateName.split(' ');
            // Validação inteligente
            const isObviousTest = /^(test|teste|cliente|usuario|user|fulano|ciclano)/i.test(candidateName);
            const isExactGeneric = /^(joão|maria)\s+(silva|santos)$/i.test(candidateName.toLowerCase());
            if (parts.length >= 1 && !isObviousTest && !isExactGeneric) {
              extractedClientName = candidateName;
              console.log('👤 Nome extraído da IA:', extractedClientName);
              break;
            }
          }
        }
      }

      if (!extractedClientPhone) {
        const aiPhone = aiMessage.match(/Telefone:\s*(\d{10,11})/i)?.[1];
        if (aiPhone) {
          extractedClientPhone = aiPhone;
          console.log('📱 Telefone extraído da IA:', extractedClientPhone);
        }
      }

      if (!extractedServiceId) {
        const aiService = aiMessage.match(/Servi[cç]o:\s*([^\n*]+)/i)?.[1]?.trim().toLowerCase();
        if (aiService) {
          const svc = services.find(s => s.name.toLowerCase() === aiService);
          if (svc) {
            extractedServiceId = svc.id;
            console.log('💈 Serviço extraído da IA:', svc.name);
          }
        }
      }

      // Extrair serviço (do histórico ou se só tem 1)
      if (services.length === 1) {
        extractedServiceId = services[0].id;
        console.log('💈 Serviço único detectado:', services[0].name);
      } else {
        for (const msg of [...conversationHistory, { role: 'user', content: message }].reverse()) {
          if (msg.role === 'user') {
            for (const svc of services) {
              if (msg.content.toLowerCase().includes(svc.name.toLowerCase())) {
                extractedServiceId = svc.id;
                console.log('💈 Serviço extraído:', svc.name);
                break;
              }
            }
          }
          if (extractedServiceId) break;
        }
      }

      // AUTO-SELECIONAR FUNCIONÁRIO SE NÃO FOI ESPECIFICADO
      if (!finalEmployee && finalTime && finalDate) {
        console.log('🔍 Nenhum funcionário especificado, buscando disponível...');
        
        // Se só tem 1 funcionário, usar automaticamente
        if (employees.length === 1) {
          finalEmployee = employees[0];
          console.log('👤 Funcionário único auto-selecionado:', finalEmployee.name);
        } else {
          // Buscar primeiro funcionário disponível no horário
          const requestedDayOfWeek = new Date(finalDate + 'T00:00:00').getDay();
          const requestedMinutes = parseInt(finalTime.split(':')[0]) * 60 + parseInt(finalTime.split(':')[1]);
          const defaultDuration = extractedServiceId 
            ? services.find(s => s.id === extractedServiceId)?.duration_minutes || 60
            : 60;
          
          for (const emp of employees) {
            // Verificar expediente
            const { data: schedules } = await supabase
              .from('employee_schedules')
              .select('*')
              .eq('employee_id', emp.id)
              .eq('day_of_week', requestedDayOfWeek)
              .eq('is_active', true);
            
            if (!schedules || schedules.length === 0) continue;
            
            const schedule = schedules[0];
            const startMinutes = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
            const endMinutes = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
            
            if (requestedMinutes < startMinutes || requestedMinutes + defaultDuration > endMinutes) continue;
            
            // Verificar conflitos
            const { data: conflicts } = await supabase
              .from('appointments')
              .select('*')
              .eq('employee_id', emp.id)
              .eq('appointment_date', finalDate)
              .neq('status', 'cancelled');
            
            let hasConflict = false;
            if (conflicts) {
              for (const appt of conflicts) {
                const apptStart = parseInt(appt.start_time.split(':')[0]) * 60 + parseInt(appt.start_time.split(':')[1]);
                const apptEnd = parseInt(appt.end_time.split(':')[0]) * 60 + parseInt(appt.end_time.split(':')[1]);
                
                if (
                  (requestedMinutes >= apptStart && requestedMinutes < apptEnd) ||
                  (requestedMinutes + defaultDuration > apptStart && requestedMinutes + defaultDuration <= apptEnd) ||
                  (requestedMinutes <= apptStart && requestedMinutes + defaultDuration >= apptEnd)
                ) {
                  hasConflict = true;
                  break;
                }
              }
            }
            
            if (!hasConflict) {
              finalEmployee = emp;
              console.log('👤 Funcionário disponível auto-selecionado:', emp.name);
              break;
            }
          }
        }
      }

      // ============================================
      // VERIFICAR SE DEVE PEDIR CONFIRMAÇÃO OU CRIAR
      // ============================================
      
      // Verificar se tem todos os dados necessários
      const hasAllDataForConfirmation = 
        extractedClientName &&
        extractedClientPhone &&
        extractedServiceId &&
        finalEmployee &&
        finalTime &&
        finalDate;
      
      console.log('🔍 Verificando dados para confirmação:');
      console.log(`   Nome: ${extractedClientName ? '✅' : '❌'}`);
      console.log(`   Telefone: ${extractedClientPhone ? '✅' : '❌'}`);
      console.log(`   Serviço: ${extractedServiceId ? '✅' : '❌'}`);
      console.log(`   Funcionário: ${finalEmployee ? '✅' : '❌'}`);
      console.log(`   Data: ${finalDate ? '✅' : '❌'}`);
      console.log(`   Horário: ${finalTime ? '✅' : '❌'}`);
      
      if (hasAllDataForConfirmation) {
        // Verificar se usuário já confirmou
        const lastUserMessage = message.toLowerCase();
        const confirmKeywords = ['sim', 'confirmo', 'confirma', 'está certo', 'correto', 
                                 'pode criar', 'tá bom', 'ok', 'isso mesmo', 'exato', 'perfeito'];
        const userConfirmed = confirmKeywords.some(kw => lastUserMessage.includes(kw));
        
        console.log(`   Já confirmado: ${userConfirmed ? 'SIM' : 'NÃO'}`);
        
        if (userConfirmed) {
          console.log('✅ Usuário confirmou! Criando agendamento...');
        } else {
          console.log('📋 Todos os dados coletados, PEDINDO confirmação ao usuário');
        }
        
        const selectedService = services.find(s => s.id === extractedServiceId);
        
        // Se ainda não confirmou, pedir confirmação
        if (!userConfirmed) {
          console.log('⚠️ Usuário ainda não confirmou, pedindo confirmação');
          
          // ============================================
          // DETECTAR SE HOUVE MUDANÇA NOS DADOS
          // ============================================
          
          let changeDetected = false;
          let changesArray: string[] = [];
          
          // Buscar última mensagem de confirmação do bot
          const lastConfirmationMessage = conversationHistory
            .slice()
            .reverse()
            .find((m: any) => m.role === 'assistant' && m.content.includes('📋'));
          
          if (lastConfirmationMessage) {
            console.log('🔍 Verificando mudanças desde última confirmação...');
            
            // ============================================
            // VERIFICAR SE AGENDAMENTO JÁ FOI CONFIRMADO/CRIADO
            // ============================================
            
            // Encontrar índice da última confirmação
            const confirmationIndex = conversationHistory.findIndex(
              (m: any) => m === lastConfirmationMessage
            );
            
            // Procurar mensagem de sucesso APÓS a confirmação
            const messagesAfterConfirmation = conversationHistory.slice(confirmationIndex + 1);
            
            const hasSuccessMessage = messagesAfterConfirmation.some((m: any) => 
              m.role === 'assistant' && (
                m.content.includes('✅ Agendamento confirmado') ||
                m.content.includes('marcado com sucesso') ||
                m.content.includes('você está agendado') ||
                m.content.includes('Até lá!')
              )
            );
            
            if (hasSuccessMessage) {
              console.log('ℹ️ Agendamento anterior já foi criado/confirmado');
              console.log('🆕 Este é um NOVO agendamento, não uma alteração');
              console.log('📤 Usando mensagem padrão (não avisar mudanças)');
              
              // NÃO detectar mudanças, pular toda a comparação
              changeDetected = false;
              changesArray = [];
              
            } else {
              console.log('🔄 Agendamento anterior ainda não foi confirmado');
              console.log('🔍 Verificando se houve alterações...');
              
              // ============================================
              // CONTINUAR COM DETECÇÃO DE MUDANÇAS
              // ============================================
              
              // Extrair dados da mensagem anterior
              const prevDataMatch = lastConfirmationMessage.content.match(/📅 Data: ([^\n]+)/);
              const prevTimeMatch = lastConfirmationMessage.content.match(/⏰ Horário: ([^\n]+)/);
              const prevServiceMatch = lastConfirmationMessage.content.match(/💈 Serviço: ([^\n]+)/);
              const prevEmployeeMatch = lastConfirmationMessage.content.match(/👨‍💼 Profissional: ([^\n]+)/);
              
              const prevData = prevDataMatch?.[1]?.trim();
              const prevTime = prevTimeMatch?.[1]?.trim();
              const prevService = prevServiceMatch?.[1]?.trim();
              const prevEmployee = prevEmployeeMatch?.[1]?.trim();
              
              // Dados atuais
              const serviceName = selectedService?.name || 'Serviço';
              const employeeName = finalEmployee.name;
              const formattedDate = new Date(finalDate + 'T00:00:00').toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              });
              
              // Comparar e detectar mudanças
              if (prevData && prevData !== formattedDate) {
                changesArray.push(`📅 **Data**: ${formattedDate}`);
                console.log(`📅 Data mudou: "${prevData}" → "${formattedDate}"`);
              }
              
              if (prevTime && prevTime !== finalTime) {
                changesArray.push(`⏰ **Horário**: ${finalTime}`);
                console.log(`⏰ Horário mudou: "${prevTime}" → "${finalTime}"`);
              }
              
              if (prevService && prevService !== serviceName) {
                changesArray.push(`💈 **Serviço**: ${serviceName}`);
                console.log(`💈 Serviço mudou: "${prevService}" → "${serviceName}"`);
              }
              
              if (prevEmployee && prevEmployee !== employeeName) {
                changesArray.push(`👨‍💼 **Profissional**: ${employeeName}`);
                console.log(`👨‍💼 Profissional mudou: "${prevEmployee}" → "${employeeName}"`);
              }
              
              if (changesArray.length > 0) {
                changeDetected = true;
                console.log(`✅ ${changesArray.length} mudança(s) detectada(s)`);
              } else {
                console.log('ℹ️ Nenhuma mudança detectada');
              }
            }
          } else {
            console.log('ℹ️ Primeira confirmação (sem histórico anterior)');
          }
          
          // ============================================
          // CONSTRUIR MENSAGEM DE CONFIRMAÇÃO
          // ============================================
          
          const serviceName = selectedService?.name || 'Serviço';
          const employeeName = finalEmployee.name;
          
          // Formatar data por extenso
          const dateObj = new Date(finalDate + 'T00:00:00');
          const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
          const dayNumber = dateObj.toLocaleDateString('pt-BR', { day: '2-digit' });
          const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
          const year = dateObj.getFullYear();
          const formattedDate = `${dayName}, ${dayNumber} de ${monthName} de ${year}`;
          
          let confirmationMessage = '';
          
          if (changeDetected) {
            // ============================================
            // ANALISAR TIPO DE MENSAGEM DO USUÁRIO
            // ============================================
            
            const userMessage = message.toLowerCase();
            
            // Detectar perguntas sobre disponibilidade
            const isAvailabilityQuestion = 
              userMessage.includes('tem vaga') ||
              userMessage.includes('tem horário') ||
              userMessage.includes('tem horario') ||
              userMessage.includes('tem as') ||       // "tem as 13?"
              userMessage.includes('tem às') ||       // "tem às 14?"
              userMessage.includes('tem os') ||       // "tem os 15?"
              userMessage.includes('tem aos') ||      // "tem aos 16?"
              userMessage.includes('tá livre') ||
              userMessage.includes('ta livre') ||
              userMessage.includes('está livre') ||
              userMessage.includes('esta livre') ||
              userMessage.includes('disponível') ||
              userMessage.includes('disponivel') ||
              userMessage.includes('tem como') ||
              userMessage.includes('dá pra') ||
              userMessage.includes('da pra') ||
              userMessage.includes('rola') ||         // "rola as 13?"
              userMessage.includes('consegue') ||     // "consegue as 13?"
              (userMessage.includes('?') && (
                userMessage.includes('hora') ||
                userMessage.includes('dia') ||
                userMessage.includes('data') ||
                /\d{1,2}/.test(userMessage)           // detecta "13?", "14?" etc
              ));
            
            console.log(`🔍 Tipo de mensagem detectado: ${isAvailabilityQuestion ? 'PERGUNTA' : 'INSTRUÇÃO'}`);
            
            // ============================================
            // MENSAGEM ADAPTADA AO CONTEXTO
            // ============================================
            
            const changesList = changesArray.join('\n');
            let changeIntro = '';
            
            if (isAvailabilityQuestion) {
              // ============================================
              // RESPOSTA PARA PERGUNTA (contextual)
              // ============================================

              console.log('💬 Respondendo PERGUNTA sobre disponibilidade');

              // Identificar o que mudou para responder especificamente
              const changedTime = changesArray.find(c => c.includes('Horário'));
              const changedDate = changesArray.find(c => c.includes('Data'));
              const changedService = changesArray.find(c => c.includes('Serviço'));
              const changedEmployee = changesArray.find(c => c.includes('Profissional'));

              if (changedTime) {
                // Extrair horário da string "⏰ **Horário**: 13:00"
                const timeMatch = changedTime.match(/Horário\*\*:\s*(.+)/);
                const time = timeMatch ? timeMatch[1].trim() : 'esse horário';
                changeIntro = `✅ Sim, ${time} está livre! Quer confirmar nesse horário?`;
                console.log(`  → Respondendo sobre horário: ${time}`);

              } else if (changedDate) {
                // Extrair data da string "📅 **Data**: sexta-feira, 03 de outubro"
                const dateMatch = changedDate.match(/Data\*\*:\s*(.+)/);
                const date = dateMatch ? dateMatch[1].trim() : 'essa data';
                changeIntro = `✅ Sim, ${date} tem vaga! Quer confirmar?`;
                console.log(`  → Respondendo sobre data: ${date}`);

              } else if (changedService) {
                const serviceMatch = changedService.match(/Serviço\*\*:\s*(.+)/);
                const service = serviceMatch ? serviceMatch[1].trim() : 'esse serviço';
                changeIntro = `✅ Sim, ${service} está disponível! Quer confirmar?`;
                console.log(`  → Respondendo sobre serviço: ${service}`);

              } else if (changedEmployee) {
                const employeeMatch = changedEmployee.match(/Profissional\*\*:\s*(.+)/);
                const employee = employeeMatch ? employeeMatch[1].trim() : 'esse profissional';
                changeIntro = `✅ Sim, ${employee} tem horário! Quer confirmar?`;
                console.log(`  → Respondendo sobre profissional: ${employee}`);

              } else {
                changeIntro = `✅ Sim, está disponível! Quer confirmar?`;
                console.log(`  → Resposta genérica (nenhuma mudança específica)`);
              }

            } else {
              // ============================================
              // RESPOSTA PARA INSTRUÇÃO
              // ============================================

              console.log('✏️ Respondendo INSTRUÇÃO de mudança');

              changeIntro = `✅ Pode sim! Alterei:

${changesList}`;
            }
            
            confirmationMessage = `${changeIntro}

${changesList}

📋 Veja os dados atualizados do seu agendamento:

👤 Nome: ${extractedClientName}
📱 Telefone: ${extractedClientPhone}
💈 Serviço: ${serviceName}
👨‍💼 Profissional: ${employeeName}
📅 Data: ${formattedDate}
⏰ Horário: ${finalTime}

Confirma agora? Responda "SIM" ou me avise se quer alterar algo.`;
            
            console.log('📤 Enviando confirmação COM aviso de mudança contextualizado');
            
          } else {
            // ============================================
            // MENSAGEM PADRÃO (PRIMEIRA VEZ)
            // ============================================
            
            confirmationMessage = `📋 Perfeito! Vou confirmar os dados do seu agendamento:

👤 Nome: ${extractedClientName}
📱 Telefone: ${extractedClientPhone}
💈 Serviço: ${serviceName}
👨‍💼 Profissional: ${employeeName}
📅 Data: ${formattedDate}
⏰ Horário: ${finalTime}

Está tudo correto? Responda "SIM" para confirmar ou me avise o que precisa mudar.`;
            
            console.log('📤 Enviando confirmação padrão (primeira vez)');
          }
          
          return new Response(JSON.stringify({ 
            message: confirmationMessage,
            requiresConfirmation: true 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Se confirmou, prosseguir com criação
        console.log('✅ Usuário confirmou dados, criando agendamento');
        
        // Validação adicional para TypeScript
        if (!finalTime || !finalDate || !finalEmployee || !extractedServiceId) {
          console.error('❌ Dados críticos faltando na criação');
          return new Response(
            JSON.stringify({ 
              error: 'Dados incompletos',
              reply: 'Desculpe, houve um erro. Por favor, reinicie o agendamento.' 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        const endTimeMinutes = parseInt(finalTime.split(':')[0]) * 60 + 
                               parseInt(finalTime.split(':')[1]) + 
                               (selectedService?.duration_minutes || 60);
        const endTime = `${String(Math.floor(endTimeMinutes / 60)).padStart(2, '0')}:${String(endTimeMinutes % 60).padStart(2, '0')}`;

        // REVALIDAÇÃO CRÍTICA
        const { data: conflictCheck } = await supabase
          .from('appointments')
          .select('*')
          .eq('employee_id', finalEmployee.id)
          .eq('appointment_date', finalDate)
          .eq('start_time', finalTime)
          .neq('status', 'cancelled');

        if (conflictCheck && conflictCheck.length > 0) {
          console.log('⚠️ AUTO-CREATE: Conflito detectado na revalidação');
          finalMessage = '❌ Ops! Esse horário acabou de ser ocupado. Por favor, escolha outro horário.';
        } else {
          // ✅ LOG CRÍTICO: Verificar client_profile_id antes de criar
          console.log('🔍 DADOS DO APPOINTMENT:');
          console.log('   client_name:', extractedClientName);
          console.log('   client_phone:', extractedClientPhone);
          console.log('   client_profile_id:', clientProfileId || 'NULL (visitante)');
          
          const { data: newAppt, error: apptError } = await supabase
            .from('appointments')
            .insert({
              barbershop_id: barbershopId,
              employee_id: finalEmployee.id,
              service_id: extractedServiceId,
              client_name: extractedClientName,
              client_phone: extractedClientPhone,
              client_profile_id: clientProfileId || null, // ✅ Associar ao cadastro se existir
              appointment_date: finalDate,
              start_time: finalTime,
              end_time: endTime,
              status: 'pending',
              payment_status: 'pending'
            })
            .select()
            .single();

          if (apptError) {
            console.error('❌ AUTO-CREATE: Erro ao criar:', apptError);
            finalMessage = 'Desculpe, ocorreu um erro ao criar o agendamento. Tente novamente.';
          } else {
            console.log('✅ AUTO-CREATE: Agendamento criado!', newAppt.id);
            console.log('   client_profile_id salvo:', newAppt.client_profile_id || 'NULL (visitante)');
            
            // Formatar data por extenso para mensagem de confirmação
            const confirmDateObj = new Date(finalDate + 'T00:00:00');
            const confirmDayName = confirmDateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
            const confirmDayNumber = confirmDateObj.toLocaleDateString('pt-BR', { day: '2-digit' });
            const confirmMonthName = confirmDateObj.toLocaleDateString('pt-BR', { month: 'long' });
            const confirmYear = confirmDateObj.getFullYear();
            const confirmFormattedDate = `${confirmDayName}, ${confirmDayNumber} de ${confirmMonthName} de ${confirmYear}`;
            
            finalMessage = `✅ Agendamento confirmado! ${extractedClientName}, você está agendado(a) para **${confirmFormattedDate}** às ${finalTime} com ${finalEmployee.name}. Até lá!`;
            actionResult = { success: true, appointmentId: newAppt.id, appointment: newAppt };
            
            // Limpar data da sessão após agendamento confirmado
            if (sessionId) {
              await supabase
                .from('chat_sessions')
                .update({ 
                  current_appointment_date: null,
                  status: 'completed'
                })
                .eq('id', sessionId);
              
              console.log('🧹 Data da sessão limpa após agendamento confirmado');
            }
          }
        }
      } else {
        // ❌ DADOS INSUFICIENTES - IA NÃO PODE MENTIR!
        console.log('⚠️ AUTO-CREATE: Dados insuficientes', { 
          hasName: !!extractedClientName, 
          hasPhone: !!extractedClientPhone, 
          hasService: !!extractedServiceId,
          hasEmployee: !!finalEmployee,
          hasTime: !!finalTime,
          hasDate: !!finalDate
        });

        // 🛡️ GUARD: Verificar se IA mentiu sobre confirmação
        const aiLied = aiMessage.toLowerCase().includes('confirmado') || 
                       aiMessage.toLowerCase().includes('agendamento criado') ||
                       aiMessage.toLowerCase().includes('está agendado') ||
                       aiMessage.toLowerCase().includes('agendei') ||
                       aiMessage.toLowerCase().includes('marquei') ||
                       aiMessage.toLowerCase().includes('reservado') ||
                       aiMessage.toLowerCase().includes('seu horário está garantido');

        if (aiLied) {
          console.log('🚨 IA MENTIU! Sobrescrevendo mensagem...');
          
          // Identificar o que está faltando
          const missing = [];
          if (!extractedClientName) missing.push('**nome completo**');
          if (!extractedClientPhone) missing.push('**telefone com DDD (10 ou 11 dígitos)**');
          if (!extractedServiceId) missing.push('**serviço desejado**');
          if (!finalEmployee) missing.push('**profissional disponível**');
          if (!finalTime) missing.push('**horário**');
          if (!finalDate) missing.push('**data**');

          // Sobrescrever com mensagem honesta
          finalMessage = `⚠️ Desculpe, ainda não foi possível confirmar o agendamento.

Para finalizar, preciso que você me informe: ${missing.join(', ')}.

Por favor, forneça essas informações para eu poder confirmar seu agendamento! 😊`;
          
        }
        
        // Mensagem específica se falta só o funcionário e há múltiplos
        if (extractedClientName && extractedClientPhone && extractedServiceId && finalTime && finalDate && !finalEmployee && employees.length > 1) {
          finalMessage = `⚠️ Nenhum profissional está disponível para ${services.find(s => s.id === extractedServiceId)?.name || 'este serviço'} no horário ${finalTime} do dia ${new Date(finalDate).toLocaleDateString('pt-BR')}.

Profissionais disponíveis: ${employees.map(e => e.name).join(', ')}.

Por favor, escolha outro horário ou especifique com qual profissional deseja agendar.`;
        }
      }
    }

    // ============= PROCESSAR AÇÕES DA IA (FALLBACK) =============
    const actionMatch = aiMessage.match(/\{[\s\S]*?"action":\s*"create_appointment"[\s\S]*?\}/);
    
    if (actionMatch && !actionResult) {
      try {
        const actionData = JSON.parse(actionMatch[0]);
        console.log('📝 Tentando criar agendamento:', actionData);

        if (!actionData.client_name || !actionData.client_phone || !actionData.service_id) {
          finalMessage = 'Para finalizar o agendamento, preciso do seu nome completo, telefone e confirmar o serviço.';
        } else {
          // REVALIDAÇÃO CRÍTICA
          const { data: conflictCheck } = await supabase
            .from('appointments')
            .select('*')
            .eq('employee_id', actionData.employee_id)
            .eq('appointment_date', actionData.date)
            .eq('start_time', actionData.start_time)
            .neq('status', 'cancelled');

          if (conflictCheck && conflictCheck.length > 0) {
            console.log('⚠️ Conflito na revalidação!');
            finalMessage = '❌ Ops! Esse horário acabou de ser ocupado. Por favor, escolha outro.';
          } else {
            const { data: newAppt, error: apptError } = await supabase
              .from('appointments')
              .insert({
                barbershop_id: barbershopId,
                employee_id: actionData.employee_id,
                service_id: actionData.service_id,
                client_name: actionData.client_name,
                client_phone: actionData.client_phone,
                appointment_date: actionData.date,
                start_time: actionData.start_time,
                end_time: actionData.end_time,
                status: 'pending',
                payment_status: 'pending'
              })
              .select()
              .single();

            if (apptError) {
              console.error('❌ Erro ao criar:', apptError);
              finalMessage = 'Desculpe, ocorreu um erro. Tente novamente.';
            } else {
              console.log('✅ Agendamento criado!', newAppt.id);
              const emp = employees.find(e => e.id === actionData.employee_id);
              
              // Formatar data por extenso para mensagem de confirmação
              const fallbackDateObj = new Date(actionData.date + 'T00:00:00');
              const fallbackDayName = fallbackDateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
              const fallbackDayNumber = fallbackDateObj.toLocaleDateString('pt-BR', { day: '2-digit' });
              const fallbackMonthName = fallbackDateObj.toLocaleDateString('pt-BR', { month: 'long' });
              const fallbackYear = fallbackDateObj.getFullYear();
              const fallbackFormattedDate = `${fallbackDayName}, ${fallbackDayNumber} de ${fallbackMonthName} de ${fallbackYear}`;
              
              finalMessage = `✅ Agendamento confirmado! ${actionData.client_name}, você está agendado(a) para **${fallbackFormattedDate}** às ${actionData.start_time} com ${emp?.name}. Até lá!`;
              actionResult = { success: true, appointmentId: newAppt.id, appointment: newAppt };
              
              // Limpar data da sessão após agendamento confirmado
              if (sessionId) {
                await supabase
                  .from('chat_sessions')
                  .update({ 
                    current_appointment_date: null,
                    status: 'completed'
                  })
                  .eq('id', sessionId);
                
                console.log('🧹 Data da sessão limpa após agendamento confirmado (fallback)');
              }
              
              // Criar ou atualizar perfil também neste fluxo
              if (actionData.client_phone && actionData.client_name) {
                const { data: existingProfile } = await supabase
                  .from('client_profiles')
                  .select('id')
                  .eq('phone', actionData.client_phone)
                  .eq('barbershop_id', barbershopId)
                  .maybeSingle();
                
                if (!existingProfile) {
                  await supabase
                    .from('client_profiles')
                    .insert({
                      barbershop_id: barbershopId,
                      name: actionData.client_name,
                      phone: actionData.client_phone,
                      phone_verified: false,
                      notes: `Agendamento via chatbot em ${new Date().toLocaleDateString('pt-BR')}`
                    });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Erro ao processar ação:', e);
      }
    }

    console.log('📤 Mensagem final:', finalMessage);

    // Salvar mensagens no banco (se sessionId foi fornecido)
    if (sessionId) {
      // Salvar resposta da IA
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: finalMessage,
        metadata: { 
          timestamp: new Date().toISOString(),
          actionResult: actionResult
        }
      });
      
      // Atualizar timestamp da sessão
      await supabase
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      console.log(`💾 Mensagem salva na sessão ${sessionId}`);
    }

    return new Response(
      JSON.stringify({ message: finalMessage, actionResult, sessionId }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Desculpe, ocorreu um erro. Tente novamente.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
