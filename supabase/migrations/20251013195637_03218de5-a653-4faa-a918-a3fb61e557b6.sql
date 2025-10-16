-- Corrigir ambiguidade na função get_employee_commission_summary
DROP FUNCTION IF EXISTS get_employee_commission_summary(uuid);

CREATE OR REPLACE FUNCTION get_employee_commission_summary(barbershop_id_param uuid)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  confirmed_pending_commission numeric,
  confirmed_appointments_count bigint,
  future_commission numeric,
  future_appointments_count bigint,
  paid_commission numeric,
  paid_appointments_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    
    -- Comissão confirmada (agendamentos confirmados e pagos)
    COALESCE(SUM(
      CASE 
        WHEN a.status = 'confirmed' AND a.payment_status = 'paid' 
        THEN (s.price * COALESCE(e.commission_percentage, 0) / 100)
        ELSE 0 
      END
    ), 0) as confirmed_pending_commission,
    
    COUNT(CASE WHEN a.status = 'confirmed' AND a.payment_status = 'paid' THEN 1 END) as confirmed_appointments_count,
    
    -- Comissão futura (agendamentos pendentes)
    COALESCE(SUM(
      CASE 
        WHEN a.status = 'pending' 
        THEN (s.price * COALESCE(e.commission_percentage, 0) / 100)
        ELSE 0 
      END
    ), 0) as future_commission,
    
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as future_appointments_count,
    
    -- Comissão já paga (da tabela commission_payments)
    COALESCE((
      SELECT SUM(cp.amount)
      FROM commission_payments cp
      WHERE cp.employee_id = e.id
        AND cp.barbershop_id = barbershop_id_param
        AND cp.status = 'paid'
    ), 0) as paid_commission,
    
    COALESCE((
      SELECT COUNT(*)
      FROM commission_payments cp
      WHERE cp.employee_id = e.id
        AND cp.barbershop_id = barbershop_id_param
        AND cp.status = 'paid'
    ), 0) as paid_appointments_count
    
  FROM employees e
  LEFT JOIN appointments a ON a.employee_id = e.id AND a.barbershop_id = barbershop_id_param
  LEFT JOIN services s ON s.id = a.service_id
  WHERE e.barbershop_id = barbershop_id_param
    AND e.status = 'active'
  GROUP BY e.id, e.name
  ORDER BY e.name;
END;
$$;