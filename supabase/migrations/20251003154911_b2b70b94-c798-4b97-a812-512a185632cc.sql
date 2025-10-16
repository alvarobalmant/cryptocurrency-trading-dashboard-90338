-- Remove plan limit restriction from service insertion
DROP POLICY IF EXISTS "Owners can insert services within plan limits" ON public.services;

-- Create new policy without plan limits
CREATE POLICY "Owners can insert services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (is_barbershop_owner(barbershop_id));

-- Ensure update policy has both USING and WITH CHECK
DROP POLICY IF EXISTS "Owners can update services" ON public.services;

CREATE POLICY "Owners can update services"
ON public.services
FOR UPDATE
TO authenticated
USING (is_barbershop_owner(barbershop_id))
WITH CHECK (is_barbershop_owner(barbershop_id));