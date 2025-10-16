-- FASE 2: Criar função SQL para calcular métricas REAIS de segmentação
CREATE OR REPLACE FUNCTION public.calculate_segment_metrics(
  p_barbershop_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  segment TEXT,
  client_count INTEGER,
  total_clv NUMERIC,
  avg_clv NUMERIC,
  total_revenue NUMERIC,
  avg_frequency NUMERIC,
  avg_ticket NUMERIC,
  avg_days_since_visit NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH client_metrics AS (
    SELECT
      cp.id AS client_id,
      cp.name,
      -- Total de visitas confirmadas
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'confirmed') AS total_visits,
      
      -- CLV real de payments_clean (apenas PAID)
      COALESCE(SUM(pc.net_amount) FILTER (WHERE pc.customer_type = 'registered'), 0) AS clv,
      
      -- Frequência (dias médios entre visitas)
      CASE 
        WHEN COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'confirmed') >= 2 THEN
          (MAX(a.appointment_date) - MIN(a.appointment_date))::NUMERIC / 
          NULLIF(COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'confirmed') - 1, 0)
        ELSE 0
      END AS visit_frequency_days,
      
      -- Dias desde última visita
      CASE 
        WHEN MAX(a.appointment_date) FILTER (WHERE a.status = 'confirmed') IS NOT NULL THEN
          CURRENT_DATE - MAX(a.appointment_date) FILTER (WHERE a.status = 'confirmed')
        ELSE NULL
      END AS days_since_last_visit,
      
      -- Definir segmento baseado em visitas CONFIRMADAS
      CASE
        WHEN COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'confirmed') >= 10 THEN 'vip'
        WHEN COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'confirmed') >= 3 THEN 'regular'
        ELSE 'new'
      END AS segment
    FROM client_profiles cp
    LEFT JOIN appointments a 
      ON a.client_profile_id = cp.id 
      AND a.appointment_date BETWEEN p_period_start AND p_period_end
    LEFT JOIN payments_clean pc 
      ON pc.client_profile_id = cp.id
      AND pc.created_at::DATE BETWEEN p_period_start AND p_period_end
    WHERE cp.barbershop_id = p_barbershop_id
      AND cp.phone_verified = true
      AND cp.user_id IS NOT NULL
    GROUP BY cp.id, cp.name
  )
  SELECT
    cm.segment,
    COUNT(*)::INTEGER AS client_count,
    SUM(cm.clv) AS total_clv,
    AVG(cm.clv) AS avg_clv,
    SUM(cm.clv) AS total_revenue,
    AVG(NULLIF(cm.visit_frequency_days, 0)) AS avg_frequency,
    CASE 
      WHEN SUM(cm.clv) > 0 AND SUM(cm.total_visits) > 0 
      THEN SUM(cm.clv) / NULLIF(SUM(cm.total_visits), 0)
      ELSE 0 
    END AS avg_ticket,
    AVG(cm.days_since_last_visit) AS avg_days_since_visit
  FROM client_metrics cm
  GROUP BY cm.segment
  ORDER BY 
    CASE cm.segment
      WHEN 'vip' THEN 1
      WHEN 'regular' THEN 2
      WHEN 'new' THEN 3
    END;
END;
$$;

COMMENT ON FUNCTION calculate_segment_metrics IS 'Calcula métricas REAIS de segmentação usando apenas payments PAID via payments_clean';