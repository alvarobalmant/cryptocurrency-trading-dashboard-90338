import { useState, useMemo } from 'react';
import { KpiCard } from '../KpiCard';
import { ChartCard } from '../ChartCard';
import { HeatmapChart } from '../HeatmapChart';
import { SegmentationPie } from '../SegmentationPie';
import { PremiumSegmentCard } from '../PremiumSegmentCard';
import { AlertBanner } from '../AlertBanner';
import { Users, DollarSign, TrendingUp, AlertTriangle, Crown, Repeat, Sparkles, User, Calendar, Phone, Star, TrendingDown, UserX, UserPlus } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/hooks/useComprehensiveAnalytics';
import { useClientAnalytics } from '@/hooks/useClientAnalytics';
import { useVisitorAnalytics } from '@/hooks/useVisitorAnalytics';
import { useSegmentMetrics } from '@/hooks/useSegmentMetrics';
import { analyticsTooltips } from '@/lib/analytics-tooltips';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ClientDashboardProps {
  analytics: ComprehensiveAnalytics;
  barbershopId?: string;
  startDate?: string;
  endDate?: string;
}

export const ClientDashboard = ({ analytics, barbershopId, startDate, endDate }: ClientDashboardProps) => {
  const [sortBy, setSortBy] = useState<'ltv' | 'appointments' | 'churn' | 'lastVisit'>('ltv');
  const [filterSegment, setFilterSegment] = useState<'all' | 'vip' | 'regular' | 'new' | 'at-risk'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllClients, setShowAllClients] = useState(false);
  
  // Visitor states
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'recurring' | 'one_time' | 'high_potential'>('all');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [showAllVisitors, setShowAllVisitors] = useState(false);

  // Fetch detailed client analytics
  const { data: clientAnalytics, isLoading: loadingClients } = useClientAnalytics({
    barbershopId: barbershopId || '',
    startDate,
    endDate
  });

  // Fetch visitor analytics
  const { data: visitorData, isLoading: loadingVisitors } = useVisitorAnalytics({
    barbershopId: barbershopId || '',
    startDate,
    endDate
  });

  // Fetch REAL segment metrics from SQL
  const { data: segmentMetrics } = useSegmentMetrics(
    barbershopId || '',
    analytics.periodStart,
    analytics.periodEnd
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Client segmentation - DADOS REAIS da SQL function
  const segmentationData = [
    { 
      name: 'VIP', 
      value: segmentMetrics?.vip?.total_revenue || 0, 
      color: '#8B5CF6' 
    },
    { 
      name: 'Regulares', 
      value: segmentMetrics?.regular?.total_revenue || 0, 
      color: '#3B82F6' 
    },
    { 
      name: 'Novos', 
      value: segmentMetrics?.new?.total_revenue || 0, 
      color: '#10B981' 
    },
  ];

  // Retention curve - using real cohort data
  const retentionData = analytics.historicalData?.cohorts?.[0]?.retentionByMonth?.map((taxa, index) => ({
    name: `Mês ${index + 1}`,
    taxa
  })) || [
    { name: 'Mês 1', taxa: 100 },
    { name: 'Mês 2', taxa: analytics.clients.retentionRate * 0.9 },
    { name: 'Mês 3', taxa: analytics.clients.retentionRate * 0.8 },
    { name: 'Mês 4', taxa: analytics.clients.retentionRate * 0.7 },
    { name: 'Mês 5', taxa: analytics.clients.retentionRate * 0.65 },
    { name: 'Mês 6', taxa: analytics.clients.retentionRate * 0.6 },
  ];

  // Cohort analysis - Heatmap format
  const cohortHeatmapData = analytics.historicalData?.cohorts?.slice(-4).map((cohort) => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const yearShort = cohort.month.split('-')[0].slice(-2);
    const monthNum = parseInt(cohort.month.split('-')[1]) - 1;
    const cohortName = `${monthNames[monthNum]}/${yearShort}`;
    
    // Criar array de retenções com Mês 0 sempre 100%
    const retentions: (number | null)[] = [100]; // Mês 0 é sempre 100%
    
    // Adicionar os meses subsequentes (até 4 meses após o inicial)
    for (let i = 0; i < 4; i++) {
      const value = cohort.retentionByMonth[i + 1];
      retentions.push(value !== undefined ? value : null);
    }
    
    return {
      cohortName,
      retentions: retentions.slice(0, 5) // Mês 0, 1, 2, 3, 4
    };
  }) || [];

  const monthLabels = ['Mês 0', 'Mês 1', 'Mês 2', 'Mês 3', 'Mês 4'];

  // Calculate percentage changes from historical data
  const clvChange = analytics.historicalData?.monthlyCLV && analytics.historicalData.monthlyCLV.length >= 2 ? 
    ((analytics.clients.clv - analytics.historicalData.monthlyCLV[analytics.historicalData.monthlyCLV.length - 2][1]) / 
     Math.abs(analytics.historicalData.monthlyCLV[analytics.historicalData.monthlyCLV.length - 2][1])) * 100 
    : 0;
    
  const cacChange = analytics.historicalData?.monthlyCAC && analytics.historicalData.monthlyCAC.length >= 2 ?
    ((analytics.clients.cac - analytics.historicalData.monthlyCAC[analytics.historicalData.monthlyCAC.length - 2][1]) /
     Math.abs(analytics.historicalData.monthlyCAC[analytics.historicalData.monthlyCAC.length - 2][1])) * 100
    : 0;
    
  const retentionChange = analytics.historicalData?.cohorts && analytics.historicalData.cohorts.length >= 2 ?
    ((analytics.clients.retentionRate - (analytics.historicalData.cohorts[analytics.historicalData.cohorts.length - 2]?.retentionByMonth[0] || analytics.clients.retentionRate)) /
     Math.abs(analytics.historicalData.cohorts[analytics.historicalData.cohorts.length - 2]?.retentionByMonth[0] || analytics.clients.retentionRate)) * 100
    : 0;

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    if (!clientAnalytics?.clients) return [];

    let filtered = clientAnalytics.clients;

    // Apply segment filter
    if (filterSegment !== 'all') {
      filtered = filtered.filter(client => {
        if (filterSegment === 'vip') return client.totalAppointments >= 10;
        if (filterSegment === 'regular') return client.totalAppointments >= 3 && client.totalAppointments < 10;
        if (filterSegment === 'new') return client.totalAppointments < 3;
        if (filterSegment === 'at-risk') return client.churnRisk > 70;
        return true;
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.clientName.toLowerCase().includes(query) ||
        client.clientPhone.includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'ltv') return b.lifetimeValue - a.lifetimeValue;
      if (sortBy === 'appointments') return b.totalAppointments - a.totalAppointments;
      if (sortBy === 'churn') return b.churnRisk - a.churnRisk;
      if (sortBy === 'lastVisit') {
        const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return sorted;
  }, [clientAnalytics, filterSegment, searchQuery, sortBy]);

  const displayedClients = showAllClients ? filteredAndSortedClients : filteredAndSortedClients.slice(0, 10);

  // Filter and sort visitors
  const filteredAndSortedVisitors = useMemo(() => {
    if (!visitorData?.visitors) return [];

    let filtered = visitorData.visitors;

    // Apply visitor filter
    if (visitorFilter !== 'all') {
      filtered = filtered.filter(visitor => {
        if (visitorFilter === 'recurring') return visitor.isRecurring;
        if (visitorFilter === 'one_time') return !visitor.isRecurring;
        if (visitorFilter === 'high_potential') return visitor.conversionPotential === 'high';
        return true;
      });
    }

    // Apply search filter
    if (visitorSearch) {
      const query = visitorSearch.toLowerCase();
      filtered = filtered.filter(visitor =>
        visitor.visitorName.toLowerCase().includes(query) ||
        visitor.visitorPhone.includes(query)
      );
    }

    // Sort by totalSpent descending
    return [...filtered].sort((a, b) => b.totalSpent - a.totalSpent);
  }, [visitorData, visitorFilter, visitorSearch]);

  const displayedVisitors = showAllVisitors ? filteredAndSortedVisitors : filteredAndSortedVisitors.slice(0, 10);

  const handleConvertVisitor = (visitor: any) => {
    console.log('Convert visitor:', visitor);
    // TODO: Implementar modal de conversão
  };

  const getSegmentBadge = (client: any) => {
    if (client.totalAppointments >= 10) {
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">VIP</Badge>;
    }
    if (client.totalAppointments >= 3) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Regular</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Novo</Badge>;
  };

  const getRiskBadge = (churnRisk: number) => {
    if (churnRisk > 70) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Alto Risco</Badge>;
    }
    if (churnRisk > 50) {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1"><AlertTriangle className="w-3 h-3" />Risco Médio</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Alert for at-risk clients */}
      {analytics.clients.atRiskClients > 0 && (
        <AlertBanner
          severity="warning"
          title="Clientes em Risco"
          message={`${analytics.clients.atRiskClients} clientes não agendam há mais de 60 dias. Considere uma campanha de reativação.`}
          action="Ver Lista"
        />
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Lifetime Value (CLV)"
          value={formatCurrency(analytics.clients.clv)}
          change={clvChange}
          trend={clvChange > 0 ? "up" : "down"}
          icon={DollarSign}
          color="purple"
          subtitle="Valor médio do cliente"
          helpContent={analyticsTooltips.clv}
        />

        <KpiCard
          title="Custo de Aquisição (CAC)"
          value={formatCurrency(analytics.clients.cac)}
          change={cacChange}
          trend={cacChange < 0 ? "up" : cacChange > 0 ? "down" : "neutral"}
          icon={TrendingUp}
          color="green"
          subtitle={`Ratio CLV/CAC: ${analytics.clients.ltv_cac_ratio.toFixed(1)}x`}
          helpContent={analyticsTooltips.cac}
        />

        <KpiCard
          title="Taxa de Retenção"
          value={`${analytics.clients.retentionRate.toFixed(1)}%`}
          change={retentionChange}
          trend={retentionChange > 0 ? "up" : retentionChange < 0 ? "down" : "neutral"}
          icon={Users}
          color="blue"
          subtitle="Clientes que voltam"
          helpContent={analyticsTooltips.retention}
        />

        <KpiCard
          title="Clientes em Risco"
          value={analytics.clients.atRiskClients}
          icon={AlertTriangle}
          color="red"
          subtitle="60+ dias sem agendar"
          helpContent={analyticsTooltips.atRiskClients}
        />
      </div>

      {/* Client Segmentation - Premium Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Segmentação de Clientes</h2>
            <p className="text-muted-foreground">Análise detalhada por perfil de valor e comportamento</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* VIP Segment */}
          <PremiumSegmentCard
            title="VIP Elite"
            description="Seus clientes mais valiosos e fiéis"
            criteria="10+ visitas confirmadas • Baseado em receita real"
            icon={Crown}
            color="purple"
            priority="high"
            metrics={{
              clv: segmentMetrics?.vip?.avg_clv || 0,
              clientCount: segmentMetrics?.vip?.client_count || 0,
              avgFrequency: segmentMetrics?.vip?.avg_frequency || 0,
              avgTicket: segmentMetrics?.vip?.avg_ticket || 0,
              lastVisitAvg: segmentMetrics?.vip?.avg_days_since_visit || 0,
              totalRevenue: segmentMetrics?.vip?.total_revenue || 0,
              percentageOfTotal: analytics.clients.totalUniqueClients > 0
                ? ((segmentMetrics?.vip?.client_count || 0) / analytics.clients.totalUniqueClients) * 100
                : 0
            }}
            actionInsight="Estes são seus embaixadores. Ofereça programa de fidelidade premium, atendimento VIP e benefícios exclusivos para mantê-los."
          />

          {/* Regular Segment */}
          <PremiumSegmentCard
            title="Regulares"
            description="Base sólida e recorrente"
            criteria="3-9 visitas confirmadas • CLV real médio"
            icon={Repeat}
            color="blue"
            priority="medium"
            metrics={{
              clv: segmentMetrics?.regular?.avg_clv || 0,
              clientCount: segmentMetrics?.regular?.client_count || 0,
              avgFrequency: segmentMetrics?.regular?.avg_frequency || 0,
              avgTicket: segmentMetrics?.regular?.avg_ticket || 0,
              lastVisitAvg: segmentMetrics?.regular?.avg_days_since_visit || 0,
              totalRevenue: segmentMetrics?.regular?.total_revenue || 0,
              percentageOfTotal: analytics.clients.totalUniqueClients > 0
                ? ((segmentMetrics?.regular?.client_count || 0) / analytics.clients.totalUniqueClients) * 100
                : 0
            }}
            actionInsight="Oportunidade de upgrade! Implemente campanhas de upsell, indicações recompensadas e serviços premium para elevar ao VIP."
          />

          {/* New Segment */}
          <PremiumSegmentCard
            title="Novos Clientes"
            description="Potencial não explorado"
            criteria="1-2 visitas • Foco em retenção"
            icon={Sparkles}
            color="green"
            priority="medium"
            metrics={{
              clv: segmentMetrics?.new?.avg_clv || 0,
              clientCount: segmentMetrics?.new?.client_count || 0,
              avgFrequency: segmentMetrics?.new?.avg_frequency || 0,
              avgTicket: segmentMetrics?.new?.avg_ticket || 0,
              lastVisitAvg: segmentMetrics?.new?.avg_days_since_visit || 0,
              totalRevenue: segmentMetrics?.new?.total_revenue || 0,
              percentageOfTotal: analytics.clients.totalUniqueClients > 0
                ? ((segmentMetrics?.new?.client_count || 0) / analytics.clients.totalUniqueClients) * 100
                : 0
            }}
            actionInsight="Foco em retenção! Crie jornada de boas-vindas, ofertas de retorno (2ª visita com desconto) e acompanhamento pós-serviço."
          />
        </div>

        {/* Visualization Summary */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <SegmentationPie
            title="Distribuição de Valor"
            subtitle="Receita total por segmento"
            data={segmentationData}
            helpContent={analyticsTooltips.clientSegmentation}
          />

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Insights Estratégicos</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Crown className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Regra 80/20 (Pareto)</p>
                  <p className="text-xs text-muted-foreground">
                    {((analytics.clients.vipClients * (segmentMetrics?.vip?.avg_clv || 0) / 
                      (analytics.clients.vipClients * (segmentMetrics?.vip?.avg_clv || 0) + 
                       analytics.clients.returningClients * (segmentMetrics?.regular?.avg_clv || 0) + 
                       analytics.clients.newClients * (segmentMetrics?.new?.avg_clv || 0))) * 100).toFixed(0)}% 
                    da receita vem dos VIPs ({((analytics.clients.vipClients / analytics.clients.totalUniqueClients) * 100).toFixed(0)}% dos clientes)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Repeat className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Potencial de Crescimento</p>
                  <p className="text-xs text-muted-foreground">
                    Se {Math.floor(analytics.clients.returningClients * 0.3)} clientes regulares virarem VIP, 
                    receita aumenta em {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Math.floor(analytics.clients.returningClients * 0.3) * ((segmentMetrics?.vip?.avg_clv || 0) - (segmentMetrics?.regular?.avg_clv || 0))
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <Sparkles className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Taxa de Conversão Novos → Regulares</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.clients.newClients > 0 
                      ? ((analytics.clients.returningClients / (analytics.clients.returningClients + analytics.clients.newClients)) * 100).toFixed(1)
                      : '0'}% dos novos clientes estão se tornando regulares
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retention Curve */}
      <ChartCard
        title="Curva de Retenção"
        subtitle="Taxa de retenção ao longo do tempo"
        type="line"
        data={retentionData}
        dataKeys={[{ key: 'taxa', color: '#3B82F6', name: 'Taxa de Retenção (%)' }]}
        height={300}
        helpContent={analyticsTooltips.retentionCurve}
        valueFormat="percentage"
      />

      {/* Cohort Analysis - Heatmap */}
      <HeatmapChart
        title="Análise de Cohort"
        subtitle="Taxa de retenção por cohort ao longo dos meses"
        data={cohortHeatmapData}
        monthLabels={monthLabels}
        helpContent={analyticsTooltips.cohortAnalysis}
      />

      <Separator className="my-8" />

      {/* Individual Clients Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Análise Individual de Clientes</h2>
            <p className="text-muted-foreground">Métricas detalhadas por cliente</p>
          </div>
          {!loadingClients && clientAnalytics && (
            <Badge variant="outline" className="text-sm">
              {filteredAndSortedClients.length} cliente{filteredAndSortedClients.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterSegment} onValueChange={(v: any) => setFilterSegment(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Segmentos</SelectItem>
                  <SelectItem value="vip">VIP (10+ visitas)</SelectItem>
                  <SelectItem value="regular">Regulares (3-9 visitas)</SelectItem>
                  <SelectItem value="new">Novos (1-2 visitas)</SelectItem>
                  <SelectItem value="at-risk">Em Risco (&gt;70%)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ltv">Maior LTV</SelectItem>
                  <SelectItem value="appointments">Mais Visitas</SelectItem>
                  <SelectItem value="churn">Maior Risco</SelectItem>
                  <SelectItem value="lastVisit">Última Visita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Client List */}
        {loadingClients ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Carregando dados dos clientes...</p>
              </div>
            </CardContent>
          </Card>
        ) : !clientAnalytics?.clients || filteredAndSortedClients.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-2">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterSegment !== 'all' 
                    ? 'Nenhum cliente encontrado com os filtros aplicados' 
                    : 'Nenhum dado de cliente disponível para o período'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {displayedClients.map((client) => (
                <Card key={client.clientProfileId} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="grid gap-6 md:grid-cols-[1fr,auto]">
                      {/* Client Info */}
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{client.clientName}</h3>
                              {getSegmentBadge(client)}
                              {getRiskBadge(client.churnRisk)}
                              {client.hasActiveSubscription && (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Assinante
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.clientPhone}
                              </span>
                              {client.lastVisit && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Última visita: {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Lifetime Value</p>
                            <p className="text-lg font-bold text-primary">{formatCurrency(client.lifetimeValue)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Total de Visitas</p>
                            <p className="text-lg font-bold">{client.totalAppointments}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Ticket Médio</p>
                            <p className="text-lg font-bold">{formatCurrency(client.averageTicket)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Frequência</p>
                            <p className="text-lg font-bold">{client.visitFrequency.toFixed(0)} dias</p>
                          </div>
                        </div>
                      </div>

                      {/* Risk & Retention Metrics */}
                      <div className="flex flex-col items-end justify-between gap-4 min-w-[200px]">
                        <div className="text-right space-y-2">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Risco de Churn</p>
                            <div className="flex items-center gap-2 justify-end">
                              <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    client.churnRisk > 70 ? 'bg-red-500' : 
                                    client.churnRisk > 50 ? 'bg-yellow-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${client.churnRisk}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold">{client.churnRisk.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Taxa de Retenção</p>
                            <p className="text-sm font-semibold">{client.retentionRate.toFixed(0)}%</p>
                          </div>
                          {client.npsScore !== null && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">NPS Score</p>
                              <div className="flex items-center gap-1 justify-end">
                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                <span className="text-sm font-semibold">{client.npsScore.toFixed(1)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {client.daysSinceLastVisit === 0 ? (
                            <span className="text-green-600">Visitou hoje</span>
                          ) : client.daysSinceLastVisit === 1 ? (
                            <span>Visitou ontem</span>
                          ) : (
                            <span>{client.daysSinceLastVisit} dias sem visitar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Show More/Less Button */}
            {filteredAndSortedClients.length > 10 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAllClients(!showAllClients)}
                  className="gap-2"
                >
                  {showAllClients ? (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      Mostrar Menos
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Mostrar Todos ({filteredAndSortedClients.length - 10} restantes)
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Separator className="my-8" />

      {/* VISITORS SECTION */}
      <div className="space-y-6">
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-600" />
                <CardTitle>Clientes Visitantes (Walk-in)</CardTitle>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                {visitorData?.visitors.length || 0} visitantes
              </Badge>
            </div>
            <CardDescription>
              Clientes que fizeram agendamentos mas não têm cadastro no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ALERT */}
            {visitorData && visitorData.metrics.conversionOpportunities > 0 && (
              <Alert className="mb-4 border-orange-300 bg-orange-50">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-900">Oportunidade de Conversão</AlertTitle>
                <AlertDescription className="text-orange-800">
                  {visitorData.metrics.conversionOpportunities} visitantes com alto potencial 
                  podem ser convertidos em clientes cadastrados para melhor fidelização.
                  <br />
                  <strong>Agendamentos de visitantes:</strong> {visitorData.metrics.totalAppointments} total
                  {' '}({visitorData.metrics.appointmentsShare.toFixed(1)}% de todos agendamentos)
                </AlertDescription>
              </Alert>
            )}

            {/* FILTERS */}
            <div className="flex gap-2 mb-4">
              <Select value={visitorFilter} onValueChange={(v: any) => setVisitorFilter(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar visitantes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os visitantes</SelectItem>
                  <SelectItem value="recurring">Recorrentes (2+ visitas)</SelectItem>
                  <SelectItem value="one_time">Primeira visita</SelectItem>
                  <SelectItem value="high_potential">Alto potencial</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Buscar por telefone ou nome..."
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {/* VISITOR LIST BY STATUS */}
            {loadingVisitors ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando visitantes...
              </div>
            ) : displayedVisitors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum visitante encontrado
              </div>
            ) : (
              <div className="space-y-6">
                {/* VISITANTES COM AGENDAMENTOS CONFIRMADOS */}
                {(() => {
                  const confirmedVisitors = displayedVisitors.filter(v => (v.confirmedAppointments || 0) > 0);
                  if (confirmedVisitors.length === 0) return null;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <h3 className="font-semibold text-green-700">Agendamentos Confirmados ({confirmedVisitors.length})</h3>
                      </div>
                      
                      {confirmedVisitors.map((visitor, idx) => (
                        <Card key={`paid-${visitor.visitorPhone}-${idx}`} 
                              className="border-l-4 border-l-green-400 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <UserX className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  <h4 className="font-semibold text-green-900 truncate">{visitor.visitorName}</h4>
                                  <Badge className="bg-green-100 text-green-700 border-green-300 flex-shrink-0">
                                    Pago
                                  </Badge>
                                  {visitor.isRecurring && (
                                    <Badge variant="outline" className="bg-orange-100 text-orange-700 flex-shrink-0">
                                      Recorrente
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {visitor.visitorPhone}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Total Pago</p>
                                    <p className="font-bold text-green-700">{formatCurrency(visitor.totalSpent)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pagos</p>
                                    <p className="font-bold">{visitor.paidPayments}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Ticket Médio</p>
                                    <p className="font-bold">{formatCurrency(visitor.averageTicket)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Última Visita</p>
                                    <p className="font-bold">
                                      {visitor.daysSinceLastPayment === 0 ? 'Hoje' :
                                       visitor.daysSinceLastPayment === 1 ? 'Ontem' :
                                       `${visitor.daysSinceLastPayment} dias atrás`}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <Button 
                                variant="outline" 
                                size="sm"
                                className="ml-4 border-green-300 text-green-700 hover:bg-green-50 flex-shrink-0"
                                onClick={() => handleConvertVisitor(visitor)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Converter
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}

                {/* VISITANTES COM PAGAMENTOS CANCELADOS */}
                {(() => {
                  const failedVisitors = displayedVisitors.filter(v => v.failedPayments > 0 && v.paidPayments === 0);
                  if (failedVisitors.length === 0) return null;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <h3 className="font-semibold text-red-700">Pagamentos Cancelados ({failedVisitors.length})</h3>
                      </div>
                      
                      {failedVisitors.map((visitor, idx) => (
                        <Card key={`failed-${visitor.visitorPhone}-${idx}`} 
                              className="border-l-4 border-l-red-400 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <UserX className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  <h4 className="font-semibold text-red-900 truncate">{visitor.visitorName}</h4>
                                  <Badge className="bg-red-100 text-red-700 border-red-300 flex-shrink-0">
                                    Cancelado
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {visitor.visitorPhone}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="font-bold">{visitor.totalPayments}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Cancelados</p>
                                    <p className="font-bold text-red-700">{visitor.failedPayments}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Última Tentativa</p>
                                    <p className="font-bold">
                                      {visitor.daysSinceLastPayment === 0 ? 'Hoje' :
                                       visitor.daysSinceLastPayment === 1 ? 'Ontem' :
                                       `${visitor.daysSinceLastPayment} dias atrás`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}

                {/* VISITANTES COM PAGAMENTOS PENDENTES */}
                {(() => {
                  const pendingVisitors = displayedVisitors.filter(v => 
                    v.pendingPayments > 0 && v.paidPayments === 0 && v.failedPayments === 0
                  );
                  if (pendingVisitors.length === 0) return null;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <h3 className="font-semibold text-yellow-700">Pagamentos Pendentes ({pendingVisitors.length})</h3>
                      </div>
                      
                      {pendingVisitors.map((visitor, idx) => (
                        <Card key={`pending-${visitor.visitorPhone}-${idx}`} 
                              className="border-l-4 border-l-yellow-400 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <UserX className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                  <h4 className="font-semibold text-yellow-900 truncate">{visitor.visitorName}</h4>
                                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 flex-shrink-0">
                                    Pendente
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {visitor.visitorPhone}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="font-bold">{visitor.totalPayments}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pendentes</p>
                                    <p className="font-bold text-yellow-700">{visitor.pendingPayments}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Criado</p>
                                    <p className="font-bold">
                                      {visitor.daysSinceLastPayment === 0 ? 'Hoje' :
                                       visitor.daysSinceLastPayment === 1 ? 'Ontem' :
                                       `${visitor.daysSinceLastPayment} dias atrás`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SHOW MORE BUTTON */}
            {filteredAndSortedVisitors.length > 10 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAllVisitors(!showAllVisitors)}
                  className="gap-2"
                >
                  {showAllVisitors ? (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      Mostrar Menos
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Mostrar Todos ({filteredAndSortedVisitors.length - 10} restantes)
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
