-- Fix RLS policies to actually enforce plan limits

-- Ensure RLS is enabled
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Owners can select employees" ON public.employees;
DROP POLICY IF EXISTS "Owners can update employees" ON public.employees;
DROP POLICY IF EXISTS "Owners can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Owners can insert employees within plan limits" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own data" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Public can view active employees for booking" ON public.employees;
DROP POLICY IF EXISTS "Owners can select their employees" ON public.employees;
DROP POLICY IF EXISTS "Owners can update their employees" ON public.employees;
DROP POLICY IF EXISTS "Owners can delete their employees" ON public.employees;

-- Create new policies with plan limits enforcement
CREATE POLICY "Owners can select their employees"
ON public.employees
FOR SELECT
USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can update their employees"  
ON public.employees
FOR UPDATE
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Owners can delete their employees"
ON public.employees  
FOR DELETE
USING (is_barbershop_owner(barbershop_id));

-- CRITICAL: This policy should prevent inserting beyond limits
CREATE POLICY "Owners can insert employees within plan limits"
ON public.employees
FOR INSERT
WITH CHECK (
  is_barbershop_owner(barbershop_id) 
  AND public.can_add_employee(barbershop_id)
);

-- Employee policies (for when employees access their own data)
CREATE POLICY "Employees can view their own data"
ON public.employees
FOR SELECT
USING (email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active');

CREATE POLICY "Employees can update their own data"
ON public.employees
FOR UPDATE
USING (email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active')
WITH CHECK (email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active');

-- Public access for booking (read-only)
CREATE POLICY "Public can view active employees for booking"
ON public.employees
FOR SELECT
USING (status = 'active');