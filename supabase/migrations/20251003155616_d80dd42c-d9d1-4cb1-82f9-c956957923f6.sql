-- Remove service plan limits completely from database functions

-- Update can_add_service to always return true
CREATE OR REPLACE FUNCTION public.can_add_service(barbershop_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Always return true - no limits on services
  RETURN true;
END;
$function$;

-- Update get_barbershop_usage_stats to always show can_add_service as true
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
SET search_path = 'public'
AS $function$
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
    true, -- Always true for can_add_service
    public.can_create_appointment(barbershop_id_param)
  FROM public.get_barbershop_plan_limits(barbershop_id_param) limits;
END;
$function$;