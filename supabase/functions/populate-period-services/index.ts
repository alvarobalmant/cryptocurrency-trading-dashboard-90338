import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { period_id } = await req.json();
    console.log('[Populate Services] Processing period:', period_id);

    // Fetch period data
    const { data: period, error: periodError } = await supabaseClient
      .from('commission_periods')
      .select('*, employees(commission_percentage)')
      .eq('id', period_id)
      .single();

    if (periodError || !period) {
      console.error('[Populate Services] Error fetching period:', periodError);
      throw new Error('Period not found');
    }

    // Fetch confirmed appointments in the period
    const { data: appointments, error: appointmentsError } = await supabaseClient
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        service:services (
          id,
          name,
          price
        )
      `)
      .eq('employee_id', period.employee_id)
      .eq('barbershop_id', period.barbershop_id)
      .eq('status', 'confirmed')
      .gte('appointment_date', period.period_start)
      .lt('appointment_date', period.period_end)
      .order('appointment_date', { ascending: true });

    if (appointmentsError) {
      console.error('[Populate Services] Error fetching appointments:', appointmentsError);
      throw appointmentsError;
    }

    console.log(`[Populate Services] Found ${appointments?.length || 0} confirmed appointments`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No confirmed appointments found in this period',
          services_count: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Delete existing services for this period (to avoid duplicates on re-population)
    await supabaseClient
      .from('commission_period_services')
      .delete()
      .eq('commission_period_id', period_id);

    // Prepare services to insert
    const commissionPercentage = period.employees?.commission_percentage || 0;
    const servicesToInsert = appointments.map((apt) => {
      const service = apt.service as unknown as { id: string; name: string; price: number };
      const servicePrice = Number(service.price);
      const commissionAmount = (servicePrice * commissionPercentage) / 100;

      return {
        commission_period_id: period_id,
        appointment_id: apt.id,
        service_id: service.id,
        service_name: service.name,
        service_price: servicePrice,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        performed_at: `${apt.appointment_date}T${apt.start_time}`,
      };
    });

    // Insert all services
    const { error: insertError } = await supabaseClient
      .from('commission_period_services')
      .insert(servicesToInsert);

    if (insertError) {
      console.error('[Populate Services] Error inserting services:', insertError);
      throw insertError;
    }

    // Calculate totals
    const totalServicesValue = servicesToInsert.reduce((sum, s) => sum + s.service_price, 0);
    const totalCommissionValue = servicesToInsert.reduce((sum, s) => sum + s.commission_amount, 0);

    // Fetch deductions
    const { data: deductions } = await supabaseClient
      .from('commission_deductions')
      .select('amount')
      .eq('applied_to_period_id', period_id);

    const totalDeductions = deductions?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    const netAmount = totalCommissionValue - totalDeductions;

    // Update period totals
    const { error: updateError } = await supabaseClient
      .from('commission_periods')
      .update({
        total_services_value: totalServicesValue,
        total_commission_value: totalCommissionValue,
        total_deductions: totalDeductions,
        net_amount: netAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', period_id);

    if (updateError) {
      console.error('[Populate Services] Error updating period totals:', updateError);
      throw updateError;
    }

    console.log(`[Populate Services] Successfully populated ${servicesToInsert.length} services`);

    return new Response(
      JSON.stringify({
        success: true,
        services_count: servicesToInsert.length,
        total_services_value: totalServicesValue,
        total_commission_value: totalCommissionValue,
        net_amount: netAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Populate Services] Error:', error);
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
