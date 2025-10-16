-- Create plan limits validation functions and update RLS policies for secure backend validation

-- First, create a function to get barbershop plan limits
CREATE OR REPLACE FUNCTION public.get_barbershop_plan_limits(barbershop_id_param uuid)
RETURNS TABLE(
  max_employees integer,
  max_services integer,
  max_appointments_per_month integer,
  plan_type text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE b.plan_type
      WHEN 'free' THEN 3
      WHEN 'basic' THEN 3  
      WHEN 'pro' THEN 10
      WHEN 'premium' THEN -1  -- unlimited
      ELSE 1  -- fallback for unknown plans
    END as max_employees,
    CASE b.plan_type
      WHEN 'free' THEN 2
      WHEN 'basic' THEN 5
      WHEN 'pro' THEN 20
      WHEN 'premium' THEN -1  -- unlimited
      ELSE 1  -- fallback
    END as max_services,
    CASE b.plan_type
      WHEN 'free' THEN 10
      WHEN 'basic' THEN 100
      WHEN 'pro' THEN 500
      WHEN 'premium' THEN -1  -- unlimited
      ELSE 5  -- fallback
    END as max_appointments_per_month,
    b.plan_type
  FROM public.barbershops b
  WHERE b.id = barbershop_id_param;
$$;

-- Function to check if barbershop can add more employees
CREATE OR REPLACE FUNCTION public.can_add_employee(barbershop_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_allowed integer;
BEGIN
  -- Get current active employee count
  SELECT COUNT(*) INTO current_count
  FROM public.employees
  WHERE barbershop_id = barbershop_id_param AND status = 'active';
  
  -- Get max allowed employees for this plan
  SELECT max_employees INTO max_allowed
  FROM public.get_barbershop_plan_limits(barbershop_id_param);
  
  -- If unlimited (-1) or under limit
  RETURN max_allowed = -1 OR current_count < max_allowed;
END;
$$;

-- Function to check if barbershop can add more services
CREATE OR REPLACE FUNCTION public.can_add_service(barbershop_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_allowed integer;
BEGIN
  -- Get current active service count
  SELECT COUNT(*) INTO current_count
  FROM public.services
  WHERE barbershop_id = barbershop_id_param AND active = true;
  
  -- Get max allowed services for this plan
  SELECT max_services INTO max_allowed
  FROM public.get_barbershop_plan_limits(barbershop_id_param);
  
  -- If unlimited (-1) or under limit
  RETURN max_allowed = -1 OR current_count < max_allowed;
END;
$$;

-- Function to check monthly appointment limit
CREATE OR REPLACE FUNCTION public.can_create_appointment(barbershop_id_param uuid, appointment_date_param date DEFAULT CURRENT_DATE)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month_count integer;
  max_allowed integer;
  start_of_month date;
  end_of_month date;
BEGIN
  -- Calculate month boundaries
  start_of_month := date_trunc('month', appointment_date_param)::date;
  end_of_month := (date_trunc('month', appointment_date_param) + interval '1 month - 1 day')::date;
  
  -- Get current month's appointment count
  SELECT COUNT(*) INTO current_month_count
  FROM public.appointments
  WHERE barbershop_id = barbershop_id_param 
    AND appointment_date >= start_of_month 
    AND appointment_date <= end_of_month
    AND status != 'cancelled';
  
  -- Get max allowed appointments per month for this plan
  SELECT max_appointments_per_month INTO max_allowed
  FROM public.get_barbershop_plan_limits(barbershop_id_param);
  
  -- If unlimited (-1) or under limit
  RETURN max_allowed = -1 OR current_month_count < max_allowed;
END;
$$;