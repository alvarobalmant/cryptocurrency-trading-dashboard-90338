-- 1. Add uses_variants to products table and make some fields nullable
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS uses_variants BOOLEAN DEFAULT false,
ALTER COLUMN default_cost DROP NOT NULL,
ALTER COLUMN min_stock_level DROP NOT NULL,
ALTER COLUMN reorder_point DROP NOT NULL;

-- 2. Add variant-specific fields to product_variants
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS unit_size NUMERIC,
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC,
ADD COLUMN IF NOT EXISTS retail_price NUMERIC,
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 0;

-- 3. Ensure inventory_transactions has service tracking (already has appointment_id and service_id based on schema)

-- 4. Function to calculate total product volume/stock
CREATE OR REPLACE FUNCTION calculate_product_total_volume(
  p_product_id UUID,
  p_barbershop_id UUID DEFAULT NULL
)
RETURNS TABLE(
  total_units INTEGER,
  total_volume NUMERIC,
  total_value NUMERIC,
  variants JSONB
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uses_variants BOOLEAN;
  v_unit_type TEXT;
BEGIN
  -- Get product info
  SELECT uses_variants, unit_type INTO v_uses_variants, v_unit_type
  FROM products
  WHERE id = p_product_id;
  
  IF v_uses_variants THEN
    -- Calculate for products with variants
    RETURN QUERY
    SELECT 
      COALESCE(SUM(stock.total_quantity)::INTEGER, 0) as total_units,
      COALESCE(SUM(stock.total_quantity * pv.unit_size), 0) as total_volume,
      COALESCE(SUM(stock.total_value), 0) as total_value,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'variant_id', pv.id,
            'variant_name', pv.variant_name,
            'unit_size', pv.unit_size,
            'units', stock.total_quantity,
            'volume', stock.total_quantity * pv.unit_size,
            'value', stock.total_value,
            'unit_cost', pv.unit_cost
          )
        ) FILTER (WHERE pv.id IS NOT NULL),
        '[]'::jsonb
      ) as variants
    FROM product_variants pv
    LEFT JOIN LATERAL (
      SELECT * FROM calculate_available_stock(p_product_id, pv.id, p_barbershop_id)
    ) stock ON true
    WHERE pv.product_id = p_product_id
      AND pv.active = true;
  ELSE
    -- Calculate for simple products (no variants)
    RETURN QUERY
    SELECT 
      stock.total_quantity::INTEGER as total_units,
      stock.total_quantity as total_volume,
      stock.total_value,
      '[]'::jsonb as variants
    FROM calculate_available_stock(p_product_id, NULL, p_barbershop_id) stock;
  END IF;
END;
$$;

-- 5. Function to suggest optimal purchase to reach minimum stock
CREATE OR REPLACE FUNCTION suggest_optimal_purchase(
  p_product_id UUID,
  p_needed_volume NUMERIC
)
RETURNS TABLE(
  variant_id UUID,
  variant_name TEXT,
  unit_size NUMERIC,
  unit_cost NUMERIC,
  quantity_to_buy INTEGER,
  total_cost NUMERIC,
  total_volume NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_volume NUMERIC;
  v_deficit NUMERIC;
  v_variant RECORD;
  v_best_combination JSONB := '[]'::jsonb;
  v_min_cost NUMERIC := 999999999;
  v_temp_cost NUMERIC;
  v_temp_volume NUMERIC;
  v_combination JSONB;
BEGIN
  -- Get current total volume
  SELECT total_volume INTO v_current_volume
  FROM calculate_product_total_volume(p_product_id);
  
  v_current_volume := COALESCE(v_current_volume, 0);
  v_deficit := p_needed_volume - v_current_volume;
  
  -- If already at or above minimum, return empty
  IF v_deficit <= 0 THEN
    RETURN;
  END IF;
  
  -- Simple greedy algorithm: prioritize largest units first for efficiency
  -- then optimize for cost
  FOR v_variant IN 
    SELECT 
      pv.id,
      pv.variant_name,
      pv.unit_size,
      pv.unit_cost,
      (pv.unit_cost / pv.unit_size) as cost_per_unit_volume
    FROM product_variants pv
    WHERE pv.product_id = p_product_id
      AND pv.active = true
      AND pv.unit_size > 0
    ORDER BY cost_per_unit_volume ASC, unit_size DESC
  LOOP
    -- Calculate how many units needed
    DECLARE
      v_qty INTEGER;
      v_remaining NUMERIC := v_deficit;
    BEGIN
      -- Try to fulfill with this variant
      v_qty := CEIL(v_remaining / v_variant.unit_size)::INTEGER;
      
      IF v_qty > 0 THEN
        RETURN QUERY
        SELECT 
          v_variant.id,
          v_variant.variant_name,
          v_variant.unit_size,
          v_variant.unit_cost,
          v_qty,
          v_qty * v_variant.unit_cost as total_cost,
          v_qty * v_variant.unit_size as total_volume;
        
        -- Only suggest one optimal variant for simplicity
        RETURN;
      END IF;
    END;
  END LOOP;
END;
$$;

-- 6. Trigger to process service consumption
CREATE OR REPLACE FUNCTION process_service_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Only process when appointment is confirmed or completed
  IF NEW.status IN ('confirmed', 'completed') AND OLD.status = 'pending' THEN
    
    -- Get all products linked to this service
    FOR v_item IN
      SELECT 
        spi.product_id,
        spi.variant_id,
        spi.quantity_per_service,
        spi.unit,
        spi.cost_per_use
      FROM service_product_items spi
      WHERE spi.service_id = NEW.service_id
    LOOP
      -- Create inventory transaction for consumption
      INSERT INTO inventory_transactions (
        barbershop_id,
        product_id,
        variant_id,
        transaction_type,
        quantity,
        unit_cost,
        reason,
        appointment_id,
        service_id,
        employee_id,
        created_by_user_id
      ) VALUES (
        NEW.barbershop_id,
        v_item.product_id,
        v_item.variant_id,
        'OUT',
        v_item.quantity_per_service,
        v_item.cost_per_use,
        'Consumo automático - Serviço realizado',
        NEW.id,
        NEW.service_id,
        NEW.employee_id,
        NEW.client_profile_id -- or could be employee who confirmed
      );
      
      -- Update batch quantities (FIFO - First In First Out)
      -- This will deduct from oldest batches first
      DECLARE
        v_remaining NUMERIC := v_item.quantity_per_service;
        v_batch RECORD;
      BEGIN
        FOR v_batch IN
          SELECT id, quantity_available
          FROM inventory_batches
          WHERE product_id = v_item.product_id
            AND (v_item.variant_id IS NULL OR variant_id = v_item.variant_id)
            AND status = 'active'
            AND quantity_available > 0
          ORDER BY expiry_date NULLS LAST, created_at ASC
        LOOP
          IF v_remaining <= 0 THEN
            EXIT;
          END IF;
          
          IF v_batch.quantity_available >= v_remaining THEN
            -- This batch has enough
            UPDATE inventory_batches
            SET quantity_available = quantity_available - v_remaining
            WHERE id = v_batch.id;
            
            v_remaining := 0;
          ELSE
            -- Use all from this batch and continue
            UPDATE inventory_batches
            SET quantity_available = 0,
                status = 'depleted'
            WHERE id = v_batch.id;
            
            v_remaining := v_remaining - v_batch.quantity_available;
          END IF;
        END LOOP;
        
        -- If still remaining after all batches, log warning
        IF v_remaining > 0 THEN
          RAISE WARNING 'Insufficient stock for product % (variant %): missing % units', 
            v_item.product_id, v_item.variant_id, v_remaining;
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_process_service_consumption ON appointments;

CREATE TRIGGER trigger_process_service_consumption
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION process_service_consumption();

COMMENT ON FUNCTION calculate_product_total_volume IS 'Calcula volume/estoque total de um produto considerando variantes';
COMMENT ON FUNCTION suggest_optimal_purchase IS 'Sugere combinação ótima de compra para atingir estoque mínimo';
COMMENT ON FUNCTION process_service_consumption IS 'Processa consumo automático de produtos quando serviço é realizado';