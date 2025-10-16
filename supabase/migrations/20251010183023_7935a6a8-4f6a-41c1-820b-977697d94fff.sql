-- Create secure RPC function to cancel commission periods
-- Only allows canceling periods with status 'pending_signature'
-- Validates that user is the barbershop owner
-- Deletes the period and CASCADE deletes related commission_period_services

CREATE OR REPLACE FUNCTION public.cancel_commission_period(period_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id uuid;
  v_status text;
BEGIN
  -- Get period info
  SELECT barbershop_id, status INTO v_barbershop_id, v_status
  FROM commission_periods
  WHERE id = period_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período não encontrado';
  END IF;
  
  -- Check if user is barbershop owner
  IF NOT is_barbershop_owner(v_barbershop_id) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar este período';
  END IF;
  
  -- Only allow canceling pending_signature periods
  IF v_status != 'pending_signature' THEN
    RAISE EXCEPTION 'Apenas períodos aguardando assinatura podem ser cancelados';
  END IF;
  
  -- Delete period (CASCADE will delete commission_period_services)
  DELETE FROM commission_periods WHERE id = period_id_param;
END;
$$;