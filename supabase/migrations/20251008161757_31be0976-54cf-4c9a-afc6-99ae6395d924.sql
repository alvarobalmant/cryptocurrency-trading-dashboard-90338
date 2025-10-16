-- =====================================================
-- SUPREME PRODUCT MANAGEMENT SYSTEM - PHASE 1
-- Tabelas base do sistema de produtos
-- =====================================================

-- ============ 1. SUPPLIERS TABLE (deve vir primeiro) ============
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Informações básicas
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  
  -- Endereço
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Dados fiscais
  tax_id TEXT,
  
  -- Termos comerciais
  payment_terms TEXT,
  delivery_time_days INTEGER,
  minimum_order_value NUMERIC(10, 2),
  
  -- Notas
  notes TEXT,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ 2. PRODUCTS TABLE ============
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  
  -- Informações básicas
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  
  -- Tipo e classificação
  product_type TEXT NOT NULL CHECK (product_type IN ('consumable', 'retail', 'professional', 'equipment')),
  unit_type TEXT NOT NULL CHECK (unit_type IN ('unit', 'ml', 'g', 'kg', 'l')),
  
  -- Precificação
  default_cost NUMERIC(10, 2) DEFAULT 0,
  retail_price NUMERIC(10, 2) DEFAULT 0,
  
  -- Controle de estoque
  min_stock_level INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  
  -- Rastreamento avançado
  track_batches BOOLEAN DEFAULT false,
  track_expiry BOOLEAN DEFAULT false,
  shelf_life_days INTEGER DEFAULT 365,
  
  -- Dados customizados
  custom_attributes JSONB DEFAULT '{}'::jsonb,
  
  -- Imagens
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_product_sku UNIQUE(barbershop_id, sku),
  CONSTRAINT unique_product_barcode UNIQUE(barbershop_id, barcode)
);

-- ============ 3. PRODUCT VARIANTS TABLE ============
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Informações da variante
  variant_name TEXT NOT NULL,
  sku TEXT,
  
  -- Ajuste de preço
  price_adjustment NUMERIC(10, 2) DEFAULT 0,
  
  -- Atributos específicos
  attributes JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_variant_sku UNIQUE(product_id, sku)
);

-- ============ 4. PURCHASE ORDERS TABLE ============
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  
  -- Número do pedido
  order_number TEXT NOT NULL,
  
  -- Datas
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Valores
  subtotal NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  shipping_cost NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'received', 'cancelled')),
  
  -- Notas
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_order_number UNIQUE(barbershop_id, order_number)
);

-- ============ 5. INVENTORY BATCHES TABLE ============
CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  
  -- Informações do lote
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  
  -- Quantidades
  quantity_received NUMERIC(10, 3) NOT NULL,
  quantity_available NUMERIC(10, 3) NOT NULL,
  
  -- Custo unitário
  unit_cost NUMERIC(10, 2) NOT NULL,
  
  -- Fornecedor e pedido
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  
  -- Status do lote
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'recalled')),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT positive_quantities CHECK (quantity_received >= 0 AND quantity_available >= 0),
  CONSTRAINT available_lte_received CHECK (quantity_available <= quantity_received)
);

-- ============ 6. PURCHASE ORDER ITEMS TABLE ============
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  
  -- Quantidades
  quantity_ordered NUMERIC(10, 3) NOT NULL,
  quantity_received NUMERIC(10, 3) DEFAULT 0,
  
  -- Preços
  unit_cost NUMERIC(10, 2) NOT NULL,
  total_cost NUMERIC(10, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  
  -- Lote gerado ao receber
  batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_quantities_po CHECK (quantity_ordered > 0 AND quantity_received >= 0),
  CONSTRAINT received_lte_ordered CHECK (quantity_received <= quantity_ordered)
);

-- ============ 7. INVENTORY TRANSACTIONS TABLE ============
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
  
  -- Tipo de transação
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'SERVICE_CONSUMPTION')),
  
  -- Quantidade (negativa para saída)
  quantity NUMERIC(10, 3) NOT NULL,
  unit_cost NUMERIC(10, 2),
  
  -- Motivo
  reason TEXT,
  
  -- Relacionamentos
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Metadados adicionais
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id)
);

-- ============ 8. SERVICE PRODUCT ITEMS TABLE ============
CREATE TABLE IF NOT EXISTS public.service_product_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  
  -- Quantidade consumida por serviço
  quantity_per_service NUMERIC(10, 3) NOT NULL,
  unit TEXT NOT NULL,
  
  -- Configurações
  is_optional BOOLEAN DEFAULT false,
  
  -- Custo calculado
  cost_per_use NUMERIC(10, 2),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_service_product UNIQUE(service_id, product_id, variant_id),
  CONSTRAINT positive_quantity CHECK (quantity_per_service > 0)
);

-- ============ 9. STOCK ALERTS TABLE ============
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  
  -- Tipo e severidade
  alert_type TEXT NOT NULL CHECK (alert_type IN ('LOW_STOCK', 'EXPIRING_SOON', 'EXPIRED', 'REORDER', 'INSUFFICIENT_STOCK')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Dados do alerta
  alert_data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES FOR PERFORMANCE ============
CREATE INDEX IF NOT EXISTS idx_products_barbershop ON public.products(barbershop_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(barbershop_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON public.inventory_batches(product_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON public.inventory_batches(expiry_date) WHERE status = 'active' AND expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_barbershop ON public.inventory_transactions(barbershop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON public.inventory_transactions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_appointment ON public.inventory_transactions(appointment_id) WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_products_service ON public.service_product_items(service_id);
CREATE INDEX IF NOT EXISTS idx_service_products_product ON public.service_product_items(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_barbershop ON public.stock_alerts(barbershop_id) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON public.stock_alerts(product_id) WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_barbershop ON public.purchase_orders(barbershop_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_barbershop ON public.suppliers(barbershop_id) WHERE active = true;

-- ============ UPDATE TRIGGERS ============
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_products_timestamp
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

CREATE TRIGGER trigger_update_product_variants_timestamp
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

CREATE TRIGGER trigger_update_inventory_batches_timestamp
  BEFORE UPDATE ON public.inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

CREATE TRIGGER trigger_update_purchase_orders_timestamp
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

CREATE TRIGGER trigger_update_suppliers_timestamp
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();