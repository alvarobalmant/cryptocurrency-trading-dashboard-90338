-- Corrigir função calculate_employee_availability
-- O problema é que generate_series não funciona com TIME, precisa usar TIMESTAMP

CREATE OR REPLACE FUNCTION calculate_employee_availability(
  p_employee_id UUID,
  p_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_day_of_week INTEGER;
  v_availability JSONB := '{}'::jsonb;
  v_current_time TIME := '00:00'::TIME;
  v_end_time TIME := '23:50'::TIME;
  v_is_available BOOLEAN;
  v_schedule RECORD;
  v_exception RECORD;
  v_has_exception BOOLEAN := false;
  v_exception_slots TEXT[];
BEGIN
  -- Obter barbershop_id
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees
  WHERE id = p_employee_id;
  
  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found: %', p_employee_id;
  END IF;
  
  -- Dia da semana (0 = Domingo, 6 = Sábado)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Verificar exceção para este dia
  SELECT * INTO v_exception
  FROM schedule_exceptions
  WHERE employee_id = p_employee_id
    AND exception_date = p_date
  LIMIT 1;
  
  v_has_exception := FOUND;
  
  -- Se houver exceção, extrair slots disponíveis (CORRIGIDO)
  IF v_has_exception AND v_exception.available_slots IS NOT NULL THEN
    SELECT array_agg(slot_time::TEXT) INTO v_exception_slots
    FROM (
      SELECT generate_series(
        (p_date || ' ' || (elem->>'start'))::TIMESTAMP,
        (p_date || ' ' || (elem->>'end'))::TIMESTAMP - INTERVAL '10 minutes',
        INTERVAL '10 minutes'
      )::TIME AS slot_time
      FROM jsonb_array_elements(v_exception.available_slots) AS elem
    ) slots;
  END IF;
  
  -- Buscar horário padrão
  SELECT * INTO v_schedule
  FROM employee_schedules
  WHERE employee_id = p_employee_id
    AND day_of_week = v_day_of_week
    AND is_active = true
  LIMIT 1;
  
  -- Gerar slots de 10 em 10 minutos
  WHILE v_current_time <= v_end_time LOOP
    v_is_available := false;
    
    -- PRIORIDADE 1: Exceções manuais
    IF v_has_exception THEN
      IF v_exception_slots IS NOT NULL AND v_current_time::TEXT = ANY(v_exception_slots) THEN
        v_is_available := true;
      ELSE
        v_is_available := false;
      END IF;
    ELSE
      -- PRIORIDADE 2: Verificar expediente
      IF v_schedule IS NOT NULL THEN
        IF v_current_time >= v_schedule.start_time AND v_current_time < v_schedule.end_time THEN
          v_is_available := true;
          
          -- PRIORIDADE 3: Verificar pausas
          IF EXISTS (
            SELECT 1 FROM employee_breaks
            WHERE employee_id = p_employee_id
              AND is_active = true
              AND (
                (day_of_week = v_day_of_week AND specific_date IS NULL)
                OR specific_date = p_date
              )
              AND v_current_time >= start_time
              AND v_current_time < end_time
          ) THEN
            v_is_available := false;
          END IF;
          
          -- PRIORIDADE 4: Verificar agendamentos
          IF v_is_available AND EXISTS (
            SELECT 1 FROM appointments
            WHERE employee_id = p_employee_id
              AND appointment_date = p_date
              AND status IN ('confirmed', 'pending')
              AND v_current_time >= start_time::TIME
              AND v_current_time < end_time::TIME
          ) THEN
            v_is_available := false;
          END IF;
        END IF;
      END IF;
    END IF;
    
    -- Adicionar ao JSON
    v_availability := v_availability || jsonb_build_object(
      v_current_time::TEXT,
      v_is_available
    );
    
    v_current_time := v_current_time + INTERVAL '10 minutes';
  END LOOP;
  
  RETURN v_availability;
END;
$$;