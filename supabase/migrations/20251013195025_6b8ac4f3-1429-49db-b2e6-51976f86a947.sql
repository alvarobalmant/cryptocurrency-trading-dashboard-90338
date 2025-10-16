-- 1) Dropar a função existente primeiro
DROP FUNCTION IF EXISTS public.get_employee_commission_summary(uuid);

-- 2) Recriar a função com a lógica correta (não descontar períodos pagos de novos pendentes)
CREATE OR REPLACE FUNCTION public.get_employee_commission_summary(barbershop_id_param uuid)
RETURNS TABLE(
  employee_id uuid,
  employee_name text,
  confirmed_pending_commission numeric,
  confirmed_appointments_count integer,
  future_commission numeric,
  future_appointments_count integer,
  paid_commission numeric,
  period_paid_commission numeric,
  total_paid_commission numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH emp AS (
    SELECT id, name, COALESCE(commission_percentage, 0) AS commission_percentage
    FROM employees
    WHERE barbershop_id = barbershop_id_param
      AND active = true
  ),
  confirmed_base AS (
    SELECT e.id as employee_id, a.id as appointment_id, s.price, e.commission_percentage as pct
    FROM appointments a
    JOIN emp e ON a.employee_id = e.id
    JOIN services s ON s.id = a.service_id
    WHERE a.barbershop_id = barbershop_id_param
      AND a.status = 'confirmed'
      AND a.payment_status = 'paid'
  ),
  -- Excluir agendamentos já contabilizados em qualquer período (qualquer status) para não voltar a contar
  confirmed_excluded AS (
    SELECT cb.*
    FROM confirmed_base cb
    LEFT JOIN commission_period_services cps
      ON cps.appointment_id = cb.appointment_id
    WHERE cps.appointment_id IS NULL
  ),
  confirmed_agg AS (
    SELECT employee_id,
           COUNT(*)::int as confirmed_appointments_count,
           COALESCE(SUM(price * pct / 100), 0)::numeric as confirmed_pending_commission
    FROM confirmed_excluded
    GROUP BY employee_id
  ),
  future_base AS (
    SELECT e.id as employee_id, a.id as appointment_id, s.price, e.commission_percentage as pct
    FROM appointments a
    JOIN emp e ON a.employee_id = e.id
    JOIN services s ON s.id = a.service_id
    WHERE a.barbershop_id = barbershop_id_param
      AND a.status = 'confirmed'
      AND (a.payment_status IS NULL OR a.payment_status <> 'paid')
  ),
  future_agg AS (
    SELECT employee_id,
           COUNT(*)::int as future_appointments_count,
           COALESCE(SUM(price * pct / 100), 0)::numeric as future_commission
    FROM future_base
    GROUP BY employee_id
  ),
  -- Pagamentos diretos (não vinculados a períodos)
  paid_direct AS (
    SELECT employee_id, COALESCE(SUM(amount), 0)::numeric AS paid_commission
    FROM commission_payments
    WHERE barbershop_id = barbershop_id_param
      AND status = 'paid'
      AND commission_period_id IS NULL
    GROUP BY employee_id
  ),
  -- Pagamentos via períodos pagos (apenas para referência/relatórios)
  period_paid AS (
    SELECT employee_id, COALESCE(SUM(net_amount), 0)::numeric AS period_paid_commission
    FROM commission_periods
    WHERE barbershop_id = barbershop_id_param
      AND status = 'paid'
    GROUP BY employee_id
  )
  SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    COALESCE(ca.confirmed_pending_commission, 0) AS confirmed_pending_commission,
    COALESCE(ca.confirmed_appointments_count, 0) AS confirmed_appointments_count,
    COALESCE(fa.future_commission, 0) AS future_commission,
    COALESCE(fa.future_appointments_count, 0) AS future_appointments_count,
    COALESCE(pd.paid_commission, 0) AS paid_commission,
    COALESCE(pp.period_paid_commission, 0) AS period_paid_commission,
    COALESCE(pd.paid_commission, 0) + COALESCE(pp.period_paid_commission, 0) AS total_paid_commission
  FROM emp e
  LEFT JOIN confirmed_agg ca ON ca.employee_id = e.id
  LEFT JOIN future_agg fa ON fa.employee_id = e.id
  LEFT JOIN paid_direct pd ON pd.employee_id = e.id
  LEFT JOIN period_paid pp ON pp.employee_id = e.id
  ORDER BY e.name;
END;
$$;

-- 3) Limpeza cirúrgica: remover apenas commission_payments vinculados a períodos (evita abatimento indevido)
DO $$
DECLARE
  v_barbershop_id uuid := '7ce557e7-2850-475d-aa71-77be87c9ec90'::uuid;
BEGIN
  DELETE FROM commission_payments
  WHERE barbershop_id = v_barbershop_id
    AND commission_period_id IS NOT NULL;
END $$;