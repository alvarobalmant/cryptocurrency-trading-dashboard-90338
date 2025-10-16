-- Fix compute_daily_availability to use schedule_exceptions.available_slots
CREATE OR REPLACE FUNCTION public.compute_daily_availability(
  p_employee_id UUID,
  p_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INT;
  v_slots JSONB := '{}'::jsonb;
  v_slot_duration INTERVAL := INTERVAL '10 minutes';
  v_current_time TIME;
  v_end_time TIME;
  v_schedule RECORD;
  v_break RECORD;
  v_appointment RECORD;
  v_exc_available_slots JSONB;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- Check for exception for the day
  SELECT available_slots INTO v_exc_available_slots
  FROM schedule_exceptions
  WHERE employee_id = p_employee_id AND exception_date = p_date
  LIMIT 1;

  IF v_exc_available_slots IS NOT NULL THEN
    -- Exception present: available_slots is authoritative
    IF jsonb_typeof(v_exc_available_slots) = 'array' AND jsonb_array_length(v_exc_available_slots) > 0 THEN
      -- Build availability from listed ranges
      FOR v_current_time, v_end_time IN
        SELECT (elem->>'start')::time, (elem->>'end')::time
        FROM jsonb_array_elements(v_exc_available_slots) AS elem
      LOOP
        IF v_current_time IS NOT NULL AND v_end_time IS NOT NULL THEN
          WHILE v_current_time < v_end_time LOOP
            v_slots := v_slots || jsonb_build_object(to_char(v_current_time, 'HH24:MI'), true);
            v_current_time := (v_current_time + v_slot_duration)::time;
          END LOOP;
        END IF;
      END LOOP;
    ELSE
      -- Exception exists but no available slots listed => no availability
      RETURN '{}'::jsonb;
    END IF;
  ELSE
    -- No exception: use regular schedule
    SELECT start_time, end_time INTO v_current_time, v_end_time
    FROM employee_schedules
    WHERE employee_id = p_employee_id AND day_of_week = v_day_of_week AND is_active = true
    ORDER BY start_time ASC
    LIMIT 1;

    IF v_current_time IS NULL OR v_end_time IS NULL THEN
      RETURN '{}'::jsonb; -- No schedule for this day
    END IF;

    WHILE v_current_time < v_end_time LOOP
      v_slots := v_slots || jsonb_build_object(to_char(v_current_time, 'HH24:MI'), true);
      v_current_time := (v_current_time + v_slot_duration)::time;
    END LOOP;
  END IF;

  -- Subtract breaks
  FOR v_break IN
    SELECT start_time, end_time
    FROM employee_breaks
    WHERE employee_id = p_employee_id
      AND is_active = true
      AND ((day_of_week = v_day_of_week AND specific_date IS NULL) OR specific_date = p_date)
  LOOP
    v_current_time := v_break.start_time;
    v_end_time := v_break.end_time;
    IF v_current_time IS NOT NULL AND v_end_time IS NOT NULL THEN
      WHILE v_current_time < v_end_time LOOP
        v_slots := v_slots - to_char(v_current_time, 'HH24:MI');
        v_current_time := (v_current_time + v_slot_duration)::time;
      END LOOP;
    END IF;
  END LOOP;

  -- Subtract appointments
  FOR v_appointment IN
    SELECT start_time, end_time
    FROM appointments
    WHERE employee_id = p_employee_id
      AND appointment_date = p_date
      AND status IN ('pending', 'confirmed', 'queue_reserved')
  LOOP
    v_current_time := v_appointment.start_time;
    v_end_time := v_appointment.end_time;
    IF v_current_time IS NOT NULL AND v_end_time IS NOT NULL THEN
      WHILE v_current_time < v_end_time LOOP
        v_slots := v_slots - to_char(v_current_time, 'HH24:MI');
        v_current_time := (v_current_time + v_slot_duration)::time;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_slots;
END;
$$;

-- Fix refresh_daily_availability metrics calculation and first/last slot detection
CREATE OR REPLACE FUNCTION public.refresh_daily_availability(
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
  v_total_slots INT := 0;
  v_first_slot TIME;
  v_last_slot TIME;
BEGIN
  SELECT barbershop_id INTO v_barbershop_id FROM employees WHERE id = p_employee_id;
  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Employee % not found', p_employee_id;
  END IF;

  IF NOT p_force AND EXISTS (
    SELECT 1 FROM employee_daily_availability
    WHERE employee_id = p_employee_id AND date = p_date AND is_stale = false
      AND computed_at > NOW() - INTERVAL '1 hour'
  ) THEN
    RETURN;
  END IF;

  v_availability := compute_daily_availability(p_employee_id, p_date);

  -- Count keys
  SELECT COUNT(*) INTO v_total_slots FROM jsonb_each(v_availability);

  -- First/last available times
  SELECT MIN(key::time), MAX(key::time)
  INTO v_first_slot, v_last_slot
  FROM jsonb_each(v_availability)
  WHERE (value)::text = 'true';

  INSERT INTO employee_daily_availability (
    employee_id, barbershop_id, date, availability_slots,
    total_slots_available, first_available_slot, last_available_slot,
    is_stale, computed_at
  ) VALUES (
    p_employee_id, v_barbershop_id, p_date, v_availability,
    COALESCE(v_total_slots, 0), v_first_slot, v_last_slot,
    false, NOW()
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