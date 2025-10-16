-- Add new column for complete availability map
ALTER TABLE employee_daily_availability 
ADD COLUMN IF NOT EXISTS availability_map jsonb DEFAULT '{}'::jsonb;

-- Create function to build complete availability map (all 144 slots)
CREATE OR REPLACE FUNCTION build_availability_map(
  p_employee_id UUID,
  p_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_barbershop_id UUID;
  v_schedule RECORD;
  v_day_of_week INT;
  v_result JSONB := '{}'::jsonb;
  v_current_time TIME;
  v_slot_time TEXT;
  v_work_start TIME;
  v_work_end TIME;
  v_break RECORD;
  v_appointment RECORD;
BEGIN
  -- Get barbershop_id
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees WHERE id = p_employee_id;
  
  -- Get day of week (0=Sunday, 6=Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get work schedule
  SELECT start_time, end_time INTO v_schedule
  FROM employee_schedules
  WHERE employee_id = p_employee_id
    AND day_of_week = v_day_of_week
    AND is_active = true
  LIMIT 1;
  
  IF FOUND THEN
    v_work_start := v_schedule.start_time;
    v_work_end := v_schedule.end_time;
  ELSE
    -- No schedule = all day unavailable
    v_work_start := '00:00'::TIME;
    v_work_end := '00:00'::TIME;
  END IF;
  
  -- STEP 1: CREATE ALL 144 SLOTS OF THE DAY (00:00 to 23:50)
  v_current_time := '00:00'::TIME;
  
  WHILE v_current_time < '24:00'::TIME LOOP
    v_slot_time := to_char(v_current_time, 'HH24:MI');
    
    -- If within work hours, start as TRUE; otherwise FALSE
    IF v_current_time >= v_work_start AND v_current_time < v_work_end THEN
      v_result := v_result || jsonb_build_object(v_slot_time, to_jsonb(true));
    ELSE
      v_result := v_result || jsonb_build_object(v_slot_time, to_jsonb(false));
    END IF;
    
    v_current_time := v_current_time + INTERVAL '10 minutes';
  END LOOP;
  
  -- STEP 2: MARK BREAKS AS FALSE
  FOR v_break IN (
    SELECT start_time, end_time
    FROM employee_breaks
    WHERE employee_id = p_employee_id
      AND is_active = true
      AND (day_of_week = v_day_of_week OR specific_date = p_date)
  ) LOOP
    v_current_time := v_break.start_time;
    WHILE v_current_time < v_break.end_time LOOP
      v_slot_time := to_char(v_current_time, 'HH24:MI');
      IF v_result ? v_slot_time THEN
        v_result := jsonb_set(v_result, ARRAY[v_slot_time], to_jsonb(false), true);
      END IF;
      v_current_time := v_current_time + INTERVAL '10 minutes';
    END LOOP;
  END LOOP;
  
  -- STEP 3: MARK APPOINTMENTS AS FALSE
  FOR v_appointment IN (
    SELECT start_time, end_time
    FROM appointments
    WHERE employee_id = p_employee_id
      AND appointment_date = p_date
      AND status != 'cancelled'
  ) LOOP
    v_current_time := v_appointment.start_time;
    WHILE v_current_time < v_appointment.end_time LOOP
      v_slot_time := to_char(v_current_time, 'HH24:MI');
      IF v_result ? v_slot_time THEN
        v_result := jsonb_set(v_result, ARRAY[v_slot_time], to_jsonb(false), true);
      END IF;
      v_current_time := v_current_time + INTERVAL '10 minutes';
    END LOOP;
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create wrapper function to refresh availability map
CREATE OR REPLACE FUNCTION refresh_availability_map(
  p_employee_id UUID,
  p_date DATE
) RETURNS VOID AS $$
DECLARE
  v_barbershop_id UUID;
  v_new_map JSONB;
BEGIN
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees WHERE id = p_employee_id;
  
  -- Build the complete map
  v_new_map := build_availability_map(p_employee_id, p_date);
  
  -- Insert or update
  INSERT INTO employee_daily_availability (
    employee_id,
    barbershop_id,
    date,
    availability_map,
    computed_at
  ) VALUES (
    p_employee_id,
    v_barbershop_id,
    p_date,
    v_new_map,
    NOW()
  )
  ON CONFLICT (employee_id, date) 
  DO UPDATE SET
    availability_map = EXCLUDED.availability_map,
    computed_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger function to invalidate availability_map cache
CREATE OR REPLACE FUNCTION mark_availability_map_stale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE employee_daily_availability
  SET availability_map = NULL,
      updated_at = NOW()
  WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
    AND date = COALESCE(NEW.appointment_date, OLD.appointment_date);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS invalidate_availability_map_on_appointment ON appointments;

-- Create trigger on appointments to invalidate cache
CREATE TRIGGER invalidate_availability_map_on_appointment
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION mark_availability_map_stale();

-- Create trigger function for breaks
CREATE OR REPLACE FUNCTION mark_availability_map_stale_breaks()
RETURNS TRIGGER AS $$
DECLARE
  v_start_date DATE := CURRENT_DATE;
  v_end_date DATE := CURRENT_DATE + INTERVAL '30 days';
BEGIN
  UPDATE employee_daily_availability
  SET availability_map = NULL,
      updated_at = NOW()
  WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
    AND date BETWEEN v_start_date AND v_end_date;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS invalidate_availability_map_on_break ON employee_breaks;

-- Create trigger on breaks to invalidate cache
CREATE TRIGGER invalidate_availability_map_on_break
  AFTER INSERT OR UPDATE OR DELETE ON employee_breaks
  FOR EACH ROW
  EXECUTE FUNCTION mark_availability_map_stale_breaks();