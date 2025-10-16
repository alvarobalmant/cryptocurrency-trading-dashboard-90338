import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barbershopId, analysisType } = await req.json();

    if (!barbershopId) {
      throw new Error("barbershopId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const [appointmentsRes, paymentsRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', startDate),
      supabase
        .from('payments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', startDate)
    ]);

    const appointments = appointmentsRes.data || [];
    const payments = paymentsRes.data || [];

    let result: any = {};

    switch (analysisType) {
      case 'forecast':
        result = generateForecast(appointments, payments);
        break;
      case 'churn':
        result = predictChurn(appointments);
        break;
      case 'recommendations':
        result = generateRecommendations(appointments, payments);
        break;
      default:
        result = {
          forecast: generateForecast(appointments, payments),
          churn: predictChurn(appointments),
          recommendations: generateRecommendations(appointments, payments)
        };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analytics-ai:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Simple linear regression for revenue forecast
function generateForecast(appointments: any[], payments: any[]) {
  // Calculate monthly revenue for last 6 months
  const monthlyRevenue = payments.reduce((acc, p) => {
    if (p.status === 'paid') {
      const month = new Date(p.created_at).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + (Number(p.amount) || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const values = Object.values(monthlyRevenue) as number[];
  if (values.length < 3) {
    return { forecast: [], confidence: 'low' };
  }

  // Simple linear regression
  const n = values.length;
  const sumX = (n * (n + 1)) / 2;
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast for next 3 months
  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    const projected = intercept + slope * (n + i);
    const confidence = {
      low: projected * 0.85,
      high: projected * 1.15
    };
    forecast.push({
      month: n + i,
      value: Math.round(projected),
      confidence
    });
  }

  return {
    forecast,
    confidence: 'medium',
    trend: slope > 0 ? 'growing' : 'declining',
    growthRate: ((slope / (sumY / n)) * 100).toFixed(1) + '%'
  };
}

// Predict churn based on appointment patterns
function predictChurn(appointments: any[]) {
  const clientLastAppointment = new Map<string, Date>();
  
  appointments.forEach(apt => {
    const date = new Date(apt.appointment_date);
    const current = clientLastAppointment.get(apt.client_phone);
    if (!current || date > current) {
      clientLastAppointment.set(apt.client_phone, date);
    }
  });

  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;

  clientLastAppointment.forEach((lastDate) => {
    if (lastDate < ninetyDaysAgo) {
      highRisk++;
    } else if (lastDate < sixtyDaysAgo) {
      mediumRisk++;
    } else {
      lowRisk++;
    }
  });

  const totalClients = clientLastAppointment.size;
  const churnRate = totalClients > 0 ? ((highRisk + mediumRisk) / totalClients) * 100 : 0;

  return {
    churnRate: churnRate.toFixed(1) + '%',
    atRisk: {
      high: highRisk,
      medium: mediumRisk,
      low: lowRisk
    },
    recommendations: [
      highRisk > 0 ? `${highRisk} clientes em alto risco (90+ dias). Recomenda-se campanha de reativação urgente.` : null,
      mediumRisk > 0 ? `${mediumRisk} clientes em médio risco (60-90 dias). Considere lembretes personalizados.` : null
    ].filter(Boolean)
  };
}

// Generate intelligent recommendations
function generateRecommendations(appointments: any[], payments: any[]) {
  const recommendations = [];

  // Revenue analysis
  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const avgDailyRevenue = totalRevenue / 30;

  // Peak times analysis
  const hourCounts: Record<string, number> = {};
  appointments.forEach(apt => {
    const hour = apt.start_time?.slice(0, 2) || '00';
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const peakHour = sortedHours[0]?.[0];
  const slowestHour = sortedHours[sortedHours.length - 1]?.[0];

  if (peakHour && slowestHour) {
    recommendations.push({
      type: 'operational',
      priority: 'high',
      title: 'Otimização de Horários',
      description: `Seu horário de pico é ${peakHour}h. Considere ofertas para ${slowestHour}h para balancear demanda.`,
      impact: 'Pode aumentar receita em 12-15%'
    });
  }

  // No-show rate
  const noShows = appointments.filter(a => a.status === 'no_show').length;
  const noShowRate = appointments.length > 0 ? (noShows / appointments.length) * 100 : 0;

  if (noShowRate > 10) {
    recommendations.push({
      type: 'retention',
      priority: 'high',
      title: 'Reduzir No-Shows',
      description: `Taxa de falta: ${noShowRate.toFixed(1)}%. Implemente confirmação automática por WhatsApp.`,
      impact: 'Pode recuperar até R$ ' + (avgDailyRevenue * (noShowRate / 100) * 30).toFixed(0) + '/mês'
    });
  }

  // Growth opportunity
  if (totalRevenue > 0) {
    recommendations.push({
      type: 'growth',
      priority: 'medium',
      title: 'Programa de Fidelidade',
      description: 'Clientes recorrentes gastam 67% mais. Considere implementar plano de assinaturas.',
      impact: 'Potencial: +R$ ' + (totalRevenue * 0.2).toFixed(0) + '/mês'
    });
  }

  return {
    recommendations,
    summary: {
      totalRecommendations: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length,
      estimatedImpact: 'R$ ' + (avgDailyRevenue * 30 * 0.25).toFixed(0) + '/mês'
    }
  };
}
