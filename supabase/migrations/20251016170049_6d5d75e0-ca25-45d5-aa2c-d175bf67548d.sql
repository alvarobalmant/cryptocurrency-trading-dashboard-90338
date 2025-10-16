-- ========================================
-- TABELA: employee_availability_cache
-- Cache de disponibilidade por funcionário/dia
-- ========================================

CREATE TABLE IF NOT EXISTS employee_availability_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  availability_blocks JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(employee_id, date),
  CONSTRAINT valid_date CHECK (date >= CURRENT_DATE - INTERVAL '1 year')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_availability_employee_date ON employee_availability_cache(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_barbershop_date ON employee_availability_cache(barbershop_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_date ON employee_availability_cache(date);

-- ========================================
-- FUNÇÃO: calculate_employee_availability
-- Calcula disponibilidade de um funcionário em uma data
-- Hierarquia: Exceções > Pausas > Agendamentos > Expediente
-- ========================================

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
  
  -- Se houver exceção, extrair slots disponíveis
  IF v_has_exception AND v_exception.available_slots IS NOT NULL THEN
    SELECT array_agg(slot_time::TEXT) INTO v_exception_slots
    FROM (
      SELECT generate_series(
        (elem->>'start')::TIME,
        (elem->>'end')::TIME - INTERVAL '10 minutes',
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

-- ========================================
-- FUNÇÃO: refresh_availability_cache
-- Atualiza ou cria cache de disponibilidade
-- ========================================

CREATE OR REPLACE FUNCTION refresh_availability_cache(
  p_employee_id UUID,
  p_date DATE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id UUID;
  v_availability JSONB;
BEGIN
  -- Obter barbershop_id
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees
  WHERE id = p_employee_id;
  
  IF v_barbershop_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Calcular disponibilidade
  v_availability := calculate_employee_availability(p_employee_id, p_date);
  
  -- Inserir ou atualizar cache
  INSERT INTO employee_availability_cache (
    employee_id,
    barbershop_id,
    date,
    availability_blocks,
    last_updated
  ) VALUES (
    p_employee_id,
    v_barbershop_id,
    p_date,
    v_availability,
    NOW()
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    availability_blocks = EXCLUDED.availability_blocks,
    last_updated = NOW();
END;
$$;

-- ========================================
-- FUNÇÃO RPC: get_employee_availability
-- Consulta rápida com fallback para cálculo
-- ========================================

CREATE OR REPLACE FUNCTION get_employee_availability(
  p_employee_id UUID,
  p_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_availability JSONB;
BEGIN
  -- Tentar obter do cache
  SELECT availability_blocks INTO v_availability
  FROM employee_availability_cache
  WHERE employee_id = p_employee_id
    AND date = p_date;
  
  -- Se não existir, calcular e criar
  IF v_availability IS NULL THEN
    v_availability := calculate_employee_availability(p_employee_id, p_date);
    PERFORM refresh_availability_cache(p_employee_id, p_date);
  END IF;
  
  RETURN v_availability;
END;
$$;

-- ========================================
-- TRIGGER: Atualizar cache em agendamentos
-- ========================================

CREATE OR REPLACE FUNCTION trigger_refresh_availability_on_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM refresh_availability_cache(NEW.employee_id, NEW.appointment_date);
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.appointment_date != NEW.appointment_date THEN
    PERFORM refresh_availability_cache(OLD.employee_id, OLD.appointment_date);
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_availability_cache(OLD.employee_id, OLD.appointment_date);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS appointments_refresh_availability ON appointments;
CREATE TRIGGER appointments_refresh_availability
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_availability_on_appointment();

-- ========================================
-- TRIGGER: Atualizar cache em exceções
-- ========================================

CREATE OR REPLACE FUNCTION trigger_refresh_availability_on_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM refresh_availability_cache(NEW.employee_id, NEW.exception_date);
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.exception_date != NEW.exception_date THEN
    PERFORM refresh_availability_cache(OLD.employee_id, OLD.exception_date);
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_availability_cache(OLD.employee_id, OLD.exception_date);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS schedule_exceptions_refresh_availability ON schedule_exceptions;
CREATE TRIGGER schedule_exceptions_refresh_availability
AFTER INSERT OR UPDATE OR DELETE ON schedule_exceptions
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_availability_on_exception();

-- ========================================
-- TRIGGER: Atualizar cache em pausas
-- ========================================

CREATE OR REPLACE FUNCTION trigger_refresh_availability_on_break()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_employee_id UUID;
BEGIN
  v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
  
  -- Se pausa tem data específica, atualizar apenas esse dia
  IF COALESCE(NEW.specific_date, OLD.specific_date) IS NOT NULL THEN
    v_date := COALESCE(NEW.specific_date, OLD.specific_date);
    PERFORM refresh_availability_cache(v_employee_id, v_date);
  ELSE
    -- Pausa recorrente: atualizar próximos 30 dias
    FOR v_date IN
      SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        INTERVAL '1 day'
      )::DATE
    LOOP
      PERFORM refresh_availability_cache(v_employee_id, v_date);
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS employee_breaks_refresh_availability ON employee_breaks;
CREATE TRIGGER employee_breaks_refresh_availability
AFTER INSERT OR UPDATE OR DELETE ON employee_breaks
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_availability_on_break();

-- ========================================
-- TRIGGER: Atualizar cache em expediente
-- ========================================

CREATE OR REPLACE FUNCTION trigger_refresh_availability_on_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_employee_id UUID;
BEGIN
  v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
  
  -- Atualizar próximos 30 dias
  FOR v_date IN
    SELECT generate_series(
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      INTERVAL '1 day'
    )::DATE
  LOOP
    PERFORM refresh_availability_cache(v_employee_id, v_date);
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS employee_schedules_refresh_availability ON employee_schedules;
CREATE TRIGGER employee_schedules_refresh_availability
AFTER INSERT OR UPDATE OR DELETE ON employee_schedules
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_availability_on_schedule();

-- ========================================
-- RLS: Row-Level Security
-- ========================================

ALTER TABLE employee_availability_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their employees availability cache" ON employee_availability_cache;
CREATE POLICY "Owners can view their employees availability cache"
ON employee_availability_cache
FOR SELECT
TO authenticated
USING (
  barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Employees can view their own availability cache" ON employee_availability_cache;
CREATE POLICY "Employees can view their own availability cache"
ON employee_availability_cache
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees
    WHERE email = COALESCE((auth.jwt()->>'email'), '')
      AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Public can view availability cache" ON employee_availability_cache;
CREATE POLICY "Public can view availability cache"
ON employee_availability_cache
FOR SELECT
TO anon, authenticated
USING (true);