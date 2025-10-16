import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 MercadoPago webhook received');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData = await req.json();
    console.log('📦 Webhook data:', JSON.stringify(webhookData, null, 2));

    // MercadoPago envia notificações com diferentes tipos
    // Para pagamentos, o tipo é "payment"
    if (webhookData.type !== 'payment' && webhookData.action !== 'payment.updated') {
      console.log('ℹ️ Ignoring non-payment notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Notification ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // O ID do pagamento vem no data.id
    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      console.error('❌ No payment ID in webhook');
      return new Response(
        JSON.stringify({ success: false, error: 'No payment ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`🔍 Processing payment ID: ${paymentId}`);

    // Buscar o pagamento no banco de dados
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('mercadopago_payment_id', paymentId.toString())
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment not found in database:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`✅ Payment found in database: ${payment.id}`);

    // Buscar detalhes do pagamento no MercadoPago
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('mercadopago_access_token')
      .eq('id', payment.barbershop_id)
      .single();

    if (barbershopError || !barbershop?.mercadopago_access_token) {
      console.error('❌ Barbershop or token not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Barbershop not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Buscar detalhes atualizados do pagamento no MercadoPago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${barbershop.mercadopago_access_token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!mpResponse.ok) {
      console.error('❌ Failed to fetch payment from MercadoPago');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch payment details' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const mpPayment = await mpResponse.json();
    console.log('💳 MercadoPago payment status:', mpPayment.status);

    // Mapear status do MercadoPago para nosso sistema
    let newStatus = payment.status;
    let paidAt = payment.paid_at;

    switch (mpPayment.status) {
      case 'approved':
        newStatus = 'paid';
        paidAt = new Date().toISOString();
        break;
      case 'pending':
      case 'in_process':
        newStatus = 'processing';
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'failed';
        break;
      case 'refunded':
        newStatus = 'refunded';
        break;
    }

    // Atualizar pagamento no banco de dados
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        paid_at: paidAt,
        transaction_amount: mpPayment.transaction_amount,
        net_received_amount: mpPayment.transaction_details?.net_received_amount || mpPayment.transaction_amount,
        fee_amount: mpPayment.fee_details?.reduce((sum: number, fee: any) => sum + fee.amount, 0) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('❌ Error updating payment:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update payment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`✅ Payment updated to status: ${newStatus}`);

    // Se o pagamento foi aprovado e tem appointment_id, atualizar o agendamento
    if (newStatus === 'paid' && payment.appointment_id) {
      console.log(`📅 Attempting to update appointment ${payment.appointment_id}...`);
      
      // Verificar se appointment existe antes de atualizar
      const { data: existingAppointment, error: checkError } = await supabase
        .from('appointments')
        .select('id, payment_status, status')
        .eq('id', payment.appointment_id)
        .single();

      if (checkError || !existingAppointment) {
        console.error(`❌ Appointment ${payment.appointment_id} not found:`, checkError);
      } else {
        console.log(`📋 Current appointment status: payment_status=${existingAppointment.payment_status}, status=${existingAppointment.status}`);
        
        const { data: updatedAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .update({
            payment_status: 'paid',
            payment_method: payment.payment_method,
            status: existingAppointment.status === 'pending' || existingAppointment.status === 'queue_reserved' 
              ? 'confirmed' 
              : existingAppointment.status,
            mercadopago_payment_id: paymentId.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.appointment_id)
          .select();

        if (appointmentError) {
          console.error('❌ CRITICAL: Error updating appointment:', {
            error: appointmentError,
            appointment_id: payment.appointment_id,
            payment_id: payment.id,
            message: appointmentError.message,
            details: appointmentError.details,
            hint: appointmentError.hint
          });
          // NÃO falhar o webhook - o trigger SQL deve fazer a sincronização de backup
          console.log('⚠️ Trigger SQL deve sincronizar este appointment automaticamente');
        } else {
          console.log('✅ Appointment updated successfully:', updatedAppointment);
        }
      }
    }

    // Se o pagamento foi aprovado e tem tab_id, atualizar a comanda
    if (newStatus === 'paid' && payment.tab_id) {
      const { data: tab, error: tabError } = await supabase
        .from('tabs')
        .select('*')
        .eq('id', payment.tab_id)
        .single();

      if (!tabError && tab) {
        const newPaidAmount = Number(tab.paid_amount) + payment.amount;
        const isFullyPaid = newPaidAmount >= Number(tab.total);

        await supabase
          .from('tabs')
          .update({
            paid_amount: newPaidAmount,
            payment_status: isFullyPaid ? 'paid' : 'partially_paid',
            status: isFullyPaid ? 'closed' : 'open',
            closed_at: isFullyPaid ? new Date().toISOString() : null,
          })
          .eq('id', payment.tab_id);

        console.log('✅ Tab updated');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_id: payment.id,
        new_status: newStatus 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('💥 Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
