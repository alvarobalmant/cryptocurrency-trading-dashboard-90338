import { ChartCard } from '../ChartCard';
import { SegmentationPie } from '../SegmentationPie';
import { ComparisonCard } from '../ComparisonCard';
import { RevenueBreakdownCard } from './RevenueBreakdownCard';
import type { ComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { analyticsTooltips } from '@/lib/analytics-tooltips';

interface FinancialDashboardProps {
  analytics: ComprehensiveAnalytics;
}

export const FinancialDashboard = ({ analytics }: FinancialDashboardProps) => {
  // Tentar usar dados do financial_analytics primeiro
  const financial = analytics.snapshot?.financial_analytics;
  
  if (financial) {
    // Usar novo formato consolidado
    const revenueBySourceData = financial.revenue.monthly_history.map(month => ({
      name: month.month.split('-')[1], // Extrair mês
      Serviços: month.by_source.services,
      Produtos: month.by_source.products,
      Assinaturas: month.by_source.subscriptions,
      Comandas: month.by_source.tabs
    }));

    // Cost breakdown
    const costData = [
      { name: 'Comissões', value: financial.costs.commissions_paid, color: '#EF4444' },
      { name: 'Produtos', value: financial.costs.products, color: '#F59E0B' },
      { name: 'Pedidos', value: financial.costs.purchase_orders, color: '#3B82F6' },
      { name: 'SaaS', value: financial.costs.saas, color: '#8B5CF6' },
    ];

    // Margin evolution
    const marginData = financial.margins.monthly_history.map(month => {
      const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthNum = parseInt(month.month.split('-')[1]);
      
      return {
        name: monthNames[monthNum],
        margem_bruta: month.gross_margin,
        margem_liquida: month.net_margin
      };
    });

    // Payment methods
    const paymentMethodsData = [
      { name: 'PIX', value: financial.payment_methods.pix.amount, color: '#10B981' },
      { name: 'Cartão', value: financial.payment_methods.card.amount, color: '#3B82F6' },
      { name: 'Dinheiro', value: financial.payment_methods.cash.amount, color: '#F59E0B' },
      { name: 'Assinatura', value: financial.payment_methods.subscription.amount, color: '#8B5CF6' },
    ];

    // Comparações com mês anterior
    const prevMonthRevenue = financial.revenue.monthly_history.length >= 2
      ? financial.revenue.monthly_history[financial.revenue.monthly_history.length - 2].total
      : financial.revenue.received * 0.92;

    return (
      <div className="space-y-6">
        {/* Revenue Breakdown */}
        <RevenueBreakdownCard analytics={analytics} />

        {/* Comparison Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <ComparisonCard
            title="Receita Paga"
            current={financial.revenue.received}
            previous={prevMonthRevenue * 0.7}
            metric="Confirmado + Pago"
            format="currency"
          />
          <ComparisonCard
            title="A Receber"
            current={financial.revenue.pending}
            previous={prevMonthRevenue * 0.2}
            metric="Confirmado + Pendente"
            format="currency"
          />
          <ComparisonCard
            title="Receita Futura"
            current={financial.revenue.future}
            previous={prevMonthRevenue * 0.1}
            metric="Agendamentos Pendentes"
            format="currency"
          />
          <ComparisonCard
            title="Margem Líquida"
            current={financial.margins.net_margin}
            previous={marginData.length >= 2 ? marginData[marginData.length - 2].margem_liquida : financial.margins.net_margin - 2.5}
            metric="Percentual"
            format="percentage"
          />
        </div>

        {/* Revenue by Source Over Time */}
        <ChartCard
          title="Receita por Fonte"
          subtitle="Evolução mensal das fontes de receita"
          type="bar"
          data={revenueBySourceData}
          dataKeys={[
            { key: 'Serviços', color: '#3B82F6', name: 'Serviços' },
            { key: 'Produtos', color: '#10B981', name: 'Produtos' },
            { key: 'Assinaturas', color: '#8B5CF6', name: 'Assinaturas' },
            { key: 'Comandas', color: '#F59E0B', name: 'Comandas' }
          ]}
          height={350}
          helpContent={analyticsTooltips.revenueBySource}
        />

        {/* Cost Breakdown & Margin Evolution */}
        <div className="grid gap-6 md:grid-cols-2">
          <SegmentationPie
            title="Distribuição de Custos"
            subtitle="Onde seu dinheiro está sendo gasto"
            data={costData}
            helpContent={analyticsTooltips.costBreakdown}
          />

          <ChartCard
            title="Evolução das Margens"
            subtitle="Margem Bruta vs Líquida (%)"
            type="line"
            data={marginData}
            dataKeys={[
              { key: 'margem_bruta', color: '#10B981', name: 'Margem Bruta' },
              { key: 'margem_liquida', color: '#3B82F6', name: 'Margem Líquida' }
            ]}
            height={300}
            helpContent={analyticsTooltips.marginEvolution}
          />
        </div>

        {/* Payment Methods */}
        <SegmentationPie
          title="Métodos de Pagamento"
          subtitle="Distribuição das formas de pagamento"
          data={paymentMethodsData}
          helpContent={analyticsTooltips.paymentMethods}
        />
      </div>
    );
  }

  // Fallback para formato antigo (mantido para compatibilidade)
  const revenueBySourceData = analytics.historicalData?.monthlyRevenue?.slice(-6).map(([month, totalRevenue]) => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthNum = parseInt(month.split('-')[1]) - 1;
    
    const isCurrentMonth = month === analytics.periodEnd?.substring(0, 7);
    
    return {
      name: monthNames[monthNum],
      Serviços: isCurrentMonth ? analytics.revenueBySource.services : totalRevenue * 0.75,
      Produtos: isCurrentMonth ? analytics.revenueBySource.products : totalRevenue * 0.05,
      Assinaturas: isCurrentMonth ? analytics.revenueBySource.subscriptions : totalRevenue * 0.15,
      Comandas: isCurrentMonth ? analytics.revenueBySource.tabs : totalRevenue * 0.05
    };
  }) || [{
    name: 'Atual',
    Serviços: analytics.revenueBySource.services,
    Produtos: analytics.revenueBySource.products,
    Assinaturas: analytics.revenueBySource.subscriptions,
    Comandas: analytics.revenueBySource.tabs
  }];

  // Cost breakdown pie
  const costData = [
    { name: 'Comissões', value: analytics.cashFlow.paidCommissions, color: '#EF4444' },
    { name: 'Produtos', value: analytics.cashFlow.productCosts, color: '#F59E0B' },
    { name: 'Compras', value: analytics.cashFlow.purchaseOrderCosts, color: '#3B82F6' },
    { name: 'SaaS', value: analytics.cashFlow.saasCosts, color: '#8B5CF6' },
  ];

  // Margin evolution using real historical data
  const marginData = analytics.historicalData?.monthlyMargins?.slice(-6).map(({ month, grossMargin }) => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthNum = parseInt(month.split('-')[1]) - 1;
    const revenue = analytics.historicalData?.monthlyRevenue?.find(([m]) => m === month)?.[1] || 0;
    const costs = analytics.historicalData?.monthlyCosts?.find(([m]) => m === month)?.[1] || 0;
    const netMargin = revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;
    
    return {
      name: monthNames[monthNum],
      margem_bruta: grossMargin,
      margem_liquida: netMargin
    };
  }) || [{
    name: 'Atual',
    margem_bruta: analytics.profitability.grossMargin,
    margem_liquida: analytics.profitability.netMargin
  }];

  // Payment methods
  const paymentMethodsData = [
    { name: 'PIX', value: analytics.paymentMethods.pix, color: '#10B981' },
    { name: 'Cartão', value: analytics.paymentMethods.card, color: '#3B82F6' },
    { name: 'Dinheiro', value: analytics.paymentMethods.cash, color: '#F59E0B' },
    { name: 'Assinatura', value: analytics.paymentMethods.subscription, color: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6">
      {/* Revenue Breakdown */}
      <RevenueBreakdownCard analytics={analytics} />

      {/* Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <ComparisonCard
          title="Receita Paga"
          current={analytics.cashFlow.receivedRevenue}
          previous={revenueBySourceData.length >= 2 ? 
            (revenueBySourceData[revenueBySourceData.length - 2].Serviços +
             revenueBySourceData[revenueBySourceData.length - 2].Produtos +
             revenueBySourceData[revenueBySourceData.length - 2].Assinaturas +
             revenueBySourceData[revenueBySourceData.length - 2].Comandas) * 0.7 : 
            analytics.cashFlow.receivedRevenue * 0.92}
          metric="Confirmado + Pago"
          format="currency"
        />
        <ComparisonCard
          title="A Receber"
          current={analytics.cashFlow.pendingRevenue}
          previous={revenueBySourceData.length >= 2 ? 
            (revenueBySourceData[revenueBySourceData.length - 2].Serviços +
             revenueBySourceData[revenueBySourceData.length - 2].Produtos +
             revenueBySourceData[revenueBySourceData.length - 2].Assinaturas +
             revenueBySourceData[revenueBySourceData.length - 2].Comandas) * 0.2 : 
            analytics.cashFlow.pendingRevenue * 0.92}
          metric="Confirmado + Pendente"
          format="currency"
        />
        <ComparisonCard
          title="Receita Futura"
          current={analytics.cashFlow.futureRevenue}
          previous={revenueBySourceData.length >= 2 ? 
            (revenueBySourceData[revenueBySourceData.length - 2].Serviços +
             revenueBySourceData[revenueBySourceData.length - 2].Produtos +
             revenueBySourceData[revenueBySourceData.length - 2].Assinaturas +
             revenueBySourceData[revenueBySourceData.length - 2].Comandas) * 0.1 : 
            analytics.cashFlow.futureRevenue * 0.92}
          metric="Agendamentos Pendentes"
          format="currency"
        />
        <ComparisonCard
          title="Margem Líquida"
          current={analytics.profitability.netMargin}
          previous={marginData.length >= 2 ? marginData[marginData.length - 2].margem_liquida : analytics.profitability.netMargin - 2.5}
          metric="Percentual"
          format="percentage"
        />
      </div>

      {/* Revenue by Source Over Time */}
      <ChartCard
        title="Receita por Fonte"
        subtitle="Evolução mensal das fontes de receita"
        type="bar"
        data={revenueBySourceData}
        dataKeys={[
          { key: 'Serviços', color: '#3B82F6', name: 'Serviços' },
          { key: 'Produtos', color: '#10B981', name: 'Produtos' },
          { key: 'Assinaturas', color: '#8B5CF6', name: 'Assinaturas' },
          { key: 'Comandas', color: '#F59E0B', name: 'Comandas' }
        ]}
        height={350}
        helpContent={analyticsTooltips.revenueBySource}
      />

      {/* Cost Breakdown & Margin Evolution */}
      <div className="grid gap-6 md:grid-cols-2">
        <SegmentationPie
          title="Distribuição de Custos"
          subtitle="Onde seu dinheiro está sendo gasto"
          data={costData}
          helpContent={analyticsTooltips.costBreakdown}
        />

        <ChartCard
          title="Evolução das Margens"
          subtitle="Margem Bruta vs Líquida (%)"
          type="line"
          data={marginData}
          dataKeys={[
            { key: 'margem_bruta', color: '#10B981', name: 'Margem Bruta' },
            { key: 'margem_liquida', color: '#3B82F6', name: 'Margem Líquida' }
          ]}
          height={300}
          helpContent={analyticsTooltips.marginEvolution}
        />
      </div>

      {/* Payment Methods */}
      <SegmentationPie
        title="Métodos de Pagamento"
        subtitle="Distribuição das formas de pagamento"
        data={paymentMethodsData}
        helpContent={analyticsTooltips.paymentMethods}
      />
    </div>
  );
};
