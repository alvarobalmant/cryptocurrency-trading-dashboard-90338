-- Create whatsapp_connections table
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  qr_code_base64 TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  connected_phone TEXT,
  evolution_instance_id TEXT,
  last_qr_generated_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbershop_id),
  UNIQUE(instance_name)
);

-- Indexes
CREATE INDEX idx_whatsapp_connections_barbershop ON whatsapp_connections(barbershop_id);
CREATE INDEX idx_whatsapp_connections_status ON whatsapp_connections(connection_status);

-- Enable RLS
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can view their connection"
  ON whatsapp_connections FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owners can manage their connection"
  ON whatsapp_connections FOR ALL
  USING (barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

-- Service role policy
CREATE POLICY "Service role can manage connections"
  ON whatsapp_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_connections;