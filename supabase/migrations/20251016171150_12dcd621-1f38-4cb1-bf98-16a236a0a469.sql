-- Remove triggers that interfere with core system
DROP TRIGGER IF EXISTS appointments_refresh_availability ON public.appointments;
DROP TRIGGER IF EXISTS schedule_exceptions_refresh_availability ON public.schedule_exceptions;
DROP TRIGGER IF EXISTS employee_breaks_refresh_availability ON public.employee_breaks;
DROP TRIGGER IF EXISTS employee_schedules_refresh_availability ON public.employee_schedules;

-- Remove trigger functions
DROP FUNCTION IF EXISTS public.trigger_refresh_availability_on_appointment();
DROP FUNCTION IF EXISTS public.trigger_refresh_availability_on_exception();
DROP FUNCTION IF EXISTS public.trigger_refresh_availability_on_break();
DROP FUNCTION IF EXISTS public.trigger_refresh_availability_on_schedule();

-- Keep cache table and functions for optional read-only use
-- (employee_availability_cache, calculate_employee_availability, refresh_availability_cache, get_employee_availability remain)
-- Updates will only happen via explicit RPC calls or Edge Functions, not automatically