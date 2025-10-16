import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  barbershopId: string;
  appointmentId?: string;
  serviceId?: string;
  employeeId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  amount: number;
  description: string;
  paymentType: 'appointment' | 'walk_in' | 'subscription';
  payerDocType?: string;
  payerDocNumber?: string;
  subscriptionData?: {
    clientProfileId: string;
    subscriptionPlanId: string;
    durationMonths: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Creating PIX payment...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentData: PaymentRequest = await req.json();
    console.log('📝 Payment data:', JSON.stringify(paymentData, null, 2));

    // Validar dados obrigatórios
    if (!paymentData.barbershopId || !paymentData.clientName || !paymentData.clientPhone || !paymentData.amount) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Dados obrigatórios não fornecidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar credenciais do MercadoPago da barbearia
    console.log('🔍 Fetching barbershop credentials...');
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('mercadopago_access_token, mercadopago_enabled')
      .eq('id', paymentData.barbershopId)
      .single();

    if (barbershopError || !barbershop) {
      console.error('❌ Error fetching barbershop:', barbershopError);
      return new Response(
        JSON.stringify({ success: false, error: 'Barbearia não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!barbershop.mercadopago_enabled || !barbershop.mercadopago_access_token) {
      console.error('❌ MercadoPago not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'MercadoPago não configurado para esta barbearia' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Preparar dados do pagamento PIX para MercadoPago com URL de notificação
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`;
    
    const pixPaymentData = {
      transaction_amount: paymentData.amount,
      description: paymentData.description,
      payment_method_id: 'pix',
      notification_url: webhookUrl,
      payer: {
        email: paymentData.clientEmail || `${paymentData.clientPhone}@example.com`,
        first_name: paymentData.clientName.split(' ')[0],
        last_name: paymentData.clientName.split(' ').slice(1).join(' ') || 'Cliente',
        ...(paymentData.payerDocType && paymentData.payerDocNumber && {
          identification: {
            type: paymentData.payerDocType,
            number: paymentData.payerDocNumber
          }
        })
      },
      external_reference: `${paymentData.barbershopId}-${Date.now()}`
    };
    
    console.log('🔔 Webhook URL configured:', webhookUrl);

    console.log('💳 Creating PIX payment with MercadoPago...', JSON.stringify(pixPaymentData, null, 2));

    // Criar pagamento PIX no MercadoPago
    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${barbershop.mercadopago_access_token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-${paymentData.barbershopId}-${Date.now()}`
      },
      body: JSON.stringify(pixPaymentData)
    });

    const mercadoPagoResult = await mercadoPagoResponse.json();
    console.log('🔄 MercadoPago response:', JSON.stringify(mercadoPagoResult, null, 2));

    if (!mercadoPagoResponse.ok) {
      console.error('❌ MercadoPago error:', mercadoPagoResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro do MercadoPago: ${mercadoPagoResult.message || 'Erro desconhecido'}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extrair dados do QR Code PIX
    const qrCodeBase64 = mercadoPagoResult.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCode = mercadoPagoResult.point_of_interaction?.transaction_data?.qr_code;

    console.log('🎯 PIX QR Code data extracted:', { 
      hasQrCodeBase64: !!qrCodeBase64, 
      hasQrCode: !!qrCode,
      paymentId: mercadoPagoResult.id
    });

    // Salvar pagamento no banco de dados
    console.log('💾 Saving payment to database...');
    const { data: savedPayment, error: saveError } = await supabase
      .from('payments')
      .insert({
        barbershop_id: paymentData.barbershopId,
        appointment_id: paymentData.appointmentId || null,
        service_id: paymentData.serviceId || null,
        employee_id: paymentData.employeeId || null,
        client_name: paymentData.clientName,
        client_phone: paymentData.clientPhone,
        amount: paymentData.amount,
        transaction_amount: mercadoPagoResult.transaction_amount,
        description: paymentData.description,
        payment_method: 'pix',
        status: mercadoPagoResult.status === 'approved' ? 'paid' : 'pending',
        mercadopago_payment_id: mercadoPagoResult.id.toString(),
        external_reference: pixPaymentData.external_reference,
        payment_type: paymentData.paymentType,
        qr_code_base64: qrCodeBase64,
        qr_code: qrCode
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving payment:', saveError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar pagamento no banco de dados' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Payment saved successfully:', savedPayment.id);

    // Atualizar agendamento se existir
    if (paymentData.appointmentId) {
      console.log('📅 Updating appointment with payment info...');
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          payment_status: mercadoPagoResult.status === 'approved' ? 'paid' : 'pending',
          payment_method: 'pix',
          mercadopago_payment_id: mercadoPagoResult.id.toString()
        })
        .eq('id', paymentData.appointmentId);

      if (appointmentError) {
        console.error('⚠️ Warning: Error updating appointment:', appointmentError);
      }
    }

    // Retornar dados do PIX
    const response = {
      success: true,
      payment_id: mercadoPagoResult.id,
      status: mercadoPagoResult.status,
      transaction_amount: mercadoPagoResult.transaction_amount,
      qr_code_base64: qrCodeBase64,
      qr_code: qrCode,
      date_of_expiration: mercadoPagoResult.date_of_expiration,
      external_reference: pixPaymentData.external_reference
    };

    console.log('🎉 PIX payment created successfully!', response.payment_id);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});