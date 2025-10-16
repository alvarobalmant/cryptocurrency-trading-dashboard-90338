import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommissionSettings {
  id: string;
  barbershop_id: string;
  default_period_type: 'individual' | 'weekly' | 'monthly';
  auto_generate_periods: boolean;
  weekly_close_day: number | null;
  monthly_close_day: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting automatic commission period generation...');

    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();

    // Buscar todas as configurações de barbearias que usam modo automático
    const { data: settings, error: settingsError } = await supabaseClient
      .from('barbershop_commission_settings')
      .select('*')
      .in('default_period_type', ['weekly', 'monthly'])
      .eq('auto_generate_periods', true);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    console.log(`📋 Found ${settings?.length || 0} barbershops with automatic commission mode`);

    const results = [];

    for (const setting of settings || []) {
      const s = setting as CommissionSettings;

      // Verificar se hoje é dia de fechamento
      const shouldGenerate =
        (s.default_period_type === 'weekly' && s.weekly_close_day === dayOfWeek) ||
        (s.default_period_type === 'monthly' && s.monthly_close_day === dayOfMonth);

      if (!shouldGenerate) {
        console.log(`⏭️ Skipping barbershop ${s.barbershop_id} - not close day`);
        continue;
      }

      console.log(`✅ Generating period for barbershop ${s.barbershop_id}`);

      // Calcular período
      const periodEnd = new Date();
      periodEnd.setHours(0, 0, 0, 0);
      let periodStart = new Date(periodEnd);

      if (s.default_period_type === 'weekly') {
        periodStart.setDate(periodStart.getDate() - 7);
      } else {
        // monthly
        periodStart.setDate(periodStart.getDate() - 30);
      }

      // Buscar funcionários com comissão
      const { data: employees, error: employeesError } = await supabaseClient
        .from('employees')
        .select('id, name, commission_percentage')
        .eq('barbershop_id', s.barbershop_id)
        .eq('status', 'active')
        .gt('commission_percentage', 0);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        continue;
      }

      console.log(`👥 Found ${employees?.length || 0} employees with commission`);

      // Gerar período para cada funcionário
      for (const employee of employees || []) {
        
        // ✅ 1. Verificar se período já existe
        const { data: existingPeriod } = await supabaseClient
          .from('commission_periods')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('period_start', periodStart.toISOString().split('T')[0])
          .eq('period_end', periodEnd.toISOString().split('T')[0])
          .maybeSingle();
        
        if (existingPeriod) {
          console.log(`   ⏭️ Period already exists for employee ${employee.name}`);
          continue;
        }
        
        // ✅ 2. Buscar comissões usando commissions_transactions + appointments
        const { data: commissions, error: commissionError } = await supabaseClient
          .from('commissions_transactions')
          .select(`
            id,
            commission_value,
            service_value,
            appointment:appointments!inner(
              appointment_date,
              start_time
            )
          `)
          .eq('employee_id', employee.id)
          .eq('barbershop_id', s.barbershop_id)
  .eq('status', 'pending')
  .gte('appointment.appointment_date', periodStart.toISOString().split('T')[0])
  .lt('appointment.appointment_date', periodEnd.toISOString().split('T')[0]);

        if (commissionError) {
          console.error('   ❌ Error fetching commissions:', commissionError);
          continue;
        }

        // ✅ 3. Não criar se não houver comissões
        if (!commissions || commissions.length === 0) {
          console.log(`   ⏭️ No commissions for employee ${employee.name} in this period`);
          continue;
        }

        // Calcular total
        const totalCommission = commissions.reduce(
          (sum, c) => sum + Number(c.commission_value || 0),
          0
        );
        
        const totalServices = commissions.reduce(
          (sum, c) => sum + Number(c.service_value || 0),
          0
        );

        console.log(`   💰 Total commission for ${employee.name}: R$ ${totalCommission.toFixed(2)} (${commissions.length} services)`);

        if (totalCommission > 0) {
          // ✅ 4. Criar período (sem campos de valores, serão calculados dinamicamente)
          const { data: period, error: periodError } = await supabaseClient
            .from('commission_periods')
            .insert({
              barbershop_id: s.barbershop_id,
              employee_id: employee.id,
              period_type: s.default_period_type,
              period_start: periodStart.toISOString().split('T')[0],
              period_end: periodEnd.toISOString().split('T')[0],
              status: 'pending_signature'
            })
            .select()
            .single();

          if (periodError) {
            console.error('   ❌ Error creating period:', periodError);
            continue;
          }

          // ✅ 5. Vincular comissões ao período
          const { error: linkError } = await supabaseClient
            .from('commission_period_items')
            .insert(
              commissions.map(c => ({
                period_id: period.id,
                commission_transaction_id: c.id
              }))
            );

          if (linkError) {
            console.error('   ❌ Error linking commissions:', linkError);
            continue;
          }

          console.log(`   ✅ Created period ${period.id} for employee ${employee.name}`);

          results.push({
            barbershop_id: s.barbershop_id,
            employee_id: employee.id,
            employee_name: employee.name,
            period_id: period.id,
            amount: totalCommission,
            commissions_count: commissions.length,
          });

          // Gerar PDF
          try {
            await supabaseClient.functions.invoke('generate-commission-pdf', {
              body: { period_id: period.id },
            });
            console.log(`   📄 PDF generated for period ${period.id}`);
          } catch (pdfError) {
            console.error('   ⚠️ Error generating PDF:', pdfError);
          }
        }
      }
    }

    console.log(`\n✨ Generation complete: ${results.length} periods created`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in auto-generate-commission-periods:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
