-- ============================================
-- Estrutura completa: analytics_snapshots + ai_insights
-- ============================================

-- Tabela analytics_snapshots
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'daily',
  
  cash_flow JSONB NOT NULL DEFAULT '{}'::jsonb,
  profitability JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  operational_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  revenue_by_source JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_methods JSONB NOT NULL DEFAULT '{}'::jsonb,
  employee_analytics JSONB NOT NULL DEFAULT '[]'::jsonb,
  historical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  employee_detailed_analytics JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_detailed_analytics JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_snapshot UNIQUE(barbershop_id, period_end, snapshot_type)
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_snapshots_barbershop ON analytics_snapshots(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_period ON analytics_snapshots(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured ON analytics_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_type ON analytics_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_employee_details ON analytics_snapshots USING GIN(employee_detailed_analytics);
CREATE INDEX IF NOT EXISTS idx_snapshots_client_details ON analytics_snapshots USING GIN(client_detailed_analytics);

-- RLS
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their analytics snapshots" ON analytics_snapshots;
CREATE POLICY "Owners can view their analytics snapshots"
  ON analytics_snapshots FOR SELECT
  USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Service role can manage snapshots" ON analytics_snapshots;
CREATE POLICY "Service role can manage snapshots"
  ON analytics_snapshots FOR ALL
  USING (true) WITH CHECK (true);

-- Tabela ai_insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES analytics_snapshots(id) ON DELETE CASCADE,
  
  insight_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  recommendations JSONB DEFAULT '[]'::jsonb,
  metrics_analyzed JSONB DEFAULT '{}'::jsonb,
  
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  potential_revenue_impact NUMERIC(10,2),
  potential_cost_savings NUMERIC(10,2),
  
  target_entity_type TEXT CHECK (target_entity_type IN ('employee', 'client', 'barbershop')),
  target_entity_id TEXT,
  
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_reason TEXT,
  
  action_taken BOOLEAN DEFAULT FALSE,
  action_taken_at TIMESTAMP WITH TIME ZONE,
  action_notes TEXT,
  
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices (sem predicates dinâmicos)
CREATE INDEX IF NOT EXISTS idx_insights_barbershop ON ai_insights(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_insights_snapshot ON ai_insights(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_insights_severity ON ai_insights(severity);
CREATE INDEX IF NOT EXISTS idx_insights_unread ON ai_insights(barbershop_id, read_at);
CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(insight_type, severity);
CREATE INDEX IF NOT EXISTS idx_insights_target ON ai_insights(barbershop_id, target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_insights_dismissed ON ai_insights(barbershop_id, dismissed);

-- RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their insights" ON ai_insights;
CREATE POLICY "Owners can view their insights"
  ON ai_insights FOR SELECT
  USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can update their insights" ON ai_insights;
CREATE POLICY "Owners can update their insights"
  ON ai_insights FOR UPDATE
  USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can delete their insights" ON ai_insights;
CREATE POLICY "Owners can delete their insights"
  ON ai_insights FOR DELETE
  USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Service role can insert insights" ON ai_insights;
CREATE POLICY "Service role can insert insights"
  ON ai_insights FOR INSERT
  WITH CHECK (true);