-- Drop and recreate calculate_product_total_volume to fix decimal precision
DROP FUNCTION IF EXISTS public.calculate_product_total_volume(uuid, uuid);

CREATE OR REPLACE FUNCTION public.calculate_product_total_volume(p_product_id uuid, p_barbershop_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(total_units numeric, total_volume numeric, total_value numeric, variants jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uses_variants BOOLEAN;
  v_unit_type TEXT;
  v_unit_size NUMERIC;
BEGIN
  -- Get product info including unit_size
  SELECT uses_variants, unit_type, unit_size INTO v_uses_variants, v_unit_type, v_unit_size
  FROM products
  WHERE id = p_product_id;
  
  IF v_uses_variants THEN
    -- Calculate for products with variants
    RETURN QUERY
    SELECT 
      COALESCE(SUM(stock.total_quantity), 0) as total_units,
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
      stock.total_quantity as total_units,
      stock.total_quantity * COALESCE(v_unit_size, 1) as total_volume,
      stock.total_value,
      '[]'::jsonb as variants
    FROM calculate_available_stock(p_product_id, NULL, p_barbershop_id) stock;
  END IF;
END;
$function$;