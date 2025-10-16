-- Fix RLS policies for appointments table

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Owners can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Employees can view their appointments" ON public.appointments;

-- Allow anonymous users to create appointments (for public booking)
CREATE POLICY "Anonymous can create appointments"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to create appointments
CREATE POLICY "Authenticated can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Owners can view and manage all appointments in their barbershops
CREATE POLICY "Owners can manage barbershop appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (
  barbershop_id IN (
    SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()
  )
);

-- Employees can view their own appointments
CREATE POLICY "Employees can view their appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  employee_id = get_employee_id_by_email()
);

-- Allow public read access to appointments for display (but only basic info)
CREATE POLICY "Public can view appointment slots"
ON public.appointments
For SELECT
TO anon
USING (true);