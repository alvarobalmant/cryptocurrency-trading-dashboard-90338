-- Drop existing trigger first
DROP TRIGGER IF EXISTS process_service_consumption_trigger ON appointments;

-- Recreate the function with proper ml to units conversion
CREATE OR REPLACE FUNCTION public.process_service_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_item RECORD;
  v_product_unit_size NUMERIC;
  v_units_to_consume NUMERIC;
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
      -- Get the unit_size from product or variant
      IF v_item.variant_id IS NOT NULL THEN
        -- Get unit_size from variant
        SELECT unit_size INTO v_product_unit_size
        FROM product_variants
        WHERE id = v_item.variant_id;
      ELSE
        -- Get unit_size from product
        SELECT unit_size INTO v_product_unit_size
        FROM products
        WHERE id = v_item.product_id;
      END IF;
      
      -- Convert ml to units (quantity_per_service is in ml, need to divide by unit_size)
      -- Example: 2ml / 500ml = 0.004 units
      IF v_product_unit_size IS NOT NULL AND v_product_unit_size > 0 THEN
        v_units_to_consume := v_item.quantity_per_service / v_product_unit_size;
      ELSE
        -- Fallback: if no unit_size, assume quantity is already in units
        v_units_to_consume := v_item.quantity_per_service;
        RAISE WARNING 'Product % (variant %) has no unit_size, using quantity as units directly', 
          v_item.product_id, v_item.variant_id;
      END IF;
      
      RAISE LOG 'Converting consumption: %ml / %ml per unit = % units to consume', 
        v_item.quantity_per_service, v_product_unit_size, v_units_to_consume;
      
      -- Create inventory transaction for consumption (recording in ml for history)
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
        v_item.quantity_per_service, -- Keep in ml for historical record
        v_item.cost_per_use,
        'Consumo automático - Serviço realizado',
        NEW.id,
        NEW.service_id,
        NEW.employee_id,
        NEW.client_profile_id
      );
      
      -- Update batch quantities (FIFO - First In First Out)
      -- Deduct using the converted units
      DECLARE
        v_remaining NUMERIC := v_units_to_consume;
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
            
            RAISE LOG 'Deducted % units from batch % (had % units)', 
              v_remaining, v_batch.id, v_batch.quantity_available;
            
            v_remaining := 0;
          ELSE
            -- Use all from this batch and continue
            UPDATE inventory_batches
            SET quantity_available = 0
            WHERE id = v_batch.id;
            
            RAISE LOG 'Deducted all % units from batch %, still need % units', 
              v_batch.quantity_available, v_batch.id, (v_remaining - v_batch.quantity_available);
            
            v_remaining := v_remaining - v_batch.quantity_available;
          END IF;
        END LOOP;
        
        -- If still remaining after all batches, log warning
        IF v_remaining > 0 THEN
          RAISE WARNING 'Insufficient stock for product % (variant %): missing % units (%.2f ml)', 
            v_item.product_id, v_item.variant_id, v_remaining, (v_remaining * v_product_unit_size);
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER process_service_consumption_trigger
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION process_service_consumption();