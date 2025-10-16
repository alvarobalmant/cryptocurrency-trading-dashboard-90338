-- Create trigger for automatic service product consumption
-- This trigger will automatically deduct products from inventory when an appointment is marked as confirmed or completed

DROP TRIGGER IF EXISTS trigger_process_service_consumption ON appointments;

CREATE TRIGGER trigger_process_service_consumption
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION process_service_consumption();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_process_service_consumption ON appointments IS 
'Automatically deducts service products from inventory when appointment status changes to confirmed or completed';