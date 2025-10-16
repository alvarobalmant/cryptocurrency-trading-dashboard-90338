import { KpiCard } from '../KpiCard';
import { ChartCard } from '../ChartCard';
import { MiniTableCard } from '../MiniTableCard';
import { AlertBanner } from '../AlertBanner';
import { DollarSign, TrendingUp, Wallet, Heart } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { analyticsTooltips } from '@/lib/analytics-tooltips';

interface OverviewDashboardProps {
  analytics: ComprehensiveAnalytics;
}

export const OverviewDashboard = ({ analytics }: OverviewDashboardProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Calculate Financial Health Score (0-100)
  const calculateHealthScore = () => {
    const cashFlowScore = analytics.cashFlow.netCashFlow > 0 ? 30 : 0;
    const profitScore = analytics.profitability.netMargin > 20 ? 30 : (analytics.profitability.netMargin / 20) * 30;
    const growthScore = 20; // Simplified
    const runwayScore = analytics.cashFlow.runway > 3 ? 20 : (analytics.cashFlow.runway / 3) * 20;
    return Math.round(cashFlowScore + profitScore + growthScore + runwayScore);
  };

  const healthScore = calculateHealthScore();

  // Cash flow chart data using real historical data
  const cashFlowData = analytics.historicalData?.monthlyRevenue?.slice(-6).map(([month, revenue]) => {
    const costs = analytics.historicalData?.monthlyCosts?.find(([m]) => m === month)?.[1] || 0;
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthNum = parseInt(month.split('-')[1]) - 1;
    
    return {
      name: monthNames[monthNum],
      entrada: revenue,
      saida: costs,
      liquido: revenue - costs
    };
  }) || [
    { name: 'Atual', entrada: analytics.cashFlow.receivedRevenue, saida: analytics.cashFlow.paidCommissions + analytics.cashFlow.productCosts, liquido: analytics.cashFlow.netCashFlow }
  ];

  // P&L Waterfall data
  const plData = [
    { name: 'Receita', value: analytics.profitability.grossRevenue, fill: '#10B981' },
    { name: 'COGS', value: -analytics.profitability.cogs, fill: '#EF4444' },
    { name: 'Mão de Obra', value: -analytics.profitability.laborCosts, fill: '#F59E0B' },
    { name: 'OpEx', value: -analytics.profitability.operationalCosts, fill: '#3B82F6' },
    { name: 'Lucro Líquido', value: analytics.profitability.netProfit, fill: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {analytics.cashFlow.burnRate > analytics.cashFlow.receivedRevenue * 0.8 && (
        <AlertBanner
          severity="warning"
          title="Taxa de Queima Elevada"
          message="Suas despesas estão consumindo mais de 80% da receita. Considere otimizar custos."
          action="Ver Detalhes"
        />
      )}

      {/* Hero KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Saldo em Caixa"
          value={formatCurrency(analytics.cashFlow.cashOnHand)}
          change={cashFlowData.length >= 2 ? 
            ((cashFlowData[cashFlowData.length - 1].entrada - cashFlowData[cashFlowData.length - 2].entrada) / cashFlowData[cashFlowData.length - 2].entrada) * 100 
            : 0}
          trend={cashFlowData.length >= 2 && cashFlowData[cashFlowData.length - 1].entrada > cashFlowData[cashFlowData.length - 2].entrada ? "up" : "down"}
          icon={Wallet}
          color="green"
          subtitle="Dinheiro disponível"
          progress={cashFlowData.length >= 3 ? 
            (analytics.cashFlow.cashOnHand / (cashFlowData.slice(-3).reduce((sum, m) => sum + m.entrada, 0) / 3 * 1.2)) * 100 
            : (analytics.cashFlow.cashOnHand / 60000) * 100}
          helpContent={analyticsTooltips.cashOnHand}
        />

        <KpiCard
          title="Saldo Final Após Custos"
          value={formatCurrency(analytics.cashFlow.cashOnHand - (analytics.profitability.laborCosts - analytics.cashFlow.paidCommissions))}
          change={cashFlowData.length >= 2 ? 
            ((cashFlowData[cashFlowData.length - 1].liquido - cashFlowData[cashFlowData.length - 2].liquido) / Math.abs(cashFlowData[cashFlowData.length - 2].liquido || 1)) * 100 
            : 0}
          trend={cashFlowData.length >= 2 && cashFlowData[cashFlowData.length - 1].liquido > cashFlowData[cashFlowData.length - 2].liquido ? "up" : "down"}
          icon={DollarSign}
          color="blue"
          subtitle="Após comissões pendentes"
          helpContent="Saldo em caixa menos todas as comissões ainda não pagas (confirmadas e pendentes)"
        />

        <KpiCard
          title="Receita Recebida (Paga)"
          value={formatCurrency(analytics.cashFlow.receivedRevenue)}
          change={cashFlowData.length >= 2 ? 
            ((cashFlowData[cashFlowData.length - 1].entrada - cashFlowData[cashFlowData.length - 2].entrada) / cashFlowData[cashFlowData.length - 2].entrada) * 100 
            : 0}
          trend={cashFlowData.length >= 2 && cashFlowData[cashFlowData.length - 1].entrada > cashFlowData[cashFlowData.length - 2].entrada ? "up" : "down"}
          icon={TrendingUp}
          color="purple"
          subtitle={`A receber: ${formatCurrency(analytics.cashFlow.pendingRevenue)} | Futura: ${formatCurrency(analytics.cashFlow.futureRevenue)}`}
          progress={cashFlowData.length >= 3 ? 
            (analytics.cashFlow.receivedRevenue / (cashFlowData.slice(-3).reduce((sum, m) => sum + m.entrada, 0) / 3 * 1.2)) * 100 
            : (analytics.cashFlow.receivedRevenue / 60000) * 100}
          helpContent={analyticsTooltips.mrr}
        />

        <KpiCard
          title="Saúde Financeira"
          value={healthScore}
          icon={Heart}
          color={healthScore >= 70 ? 'green' : healthScore >= 50 ? 'orange' : 'red'}
          subtitle={healthScore >= 70 ? 'EXCELENTE' : healthScore >= 50 ? 'BOA' : 'ATENÇÃO'}
          helpContent={analyticsTooltips.financialHealth}
        />
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Fluxo de Caixa"
          subtitle="Entradas vs Saídas (Últimos 6 meses)"
          type="area"
          data={cashFlowData}
          dataKeys={[
            { key: 'entrada', color: '#10B981', name: 'Entradas' },
            { key: 'saida', color: '#EF4444', name: 'Saídas' },
            { key: 'liquido', color: '#3B82F6', name: 'Líquido' }
          ]}
          gradientFill
        />

        <ChartCard
          title="P&L Breakdown"
          subtitle="Receita até Lucro Líquido"
          type="bar"
          data={plData}
          dataKeys={[{ key: 'value', color: '#3B82F6', name: 'Valor' }]}
        />
      </div>

      {/* Revenue Breakdown */}
      <ChartCard
        title="Receita por Fonte"
        subtitle="Distribuição mensal de receitas"
        type="bar"
        data={[
          {
            name: 'Atual',
            Serviços: analytics.revenueBySource.services,
            Produtos: analytics.revenueBySource.products,
            Assinaturas: analytics.revenueBySource.subscriptions,
            Comandas: analytics.revenueBySource.tabs
          }
        ]}
        dataKeys={[
          { key: 'Serviços', color: '#3B82F6', name: 'Serviços' },
          { key: 'Produtos', color: '#10B981', name: 'Produtos' },
          { key: 'Assinaturas', color: '#8B5CF6', name: 'Assinaturas' },
          { key: 'Comandas', color: '#F59E0B', name: 'Comandas' }
        ]}
        height={250}
      />

      {/* Mini Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <MiniTableCard
          title="Top Métricas"
          columns={['Métrica', 'Valor']}
          data={[
            ['Clientes Únicos', analytics.clients.totalUniqueClients.toString()],
            ['CLV Médio', formatCurrency(analytics.clients.clv)],
            ['Taxa de Retenção', `${analytics.clients.retentionRate.toFixed(1)}%`],
            ['Agendamentos/Dia', analytics.operational.appointmentsPerDay.toFixed(1)],
            ['Receita/Hora', formatCurrency(analytics.operational.revenuePerHour)]
          ]}
        />

        <MiniTableCard
          title="Custos Principais"
          columns={['Item', 'Valor']}
          data={[
            ['Comissões Pagas', formatCurrency(analytics.cashFlow.paidCommissions)],
            ['Produtos', formatCurrency(analytics.cashFlow.productCosts)],
            ['Compras', formatCurrency(analytics.cashFlow.purchaseOrderCosts)],
            ['SaaS', formatCurrency(analytics.cashFlow.saasCosts)],
            ['Total Saídas', formatCurrency(analytics.cashFlow.paidCommissions + analytics.cashFlow.productCosts + analytics.cashFlow.purchaseOrderCosts + analytics.cashFlow.saasCosts)]
          ]}
        />

        <MiniTableCard
          title="Performance"
          columns={['Indicador', 'Status']}
          data={[
            ['Margem Bruta', `${analytics.profitability.grossMargin.toFixed(1)}%`],
            ['Margem Líquida', `${analytics.profitability.netMargin.toFixed(1)}%`],
            ['No-Show Rate', `${analytics.operational.noShowRate.toFixed(1)}%`],
            ['Cancelamentos', `${analytics.operational.cancellationRate.toFixed(1)}%`],
            ['Utilização', `${analytics.operational.employeeUtilization.toFixed(0)}%`]
          ]}
        />
      </div>
    </div>
  );
};
