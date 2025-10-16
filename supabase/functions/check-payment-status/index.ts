import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Checking payment status...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    // Buscar o pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    if (!payment.mercadopago_payment_id) {
      throw new Error('Payment does not have MercadoPago ID');
    }

    // Buscar credenciais da barbearia
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('mercadopago_access_token')
      .eq('id', payment.barbershop_id)
      .single();

    if (barbershopError || !barbershop?.mercadopago_access_token) {
      throw new Error('Barbershop credentials not found');
    }

    // Consultar status no MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment.mercadopago_payment_id}`,
      {
        headers: {
          'Authorization': `Bearer ${barbershop.mercadopago_access_token}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!mpResponse.ok) {
      throw new Error('Failed to fetch payment from MercadoPago');
    }

    const mpPayment = await mpResponse.json();
    console.log('💳 MercadoPago status:', mpPayment.status);

    // Mapear status
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

    // Atualizar pagamento
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
      throw updateError;
    }

    // Atualizar appointment se necessário
    if (newStatus === 'paid' && payment.appointment_id) {
      await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          payment_method: payment.payment_method,
          status: 'confirmed',
        })
        .eq('id', payment.appointment_id);
    }

    // Atualizar tab se necessário
    if (newStatus === 'paid' && payment.tab_id) {
      const { data: tab } = await supabase
        .from('tabs')
        .select('*')
        .eq('id', payment.tab_id)
        .single();

      if (tab) {
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
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        old_status: payment.status,
        new_status: newStatus,
        mercadopago_status: mpPayment.status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('💥 Error:', error);
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
