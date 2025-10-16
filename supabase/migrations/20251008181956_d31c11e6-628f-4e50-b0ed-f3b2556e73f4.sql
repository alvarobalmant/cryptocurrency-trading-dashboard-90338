-- Fix the process_service_consumption function to NOT change batch status
-- Only update quantity_available to 0, keeping status as 'active'
CREATE OR REPLACE FUNCTION public.process_service_consumption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        NEW.client_profile_id
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
            -- FIXED: Only update quantity_available, keep status as 'active'
            -- The calculate_available_stock function will filter out batches with quantity_available = 0
            UPDATE inventory_batches
            SET quantity_available = 0
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
$function$;