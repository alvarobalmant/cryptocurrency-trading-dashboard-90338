-- Fix the security breach: Add plan limits to invitations and acceptance function

-- 1. Fix employee_invitations table policies to check plan limits
DROP POLICY IF EXISTS "Owners can manage invitations" ON public.employee_invitations;

-- Create separate policies for employee_invitations with plan limit checks
CREATE POLICY "Owners can select invitations"
ON public.employee_invitations
FOR SELECT
USING (barbershop_id IN (SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()));

CREATE POLICY "Owners can update invitations"
ON public.employee_invitations
FOR UPDATE
USING (barbershop_id IN (SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()));

CREATE POLICY "Owners can delete invitations"
ON public.employee_invitations
FOR DELETE
USING (barbershop_id IN (SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid()));

-- CRITICAL: Only allow creating invitations within plan limits
CREATE POLICY "Owners can create invitations within plan limits"
ON public.employee_invitations
FOR INSERT
WITH CHECK (
  barbershop_id IN (SELECT b.id FROM barbershops b WHERE b.owner_id = auth.uid())
  AND public.can_add_employee(barbershop_id)
);

-- 2. Fix the accept_employee_invitation function to check limits before creating employees
CREATE OR REPLACE FUNCTION public.accept_employee_invitation(invitation_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record employee_invitations%ROWTYPE;
  new_employee_id uuid;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record 
  FROM employee_invitations 
  WHERE token = invitation_token 
    AND expires_at > now() 
    AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- CRITICAL: Check if barbershop can still add employees
  IF NOT public.can_add_employee(invitation_record.barbershop_id) THEN
    RAISE EXCEPTION 'Cannot accept invitation: barbershop has reached the employee limit for their plan';
  END IF;
  
  -- Create the employee if it doesn't exist
  IF invitation_record.employee_id IS NULL THEN
    INSERT INTO employees (barbershop_id, name, email, phone, status)
    VALUES (
      invitation_record.barbershop_id,
      invitation_record.name,
      invitation_record.email,
      invitation_record.phone,
      'active'
    )
    RETURNING id INTO new_employee_id;
    
    -- Update invitation with employee_id
    UPDATE employee_invitations 
    SET employee_id = new_employee_id
    WHERE id = invitation_record.id;
  ELSE
    new_employee_id := invitation_record.employee_id;
    
    -- Activate the employee (only if within limits)
    UPDATE employees 
    SET status = 'active'
    WHERE id = new_employee_id;
  END IF;
  
  -- Mark invitation as accepted
  UPDATE employee_invitations 
  SET accepted_at = now()
  WHERE id = invitation_record.id;
  
  RETURN new_employee_id;
END;
$$;