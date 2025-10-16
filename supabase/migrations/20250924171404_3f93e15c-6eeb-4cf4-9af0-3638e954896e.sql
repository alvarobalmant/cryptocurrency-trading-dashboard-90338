-- Fix RLS policies and add a secure RPC to fetch invitations by token

-- 1) Recreate policies on employee_invitations to avoid referencing auth.users
-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employee_invitations' 
      AND policyname = 'Users can view invitations sent to their email'
  ) THEN
    DROP POLICY "Users can view invitations sent to their email" ON public.employee_invitations;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employee_invitations' 
      AND policyname = 'Owners can manage invitations'
  ) THEN
    DROP POLICY "Owners can manage invitations" ON public.employee_invitations;
  END IF;
END $$;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Owners can manage invitations"
ON public.employee_invitations
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

-- Allow any authenticated user to SELECT their own invitations based on JWT email (no auth.users reference)
CREATE POLICY "Users can view invitations sent to their email"
ON public.employee_invitations
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  -- Compare row email with JWT email claim safely
  email = COALESCE(auth.jwt() ->> 'email', '')
);

-- 2) Create a SECURITY DEFINER RPC to fetch an invitation by token for unauthenticated flows
CREATE OR REPLACE FUNCTION public.get_employee_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  token text,
  email text,
  name text,
  phone text,
  barbershop_id uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  barbershop_name text,
  barbershop_slug text,
  barbershop_description text
) AS $$
  SELECT 
    ei.id,
    ei.token,
    ei.email,
    ei.name,
    ei.phone,
    ei.barbershop_id,
    ei.expires_at,
    ei.accepted_at,
    ei.created_at,
    ei.updated_at,
    b.name AS barbershop_name,
    b.slug AS barbershop_slug,
    b.description AS barbershop_description
  FROM public.employee_invitations ei
  JOIN public.barbershops b ON b.id = ei.barbershop_id
  WHERE ei.token = p_token
    AND ei.expires_at > now()
    AND ei.accepted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_employee_invitation(text) TO anon, authenticated;
