import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreloadStats {
  success: boolean;
  employees: number;
  days: number;
  total_records: number;
  duration_ms: number;
  errors?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body to check for specific employee_ids and date
    const { employee_ids, date } = await req.json().catch(() => ({ employee_ids: null, date: null }));

    // NEW MODE: Specific employees + specific date
    if (employee_ids && Array.isArray(employee_ids) && date) {
      console.log(`🎯 Modo específico: ${employee_ids.length} funcionários para ${date}`);

      const promises: Promise<any>[] = [];

      for (const employeeId of employee_ids) {
        console.log(`📝 Processando funcionário ${employeeId} para ${date}...`);
        
        promises.push(
          (async () => {
            try {
              const { error } = await supabase
                .rpc('refresh_daily_availability', {
                  p_employee_id: employeeId,
                  p_date: date,
                  p_force: true
                });
              
              if (error) {
                const errorMsg = `❌ Erro ao processar funcionário ${employeeId} (${date}): ${error.message} | Details: ${error.details || 'N/A'} | Hint: ${error.hint || 'N/A'}`;
                console.error(errorMsg);
                errors.push(errorMsg);
              } else {
                console.log(`✅ Funcionário ${employeeId} processado com sucesso!`);
              }
            } catch (err: any) {
              const errorMsg = `❌ Exceção ao processar funcionário ${employeeId} (${date}): ${err.message || err}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          })()
        );
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const stats: PreloadStats = {
        success: errors.length === 0,
        employees: employee_ids.length,
        days: 1,
        total_records: employee_ids.length,
        duration_ms: duration,
      };

      if (errors.length > 0) {
        stats.errors = errors;
        console.log(`⚠️ Completado com ${errors.length} erros`);
      } else {
        console.log(`✅ Cache específico gerado! ${employee_ids.length} funcionários processados para ${date}`);
      }

      return new Response(
        JSON.stringify(stats),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // LEGACY MODE: All active employees, next 7 days
    console.log('🚀 Modo legado: todos os funcionários ativos, 7 dias');

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, barbershop_id')
      .eq('status', 'active');

    if (employeesError) {
      console.error('❌ Erro ao buscar funcionários:', employeesError);
      throw employeesError;
    }

    if (!employees || employees.length === 0) {
      console.log('⚠️ Nenhum funcionário ativo encontrado');
      return new Response(
        JSON.stringify({ 
          success: true, 
          employees: 0,
          days: 7,
          total_records: 0,
          duration_ms: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Encontrados ${employees.length} funcionários ativos`);

    const today = new Date();
    const daysToPreload = 7;
    const promises: Promise<any>[] = [];

    for (const employee of employees) {
      for (let i = 0; i < daysToPreload; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        promises.push(
          Promise.resolve(
            supabase
              .rpc('refresh_daily_availability', {
                p_employee_id: employee.id,
                p_date: dateStr,
                p_force: true
              })
              .then(({ error }) => {
                if (error) {
                  const errorMsg = `Erro ao processar ${employee.name} (${dateStr}): ${error.message}`;
                  console.error('⚠️', errorMsg);
                  errors.push(errorMsg);
                }
              })
          )
        );
      }
    }

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    const totalRecords = employees.length * daysToPreload;

    console.log(`✅ Cache gerado com sucesso!`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Funcionários: ${employees.length}`);
    console.log(`   - Dias: ${daysToPreload}`);
    console.log(`   - Total de registros: ${totalRecords}`);
    console.log(`   - Duração: ${duration}ms`);
    if (errors.length > 0) {
      console.log(`   - Erros: ${errors.length}`);
    }

    const stats: PreloadStats = {
      success: true,
      employees: employees.length,
      days: daysToPreload,
      total_records: totalRecords,
      duration_ms: duration,
    };

    if (errors.length > 0) {
      stats.errors = errors;
    }

    return new Response(
      JSON.stringify(stats),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ Erro fatal ao pré-gerar cache:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        duration_ms: duration
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
