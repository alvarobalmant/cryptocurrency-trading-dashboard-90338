-- Fix schedule_exceptions and mark_availability_stale trigger (with CASCADE)

-- Step 1: Drop problematic function with CASCADE (will drop dependent triggers)
DROP FUNCTION IF EXISTS mark_availability_stale() CASCADE;

-- Step 2: Clean duplicate schedule_exceptions records
DO $$
DECLARE
  dup_record RECORD;
  merged_slots JSONB;
  first_time TIME;
  last_time TIME;
BEGIN
  -- For each employee/date combination with duplicates
  FOR dup_record IN
    SELECT employee_id, exception_date, barbershop_id
    FROM schedule_exceptions
    GROUP BY employee_id, exception_date, barbershop_id
    HAVING COUNT(*) > 1
  LOOP
    -- Collect all available_slots from duplicates and merge them
    SELECT 
      COALESCE(jsonb_agg(DISTINCT slot ORDER BY slot), '[]'::jsonb) INTO merged_slots
    FROM schedule_exceptions se,
         jsonb_array_elements(se.available_slots) slot
    WHERE se.employee_id = dup_record.employee_id
      AND se.exception_date = dup_record.exception_date;
    
    -- Get first and last times from merged slots
    SELECT 
      MIN((slot->>'start')::time),
      MAX((slot->>'end')::time)
    INTO first_time, last_time
    FROM jsonb_array_elements(merged_slots) slot;
    
    -- Delete all duplicates for this employee/date
    DELETE FROM schedule_exceptions
    WHERE employee_id = dup_record.employee_id
      AND exception_date = dup_record.exception_date;
    
    -- Insert single merged record (if there are available slots)
    IF jsonb_array_length(merged_slots) > 0 THEN
      INSERT INTO schedule_exceptions (
        employee_id,
        barbershop_id,
        exception_date,
        time_start,
        time_end,
        available_slots
      ) VALUES (
        dup_record.employee_id,
        dup_record.barbershop_id,
        dup_record.exception_date,
        first_time,
        last_time,
        merged_slots
      );
    END IF;
  END LOOP;
END $$;

-- Step 3: Apply constraints and indexes

-- Drop old constraint
ALTER TABLE schedule_exceptions 
DROP CONSTRAINT IF EXISTS schedule_exceptions_employee_id_exception_date_time_start_t_key;

-- Create correct unique constraint: one record per employee/day
CREATE UNIQUE INDEX IF NOT EXISTS schedule_exceptions_employee_date_unique 
ON schedule_exceptions(employee_id, exception_date);

-- Add optimized index for lookups
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_lookup
ON schedule_exceptions(barbershop_id, exception_date, employee_id);

-- Make time_start/time_end nullable
ALTER TABLE schedule_exceptions 
ALTER COLUMN time_start DROP NOT NULL;

ALTER TABLE schedule_exceptions 
ALTER COLUMN time_end DROP NOT NULL;

-- Add comment
COMMENT ON TABLE schedule_exceptions IS 'Stores schedule exceptions with one record per employee per day. Available time slots are stored in available_slots JSONB field. time_start/time_end are optional metadata fields.';

-- Step 4: Recreate mark_availability_stale function with correct logic
CREATE OR REPLACE FUNCTION mark_availability_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Determine employee_id and date range based on table
  IF TG_TABLE_NAME = 'appointments' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    v_start_date := COALESCE(NEW.appointment_date, OLD.appointment_date);
    v_end_date := v_start_date;
    
  ELSIF TG_TABLE_NAME = 'schedule_exceptions' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    v_start_date := COALESCE(NEW.exception_date, OLD.exception_date);
    v_end_date := v_start_date;
    
  ELSIF TG_TABLE_NAME = 'employee_schedules' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    v_start_date := CURRENT_DATE;
    v_end_date := CURRENT_DATE + INTERVAL '30 days';
    
  ELSIF TG_TABLE_NAME = 'employee_breaks' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    v_start_date := CURRENT_DATE;
    v_end_date := CURRENT_DATE + INTERVAL '30 days';
  END IF;
  
  -- Mark affected availability records as stale
  UPDATE employee_daily_availability
  SET is_stale = true, updated_at = NOW()
  WHERE employee_id = v_employee_id
    AND date BETWEEN v_start_date AND v_end_date;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 5: Recreate triggers
CREATE TRIGGER appointments_mark_stale
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW
EXECUTE FUNCTION mark_availability_stale();

CREATE TRIGGER schedule_exceptions_mark_stale
AFTER INSERT OR UPDATE OR DELETE ON schedule_exceptions
FOR EACH ROW
EXECUTE FUNCTION mark_availability_stale();

CREATE TRIGGER employee_schedules_mark_stale
AFTER INSERT OR UPDATE OR DELETE ON employee_schedules
FOR EACH ROW
EXECUTE FUNCTION mark_availability_stale();

CREATE TRIGGER employee_breaks_mark_stale
AFTER INSERT OR UPDATE OR DELETE ON employee_breaks
FOR EACH ROW
EXECUTE FUNCTION mark_availability_stale();