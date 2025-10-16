-- Normalize owner policies to PERMISSIVE and allow employees to read necessary data

-- 1) employees: make owner policy PERMISSIVE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='employees' AND policyname='Owners can manage employees'
  ) THEN
    DROP POLICY "Owners can manage employees" ON public.employees;
  END IF;
END $$;

CREATE POLICY "Owners can manage employees"
ON public.employees
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  barbershop_id IN (
    SELECT b.id FROM public.barbershops b WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  barbershop_id IN (
    SELECT b.id FROM public.barbershops b WHERE b.owner_id = auth.uid()
  )
);

-- (Employee self policies were added earlier)

-- 2) employee_services: make owner policy PERMISSIVE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='employee_services' AND policyname='Owners can manage employee services'
  ) THEN
    DROP POLICY "Owners can manage employee services" ON public.employee_services;
  END IF;
END $$;

CREATE POLICY "Owners can manage employee services"
ON public.employee_services
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.barbershops b ON e.barbershop_id = b.id
    WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.barbershops b ON e.barbershop_id = b.id
    WHERE b.owner_id = auth.uid()
  )
);

-- 3) services: make owner policy PERMISSIVE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='services' AND policyname='Owners can manage services'
  ) THEN
    DROP POLICY "Owners can manage services" ON public.services;
  END IF;
END $$;

CREATE POLICY "Owners can manage services"
ON public.services
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  barbershop_id IN (
    SELECT b.id FROM public.barbershops b WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  barbershop_id IN (
    SELECT b.id FROM public.barbershops b WHERE b.owner_id = auth.uid()
  )
);

-- 4) barbershops: make owner select policy PERMISSIVE and allow employees to select their barbershop
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='barbershops' AND policyname='Owners can view their barbershops'
  ) THEN
    DROP POLICY "Owners can view their barbershops" ON public.barbershops;
  END IF;
END $$;

CREATE POLICY "Owners can view their barbershops"
ON public.barbershops
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Employees can view the barbershop they work at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='barbershops' AND policyname='Employees can view their barbershop'
  ) THEN
    CREATE POLICY "Employees can view their barbershop"
    ON public.barbershops
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.barbershop_id = barbershops.id
          AND e.email = COALESCE(auth.jwt() ->> 'email', '')
          AND e.status = 'active'
      )
    );
  END IF;
END $$;