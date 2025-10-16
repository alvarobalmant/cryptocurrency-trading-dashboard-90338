-- Fix search_path for update_chatwoot_updated_at function
DROP FUNCTION IF EXISTS update_chatwoot_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_chatwoot_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_chatwoot_inboxes_updated_at
  BEFORE UPDATE ON public.chatwoot_inboxes
  FOR EACH ROW
  EXECUTE FUNCTION update_chatwoot_updated_at();

CREATE TRIGGER update_chatwoot_users_updated_at
  BEFORE UPDATE ON public.chatwoot_users
  FOR EACH ROW
  EXECUTE FUNCTION update_chatwoot_updated_at();