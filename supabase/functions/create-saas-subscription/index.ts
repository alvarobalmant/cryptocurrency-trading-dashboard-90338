import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLANS = {
  basic: {
    name: 'Plano Básico',
    price_1_month: 29.00,
    price_6_months: 156.00,
    price_12_months: 1.00,
  },
  pro: {
    name: 'Plano Pro',
    price_1_month: 49.00,
    price_6_months: 264.00,
    price_12_months: 1.00,
  },
  premium: {
    name: 'Plano Premium',
    price_1_month: 99.00,
    price_6_months: 534.00,
    price_12_months: 1.00,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { barbershopId, plan, durationMonths, paymentMethod } = await req.json()

    if (!barbershopId || !plan || !durationMonths) {
      throw new Error('Missing required parameters')
    }

    if (!PLANS[plan as keyof typeof PLANS]) {
      throw new Error('Invalid plan')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    console.log('💳 Creating SaaS subscription payment', { barbershopId, plan, durationMonths, paymentMethod })

    // Verificar se usuário é dono da barbearia
    const { data: barbershop } = await supabaseClient
      .from('barbershops')
      .select('owner_id, name')
      .eq('id', barbershopId)
      .single()

    if (!barbershop || barbershop.owner_id !== user.id) {
      throw new Error('Unauthorized')
    }

    // Calcular valor
    const planConfig = PLANS[plan as keyof typeof PLANS]
    let amount = planConfig.price_1_month
    if (durationMonths === 6) amount = planConfig.price_6_months
    if (durationMonths === 12) amount = planConfig.price_12_months

    console.log('💰 Amount calculated:', amount)

    // Para planos anuais (12 meses), usar pagamento único em vez de recorrente
    // Para planos mensais, usar preapproval recorrente
    const isAnnualPlan = durationMonths === 12;

    if (paymentMethod === 'pix') {
      // Criar PIX via Mercado Pago
      const accessToken = Deno.env.get('SAAS_MERCADOPAGO_ACCESS_TOKEN')
      
      if (!accessToken) {
        throw new Error('Mercado Pago not configured')
      }

      const paymentData = {
        transaction_amount: amount,
        description: `${planConfig.name} - ${durationMonths} mês(es) - ${barbershop.name}`,
        payment_method_id: 'pix',
        payer: {
          email: user.email || 'noreply@example.com',
        },
        external_reference: `saas-${barbershopId}-${plan}-${Date.now()}`,
      }

      console.log('📤 Creating PIX payment')

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(paymentData),
      })

      const paymentResult = await mpResponse.json()

      if (!mpResponse.ok) {
        console.error('❌ Mercado Pago error:', paymentResult)
        throw new Error('Failed to create PIX payment')
      }

      console.log('✅ PIX created:', paymentResult.id)

      // Salvar no banco
      const { data: subscription, error: subError } = await supabaseClient
        .from('barbershop_subscriptions')
        .insert({
          barbershop_id: barbershopId,
          plan_type: plan,
          amount_paid: amount,
          payment_method: 'pix',
          mercadopago_payment_id: paymentResult.id.toString(),
          status: 'pending',
        })
        .select()
        .single()

      if (subError) {
        console.error('❌ Error saving subscription:', subError)
        throw subError
      }

      return new Response(
        JSON.stringify({
          qr_code: paymentResult.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: paymentResult.point_of_interaction?.transaction_data?.qr_code_base64,
          payment_id: paymentResult.id,
          transaction_amount: paymentResult.transaction_amount,
          subscription_id: subscription.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      // Cartão: escolher entre pagamento único (anual) ou recorrente (mensal)
      const accessToken = Deno.env.get('SAAS_MERCADOPAGO_ACCESS_TOKEN')
      
      if (!accessToken) {
        throw new Error('Mercado Pago not configured')
      }

      if (isAnnualPlan) {
        // PLANO ANUAL: Pagamento único (não recorrente)
        console.log('📤 Creating single payment for annual plan (via Mercado Pago Preference)')

        const preferenceData = {
          items: [{
            title: `${planConfig.name} - Anual - ${barbershop.name}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          }],
          back_urls: {
            success: `${req.headers.get('origin')}/barbershops`,
            failure: `${req.headers.get('origin')}/barbershops`,
            pending: `${req.headers.get('origin')}/barbershops`,
          },
          auto_return: 'approved',
          external_reference: `saas-${barbershopId}-${plan}-${Date.now()}`,
          payer: {
            email: user.email || 'noreply@example.com',
          },
        }

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preferenceData),
        })

        const preferenceResult = await mpResponse.json()

        if (!mpResponse.ok) {
          console.error('❌ Mercado Pago preference error:', preferenceResult)
          throw new Error(preferenceResult.message || 'Failed to create payment')
        }

        console.log('✅ Preference created for annual plan:', preferenceResult.id)

        // Salvar no banco
        const { data: subscription, error: subError } = await supabaseClient
          .from('barbershop_subscriptions')
          .insert({
            barbershop_id: barbershopId,
            plan_type: plan,
            amount_paid: amount,
            payment_method: 'card',
            mercadopago_preference_id: preferenceResult.id,
            status: 'pending',
          })
          .select()
          .single()

        if (subError) {
          console.error('❌ Error saving subscription:', subError)
          throw subError
        }

        return new Response(
          JSON.stringify({
            init_point: preferenceResult.init_point,
            preference_id: preferenceResult.id,
            subscription_id: subscription.id,
            payment_type: 'single',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      } else {
        // PLANO MENSAL: Assinatura recorrente via Preapproval
        console.log('📤 Creating recurring subscription (preapproval) for monthly plan')

        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + durationMonths)

        const preapprovalData = {
          reason: `${planConfig.name} - ${barbershop.name}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'BRL',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
          back_url: `${req.headers.get('origin')}/barbershops`,
          payer_email: user.email || 'noreply@example.com',
          external_reference: `saas-${barbershopId}-${plan}-${Date.now()}`,
        }

        const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preapprovalData),
        })

        const preapprovalResult = await mpResponse.json()

        if (!mpResponse.ok) {
          console.error('❌ Mercado Pago preapproval error:', preapprovalResult)
          throw new Error(preapprovalResult.message || 'Failed to create subscription')
        }

        console.log('✅ Preapproval created:', preapprovalResult.id)

        // Salvar no banco
        const { data: subscription, error: subError } = await supabaseClient
          .from('barbershop_subscriptions')
          .insert({
            barbershop_id: barbershopId,
            plan_type: plan,
            amount_paid: amount,
            payment_method: 'card',
            mercadopago_preference_id: preapprovalResult.id,
            status: 'pending',
          })
          .select()
          .single()

        if (subError) {
          console.error('❌ Error saving subscription:', subError)
          throw subError
        }

        return new Response(
          JSON.stringify({
            init_point: preapprovalResult.init_point,
            preapproval_id: preapprovalResult.id,
            subscription_id: subscription.id,
            payment_type: 'recurring',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

  } catch (error) {
    console.error('❌ Error creating SaaS subscription:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
