-- Update RLS policies to use plan limits validation functions

-- Update employees policies (drop and recreate with plan limits)
DROP POLICY IF EXISTS "Owners can manage employees" ON public.employees;

CREATE POLICY "Owners can select employees"
ON public.employees
FOR SELECT
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can update employees"  
ON public.employees
FOR UPDATE
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can delete employees"
ON public.employees  
FOR DELETE
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can insert employees within plan limits"
ON public.employees
FOR INSERT
WITH CHECK (
  is_barbershop_owner(barbershop_id) 
  AND public.can_add_employee(barbershop_id)
);

-- Update services policies (drop and recreate with plan limits)
DROP POLICY IF EXISTS "Owners can manage services" ON public.services;

CREATE POLICY "Owners can select services"
ON public.services
FOR SELECT
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can update services"
ON public.services
FOR UPDATE  
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can delete services"
ON public.services
FOR DELETE
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can insert services within plan limits"
ON public.services
FOR INSERT
WITH CHECK (
  is_barbershop_owner(barbershop_id)
  AND public.can_add_service(barbershop_id)
);

-- Update appointments INSERT policy to check monthly limits
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;

CREATE POLICY "Can create appointments within plan limits"
ON public.appointments
FOR INSERT
WITH CHECK (
  public.can_create_appointment(barbershop_id, appointment_date)
);

-- Function to get current usage stats for a barbershop (for the frontend hook)
CREATE OR REPLACE FUNCTION public.get_barbershop_usage_stats(barbershop_id_param uuid)
RETURNS TABLE(
  active_employees integer,
  active_services integer,
  current_month_appointments integer,
  plan_type text,
  max_employees integer,
  max_services integer,
  max_appointments_per_month integer,
  can_add_employee boolean,
  can_add_service boolean,
  can_create_appointment boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_of_month date := date_trunc('month', CURRENT_DATE)::date;
  end_of_month date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::integer FROM public.employees WHERE barbershop_id = barbershop_id_param AND status = 'active'),
    (SELECT COUNT(*)::integer FROM public.services WHERE barbershop_id = barbershop_id_param AND active = true),
    (SELECT COUNT(*)::integer FROM public.appointments WHERE barbershop_id = barbershop_id_param AND appointment_date >= start_of_month AND appointment_date <= end_of_month AND status != 'cancelled'),
    limits.plan_type,
    limits.max_employees,
    limits.max_services,
    limits.max_appointments_per_month,
    public.can_add_employee(barbershop_id_param),
    public.can_add_service(barbershop_id_param),
    public.can_create_appointment(barbershop_id_param)
  FROM public.get_barbershop_plan_limits(barbershop_id_param) limits;
END;
$$;