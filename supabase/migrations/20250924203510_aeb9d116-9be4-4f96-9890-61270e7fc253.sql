-- Update the get_employee_invitation function to use slogan instead of description
CREATE OR REPLACE FUNCTION public.get_employee_invitation(p_token text)
 RETURNS TABLE(id uuid, token text, email text, name text, phone text, barbershop_id uuid, expires_at timestamp with time zone, accepted_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, barbershop_name text, barbershop_slug text, barbershop_description text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    b.slogan AS barbershop_description
  FROM public.employee_invitations ei
  JOIN public.barbershops b ON b.id = ei.barbershop_id
  WHERE ei.token = p_token
    AND ei.expires_at > now()
    AND ei.accepted_at IS NULL
  LIMIT 1;
$function$;