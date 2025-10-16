-- Fix refresh_daily_availability function to use correct column names
CREATE OR REPLACE FUNCTION public.refresh_daily_availability(
  p_employee_id UUID,
  p_date DATE,
  p_force BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_slots JSONB;
  v_exists BOOLEAN;
BEGIN
  -- Get barbershop_id
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees
  WHERE id = p_employee_id;
  
  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  -- Check if record exists
  SELECT EXISTS (
    SELECT 1 FROM employee_daily_availability
    WHERE employee_id = p_employee_id AND date = p_date
  ) INTO v_exists;
  
  -- If exists and not forcing, skip
  IF v_exists AND NOT p_force THEN
    RETURN;
  END IF;
  
  -- Calculate availability using the new logic
  SELECT jsonb_object_agg(time_slot, is_available)
  INTO v_slots
  FROM (
    WITH RECURSIVE time_slots AS (
      -- Generate all possible 10-minute slots from 06:00 to 23:50
      SELECT '06:00'::TIME AS slot_time
      UNION ALL
      SELECT (slot_time + INTERVAL '10 minutes')::TIME
      FROM time_slots
      WHERE slot_time < '23:50'::TIME
    ),
    employee_schedule AS (
      SELECT 
        es.start_time,
        es.end_time,
        es.day_of_week
      FROM employee_schedules es
      WHERE es.employee_id = p_employee_id
        AND es.is_active = true
        AND es.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
    ),
    schedule_exception AS (
      SELECT 
        se.exception_type,
        se.start_time,
        se.end_time,
        se.is_available
      FROM schedule_exceptions se
      WHERE se.employee_id = p_employee_id
        AND se.exception_date = p_date
    ),
    employee_break AS (
      SELECT 
        eb.start_time,
        eb.end_time
      FROM employee_breaks eb
      WHERE eb.employee_id = p_employee_id
        AND eb.is_active = true
        AND (
          (eb.break_type = 'recurring' AND eb.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER)
          OR (eb.break_type = 'specific' AND eb.specific_date = p_date)
        )
    ),
    booked_slots AS (
      SELECT 
        a.start_time,
        a.end_time
      FROM appointments a
      WHERE a.employee_id = p_employee_id
        AND a.appointment_date = p_date
        AND a.status NOT IN ('cancelled', 'no_show')
    )
    SELECT 
      ts.slot_time::TEXT AS time_slot,
      CASE
        -- 1. Check if there's a schedule exception for this date
        WHEN EXISTS (SELECT 1 FROM schedule_exception se WHERE se.exception_type = 'day_off') THEN false
        WHEN EXISTS (
          SELECT 1 FROM schedule_exception se 
          WHERE se.exception_type = 'custom_hours' 
            AND ts.slot_time >= se.start_time 
            AND ts.slot_time < se.end_time
            AND se.is_available = true
        ) THEN true
        WHEN EXISTS (
          SELECT 1 FROM schedule_exception se 
          WHERE se.exception_type = 'custom_hours'
            AND (ts.slot_time < se.start_time OR ts.slot_time >= se.end_time)
        ) THEN false
        
        -- 2. Check regular schedule
        WHEN NOT EXISTS (
          SELECT 1 FROM employee_schedule es
          WHERE ts.slot_time >= es.start_time AND ts.slot_time < es.end_time
        ) THEN false
        
        -- 3. Check breaks
        WHEN EXISTS (
          SELECT 1 FROM employee_break eb
          WHERE ts.slot_time >= eb.start_time AND ts.slot_time < eb.end_time
        ) THEN false
        
        -- 4. Check appointments
        WHEN EXISTS (
          SELECT 1 FROM booked_slots bs
          WHERE ts.slot_time >= bs.start_time AND ts.slot_time < bs.end_time
        ) THEN false
        
        -- 5. Available
        ELSE true
      END AS is_available
    FROM time_slots ts
  ) availability_data;
  
  -- Insert or update the cache
  INSERT INTO employee_daily_availability (
    employee_id,
    barbershop_id,
    date,
    availability_slots,
    total_slots_available,
    first_available_slot,
    last_available_slot,
    computed_at,
    is_stale
  )
  SELECT
    p_employee_id,
    v_barbershop_id,
    p_date,
    v_slots,
    (SELECT COUNT(*) FROM jsonb_each(v_slots) WHERE value::TEXT::BOOLEAN = true),
    (SELECT MIN(key::TIME) FROM jsonb_each(v_slots) WHERE value::TEXT::BOOLEAN = true),
    (SELECT MAX(key::TIME) FROM jsonb_each(v_slots) WHERE value::TEXT::BOOLEAN = true),
    NOW(),
    false
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    availability_slots = EXCLUDED.availability_slots,
    total_slots_available = EXCLUDED.total_slots_available,
    first_available_slot = EXCLUDED.first_available_slot,
    last_available_slot = EXCLUDED.last_available_slot,
    computed_at = EXCLUDED.computed_at,
    is_stale = false,
    updated_at = NOW();
END;
$$;