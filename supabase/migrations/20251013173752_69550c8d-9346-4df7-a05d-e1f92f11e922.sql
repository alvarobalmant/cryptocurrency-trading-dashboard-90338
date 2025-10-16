-- Create function to get visitors (clients without client_profile_id) grouped by normalized phone
CREATE OR REPLACE FUNCTION get_visitors_by_barbershop(
  p_barbershop_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  visitor_phone TEXT,
  visitor_name TEXT,
  variant_names TEXT[],
  variant_phones TEXT[],
  total_appointments BIGINT,
  confirmed_appointments BIGINT,
  pending_appointments BIGINT,
  cancelled_appointments BIGINT,
  no_show_appointments BIGINT,
  first_appointment_date DATE,
  last_appointment_date DATE,
  days_since_last_visit INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH normalized_visitors AS (
    SELECT 
      -- Normalize phone: remove everything except digits, remove +55 prefix
      REGEXP_REPLACE(REGEXP_REPLACE(a.client_phone, '[^0-9]', '', 'g'), '^55', '') AS normalized_phone,
      a.client_phone AS original_phone,
      a.client_name,
      a.status,
      a.appointment_date,
      a.created_at
    FROM appointments a
    WHERE a.barbershop_id = p_barbershop_id
      AND a.client_profile_id IS NULL  -- Only visitors (not registered)
      AND a.client_phone IS NOT NULL
      AND a.client_phone != ''
  ),
  visitor_aggregates AS (
    SELECT
      nv.normalized_phone,
      -- Get most recent name
      (ARRAY_AGG(nv.client_name ORDER BY nv.created_at DESC))[1] AS latest_name,
      -- Collect ALL unique names used
      ARRAY_AGG(DISTINCT nv.client_name ORDER BY nv.client_name) AS all_names,
      -- Collect ALL phone variations
      ARRAY_AGG(DISTINCT nv.original_phone ORDER BY nv.original_phone) AS all_phones,
      -- Counters by status
      COUNT(*) AS total_appts,
      COUNT(*) FILTER (WHERE nv.status = 'confirmed') AS confirmed_appts,
      COUNT(*) FILTER (WHERE nv.status = 'pending') AS pending_appts,
      COUNT(*) FILTER (WHERE nv.status = 'cancelled') AS cancelled_appts,
      COUNT(*) FILTER (WHERE nv.status = 'no_show') AS no_show_appts,
      -- Dates
      MIN(nv.appointment_date) AS first_appt_date,
      MAX(nv.appointment_date) AS last_appt_date
    FROM normalized_visitors nv
    GROUP BY nv.normalized_phone
  )
  SELECT
    va.normalized_phone,
    va.latest_name,
    -- Return only if there are variations (length > 1)
    CASE 
      WHEN ARRAY_LENGTH(va.all_names, 1) > 1 THEN va.all_names
      ELSE ARRAY[]::TEXT[]
    END AS variant_names,
    CASE
      WHEN ARRAY_LENGTH(va.all_phones, 1) > 1 THEN va.all_phones
      ELSE ARRAY[]::TEXT[]
    END AS variant_phones,
    va.total_appts,
    va.confirmed_appts,
    va.pending_appts,
    va.cancelled_appts,
    va.no_show_appts,
    va.first_appt_date,
    va.last_appt_date,
    CURRENT_DATE - va.last_appt_date AS days_since_last_visit
  FROM visitor_aggregates va
  ORDER BY va.confirmed_appts DESC, va.total_appts DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_visitors_by_barbershop TO authenticated;