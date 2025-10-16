-- Drop existing function
DROP FUNCTION IF EXISTS public.notify_n8n_webhook() CASCADE;

-- Recreate function with proper error handling and async approach
CREATE OR REPLACE FUNCTION public.notify_n8n_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  -- Send webhook notification asynchronously (won't block the transaction)
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload::text
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send webhook: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate all triggers
CREATE TRIGGER notify_n8n_on_appointments_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_appointments_update
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_appointments_delete
  AFTER DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_client_profiles_insert
  AFTER INSERT ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_client_profiles_update
  AFTER UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_client_profiles_delete
  AFTER DELETE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_employees_insert
  AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_employees_update
  AFTER UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_employees_delete
  AFTER DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_barbershops_insert
  AFTER INSERT ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_barbershops_update
  AFTER UPDATE ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_barbershops_delete
  AFTER DELETE ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_services_insert
  AFTER INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_services_update
  AFTER UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_services_delete
  AFTER DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_payments_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_payments_update
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_payments_delete
  AFTER DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_client_subscriptions_insert
  AFTER INSERT ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_client_subscriptions_update
  AFTER UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_client_subscriptions_delete
  AFTER DELETE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_whatsapp_connections_insert
  AFTER INSERT ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_whatsapp_connections_update
  AFTER UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();

CREATE TRIGGER notify_n8n_on_whatsapp_connections_delete
  AFTER DELETE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_webhook();