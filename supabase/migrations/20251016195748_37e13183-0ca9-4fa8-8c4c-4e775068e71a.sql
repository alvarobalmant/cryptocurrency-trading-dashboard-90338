-- Drop and recreate refresh_daily_availability function with correct logic
DROP FUNCTION IF EXISTS refresh_daily_availability(uuid, date, boolean);

CREATE OR REPLACE FUNCTION refresh_daily_availability(
  p_employee_id UUID,
  p_date DATE,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_slots JSONB;
  v_total_slots INTEGER := 0;
  v_first_slot TIME;
  v_last_slot TIME;
  v_slot_key TEXT;
  v_slot_value BOOLEAN;
BEGIN
  -- Get barbershop_id for the employee
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees
  WHERE id = p_employee_id;
  
  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Employee % not found', p_employee_id;
  END IF;
  
  -- Check if we need to recalculate
  IF NOT p_force THEN
    -- If record exists and is not stale, skip calculation
    IF EXISTS (
      SELECT 1 FROM employee_daily_availability
      WHERE employee_id = p_employee_id
        AND date = p_date
        AND is_stale = FALSE
    ) THEN
      RETURN;
    END IF;
  END IF;
  
  -- Calculate availability using compute_daily_availability
  v_slots := compute_daily_availability(p_employee_id, p_date);
  
  -- Calculate metadata from slots
  IF v_slots IS NOT NULL THEN
    FOR v_slot_key, v_slot_value IN SELECT * FROM jsonb_each_text(v_slots)
    LOOP
      IF v_slot_value::BOOLEAN = TRUE THEN
        v_total_slots := v_total_slots + 1;
        
        -- Track first and last available slots
        IF v_first_slot IS NULL THEN
          v_first_slot := v_slot_key::TIME;
        END IF;
        v_last_slot := v_slot_key::TIME;
      END IF;
    END LOOP;
  END IF;
  
  -- Upsert into employee_daily_availability
  INSERT INTO employee_daily_availability (
    employee_id,
    barbershop_id,
    date,
    availability_slots,
    total_slots_available,
    first_available_slot,
    last_available_slot,
    is_stale,
    computed_at,
    updated_at
  ) VALUES (
    p_employee_id,
    v_barbershop_id,
    p_date,
    COALESCE(v_slots, '{}'::JSONB),
    v_total_slots,
    v_first_slot,
    v_last_slot,
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    availability_slots = EXCLUDED.availability_slots,
    total_slots_available = EXCLUDED.total_slots_available,
    first_available_slot = EXCLUDED.first_available_slot,
    last_available_slot = EXCLUDED.last_available_slot,
    is_stale = FALSE,
    computed_at = NOW(),
    updated_at = NOW();
END;
$$;