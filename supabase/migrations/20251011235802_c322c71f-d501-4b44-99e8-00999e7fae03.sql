-- Corrigir search_path da função validate_financial_analytics
CREATE OR REPLACE FUNCTION validate_financial_analytics()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar que campos obrigatórios existem
  IF NEW.financial_analytics IS NULL OR 
     NOT (NEW.financial_analytics ? 'revenue') OR
     NOT (NEW.financial_analytics ? 'costs') OR
     NOT (NEW.financial_analytics ? 'margins') OR
     NOT (NEW.financial_analytics ? 'cash_flow') OR
     NOT (NEW.financial_analytics ? 'payment_methods') OR
     NOT (NEW.financial_analytics ? 'metadata') THEN
    RAISE EXCEPTION 'financial_analytics deve conter todos os campos obrigatórios: revenue, costs, margins, cash_flow, payment_methods, metadata';
  END IF;
  
  RETURN NEW;
END;
$$;