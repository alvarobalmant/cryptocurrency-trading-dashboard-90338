-- Fix function search path for generate_slug
CREATE OR REPLACE FUNCTION public.generate_slug(name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  base_slug := lower(regexp_replace(trim(name), '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  final_slug := base_slug;
  
  -- Check if slug exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM barbershops WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix function search path for accept_employee_invitation
CREATE OR REPLACE FUNCTION public.accept_employee_invitation(invitation_token text)
RETURNS uuid AS $$
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
    
    -- Activate the employee
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;