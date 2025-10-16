-- Adicionar campos para salvar QR code PIX na tabela payments
ALTER TABLE public.payments 
ADD COLUMN qr_code_base64 TEXT,
ADD COLUMN qr_code TEXT;