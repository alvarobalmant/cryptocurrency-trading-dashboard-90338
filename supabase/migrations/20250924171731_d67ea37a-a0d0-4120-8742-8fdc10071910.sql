-- Add RLS policy for employees to access their own data
-- First check if we need to allow employees to read their own data

-- Drop existing policies if needed to update them
DO $$
BEGIN
  -- Allow employees to view their own data based on email match
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employees' 
      AND policyname = 'Employees can view their own data'
  ) THEN
    CREATE POLICY "Employees can view their own data"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (email = COALESCE(auth.jwt() ->> 'email', ''));
  END IF;

  -- Allow employees to update their own profile data
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employees' 
      AND policyname = 'Employees can update their own data'
  ) THEN
    CREATE POLICY "Employees can update their own data"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (email = COALESCE(auth.jwt() ->> 'email', ''))
    WITH CHECK (email = COALESCE(auth.jwt() ->> 'email', ''));
  END IF;
END $$;

-- Add RLS policies for employee_services to allow employees to see their assigned services
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employee_services' 
      AND policyname = 'Employees can view their own services'
  ) THEN
    CREATE POLICY "Employees can view their own services"
    ON public.employee_services
    FOR SELECT
    TO authenticated
    USING (
      employee_id IN (
        SELECT e.id FROM public.employees e 
        WHERE e.email = COALESCE(auth.jwt() ->> 'email', '')
      )
    );
  END IF;
END $$;

-- Allow employees to view services from their barbershop
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'services' 
      AND policyname = 'Employees can view barbershop services'
  ) THEN
    CREATE POLICY "Employees can view barbershop services"
    ON public.services
    FOR SELECT
    TO authenticated
    USING (
      barbershop_id IN (
        SELECT e.barbershop_id FROM public.employees e 
        WHERE e.email = COALESCE(auth.jwt() ->> 'email', '')
      )
    );
  END IF;
END $$;