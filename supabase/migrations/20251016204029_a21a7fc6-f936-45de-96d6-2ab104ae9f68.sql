-- Corrigir compute_daily_availability para usar to_jsonb() com valores boolean verdadeiros
-- Isso garante que false seja boolean false e não string "false"

CREATE OR REPLACE FUNCTION compute_daily_availability(
  p_employee_id UUID,
  p_date DATE
)
RETURNS JSONB
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
BEGIN
  -- Get barbershop_id
  SELECT barbershop_id INTO v_barbershop_id 
  FROM employees 
  WHERE id = p_employee_id;
  
  IF v_barbershop_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Check for exception first
  SELECT * INTO v_exception
  FROM schedule_exceptions
  WHERE employee_id = p_employee_id 
    AND exception_date = p_date
  LIMIT 1;
  
  IF FOUND AND v_exception.available_slots IS NOT NULL THEN
    -- Exception exists, convert TimeSlot[] format to our format
    -- available_slots: [{"start":"09:00","end":"12:00"}]
    DECLARE
      slot JSONB;
      slot_start TIME;
      slot_end TIME;
      current_slot TIME;
    BEGIN
      FOR slot IN SELECT * FROM jsonb_array_elements(v_exception.available_slots)
      LOOP
        slot_start := (slot->>'start')::TIME;
        slot_end := (slot->>'end')::TIME;
        current_slot := slot_start;
        
        WHILE current_slot < slot_end LOOP
          v_slots := v_slots || jsonb_build_object(to_char(current_slot, 'HH24:MI'), to_jsonb(true));
          current_slot := current_slot + interval '10 minutes';
        END LOOP;
      END LOOP;
      
      RETURN v_slots;
    END;
  END IF;
  
  -- No exception, use regular schedule
  SELECT * INTO v_schedule
  FROM employee_schedules
  WHERE employee_id = p_employee_id 
    AND day_of_week = EXTRACT(DOW FROM p_date)
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Initialize all slots from schedule as available (boolean true)
  v_current_time := v_schedule.start_time;
  v_end_time := v_schedule.end_time;
  
  WHILE v_current_time < v_end_time LOOP
    v_slots := v_slots || jsonb_build_object(to_char(v_current_time, 'HH24:MI'), to_jsonb(true));
    v_current_time := v_current_time + interval '10 minutes';
  END LOOP;
  
  -- Mark breaks as false (not available) using jsonb_set with boolean false
  FOR v_break IN
    SELECT start_time, end_time
    FROM employee_breaks
    WHERE employee_id = p_employee_id
      AND is_active = true
      AND (
        (day_of_week = EXTRACT(DOW FROM p_date) AND specific_date IS NULL)
        OR specific_date = p_date
      )
  LOOP
    v_current_time := v_break.start_time;
    WHILE v_current_time < v_break.end_time LOOP
      -- Use to_jsonb(false) to create boolean false instead of string "false"
      v_slots := jsonb_set(
        v_slots, 
        ARRAY[to_char(v_current_time, 'HH24:MI')], 
        to_jsonb(false),
        true
      );
      v_current_time := v_current_time + interval '10 minutes';
    END LOOP;
  END LOOP;
  
  -- Mark appointments as false (not available) using jsonb_set with boolean false
  FOR v_appointment IN
    SELECT start_time, end_time
    FROM appointments
    WHERE employee_id = p_employee_id
      AND appointment_date = p_date
      AND status NOT IN ('cancelled', 'no_show')
  LOOP
    v_current_time := v_appointment.start_time;
    WHILE v_current_time < v_appointment.end_time LOOP
      -- Use to_jsonb(false) to create boolean false instead of string "false"
      v_slots := jsonb_set(
        v_slots, 
        ARRAY[to_char(v_current_time, 'HH24:MI')], 
        to_jsonb(false),
        true
      );
      v_current_time := v_current_time + interval '10 minutes';
    END LOOP;
  END LOOP;
  
  RETURN v_slots;
END;
$$;

-- Invalidar cache existente para forçar recálculo com valores boolean corretos
UPDATE employee_daily_availability SET is_stale = true;