-- ====================================
-- ANALYTICS SNAPSHOTS: CONSOLIDAÇÃO FINANCEIRA
-- ====================================
-- Remove campos financeiros dispersos e cria campo único financial_analytics

-- 1. Adicionar novo campo financial_analytics
ALTER TABLE analytics_snapshots 
ADD COLUMN IF NOT EXISTS financial_analytics jsonb DEFAULT '{}'::jsonb;

-- 2. Criar índice GIN para performance em queries JSON
CREATE INDEX IF NOT EXISTS idx_analytics_financial_analytics 
ON analytics_snapshots USING gin (financial_analytics);

-- 3. Adicionar comentários de documentação
COMMENT ON COLUMN analytics_snapshots.financial_analytics IS 'Dados financeiros consolidados incluindo receitas (confirmada, a receber, futura, perdida), custos, margens, fluxo de caixa, métodos de pagamento e métricas de rentabilidade';

-- 4. Estrutura esperada do financial_analytics:
-- {
--   "revenue": {
--     "received": numeric,         -- Receita confirmada e paga
--     "pending": numeric,          -- Receita confirmada mas pendente
--     "future": numeric,           -- Receita futura (agendamentos pendentes)
--     "lost": numeric,             -- Receita perdida (cancelamentos)
--     "by_source": {
--       "services": numeric,
--       "products": numeric,
--       "subscriptions": numeric,
--       "tabs": numeric
--     },
--     "monthly_history": [
--       {
--         "month": "YYYY-MM",
--         "total": numeric,
--         "by_source": {...}
--       }
--     ]
--   },
--   "costs": {
--     "commissions_paid": numeric,
--     "commissions_pending": numeric,
--     "products": numeric,
--     "purchase_orders": numeric,
--     "saas": numeric,
--     "total": numeric,
--     "distribution": {
--       "commissions_pct": numeric,
--       "products_pct": numeric,
--       "purchase_orders_pct": numeric,
--       "saas_pct": numeric
--     },
--     "monthly_history": [...]
--   },
--   "margins": {
--     "gross_profit": numeric,
--     "gross_margin": numeric,      -- Percentual
--     "net_profit": numeric,
--     "net_margin": numeric,         -- Percentual
--     "ebitda": numeric,
--     "monthly_history": [
--       {
--         "month": "YYYY-MM",
--         "gross_margin": numeric,
--         "net_margin": numeric,
--         "gross_profit": numeric,
--         "net_profit": numeric
--       }
--     ]
--   },
--   "cash_flow": {
--     "net_cash_flow": numeric,
--     "inflow": numeric,
--     "outflow": numeric,
--     "burn_rate": numeric,
--     "runway_months": numeric,
--     "subscription_mrr": numeric,
--     "monthly_history": [
--       {
--         "month": "YYYY-MM",
--         "inflow": numeric,
--         "outflow": numeric,
--         "net": numeric
--       }
--     ]
--   },
--   "payment_methods": {
--     "pix": {
--       "amount": numeric,
--       "count": integer,
--       "percentage": numeric
--     },
--     "card": {...},
--     "cash": {...},
--     "subscription": {...},
--     "total_amount": numeric,
--     "total_count": integer
--   },
--   "profitability": {
--     "gross_revenue": numeric,
--     "net_revenue": numeric,
--     "cogs": numeric,              -- Cost of goods sold
--     "labor_costs": numeric,
--     "operational_costs": numeric,
--     "roi": numeric,               -- Return on investment %
--     "profit_per_transaction": numeric
--   },
--   "metadata": {
--     "period_start": "YYYY-MM-DD",
--     "period_end": "YYYY-MM-DD",
--     "snapshot_type": "daily|weekly|monthly",
--     "captured_at": "timestamp",
--     "total_transactions": integer,
--     "data_quality_score": numeric
--   }
-- }

-- 5. Validação: Garantir que o campo não seja null
ALTER TABLE analytics_snapshots 
ALTER COLUMN financial_analytics SET NOT NULL;

-- 6. Criar função para validar estrutura do financial_analytics
CREATE OR REPLACE FUNCTION validate_financial_analytics()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para validação
DROP TRIGGER IF EXISTS trigger_validate_financial_analytics ON analytics_snapshots;
CREATE TRIGGER trigger_validate_financial_analytics
  BEFORE INSERT OR UPDATE ON analytics_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION validate_financial_analytics();