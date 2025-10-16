-- Add stock_control_mode and unit_size to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock_control_mode TEXT DEFAULT 'unit' CHECK (stock_control_mode IN ('unit', 'volume')),
ADD COLUMN IF NOT EXISTS unit_size NUMERIC;

COMMENT ON COLUMN products.stock_control_mode IS 'Define se o estoque é controlado por unidade ou volume agregado';
COMMENT ON COLUMN products.unit_size IS 'Tamanho de cada unidade quando não usa variantes (ex: 500 para um shampoo de 500ml)';