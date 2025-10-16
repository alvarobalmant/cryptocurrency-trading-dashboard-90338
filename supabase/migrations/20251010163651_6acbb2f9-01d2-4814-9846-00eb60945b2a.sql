-- Tornar o bucket 'commissions' público para permitir acesso aos PDFs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'commissions';

-- Adicionar RLS policies para controle de acesso aos objetos
-- Permitir que donos de barbearias vejam PDFs de suas comissões
CREATE POLICY "Owners can view their commission PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'commissions' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

-- Permitir que donos de barbearias façam upload de PDFs
CREATE POLICY "Owners can upload commission PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'commissions'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

-- Permitir que donos de barbearias atualizem seus PDFs
CREATE POLICY "Owners can update their commission PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'commissions'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

-- Permitir que donos de barbearias deletem seus PDFs
CREATE POLICY "Owners can delete their commission PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'commissions'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);