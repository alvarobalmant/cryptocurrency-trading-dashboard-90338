-- Fix infinite recursion in RLS policies by using security definer functions

-- 1) Create security definer function to check if user is barbershop owner
CREATE OR REPLACE FUNCTION public.is_barbershop_owner(barbershop_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbershops b 
    WHERE b.id = barbershop_id AND b.owner_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2) Create security definer function to check if user is active employee
CREATE OR REPLACE FUNCTION public.is_active_employee_of_barbershop(barbershop_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.barbershop_id = barbershop_id 
      AND e.email = COALESCE(auth.jwt() ->> 'email', '')
      AND e.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3) Create security definer function to get employee id by email
CREATE OR REPLACE FUNCTION public.get_employee_id_by_email()
RETURNS uuid AS $$
  SELECT e.id FROM public.employees e 
  WHERE e.email = COALESCE(auth.jwt() ->> 'email', '')
    AND e.status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 4) Drop problematic policies
DO $$
BEGIN
  -- Drop barbershop policies that cause recursion
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'barbershops' 
      AND policyname = 'Employees can view their barbershop'
  ) THEN
    DROP POLICY "Employees can view their barbershop" ON public.barbershops;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'barbershops' 
      AND policyname = 'Owners can view their barbershops'
  ) THEN
    DROP POLICY "Owners can view their barbershops" ON public.barbershops;
  END IF;
END $$;

-- 5) Recreate barbershop policies without recursion
CREATE POLICY "Owners can view their barbershops"
ON public.barbershops
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Employees can view their barbershop"
ON public.barbershops
FOR SELECT
TO authenticated
USING (public.is_active_employee_of_barbershop(id));

-- 6) Simplify employee policies using security definer functions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'employees' 
      AND policyname = 'Employees can view their own data'
  ) THEN
    DROP POLICY "Employees can view their own data" ON public.employees;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'employees' 
      AND policyname = 'Employees can update their own data'
  ) THEN
    DROP POLICY "Employees can update their own data" ON public.employees;
  END IF;
END $$;

CREATE POLICY "Employees can view their own data"
ON public.employees
FOR SELECT
TO authenticated
USING (email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active');

CREATE POLICY "Employees can update their own data"
ON public.employees
FOR UPDATE
TO authenticated
USING (email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active')
WITH CHECK (email = COALESCE(auth.jwt() ->> 'email', '') AND status = 'active');

-- 7) Fix employee_services policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'employee_services' 
      AND policyname = 'Employees can view their own services'
  ) THEN
    DROP POLICY "Employees can view their own services" ON public.employee_services;
  END IF;
END $$;

CREATE POLICY "Employees can view their own services"
ON public.employee_services
FOR SELECT
TO authenticated
USING (employee_id = public.get_employee_id_by_email());

-- Allow employees to manage their own services
CREATE POLICY "Employees can manage their own services"
ON public.employee_services
FOR ALL
TO authenticated
USING (employee_id = public.get_employee_id_by_email())
WITH CHECK (employee_id = public.get_employee_id_by_email());

-- 8) Fix services policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'services' 
      AND policyname = 'Employees can view barbershop services'
  ) THEN
    DROP POLICY "Employees can view barbershop services" ON public.services;
  END IF;
END $$;

CREATE POLICY "Employees can view barbershop services"
ON public.services
FOR SELECT
TO authenticated
USING (public.is_active_employee_of_barbershop(barbershop_id));