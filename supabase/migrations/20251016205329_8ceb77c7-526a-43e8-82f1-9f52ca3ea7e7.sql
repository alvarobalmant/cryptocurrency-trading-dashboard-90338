-- Criar função de debug para compute_daily_availability com logging detalhado
CREATE OR REPLACE FUNCTION compute_daily_availability_debug(
  p_employee_id UUID,
  p_date DATE
)
RETURNS TABLE(
  step TEXT,
  info TEXT,
  data JSONB
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_schedule RECORD;
  v_slots JSONB := '{}'::jsonb;
  v_current_time TIME;
  v_end_time TIME;
  v_break RECORD;
  v_appointment RECORD;
  v_exception RECORD;
  v_break_count INTEGER := 0;
  v_appointment_count INTEGER := 0;
  v_slot_count INTEGER := 0;
BEGIN
  -- Step 1: Get barbershop_id
  SELECT barbershop_id INTO v_barbershop_id 
  FROM employees 
  WHERE id = p_employee_id;
  
  RETURN QUERY SELECT 'barbershop_id'::TEXT, v_barbershop_id::TEXT, NULL::JSONB;
  
  IF v_barbershop_id IS NULL THEN
    RETURN QUERY SELECT 'error'::TEXT, 'Barbershop ID not found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Step 2: Check for exception
  SELECT * INTO v_exception
  FROM schedule_exceptions
  WHERE employee_id = p_employee_id 
    AND exception_date = p_date
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 'exception_found'::TEXT, 'Using exception schedule'::TEXT, 
      jsonb_build_object('available_slots', v_exception.available_slots);
  ELSE
    RETURN QUERY SELECT 'no_exception'::TEXT, 'Using regular schedule'::TEXT, NULL::JSONB;
  END IF;
  
  -- Step 3: Get regular schedule
  SELECT * INTO v_schedule
  FROM employee_schedules
  WHERE employee_id = p_employee_id 
    AND day_of_week = EXTRACT(DOW FROM p_date)
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'error'::TEXT, 'No schedule found for this day'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'schedule_found'::TEXT, 
    format('Start: %s, End: %s', v_schedule.start_time, v_schedule.end_time),
    NULL::JSONB;
  
  -- Step 4: Initialize slots
  v_current_time := v_schedule.start_time;
  v_end_time := v_schedule.end_time;
  
  WHILE v_current_time < v_end_time LOOP
    v_slots := v_slots || jsonb_build_object(to_char(v_current_time, 'HH24:MI'), to_jsonb(true));
    v_slot_count := v_slot_count + 1;
    v_current_time := v_current_time + interval '10 minutes';
  END LOOP;
  
  RETURN QUERY SELECT 'slots_initialized'::TEXT, 
    format('%s slots created', v_slot_count),
    v_slots;
  
  -- Step 5: Query breaks
  RETURN QUERY 
    SELECT 'breaks_query'::TEXT,
      format('Found %s breaks', COUNT(*)),
      jsonb_agg(jsonb_build_object(
        'start_time', start_time,
        'end_time', end_time,
        'day_of_week', day_of_week,
        'specific_date', specific_date
      ))
    FROM employee_breaks
    WHERE employee_id = p_employee_id
      AND is_active = true
      AND (
        (day_of_week = EXTRACT(DOW FROM p_date) AND specific_date IS NULL)
        OR specific_date = p_date
      );
  
  -- Step 6: Process breaks
  FOR v_break IN
    SELECT start_time, end_time, title
    FROM employee_breaks
    WHERE employee_id = p_employee_id
      AND is_active = true
      AND (
        (day_of_week = EXTRACT(DOW FROM p_date) AND specific_date IS NULL)
        OR specific_date = p_date
      )
  LOOP
    v_break_count := v_break_count + 1;
    RETURN QUERY SELECT 'processing_break'::TEXT,
      format('Break %s: %s - %s (%s)', v_break_count, v_break.start_time, v_break.end_time, v_break.title),
      NULL::JSONB;
    
    v_current_time := v_break.start_time;
    WHILE v_current_time < v_break.end_time LOOP
      v_slots := jsonb_set(
        v_slots, 
        ARRAY[to_char(v_current_time, 'HH24:MI')], 
        to_jsonb(false),
        true
      );
      RETURN QUERY SELECT 'marked_false'::TEXT,
        format('Marked %s as FALSE (break)', to_char(v_current_time, 'HH24:MI')),
        NULL::JSONB;
      v_current_time := v_current_time + interval '10 minutes';
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT 'breaks_processed'::TEXT,
    format('Total breaks processed: %s', v_break_count),
    v_slots;
  
  -- Step 7: Query appointments
  RETURN QUERY 
    SELECT 'appointments_query'::TEXT,
      format('Found %s appointments', COUNT(*)),
      jsonb_agg(jsonb_build_object(
        'start_time', start_time,
        'end_time', end_time,
        'status', status,
        'client_name', client_name
      ))
    FROM appointments
    WHERE employee_id = p_employee_id
      AND appointment_date = p_date
      AND status NOT IN ('cancelled', 'no_show');
  
  -- Step 8: Process appointments
  FOR v_appointment IN
    SELECT start_time, end_time, client_name, status
    FROM appointments
    WHERE employee_id = p_employee_id
      AND appointment_date = p_date
      AND status NOT IN ('cancelled', 'no_show')
  LOOP
    v_appointment_count := v_appointment_count + 1;
    RETURN QUERY SELECT 'processing_appointment'::TEXT,
      format('Appointment %s: %s - %s (%s, %s)', v_appointment_count, 
        v_appointment.start_time, v_appointment.end_time, 
        v_appointment.client_name, v_appointment.status),
      NULL::JSONB;
    
    v_current_time := v_appointment.start_time;
    WHILE v_current_time < v_appointment.end_time LOOP
      v_slots := jsonb_set(
        v_slots, 
        ARRAY[to_char(v_current_time, 'HH24:MI')], 
        to_jsonb(false),
        true
      );
      RETURN QUERY SELECT 'marked_false'::TEXT,
        format('Marked %s as FALSE (appointment)', to_char(v_current_time, 'HH24:MI')),
        NULL::JSONB;
      v_current_time := v_current_time + interval '10 minutes';
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT 'appointments_processed'::TEXT,
    format('Total appointments processed: %s', v_appointment_count),
    v_slots;
  
  -- Step 9: Final result
  RETURN QUERY SELECT 'final_result'::TEXT,
    format('Total slots: %s, Breaks: %s, Appointments: %s', 
      v_slot_count, v_break_count, v_appointment_count),
    v_slots;
END;
$$;