-- Fix populate_commission_period_services to use exclusive period_end
-- Change <= to < for appointment_date filter to match period_end exclusivity

CREATE OR REPLACE FUNCTION public.populate_commission_period_services(period_id_param uuid)
 RETURNS TABLE(services_count integer, total_value numeric, total_commission numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period commission_periods%ROWTYPE;
  v_services_count INTEGER := 0;
  v_total_value NUMERIC := 0;
  v_total_commission NUMERIC := 0;
BEGIN
  -- Buscar o período
  SELECT * INTO v_period FROM commission_periods WHERE id = period_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período não encontrado';
  END IF;
  
  -- Deletar serviços existentes deste período (para repopular)
  DELETE FROM commission_period_services WHERE commission_period_id = period_id_param;
  
  -- Inserir os serviços detalhados dos agendamentos confirmados
  -- CORRIGIDO: usar appointment_date com < ao invés de <= para period_end exclusivo
  INSERT INTO commission_period_services (
    commission_period_id,
    appointment_id,
    service_id,
    service_name,
    service_price,
    commission_percentage,
    commission_amount,
    performed_at
  )
  SELECT
    period_id_param,
    a.id,
    s.id,
    s.name,
    s.price,
    COALESCE(e.commission_percentage, 0),
    (s.price * COALESCE(e.commission_percentage, 0) / 100),
    a.appointment_date::timestamp with time zone
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  JOIN employees e ON a.employee_id = e.id
  WHERE a.employee_id = v_period.employee_id
    AND a.barbershop_id = v_period.barbershop_id
    AND a.status = 'confirmed'
    AND a.payment_status = 'paid'
    AND a.appointment_date >= v_period.period_start
    AND a.appointment_date < v_period.period_end; -- CHANGED: <= to <
  
  -- Calcular totais
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(service_price), 0),
    COALESCE(SUM(commission_amount), 0)
  INTO v_services_count, v_total_value, v_total_commission
  FROM commission_period_services
  WHERE commission_period_id = period_id_param;
  
  -- Buscar deduções aplicadas a este período
  DECLARE
    v_total_deductions NUMERIC := 0;
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
    FROM commission_deductions
    WHERE applied_to_period_id = period_id_param;
    
    -- Atualizar o período com os novos totais
    UPDATE commission_periods
    SET 
      total_services_value = v_total_value,
      total_commission_value = v_total_commission,
      total_deductions = v_total_deductions,
      net_amount = v_total_commission - v_total_deductions,
      updated_at = NOW()
    WHERE id = period_id_param;
  END;
  
  -- Retornar estatísticas
  RETURN QUERY SELECT v_services_count, v_total_value, v_total_commission;
END;
$function$;