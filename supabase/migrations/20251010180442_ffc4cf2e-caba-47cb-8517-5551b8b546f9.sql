-- Corrigir cálculo: só descontar adiantamentos após período PARCIAL estar pago
CREATE OR REPLACE FUNCTION public.get_employee_commission_summary(barbershop_id_param uuid)
 RETURNS TABLE(employee_id uuid, employee_name text, commission_percentage numeric, confirmed_pending_commission numeric, future_pending_commission numeric, paid_commission numeric, confirmed_appointments_count integer, pending_appointments_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH employee_stats AS (
    SELECT 
      e.id as emp_id,
      e.name as emp_name,
      e.commission_percentage as emp_commission,
      COALESCE(SUM(
        CASE 
          WHEN a.status = 'confirmed' AND a.payment_status = 'paid' 
          THEN s.price * e.commission_percentage / 100 
          ELSE 0 
        END
      ), 0) as total_earned_commission,
      COALESCE(SUM(
        CASE 
          WHEN a.status = 'pending' 
          THEN s.price * e.commission_percentage / 100 
          ELSE 0 
        END
      ), 0) as future_pending,
      COUNT(CASE WHEN a.status = 'confirmed' AND a.payment_status = 'paid' THEN 1 END) as confirmed_count,
      COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count
    FROM public.employees e
    LEFT JOIN public.appointments a ON e.id = a.employee_id
    LEFT JOIN public.services s ON a.service_id = s.id
    WHERE e.barbershop_id = barbershop_id_param 
      AND e.status = 'active'
      AND e.commission_percentage > 0
    GROUP BY e.id, e.name, e.commission_percentage
  ),
  paid_commissions AS (
    SELECT 
      cp.employee_id,
      COALESCE(SUM(cp.amount), 0) as total_paid
    FROM public.commission_payments cp
    WHERE cp.barbershop_id = barbershop_id_param 
      AND cp.status = 'paid'
    GROUP BY cp.employee_id
  ),
  deductions_total AS (
    SELECT 
      cd.employee_id,
      COALESCE(SUM(cd.amount), 0) as total_deductions
    FROM public.commission_deductions cd
    LEFT JOIN public.commission_periods p ON p.id = cd.commission_period_id
    WHERE cd.barbershop_id = barbershop_id_param
      AND cd.applied_to_period_id IS NULL
      AND (
        -- Outras deduções (não adiantamentos) contam sempre
        cd.deduction_type <> 'advance'
        -- Adiantamentos só contam quando vinculados a período PARCIAL pago
        OR (cd.deduction_type = 'advance' AND cd.commission_period_id IS NOT NULL AND p.status = 'paid')
      )
    GROUP BY cd.employee_id
  )
  SELECT 
    es.emp_id,
    es.emp_name,
    es.emp_commission,
    GREATEST(
      es.total_earned_commission 
      - COALESCE(pc.total_paid, 0) 
      - COALESCE(dt.total_deductions, 0), 
      0
    ) as confirmed_pending,
    es.future_pending,
    COALESCE(pc.total_paid, 0) + COALESCE(dt.total_deductions, 0) as paid_commission,
    es.confirmed_count::INTEGER,
    es.pending_count::INTEGER
  FROM employee_stats es
  LEFT JOIN paid_commissions pc ON es.emp_id = pc.employee_id
  LEFT JOIN deductions_total dt ON es.emp_id = dt.employee_id
  ORDER BY es.emp_name;
END;
$function$;