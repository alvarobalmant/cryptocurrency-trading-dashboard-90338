-- ========================================
-- MIGRATION: Phone Normalization & CLV Functions
-- ========================================

-- Function to normalize phone numbers (remove special characters)
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;
  -- Remove all non-numeric characters
  RETURN REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g');
END;
$$;

COMMENT ON FUNCTION normalize_phone IS 'Normalizes phone numbers by removing all non-numeric characters';

-- View for normalized payments with customer classification
CREATE OR REPLACE VIEW public.payments_clean AS
SELECT
  p.id AS payment_id,
  p.barbershop_id,
  normalize_phone(p.client_phone) AS normalized_phone,
  p.client_phone AS original_phone,
  p.client_name,
  p.amount,
  COALESCE(p.net_received_amount, p.amount) AS net_amount,
  p.status,
  p.payment_method,
  p.payment_type,
  p.created_at,
  p.paid_at,
  
  -- Customer type classification
  CASE
    WHEN cp.user_id IS NOT NULL AND cp.phone_verified = true THEN 'registered'
    WHEN p.payment_type = 'walk_in' AND cp.user_id IS NULL THEN 'walk_in_visitor'
    ELSE 'visitor'
  END AS customer_type,
  
  cp.id AS client_profile_id,
  cp.user_id,
  cp.name AS registered_name
  
FROM payments p
LEFT JOIN client_profiles cp 
  ON normalize_phone(p.client_phone) = normalize_phone(cp.phone)
  AND p.barbershop_id = cp.barbershop_id
  AND cp.phone_verified = true
WHERE p.status = 'paid'
  AND p.amount > 0;

COMMENT ON VIEW payments_clean IS 'Normalized payments with registered/visitor classification';

-- Function to calculate real CLV for a client
CREATE OR REPLACE FUNCTION public.calculate_client_clv(
  p_barbershop_id UUID,
  p_client_profile_id UUID
)
RETURNS TABLE (
  clv NUMERIC,
  total_payments INTEGER,
  avg_ticket NUMERIC,
  first_payment_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  customer_type TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(pc.net_amount), 0)::NUMERIC AS clv,
    COUNT(*)::INTEGER AS total_payments,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND(SUM(pc.net_amount) / COUNT(*), 2)
      ELSE 0
    END::NUMERIC AS avg_ticket,
    MIN(pc.created_at) AS first_payment_date,
    MAX(pc.created_at) AS last_payment_date,
    MAX(pc.customer_type) AS customer_type
  FROM payments_clean pc
  WHERE pc.barbershop_id = p_barbershop_id
    AND pc.client_profile_id = p_client_profile_id
    AND pc.customer_type = 'registered';
END;
$$;

COMMENT ON FUNCTION calculate_client_clv IS 'Calculates real CLV based on paid amounts only';

-- Backfill client_profile_id in appointments using normalized phones
UPDATE appointments a
SET 
  client_profile_id = cp.id,
  updated_at = NOW()
FROM client_profiles cp
WHERE a.client_profile_id IS NULL
  AND a.barbershop_id = cp.barbershop_id
  AND normalize_phone(a.client_phone) = normalize_phone(cp.phone)
  AND cp.phone_verified = true;