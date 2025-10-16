-- Drop old functions that reference non-existent tables
DROP FUNCTION IF EXISTS refresh_availability_cache(uuid, date);
DROP FUNCTION IF EXISTS get_employee_availability(uuid, date);
DROP FUNCTION IF EXISTS calculate_employee_availability(uuid, date);

-- Create compute_daily_availability function
-- This function calculates the availability slots for an employee on a specific date
CREATE OR REPLACE FUNCTION compute_daily_availability(
  p_employee_id UUID,
  p_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_slots JSONB := '{}'::jsonb;
  v_current_time TIME;
  v_slot_duration INTERVAL := '10 minutes'::interval;
  v_day_of_week INT;
  v_break RECORD;
  v_appointment RECORD;
  v_exception RECORD;
BEGIN
  -- Get day of week (0 = Sunday, 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check for schedule exception first
  SELECT * INTO v_exception
  FROM schedule_exceptions
  WHERE employee_id = p_employee_id
    AND exception_date = p_date
  LIMIT 1;
  
  IF FOUND AND v_exception.is_available = false THEN
    -- Employee is not available this day (exception marked as unavailable)
    RETURN '{}'::jsonb;
  END IF;
  
  -- Get regular schedule or use exception times if available
  IF FOUND AND v_exception.is_available = true THEN
    -- Use exception times
    v_current_time := v_exception.start_time;
    WHILE v_current_time < v_exception.end_time LOOP
      v_slots := v_slots || jsonb_build_object(v_current_time::text, true);
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
  ELSE
    -- Use regular schedule
    SELECT * INTO v_schedule
    FROM employee_schedules
    WHERE employee_id = p_employee_id
      AND day_of_week = v_day_of_week
      AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- No schedule for this day
      RETURN '{}'::jsonb;
    END IF;
    
    -- Generate time slots
    v_current_time := v_schedule.start_time;
    WHILE v_current_time < v_schedule.end_time LOOP
      v_slots := v_slots || jsonb_build_object(v_current_time::text, true);
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
  END IF;
  
  -- Remove break times
  FOR v_break IN
    SELECT start_time, end_time
    FROM employee_breaks
    WHERE employee_id = p_employee_id
      AND is_active = true
      AND (
        (day_of_week = v_day_of_week AND specific_date IS NULL)
        OR specific_date = p_date
      )
  LOOP
    v_current_time := v_break.start_time;
    WHILE v_current_time < v_break.end_time LOOP
      v_slots := v_slots - v_current_time::text;
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
  END LOOP;
  
  -- Remove appointment times
  FOR v_appointment IN
    SELECT start_time, end_time
    FROM appointments
    WHERE employee_id = p_employee_id
      AND appointment_date = p_date
      AND status IN ('pending', 'confirmed', 'queue_reserved')
  LOOP
    v_current_time := v_appointment.start_time;
    WHILE v_current_time < v_appointment.end_time LOOP
      v_slots := v_slots - v_current_time::text;
      v_current_time := v_current_time + v_slot_duration;
    END LOOP;
  END LOOP;
  
  RETURN v_slots;
END;
$$;

-- Create refresh_daily_availability function
-- This function populates the employee_daily_availability table
CREATE OR REPLACE FUNCTION refresh_daily_availability(
  p_employee_id UUID,
  p_date DATE,
  p_force BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_availability JSONB;
  v_total_slots INT;
  v_first_slot TIME;
  v_last_slot TIME;
  v_slot_key TEXT;
  v_slot_value JSONB;
BEGIN
  -- Get barbershop_id
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees
  WHERE id = p_employee_id;
  
  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Employee % not found', p_employee_id;
  END IF;
  
  -- Check if already exists and not stale (unless force = true)
  IF NOT p_force AND EXISTS (
    SELECT 1 FROM employee_daily_availability
    WHERE employee_id = p_employee_id
      AND date = p_date
      AND is_stale = false
      AND computed_at > NOW() - INTERVAL '1 hour'
  ) THEN
    RETURN; -- Already computed recently
  END IF;
  
  -- Compute availability
  v_availability := compute_daily_availability(p_employee_id, p_date);
  
  -- Calculate metrics
  v_total_slots := jsonb_object_keys(v_availability)::int;
  
  IF v_total_slots > 0 THEN
    -- Find first and last available slots
    FOR v_slot_key, v_slot_value IN
      SELECT * FROM jsonb_each(v_availability)
      WHERE value::boolean = true
      ORDER BY key::time
    LOOP
      IF v_first_slot IS NULL THEN
        v_first_slot := v_slot_key::time;
      END IF;
      v_last_slot := v_slot_key::time;
    END LOOP;
  END IF;
  
  -- Insert or update
  INSERT INTO employee_daily_availability (
    employee_id,
    barbershop_id,
    date,
    availability_slots,
    total_slots_available,
    first_available_slot,
    last_available_slot,
    is_stale,
    computed_at
  ) VALUES (
    p_employee_id,
    v_barbershop_id,
    p_date,
    v_availability,
    COALESCE(v_total_slots, 0),
    v_first_slot,
    v_last_slot,
    false,
    NOW()
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    availability_slots = EXCLUDED.availability_slots,
    total_slots_available = EXCLUDED.total_slots_available,
    first_available_slot = EXCLUDED.first_available_slot,
    last_available_slot = EXCLUDED.last_available_slot,
    is_stale = false,
    computed_at = NOW(),
    updated_at = NOW();
END;
$$;