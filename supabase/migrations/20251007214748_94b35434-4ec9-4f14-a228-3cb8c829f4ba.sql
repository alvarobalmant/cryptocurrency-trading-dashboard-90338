-- Create function to send webhook notifications
CREATE OR REPLACE FUNCTION notify_n8n_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url TEXT := 'https://webhook.servicosemautomacoes.shop/webhook/webhookgeral';
  payload JSONB;
BEGIN
  -- Build payload with event data
  payload := jsonb_build_object(
    'event_type', TG_OP,
    'table_name', TG_TABLE_NAME,
    'timestamp', NOW(),
    'data', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    'old_data', CASE
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END
  );

  -- Send webhook notification (async, won't block the transaction)
  PERFORM net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for appointments
DROP TRIGGER IF EXISTS notify_webhook_appointments_insert ON appointments;
CREATE TRIGGER notify_webhook_appointments_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_appointments_update ON appointments;
CREATE TRIGGER notify_webhook_appointments_update
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_appointments_delete ON appointments;
CREATE TRIGGER notify_webhook_appointments_delete
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Create triggers for client_profiles
DROP TRIGGER IF EXISTS notify_webhook_clients_insert ON client_profiles;
CREATE TRIGGER notify_webhook_clients_insert
  AFTER INSERT ON client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_clients_update ON client_profiles;
CREATE TRIGGER notify_webhook_clients_update
  AFTER UPDATE ON client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_clients_delete ON client_profiles;
CREATE TRIGGER notify_webhook_clients_delete
  AFTER DELETE ON client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Create triggers for employees
DROP TRIGGER IF EXISTS notify_webhook_employees_insert ON employees;
CREATE TRIGGER notify_webhook_employees_insert
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_employees_update ON employees;
CREATE TRIGGER notify_webhook_employees_update
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_employees_delete ON employees;
CREATE TRIGGER notify_webhook_employees_delete
  AFTER DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Create triggers for barbershops
DROP TRIGGER IF EXISTS notify_webhook_barbershops_insert ON barbershops;
CREATE TRIGGER notify_webhook_barbershops_insert
  AFTER INSERT ON barbershops
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_barbershops_update ON barbershops;
CREATE TRIGGER notify_webhook_barbershops_update
  AFTER UPDATE ON barbershops
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_barbershops_delete ON barbershops;
CREATE TRIGGER notify_webhook_barbershops_delete
  AFTER DELETE ON barbershops
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Create triggers for services
DROP TRIGGER IF EXISTS notify_webhook_services_insert ON services;
CREATE TRIGGER notify_webhook_services_insert
  AFTER INSERT ON services
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_services_update ON services;
CREATE TRIGGER notify_webhook_services_update
  AFTER UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_services_delete ON services;
CREATE TRIGGER notify_webhook_services_delete
  AFTER DELETE ON services
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Create triggers for payments
DROP TRIGGER IF EXISTS notify_webhook_payments_insert ON payments;
CREATE TRIGGER notify_webhook_payments_insert
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_payments_update ON payments;
CREATE TRIGGER notify_webhook_payments_update
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_payments_delete ON payments;
CREATE TRIGGER notify_webhook_payments_delete
  AFTER DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Create triggers for client_subscriptions
DROP TRIGGER IF EXISTS notify_webhook_subscriptions_insert ON client_subscriptions;
CREATE TRIGGER notify_webhook_subscriptions_insert
  AFTER INSERT ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_subscriptions_update ON client_subscriptions;
CREATE TRIGGER notify_webhook_subscriptions_update
  AFTER UPDATE ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_subscriptions_delete ON client_subscriptions;
CREATE TRIGGER notify_webhook_subscriptions_delete
  AFTER DELETE ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

-- Create triggers for whatsapp_connections
DROP TRIGGER IF EXISTS notify_webhook_whatsapp_insert ON whatsapp_connections;
CREATE TRIGGER notify_webhook_whatsapp_insert
  AFTER INSERT ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_whatsapp_update ON whatsapp_connections;
CREATE TRIGGER notify_webhook_whatsapp_update
  AFTER UPDATE ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();

DROP TRIGGER IF EXISTS notify_webhook_whatsapp_delete ON whatsapp_connections;
CREATE TRIGGER notify_webhook_whatsapp_delete
  AFTER DELETE ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_webhook();