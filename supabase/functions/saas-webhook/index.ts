import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const notification = await req.json()
    
    console.log('🔔 SaaS webhook received:', notification)
    console.log('📋 Notification type:', notification.type)
    console.log('📋 Notification action:', notification.action)

    // Handle different notification types
    if (notification.type === 'payment') {
      return await handlePaymentNotification(notification)
    } else if (notification.type === 'subscription_preapproval' || notification.action === 'payment.created') {
      return await handlePreapprovalNotification(notification)
    }
    
    console.log('⚠️ Unhandled notification type:', notification.type)
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function handlePaymentNotification(notification: any) {
  const paymentId = notification.data?.id
  
  if (!paymentId) {
    throw new Error('No payment ID in notification')
  }

  console.log('💳 Processing payment:', paymentId)

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const accessToken = Deno.env.get('SAAS_MERCADOPAGO_ACCESS_TOKEN')
  
  if (!accessToken) {
    throw new Error('Mercado Pago not configured')
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  const payment = await mpResponse.json()
  
  console.log('📄 Payment status:', payment.status)
  console.log('📄 Payment external_reference:', payment.external_reference)

  // Try to find subscription by payment_id or external_reference
  let subscription = null
  
  const { data: subByPayment } = await supabaseClient
    .from('barbershop_subscriptions')
    .select('*')
    .eq('mercadopago_payment_id', paymentId.toString())
    .maybeSingle()

  if (subByPayment) {
    subscription = subByPayment
  } else if (payment.external_reference?.startsWith('saas-')) {
    // Try to match by barbershop and plan from external_reference
    const parts = payment.external_reference.split('-')
    if (parts.length >= 3) {
      const barbershopId = parts[1]
      const planType = parts[2]
      
      const { data: subByRef } = await supabaseClient
        .from('barbershop_subscriptions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('plan_type', planType)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (subByRef) {
        subscription = subByRef
        // Update with payment ID
        await supabaseClient
          .from('barbershop_subscriptions')
          .update({ mercadopago_payment_id: paymentId.toString() })
          .eq('id', subByRef.id)
      }
    }
  }

  if (!subscription) {
    console.log('⚠️ Subscription not found for payment:', paymentId)
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Update subscription status
  if (payment.status === 'approved') {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)

    await supabaseClient
      .from('barbershop_subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      .eq('id', subscription.id)

    await supabaseClient
      .from('barbershops')
      .update({
        plan_type: subscription.plan_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.barbershop_id)

    console.log('✅ Subscription activated:', subscription.id)
  } else if (payment.status === 'cancelled' || payment.status === 'rejected') {
    await supabaseClient
      .from('barbershop_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscription.id)

    console.log('❌ Subscription cancelled:', subscription.id)
  }

  return new Response(
    JSON.stringify({ received: true }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

async function handlePreapprovalNotification(notification: any) {
  const preapprovalId = notification.data?.id
  
  if (!preapprovalId) {
    throw new Error('No preapproval ID in notification')
  }

  console.log('🔄 Processing preapproval:', preapprovalId)

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const accessToken = Deno.env.get('SAAS_MERCADOPAGO_ACCESS_TOKEN')
  
  if (!accessToken) {
    throw new Error('Mercado Pago not configured')
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  const preapproval = await mpResponse.json()
  
  console.log('📄 Preapproval status:', preapproval.status)
  console.log('📄 Preapproval external_reference:', preapproval.external_reference)

  // Find subscription by preference_id
  const { data: subscription } = await supabaseClient
    .from('barbershop_subscriptions')
    .select('*')
    .eq('mercadopago_preference_id', preapprovalId.toString())
    .maybeSingle()

  if (!subscription) {
    console.log('⚠️ Subscription not found for preapproval:', preapprovalId)
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Update subscription based on preapproval status
  if (preapproval.status === 'authorized') {
    const startDate = new Date(preapproval.start_date || new Date())
    const endDate = new Date(preapproval.end_date || new Date())

    await supabaseClient
      .from('barbershop_subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      .eq('id', subscription.id)

    await supabaseClient
      .from('barbershops')
      .update({
        plan_type: subscription.plan_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.barbershop_id)

    console.log('✅ Recurring subscription activated:', subscription.id)
  } else if (preapproval.status === 'cancelled') {
    await supabaseClient
      .from('barbershop_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscription.id)

    console.log('❌ Recurring subscription cancelled:', subscription.id)
  }

  return new Response(
    JSON.stringify({ received: true }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}
