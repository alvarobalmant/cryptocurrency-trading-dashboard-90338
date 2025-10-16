-- Add WhatsApp Business Account ID column for proper webhook routing
ALTER TABLE barbershops 
ADD COLUMN whatsapp_business_account_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_barbershops_whatsapp_account 
ON barbershops(whatsapp_business_account_id);

COMMENT ON COLUMN barbershops.whatsapp_business_account_id IS 
'WhatsApp Business Account ID from Meta for mapping incoming webhooks to specific barbershops';