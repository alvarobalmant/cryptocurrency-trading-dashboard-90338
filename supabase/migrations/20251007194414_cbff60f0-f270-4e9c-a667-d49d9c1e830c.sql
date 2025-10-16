-- Enable RLS on qrcodewhatsapp table
ALTER TABLE qrcodewhatsapp ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read QR codes
CREATE POLICY "Authenticated users can view QR codes"
ON qrcodewhatsapp
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to manage QR codes (for N8n webhooks)
CREATE POLICY "Service role can manage QR codes"
ON qrcodewhatsapp
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);