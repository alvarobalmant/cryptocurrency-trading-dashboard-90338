-- =====================================================
-- SUPREME PRODUCT MANAGEMENT SYSTEM - PHASE 2
-- RLS Policies e Database Functions
-- =====================================================

-- ============ ENABLE RLS ON ALL TABLES ============
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_product_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES - PRODUCTS ============
CREATE POLICY "Owners can manage products"
  ON public.products FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view products"
  ON public.products FOR SELECT
  USING (is_active_employee_of_barbershop(barbershop_id));

-- ============ RLS POLICIES - PRODUCT VARIANTS ============
CREATE POLICY "Owners can manage product variants"
  ON public.product_variants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_variants.product_id 
      AND is_barbershop_owner(p.barbershop_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_variants.product_id 
      AND is_barbershop_owner(p.barbershop_id)
  ));

CREATE POLICY "Employees can view product variants"
  ON public.product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_variants.product_id 
      AND is_active_employee_of_barbershop(p.barbershop_id)
  ));

-- ============ RLS POLICIES - SUPPLIERS ============
CREATE POLICY "Owners can manage suppliers"
  ON public.suppliers FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view suppliers"
  ON public.suppliers FOR SELECT
  USING (is_active_employee_of_barbershop(barbershop_id));

-- ============ RLS POLICIES - INVENTORY BATCHES ============
CREATE POLICY "Owners can manage inventory batches"
  ON public.inventory_batches FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = inventory_batches.product_id 
      AND is_barbershop_owner(p.barbershop_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = inventory_batches.product_id 
      AND is_barbershop_owner(p.barbershop_id)
  ));

CREATE POLICY "Employees can view inventory batches"
  ON public.inventory_batches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = inventory_batches.product_id 
      AND is_active_employee_of_barbershop(p.barbershop_id)
  ));

-- ============ RLS POLICIES - INVENTORY TRANSACTIONS ============
CREATE POLICY "Owners can view inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (is_active_employee_of_barbershop(barbershop_id));

CREATE POLICY "System can create inventory transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (true);

-- ============ RLS POLICIES - SERVICE PRODUCT ITEMS ============
CREATE POLICY "Owners can manage service product items"
  ON public.service_product_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_product_items.service_id 
      AND is_barbershop_owner(s.barbershop_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_product_items.service_id 
      AND is_barbershop_owner(s.barbershop_id)
  ));

CREATE POLICY "Employees can view service product items"
  ON public.service_product_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.services s 
    WHERE s.id = service_product_items.service_id 
      AND is_active_employee_of_barbershop(s.barbershop_id)
  ));

-- ============ RLS POLICIES - STOCK ALERTS ============
CREATE POLICY "Owners can manage stock alerts"
  ON public.stock_alerts FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view stock alerts"
  ON public.stock_alerts FOR SELECT
  USING (is_active_employee_of_barbershop(barbershop_id));

-- ============ RLS POLICIES - PURCHASE ORDERS ============
CREATE POLICY "Owners can manage purchase orders"
  ON public.purchase_orders FOR ALL
  USING (is_barbershop_owner(barbershop_id))
  WITH CHECK (is_barbershop_owner(barbershop_id));

CREATE POLICY "Employees can view purchase orders"
  ON public.purchase_orders FOR SELECT
  USING (is_active_employee_of_barbershop(barbershop_id));

-- ============ RLS POLICIES - PURCHASE ORDER ITEMS ============
CREATE POLICY "Owners can manage purchase order items"
  ON public.purchase_order_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = purchase_order_items.purchase_order_id 
      AND is_barbershop_owner(po.barbershop_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = purchase_order_items.purchase_order_id 
      AND is_barbershop_owner(po.barbershop_id)
  ));

CREATE POLICY "Employees can view purchase order items"
  ON public.purchase_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = purchase_order_items.purchase_order_id 
      AND is_active_employee_of_barbershop(po.barbershop_id)
  ));

-- ============ DATABASE FUNCTIONS ============

-- Function to calculate available stock
CREATE OR REPLACE FUNCTION calculate_available_stock(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_barbershop_id UUID DEFAULT NULL
) RETURNS TABLE(
  total_quantity NUMERIC,
  total_value NUMERIC,
  batch_count INTEGER,
  oldest_expiry DATE,
  weighted_avg_cost NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ib.quantity_available), 0) as total_quantity,
    COALESCE(SUM(ib.quantity_available * ib.unit_cost), 0) as total_value,
    COUNT(*)::INTEGER as batch_count,
    MIN(ib.expiry_date) as oldest_expiry,
    CASE 
      WHEN SUM(ib.quantity_available) > 0 
      THEN SUM(ib.quantity_available * ib.unit_cost) / SUM(ib.quantity_available)
      ELSE 0
    END as weighted_avg_cost
  FROM inventory_batches ib
  WHERE ib.product_id = p_product_id
    AND (p_variant_id IS NULL OR ib.variant_id = p_variant_id)
    AND ib.status = 'active'
    AND ib.quantity_available > 0;
END;
$$;

-- Function to generate product SKU
CREATE OR REPLACE FUNCTION generate_product_sku(
  p_barbershop_id UUID,
  p_product_name TEXT,
  p_product_type TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_counter INTEGER;
  v_sku TEXT;
BEGIN
  -- Define prefix based on product type
  v_prefix := CASE p_product_type
    WHEN 'consumable' THEN 'CON'
    WHEN 'retail' THEN 'RET'
    WHEN 'professional' THEN 'PRO'
    WHEN 'equipment' THEN 'EQP'
    ELSE 'PRD'
  END;
  
  -- Get next counter
  SELECT COALESCE(MAX(
    CASE 
      WHEN sku ~ ('^' || v_prefix || '[0-9]+$') 
      THEN SUBSTRING(sku FROM LENGTH(v_prefix) + 1)::INTEGER
      ELSE 0
    END
  ), 0) + 1 INTO v_counter
  FROM products
  WHERE barbershop_id = p_barbershop_id
    AND sku LIKE v_prefix || '%';
  
  v_sku := v_prefix || LPAD(v_counter::TEXT, 6, '0');
  
  RETURN v_sku;
END;
$$;

-- Function to check and create stock alerts
CREATE OR REPLACE FUNCTION check_and_create_stock_alerts(
  p_barbershop_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_stock RECORD;
  v_alerts_created INTEGER := 0;
BEGIN
  -- Check each product
  FOR v_product IN 
    SELECT id, name, min_stock_level, reorder_point, track_expiry
    FROM products
    WHERE barbershop_id = p_barbershop_id
      AND active = true
  LOOP
    -- Calculate current stock
    SELECT * INTO v_stock 
    FROM calculate_available_stock(v_product.id, NULL, p_barbershop_id);
    
    -- Low stock alert
    IF v_stock.total_quantity < v_product.min_stock_level THEN
      INSERT INTO stock_alerts (
        barbershop_id, product_id, alert_type, severity, alert_data
      ) VALUES (
        p_barbershop_id, v_product.id, 'LOW_STOCK', 'critical',
        jsonb_build_object(
          'current_stock', v_stock.total_quantity,
          'min_level', v_product.min_stock_level
        )
      )
      ON CONFLICT DO NOTHING;
      v_alerts_created := v_alerts_created + 1;
      
    -- Reorder point alert
    ELSIF v_stock.total_quantity < v_product.reorder_point THEN
      INSERT INTO stock_alerts (
        barbershop_id, product_id, alert_type, severity, alert_data
      ) VALUES (
        p_barbershop_id, v_product.id, 'REORDER', 'warning',
        jsonb_build_object(
          'current_stock', v_stock.total_quantity,
          'reorder_point', v_product.reorder_point
        )
      )
      ON CONFLICT DO NOTHING;
      v_alerts_created := v_alerts_created + 1;
    END IF;
    
    -- Expiry alerts (if tracking)
    IF v_product.track_expiry AND v_stock.oldest_expiry IS NOT NULL THEN
      -- Expired
      IF v_stock.oldest_expiry < CURRENT_DATE THEN
        INSERT INTO stock_alerts (
          barbershop_id, product_id, alert_type, severity, alert_data
        ) VALUES (
          p_barbershop_id, v_product.id, 'EXPIRED', 'critical',
          jsonb_build_object('expiry_date', v_stock.oldest_expiry)
        )
        ON CONFLICT DO NOTHING;
        v_alerts_created := v_alerts_created + 1;
        
      -- Expiring soon (within 30 days)
      ELSIF v_stock.oldest_expiry < (CURRENT_DATE + INTERVAL '30 days') THEN
        INSERT INTO stock_alerts (
          barbershop_id, product_id, alert_type, severity, alert_data
        ) VALUES (
          p_barbershop_id, v_product.id, 'EXPIRING_SOON', 'warning',
          jsonb_build_object(
            'expiry_date', v_stock.oldest_expiry,
            'days_until_expiry', (v_stock.oldest_expiry - CURRENT_DATE)
          )
        )
        ON CONFLICT DO NOTHING;
        v_alerts_created := v_alerts_created + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_alerts_created;
END;
$$;