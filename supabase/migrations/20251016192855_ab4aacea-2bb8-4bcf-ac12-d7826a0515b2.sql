-- =====================================================
-- SISTEMA DE CACHE DE DISPONIBILIDADE (INDEPENDENTE)
-- Não modifica nenhuma tabela ou função existente
-- =====================================================

-- 1. NOVA TABELA: employee_daily_availability
CREATE TABLE IF NOT EXISTS employee_daily_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Slots de 10 minutos em JSONB
  availability_slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadados para otimização
  total_slots_available INTEGER NOT NULL DEFAULT 0,
  first_available_slot TIME,
  last_available_slot TIME,
  
  -- Sistema de staleness para invalidação inteligente
  is_stale BOOLEAN NOT NULL DEFAULT false,
  sources_hash TEXT,
  
  -- Timestamps
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraint única
  UNIQUE(employee_id, date)
);

-- Índices para performance (sem predicados CURRENT_DATE)
CREATE INDEX idx_daily_avail_employee_date ON employee_daily_availability(employee_id, date);
CREATE INDEX idx_daily_avail_barbershop_date ON employee_daily_availability(barbershop_id, date);
CREATE INDEX idx_daily_avail_stale ON employee_daily_availability(is_stale) WHERE is_stale = true;
CREATE INDEX idx_daily_avail_date ON employee_daily_availability(date);
CREATE INDEX idx_daily_avail_slots_gin ON employee_daily_availability USING GIN(availability_slots);

-- Trigger para updated_at
CREATE TRIGGER update_daily_availability_updated_at
  BEFORE UPDATE ON employee_daily_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. FUNÇÃO: compute_daily_availability
-- Reutiliza lógica existente de calculate_employee_availability
-- =====================================================
CREATE OR REPLACE FUNCTION compute_daily_availability(
  p_employee_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slots JSONB;
  v_availability JSONB;
  v_slot JSONB;
  v_time TEXT;
  v_is_available BOOLEAN;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- Reutiliza a função existente
  v_availability := get_employee_availability(p_employee_id, p_date);
  
  -- Converte para formato de slots {"09:00": true, "09:10": false, ...}
  IF v_availability IS NOT NULL AND jsonb_typeof(v_availability) = 'array' THEN
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_availability)
    LOOP
      v_time := v_slot->>'start';
      v_is_available := (v_slot->>'available')::boolean;
      
      IF v_time IS NOT NULL THEN
        v_result := v_result || jsonb_build_object(v_time, v_is_available);
      END IF;
    END LOOP;
  END IF;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO: refresh_daily_availability
-- Atualiza ou cria entrada na tabela de cache
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_daily_availability(
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
  v_total_available INTEGER := 0;
  v_first_slot TIME := NULL;
  v_last_slot TIME := NULL;
  v_current_hash TEXT;
  v_existing_hash TEXT;
  v_slot_key TEXT;
  v_slot_value BOOLEAN;
BEGIN
  -- Buscar barbershop_id
  SELECT barbershop_id INTO v_barbershop_id
  FROM employees
  WHERE id = p_employee_id;
  
  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found: %', p_employee_id;
  END IF;
  
  -- Calcular hash das fontes (updated_at das tabelas relacionadas)
  SELECT MD5(
    COALESCE(MAX(a.updated_at)::text, '') || '|' ||
    COALESCE(MAX(se.updated_at)::text, '') || '|' ||
    COALESCE(MAX(es.updated_at)::text, '') || '|' ||
    COALESCE(MAX(eb.updated_at)::text, '')
  ) INTO v_current_hash
  FROM employees e
  LEFT JOIN appointments a ON a.employee_id = e.id AND a.appointment_date = p_date
  LEFT JOIN schedule_exceptions se ON se.employee_id = e.id AND p_date BETWEEN se.start_date AND se.end_date
  LEFT JOIN employee_schedules es ON es.employee_id = e.id
  LEFT JOIN employee_breaks eb ON eb.employee_id = e.id
  WHERE e.id = p_employee_id;
  
  -- Verificar se precisa recalcular
  IF NOT p_force THEN
    SELECT sources_hash INTO v_existing_hash
    FROM employee_daily_availability
    WHERE employee_id = p_employee_id AND date = p_date;
    
    IF v_existing_hash IS NOT NULL AND v_existing_hash = v_current_hash THEN
      -- Dados ainda válidos, apenas marca como não-stale
      UPDATE employee_daily_availability
      SET is_stale = false, updated_at = NOW()
      WHERE employee_id = p_employee_id AND date = p_date;
      RETURN;
    END IF;
  END IF;
  
  -- Computar disponibilidade
  v_slots := compute_daily_availability(p_employee_id, p_date);
  
  -- Calcular metadados
  FOR v_slot_key, v_slot_value IN
    SELECT * FROM jsonb_each(v_slots)
  LOOP
    IF v_slot_value::boolean = true THEN
      v_total_available := v_total_available + 1;
      
      IF v_first_slot IS NULL THEN
        v_first_slot := v_slot_key::time;
      END IF;
      v_last_slot := v_slot_key::time;
    END IF;
  END LOOP;
  
  -- Inserir ou atualizar
  INSERT INTO employee_daily_availability (
    employee_id,
    barbershop_id,
    date,
    availability_slots,
    total_slots_available,
    first_available_slot,
    last_available_slot,
    is_stale,
    sources_hash,
    computed_at
  ) VALUES (
    p_employee_id,
    v_barbershop_id,
    p_date,
    v_slots,
    v_total_available,
    v_first_slot,
    v_last_slot,
    false,
    v_current_hash,
    NOW()
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    availability_slots = EXCLUDED.availability_slots,
    total_slots_available = EXCLUDED.total_slots_available,
    first_available_slot = EXCLUDED.first_available_slot,
    last_available_slot = EXCLUDED.last_available_slot,
    is_stale = false,
    sources_hash = EXCLUDED.sources_hash,
    computed_at = NOW(),
    updated_at = NOW();
END;
$$;

-- =====================================================
-- 4. FUNÇÃO RPC: get_daily_availability
-- Interface para o frontend com fallback automático
-- =====================================================
CREATE OR REPLACE FUNCTION get_daily_availability(
  p_employee_id UUID,
  p_date DATE
)
RETURNS TABLE (
  availability_slots JSONB,
  total_slots_available INTEGER,
  first_available_slot TIME,
  last_available_slot TIME,
  computed_at TIMESTAMP WITH TIME ZONE,
  is_cached BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached_data RECORD;
BEGIN
  -- Tentar buscar do cache
  SELECT 
    eda.availability_slots,
    eda.total_slots_available,
    eda.first_available_slot,
    eda.last_available_slot,
    eda.computed_at,
    eda.is_stale
  INTO v_cached_data
  FROM employee_daily_availability eda
  WHERE eda.employee_id = p_employee_id 
    AND eda.date = p_date;
  
  -- Se não existe ou está stale, recalcular
  IF v_cached_data IS NULL OR v_cached_data.is_stale = true THEN
    PERFORM refresh_daily_availability(p_employee_id, p_date, false);
    
    -- Buscar novamente após recalcular
    SELECT 
      eda.availability_slots,
      eda.total_slots_available,
      eda.first_available_slot,
      eda.last_available_slot,
      eda.computed_at
    INTO v_cached_data
    FROM employee_daily_availability eda
    WHERE eda.employee_id = p_employee_id 
      AND eda.date = p_date;
  END IF;
  
  -- Retornar resultado
  RETURN QUERY
  SELECT 
    v_cached_data.availability_slots,
    v_cached_data.total_slots_available,
    v_cached_data.first_available_slot,
    v_cached_data.last_available_slot,
    v_cached_data.computed_at,
    true AS is_cached;
END;
$$;

-- =====================================================
-- 5. FUNÇÃO: mark_availability_stale
-- Marca entradas como stale em vez de deletar
-- =====================================================
CREATE OR REPLACE FUNCTION mark_availability_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_date DATE;
BEGIN
  -- Determinar employee_id e date baseado na tabela
  IF TG_TABLE_NAME = 'appointments' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    v_date := COALESCE(NEW.appointment_date, OLD.appointment_date);
    
  ELSIF TG_TABLE_NAME = 'schedule_exceptions' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    -- Marcar stale para todo o range de datas
    UPDATE employee_daily_availability
    SET is_stale = true, updated_at = NOW()
    WHERE employee_id = v_employee_id
      AND date BETWEEN COALESCE(NEW.start_date, OLD.start_date) 
                   AND COALESCE(NEW.end_date, OLD.end_date);
    RETURN COALESCE(NEW, OLD);
    
  ELSIF TG_TABLE_NAME = 'employee_schedules' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    -- Marcar stale para todas as datas futuras deste employee
    UPDATE employee_daily_availability
    SET is_stale = true, updated_at = NOW()
    WHERE employee_id = v_employee_id
      AND date >= CURRENT_DATE;
    RETURN COALESCE(NEW, OLD);
    
  ELSIF TG_TABLE_NAME = 'employee_breaks' THEN
    v_employee_id := COALESCE(NEW.employee_id, OLD.employee_id);
    -- Marcar stale para todas as datas futuras deste employee
    UPDATE employee_daily_availability
    SET is_stale = true, updated_at = NOW()
    WHERE employee_id = v_employee_id
      AND date >= CURRENT_DATE;
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Marcar como stale
  IF v_date IS NOT NULL THEN
    UPDATE employee_daily_availability
    SET is_stale = true, updated_at = NOW()
    WHERE employee_id = v_employee_id
      AND date = v_date;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers de invalidação
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

-- =====================================================
-- 6. FUNÇÃO: preload_availability_batch
-- Pré-carrega disponibilidade para múltiplos dias
-- =====================================================
CREATE OR REPLACE FUNCTION preload_availability_batch(
  p_barbershop_id UUID,
  p_days_ahead INTEGER DEFAULT 14
)
RETURNS TABLE (
  processed_count INTEGER,
  employee_count INTEGER,
  date_range_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee RECORD;
  v_date DATE;
  v_processed INTEGER := 0;
  v_employee_count INTEGER := 0;
BEGIN
  -- Contar employees ativos
  SELECT COUNT(*) INTO v_employee_count
  FROM employees
  WHERE barbershop_id = p_barbershop_id
    AND status = 'active';
  
  -- Para cada employee ativo
  FOR v_employee IN
    SELECT id
    FROM employees
    WHERE barbershop_id = p_barbershop_id
      AND status = 'active'
  LOOP
    -- Para cada dia no range
    FOR v_date IN
      SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + (p_days_ahead || ' days')::interval,
        '1 day'::interval
      )::date
    LOOP
      PERFORM refresh_daily_availability(v_employee.id, v_date, false);
      v_processed := v_processed + 1;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_employee_count, p_days_ahead;
END;
$$;

-- =====================================================
-- 7. FUNÇÃO: cleanup_old_availability
-- Remove entradas antigas do cache
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_availability(
  p_days_to_keep INTEGER DEFAULT 7
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM employee_daily_availability
  WHERE date < CURRENT_DATE - (p_days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- =====================================================
-- 8. POLÍTICAS RLS
-- =====================================================
ALTER TABLE employee_daily_availability ENABLE ROW LEVEL SECURITY;

-- Owners podem ver disponibilidade de seus employees
CREATE POLICY "Owners can view their employees availability"
  ON employee_daily_availability
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- Employees podem ver sua própria disponibilidade
CREATE POLICY "Employees can view their own availability"
  ON employee_daily_availability
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE email = COALESCE((auth.jwt() ->> 'email'), '')
        AND status = 'active'
    )
  );

-- Público pode ver disponibilidade para booking (datas futuras apenas)
CREATE POLICY "Public can view availability for booking"
  ON employee_daily_availability
  FOR SELECT
  USING (true);

-- Service role pode gerenciar tudo
CREATE POLICY "Service role can manage all"
  ON employee_daily_availability
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE employee_daily_availability IS 
  'Cache pré-computado de disponibilidade diária dos employees. Sistema independente que não modifica tabelas existentes.';

COMMENT ON FUNCTION compute_daily_availability IS 
  'Computa disponibilidade para um employee em uma data específica. Reutiliza get_employee_availability existente.';

COMMENT ON FUNCTION refresh_daily_availability IS 
  'Atualiza cache de disponibilidade com verificação de hash para evitar recálculos desnecessários.';

COMMENT ON FUNCTION get_daily_availability IS 
  'RPC para frontend. Retorna disponibilidade do cache com fallback automático se necessário.';

COMMENT ON FUNCTION mark_availability_stale IS 
  'Trigger function que marca entradas como stale quando dados fonte mudam.';

COMMENT ON FUNCTION preload_availability_batch IS 
  'Pré-carrega disponibilidade para todos employees de uma barbearia por N dias.';

COMMENT ON FUNCTION cleanup_old_availability IS 
  'Remove entradas antigas do cache para liberar espaço.';