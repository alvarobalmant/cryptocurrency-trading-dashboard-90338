-- Add slug field to barbershops for unique URLs
ALTER TABLE public.barbershops 
ADD COLUMN slug text UNIQUE;

-- Create function to generate slug from name
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
$$ LANGUAGE plpgsql;

-- Update existing barbershops with slugs
UPDATE public.barbershops 
SET slug = public.generate_slug(name) 
WHERE slug IS NULL;

-- Make slug required going forward
ALTER TABLE public.barbershops 
ALTER COLUMN slug SET NOT NULL;

-- Add status to employees table
ALTER TABLE public.employees 
ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive'));

-- Create employee invitations table
CREATE TABLE public.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(barbershop_id, email)
);

-- Enable RLS for employee_invitations
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_invitations
CREATE POLICY "Owners can manage invitations" 
ON public.employee_invitations 
FOR ALL 
USING (barbershop_id IN (
  SELECT id FROM barbershops WHERE owner_id = auth.uid()
))
WITH CHECK (barbershop_id IN (
  SELECT id FROM barbershops WHERE owner_id = auth.uid()
));

-- Allow invited users to view their own invitations
CREATE POLICY "Users can view invitations sent to their email" 
ON public.employee_invitations 
FOR SELECT 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Update trigger for employee_invitations
CREATE TRIGGER update_employee_invitations_updated_at
  BEFORE UPDATE ON public.employee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to accept invitation and create employee
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
$$ LANGUAGE plpgsql SECURITY DEFINER;